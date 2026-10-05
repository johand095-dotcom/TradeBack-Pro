/* EMS Phase 3 required document attachments
   Step 6: authorisation document
   Step 13: release note
   Keeps the existing Phase 3 render/performance architecture intact. */
(function () {
  let busy = false;

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
    try { if (emsSession?.user?.id) return emsSession.user.id; } catch (_) {}
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    const id = data?.session?.user?.id;
    if (!id) throw new Error('No signed-in user found.');
    return id;
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

  function syncCase(data) {
    try { emsSelectedCase = data; } catch (_) {}
    try {
      if (Array.isArray(emsCases)) {
        const i = emsCases.findIndex(x => String(x.id) === String(data.id));
        if (i >= 0) emsCases[i] = data;
      }
    } catch (_) {}
  }

  async function saveCase(c, changes) {
    const { data, error } = await supabaseClient.from('ems_cases')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', c.id).select('*').single();
    if (error) throw error;
    if (!data) throw new Error('Supabase returned no updated EMS record.');
    syncCase(data);
    return data;
  }

  async function upload(c, file, kind) {
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${c.id}/${kind}-${Date.now()}-${safe}`;
    const { error } = await supabaseClient.storage.from('ems-documents')
      .upload(path, file, { upsert:false, contentType:file.type || undefined });
    if (error) throw error;
    return path;
  }

  function localSet(c, name, value) {
    try { localStorage.setItem(`ems_${c.id}_${name}`, JSON.stringify(value)); } catch (_) {}
  }

  function enhanceStep6() {
    const c = selectedCase();
    const section = document.getElementById('emsPhase3Workflow');
    if (!c || !section || section.classList.contains('hidden') || Number(c.current_phase) !== 3) return;
    const button = document.getElementById('emsConfirmAuthorisationReceived');
    if (!button || document.getElementById('emsAuthorisationDocument')) return;
    button.style.display = 'none';
    const action = document.createElement('div');
    action.className = 'ems-jobcard-action';
    action.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-left:auto';
    action.innerHTML = '<input id="emsAuthorisationDocument" type="file" accept="image/*,.pdf"><button id="emsAttachAuthorisation" class="primary-button" type="button">Attach & Confirm Authorisation</button>';
    button.insertAdjacentElement('afterend', action);
  }

  function enhanceStep13() {
    const c = selectedCase();
    if (!c || Number(c.current_phase) !== 3) return;
    const button = document.getElementById('emsReleaseVehicle');
    if (!button || document.getElementById('emsReleaseNote')) return;
    button.style.display = 'none';
    const action = document.createElement('div');
    action.className = 'ems-jobcard-action';
    action.style.cssText = 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-left:auto';
    action.innerHTML = '<input id="emsReleaseNote" type="file" accept="image/*,.pdf"><button id="emsAttachReleaseNote" class="primary-button" type="button">Attach Release Note & Release</button>';
    button.insertAdjacentElement('afterend', action);
  }

  function enhance() {
    enhanceStep6();
    enhanceStep13();
  }

  document.addEventListener('click', async event => {
    const b = event.target.closest('#emsAttachAuthorisation,#emsAttachReleaseNote');
    if (!b) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (busy) return;
    const c = selectedCase();
    if (!c) return alert('The open EMS vehicle could not be resolved. Please close and reopen it.');
    const original = b.textContent;
    busy = true; b.disabled = true; b.textContent = 'Uploading...';
    try {
      const uid = await userId();
      const now = new Date().toISOString();
      const by = currentUserName();
      if (b.id === 'emsAttachAuthorisation') {
        const file = document.getElementById('emsAuthorisationDocument')?.files?.[0];
        if (!file) throw new Error('Please choose the authorisation document first.');
        if (!window.confirm('Attach this document and confirm authorisation has been received?')) { b.disabled=false; b.textContent=original; return; }
        const path = await upload(c, file, 'authorisation');
        await saveCase(c, { authorisation_document_path:path, current_step:7, current_step_started_at:now, workflow_status:'Authorised' });
        localSet(c, 'authorisation_received', { at:now, by });
        try { if (typeof renderEmsPhase3 === 'function') renderEmsPhase3(emsSelectedCase); } catch (_) {}
      } else {
        const file = document.getElementById('emsReleaseNote')?.files?.[0];
        if (!file) throw new Error('Please choose the release note first.');
        if (!window.confirm('Attach this release note and confirm the vehicle has been released?')) { b.disabled=false; b.textContent=original; return; }
        const path = await upload(c, file, 'release-note');
        await saveCase(c, { release_note_path:path, vehicle_released_at:now, vehicle_released_by:uid, current_step:14, current_step_started_at:now, workflow_status:'Released' });
        try { if (typeof renderEmsCompletionSteps === 'function') renderEmsCompletionSteps(); } catch (_) {}
      }
    } catch (e) {
      console.error('EMS document attachment failed:', e);
      alert('EMS document could not be attached.\n\n' + (e.message || 'Unknown error'));
      if (document.body.contains(b)) { b.disabled=false; b.textContent=original; }
    } finally { busy = false; setTimeout(enhance, 0); }
  }, true);

  let timer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(enhance, 20);
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener('load', enhance);
})();