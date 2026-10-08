/* EMS Phase 2 technician assignment override.
   Replaces the user-profile technician dropdown with a simple technician name field. */
(function () {
  let busy = false;

  function selectedCase() {
    try { if (typeof emsSelectedCase !== 'undefined' && emsSelectedCase) return emsSelectedCase; } catch (_) {}
    return null;
  }

  function localKey(c) { return `ems_${c.id}_technician_name`; }
  function savedName(c) {
    try { return localStorage.getItem(localKey(c)) || ''; } catch (_) { return ''; }
  }

  function enhance() {
    const c = selectedCase();
    if (!c || Number(c.current_phase) !== 2 || !c.foreman_job_card_received_at || c.technician_assigned_at) return;
    const oldSelect = document.getElementById('emsTechnicianSelect');
    const oldButton = document.getElementById('assignEmsTechnicianButton');
    if ((!oldSelect && !oldButton) || document.getElementById('emsTechnicianName')) return;
    const action = oldSelect?.closest('.ems-jobcard-action') || oldButton?.closest('.ems-jobcard-action');
    if (!action) return;
    action.innerHTML = `<input id="emsTechnicianName" type="text" value="${savedName(c).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}" placeholder="Enter technician name" style="min-width:220px;padding:12px;border:1px solid #cbd8e6;border-radius:10px;background:#fff;"><button id="assignEmsTechnicianTextButton" class="primary-button" type="button">Assign Technician</button>`;
    const text = document.getElementById('emsTechnicianAssignmentStatusText');
    if (text) text.textContent = 'Enter the technician name responsible for the vehicle.';
  }

  async function assign() {
    if (busy) return;
    const c = selectedCase();
    const input = document.getElementById('emsTechnicianName');
    const button = document.getElementById('assignEmsTechnicianTextButton');
    const name = input?.value?.trim();
    if (!c || !button) return;
    if (!name) return alert('Please enter the technician name.');
    if (!window.confirm(`Assign ${name} to Job Card ${c.job_card_no || ''}?`)) return;
    busy = true; button.disabled = true; button.textContent = 'Assigning...';
    try {
      const now = new Date().toISOString();
      let uid = null;
      try { uid = emsSession?.user?.id || null; } catch (_) {}
      if (!uid) {
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) throw error;
        uid = data?.session?.user?.id;
      }
      if (!uid) throw new Error('No signed-in user found.');
      const { data, error } = await supabaseClient.from('ems_cases').update({
        technician_assigned_at: now,
        technician_assigned_by: uid,
        current_phase: 3,
        current_step: 1,
        current_step_started_at: now,
        workflow_status: 'In Progress',
        updated_at: now
      }).eq('id', c.id).select('*').single();
      if (error) throw error;
      localStorage.setItem(localKey(c), name);
      try { emsSelectedCase = data; } catch (_) {}
      try {
        if (Array.isArray(emsCases)) {
          const i = emsCases.findIndex(x => String(x.id) === String(c.id));
          if (i >= 0) emsCases[i] = data;
        }
      } catch (_) {}
      openEmsWorkflow(c.id);
    } catch (e) {
      console.error('Manual technician assignment failed:', e);
      alert('Technician could not be assigned.\n\n' + (e.message || 'Unknown error'));
      button.disabled = false; button.textContent = 'Assign Technician';
    } finally { busy = false; }
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('#assignEmsTechnicianTextButton');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    assign();
  }, true);

  let timer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(enhance, 10);
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener('load', enhance);
})();