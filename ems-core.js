/* =========================================================
   ELT VEHICLE SUITE
   EMS OPERATIONS MODULE v1.0

   SECTION 1
   SUPABASE CONNECTION + AUTHENTICATION
========================================================= */


/* =========================================================
   SUPABASE CONFIGURATION
========================================================= */

const SUPABASE_URL =
    'https://upkmtznkhfbwadofaxno.supabase.co';

const SUPABASE_KEY =
    'sb_publishable_Al-SumF_BuGOzzwpIX_yBw_LwGJUYet';

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================================
   APPLICATION STATE
========================================================= */

let emsSession = null;
let emsUserProfile = null;
let emsCases = [];
let emsSelectedCase = null;


/* =========================================================
   DOM REFERENCES
========================================================= */

const emsApplication =
    document.getElementById('emsApplication');

const emsLoginMessage =
    document.getElementById('emsLoginMessage');

const signedInUser =
    document.getElementById('signedInUser');

const signOutButton =
    document.getElementById('signOutButton');


/* =========================================================
   LOGIN MESSAGE
========================================================= */

function setEmsLoginMessage(
    message,
    isError = false
) {

    if (!emsLoginMessage) return;

    emsLoginMessage.textContent =
        message || '';

    emsLoginMessage.classList.toggle(
        'hidden',
        !message
    );

    emsLoginMessage.classList.toggle(
        'error',
        Boolean(isError)
    );
}


/* =========================================================
   LOAD USER PROFILE
========================================================= */

async function loadEmsUserProfile() {

    if (!emsSession?.user?.id) {

        emsUserProfile = null;

        return false;
    }

    const {
        data,
        error
    } =
        await supabaseClient
            .from('user_profiles')
            .select(
                `
                user_id,
                full_name,
                email,
                roles,
                is_admin,
                is_active
                `
            )
            .eq(
                'user_id',
                emsSession.user.id
            )
            .single();

    if (error) {

        console.error(
            'Could not load EMS user profile:',
            error
        );

        emsUserProfile = null;

        return false;
    }

    if (!data?.is_active) {

        console.error(
            'EMS user profile is inactive.'
        );

        emsUserProfile = null;

        return false;
    }

    emsUserProfile = data;

    return true;
}


/* =========================================================
   DISPLAY SIGNED-IN USER
========================================================= */

function updateEmsSignedInUser() {

    if (!signedInUser) return;

    if (!emsUserProfile) {

        signedInUser.textContent =
            emsSession?.user?.email
                ? `Signed in: ${emsSession.user.email}`
                : 'Not signed in';

        return;
    }

    const roles =
        emsUserProfile.roles || [];

    const accessText =
        emsUserProfile.is_admin
            ? 'Administrator'
            : roles.join(', ');

    signedInUser.textContent =
        `${emsUserProfile.full_name} · ${accessText}`;
}


/* =========================================================
   SHOW EMS APPLICATION
========================================================= */

function showEmsApplication() {

    if (!emsApplication) {

        console.error(
            'emsApplication element was not found.'
        );

        return;
    }

    emsApplication.classList.remove(
        'hidden'
    );

    setEmsLoginMessage('');
}


/* =========================================================
   HIDE EMS APPLICATION
========================================================= */

function hideEmsApplication() {

    if (!emsApplication) return;

    emsApplication.classList.add(
        'hidden'
    );
}


/* =========================================================
   SIGN OUT
========================================================= */

async function signOutEmsUser() {

    const {
        error
    } =
        await supabaseClient.auth.signOut();

    if (error) {

        console.error(
            'EMS sign-out failed:',
            error
        );

        alert(
            'Unable to sign out.'
        );

        return;
    }

    window.location.href =
        'index.html';
}


if (signOutButton) {

    signOutButton.onclick =
        signOutEmsUser;
}


/* =========================================================
   INITIALISE EMS MODULE
========================================================= */

async function initialiseEmsModule() {}

/* =========================================================
   EMS BOOKING PANEL
========================================================= */

function openEmsBookingPanel() {
    const panel = document.getElementById('emsBookingPanel');

    if (!panel) {
        console.error('EMS booking panel not found.');
        return;
    }

    panel.classList.remove('hidden');

    const bookingDate = document.getElementById('emsBookingDate');

    if (bookingDate && !bookingDate.value) {
        const today = new Date();
        const localDate = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0')
        ].join('-');

        bookingDate.value = localDate;
    }

    panel.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}


