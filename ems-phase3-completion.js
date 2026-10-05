/* EMS Phase 3 completion extension: stable persistent steps 9-14 with fast local updates. */
(function () {
  const profileCache = new Map();
  let renderTimer = null;
  let rendering = false;

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
    let tail = document.getElementById('emsPhase3CompletionSteps');
    if (!tail) {
      tail = document.createElement('div');
      tail.id = 'emsPhase3CompletionSteps';
      tail.className = 'ems-workflow-steps';
      main.insertAdjacentElement('afterend', tail);
    }
    return tail;
  }

  async function signedUser() {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error('No signed-in user found.');
    return user;
  }

  async function profileName(id) {
    if (!id) return 'Recorded user';
    if (profileCache.has(id)) return profileCache.get(id);
    const { data } = await supabaseClient.from('user_profiles').select('full_name').eq('user_id', id).maybeSingle();
    const name = data?.full_name || 'Recorded user';
    profileCache.set(id, name);
    return name;
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

  async function stamp(at, by, prefix = 'Completed by') {
    if (!at) return '';
    return `${prefix} ${await profileName(by)} · ${fmt(at)}`;
  }

  function legacy(c, name) {
    try { return JSON.parse(localStorage.getItem(`ems_${c.id}_${name}`) || 'null'); } catch (_) { return null; }
  }

  function card(n, title, detail, done, active, action = '') {
    const cls = done ? 'completed' : active ? 'active' : 'locked';
    return `<div class="ems-workflow-step ${cls}" data-ems-completion-step="${n}"><div class="ems-step-number">${n}</div><div class="ems-step-content"><strong>${title}</strong><span>${detail}</span></div>${done ? '<div class="ems-step-state">✓</div>' : active ? action : ''}</div>`;
  }

  async function renderCompletionSteps() {
    if (rendering) return;
    const c = selectedCase();
    const section = document.getElementById('emsPhase3Workflow');
    const host = completionHost();
    if (!c || !host || !section || section.classList.contains('hidden') || Number(c.current_phase) !== 3) return;
    rendering = true;
    try {
      const oldRepairs = legacy(c, 'repairs_completed');
      const repairsComplete = Boolean(c.repairs_completed_at || oldRepairs?.at);
      const qc = Boolean(c.qc_passed_at);
      const handed = Boolean(c.job_card_handed_front_office_at);
      const accepted = Boolean(c.job_card_accepted_front_office_at);
      const invoiced = Boolean(c.invoiced_at && c.invoice_number);
      const released = Boolean(c.vehicle_released_at);
      const finalised = Boolean(c.invoice_signed_at && c.invoice_proof_path);

      const s9 = qc ? await stamp(c.qc_passed_at, c.qc_passed_by) : 'Confirm final quality control has passed.';
      const s10 = handed ? await stamp(c.job_card_handed_front_office_at, c.job_card_handed_front_office_by) : 'Confirm the completed Job Card has been handed to Front Office.';
      const s11 = accepted ? await stamp(c.job_card_accepted_front_office_at, c.job_card_accepted_front_office_by) : 'Front Office confirms receipt and acceptance of the Job Card.';
      const s12 = invoiced ? `Invoice ${c.invoice_number} · ${await stamp(c.invoiced_at, c.invoiced_by)}` : 'Enter the invoice number and confirm invoicing.';
      const s13 = released ? await stamp(c.vehicle_released_at, c.vehicle_released_by, 'Released by') : 'Confirm the vehicle has been released.';
      const s14 = finalised ? `${await stamp(c.invoice_signed_at, c.invoice_signed_by)} · Proof attached` : 'Attach the signed invoice / official proof to complete the EMS case.';

      host.innerHTML = [
        card(9,'QC Passed',s9,qc,repairsComplete&&!qc,'<button id="emsQcPassed" class="primary-button" type="button">Confirm QC Passed</button>'),
        card(10,'Job Card Handed to Front Office',s10,handed,qc&&!handed,'<button id="emsHandFrontOffice" class="primary-button" type="button">Hand to Front Office</button>'),
        card(11,'Job Card Accepted by Front Office',s11,accepted,handed&&!accepted,'<button id="emsAcceptFrontOffice" class="primary-button" type="button">Accept Job Card</button>'),
        card(12,'Job Card Invoiced',s12,invoiced,accepted&&!invoiced,'<div class="ems-jobcard-action" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><input id="emsInvoiceNumber" type="text" placeholder="Invoice number" style="padding:12px;border:1px solid #cbd8e6;border-radius:10px"><button id="emsConfirmInvoice" class="primary-button" type="button">Confirm Invoice</button></div>'),
        card(13,'Vehicle Released',s13,released,invoiced&&!released,'<button id="emsReleaseVehicle" class="primary-button" type="button">Confirm Vehicle Released</button>'),
        card(14,'Signed Invoice / Proof Attached → Completed',s14,finalised,released&&!finalised,'<div class="ems-jobcard-action" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><input id="emsInvoiceProof" type="file" accept="image/*,.pdf"><button id="emsCompleteCase" class="primary-button" type="button">Attach Proof & Complete</button></div>')
      ].join('');

      const status = document.getElementById('emsPhase3Status');
      if (status) {
        if (finalised) status.textContent='Completed';
        else if (released) status.textContent='Awaiting Signed Proof';
        else if (invoiced) status.textContent='Ready for Release';
        else if (accepted) status.textContent='Awaiting Invoice';
        else if (handed) status.textContent='Awaiting Front Office Acceptance';
        else if (qc) status.textContent='Ready for Front Office';
        else if (repairsComplete) status.textContent='Awaiting QC';
      }
    } finally { rendering = false; }
  }

  function scheduleRender(delay = 20) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => renderCompletionSteps().catch(e => console.error('EMS completion render failed:', e)), delay);
  }

  function syncCaseLocally(data) {
    try { emsSelectedCase = data; } catch (_) {}
    try {
      if (Array.isArray(emsCases)) {
        const i = emsCases.findIndex(x => String(x.id) === String(data.id));
        if (i >= 0) emsCases[i] = data;
      }
    } catch (_) {}
  }

  async function updateCase(c, changes) {
    const payload = { ...changes, updated_at: new Date().toISOString() };
    const { data, error } = await supabaseClient.from('ems_cases').update(payload).eq('id', c.id).select().single();
    if (error) throw error;
    syncCaseLocally(data);
    await renderCompletionSteps();
    return data;
  }

  async function simpleAction(c, promptText, changes) {
    if (!confirm(promptText)) return false;
    const u = await signedUser();
    const now = new Date().toISOString();
    const resolved = {};
    Object.entries(changes).forEach(([k,v]) => resolved[k] = v === '$NOW' ? now : v === '$USER' ? u.id : v);
    await updateCase(c, resolved);
    return true;
  }

  document.addEventListener('click', async event => {
    const b = event.target.closest('#emsQcPassed,#emsHandFrontOffice,#emsAcceptFrontOffice,#emsConfirmInvoice,#emsReleaseVehicle,#emsCompleteCase');
    if (!b) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const c = selectedCase();
    if (!c) return alert('The open EMS vehicle could not be resolved. Please close and reopen it.');
    const originalText = b.textContent;
    try {
      b.disabled = true;
      b.textContent = 'Saving...';
      let completed = false;
      if (b.id === 'emsQcPassed') completed = await simpleAction(c,'Confirm final QC has passed?',{qc_passed_at:'$NOW',qc_passed_by:'$USER',current_step:10,current_step_started_at:'$NOW'});
      else if (b.id === 'emsHandFrontOffice') completed = await simpleAction(c,'Confirm the Job Card has been handed to Front Office?',{job_card_handed_front_office_at:'$NOW',job_card_handed_front_office_by:'$USER',current_step:11,current_step_started_at:'$NOW'});
      else if (b.id === 'emsAcceptFrontOffice') completed = await simpleAction(c,'Confirm Front Office accepts the Job Card?',{job_card_accepted_front_office_at:'$NOW',job_card_accepted_front_office_by:'$USER',current_step:12,current_step_started_at:'$NOW'});
      else if (b.id === 'emsConfirmInvoice') {
        const no = document.getElementById('emsInvoiceNumber')?.value.trim();
        if (!no) { b.disabled=false; b.textContent=originalText; return alert('Please enter the invoice number.'); }
        completed = await simpleAction(c,`Confirm invoice ${no}?`,{invoice_number:no,invoiced_at:'$NOW',invoiced_by:'$USER',current_step:13,current_step_started_at:'$NOW'});
      } else if (b.id === 'emsReleaseVehicle') completed = await simpleAction(c,'Confirm the vehicle has been released?',{vehicle_released_at:'$NOW',vehicle_released_by:'$USER',current_step:14,current_step_started_at:'$NOW',workflow_status:'Released'});
      else if (b.id === 'emsCompleteCase') {
        const file = document.getElementById('emsInvoiceProof')?.files?.[0];
        if (!file) { b.disabled=false; b.textContent=originalText; return alert('Please attach the signed invoice or official proof first.'); }
        if (!confirm('Attach this proof and mark the EMS case Completed?')) { b.disabled=false; b.textContent=originalText; return; }
        const u=await signedUser(), now=new Date().toISOString(), safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'), path=`${c.id}/${Date.now()}-${safe}`;
        const { error } = await supabaseClient.storage.from('ems-documents').upload(path,file,{upsert:false,contentType:file.type||undefined});
        if (error) throw error;
        await updateCase(c,{invoice_proof_path:path,invoice_signed_at:now,invoice_signed_by:u.id,current_step:14,current_step_started_at:now,workflow_status:'Completed',completed_at:now,completed_by:u.id});
        completed = true;
      }
      if (!completed && document.body.contains(b)) { b.disabled=false; b.textContent=originalText; }
    } catch(e) {
      console.error('EMS completion action failed:',e);
      alert('EMS action could not be completed.\n\n'+(e.message||'Unknown error'));
      if (document.body.contains(b)) { b.disabled=false; b.textContent=originalText; }
    }
  }, true);

  /* Only restore the protected completion host if another renderer removes it. */
  const observer = new MutationObserver(() => {
    if (rendering) return;
    const section = document.getElementById('emsPhase3Workflow');
    if (!section || section.classList.contains('hidden')) return;
    const host = document.getElementById('emsPhase3CompletionSteps');
    if (!host || !host.querySelector('[data-ems-completion-step]')) scheduleRender(30);
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  window.renderEmsCompletionSteps = renderCompletionSteps;
  window.addEventListener('load',()=>scheduleRender(50));
  scheduleRender(50);
})();