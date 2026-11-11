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
    if (emsCases.length) renderEmsDashboard();
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
        item => !['completed','released','collected','archived','deleted'].includes(String(item.workflow_status||'').trim().toLowerCase())
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

    // Search the active vehicle list without changing phase KPI totals.
    const searchTerm = String(
        document.getElementById('emsSearchInput')?.value || ''
    ).trim().toLowerCase();
    const visibleCases = activeCases.filter(item =>
        !searchTerm || [
            item.registration_no, item.vin, item.job_card_no,
            item.ems_no, item.customer_name, item.workflow_status
        ].some(value => String(value ?? '').toLowerCase().includes(searchTerm))
    );

    // Empty state
    if (visibleCases.length === 0) {
        dashboardBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-table">
                    ${searchTerm ? 'No vehicles match your search.' : 'No active EMS vehicles.'}
                </td>
            </tr>
        `;
        return;
    }

    // Render vehicle rows
    dashboardBody.innerHTML = visibleCases.map(item => {

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
                    ${emsUserProfile?.is_admin===true?'<button type="button" class="ems-archive-button" data-ems-archive="'+item.id+'">Delete</button>':''}
                </td>
            </tr>
        `;
    }).join('');

    console.log('EMS dashboard rendered:', visibleCases.length);
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
 const archiveWorkflowButton=document.getElementById('emsArchiveWorkflowButton');
 if(archiveWorkflowButton){
  archiveWorkflowButton.classList.toggle('hidden',emsUserProfile?.is_admin!==true);
  archiveWorkflowButton.dataset.emsArchive=selectedCase.id;
 }

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
    renderEmsStepTracker(selectedCase).catch(console.error);
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
        event.target.closest('#confirmEmsForemanReceivedButton');

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
// Filter dashboard rows instantly while preserving phase totals.
document.addEventListener('input', event => {
    if (event.target?.id === 'emsSearchInput') renderEmsDashboard();
});

/* EMS phase dropdown, persisted audit steps and CSV reporting (TEST branch). */
const EMS_PHASE_STEPS = [
 ['1','booking','Vehicle booked'],['1','arrival','Vehicle arrives'],['1','jobcard','Job card opened'],
 ['2','foreman','Foreman receives job card'],['2','technician','Technician assigned'],
 ['3','assessed','Vehicle assessed'],['3','estimate','Estimate completed'],
 ['3','frontoffice','Estimate submitted to Front Office'],
 ['3','authrequest','Estimate submitted for authorisation'],
 ['3','assessor','Assessor required / not required'],
 ['3','authorised','Authorisation received (document required)'],
 ['3','repairsstart','Repairs in progress'],['3','repairsdone','Repairs completed'],
 ['3','qc','Quality control passed'],['3','handover','Job card handed to Front Office'],
 ['3','accepted','Job card accepted by Front Office'],
 ['3','invoiced','Job card invoiced (invoice number)'],
 ['4','released','Vehicle released (release note required)'],
 ['4','signed','Signed invoice / proof attached']
];

