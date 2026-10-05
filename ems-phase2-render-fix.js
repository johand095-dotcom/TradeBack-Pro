/* =========================================================
   EMS PHASE 2 + PHASE 3 WORKFLOW EXTENSION
   Phase 2: Foreman receipt + technician assignment
   Phase 3: Assessment through authorisation submission
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
        const { data, error } = await supabaseClient
            .from('ems_cases')
            .update({ ...changes, updated_at: now })
            .eq('id', caseData.id)
            .select()
            .single();
        if (error) throw error;
        emsSelectedCase = data;
        return data;
    }

    function technicianControls(caseData) {
        if (!caseData.foreman_job_card_received_at) return '';
        if (caseData.technician_assigned_at) {
            return '<div class="ems-step-state">✓</div>';
        }
        return `
            <div class="ems-jobcard-action" style="min-width:320px;display:flex;gap:10px;align-items:center;">
                <select id="emsTechnicianSelect" class="ems-technician-select" style="min-width:180px;padding:12px;border:1px solid #cbd8e6;border-radius:10px;background:#fff;">
                    <option value="">Loading technicians...</option>
                </select>
                <button id="assignEmsTechnicianButton" class="primary-button" type="button" disabled>Assign Technician</button>
            </div>`;
    }

    async function loadTechnicians() {
        const select = document.getElementById('emsTechnicianSelect');
        if (!select) return;
        try {
            const { data, error } = await supabaseClient
                .from('user_profiles')
                .select('user_id, full_name, roles, is_active')
                .eq('is_active', true)
                .order('full_name');
            if (error) throw error;

            const technicians = (data || []).filter(profile => {
                const roles = Array.isArray(profile.roles) ? profile.roles : [profile.roles].filter(Boolean);
                return roles.some(role => String(role).toLowerCase().includes('technician'));
            });

            select.innerHTML = '<option value="">Select technician...</option>' +
                technicians.map(t => `<option value="${t.user_id}">${t.full_name || 'Technician'}</option>`).join('');

            if (!technicians.length) {
                select.innerHTML = '<option value="">No active technicians found</option>';
            }
            const button = document.getElementById('assignEmsTechnicianButton');
            if (button) button.disabled = !select.value;
        } catch (error) {
            console.error('EMS technician list failed:', error);
            select.innerHTML = '<option value="">Unable to load technicians</option>';
        }
    }

    function renderEmsPhase2Fixed(caseData) {
        if (!caseData || Number(caseData.current_phase) !== 2) return;

        const phaseStatus = document.getElementById('emsPhase2Status');
        const receivedStep = document.getElementById('emsStepForemanReceived');
        const receivedText = document.getElementById('emsForemanReceivedStatusText');
        const receivedButton = document.getElementById('confirmEmsForemanReceivedButton');
        const technicianStep = document.getElementById('emsStepTechnicianAssignment');
        const technicianText = document.getElementById('emsTechnicianAssignmentStatusText');

        const foremanReceived = Boolean(caseData.foreman_job_card_received_at);
        const technicianAssigned = Boolean(caseData.technician_assigned_at);

        if (foremanReceived) {
            if (phaseStatus) phaseStatus.textContent = technicianAssigned ? 'Technician Assigned' : 'Awaiting Technician';
            if (receivedStep) {
                receivedStep.classList.remove('active', 'locked');
                receivedStep.classList.add('completed');
            }
            if (receivedText) receivedText.textContent = 'Job Card receipt confirmed by Foreman.';
            if (receivedButton) {
                receivedButton.disabled = true;
                receivedButton.textContent = '✓ Job Card Received';
            }
            if (technicianStep) {
                technicianStep.classList.remove('locked');
                technicianStep.classList.toggle('active', !technicianAssigned);
                technicianStep.classList.toggle('completed', technicianAssigned);
                let action = technicianStep.querySelector('.ems-jobcard-action, .ems-step-state');
                if (action) action.remove();
                technicianStep.insertAdjacentHTML('beforeend', technicianControls(caseData));
            }
            if (technicianText) {
                technicianText.textContent = technicianAssigned
                    ? 'Technician assigned. Phase 2 complete.'
                    : 'Select and assign the technician responsible for the vehicle.';
            }
            if (!technicianAssigned) loadTechnicians();
        } else {
            if (phaseStatus) phaseStatus.textContent = 'Awaiting Job Card';
            if (receivedStep) {
                receivedStep.classList.remove('completed', 'locked');
                receivedStep.classList.add('active');
            }
            if (receivedButton) {
                receivedButton.disabled = false;
                receivedButton.textContent = 'Confirm Job Card Received';
            }
            if (technicianStep) {
                technicianStep.classList.remove('active', 'completed');
                technicianStep.classList.add('locked');
            }
        }
    }

    function ensurePhase3Section() {
        let section = document.getElementById('emsPhase3Workflow');
        if (section) return section;
        const phase2 = document.getElementById('emsPhase2Workflow');
        if (!phase2) return null;

        phase2.insertAdjacentHTML('afterend', `
        <section id="emsPhase3Workflow" class="ems-phase-workflow hidden">
            <div class="ems-phase-header">
                <div>
                    <span class="eyebrow">PHASE 3</span>
                    <h3>Assessment, Authorisation & Repairs</h3>
                    <p>Control the vehicle from technical assessment through customer authorisation.</p>
                </div>
                <span id="emsPhase3Status" class="ems-phase-status">Awaiting Assessment</span>
            </div>
            <div id="emsPhase3Steps" class="ems-workflow-steps"></div>
        </section>`);
        return document.getElementById('emsPhase3Workflow');
    }

    function phase3Step(number, title, description, complete, active, buttonId, buttonText) {
        const cls = complete ? 'completed' : active ? 'active' : 'locked';
        const action = complete
            ? '<div class="ems-step-state">✓</div>'
            : active
                ? `<button id="${buttonId}" class="primary-button" type="button">${buttonText}</button>`
                : '';
        return `
            <div class="ems-workflow-step ${cls}">
                <div class="ems-step-number">${number}</div>
                <div class="ems-step-content"><strong>${title}</strong><span>${complete ? 'Completed.' : description}</span></div>
                ${action}
            </div>`;
    }

    function renderEmsPhase3(caseData) {
        const section = ensurePhase3Section();
        if (!section || !caseData) return;
        const phase1 = document.getElementById('emsPhase1Workflow');
        const phase2 = document.getElementById('emsPhase2Workflow');

        if (Number(caseData.current_phase) !== 3) {
            section.classList.add('hidden');
            return;
        }
        if (phase1) phase1.classList.add('hidden');
        if (phase2) phase2.classList.add('hidden');
        section.classList.remove('hidden');

        const assessed = Boolean(caseData.vehicle_assessed_at);
        const estimateDone = Boolean(caseData.estimate_done_at);
        const frontOffice = Boolean(caseData.estimate_submitted_front_office_at);
        const authSubmitted = Boolean(caseData.estimate_submitted_authorisation_at);

        const status = document.getElementById('emsPhase3Status');
        if (status) {
            status.textContent = authSubmitted ? 'Waiting Authorisation'
                : frontOffice ? 'Ready for Authorisation'
                : estimateDone ? 'Estimate Ready'
                : assessed ? 'Assessment Complete'
                : 'Awaiting Assessment';
        }

        const steps = document.getElementById('emsPhase3Steps');
        if (!steps) return;
        steps.innerHTML = [
            phase3Step(1, 'Vehicle Assessed', 'Technician confirms that the vehicle assessment is complete.', assessed, !assessed, 'emsConfirmAssessed', 'Confirm Vehicle Assessed'),
            phase3Step(2, 'Estimate Done', 'Confirm the repair estimate has been completed.', estimateDone, assessed && !estimateDone, 'emsConfirmEstimateDone', 'Confirm Estimate Done'),
            phase3Step(3, 'Estimate Submitted to Front Office', 'Hand the completed estimate to Front Office.', frontOffice, estimateDone && !frontOffice, 'emsConfirmFrontOffice', 'Submit to Front Office'),
            phase3Step(4, 'Estimate Submitted for Authorisation', 'Confirm the estimate has been sent for customer / third-party authorisation.', authSubmitted, frontOffice && !authSubmitted, 'emsConfirmAuthorisationSubmit', 'Submit for Authorisation'),
            phase3Step(5, 'Waiting for Assessor', 'Conditional step — used only where an assessor inspection is required.', false, false, '', ''),
            phase3Step(6, 'Authorisation Received', 'This unlocks once authorisation is received.', false, false, '', ''),
            phase3Step(7, 'Repairs in Progress', 'Repairs begin after authorisation.', false, false, '', '')
        ].join('');
    }

    try {
        const originalOpenEmsWorkflow = openEmsWorkflow;
        if (typeof originalOpenEmsWorkflow === 'function') {
            openEmsWorkflow = function (emsId) {
                originalOpenEmsWorkflow(emsId);
                const selected = getSelectedEmsCase();
                renderEmsPhase2Fixed(selected);
                renderEmsPhase3(selected);
            };
        }
    } catch (error) {
        console.warn('EMS workflow extension could not patch openEmsWorkflow:', error);
    }

    document.addEventListener('change', function (event) {
        if (event.target?.id === 'emsTechnicianSelect') {
            const button = document.getElementById('assignEmsTechnicianButton');
            if (button) button.disabled = !event.target.value;
        }
    }, true);

    document.addEventListener('click', async function (event) {
        const foremanButton = event.target.closest('#confirmEmsForemanReceivedButton');
        const assignButton = event.target.closest('#assignEmsTechnicianButton');
        const phase3Button = event.target.closest('#emsConfirmAssessed, #emsConfirmEstimateDone, #emsConfirmFrontOffice, #emsConfirmAuthorisationSubmit');
        if (!foremanButton && !assignButton && !phase3Button) return;
        event.stopImmediatePropagation();

        const selectedCase = getSelectedEmsCase();
        if (!selectedCase) {
            alert('The open EMS vehicle could not be resolved. Please close the workflow and open it again.');
            return;
        }

        try {
            if (foremanButton) {
                if (selectedCase.foreman_job_card_received_at) return renderEmsPhase2Fixed(selectedCase);
                if (!confirm(`Confirm that Job Card ${selectedCase.job_card_no || ''} has been physically received by the Foreman?`)) return;
                foremanButton.disabled = true;
                foremanButton.textContent = 'Confirming...';
                const user = await getSignedInUser();
                const now = new Date().toISOString();
                await updateCase(selectedCase, {
                    foreman_job_card_received_at: now,
                    foreman_job_card_received_by: user.id,
                    current_step: 2,
                    current_step_started_at: now
                });
                await refreshOpenCase(selectedCase.id);
                return;
            }

            if (assignButton) {
                const select = document.getElementById('emsTechnicianSelect');
                const technicianId = select?.value;
                const technicianName = select?.selectedOptions?.[0]?.textContent || 'selected technician';
                if (!technicianId) return alert('Please select a technician.');
                if (!confirm(`Assign ${technicianName} to Job Card ${selectedCase.job_card_no || ''}?`)) return;
                assignButton.disabled = true;
                assignButton.textContent = 'Assigning...';
                const now = new Date().toISOString();
                await updateCase(selectedCase, {
                    technician_assigned_at: now,
                    technician_assigned_by: technicianId,
                    current_phase: 3,
                    current_step: 1,
                    current_step_started_at: now,
                    workflow_status: 'In Progress'
                });
                await refreshOpenCase(selectedCase.id);
                return;
            }

            if (phase3Button) {
                const user = await getSignedInUser();
                const now = new Date().toISOString();
                let changes = {};
                let promptText = '';

                if (phase3Button.id === 'emsConfirmAssessed') {
                    promptText = 'Confirm that the vehicle assessment is complete?';
                    changes = { vehicle_assessed_at: now, vehicle_assessed_by: user.id, current_step: 2, current_step_started_at: now };
                } else if (phase3Button.id === 'emsConfirmEstimateDone') {
                    promptText = 'Confirm that the repair estimate has been completed?';
                    changes = { estimate_done_at: now, estimate_done_by: user.id, current_step: 3, current_step_started_at: now };
                } else if (phase3Button.id === 'emsConfirmFrontOffice') {
                    promptText = 'Confirm that the estimate has been submitted to Front Office?';
                    changes = { estimate_submitted_front_office_at: now, estimate_submitted_front_office_by: user.id, current_step: 4, current_step_started_at: now };
                } else if (phase3Button.id === 'emsConfirmAuthorisationSubmit') {
                    promptText = 'Confirm that the estimate has been submitted for authorisation?';
                    changes = { estimate_submitted_authorisation_at: now, current_step: 5, current_step_started_at: now, workflow_status: 'Waiting Authorisation' };
                }

                if (!confirm(promptText)) return;
                phase3Button.disabled = true;
                phase3Button.textContent = 'Saving...';
                await updateCase(selectedCase, changes);
                await refreshOpenCase(selectedCase.id);
            }
        } catch (error) {
            console.error('EMS workflow action failed:', error);
            alert('EMS workflow action could not be completed.\n\n' + (error.message || 'Unknown error'));
            if (foremanButton) { foremanButton.disabled = false; foremanButton.textContent = 'Confirm Job Card Received'; }
            if (assignButton) { assignButton.disabled = false; assignButton.textContent = 'Assign Technician'; }
            if (phase3Button) { phase3Button.disabled = false; }
        }
    }, true);

    window.renderEmsPhase2Fixed = renderEmsPhase2Fixed;
    window.renderEmsPhase3 = renderEmsPhase3;
})();
