/* =========================================================
   PDI SALES ADMIN ALLOCATION EXTENSION
   - OEM order entry visible to Sales Admin only
   - Sales Admin can allocate/reassign salesperson at any stage
   - Supports backlog vehicles already in PDI
========================================================= */

(function () {
  'use strict';

  const state = {
    salespeople: [],
    observer: null,
    applying: false
  };

  function normaliseRoles(profile) {
    if (!profile) return [];
    let roles = profile.roles || [];
    if (typeof roles === 'string') {
      try {
        roles = JSON.parse(roles);
      } catch (_) {
        roles = roles.replace(/[\[\]"]/g, '').split(',');
      }
    }
    if (!Array.isArray(roles)) roles = [roles];
    return roles.map(role => String(role).trim().toLowerCase()).filter(Boolean);
  }

  function isSalesAdmin() {
    try {
      const roles = normaliseRoles(pdiUserProfile);
      return roles.includes('sales admin');
    } catch (_) {
      return false;
    }
  }

  function applyOrderEntryVisibility() {
    const section = document.getElementById('preArrivalOrderSection');
    if (!section) return;
    section.style.display = isSalesAdmin() ? '' : 'none';
  }

  async function loadSalespeople() {
    if (!isSalesAdmin()) {
      state.salespeople = [];
      return;
    }

    try {
      const { data, error } = await supabaseClient
        .from('user_profiles')
        .select('user_id, full_name, email, roles, is_active')
        .eq('is_active', true);

      if (error) throw error;

      state.salespeople = (data || [])
        .filter(profile => {
          const roles = normaliseRoles(profile);
          return roles.includes('sales person') || roles.includes('sales');
        })
        .sort((a, b) => String(a.full_name || a.email || '').localeCompare(String(b.full_name || b.email || '')));
    } catch (error) {
      console.error('Could not load salespeople for allocation:', error);
      state.salespeople = [];
    }
  }

  function ensureModal() {
    if (document.getElementById('salespersonAllocationModal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'salespersonAllocationModal';
    overlay.className = 'modal-overlay hidden';
    overlay.innerHTML = `
      <div class="modal-card classification-modal-card">
        <div class="modal-header">
          <div>
            <span>Sales Administration</span>
            <h2>Allocate Salesperson</h2>
          </div>
          <button id="closeSalespersonAllocationModal" type="button" class="close-button">×</button>
        </div>
        <div class="modal-detail">
          <span>Vehicle</span>
          <strong id="salespersonAllocationVehicle">-</strong>
        </div>
        <div class="modal-detail">
          <span>Current Salesperson</span>
          <strong id="salespersonAllocationCurrent">Unallocated</strong>
        </div>
        <div class="classification-field">
          <label for="salespersonAllocationSelect">New Salesperson</label>
          <select id="salespersonAllocationSelect"></select>
        </div>
        <div id="salespersonAllocationMessage" class="form-message"></div>
        <div class="classification-modal-actions">
          <button id="cancelSalespersonAllocation" type="button" class="workflow-action-btn secondary">Cancel</button>
          <button id="saveSalespersonAllocation" type="button" class="workflow-action-btn">Save Allocation</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const close = () => overlay.classList.add('hidden');
    document.getElementById('closeSalespersonAllocationModal').onclick = close;
    document.getElementById('cancelSalespersonAllocation').onclick = close;
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close();
    });
  }

  function findCase(caseId) {
    try {
      return (pdiCases || []).find(item => String(item.id) === String(caseId));
    } catch (_) {
      return null;
    }
  }

  async function openAllocationModal(caseId) {
    if (!isSalesAdmin()) return;

    const record = findCase(caseId);
    if (!record) {
      alert('The vehicle record could not be found.');
      return;
    }

    if (!state.salespeople.length) await loadSalespeople();
    ensureModal();

    const modal = document.getElementById('salespersonAllocationModal');
    const vehicle = document.getElementById('salespersonAllocationVehicle');
    const current = document.getElementById('salespersonAllocationCurrent');
    const select = document.getElementById('salespersonAllocationSelect');
    const message = document.getElementById('salespersonAllocationMessage');
    const save = document.getElementById('saveSalespersonAllocation');

    vehicle.textContent = [record.stock_no, record.make, record.model, record.vin].filter(Boolean).join(' · ') || `Case ${record.id}`;
    current.textContent = record.allocated_salesperson_name || 'Unallocated';
    message.textContent = '';

    select.innerHTML =
      '<option value="">Unallocated</option>' +
      '<option value="__house_deals__">House Deals</option>' +
      state.salespeople.map(person =>
        `<option value="${person.user_id}">${person.full_name || person.email}</option>`
      ).join('');

    select.value =
      record.allocated_salesperson_name === 'House Deals'
        ? '__house_deals__'
        : (record.allocated_salesperson_id || '');

    save.onclick = async () => {
      const rawValue = select.value || '';
      const isHouseDeal = rawValue === '__house_deals__';
      const selectedId = isHouseDeal ? null : (rawValue || null);
      const selected = state.salespeople.find(person => String(person.user_id) === String(selectedId));
      const selectedName = isHouseDeal
        ? 'House Deals'
        : (selected ? (selected.full_name || selected.email) : null);

      save.disabled = true;
      save.textContent = 'Saving...';
      message.textContent = 'Updating salesperson allocation...';

      try {
        const { error } = await supabaseClient
          .from('pdi_cases')
          .update({
            allocated_salesperson_id: selectedId,
            allocated_salesperson_name: selectedName,
            updated_at: new Date().toISOString()
          })
          .eq('id', record.id);

        if (error) throw error;

        record.allocated_salesperson_id = selectedId;
        record.allocated_salesperson_name = selectedName;
        message.textContent = selectedName ? `Allocated to ${selectedName}.` : 'Salesperson allocation removed.';

        modal.classList.add('hidden');
        if (typeof loadPdiCases === 'function') {
          await loadPdiCases();
        } else {
          applyControls();
        }
      } catch (error) {
        console.error('Could not update salesperson allocation:', error);
        message.textContent = 'Allocation could not be saved. Please check the browser console.';
      } finally {
        save.disabled = false;
        save.textContent = 'Save Allocation';
      }
    };

    modal.classList.remove('hidden');
  }

  function addAllocationButton(actionCell, caseId) {
    if (!actionCell || actionCell.querySelector('.salesperson-allocation-btn')) return;

    const record = findCase(caseId);
    if (!record) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'workflow-action-btn salesperson-allocation-btn';
    button.style.marginTop = '6px';
    button.textContent = record.allocated_salesperson_name ? 'Change Salesperson' : 'Allocate Salesperson';
    button.dataset.caseId = caseId;
    button.addEventListener('click', () => openAllocationModal(caseId));
    actionCell.appendChild(button);
  }

  function addButtonsToTable(buttonSelector) {
    document.querySelectorAll(buttonSelector).forEach(existingButton => {
      const caseId = existingButton.dataset.caseId;
      if (!caseId) return;
      const actionCell = existingButton.closest('td');
      addAllocationButton(actionCell, caseId);
    });
  }

  function applyControls() {
    if (state.applying) return;
    state.applying = true;
    try {
      applyOrderEntryVisibility();

      document.querySelectorAll('.salesperson-allocation-btn').forEach(button => {
        if (!isSalesAdmin()) button.remove();
      });

      if (!isSalesAdmin()) return;

      addButtonsToTable('.prearrival-stock-btn[data-case-id]');
      addButtonsToTable('.open-workflow-button[data-case-id]');
    } finally {
      state.applying = false;
    }
  }

  async function initialise() {
    ensureModal();
    applyOrderEntryVisibility();
    await loadSalespeople();
    applyControls();

    state.observer = new MutationObserver(() => applyControls());
    state.observer.observe(document.body, { childList: true, subtree: true });

    const refresh = document.getElementById('refreshPdiButton');
    if (refresh) refresh.addEventListener('click', () => setTimeout(applyControls, 250));

    setTimeout(applyControls, 500);
    setTimeout(applyControls, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialise, { once: true });
  } else {
    initialise();
  }
})();