// Respect legacy workflow timestamps; never force users to repeat completed actions.
function emsLegacyStepDone(c,key){
 return Boolean((key==='booking'&&c.booking_date)||
 (key==='arrival'&&c.vehicle_arrived_at)||
 (key==='jobcard'&&c.job_card_opened_at)||
 (key==='foreman'&&c.foreman_job_card_received_at));
}
const emsEscape = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function renderEmsStepTracker(c){
 const panel=document.getElementById('emsStepTracker'), body=document.getElementById('emsStepTrackerBody');
 if(!panel||!body)return;
 panel.classList.remove('hidden');
 const {data,error}=await supabaseClient.from('ems_step_events')
   .select('step_key,completed_at,notes,attachment_path').eq('ems_case_id',c.id);
 if(error){body.textContent='Step history unavailable: '+error.message+' (TEST migration required).';return;}
 const events=data||[];
 body.innerHTML=[1,2,3,4].map(phase=>{
  const steps=EMS_PHASE_STEPS.filter(x=>Number(x[0])===phase);
  const completed=steps.filter(x=>events.some(e=>e.step_key===x[1])||emsLegacyStepDone(c,x[1])).length;
  const active=phase===Number(c.current_phase||1);
  const phaseName=['Booking & Receiving','Workshop Control','Assessment, Authorisation & Repairs','Final Close-Out'][phase-1];
  return `<details class="ems-tracker-phase ${active?'is-current':''}" ${active?'open':''}>
    <summary class="ems-tracker-summary">
      <span class="ems-tracker-phase-number">${String(phase).padStart(2,'0')}</span>
      <span class="ems-tracker-phase-title"><strong>Phase ${phase}</strong><span>${phaseName}</span></span>
      <span class="ems-tracker-progress">${completed} / ${steps.length} complete</span>
      <span class="ems-tracker-chevron" aria-hidden="true">⌄</span>
    </summary>
    <div class="ems-tracker-list">
      ${steps.map(([_,key,label],index)=>{
        const event=events.find(e=>e.step_key===key);
        const done=Boolean(event||emsLegacyStepDone(c,key));
        return `<div class="ems-tracker-row ${done?'is-done':''}">
          <span class="ems-tracker-index">${done?'✓':index+1}</span>
          <div class="ems-tracker-description">
            <strong>${emsEscape(label)}</strong>
            ${event?.notes?'<p>'+emsEscape(event.notes)+'</p>':''}
            ${event?.completed_at?'<small>Completed '+new Date(event.completed_at).toLocaleString('en-ZA')+'</small>':''}
          </div>
          <span class="ems-tracker-status ${done?'is-done':''}">${done?'Completed':'Outstanding'}</span>
          <div class="ems-tracker-actions">
            ${event?.attachment_path?'<button type="button" class="secondary-button" data-ems-file="'+emsEscape(event.attachment_path)+'">View document</button>':''}
            ${!done&&active?'<button type="button" class="secondary-button" data-ems-step="'+key+'">Complete step</button>':''}
          </div>
        </div>`;
      }).join('')}
    </div>
  </details>`;
 }).join('');
}
document.addEventListener('click',async e=>{
 const btn=e.target.closest('[data-ems-step]');if(!btn||!emsSelectedCase)return;
 const key=btn.dataset.emsStep;
 
 const stepDef=EMS_PHASE_STEPS.find(x=>x[1]===key);
 const phase=Number(stepDef?.[0]);
 if(phase!==Number(emsSelectedCase.current_phase||1)){alert('Complete the current phase first.');return;}
 const note=prompt('Completion notes / reference (Cancel to stop):');if(note===null)return;
 const requiresFile=['authorised','released','signed'].includes(key);
 let attachmentPath=null;
 if(requiresFile){
  const file=await emsChooseDocument();
  if(!file)return;
  const extension=file.name.split('.').pop().toLowerCase();
  if(!['pdf','jpg','jpeg','png','webp'].includes(extension)||file.size>10485760){
   alert('Please select a PDF or image smaller than 10 MB.');return;
  }
  const {data:{user},error:authError}=await supabaseClient.auth.getUser();
  if(authError||!user){alert('Please sign in.');return;}
  attachmentPath=String(emsSelectedCase.id)+'/'+key+'/'+crypto.randomUUID()+'.'+extension;
  const {error:uploadError}=await supabaseClient.storage.from('ems-supporting-documents')
   .upload(attachmentPath,file,{contentType:file.type||'application/octet-stream',upsert:false});
  if(uploadError){alert('Document upload failed: '+uploadError.message);return;}
 }
 if(['technician','invoiced'].includes(key)&&!note.trim()){alert('Technician name or invoice number is required.');return;}
 btn.disabled=true;
 try{
 const {data:{user},error:authError}=await supabaseClient.auth.getUser();
 if(authError||!user)throw authError||new Error('Please sign in');
 const {error}=await supabaseClient.from('ems_step_events').insert({
  ems_case_id:emsSelectedCase.id,step_key:key,notes:note,completed_by:user.id,attachment_path:attachmentPath
 });
 if(error)throw error;
 const phaseSteps=EMS_PHASE_STEPS.filter(x=>Number(x[0])===phase);
 const {data:recorded,error:readError}=await supabaseClient.from('ems_step_events')
 .select('step_key').eq('ems_case_id',emsSelectedCase.id);
 if(readError)throw readError;
 const finished=new Set((recorded||[]).map(x=>x.step_key));
 const phaseComplete=phaseSteps.every(x=>finished.has(x[1])||emsLegacyStepDone(emsSelectedCase,x[1]));
 if(phaseComplete&&phase===4){
   const {error:closeError}=await supabaseClient.from('ems_cases')
    .update({workflow_status:'Completed',updated_at:new Date().toISOString()})
    .eq('id',emsSelectedCase.id).eq('current_phase',4);
   if(closeError)throw new Error('Step saved, but case close-out failed: '+closeError.message);
 }
 if(phaseComplete&&phase<4){
   const timestamp=new Date().toISOString();
   const {data:updated,error:updateError}=await supabaseClient.from('ems_cases')
   .update({current_phase:phase+1,current_step:1,current_step_started_at:timestamp,updated_at:timestamp})
   .eq('id',emsSelectedCase.id).eq('current_phase',phase).select().single();
   if(updateError)throw new Error('Step saved, but phase progression failed: '+updateError.message);
   emsSelectedCase=updated;
 }
 await loadEmsCases();
 openEmsWorkflow(emsSelectedCase.id);
 }catch(err){alert('Unable to save step: '+err.message);btn.disabled=false;}
});
document.getElementById('downloadEmsReportButton')?.addEventListener('click',async()=>{
 const button=document.getElementById('downloadEmsReportButton');
 button.disabled=true;
 try {
  const {data:history,error}=await supabaseClient.from('ems_step_events')
    .select('ems_case_id,step_key,completed_at,notes');
  if(error)throw error;
  const headers=['EMS No','Registration','VIN','Job Card','Customer','Booking Date',
    'Phase','Status','Days In Progress','Completed Steps','Outstanding Steps',
    'Next Outstanding Action','Latest Step Completion'];
  const rows=emsCases.filter(c=>String(c.workflow_status||'').toLowerCase()!=='archived').map(c=>{
   const entries=(history||[]).filter(e=>String(e.ems_case_id)===String(c.id));
   const finished=new Set(entries.map(e=>e.step_key));
   const complete=EMS_PHASE_STEPS.filter(x=>finished.has(x[1])||emsLegacyStepDone(c,x[1]));
   const outstanding=EMS_PHASE_STEPS.filter(x=>!finished.has(x[1])&&!emsLegacyStepDone(c,x[1]));
   const days=c.started_at?Math.max(0,Math.floor((Date.now()-new Date(c.started_at).getTime())/86400000)):'';
   const last=entries.map(e=>e.completed_at).filter(Boolean).sort().at(-1)||'';
   return [c.ems_no,c.registration_no,c.vin,c.job_card_no,c.customer_name,c.booking_date,
    c.current_phase,c.workflow_status,days,complete.length,outstanding.length,
    outstanding[0]?.[2]||'None',last];
  });
  const safeCell=value=>{
    let v=String(value??'');
    if(/^\s*[=+@-]/.test(v))v="'"+v;
    return '"'+v.replace(/"/g,'""')+'"';
   };
   const csv='sep=;\r\n'+[headers,...rows].map(row=>row.map(safeCell).join(';')).join('\r\n');
   const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;
   a.download='ELT-EMS-Report-'+new Date().toISOString().slice(0,10)+'.csv';
   a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(error){alert('EMS report export failed: '+error.message);}
 finally{button.disabled=false;}
});

function emsChooseDocument(){
 return new Promise(resolve=>{
  const input=document.createElement('input');input.type='file';
  input.accept='.pdf,.jpg,.jpeg,.png,.webp';
  input.style.display='none';document.body.appendChild(input);
  let chosen=false;
  input.addEventListener('change',()=>{chosen=true;const file=input.files?.[0]||null;input.remove();resolve(file);},{once:true});
  input.addEventListener('cancel',()=>{if(!chosen){input.remove();resolve(null);}},{once:true});
  input.click();
 });
}
document.addEventListener('click',async e=>{
 const button=e.target.closest('[data-ems-file]');if(!button)return;
 button.disabled=true;
 try{
  const {data,error}=await supabaseClient.storage.from('ems-supporting-documents')
   .createSignedUrl(button.dataset.emsFile,120);
  if(error)throw error;
  window.open(data.signedUrl,'_blank','noopener,noreferrer');
 }catch(error){alert('Unable to open document: '+error.message);}
 finally{button.disabled=false;}
});

document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-ems-archive]');
 if(!button)return;
 if(emsUserProfile?.is_admin!==true){alert('Only administrators can delete EMS vehicles.');return;}
 const c=emsCases.find(x=>String(x.id)===button.dataset.emsArchive);
 if(!c)return;
 const name=c.registration_no||c.vin||c.ems_no;
 if(!confirm('Remove '+name+' from the active EMS dashboard?\n\nIts history and documents will be preserved.'))return;
 if(prompt('Type DELETE to confirm removing '+name+':')!=='DELETE')return;
 button.disabled=true;
 try{
  const {error}=await supabaseClient.rpc('archive_ems_case',{p_case_id:c.id});
  if(error)throw error;
  if(String(emsSelectedCase?.id)===String(c.id))closeEmsWorkflow();
  await loadEmsCases();
  alert('Vehicle archived. Its history has been preserved.');
 }catch(error){alert('Unable to archive EMS vehicle: '+error.message);}
 finally{button.disabled=false;}
});
