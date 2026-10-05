/* =========================================================
   EMS PHASE 2 RENDER FIX
   Keeps Phase 2 UI in sync with the saved ems_cases record.
========================================================= */

(function () {
    function getSelectedEmsCase() {
        // emsSelectedCase is declared with `let` in ems-core.js. Global `let`
        // bindings are shared by classic scripts, but are NOT properties of window.
        try {
            if (emsSelectedCase) return emsSelectedCase;
        } catch (_) {}

        try {
            if (Array.isArray(emsCases)) {
                const workflowNumber = document.getElementById('emsWorkflowNumber')?.textContent?.trim();
                const workflowVin = document.getElementById('emsWorkflowVin')?.textContent?.trim();

                return emsCases.find(item =>
                    (workflowNumber && String(item.ems_no || '') === workflowNumber) ||
                    (workflowVin && String(item.vin || '') === workflowVin)
                ) || null;
            }
        } catch (_) {}

        return null;
    }

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

            if (receivedText) receivedText.textContent = 'Job Card receipt confirmed by Foreman.';

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
    try {
        const originalOpenEmsWorkflow = openEmsWorkflow;
        if (typeof originalOpenEmsWorkflow === 'function') {
            openEmsWorkflow = function (emsId) {
                originalOpenEmsWorkflow(emsId);
                renderEmsPhase2Fixed(getSelectedEmsCase());
            };
        }
    } catch (error) {
        console.warn('EMS Phase 2 open-workflow patch could not be installed:', error);
    }

    // The HTML button is confirmEmsForemanReceivedButton. The older core listener
    // looks for a different ID, so handle the actual button here.
    document.addEventListener('click', async function (event) {
        const button = event.target.closest('#confirmEmsForemanReceivedButton');
        if (!button) return;

        // Prevent another delegated handler from processing the same click.
        event.stopImmediatePropagation();

        const selectedCase = getSelectedEmsCase();
        if (!selectedCase) {
            console.error('EMS Phase 2: selected case could not be resolved.');
            alert('The open EMS vehicle could not be resolved. Please close the workflow and open it again.');
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

            // supabaseClient is also a global lexical binding from ems-core.js,
            // so use it directly rather than window.supabaseClient.
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
            if (userError) throw userError;
            if (!user) throw new Error('No signed-in user found.');

            const receivedTime = new Date().toISOString();
            const { data, error } = await supabaseClient
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

            emsSelectedCase = data;
            await loadEmsCases();

            // loadEmsCases refreshes the array; restore the selected row from the
            // freshly loaded data before re-rendering the open workflow.
            const refreshedCase = emsCases.find(item => String(item.id) === String(data.id)) || data;
            emsSelectedCase = refreshedCase;

            openEmsWorkflow(refreshedCase.id);
            renderEmsPhase2Fixed(refreshedCase);

        } catch (error) {
            console.error('EMS Foreman Job Card receipt failed:', error);
            alert('Job Card receipt could not be confirmed.\n\n' + (error.message || 'Unknown error'));
            button.disabled = false;
            button.textContent = 'Confirm Job Card Received';
        }
    }, true);

    window.renderEmsPhase2Fixed = renderEmsPhase2Fixed;
})();
