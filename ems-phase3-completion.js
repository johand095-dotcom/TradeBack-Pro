/* EMS Phase 3 completion: steps 9-14.
   Design rule: rendering is LOCAL ONLY. Supabase is called once per action, never while drawing the UI. */
(function () {
  let rendering = false;
  let actionBusy = false;

  function selectedCase() {
    try { if (typeof emsSelectedCase !== 'undefined' && emsSelectedCase) return emsSelectedCase; } catch (_) {}
    try {
      const no = document.getElementById('emsWorkflowNumber')?.textContent?.trim();
      const vin = document.getElementById('emsWorkflowVin')?.textContent?.trim();
      return (Array.isArray(emsCases) ? emsCases : []).find(x =>
        (no && String(x.ems_no || '') === no) || (vin && String(x.vin || '') === vin)
      ) || null;
    } catch (_) { return null; }
  }

  function completionHost() {
    const main = document.getElementById('emsPhase3Steps');
    if (!main) return null;
    let host = document.getElementById('emsPhase3CompletionSteps');
    if (!host) {
      host = document.createElement('div');
      host.id = 'emsPhase3CompletionSteps';
      host.className = 'ems-workflow-steps';
      main.insertAdjacentElement('afterend', host);
    }
    return host;
  }

  function currentUserId() {
    try { if (emsSession?.user?.id) return emsSession.user.id; } catch (_) {}
    return null;
  }

  function currentUserName() {
    try { if (emsUserProfile?.full_name) return emsUserProfile.full_name; } catch (_) {}
    try {
      const text = document.getElementById('signedInUser')?.textContent || '';
      const name = text.split('·')[0].trim();
      if (name && !/checking|signed in|not signed/i.test(name)) return name;
    } catch (_) {}
    return 'User';
  }

  async function userId() {
    const cached = currentUserId();
    if (cached) return cached;
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    const id = data?.session?.user?.id;
    if (!id) throw new Error('No signed-in user found.');
    return id;
  }

  function nameFor(id) {
    if (!id) return 'User';
    if (id === currentUserId()) return currentUserName();
    return 'User';
  }

  function fmt(v) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-ZA', {
      timeZone: 'Africa/Johannesburg', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(d).replace(',', ' ·');
  }

  function stamp(at, by, prefix) {
    if (!at) return '';
    return `${prefix || 'Completed by'} ${nameFor(by)} · ${fmt(at)}`;
  }

  function legacy(c, name) {
    try { return JSON.parse(localStorage.getItem(`ems_${c.id}_${name}`) || 'null'); } catch (_) { return null; }
  }

  function card(n, title, detail, done, active, action) {
    const cls = done ? 'completed' : active ? 'active' : 'locked';
    return `<div class="ems-workflow-step ${cls}" data-ems-completion-step="${n}">
      <div class="ems-step-number">${n}</div>
      <div class="ems-step-content"><strong>${title}</strong><span>${detail}</span></div>
      ${done ? '<div class="ems-step-state">✓</div>' : active ? (action || '') : ''}
    </div>`;
  }

  function renderCompletionSteps() {
    if (rendering) return;
    const c = selectedCase();
    const section = document.getElementById('emsPhase3Workflow');
    const host = completionHost();
    if (!c || !host || !section || section.classList.contains('hidden') || Number(c.current_phase) !== 3) return;

    rendering = true;
    try {
      const repairsComplete = Boolean(c.repairs_completed_at || legacy(c, 'repairs_completed')?.at);
      const qc = Boolean(c.qc_passed_at);
      const handed = Boolean(c.job_card_handed_front_office_at);
      const accepted = Boolean(c.job_card_accepted_front_office_at);
      const invoiced = Boolean(c.invoiced_at && c.invoice_number);
      const released = Boolean(c.vehicle_released_at);
      const finalised = Boolean(c.invoice_signed_at && c.invoice_proof_path);

      host.innerHTML = [
        card(9,'QC Passed', qc ? stamp(c.qc_passed_at,c.qc_passed_by) : 'Confirm final quality control has passed.', qc, repairsComplete&&!qc, '<button id="emsQcPassed" class="primary-button" type="button">Confirm QC Passed</button>'),
        card(10,'Job Card Handed to Front Office', handed ? stamp(c.job_card_handed_front_office_at,c.job_card_handed_front_office_by) : 'Confirm the completed Job Card has been handed to Front Office.', handed, qc&&!handed, '<button id="emsHandFrontOffice" class="primary-button" type="button">Hand to Front Office</button>'),
        card(11,'Job Card Accepted by Front Office', accepted ? stamp(c.job_card_accepted_front_office_at,c.job_card_accepted_front_office_by) : 'Front Office confirms receipt and acceptance of the Job Card.', accepted, handed&&!accepted, '<button id="emsAcceptFrontOffice" class="primary-button" type="button">Accept Job Card</button>'),
        card(12,'Job Card Invoiced', invoiced ? `Invoice ${c.invoice_number} · ${stamp(c.invoiced_at,c.invoiced_by)}` : 'Enter the invoice number and confirm invoicing.', invoiced, accepted&&!invoiced, '<div class="ems-jobcard-action" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><input id="emsInvoiceNumber" type="text" placeholder="Invoice number" style="padding:12px;border:1px solid #cbd8e6;border-radius:10px"><button id="emsConfirmInvoice" class="primary-button" type="button">Confirm Invoice</button></div>'),
        card(13,'Vehicle Released', released ? stamp(c.vehicle_released_at,c.vehicle_released_by,'Released by') : 'Confirm the vehicle has been released.', released, invoiced&&!released, '<button id="emsReleaseVehicle" class="primary-button" type="button">Confirm Vehicle Released</button>'),
        card(14,'Signed Invoice / Proof Attached → Completed', finalised ? `${stamp(c.invoice_signed_at,c.invoice_signed_by)} · Proof attached` : 'Attach the signed invoice / official proof to complete the EMS case.', finalised, released&&!finalised, '<div class="ems-jobcard-action" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><input id="emsInvoiceProof" type="file" accept="image/*,.pdf"><button id="emsCompleteCase" class="primary-button" type="button">Attach Proof & Complete</button></div>')
      ].join('');

      const status = document.getElementById('emsPhase3Status');
      if (status) status.textContent = finalised ? 'Completed' : released ? 'Awaiting Signed Proof' : invoiced ? 'Ready for Release' : accepted ? 'Awaiting Invoice' : handed ? 'Awaiting Front Office Acceptance' : qc ? 'Ready for Front Office' : repairsComplete ? 'Awaiting QC' : status.textContent;
    } finally { rendering = false; }
  }

  function syncCase(data) {
    try { emsSelectedCase = data; } catch (_) {}
    try {
      if (Array.isArray(emsCases)) {
        const i = emsCases.findIndex(x => String(x.id) === String(data.id));
        if (i >= 0) emsCases[i] = data;
      }
    } catch (_) {}
  }

  async function saveChanges(c, changes) {
    const payload = { ...changes, updated_at: new Date().toISOString() };
    const { data, error } = await supabaseClient.from('ems_cases').update(payload).eq('id', c.id).select('*').single();
    if (error) throw error;
    if (!data) throw new Error('Supabase returned no updated EMS record.');
    syncCase(data);
    renderCompletionSteps();
    return data;
  }

  async function confirmAndSave(c, question, changes) {
    if (!window.confirm(question)) return false;
    const uid = await userId();
    const now = new Date().toISOString();
    const payload = {};
    Object.entries(changes).forEach(([k,v]) => payload[k] = v === '$NOW' ? now : v === '$USER' ? uid : v);
    await saveChanges(c, payload);
    return true;
  }

  document.addEventListener('click', async event => {
    const b = event.target.closest('#emsQcPassed,#emsHandFrontOffice,#emsAcceptFrontOffice,#emsConfirmInvoice,#emsReleaseVehicle,#emsCompleteCase');
    if (!b) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (actionBusy) return;

    const c = selectedCase();
    if (!c) return alert('The open EMS vehicle could not be resolved. Please close and reopen it.');

    const original = b.textContent;
    actionBusy = true;
    b.disabled = true;
    b.textContent = 'Saving...';

    try {
      let done = false;
      if (b.id === 'emsQcPassed') done = await confirmAndSave(c,'Confirm final QC has passed?',{qc_passed_at:'$NOW',qc_passed_by:'$USER',current_step:10,current_step_started_at:'$NOW'});
      else if (b.id === 'emsHandFrontOffice') done = await confirmAndSave(c,'Confirm the Job Card has been handed to Front Office?',{job_card_handed_front_office_at:'$NOW',job_card_handed_front_office_by:'$USER',current_step:11,current_step_started_at:'$NOW'});
      else if (b.id === 'emsAcceptFrontOffice') done = await confirmAndSave(c,'Confirm Front Office accepts the Job Card?',{job_card_accepted_front_office_at:'$NOW',job_card_accepted_front_office_by:'$USER',current_step:12,current_step_started_at:'$NOW'});
      else if (b.id === 'emsConfirmInvoice') {
        const no = document.getElementById('emsInvoiceNumber')?.value.trim();
        if (!no) { alert('Please enter the invoice number.'); done=false; }
        else done = await confirmAndSave(c,`Confirm invoice ${no}?`,{invoice_number:no,invoiced_at:'$NOW',invoiced_by:'$USER',current_step:13,current_step_started_at:'$NOW'});
      }
      else if (b.id === 'emsReleaseVehicle') done = await confirmAndSave(c,'Confirm the vehicle has been released?',{vehicle_released_at:'$NOW',vehicle_released_by:'$USER',current_step:14,current_step_started_at:'$NOW',workflow_status:'Released'});
      else if (b.id === 'emsCompleteCase') {
        const file = document.getElementById('emsInvoiceProof')?.files?.[0];
        if (!file) { alert('Please attach the signed invoice or official proof first.'); done=false; }
        else if (window.confirm('Attach this proof and mark the EMS case Completed?')) {
          const uid = await userId();
          const now = new Date().toISOString();
          const safe = file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
          const path = `${c.id}/${Date.now()}-${safe}`;
          const { error } = await supabaseClient.storage.from('ems-documents').upload(path,file,{upsert:false,contentType:file.type||undefined});
          if (error) throw error;
          await saveChanges(c,{invoice_proof_path:path,invoice_signed_at:now,invoice_signed_by:uid,current_step:14,current_step_started_at:now,workflow_status:'Completed',completed_at:now,completed_by:uid});
          done=true;
        }
      }
      if (!done && document.body.contains(b)) { b.disabled=false; b.textContent=original; }
    } catch (e) {
      console.error('EMS Phase 3 action failed:', e);
      alert('EMS action could not be completed.\n\n' + (e.message || 'Unknown error'));
      if (document.body.contains(b)) { b.disabled=false; b.textContent=original; }
    } finally {
      actionBusy = false;
    }
  }, true);

  /* Core renderers may rebuild Phase 3. Restore 9-14 locally, but do not query Supabase. */
  let repairTimer = null;
  const observer = new MutationObserver(() => {
    if (rendering) return;
    const section = document.getElementById('emsPhase3Workflow');
    if (!section || section.classList.contains('hidden')) return;
    const host = document.getElementById('emsPhase3CompletionSteps');
    if (!host || !host.querySelector('[data-ems-completion-step]')) {
      clearTimeout(repairTimer);
      repairTimer = setTimeout(renderCompletionSteps, 10);
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.renderEmsCompletionSteps = renderCompletionSteps;
  window.addEventListener('load', renderCompletionSteps);
})();