/* =========================================================
   EMS PHASE 2 RENDER FIX
   Keeps Phase 2 UI in sync with the saved ems_cases record.
========================================================= */

(function () {
    function renderEmsPhase2Fixed(caseData) {
        if (!caseData || Number(caseData.current_phase) !== 2) return;

        const phaseStatus = document.getElementById('emsPhase2Status');
        const receivedStep = document.getElementById('emsStepForemanReceived');
        const receivedText = document.getElementById('emsForemanReceivedStatusText');
        const receivedButton = document.getElementById('confirmEmsForemanReceivedButton');
        const technicianStep = document.getElementById('emsStepTechnicianAssignment');
        const technicianText = document.getElementById('emsTechnicianAssignmentStatusText');

        const foremanReceived = Boolean(caseData.foreman_job_card_received_at);
        const technicianAssigned = Boolean(caseData.technician_assigned_at);

        if (foremanReceived) {
            if (phaseStatus) phaseStatus.textContent = technicianAssigned ? 'Technician Assigned' : 'Awaiting Technician';

            if (receivedStep) {
                receivedStep.classList.remove('active', 'locked');
                receivedStep.classList.add('completed');
            }

            if (receivedText) {
                receivedText.textContent = 'Job Card receipt confirmed by Foreman.';
            }

            if (receivedButton) {
                receivedButton.disabled = true;
                receivedButton.textContent = '✓ Job Card Received';
            }

            if (technicianStep) {
                technicianStep.classList.remove('locked');
                technicianStep.classList.toggle('active', !technicianAssigned);
                technicianStep.classList.toggle('completed', technicianAssigned);
            }

            if (technicianText) {
                technicianText.textContent = technicianAssigned
                    ? 'Technician assignment completed.'
                    : 'Ready for technician assignment.';
            }
        } else {
            if (phaseStatus) phaseStatus.textContent = 'Awaiting Job Card';

            if (receivedStep) {
                receivedStep.classList.remove('completed', 'locked');
                receivedStep.classList.add('active');
            }

            if (receivedButton) {
                receivedButton.disabled = false;
                receivedButton.textContent = 'Confirm Job Card Received';
            }

            if (technicianStep) {
                technicianStep.classList.remove('active', 'completed');
                technicianStep.classList.add('locked');
            }
        }
    }

    // Patch workflow opening so Phase 2 always renders from the saved record.
    const originalOpenEmsWorkflow = window.openEmsWorkflow;
    if (typeof originalOpenEmsWorkflow === 'function') {
        window.openEmsWorkflow = function (emsId) {
            originalOpenEmsWorkflow(emsId);
            const selected = Array.isArray(window.emsCases)
                ? window.emsCases.find(item => String(item.id) === String(emsId))
                : null;
            renderEmsPhase2Fixed(selected || window.emsSelectedCase);
        };
    }

    // The HTML button is confirmEmsForemanReceivedButton. The older core listener
    // looks for a different ID, so handle the actual button here.
    document.addEventListener('click', async function (event) {
        const button = event.target.closest('#confirmEmsForemanReceivedButton');
        if (!button) return;

        const selectedCase = window.emsSelectedCase;
        if (!selectedCase) {
            alert('No EMS vehicle selected.');
            return;
        }

        if (selectedCase.foreman_job_card_received_at) {
            renderEmsPhase2Fixed(selectedCase);
            return;
        }

        const confirmed = confirm(
            `Confirm that Job Card ${selectedCase.job_card_no || ''} has been physically received by the Foreman?`
        );
        if (!confirmed) return;

        try {
            button.disabled = true;
            button.textContent = 'Confirming...';

            const { data: { user }, error: userError } = await window.supabaseClient.auth.getUser();
            if (userError) throw userError;
            if (!user) throw new Error('No signed-in user found.');

            const receivedTime = new Date().toISOString();
            const { data, error } = await window.supabaseClient
                .from('ems_cases')
                .update({
                    foreman_job_card_received_at: receivedTime,
                    foreman_job_card_received_by: user.id,
                    current_step: 2,
                    current_step_started_at: receivedTime,
                    updated_at: receivedTime
                })
                .eq('id', selectedCase.id)
                .select()
                .single();

            if (error) throw error;

            // Core state is declared with let, so update it through direct names when available.
            try { emsSelectedCase = data; } catch (_) {}
            try { await loadEmsCases(); } catch (_) {}

            renderEmsPhase2Fixed(data);

            // Re-open after dashboard reload so every workflow field reflects the saved row.
            try { window.openEmsWorkflow(data.id); } catch (_) {}

        } catch (error) {
            console.error('EMS Foreman Job Card receipt failed:', error);
            alert('Job Card receipt could not be confirmed.\n\n' + (error.message || 'Unknown error'));
            button.disabled = false;
            button.textContent = 'Confirm Job Card Received';
        }
    });

    window.renderEmsPhase2Fixed = renderEmsPhase2Fixed;
})();
