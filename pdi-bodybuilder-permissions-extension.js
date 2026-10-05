/* =========================================================
   PDI BODYBUILDER PERMISSIONS EXTENSION
   Bodybuilder management is restricted to Sales Admin
   (full system administrators retain override access).
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

    function canManageBodybuilder() {
        if (!window.pdiUserProfile && typeof pdiUserProfile === 'undefined') {
            return false;
        }

        const profile =
            typeof pdiUserProfile !== 'undefined'
                ? pdiUserProfile
                : window.pdiUserProfile;

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

        console.log(
            'Bodybuilder permissions applied:',
            canManage ? 'Sales Admin management access' : 'Read-only access'
        );
    }

    window.initialiseBodybuilderPhase =
        async function (selectedCase) {
            await originalInitialiseBodybuilderPhase(selectedCase);
            applyBodybuilderPermissions();
        };
})();