function closeEmsBookingPanel() {
    const panel = document.getElementById('emsBookingPanel');

    if (!panel) return;

    panel.classList.add('hidden');
}


/* ---------------------------------------------------------
   BOOKING PANEL BUTTON EVENTS
--------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {

    const newBookingButton =
        document.getElementById('newEmsBookingButton');

    const closeBookingButton =
        document.getElementById('closeEmsBookingButton');

    const cancelBookingButton =
        document.getElementById('cancelEmsBookingButton');


    if (newBookingButton) {
        newBookingButton.addEventListener(
            'click',
            openEmsBookingPanel
        );
    }


    if (closeBookingButton) {
        closeBookingButton.addEventListener(
            'click',
            closeEmsBookingPanel
        );
    }


    if (cancelBookingButton) {
        cancelBookingButton.addEventListener(
            'click',
            closeEmsBookingPanel
        );
    }
    });
/* ---------------------------------------------------------
   EMS SIGNED-IN USER DISPLAY
--------------------------------------------------------- */

async function loadEmsSignedInUser() {
    const signedInUser = document.getElementById('signedInUser');

    if (!signedInUser) return;

    try {
        const { data, error } = await supabaseClient.auth.getSession();

        if (error) {
            console.error('EMS session error:', error);
            signedInUser.textContent = 'User';
            return;
        }

        const user = data?.session?.user;

        if (!user) {
            signedInUser.textContent = 'Not signed in';
            return;
        }

        const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'User';

        const role =
            user.user_metadata?.role ||
            user.app_metadata?.role ||
            'Administrator';

        signedInUser.textContent = `${fullName} · ${role}`;

    } catch (error) {
        console.error('EMS user display error:', error);
        signedInUser.textContent = 'User';
    }
}

document.addEventListener('DOMContentLoaded', loadEmsSignedInUser);
/* =========================================================
   EMS BOOKING FORM
   Create new EMS case
========================================================= */

const emsBookingForm = document.getElementById('emsBookingForm');

if (emsBookingForm) {
    emsBookingForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        console.log('EMS booking form submitted');

        const registration =
            document.getElementById('emsRegistration')?.value.trim() || '';

        const vin =
            document.getElementById('emsVin')?.value.trim() || '';

        const make =
    document.getElementById('emsVehicleMake')?.value.trim() || '';

const model =
    document.getElementById('emsVehicleModel')?.value.trim() || '';

        const customer =
            document.getElementById('emsCustomer')?.value.trim() || '';

        const contactPerson =
            document.getElementById('emsContactPerson')?.value.trim() || '';

        const contactNumber =
            document.getElementById('emsContactNumber')?.value.trim() || '';

        const jobCard =
            document.getElementById('emsJobCard')?.value.trim() || '';

        const bookingDate =
            document.getElementById('emsBookingDate')?.value || '';

        const expectedArrival =
            document.getElementById('emsExpectedArrival')?.value || '';

        const workDescription =
            document.getElementById('emsWorkDescription')?.value.trim() || '';

        const notes =
            document.getElementById('emsBookingNotes')?.value.trim() || '';

       try {
    const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

    if (sessionError) {
        throw sessionError;
    }

    const user = sessionData?.session?.user;

    if (!user) {
        throw new Error('No authenticated user found.');
    }

    // Generate EMS number
    const today = new Date();
    const datePart =
        today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, '0') +
        String(today.getDate()).padStart(2, '0');

    const randomPart =
        String(Math.floor(Math.random() * 900) + 100);

    const emsNo = `EMS-${datePart}-${randomPart}`;

    const newCase = {
        ems_no: emsNo,
        vin: vin,
        registration_no: registration || null,

        vehicle_make: make,
        vehicle_model: model,

        customer_name: customer,
        contact_person: contactPerson || null,
        contact_number: contactNumber || null,

        job_card_no: jobCard || null,

        booking_date: bookingDate,
        expected_arrival: expectedArrival || null,

        booking_details: workDescription,
        notes: notes || null,

        workflow_status: 'In Progress',
        current_phase: 1,
        current_step: 1,

        started_at: new Date().toISOString(),
        current_step_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),

        created_by: user.id
    };

    console.log('Creating EMS case:', newCase);

    const { data, error } = await supabaseClient
        .from('ems_cases')
        .insert([newCase])
        .select()
        .single();

    if (error) {
        throw error;
    }

    console.log('EMS CASE CREATED:', data);

    alert(`EMS Booking ${data.ems_no} created successfully.`);

    emsBookingForm.reset();

    closeEmsBookingPanel();

} catch (error) {
    console.error('EMS booking creation failed:', error);

    alert(
        'EMS booking could not be created.\n\n' +
        (error.message || 'Unknown error')
    );
}
});
}

