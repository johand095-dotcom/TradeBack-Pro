/* =========================================================
   ELT VEHICLE SUITE - PDI SALES PERSON PERMISSIONS

   Sales Person users may:
   - View only their allocated vehicles (scope is applied by the
     pre-arrival extension/core loader).
   - Open those vehicle workflows for visibility.
   - Use workflow actions that the core PDI role engine explicitly
     assigns to Sales Person.

   Sales Person users may NOT use administrative mutation controls.
   This file provides a UI/interaction guard. Supabase RLS should
   remain the authoritative data-security layer.
========================================================= */

(function () {
    'use strict';

    const SALES_ONLY_HIDDEN_IDS = [
        'deleteVehicleButton',
        'changeClassificationBtn',
        'workflowEtaOverridePanel',
        'workflowEtaOverrideToggle',
        'workflowEtaOverrideFields',
        'workflowEtaOverrideSave',
        'preArrivalOrderForm',
        'reportsExportCard'
    ];

    const SALES_ONLY_BLOCKED_IDS = new Set([
        'deleteVehicleButton',
        'changeClassificationBtn',
        'workflowEtaOverrideToggle',
        'workflowEtaOverrideSave',
        'saveClassificationButton',
        'savePreArrivalOrderBtn',
        'exportActiveVehiclesButton',
        'exportAwaitingArrivalButton',
        'saveBodybuilderDetailsBtn',
        'bodybuilderCheckoutBtn',
        'bodybuilderReturnBtn'
    ]);

    function normaliseRoles(profile) {
        let roles = profile?.roles || [];

        if (typeof roles === 'string') {
            try {
                roles = JSON.parse(roles);
            } catch (error) {
                roles = roles
                    .replace(/[\[\]"]/g, '')
                    .split(',')
                    .map(role => role.trim());
            }
        }

        if (!Array.isArray(roles)) {
            roles = [roles];
        }

        return roles.map(
            role => String(role).trim().toLowerCase()
        );
    }

    function isSalesPersonOnlyProfile() {
        if (typeof pdiUserProfile === 'undefined' || !pdiUserProfile) {
            return false;
        }

        if (pdiUserProfile.is_admin) {
            return false;
        }

        const roles = normaliseRoles(pdiUserProfile);

        return (
            roles.includes('sales person') &&
            !roles.includes('sales admin') &&
            !roles.includes('admin manager') &&
            !roles.includes('pdi admin') &&
            !roles.includes('pdi controller')
        );
    }

    function hideElementById(id) {
        const element = document.getElementById(id);
        if (!element) return;

        element.hidden = true;
        element.classList.add('hidden');
        element.style.setProperty('display', 'none', 'important');
        element.setAttribute('aria-hidden', 'true');
    }

    function restoreElementDisplay(id) {
        const element = document.getElementById(id);
        if (!element) return;

        // Only remove the hard override added by this extension.
        if (element.dataset.salesPermissionHidden === 'true') {
            element.style.removeProperty('display');
            element.removeAttribute('aria-hidden');
            delete element.dataset.salesPermissionHidden;
        }
    }

    function markAndHide(id) {
        const element = document.getElementById(id);
        if (!element) return;
        element.dataset.salesPermissionHidden = 'true';
        hideElementById(id);
    }

    function applySalesPersonPermissions() {
        if (!isSalesPersonOnlyProfile()) {
            SALES_ONLY_HIDDEN_IDS.forEach(restoreElementDisplay);
            return;
        }

        SALES_ONLY_HIDDEN_IDS.forEach(markAndHide);

        // These sections do not currently have stable IDs, so locate them
        // through their known controls and hide only the admin container.
        const savePreArrival = document.getElementById('savePreArrivalOrderBtn');
        const preArrivalSection = savePreArrival?.closest('section');
        if (preArrivalSection) {
            preArrivalSection.dataset.salesPermissionHidden = 'true';
            preArrivalSection.style.setProperty('display', 'none', 'important');
        }

        const exportButton = document.getElementById('exportActiveVehiclesButton');
        const reportsSection = exportButton?.closest('section');
        if (reportsSection) {
            reportsSection.dataset.salesPermissionHidden = 'true';
            reportsSection.style.setProperty('display', 'none', 'important');
        }

        // Bodybuilder administration is visible for reference, but its
        // mutation controls are not available to Sales Person users.
        [
            'saveBodybuilderDetailsBtn',
            'bodybuilderCheckoutBtn',
            'bodybuilderReturnBtn'
        ].forEach(markAndHide);

        console.log('Sales Person PDI permissions applied.');
    }

    // Capture-phase guard: even if another script makes a restricted
    // button visible later, the click cannot reach its mutation handler.
    document.addEventListener(
        'click',
        event => {
            if (!isSalesPersonOnlyProfile()) return;

            const target = event.target.closest('button, a, input, select');
            if (!target) return;

            if (SALES_ONLY_BLOCKED_IDS.has(target.id)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                console.warn(
                    'Blocked restricted PDI action for Sales Person:',
                    target.id
                );
            }
        },
        true
    );

    // Re-apply after dynamic workflow rendering and authentication updates.
    const observer = new MutationObserver(() => {
        if (isSalesPersonOnlyProfile()) {
            applySalesPersonPermissions();
        }
    });

    function startPermissionGuard() {
        applySalesPersonPermissions();

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'hidden', 'style']
        });

        // Authentication/profile loading is asynchronous. This short-lived
        // retry window catches restored sessions and fresh logins.
        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;
            applySalesPersonPermissions();

            if (attempts >= 20) {
                clearInterval(timer);
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startPermissionGuard);
    } else {
        startPermissionGuard();
    }
})();
