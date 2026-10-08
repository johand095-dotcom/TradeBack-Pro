/* EMS audit-stamp presentation layer. Adds user/date/time detail to completed workflow steps without changing core workflow logic. */
(function () {
  const profileCache = new Map();
  let decorating = false;

  function selectedCase() {
    try { if (emsSelectedCase) return emsSelectedCase; } catch (_) {}
    try {
      const no = document.getElementById('emsWorkflowNumber')?.textContent?.trim();
      const vin = document.getElementById('emsWorkflowVin')?.textContent?.trim();
      return (Array.isArray(emsCases) ? emsCases : []).find(x =>
        (no && String(x.ems_no || '') === no) || (vin && String(x.vin || '') === vin)
      ) || null;
    } catch (_) { return null; }
  }

  function fmt(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-ZA', {
      day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:false
    }).format(d).replace(',', ' ·');
  }

  async function profileName(userId) {
    if (!userId) return '';
    if (profileCache.has(userId)) return profileCache.get(userId);
    try {
      const { data, error } = await supabaseClient.from('user_profiles').select('full_name').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      const name = data?.full_name || 'Recorded user';
      profileCache.set(userId, name);
      return name;
    } catch (e) {
      console.warn('EMS audit profile lookup failed:', e);
      return 'Recorded user';
    }
  }

  async function auditText(at, by, fallbackName) {
    if (!at) return '';
    const name = fallbackName || await profileName(by);
    return `${name ? `Completed by ${name} · ` : ''}${fmt(at)}`;
  }

  async function decoratePhase2(c) {
    const receivedText = document.getElementById('emsForemanReceivedStatusText');
    if (receivedText && c.foreman_job_card_received_at) {
      receivedText.textContent = await auditText(c.foreman_job_card_received_at, c.foreman_job_card_received_by, '');
    }
    const techText = document.getElementById('emsTechnicianAssignmentStatusText');
    if (techText && c.technician_assigned_at) {
      const techName = await profileName(c.technician_assigned_by);
      techText.textContent = `Assigned to ${techName} · ${fmt(c.technician_assigned_at)}`;
    }
  }

  async function decoratePhase3(c) {
    const host = document.getElementById('emsPhase3Steps');
    if (!host) return;
    const cards = [...host.querySelectorAll('.ems-workflow-step')];
    const audits = [
      [c.vehicle_assessed_at, c.vehicle_assessed_by],
      [c.estimate_done_at, c.estimate_done_by],
      [c.estimate_submitted_front_office_at, c.estimate_submitted_front_office_by],
      [c.estimate_submitted_authorisation_at, c.estimate_submitted_authorisation_by]
    ];
    for (let i = 0; i < audits.length; i++) {
      const [at, by] = audits[i];
      if (!at || !cards[i]) continue;
      const span = cards[i].querySelector('.ems-step-content span');
      if (span) span.textContent = await auditText(at, by, '');
    }
  }

  async function decorate() {
    if (decorating) return;
    const c = selectedCase();
    if (!c) return;
    decorating = true;
    try {
      await decoratePhase2(c);
      await decoratePhase3(c);
    } finally { decorating = false; }
  }

  const observer = new MutationObserver(() => { window.setTimeout(decorate, 0); });
  observer.observe(document.documentElement, { childList:true, subtree:true });
  document.addEventListener('click', () => window.setTimeout(decorate, 150), true);
  window.addEventListener('load', decorate);
  window.decorateEmsAuditStamps = decorate;
})();
