/* =========================================================
   ELT VEHICLE SUITE - PDI DASHBOARD CLEANUP
   Compact responsive dashboard + phase summary + collapsibles
   UI only: does not alter workflow or database logic.
========================================================= */

(function () {
    'use strict';

    const STYLE_ID = 'pdiDashboardCleanupStyles';

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            /* Compact PDI dashboard */
            .dashboard-section { padding: 20px 24px 6px !important; }
            .dashboard-intro { margin-bottom: 14px !important; }
            .dashboard-intro > h2 { font-size: 25px !important; margin-bottom: 4px !important; }
            .dashboard-intro > p { margin: 4px 0 0 !important; }

            .topbar { min-height: 86px !important; padding: 16px 24px !important; }
            .topbar h1 { font-size: 28px !important; }
            .topbar p { margin-top: 3px !important; }

            .card { margin: 16px 24px !important; padding: 20px !important; }
            .section-heading { padding-bottom: 12px !important; }
            .section-heading h2 { font-size: 21px !important; }

            .metric-grid {
                grid-template-columns: repeat(6, minmax(125px, 1fr)) !important;
                gap: 12px !important;
            }
            .metric-card {
                min-height: 108px !important;
                padding: 16px 12px !important;
                border-radius: 13px !important;
            }
            .metric-number {
                font-size: 34px !important;
                margin-bottom: 7px !important;
            }
            .metric-card span { font-size: 13px !important; }

            .commercial-priority-summary {
                margin: 12px 24px 16px !important;
                gap: 12px !important;
            }
            .commercial-priority-card {
                min-height: 112px !important;
                padding: 16px !important;
            }
            .commercial-priority-number {
                font-size: 34px !important;
                margin-bottom: 5px !important;
            }

            /* Awaiting-arrival metric inserted by this extension */
            .metric-card.dashboard-awaiting-arrival-card {
                border-color: #c8d9e8;
            }

            /* Phase summary */
            #pdiPhaseSummary {
                margin: 14px 24px 16px;
                background: #fff;
                border: 1px solid #d7e0e8;
                border-radius: 16px;
                box-shadow: 0 8px 24px rgba(0,43,80,.06);
                padding: 18px;
            }
            #pdiPhaseSummary .phase-summary-title {
                display:flex;
                align-items:flex-end;
                justify-content:space-between;
                gap:16px;
                margin-bottom:12px;
            }
            #pdiPhaseSummary h2 { margin:0; color:#002b50; font-size:21px; }
            #pdiPhaseSummary p { margin:4px 0 0; color:#4d5b6a; font-size:13px; }
            .phase-summary-grid {
                display:grid;
                grid-template-columns:repeat(5,minmax(125px,1fr));
                gap:10px;
            }
            .phase-summary-card {
                border:1px solid #d7e0e8;
                background:#f8fbfe;
                border-radius:12px;
                min-height:88px;
                padding:13px;
                display:flex;
                flex-direction:column;
                justify-content:center;
                cursor:pointer;
                transition:.15s ease;
            }
            .phase-summary-card:hover { border-color:#005ea8; transform:translateY(-1px); }
            .phase-summary-card strong { color:#002b50; font-size:28px; line-height:1; }
            .phase-summary-card span { margin-top:7px; color:#33475b; font-size:12px; font-weight:800; }
            .phase-summary-card small { margin-top:3px; color:#778493; font-size:11px; }

            /* Collapsible dashboard panels */
            .dashboard-collapsible { overflow:hidden; }
            .dashboard-collapsible > .dashboard-collapse-toggle {
                width:100%;
                border:0;
                background:transparent;
                padding:0;
                text-align:left;
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:16px;
                cursor:pointer;
            }
            .dashboard-collapse-toggle .collapse-chevron {
                width:32px;
                height:32px;
                flex:0 0 32px;
                display:grid;
                place-items:center;
                border:1px solid #d7e0e8;
                border-radius:9px;
                color:#002b50;
                font-size:17px;
                font-weight:900;
                transition:.15s ease;
            }
            .dashboard-collapsible.is-open .collapse-chevron { transform:rotate(180deg); }
            .dashboard-collapse-body { display:none; padding-top:14px; }
            .dashboard-collapsible.is-open .dashboard-collapse-body { display:block; }
            .dashboard-collapse-heading h2 { margin:0; color:#002b50; font-size:21px; }
            .dashboard-collapse-heading p { margin:4px 0 0; color:#4d5b6a; font-size:13px; }
            .dashboard-count-pill {
                display:inline-flex;
                align-items:center;
                justify-content:center;
                min-width:30px;
                height:26px;
                padding:0 9px;
                border-radius:20px;
                background:#eaf3fb;
                color:#002b50;
                font-size:12px;
                font-weight:900;
                margin-left:8px;
            }

            .dashboard-inline-search {
                width:100%;
                min-height:42px;
                border:1px solid #d7e0e8;
                border-radius:10px;
                padding:0 13px;
                margin:0 0 12px;
                outline:none;
            }
            .dashboard-inline-search:focus {
                border-color:#005ea8;
                box-shadow:0 0 0 3px rgba(0,94,168,.10);
            }

            /* Pre-arrival entry is an admin tool, so keep it compact/collapsed too */
            #preArrivalOrderSection { margin-top:12px !important; }

            /* Laptop optimisation */
            @media (max-width: 1450px) {
                .sidebar { width:240px !important; }
                .main-content { width:calc(100% - 240px) !important; margin-left:240px !important; }
                .sidebar-brand { padding:18px 14px !important; gap:10px !important; }
                .logo-mark { width:56px !important; height:56px !important; font-size:23px !important; border-radius:14px !important; }
                .sidebar-brand h1 { font-size:20px !important; }
                .side-nav { padding:16px 10px !important; gap:7px !important; }
                .side-nav a { min-height:48px !important; padding:0 12px !important; font-size:14px !important; }
                .metric-grid { grid-template-columns:repeat(3,minmax(135px,1fr)) !important; }
                .phase-summary-grid { grid-template-columns:repeat(3,minmax(135px,1fr)); }
                .card, #pdiPhaseSummary, .commercial-priority-summary { margin-left:18px !important; margin-right:18px !important; }
                .dashboard-section { padding-left:18px !important; padding-right:18px !important; }
            }

            @media (max-width: 1100px) {
                .metric-grid { grid-template-columns:repeat(2,minmax(130px,1fr)) !important; }
                .phase-summary-grid { grid-template-columns:repeat(2,minmax(130px,1fr)); }
                .commercial-priority-summary { grid-template-columns:repeat(3,minmax(130px,1fr)) !important; }
                .topbar { align-items:flex-start !important; }
                .topbar-actions { flex-wrap:wrap; justify-content:flex-end; }
            }
        `;
        document.head.appendChild(style);
    }

    function isAwaitingArrival(item) {
        return Boolean(
            item &&
            item.ordered_at &&
            item.order_status === 'Awaiting Arrival' &&
            !item.received_at
        );
    }

    function getCases() {
        try {
            return Array.isArray(pdiCases) ? pdiCases : [];
        } catch (error) {
            return [];
        }
    }

    function ensureAwaitingArrivalMetric() {
        const grid = document.querySelector('.metric-grid');
        if (!grid || document.getElementById('metricAwaitingArrival')) return;

        const card = document.createElement('div');
        card.className = 'metric-card dashboard-awaiting-arrival-card';
        card.innerHTML = `
            <div id="metricAwaitingArrival" class="metric-number">0</div>
            <span>Awaiting Arrival</span>
        `;
        grid.insertBefore(card, grid.firstChild);
    }

    function ensurePhaseSummary() {
        if (document.getElementById('pdiPhaseSummary')) return;

        const priority = document.querySelector('.commercial-priority-summary');
        if (!priority) return;

        const section = document.createElement('section');
        section.id = 'pdiPhaseSummary';
        section.innerHTML = `
            <div class="phase-summary-title">
                <div>
                    <h2>Vehicles by Phase</h2>
                    <p>Current workflow distribution. Select a phase to open the vehicle register.</p>
                </div>
            </div>
            <div class="phase-summary-grid">
                <div class="phase-summary-card" data-phase="1"><strong id="phaseSummary1">0</strong><span>Phase 1</span><small>Arrival & Check-In</small></div>
                <div class="phase-summary-card" data-phase="bodybuilder"><strong id="phaseSummaryBodybuilder">0</strong><span>Phase 2</span><small>Bodybuilder Fitment</small></div>
                <div class="phase-summary-card" data-phase="2"><strong id="phaseSummary2">0</strong><span>Phase 3</span><small>Estimate & Preparation</small></div>
                <div class="phase-summary-card" data-phase="3"><strong id="phaseSummary3">0</strong><span>Phase 4</span><small>PDI, Repairs & Paint</small></div>
                <div class="phase-summary-card" data-phase="4"><strong id="phaseSummary4">0</strong><span>Phase 5</span><small>Sales & Handover</small></div>
            </div>
        `;
        priority.insertAdjacentElement('afterend', section);

        section.querySelectorAll('.phase-summary-card').forEach(card => {
            card.addEventListener('click', () => {
                const active = document.getElementById('activeVehicles');
                if (active) {
                    openCollapsible(active);
                    active.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                const phase = card.dataset.phase;
                const filter = document.getElementById('pdiPhaseFilter');
                if (filter && phase !== 'bodybuilder') {
                    filter.value = phase;
                    filter.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        });
    }

    function makeCollapsible(section, options = {}) {
        if (!section || section.dataset.dashboardCollapsible === '1') return;

        const heading = section.querySelector('.section-heading, .section-header');
        if (!heading) return;

        section.dataset.dashboardCollapsible = '1';
        section.classList.add('dashboard-collapsible');

        const title = heading.querySelector('h2')?.textContent?.trim() || options.title || 'Section';
        const description = heading.querySelector('p')?.textContent?.trim() || '';

        const body = document.createElement('div');
        body.className = 'dashboard-collapse-body';

        const children = Array.from(section.children).filter(child => child !== heading);
        children.forEach(child => body.appendChild(child));

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'dashboard-collapse-toggle';
        toggle.innerHTML = `
            <div class="dashboard-collapse-heading">
                <h2>${title}<span class="dashboard-count-pill" data-count-for="${section.id}">0</span></h2>
                ${description ? `<p>${description}</p>` : ''}
            </div>
            <span class="collapse-chevron">⌄</span>
        `;

        heading.replaceWith(toggle);
        section.appendChild(body);

        toggle.addEventListener('click', () => {
            section.classList.toggle('is-open');
        });

        if (options.open) section.classList.add('is-open');
    }

    function openCollapsible(section) {
        if (section?.classList.contains('dashboard-collapsible')) {
            section.classList.add('is-open');
        }
    }

    function ensureAwaitingSearch() {
        const section = document.getElementById('awaitingArrivalSection');
        if (!section || section.querySelector('#awaitingArrivalSearch')) return;
        const body = section.querySelector('.dashboard-collapse-body') || section;
        const table = body.querySelector('.table-wrapper');
        if (!table) return;

        const input = document.createElement('input');
        input.id = 'awaitingArrivalSearch';
        input.type = 'search';
        input.className = 'dashboard-inline-search';
        input.placeholder = 'Search stock no., VIN, OEM, make, model, customer or salesperson...';
        table.insertAdjacentElement('beforebegin', input);

        input.addEventListener('input', () => {
            const term = input.value.trim().toLowerCase();
            document.querySelectorAll('#awaitingArrivalTableBody tr').forEach(row => {
                row.style.display = !term || row.textContent.toLowerCase().includes(term) ? '' : 'none';
            });
        });
    }

    function updateCounts() {
        const cases = getCases();
        const active = cases.filter(item => item.workflow_status !== 'Completed');
        const awaiting = active.filter(isAwaitingArrival);
        const receivedActive = active.filter(item => !isAwaitingArrival(item));

        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = String(value);
        };

        set('metricAwaitingArrival', awaiting.length);

        // Phase 1: received/arrival workflow. Phase 2 is bodybuilder, which is tracked
        // independently from the original current_phase numbering and must not gate work.
        set('phaseSummary1', receivedActive.filter(item => Number(item.current_phase) === 1).length);
        set('phaseSummary2', receivedActive.filter(item => Number(item.current_phase) === 2).length);
        set('phaseSummary3', receivedActive.filter(item => Number(item.current_phase) === 3).length);
        set('phaseSummary4', receivedActive.filter(item => Number(item.current_phase) === 4).length);

        // Bodybuilder count is deliberately conservative: only count records that expose
        // an active bodybuilder marker in the loaded case data. This avoids inventing state.
        const bodybuilderCount = receivedActive.filter(item =>
            item.bodybuilder_required === true ||
            item.bodybuilder_required === 'yes' ||
            item.bodybuilder_status === 'Required' ||
            item.bodybuilder_status === 'Dispatched'
        ).length;
        set('phaseSummaryBodybuilder', bodybuilderCount);

        const awaitingPill = document.querySelector('[data-count-for="awaitingArrivalSection"]');
        if (awaitingPill) awaitingPill.textContent = String(awaiting.length);

        const activePill = document.querySelector('[data-count-for="activeVehicles"]');
        if (activePill) activePill.textContent = String(active.length);

        const actionsPill = document.querySelector('[data-count-for="myActions"]');
        if (actionsPill) {
            const actionRows = document.querySelectorAll('#myActionsList > *');
            const empty = document.querySelector('#myActionsList .empty-state');
            actionsPill.textContent = empty ? '0' : String(actionRows.length);
        }

        const archivePill = document.querySelector('[data-count-for="archiveSection"]');
        if (archivePill) {
            archivePill.textContent = String(cases.filter(item => item.workflow_status === 'Completed').length);
        }
    }

    function tidyPreArrivalOrderSection() {
        const section = document.getElementById('preArrivalOrderSection');
        if (!section) return;
        makeCollapsible(section);
    }

    function setupDashboard() {
        injectStyles();
        ensureAwaitingArrivalMetric();
        ensurePhaseSummary();

        makeCollapsible(document.getElementById('awaitingArrivalSection'));
        makeCollapsible(document.getElementById('myActions'));
        makeCollapsible(document.getElementById('activeVehicles'));
        makeCollapsible(document.querySelector('.reports-export-card'));
        makeCollapsible(document.getElementById('archiveSection'));
        tidyPreArrivalOrderSection();
        ensureAwaitingSearch();
        updateCounts();
    }

    // Keep UI counts aligned after existing async renderers refresh the page.
    const observer = new MutationObserver(() => {
        window.clearTimeout(window.__pdiDashboardCleanupTimer);
        window.__pdiDashboardCleanupTimer = window.setTimeout(updateCounts, 80);
    });

    function start() {
        setupDashboard();
        observer.observe(document.body, { childList: true, subtree: true });
        window.setInterval(updateCounts, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
        start();
    }
})();
