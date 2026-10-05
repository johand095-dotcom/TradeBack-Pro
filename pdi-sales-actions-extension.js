/* =========================================================
   ELT VEHICLE SUITE - SALES PERSON ACTION DASHBOARD

   Gives Sales Person users a focused working view of the
   current action on each vehicle allocated to them.
========================================================= */

(function () {
    'use strict';

    function normaliseRoles(profile) {
        let roles = profile?.roles || [];
        if (typeof roles === 'string') {
            try { roles = JSON.parse(roles); }
            catch (error) {
                roles = roles.replace(/[\[\]"]/g, '').split(',').map(role => role.trim());
            }
        }
        if (!Array.isArray(roles)) roles = [roles];
        return roles.map(role => String(role).trim().toLowerCase());
    }

    function isSalesPersonOnly() {
        if (typeof pdiUserProfile === 'undefined' || !pdiUserProfile) return false;
        if (pdiUserProfile.is_admin) return false;
        const roles = normaliseRoles(pdiUserProfile);
        return roles.includes('sales person') &&
            !roles.includes('sales admin') &&
            !roles.includes('admin manager') &&
            !roles.includes('pdi admin') &&
            !roles.includes('pdi controller');
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function priorityFor(caseRecord) {
        const classification = caseRecord.stock_classification || 'Stock';
        if (classification === 'Sold') return 'High';
        if (classification === 'Allocated') return 'Medium';
        return 'Low';
    }

    function actionState(caseRecord) {
        const responsible = String(caseRecord.current_step_responsible || '').trim();
        const isMine = responsible.toLowerCase().includes('sales person');
        if (isMine) return { label: 'ACTION REQUIRED', className: 'sales-action-required' };
        return { label: 'TRACKING', className: 'sales-action-tracking' };
    }

    function renderSalesActionDashboard() {
        if (!isSalesPersonOnly()) return;

        const section = document.getElementById('myActions');
        const container = document.getElementById('myActionsList');
        if (!section || !container) return;

        section.style.display = '';

        const heading = section.querySelector('h2');
        const intro = section.querySelector('.section-heading p');
        if (heading) heading.textContent = 'My Vehicle Actions';
        if (intro) intro.textContent = 'Your allocated vehicles, with actions requiring your attention shown first.';

        const cases = (typeof pdiCases !== 'undefined' && Array.isArray(pdiCases))
            ? pdiCases.filter(item => item.workflow_status !== 'Completed')
            : [];

        if (!cases.length) {
            container.innerHTML = '<div class="empty-state">No active vehicles are currently allocated to you.</div>';
            return;
        }

        const rank = { High: 1, Medium: 2, Low: 3 };
        const ordered = [...cases].sort((a, b) => {
            const aMine = String(a.current_step_responsible || '').toLowerCase().includes('sales person') ? 0 : 1;
            const bMine = String(b.current_step_responsible || '').toLowerCase().includes('sales person') ? 0 : 1;
            if (aMine !== bMine) return aMine - bMine;
            return rank[priorityFor(a)] - rank[priorityFor(b)];
        });

        container.innerHTML = ordered.map(item => {
            const vehicle = [item.make, item.model].filter(Boolean).join(' ') || '-';
            const priority = priorityFor(item);
            const state = actionState(item);
            const activity = item.current_step_activity && item.current_step_activity !== '-'
                ? item.current_step_activity
                : (item.order_status === 'Awaiting Arrival' ? 'Vehicle awaiting arrival at ELT' : 'Workflow in progress');
            const responsible = item.current_step_responsible && item.current_step_responsible !== '-'
                ? item.current_step_responsible
                : (item.order_status === 'Awaiting Arrival' ? 'Sales / Sales Admin tracking' : '-');

            return `
                <div class="workflow-step current sales-action-row">
                    <div class="step-number">${Number(item.current_step || 0)}</div>
                    <div class="step-info">
                        <strong>${escapeHtml(item.stock_no || item.vin || vehicle)}</strong>
                        <span>${escapeHtml(vehicle)} · VIN: ${escapeHtml(item.vin || '-')}</span>
                        <span>Step ${Number(item.current_step || 0)} — ${escapeHtml(activity)}</span>
                        ${item.allocated_customer ? `<span>Customer: ${escapeHtml(item.allocated_customer)}</span>` : ''}
                    </div>
                    <div class="step-responsible">
                        <span class="my-action-priority-badge priority-${priority.toLowerCase()}">${priority.toUpperCase()}</span>
                        <div style="margin-top:6px;">${escapeHtml(responsible)}</div>
                        <div class="${state.className}" style="margin-top:6px;font-weight:800;">${state.label}</div>
                    </div>
                    <div>
                        <button type="button" class="action-button sales-action-open-button" data-case-id="${item.id}">Open</button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.sales-action-open-button').forEach(button => {
            button.addEventListener('click', () => {
                if (typeof openPdiWorkflow === 'function') {
                    openPdiWorkflow(Number(button.dataset.caseId));
                }
            });
        });
    }

    function install() {
        if (typeof window.renderMyPdiActions === 'function' && !window.renderMyPdiActions.__salesActionWrapped) {
            const original = window.renderMyPdiActions;
            const wrapped = async function (...args) {
                const result = await original.apply(this, args);
                renderSalesActionDashboard();
                return result;
            };
            wrapped.__salesActionWrapped = true;
            window.renderMyPdiActions = wrapped;
            try { renderMyPdiActions = wrapped; } catch (error) {}
        }

        // The salesperson scope extension renders after loadPdiCases. Run just
        // after it so this view uses the already-filtered pdiCases collection.
        setTimeout(renderSalesActionDashboard, 0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', install);
    } else {
        install();
    }

    console.log('Sales Person action dashboard extension loaded.');
})();
