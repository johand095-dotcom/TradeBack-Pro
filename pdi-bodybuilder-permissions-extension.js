/* =========================================================
   PDI BODYBUILDER PERMISSIONS EXTENSION
   Bodybuilder management is restricted to Sales Admin
   (full system administrators retain override access).

   Bodybuilder tracking is intentionally NON-GATING:
   dispatch / return may run in parallel with the main PDI flow.
========================================================= */
(function () {
    'use strict';

    const originalInitialiseBodybuilderPhase =
        window.initialiseBodybuilderPhase;

    if (typeof originalInitialiseBodybuilderPhase !== 'function') {
        console.warn(
            'Bodybuilder permissions extension: initialiseBodybuilderPhase was not found.'
        );
        return;
    }

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

    function getProfile() {
        return typeof pdiUserProfile !== 'undefined'
            ? pdiUserProfile
            : window.pdiUserProfile;
    }

    function canManageBodybuilder() {
        const profile = getProfile();

        if (!profile) {
            return false;
        }

        const roles = normaliseRoles(profile);

        return (
            profile?.is_active !== false &&
            (
                profile?.is_admin === true ||
                roles.includes('sales admin')
            )
        );
    }

    function applyBodybuilderPermissions() {
        const section =
            document.getElementById('bodybuilderPhaseSection');

        if (!section) {
            return;
        }

        const canManage = canManageBodybuilder();

        const managementControlIds = [
            'bodybuilderRequired',
            'bodybuilderSupplier',
            'bodybuilderDescription',
            'bodybuilderEstimatedDays',
            'bodybuilderCheckoutFront',
            'bodybuilderCheckoutRear',
            'bodybuilderCheckoutLeft',
            'bodybuilderCheckoutRight',
            'bodybuilderCheckoutFuel',
            'bodybuilderReturnFront',
            'bodybuilderReturnRear',
            'bodybuilderReturnLeft',
            'bodybuilderReturnRight',
            'bodybuilderReturnFuel'
        ];

        managementControlIds.forEach(id => {
            const control = document.getElementById(id);
            if (control) {
                control.disabled = !canManage;
            }
        });

        const actionButtonIds = [
            'saveBodybuilderDetailsBtn',
            'bodybuilderCheckoutBtn',
            'bodybuilderReturnBtn'
        ];

        actionButtonIds.forEach(id => {
            const button = document.getElementById(id);
            if (button) {
                button.style.display = canManage ? '' : 'none';
                button.disabled = !canManage;
            }
        });

        let notice =
            document.getElementById('bodybuilderPermissionNotice');

        if (!canManage) {
            if (!notice) {
                notice = document.createElement('div');
                notice.id = 'bodybuilderPermissionNotice';
                notice.style.margin = '0 0 16px 0';
                notice.style.padding = '12px 14px';
                notice.style.border = '1px solid #cbd5e1';
                notice.style.borderRadius = '10px';
                notice.style.background = '#f8fafc';
                notice.style.color = '#475569';
                notice.style.fontWeight = '600';
                notice.textContent =
                    'Bodybuilder fitment is managed by Sales Admin. This phase is read-only for your role.';

                const content =
                    document.getElementById('bodybuilderWorkflowContent');

                content?.prepend(notice);
            }
        } else if (notice) {
            notice.remove();
        }
    }

    async function loadBodybuilderVisit(caseId) {
        const client = window.supabaseClient;

        if (!client || !caseId) {
            return null;
        }

        const { data, error } =
            await client
                .from('pdi_bodybuilder_visits')
                .select(`
                    id,
                    bodybuilder_required,
                    supplier_name,
                    body_description,
                    estimated_days,
                    status,
                    checkout_at,
                    returned_at
                `)
                .eq('pdi_case_id', caseId)
                .maybeSingle();

        if (error) {
            console.error(
                'Bodybuilder permissions extension: could not load visit state:',
                error
            );
            return null;
        }

        return data || null;
    }

    async function restoreBodybuilderTrackingPanels(selectedCase) {
        const checkoutPanel =
            document.getElementById('bodybuilderCheckoutPanel');
        const returnPanel =
            document.getElementById('bodybuilderReturnPanel');
        const requiredSelect =
            document.getElementById('bodybuilderRequired');

        if (!checkoutPanel || !returnPanel || !requiredSelect) {
            return;
        }

        checkoutPanel.classList.add('hidden');
        returnPanel.classList.add('hidden');

        const visit =
            await loadBodybuilderVisit(selectedCase?.id);

        const isRequired =
            requiredSelect.value === 'yes' ||
            visit?.bodybuilder_required === true;

        if (!isRequired || !visit) {
            return;
        }

        if (visit.returned_at || visit.status === 'Completed') {
            // Completed visit remains visible as history, but no further action is required.
            returnPanel.classList.remove('hidden');
            return;
        }

        if (visit.checkout_at || visit.status === 'At Bodybuilder') {
            // Vehicle has left ELT: show the receiving-back controls.
            returnPanel.classList.remove('hidden');
            return;
        }

        // Required + details saved, but not yet dispatched.
        checkoutPanel.classList.remove('hidden');
    }

    function wrapActionForPanelRefresh(buttonId, selectedCase) {
        const button = document.getElementById(buttonId);

        if (!button || button.dataset.bodybuilderPanelRefresh === '1') {
            return;
        }

        const originalOnClick = button.onclick;

        if (typeof originalOnClick !== 'function') {
            return;
        }

        button.onclick = async function (event) {
            await originalOnClick.call(this, event);
            await restoreBodybuilderTrackingPanels(selectedCase);
            applyBodybuilderPermissions();
        };

        button.dataset.bodybuilderPanelRefresh = '1';
    }

    window.initialiseBodybuilderPhase =
        async function (selectedCase) {
            await originalInitialiseBodybuilderPhase(selectedCase);

            applyBodybuilderPermissions();
            await restoreBodybuilderTrackingPanels(selectedCase);

            // The original PDI code already owns all save/dispatch/return logic.
            // We only restore the correct panel after those actions complete.
            wrapActionForPanelRefresh(
                'saveBodybuilderDetailsBtn',
                selectedCase
            );
            wrapActionForPanelRefresh(
                'bodybuilderCheckoutBtn',
                selectedCase
            );
            wrapActionForPanelRefresh(
                'bodybuilderReturnBtn',
                selectedCase
            );

            const requiredSelect =
                document.getElementById('bodybuilderRequired');

            if (requiredSelect) {
                const originalOnChange = requiredSelect.onchange;

                requiredSelect.onchange = async function (event) {
                    if (typeof originalOnChange === 'function') {
                        originalOnChange.call(this, event);
                    }

                    // Selecting Yes exposes details first. Dispatch becomes
                    // available after the bodybuilder details have been saved.
                    if (this.value !== 'yes') {
                        document
                            .getElementById('bodybuilderCheckoutPanel')
                            ?.classList.add('hidden');
                        document
                            .getElementById('bodybuilderReturnPanel')
                            ?.classList.add('hidden');
                    } else {
                        await restoreBodybuilderTrackingPanels(selectedCase);
                    }

                    applyBodybuilderPermissions();
                };
            }

            console.log(
                'Bodybuilder extension ready:',
                canManageBodybuilder()
                    ? 'Sales Admin management access'
                    : 'Read-only access',
                '(non-gating tracking enabled)'
            );
        };
})();