/* ============================================================
   SECTION 8
   EMS DASHBOARD DATA LOADER
============================================================ */

async function loadEmsCases() {
    console.log('Loading EMS cases from Supabase...');

    try {
     const { data, error } = await supabaseClient
    .from('ems_cases')
    .select('*');

        if (error) {
            throw error;
        }

        emsCases = data || [];

        console.log('EMS CASES LOADED:', emsCases);
        renderEmsDashboard();

    } catch (error) {
        console.error('Failed to load EMS cases:', error);
        emsCases = [];
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadEmsCases();
});

/* ============================================================
   EMS DASHBOARD RENDERING
============================================================ */

function renderEmsDashboard() {
    const dashboardBody = document.getElementById('emsDashboardBody');

    const activeCount = document.getElementById('emsActiveCount');
    const phase1Count = document.getElementById('emsPhase1Count');
    const phase2Count = document.getElementById('emsPhase2Count');
    const phase3Count = document.getElementById('emsPhase3Count');
    const phase4Count = document.getElementById('emsPhase4Count');

    if (!dashboardBody) {
        console.error('EMS dashboard body not found.');
        return;
    }

    const activeCases = emsCases.filter(
        item => item.workflow_status !== 'Completed'
    );

    // Update dashboard counters
    if (activeCount) {
        activeCount.textContent = activeCases.length;
    }

    if (phase1Count) {
        phase1Count.textContent =
            activeCases.filter(item => Number(item.current_phase) === 1).length;
    }

    if (phase2Count) {
        phase2Count.textContent =
            activeCases.filter(item => Number(item.current_phase) === 2).length;
    }

    if (phase3Count) {
        phase3Count.textContent =
            activeCases.filter(item => Number(item.current_phase) === 3).length;
    }

    if (phase4Count) {
        phase4Count.textContent =
            activeCases.filter(item => Number(item.current_phase) === 4).length;
    }

    // Empty state
    if (activeCases.length === 0) {
        dashboardBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-table">
                    No active EMS vehicles.
                </td>
            </tr>
        `;
        return;
    }

    // Render vehicle rows
    dashboardBody.innerHTML = activeCases.map(item => {

        const bookingDate = item.booking_date
            ? new Date(item.booking_date + 'T00:00:00').toLocaleDateString('en-ZA')
            : '-';

        const startDate = item.started_at
            ? new Date(item.started_at)
            : null;

        const daysInProgress = startDate
            ? Math.max(
                0,
                Math.floor(
                    (Date.now() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
            )
            : 0;

        return `
            <tr>
                <td>${item.registration_no || '-'}</td>
                <td>${item.vin || '-'}</td>
                <td>${item.job_card_no || '-'}</td>
                <td>${bookingDate}</td>
                <td>Phase ${item.current_phase || 1}</td>
                <td>${item.workflow_status || 'In Progress'}</td>
                <td>${daysInProgress}</td>
                <td>
                    <button
                        type="button"
                        class="secondary-button"
                        data-ems-id="${item.id}"
                    >
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    console.log('EMS dashboard rendered:', activeCases.length);
}
/* ============================================================
   EMS VEHICLE WORKFLOW
============================================================ */
function renderEmsPhase1(caseData) {

    const arrivalButton =
        document.getElementById('confirmEmsArrivalButton');

    const arrivalStatusText =
        document.getElementById('emsArrivalStatusText');

    const jobCardStep =
        document.getElementById('emsStepJobCard');

    const jobCardInput =
        document.getElementById('emsActualJobCard');

    const jobCardButton =
        document.getElementById('confirmEmsJobCardButton');

    const jobCardStatusText =
        document.getElementById('emsJobCardStatusText');
     const phase1StatusBadge =
    document.getElementById('emsPhase1Status');

    if (!arrivalButton || !jobCardStep || !jobCardInput || !jobCardButton) {
        console.warn('EMS Phase 1 controls not found.');
        return;
    }

    const vehicleArrived = Boolean(caseData.vehicle_arrived_at);
    const jobCardOpened = Boolean(caseData.job_card_opened_at);

    /* ==========================================
   PHASE 1 STATUS BADGE
========================================== */

if (phase1StatusBadge) {

    phase1StatusBadge.classList.remove(
        'awaiting',
        'received',
        'completed'
    );

    if (jobCardOpened) {
        phase1StatusBadge.textContent = 'Job Card Opened';
        phase1StatusBadge.classList.add('completed');

    } else if (vehicleArrived) {
        phase1StatusBadge.textContent = 'Vehicle Received';
        phase1StatusBadge.classList.add('received');

    } else {
        phase1StatusBadge.textContent = 'Awaiting Vehicle';
        phase1StatusBadge.classList.add('awaiting');
    }
}

    /* ==========================================
       STEP 2 — VEHICLE ARRIVAL
       ========================================== */

    if (vehicleArrived) {

        arrivalButton.disabled = true;
        arrivalButton.textContent = '✓ Vehicle Arrived';

        if (arrivalStatusText) {
            arrivalStatusText.textContent =
                'Vehicle arrival confirmed.';
        }

    } else {

        arrivalButton.disabled = false;
        arrivalButton.textContent = 'Confirm Vehicle Arrived';

        if (arrivalStatusText) {
            arrivalStatusText.textContent =
                'Waiting for vehicle arrival.';
        }
    }


    /* ==========================================
       STEP 3 — JOB CARD / REPAIR ORDER
       ========================================== */

    if (vehicleArrived && !jobCardOpened) {

        jobCardStep.classList.remove('locked');

        jobCardInput.disabled = false;
        jobCardButton.disabled = false;

        jobCardButton.textContent =
            'Confirm Job Card Opened';

        if (jobCardStatusText) {
            jobCardStatusText.textContent =
                'Vehicle received. Enter the Repair Order / Job Card number.';
        }

    } else if (jobCardOpened) {

        jobCardStep.classList.remove('locked');

        jobCardInput.value =
            caseData.job_card_no || '';

        jobCardInput.disabled = true;
        jobCardButton.disabled = true;

        jobCardButton.textContent =
            '✓ Job Card Opened';

        if (jobCardStatusText) {
            jobCardStatusText.textContent =
                `Job Card ${caseData.job_card_no || ''} opened successfully.`;
        }

    } else {

        jobCardStep.classList.add('locked');

        jobCardInput.disabled = true;
        jobCardButton.disabled = true;

        jobCardButton.textContent =
            'Confirm Job Card Opened';

        if (jobCardStatusText) {
            jobCardStatusText.textContent =
                'Available after vehicle arrival is confirmed.';
        }
    }
}
function openEmsWorkflow(emsId) {

    const selectedCase = emsCases.find(
        item => String(item.id) === String(emsId)
    );

    if (!selectedCase) {
        console.error('EMS case not found:', emsId);
        return;
    }
    // Store the selected EMS case for workflow actions
emsSelectedCase = selectedCase;

    console.log('Opening EMS workflow:', selectedCase);

    const workflowSection =
        document.getElementById('emsWorkflowSection');

    document.getElementById('emsWorkflowTitle').textContent =
        selectedCase.registration_no ||
        selectedCase.vin ||
        'EMS Vehicle';

    document.getElementById('emsWorkflowNumber').textContent =
        selectedCase.ems_no || 'EMS Case';

    document.getElementById('emsWorkflowRegistration').textContent =
        selectedCase.registration_no || '-';

    document.getElementById('emsWorkflowVin').textContent =
        selectedCase.vin || '-';

    document.getElementById('emsWorkflowJobCard').textContent =
        selectedCase.job_card_no || '-';

    document.getElementById('emsWorkflowCustomer').textContent =
        selectedCase.customer_name || '-';

    document.getElementById('emsWorkflowPhase').textContent =
        `Phase ${selectedCase.current_phase || 1}`;

   document.getElementById('emsWorkflowStatus').textContent =
    selectedCase.workflow_status || 'In Progress';

/* Render current EMS phase */
renderEmsPhase1(selectedCase);

// ============================================
// DISPLAY CORRECT EMS PHASE
// ============================================

const phase1Workflow =
    document.getElementById('emsPhase1Workflow');

const phase2Workflow =
    document.getElementById('emsPhase2Workflow');

// Hide both first
if (phase1Workflow) {
    phase1Workflow.classList.add('hidden');
}

if (phase2Workflow) {
    phase2Workflow.classList.add('hidden');
}

// Show the phase stored on the EMS case
const currentPhase = Number(selectedCase.current_phase || 1);

if (currentPhase === 1) {

    if (phase1Workflow) {
        phase1Workflow.classList.remove('hidden');
    }

    renderEmsPhase1(selectedCase);

} else if (currentPhase === 2) {

    if (phase2Workflow) {
        phase2Workflow.classList.remove('hidden');
    }

}

workflowSection.classList.remove('hidden');
    workflowSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}


function closeEmsWorkflow() {

    const workflowSection =
        document.getElementById('emsWorkflowSection');

    if (workflowSection) {
        workflowSection.classList.add('hidden');
    }
}
document.addEventListener('click', (event) => {

    const viewButton =
        event.target.closest('[data-ems-id]');

    if (viewButton) {
        openEmsWorkflow(
            viewButton.dataset.emsId
        );
    }

});


document.addEventListener('DOMContentLoaded', () => {

    const closeWorkflowButton =
        document.getElementById('closeEmsWorkflowButton');

    if (closeWorkflowButton) {
        closeWorkflowButton.addEventListener(
            'click',
            closeEmsWorkflow
        );
    }

});
/* =========================================================
   EMS PHASE 1
   VEHICLE ARRIVAL
========================================================= */

const confirmEmsArrivalButton =
    document.getElementById('confirmEmsArrivalButton');

if (confirmEmsArrivalButton) {

    confirmEmsArrivalButton.addEventListener('click', async () => {

        if (!emsSelectedCase) {
            alert('No EMS vehicle selected.');
            return;
        }

        const confirmed = confirm(
            `Confirm that ${emsSelectedCase.registration_no || emsSelectedCase.vin} has arrived?`
        );

        if (!confirmed) return;

        try {

            confirmEmsArrivalButton.disabled = true;
            confirmEmsArrivalButton.textContent = 'Confirming...';

            /* Get signed-in user */
            const {
                data: { user },
                error: userError
            } = await supabaseClient.auth.getUser();

            if (userError) throw userError;

            if (!user) {
                throw new Error('No signed-in user found.');
            }

            const arrivalTime = new Date().toISOString();

            /* Update EMS case */
            const { data, error } = await supabaseClient
                .from('ems_cases')
                .update({
                    vehicle_arrived_at: arrivalTime,
                    vehicle_arrived_by: user.id,
                    current_step: 2,
                    current_step_started_at: arrivalTime,
                    updated_at: arrivalTime
                })
                .eq('id', emsSelectedCase.id)
                .select()
                .single();

            if (error) throw error;

            console.log('EMS VEHICLE ARRIVAL CONFIRMED:', data);

            /* Update local selected case */
            emsSelectedCase = data;

            /* Refresh dashboard data */
            await loadEmsCases();

           /* Refresh workflow display */
             openEmsWorkflow(data.id);
            alert(
                `${data.registration_no || data.vin} arrival confirmed successfully.`
            );

        } catch (error) {

            console.error('EMS arrival confirmation failed:', error);

            alert(
                'Vehicle arrival could not be confirmed.\n\n' +
                (error.message || 'Unknown error')
            );

            confirmEmsArrivalButton.disabled = false;
            confirmEmsArrivalButton.textContent =
                'Confirm Vehicle Arrived';
        }
    });
}
/* ============================================================
   EMS PHASE 1
   JOB CARD / REPAIR ORDER OPENED
============================================================ */

const confirmEmsJobCardButton =
    document.getElementById('confirmEmsJobCardButton');

if (confirmEmsJobCardButton) {

    confirmEmsJobCardButton.addEventListener('click', async () => {

        if (!emsSelectedCase) {
            alert('No EMS vehicle selected.');
            return;
        }

        const jobCardInput =
            document.getElementById('emsActualJobCard');

        const jobCardNo =
            jobCardInput?.value.trim();

        if (!jobCardNo) {
            alert('Please enter the Repair Order / Job Card number.');
            return;
        }

        const confirmed = confirm(
            `Confirm Repair Order / Job Card ${jobCardNo}?`
        );

        if (!confirmed) return;

        try {

            confirmEmsJobCardButton.disabled = true;
            confirmEmsJobCardButton.textContent = 'Saving...';

            /* Get signed-in user */

            const {
                data: { user },
                error: userError
            } = await supabaseClient.auth.getUser();

            if (userError) throw userError;

            if (!user) {
                throw new Error('No signed-in user found.');
            }

            const jobCardTime = new Date().toISOString();

            /* Update EMS case */

            const { data, error } = await supabaseClient
                .from('ems_cases')
                .update({
                    job_card_no: jobCardNo,
                    job_card_opened_at: jobCardTime,
                    current_phase: 2,
                    current_step: 1,
                    current_step_started_at: jobCardTime,
                    updated_at: jobCardTime
                })
                .eq('id', emsSelectedCase.id)
                .select()
                .single();

            if (error) throw error;

            console.log(
                'EMS JOB CARD OPENED:',
                data
            );

            /* Update selected vehicle */

            emsSelectedCase = data;

            /* Reload dashboard */

            await loadEmsCases();

            /* Re-render workflow */

            openEmsWorkflow(data.id);

            alert(
                `Repair Order / Job Card ${jobCardNo} opened successfully.`
            );

        } catch (error) {

            console.error(
                'EMS job card confirmation failed:',
                error
            );

            alert(
                'Job Card could not be confirmed.\n\n' +
                (error.message || 'Unknown error')
            );

            confirmEmsJobCardButton.disabled = false;
            confirmEmsJobCardButton.textContent =
                'Confirm Job Card Opened';
        }
    });
}
/* =========================================================
   EMS PHASE 2
   FOREMAN CONFIRMS PHYSICAL RECEIPT OF JOB CARD
========================================================= */

document.addEventListener('click', async (event) => {

    const confirmForemanJobCardButton =
        event.target.closest('#confirmForemanJobCardButton');

    if (!confirmForemanJobCardButton) return;
        if (!emsSelectedCase) {
            alert('No EMS vehicle selected.');
            return;
        }

        const confirmed = confirm(
            `Confirm that Job Card ${emsSelectedCase.job_card_no || ''} has been physically received by the Foreman?`
        );

        if (!confirmed) return;

        try {

            confirmForemanJobCardButton.disabled = true;
            confirmForemanJobCardButton.textContent = 'Confirming...';

            /* Get signed-in user */

            const {
                data: { user },
                error: userError
            } = await supabaseClient.auth.getUser();

            if (userError) throw userError;

            if (!user) {
                throw new Error('No signed-in user found.');
            }

            const receivedTime = new Date().toISOString();

            /* Update EMS case */

            const { data, error } = await supabaseClient
                .from('ems_cases')
                .update({
                    foreman_job_card_received_at: receivedTime,
                    foreman_job_card_received_by: user.id,
                    current_step: 2,
                    current_step_started_at: receivedTime,
                    updated_at: receivedTime
                })
                .eq('id', emsSelectedCase.id)
                .select()
                .single();

            if (error) throw error;

            console.log(
                'EMS JOB CARD RECEIVED BY FOREMAN:',
                data
            );

            /* Update selected EMS case */

            emsSelectedCase = data;

            /* Refresh dashboard */

            await loadEmsCases();

            /* Re-open workflow using updated record */

            openEmsWorkflow(data.id);

        } catch (error) {

            console.error(
                'EMS Foreman Job Card receipt failed:',
                error
            );

            alert(
                'Job Card receipt could not be confirmed.\n\n' +
                (error.message || 'Unknown error')
            );

            confirmForemanJobCardButton.disabled = false;
            confirmForemanJobCardButton.textContent =
                'Confirm Job Card Received';
                }

});