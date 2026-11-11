/* =========================================================
   EMS PHASE 2 + PHASE 3 WORKFLOW EXTENSION
   Phase 2: Foreman receipt + technician assignment
   Phase 3: Assessment through authorisation and repairs
========================================================= */

(function () {
    function getSelectedEmsCase() {
        try { if (emsSelectedCase) return emsSelectedCase; } catch (_) {}
        try {
            if (Array.isArray(emsCases)) {
                const workflowNumber = document.getElementById('emsWorkflowNumber')?.textContent?.trim();
                const workflowVin = document.getElementById('emsWorkflowVin')?.textContent?.trim();
                return emsCases.find(item =>
                    (workflowNumber && String(item.ems_no || '') === workflowNumber) ||
                    (workflowVin && String(item.vin || '') === workflowVin)
                ) || null;
            }
        } catch (_) {}
        return null;
    }

    async function getSignedInUser() {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error) throw error;
        if (!user) throw new Error('No signed-in user found.');
        return user;
    }

    function userName() {
        try { return emsUserProfile?.full_name || emsSession?.user?.email || 'User'; } catch (_) { return 'User'; }
    }

    function stampText(at, byName) {
        if (!at) return '';
        const d = new Date(at);
        const date = d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
        const time = d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', hour12:false });
        return `Completed by ${byName || 'User'} · ${date} · ${time}`;
    }

    function localKey(caseData, name) { return `ems_${caseData.id}_${name}`; }
    function localGet(caseData, name) {
        try { return JSON.parse(localStorage.getItem(localKey(caseData, name)) || 'null'); } catch (_) { return null; }
    }
    function localSet(caseData, name, value) {
        try { localStorage.setItem(localKey(caseData, name), JSON.stringify(value)); } catch (_) {}
    }

    async function refreshOpenCase(id) {
        await loadEmsCases();
        const refreshed = emsCases.find(item => String(item.id) === String(id));
        if (!refreshed) throw new Error('Updated EMS vehicle could not be reloaded.');
        emsSelectedCase = refreshed;
        openEmsWorkflow(refreshed.id);
        return refreshed;
    }

    async function updateCase(caseData, changes) {
        const now = new Date().toISOString();
        const { data, error } = await supabaseClient.from('ems_cases').update({ ...changes, updated_at: now }).eq('id', caseData.id).select().single();
        if (error) throw error;
        emsSelectedCase = data;
        return data;
    }

    function technicianControls(caseData) {
        if (!caseData.foreman_job_card_received_at) return '';
        if (caseData.technician_assigned_at) return '<div class="ems-step-state">✓</div>';
        return `<div class="ems-jobcard-action" style="min-width:320px;display:flex;gap:10px;align-items:center;"><select id="emsTechnicianSelect" class="ems-technician-select" style="min-width:180px;padding:12px;border:1px solid #cbd8e6;border-radius:10px;background:#fff;"><option value="">Loading technicians...</option></select><button id="assignEmsTechnicianButton" class="primary-button" type="button" disabled>Assign Technician</button></div>`;
    }

    async function loadTechnicians() {
        const select = document.getElementById('emsTechnicianSelect'); if (!select) return;
        try {
            const { data, error } = await supabaseClient.from('user_profiles').select('user_id, full_name, roles, is_active').eq('is_active', true).order('full_name');
            if (error) throw error;
            const technicians = (data || []).filter(p => (Array.isArray(p.roles) ? p.roles : [p.roles].filter(Boolean)).some(r => String(r).toLowerCase().includes('technician')));
            select.innerHTML = '<option value="">Select technician...</option>' + technicians.map(t => `<option value="${t.user_id}">${t.full_name || 'Technician'}</option>`).join('');
            if (!technicians.length) select.innerHTML = '<option value="">No active technicians found</option>';
        } catch (e) { console.error(e); select.innerHTML = '<option value="">Unable to load technicians</option>'; }
    }

    function renderEmsPhase2Fixed(caseData) {
        if (!caseData || Number(caseData.current_phase) !== 2) return;
        const phaseStatus=document.getElementById('emsPhase2Status'), receivedStep=document.getElementById('emsStepForemanReceived'), receivedText=document.getElementById('emsForemanReceivedStatusText'), receivedButton=document.getElementById('confirmEmsForemanReceivedButton'), technicianStep=document.getElementById('emsStepTechnicianAssignment'), technicianText=document.getElementById('emsTechnicianAssignmentStatusText');
        const foremanReceived=Boolean(caseData.foreman_job_card_received_at), technicianAssigned=Boolean(caseData.technician_assigned_at);
        if (foremanReceived) {
            if(phaseStatus) phaseStatus.textContent=technicianAssigned?'Technician Assigned':'Awaiting Technician';
            if(receivedStep){receivedStep.classList.remove('active','locked');receivedStep.classList.add('completed');}
            if(receivedText) receivedText.textContent='Job Card receipt confirmed by Foreman.';
            if(receivedButton){receivedButton.disabled=true;receivedButton.textContent='✓ Job Card Received';}
            if(technicianStep){technicianStep.classList.remove('locked');technicianStep.classList.toggle('active',!technicianAssigned);technicianStep.classList.toggle('completed',technicianAssigned);technicianStep.querySelector('.ems-jobcard-action, .ems-step-state')?.remove();technicianStep.insertAdjacentHTML('beforeend',technicianControls(caseData));}
            if(technicianText) technicianText.textContent=technicianAssigned?'Technician assigned. Phase 2 complete.':'Select and assign the technician responsible for the vehicle.';
            if(!technicianAssigned) loadTechnicians();
        }
    }

    function ensurePhase3Section() {
        let section=document.getElementById('emsPhase3Workflow'); if(section) return section;
        const phase2=document.getElementById('emsPhase2Workflow'); if(!phase2) return null;
        phase2.insertAdjacentHTML('afterend',`<section id="emsPhase3Workflow" class="ems-phase-workflow hidden"><div class="ems-phase-header"><div><span class="eyebrow">PHASE 3</span><h3>Assessment, Authorisation & Repairs</h3><p>Control the vehicle from technical assessment through customer authorisation and repairs.</p></div><span id="emsPhase3Status" class="ems-phase-status">Awaiting Assessment</span></div><div id="emsPhase3Steps" class="ems-workflow-steps"></div></section>`);
        return document.getElementById('emsPhase3Workflow');
    }

    function phase3Step(number,title,description,complete,active,buttonId,buttonText,stamp,extra='') {
        const cls=complete?'completed':active?'active':'locked';
        const action=complete?'<div class="ems-step-state">✓</div>':active&&buttonId?`<button id="${buttonId}" class="primary-button" type="button">${buttonText}</button>`:'';
        return `<div class="ems-workflow-step ${cls}"><div class="ems-step-number">${number}</div><div class="ems-step-content"><strong>${title}</strong><span>${complete?(stamp||'Completed.'):description}</span>${extra}</div>${action}</div>`;
    }

    function renderEmsPhase3(caseData) {
        const section=ensurePhase3Section(); if(!section||!caseData) return;
        const phase1=document.getElementById('emsPhase1Workflow'), phase2=document.getElementById('emsPhase2Workflow');
        if(Number(caseData.current_phase)!==3){section.classList.add('hidden');return;}
        phase1?.classList.add('hidden'); phase2?.classList.add('hidden'); section.classList.remove('hidden');

        const assessed=Boolean(caseData.vehicle_assessed_at), estimateDone=Boolean(caseData.estimate_done_at), frontOffice=Boolean(caseData.estimate_submitted_front_office_at), authSubmitted=Boolean(caseData.estimate_submitted_authorisation_at);
        const assessorDecision=localGet(caseData,'assessor_decision');
        const assessorDone=localGet(caseData,'assessor_completed');
        const authReceived=localGet(caseData,'authorisation_received');
        const repairsStarted=localGet(caseData,'repairs_started');
        const repairsCompleted=localGet(caseData,'repairs_completed');

        let statusText='Awaiting Assessment';
        if(assessed) statusText='Assessment Complete'; if(estimateDone) statusText='Estimate Ready'; if(frontOffice) statusText='Ready for Authorisation';
        if(authSubmitted&&!assessorDecision) statusText='Assessor Decision Required';
        if(assessorDecision?.required&&!assessorDone) statusText='Waiting for Assessor';
        if((assessorDecision?.required?assessorDone:assessorDecision)&&!authReceived) statusText='Waiting Authorisation';
        if(authReceived&&!repairsStarted) statusText='Authorised'; if(repairsStarted&&!repairsCompleted) statusText='Repairs in Progress'; if(repairsCompleted) statusText='Repairs Completed';
        const status=document.getElementById('emsPhase3Status'); if(status) status.textContent=statusText;

        const steps=document.getElementById('emsPhase3Steps'); if(!steps) return;
        const currentName=userName();
        const decisionReady=authSubmitted&&!assessorDecision;
        const decisionExtra=decisionReady?`<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap"><button id="emsAssessorRequired" class="primary-button" type="button">Assessor Required</button><button id="emsNoAssessorRequired" class="primary-button" type="button">No Assessor Required</button></div>`:'';
        const assessorComplete=assessorDecision?.required&&Boolean(assessorDone);
        const assessorSkipped=assessorDecision&&!assessorDecision.required;
        const assessorActive=assessorDecision?.required&&!assessorDone;
        const authActive=Boolean(assessorSkipped||assessorComplete)&&!authReceived;
        const repairsActive=Boolean(authReceived)&&!repairsStarted;
        const repairCompleteActive=Boolean(repairsStarted)&&!repairsCompleted;

        steps.innerHTML=[
            phase3Step(1,'Vehicle Assessed','Technician confirms that the vehicle assessment is complete.',assessed,!assessed,'emsConfirmAssessed','Confirm Vehicle Assessed',stampText(caseData.vehicle_assessed_at,currentName)),
            phase3Step(2,'Estimate Done','Confirm the repair estimate has been completed.',estimateDone,assessed&&!estimateDone,'emsConfirmEstimateDone','Confirm Estimate Done',stampText(caseData.estimate_done_at,currentName)),
            phase3Step(3,'Estimate Submitted to Front Office','Hand the completed estimate to Front Office.',frontOffice,estimateDone&&!frontOffice,'emsConfirmFrontOffice','Submit to Front Office',stampText(caseData.estimate_submitted_front_office_at,currentName)),
            phase3Step(4,'Estimate Submitted for Authorisation','Confirm the estimate has been sent for customer / third-party authorisation.',authSubmitted,frontOffice&&!authSubmitted,'emsConfirmAuthorisationSubmit','Submit for Authorisation',stampText(caseData.estimate_submitted_authorisation_at,currentName),decisionExtra),
            phase3Step(5,'Waiting for Assessor',assessorDecision?'Awaiting assessor inspection.':'Choose whether an assessor inspection is required.',assessorComplete||assessorSkipped,assessorActive,'emsConfirmAssessorComplete','Confirm Assessor Completed',assessorSkipped?'Not required · '+stampText(assessorDecision.at,assessorDecision.by):stampText(assessorDone?.at,assessorDone?.by),decisionExtra),
            phase3Step(6,'Authorisation Received','Confirm customer / third-party authorisation has been received.',Boolean(authReceived),authActive,'emsConfirmAuthorisationReceived','Confirm Authorisation Received',authReceived?stampText(authReceived.at,authReceived.by):''),
            phase3Step(7,'Repairs in Progress','Start authorised repairs.',Boolean(repairsStarted),repairsActive,'emsStartRepairs','Start Repairs',repairsStarted?stampText(repairsStarted.at,repairsStarted.by):''),
            phase3Step(8,'Repairs Completed','Confirm all authorised repairs are complete.',Boolean(repairsCompleted),repairCompleteActive,'emsCompleteRepairs','Confirm Repairs Completed',repairsCompleted?stampText(repairsCompleted.at,repairsCompleted.by):'')
        ].join('');
    }

    try { const original=openEmsWorkflow; if(typeof original==='function'){openEmsWorkflow=function(id){original(id);const selected=getSelectedEmsCase();renderEmsPhase2Fixed(selected);renderEmsPhase3(selected);};} } catch(e){console.warn(e);}

    document.addEventListener('change',e=>{if(e.target?.id==='emsTechnicianSelect'){const b=document.getElementById('assignEmsTechnicianButton');if(b)b.disabled=!e.target.value;}},true);

    document.addEventListener('click',async function(event){
        const button=event.target.closest('#confirmEmsForemanReceivedButton,#assignEmsTechnicianButton,#emsConfirmAssessed,#emsConfirmEstimateDone,#emsConfirmFrontOffice,#emsConfirmAuthorisationSubmit,#emsAssessorRequired,#emsNoAssessorRequired,#emsConfirmAssessorComplete,#emsConfirmAuthorisationReceived,#emsStartRepairs,#emsCompleteRepairs');
        if(!button)return; event.stopImmediatePropagation();
        const c=getSelectedEmsCase(); if(!c){alert('The open EMS vehicle could not be resolved. Please close the workflow and open it again.');return;}
        try {
            if(button.id==='confirmEmsForemanReceivedButton'){
                if(c.foreman_job_card_received_at)return renderEmsPhase2Fixed(c); if(!confirm(`Confirm that Job Card ${c.job_card_no||''} has been physically received by the Foreman?`))return;
                button.disabled=true;button.textContent='Confirming...';const u=await getSignedInUser(),now=new Date().toISOString();await updateCase(c,{foreman_job_card_received_at:now,foreman_job_card_received_by:u.id,current_step:2,current_step_started_at:now});await refreshOpenCase(c.id);return;
            }
            if(button.id==='assignEmsTechnicianButton'){
                const s=document.getElementById('emsTechnicianSelect'),id=s?.value,name=s?.selectedOptions?.[0]?.textContent||'selected technician';if(!id)return alert('Please select a technician.');if(!confirm(`Assign ${name} to Job Card ${c.job_card_no||''}?`))return;
                button.disabled=true;button.textContent='Assigning...';const now=new Date().toISOString();await updateCase(c,{technician_assigned_at:now,technician_assigned_by:id,current_phase:3,current_step:1,current_step_started_at:now,workflow_status:'In Progress'});await refreshOpenCase(c.id);return;
            }
            const u=await getSignedInUser(), now=new Date().toISOString(), by=userName();
            let changes=null,promptText='';
            if(button.id==='emsConfirmAssessed'){promptText='Confirm that the vehicle assessment is complete?';changes={vehicle_assessed_at:now,vehicle_assessed_by:u.id,current_step:2,current_step_started_at:now};}
            if(button.id==='emsConfirmEstimateDone'){promptText='Confirm that the repair estimate has been completed?';changes={estimate_done_at:now,estimate_done_by:u.id,current_step:3,current_step_started_at:now};}
            if(button.id==='emsConfirmFrontOffice'){promptText='Confirm that the estimate has been submitted to Front Office?';changes={estimate_submitted_front_office_at:now,estimate_submitted_front_office_by:u.id,current_step:4,current_step_started_at:now};}
            if(button.id==='emsConfirmAuthorisationSubmit'){promptText='Confirm that the estimate has been submitted for authorisation?';changes={estimate_submitted_authorisation_at:now,current_step:5,current_step_started_at:now,workflow_status:'Waiting Authorisation'};}
            if(changes){if(!confirm(promptText))return;button.disabled=true;button.textContent='Saving...';await updateCase(c,changes);await refreshOpenCase(c.id);return;}

            if(button.id==='emsAssessorRequired'||button.id==='emsNoAssessorRequired'){
                const required=button.id==='emsAssessorRequired'; if(!confirm(required?'Confirm an assessor inspection is required?':'Confirm no assessor inspection is required?'))return;
                localSet(c,'assessor_decision',{required,at:now,by}); renderEmsPhase3(c); return;
            }
            if(button.id==='emsConfirmAssessorComplete'){if(!confirm('Confirm the assessor inspection is complete?'))return;localSet(c,'assessor_completed',{at:now,by});renderEmsPhase3(c);return;}
            if(button.id==='emsConfirmAuthorisationReceived'){if(!confirm('Confirm authorisation has been received?'))return;localSet(c,'authorisation_received',{at:now,by});renderEmsPhase3(c);return;}
            if(button.id==='emsStartRepairs'){if(!confirm('Confirm authorised repairs are starting?'))return;localSet(c,'repairs_started',{at:now,by});renderEmsPhase3(c);return;}
            if(button.id==='emsCompleteRepairs'){if(!confirm('Confirm all authorised repairs are completed?'))return;localSet(c,'repairs_completed',{at:now,by});renderEmsPhase3(c);return;}
        } catch(error){console.error('EMS workflow action failed:',error);alert('EMS workflow action could not be completed.\n\n'+(error.message||'Unknown error'));button.disabled=false;}
    },true);

    window.renderEmsPhase2Fixed=renderEmsPhase2Fixed; window.renderEmsPhase3=renderEmsPhase3;
})();
