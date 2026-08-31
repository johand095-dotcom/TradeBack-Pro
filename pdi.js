/* =========================================================
   ELT VEHICLE SUITE
   PDI OPERATIONS MODULE v1.0

   SECTION 1
   SUPABASE CONNECTION + AUTHENTICATION
========================================================= */


/* =========================================================
   SUPABASE CONFIGURATION
========================================================= */

/*
  IMPORTANT:
  Use the SAME Project URL and Publishable Key
  already used in receiving.js.
*/

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

let pdiSession = null;
let pdiUserProfile = null;


/* =========================================================
   LOGIN MESSAGE
========================================================= */

function setPdiLoginMessage(
  message,
  isError = true
) {

  const element =
    document.getElementById(
      'pdiLoginMessage'
    );

  if (!element) return;

  element.textContent = message;

  element.style.color =
    isError
      ? '#b42318'
      : '#198754';
}


/* =========================================================
   SHOW / HIDE LOGIN
========================================================= */

function showPdiLogin() {

  const loginScreen =
    document.getElementById(
      'pdiLoginScreen'
    );

  if (loginScreen) {
    loginScreen.style.display = 'flex';
  }
}


function hidePdiLogin() {

  const loginScreen =
    document.getElementById(
      'pdiLoginScreen'
    );

  if (loginScreen) {
    loginScreen.style.display = 'none';
  }
}


/* =========================================================
   UPDATE SIGNED-IN USER DISPLAY
========================================================= */
function updateSignedInUser() {

  const display =
    document.getElementById(
      'signedInUser'
    );

  if (!display) return;


  if (pdiUserProfile) {

    const roles =
      pdiUserProfile.roles || [];


    display.textContent =
      `${pdiUserProfile.full_name} · ${
        pdiUserProfile.is_admin
          ? 'Administrator'
          : roles.join(', ')
      }`;

    return;
  }


  const email =
    pdiSession?.user?.email;


  display.textContent =
    email
      ? `Signed in: ${email}`
      : 'Not signed in';
}
async function loadPdiUserProfile() {

  if (!pdiSession?.user?.id) {

    pdiUserProfile = null;

    return false;
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from('user_profiles')
      .select(`
        user_id,
        full_name,
        email,
        roles,
        is_admin,
        is_active
      `)
      .eq(
        'user_id',
        pdiSession.user.id
      )
      .single();


  if (error) {

    console.error(
      'Could not load PDI user profile:',
      error
    );

    pdiUserProfile = null;

    return false;
  }


  pdiUserProfile =
    data;


  updateSignedInUser();


  return true;
}

  


/* =========================================================
   SIGN IN
========================================================= */

async function signInPdiUser() {

  const email =
    document.getElementById(
      'pdiLoginEmail'
    )?.value.trim();


  const password =
    document.getElementById(
      'pdiLoginPassword'
    )?.value;


  const button =
    document.getElementById(
      'pdiLoginButton'
    );


  if (!email || !password) {

    setPdiLoginMessage(
      'Please enter your email address and password.'
    );

    return;
  }


  if (button) {

    button.disabled = true;

    button.textContent =
      'Signing in...';
  }


  setPdiLoginMessage(
    'Checking your account...',
    false
  );


  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .signInWithPassword({
          email,
          password
        });


    if (error) {

      console.error(
        'PDI login failed:',
        error
      );


      setPdiLoginMessage(
        'Sign-in failed. Please check your email address and password.'
      );

      return;
    }


    pdiSession =
      data.session;
await loadPdiUserProfile();

    updateSignedInUser();


    setPdiLoginMessage(
      'Signed in successfully.',
      false
    );


    hidePdiLogin();


    console.log(
      'PDI user authenticated:',
      pdiSession?.user?.email
    );
    await loadPdiCases();


    /*
      Dashboard loading will be added
      in Section 2.
    */

  } catch (error) {

    console.error(
      'Unexpected PDI login error:',
      error
    );


    setPdiLoginMessage(
      'An unexpected login error occurred.'
    );

  } finally {

    if (button) {

      button.disabled = false;

      button.textContent =
        'Sign In';
    }
  }
}


/* =========================================================
   SIGN OUT
========================================================= */

async function signOutPdiUser() {

  try {

    const { error } =
      await supabaseClient.auth
        .signOut();


    if (error) {

      console.error(
        'PDI sign-out failed:',
        error
      );

      return;
    }


    pdiSession = null;


    updateSignedInUser();


    showPdiLogin();


    document.getElementById(
      'pdiLoginPassword'
    ).value = '';


    setPdiLoginMessage(
      '',
      false
    );


  } catch (error) {

    console.error(
      'Unexpected PDI sign-out error:',
      error
    );
  }
}


/* =========================================================
   INITIAL SESSION CHECK
========================================================= */

async function initialisePdiAuthentication() {

  try {

    const {
      data: { session },
      error
    } =
      await supabaseClient.auth
        .getSession();


    if (error) {

      console.error(
        'Could not read PDI session:',
        error
      );

      showPdiLogin();

      return;
    }


    pdiSession =
      session;
      if (session) {
  await loadPdiUserProfile();
}


    updateSignedInUser();


    if (session) {

      hidePdiLogin();

      console.log(
        'Existing PDI session restored:',
        session.user.email
      );
      await loadPdiCases();

    } else {

      showPdiLogin();
    }


  } catch (error) {

    console.error(
      'PDI authentication startup failed:',
      error
    );

    showPdiLogin();
  }
}


/* =========================================================
   AUTH STATE CHANGES
========================================================= */

supabaseClient.auth.onAuthStateChange(
  (event, session) => {

    pdiSession =
      session;


    updateSignedInUser();


    if (event === 'SIGNED_OUT') {

      showPdiLogin();
    }


    if (
      event === 'SIGNED_IN' &&
      session
    ) {

      hidePdiLogin();
    }
  }
);


/* =========================================================
   EVENT LISTENERS
========================================================= */

document
  .getElementById(
    'pdiLoginButton'
  )
  ?.addEventListener(
    'click',
    signInPdiUser
  );


document
  .getElementById(
    'pdiLoginPassword'
  )
  ?.addEventListener(
    'keydown',
    event => {

      if (event.key === 'Enter') {

        signInPdiUser();
      }
    }
  );


document
  .getElementById(
    'signOutPdiButton'
  )
  ?.addEventListener(
    'click',
    signOutPdiUser
  );


document
  .getElementById(
    'refreshPdiButton'
  )
  ?.addEventListener(
    'click',
    () => {

     wloadPdiCases();
    }
  );


/* =========================================================
   START MODULE
========================================================= */

initialisePdiAuthentication();
/* =========================================================
   SECTION 2
   LOAD LIVE PDI CASES + DASHBOARD
========================================================= */

let pdiCases = [];
let pdiStepTemplates = [];

/* =========================================================
   HELPERS
========================================================= */

async function loadReceivingPhotos(receivingNo) {

    if (!receivingNo) {
        return [];
    }

    const {
        data,
        error
    } =
        await supabaseClient
            .from('receiving_photos')
            .select(`
                id,
                receiving_no,
                photo_type,
                storage_path,
                latitude,
                longitude,
                captured_at,
                location_text,
                street_address,
                created_at
            `)
            .eq(
                'receiving_no',
                receivingNo
            )
            .order(
                'created_at',
                {
                    ascending: true
                }
            );

    if (error) {
        console.error(
            'Could not load receiving photos:',
            error
        );

        return [];
    }

    return data || [];
}
async function getReceivingPhotoSignedUrl(
    storagePath
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .storage
            .from(
                'vehicle-receiving-photos'
            )
            .createSignedUrl(
                storagePath,
                300
            );

    if (error) {
        throw error;
    }

    return data?.signedUrl || '';
}
function calculateProcessAge(startedAt) {

  if (!startedAt) return '-';

  const started =
    new Date(startedAt);

  const now =
    new Date();

  const difference =
    now - started;

  const days =
    Math.floor(
      difference /
      (1000 * 60 * 60 * 24)
    );

  if (days <= 0) {
    return 'Today';
  }

  if (days === 1) {
    return '1 day';
  }

  return `${days} days`;
}
function calculateStepElapsedHours(startedAt) {

    if (!startedAt) {
        return 0;
    }

    const started =
        new Date(startedAt);

    const now =
        new Date();

    return Math.max(
        0,
        (now - started) /
        (1000 * 60 * 60)
    );
}


function getStepSlaStatus(caseRecord) {

    const elapsedHours =
        calculateStepElapsedHours(
            caseRecord.current_step_started_at
        );

    const targetHours =
        Number(
            caseRecord.current_step_target_hours || 0
        );

    if (!targetHours) {
        return {
            status: 'No Target',
            elapsedHours,
            targetHours,
            percentage: 0
        };
    }

    const percentage =
        (elapsedHours / targetHours) * 100;

    if (percentage > 100) {
        return {
            status: 'Overdue',
            elapsedHours,
            targetHours,
            percentage
        };
    }

    if (percentage >= 75) {
        return {
            status: 'Due Soon',
            elapsedHours,
            targetHours,
            percentage
        };
    }

    return {
        status: 'On Track',
        elapsedHours,
        targetHours,
        percentage
    };
}

function getPhaseLabel(phase) {

  switch (Number(phase)) {

    case 1:
      return 'Receiving';

    case 2:
      return 'Estimate / OEM / Stock';

    case 3:
      return 'PDI / Repairs / Paint';

    case 4:
      return 'Sales Sign-Off';

    default:
      return 'Unknown';
  }
}


function getResponsibleForCurrentStep(caseRecord) {

  return (
    caseRecord.current_step_responsible ||
    '-'
  );
}


/* =========================================================
   LOAD PDI CASES
========================================================= */
async function loadPdiStepTemplates() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from('pdi_step_templates')
            .select(`
                step_no,
                phase_no,
                activity,
                responsible_role,
                target_hours
            `)
            .order('step_no');

    if (error) {
        console.error(
            'Could not load PDI step templates:',
            error
        );

        pdiStepTemplates = [];
        return;
    }

    pdiStepTemplates = data || [];

    console.log(
        'PDI step templates loaded:',
        pdiStepTemplates
    );
}
async function loadPdiCases() {

    if (!pdiSession) {

        console.warn(
            'PDI cases not loaded because no user is signed in.'
        );

        return;
    }

    await loadPdiStepTemplates();

    const {
        data,
        error
  } =
    await supabaseClient
      .from('pdi_cases')
      .select(`
        id,
        receiving_no,
        stock_no,
        vin,
        make,
        model,
        oem_supplier,
order_status,
order_reference,
oem_eta,
stock_classification,
ordered_at,
received_at,
        workflow_status,
        current_phase,
        current_step,
        current_step_started_at,
        started_at,
        pdi_started_at,
        updated_at,
        completed_at,
        system_expected_completion_date,
expected_completion_date,
expected_completion_override_reason
      `)
      .order(
        'started_at',
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      'Could not load PDI cases:',
      error
    );

    return;
  }


  pdiCases =
    data || [];


  await attachCurrentStepDetails();


  renderPdiDashboard();
initialisePreArrivalOrderForm();
  renderPdiVehicleTable();

  renderPdiArchive();
await renderMyPdiActions();
}


/* =========================================================
   LOAD CURRENT STEP DETAILS
========================================================= */

async function attachCurrentStepDetails() {

  if (!pdiCases.length) {
    return;
  }


  const caseIds =
    pdiCases.map(
      item => item.id
    );


  const {
    data,
    error
  } =
    await supabaseClient
      .from('pdi_case_steps')
      .select(`
        pdi_case_id,
        step_no,
        activity,
        responsible_role,
        step_status
      `)
      .in(
        'pdi_case_id',
        caseIds
      );


  if (error) {

    console.error(
      'Could not load PDI step details:',
      error
    );

    return;
  }


  const steps =
    data || [];


  pdiCases.forEach(
    caseRecord => {

      const currentStep =
        steps.find(
          step =>
            step.pdi_case_id ===
              caseRecord.id &&
            step.step_no ===
              caseRecord.current_step
        );

const currentTemplate =
    pdiStepTemplates.find(
        template =>
            Number(template.step_no) ===
            Number(caseRecord.current_step)
    );

caseRecord.current_step_target_hours =
    Number(currentTemplate?.target_hours || 0);
    console.log(
    'SLA target attached:',
    caseRecord.current_step,
    caseRecord.current_step_target_hours
);
      caseRecord.current_step_activity =
        currentStep?.activity || '-';


      caseRecord.current_step_responsible =
        currentStep?.responsible_role || '-';


      caseRecord.current_step_status =
        currentStep?.step_status || '-';
    }
  );
}


/* =========================================================
   DASHBOARD METRICS
========================================================= */

function initialisePreArrivalOrderForm() {

    const saveButton =
        document.getElementById(
            'savePreArrivalOrderBtn'
        );

    if (!saveButton) {
        return;
    }

    saveButton.onclick =
        async function () {

            const supplier =
                document
                    .getElementById(
                        'preArrivalSupplier'
                    )
                    ?.value
                    .trim();

            const make =
                document
                    .getElementById(
                        'preArrivalMake'
                    )
                    ?.value
                    .trim();

            const model =
                document
                    .getElementById(
                        'preArrivalModel'
                    )
                    ?.value
                    .trim();

            const vin =
                document
                    .getElementById(
                        'preArrivalVin'
                    )
                    ?.value
                    .trim();

            const orderReference =
                document
                    .getElementById(
                        'preArrivalOrderReference'
                    )
                    ?.value
                    .trim();

            const eta =
                document
                    .getElementById(
                        'preArrivalEta'
                    )
                    ?.value;

            const classification =
                document
                    .getElementById(
                        'preArrivalClassification'
                    )
                    ?.value;

          

            const message =
                document.getElementById(
                    'preArrivalOrderMessage'
                );

            if (
                !supplier ||
                !make ||
                !model ||
                !eta ||
                !classification
            ) {

                alert(
                    'Please complete OEM / Supplier, Make, Model, ETA and Stock Classification.'
                );

                return;
            }

            saveButton.disabled = true;
            saveButton.textContent =
                'Saving Order...';

            try {

                const now =
                    new Date().toISOString();

                const {
                    data: newCase,
                    error
                } =
                    await supabaseClient
                        .from('pdi_cases')
                        .insert({
                            receiving_no:
                                null,

                            stock_no:
                                 null,

                            vin:
                                vin || null,
                            oem_supplier:
                                supplier,  

                            make:
                                make,

                            model:
                                model,

                            workflow_status:
                                'Awaiting Arrival',

                            current_phase:
                                0,

                            current_step:
                                0,

                            started_at:
                                now,

                            updated_at:
                                now,

                            order_status:
                                'Awaiting Arrival',

                            order_reference:
                                orderReference || null,

                            oem_eta:
                                eta,

                            stock_classification:
                                classification,

                            ordered_at:
                                now
                        })
                        .select()
                        .single();

                if (error) {
                    throw error;
                }

                if (message) {
                    message.textContent =
                        'OEM order added successfully.';
                }

                document
                    .getElementById(
                        'preArrivalSupplier'
                    ).value = '';

                document
                    .getElementById(
                        'preArrivalMake'
                    ).value = '';

                document
                    .getElementById(
                        'preArrivalModel'
                    ).value = '';

                document
                    .getElementById(
                        'preArrivalVin'
                    ).value = '';

                document
                    .getElementById(
                        'preArrivalOrderReference'
                    ).value = '';

                document
                    .getElementById(
                        'preArrivalEta'
                    ).value = '';

                document
                    .getElementById(
                        'preArrivalClassification'
                    ).value = '';

             

                await loadPdiCases();

                renderPdiDashboard();

                console.log(
                    'Pre-arrival OEM order created:',
                    newCase
                );

            } catch (error) {

                console.error(
                    'Could not create OEM order:',
                    error
                );

                alert(
                    'The OEM order could not be saved. Please check the browser console.'
                );

            } finally {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    'Add OEM Order';
            }
        };
}

function renderPdiDashboard() {

  const activeCases =
    pdiCases.filter(
      item =>
        item.workflow_status !==
        'Completed'
    );


  const awaitingPdi =
    activeCases.filter(
      item =>
        Number(
          item.current_step
        ) >= 20 &&
        Number(
          item.current_step
        ) <= 22
    );


  const awaitingPaint =
    activeCases.filter(
      item =>
        Number(
          item.current_step
        ) >= 29 &&
        Number(
          item.current_step
        ) <= 31
    );


  const salesSignoff =
    activeCases.filter(
      item =>
        Number(
          item.current_step
        ) >= 33 &&
        Number(
          item.current_step
        ) <= 37
    );


  const readyCollection =
    activeCases.filter(
      item =>
        Number(
          item.current_step
        ) >= 38
    );


  document
    .getElementById(
      'metricInProgress'
    )
    .textContent =
      activeCases.length;


  document
    .getElementById(
      'metricAwaitingPdi'
    )
    .textContent =
      awaitingPdi.length;


  document
    .getElementById(
      'metricAwaitingPaint'
    )
    .textContent =
      awaitingPaint.length;


  document
    .getElementById(
      'metricSalesSignoff'
    )
    .textContent =
      salesSignoff.length;


  document
    .getElementById(
      'metricReadyCollection'
    )
    .textContent =
      readyCollection.length;
renderAwaitingArrivalTable();

}

function renderAwaitingArrivalTable() {

    const tableBody =
        document.getElementById(
            'awaitingArrivalTableBody'
        );

    if (!tableBody) {
        return;
    }

    const priorityOrder = {
        Sold: 1,
        Allocated: 2,
        Stock: 3
    };

    const awaitingArrival =
        pdiCases
            .filter(
                item =>
                    item.order_status ===
                        'Awaiting Arrival' ||
                    item.workflow_status ===
                        'Awaiting Arrival'
            )
            .sort(
                (a, b) => {

                    const priorityA =
                        priorityOrder[
                            a.stock_classification
                        ] || 99;

                    const priorityB =
                        priorityOrder[
                            b.stock_classification
                        ] || 99;

                    if (
                        priorityA !==
                        priorityB
                    ) {
                        return (
                            priorityA -
                            priorityB
                        );
                    }

                    const etaA =
                        a.oem_eta
                            ? new Date(
                                `${a.oem_eta}T00:00:00`
                            )
                            : new Date(
                                '2999-12-31'
                            );

                    const etaB =
                        b.oem_eta
                            ? new Date(
                                `${b.oem_eta}T00:00:00`
                            )
                            : new Date(
                                '2999-12-31'
                            );

                    return etaA - etaB;
                }
            );

    if (!awaitingArrival.length) {

        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    No vehicles awaiting arrival.
                </td>
            </tr>
        `;

        return;
    }

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    tableBody.innerHTML =
        awaitingArrival
            .map(
                item => {

                    const classification =
                        item.stock_classification ||
                        '-';

                    let priorityLabel = '-';

                    if (
                        classification ===
                        'Sold'
                    ) {
                        priorityLabel =
                            '1 - HIGH';
                    }

                    if (
                        classification ===
                        'Allocated'
                    ) {
                        priorityLabel =
                            '2 - MEDIUM';
                    }

                    if (
                        classification ===
                        'Stock'
                    ) {
                        priorityLabel =
                            '3 - NORMAL';
                    }

                    let etaText = '-';
                    let etaStatus = '';

                    if (item.oem_eta) {

                        const etaDate =
                            new Date(
                                `${item.oem_eta}T00:00:00`
                            );

                        etaText =
                            etaDate
                                .toLocaleDateString(
                                    'en-ZA',
                                    {
                                        day:
                                            '2-digit',

                                        month:
                                            'short',

                                        year:
                                            'numeric'
                                    }
                                );

                        if (
                            etaDate <
                            today
                        ) {
                            etaStatus =
                                ' - OVERDUE';
                        }
                    }

                    const vehicle =
                        [
                            item.make,
                            item.model
                        ]
                            .filter(Boolean)
                            .join(' ') ||
                        '-';

                    return `
                        <tr>
                            <td>
                                <strong>
                                    ${priorityLabel}
                                </strong>
                            </td>

                            <td>
                                ${
                                    item.oem_supplier ||
                                    '-'
                                }
                            </td>

                            <td>
                                ${vehicle}
                            </td>

                            <td>
                                ${item.vin || '-'}
                            </td>
                            <td>
    ${item.stock_no || '-'}
</td>
                            <td>
                                ${
                                    item.order_reference ||
                                    '-'
                                }
                            </td>

                            <td>
                                ${etaText}${etaStatus}
                            </td>

                            <td>
                                ${classification}
                            </td>

                            <td>
                                Awaiting Arrival
                            </td>

                            <td>
                            <button
    type="button"
    class="workflow-action-btn prearrival-stock-btn"
    data-case-id="${item.id}"
    >

    ${
        item.stock_no
            ? 'Edit Stock No.'
            : 'Allocate Stock No.'
    }
</button>
                            </td>
                        </tr>
                    `;
                }
            )
            .join('');
    document
    .querySelectorAll(
        '.prearrival-stock-btn'
    )
    .forEach(button => {
button.onclick = async function () {
const caseId =
    Number(this.dataset.caseId);

const selectedCase =
    pdiCases.find(
        item =>
            Number(item.id) === caseId
    );
    if (!selectedCase) {
    alert(
        'The vehicle record could not be found.'
    );
    return;
}
const stockNo =
    prompt(
        'Enter the ELT Stock Number:',
        selectedCase.stock_no || ''
    );

if (stockNo === null) {
    return;
}
const cleanedStockNo =
    stockNo.trim();

if (!cleanedStockNo) {
    alert(
        'Please enter a valid Stock Number.'
    );
    return;
}
if (!cleanedStockNo) {
    alert(
        'Please enter a valid Stock Number.'
    );
    return;
}
try {

    const { error } =
        await supabaseClient
            .from('pdi_cases')
            .update({
                stock_no: cleanedStockNo,
                updated_at: new Date().toISOString()
            })
            .eq(
                'id',
                selectedCase.id
            );

    if (error) {
        throw error;
    }
selectedCase.stock_no =
    cleanedStockNo;

await loadPdiCases();

renderPdiDashboard();

alert(
    'Stock Number allocated successfully.'
);
} catch (error) {

    console.error(
        'Could not allocate Stock Number:',
        error
    );

    alert(
        'The Stock Number could not be saved. Please check the browser console.'
    );

    return;
}
};
    });
}

/* =========================================================
   ACTIVE VEHICLE TABLE
========================================================= */

function renderPdiVehicleTable() {

  const tableBody =
    document.getElementById(
      'pdiVehicleTableBody'
    );


  if (!tableBody) return;


  const searchValue =
    (
      document.getElementById(
        'pdiSearch'
      )?.value || ''
    )
      .trim()
      .toLowerCase();


  const phaseFilter =
    document.getElementById(
      'pdiPhaseFilter'
    )?.value || 'all';


  const filteredCases =
    pdiCases.filter(
      item => {

        if (
          item.workflow_status ===
          'Completed'
        ) {

          return false;
        }


        const searchText =
          [
            item.receiving_no,
            item.stock_no,
            item.vin,
            item.make,
            item.model
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();


        const matchesSearch =
          !searchValue ||
          searchText.includes(
            searchValue
          );


        const matchesPhase =
          phaseFilter === 'all' ||
          String(
            item.current_phase
          ) ===
          String(
            phaseFilter
          );


        return (
          matchesSearch &&
          matchesPhase
        );
      }
    );


  if (!filteredCases.length) {

    tableBody.innerHTML = `
      <tr>
        <td
          colspan="10"
          class="empty-table"
        >
          No active PDI vehicles found.
        </td>
      </tr>
    `;

    return;
  }


  tableBody.innerHTML =
    filteredCases
      .map(
        item => {

          const vehicle =
            [
              item.make,
              item.model
            ]
              .filter(Boolean)
              .join(' ') ||
            '-';


          const age =
            calculateProcessAge(
              item.started_at
            );
const sla =
    getStepSlaStatus(item);

          return `
            <tr>

              <td>
                ${item.stock_no || '-'}
              </td>

              <td>
                ${vehicle}
              </td>

              <td>
                ${item.vin || '-'}
              </td>

              <td>
                ${getPhaseLabel(
                  item.current_phase
                )}
              </td>

              <td>
                <strong>
                  Step ${item.current_step}
                </strong>
                <br>
                <span>
                  ${
                    item.current_step_activity ||
                    '-'
                  }
                </span>
              </td>

              <td>
                ${getResponsibleForCurrentStep(
                  item
                )}
              </td>

              <td>
                ${age}
              </td>
<td>
    <span
        class="status-badge ${
            sla.status === 'Overdue'
                ? 'status-overdue'
                : sla.status === 'Due Soon'
                    ? 'status-pending'
                    : 'status-completed'
        }"
    >
        ${sla.status}
    </span>

    <br>

    <span>
        ${sla.elapsedHours.toFixed(1)}h
        /
        ${sla.targetHours || '-'}h
    </span>
</td>
              <td>
                <span
                  class="
                    status-badge
                    status-active
                  "
                >
                  ${
                    item.workflow_status ||
                    'In Progress'
                  }
                </span>
              </td>

              <td>

                <button
                  type="button"
                  class="action-button open-workflow-button"
                  data-case-id="${item.id}"
                >
                  Open
                </button>

              </td>

            </tr>
          `;
        }
      )
      .join('');


  document
    .querySelectorAll(
      '.open-workflow-button'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const caseId =
              Number(
                button.dataset.caseId
              );


            openPdiWorkflow(
              caseId
            );
          }
        );
      }
    );
}


/* =========================================================
   COMPLETED ARCHIVE
========================================================= */

function renderPdiArchive() {

  const tableBody =
    document.getElementById(
      'pdiArchiveTableBody'
    );


  if (!tableBody) return;


  const completedCases =
    pdiCases.filter(
      item =>
        item.workflow_status ===
        'Completed'
    );


  if (!completedCases.length) {

    tableBody.innerHTML = `
      <tr>
        <td
          colspan="7"
          class="empty-table"
        >
          No completed PDI cases yet.
        </td>
      </tr>
    `;

    return;
  }


  tableBody.innerHTML =
    completedCases
      .map(
        item => {

          const vehicle =
            [
              item.make,
              item.model
            ]
              .filter(Boolean)
              .join(' ') ||
            '-';


          const completedDate =
            item.completed_at
              ? new Date(
                  item.completed_at
                ).toLocaleDateString(
                  'en-ZA'
                )
              : '-';


          return `
            <tr>

              <td>
                ${item.stock_no || '-'}
              </td>

              <td>
                ${vehicle}
              </td>

              <td>
                ${item.vin || '-'}
              </td>

              <td>
                ${item.receiving_no || '-'}
              </td>

              <td>
                ${completedDate}
              </td>

              <td>
                ${
                  calculateProcessAge(
                    item.started_at
                  )
                }
              </td>

              <td>

               <button
    type="button"
    class="secondary-button view-pdi-archive-button"
    data-case-id="${item.id}"
>
    View
</button>

              </td>

            </tr>
          `;
        }
      )
      .join('');
}

document.addEventListener(
    'click',
    async event => {

        const button =
            event.target.closest(
                '.view-pdi-archive-button'
            );

        if (!button) {
            return;
        }

        const caseId =
            Number(
                button.dataset.caseId
            );

        if (!caseId) {
            return;
        }

        await openPdiWorkflow(caseId);
    }
);

/* =========================================================
   FILTER EVENTS
========================================================= */

document
  .getElementById(
    'pdiSearch'
  )
  ?.addEventListener(
    'input',
    renderPdiVehicleTable
  );


document
  .getElementById(
    'pdiPhaseFilter'
  )
  ?.addEventListener(
    'change',
    renderPdiVehicleTable
  );


/* =========================================================
   TEMPORARY WORKFLOW PLACEHOLDER
========================================================= */

async function openPdiWorkflow(caseId) {

  console.log(
    'Open workflow requested for PDI case:',
    caseId
  );


  const selectedCase =
    pdiCases.find(
      item =>
        item.id === caseId
    );


  if (!selectedCase) {

    console.error(
      'PDI case not found:',
      caseId
    );

    return;
  }

if (
    Number(selectedCase.current_phase) >= 4 &&
    !selectedCase.pdi_started_at
) {

    const pdiStartTime =
        new Date().toISOString();

    const {
        error: pdiStartError
    } =
        await supabaseClient
            .from('pdi_cases')
            .update({
                pdi_started_at:
                    pdiStartTime,
                updated_at:
                    pdiStartTime
            })
            .eq(
                'id',
                selectedCase.id
            );

    if (pdiStartError) {

        console.error(
            'Could not start PDI clock:',
            pdiStartError
        );

    } else {

        selectedCase.pdi_started_at =
            pdiStartTime;

        console.log(
            'PDI clock started:',
            pdiStartTime
        );
    }
}

try {

    const {
        error: recalcError
    } =
        await supabaseClient
            .rpc(
                'recalculate_pdi_expected_completion',
                {
                    p_case_id:
                        selectedCase.id
                }
            );

    if (recalcError) {
        throw recalcError;
    }

    const {
        data: refreshedCase,
        error: refreshCaseError
    } =
        await supabaseClient
            .from(
                'pdi_cases'
            )
            .select(`
                system_expected_completion_date,
                expected_completion_date,
                expected_completion_override_reason
            `)
            .eq(
                'id',
                selectedCase.id
            )
            .single();

    if (refreshCaseError) {
        throw refreshCaseError;
    }

    if (refreshedCase) {

        selectedCase.system_expected_completion_date =
            refreshedCase.system_expected_completion_date;

        selectedCase.expected_completion_date =
            refreshedCase.expected_completion_date;

        selectedCase.expected_completion_override_reason =
            refreshedCase.expected_completion_override_reason;
    }

    console.log(
        'ETA recalculated:',
        {
            caseId:
                selectedCase.id,

            systemEta:
                selectedCase.system_expected_completion_date,

            currentEta:
                selectedCase.expected_completion_date
        }
    );

} catch (etaError) {

    console.error(
        'Could not recalculate PDI ETA:',
        etaError
    );
}


const receivingPhotos =
    await loadReceivingPhotos(
        selectedCase.receiving_no
    );

console.log(
    'Receiving photos loaded:',
    receivingPhotos
);

await renderWorkflowReceivingPhotos(
    receivingPhotos
);
initialiseBodybuilderPhase(
    selectedCase
);

  document
    .getElementById(
      'workflowSection'
    )
    ?.classList
    .remove(
      'hidden'
    );


  document
    .getElementById(
      'workflowReceivingNo'
    )
    .textContent =
      selectedCase.receiving_no || '-';


  document
    .getElementById(
      'workflowStockNo'
    )
    .textContent =
      selectedCase.stock_no || '-';


  document
    .getElementById(
      'workflowVin'
    )
    .textContent =
      selectedCase.vin || '-';


  document
    .getElementById(
      'workflowCurrentStep'
    )
    .textContent =
      `Step ${selectedCase.current_step}`;


  document
    .getElementById(
      'workflowStatus'
    )
    .textContent =
      selectedCase.workflow_status ||
      'In Progress';


  document
    .getElementById(
      'workflowAge'
    )
    .textContent =
      calculateProcessAge(
        selectedCase.started_at
      );


const expectedCompletionElement =
    document.getElementById(
        'workflowExpectedCompletion'
    );

const etaStatusElement =
    document.getElementById(
        'workflowEtaStatus'
    );

const etaAuditElement =
    document.getElementById(
        'workflowEtaAudit'
    );

const systemEtaElement =
    document.getElementById(
        'workflowSystemEta'
    );

const overrideReasonElement =
    document.getElementById(
        'workflowEtaOverrideReason'
    );

if (expectedCompletionElement) {

    const etaDate =
        selectedCase.expected_completion_date;

    expectedCompletionElement.textContent =
        etaDate
            ? new Date(
                `${etaDate}T00:00:00`
            ).toLocaleDateString(
                'en-ZA',
                {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                }
            )
            : '-';
}

if (etaStatusElement) {

    const etaDate =
        selectedCase.expected_completion_date;

    if (!etaDate) {

        etaStatusElement.textContent =
            '';

    } else {

        const today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );

        const expectedDate =
            new Date(
                `${etaDate}T00:00:00`
            );

        const diffMs =
            expectedDate.getTime() -
            today.getTime();

        const diffDays =
            Math.ceil(
                diffMs /
                (1000 * 60 * 60 * 24)
            );

        if (
            selectedCase.workflow_status ===
            'Completed'
        ) {

            etaStatusElement.textContent =
                'Completed';

        } else if (
            diffDays < 0
        ) {

            etaStatusElement.textContent =
                'Overdue';

        } else if (
            diffDays <= 1
        ) {

            etaStatusElement.textContent =
                'At Risk';

        } else {

            etaStatusElement.textContent =
                'On Track';
        }
    }
}

if (
    etaAuditElement &&
    systemEtaElement &&
    overrideReasonElement
) {

    const hasOverride =
        Boolean(
            selectedCase
                .expected_completion_override_reason
        );

    if (hasOverride) {

        etaAuditElement
            .classList
            .remove('hidden');

        const systemEta =
            selectedCase
                .system_expected_completion_date;

        systemEtaElement.textContent =
            systemEta
                ? new Date(
                    `${systemEta}T00:00:00`
                ).toLocaleDateString(
                    'en-ZA',
                    {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                    }
                )
                : '-';

        overrideReasonElement.textContent =
            selectedCase
                .expected_completion_override_reason ||
            '-';

        if (etaStatusElement) {
            etaStatusElement.textContent =
                'Overridden';
        }

    } else {

        etaAuditElement
            .classList
            .add('hidden');

        systemEtaElement.textContent =
            '-';

        overrideReasonElement.textContent =
            '-';
    }
}

const etaOverrideToggle =
    document.getElementById(
        'workflowEtaOverrideToggle'
    );

const etaOverrideFields =
    document.getElementById(
        'workflowEtaOverrideFields'
    );

const etaOverrideDate =
    document.getElementById(
        'workflowEtaOverrideDate'
    );

const etaOverrideReason =
    document.getElementById(
        'workflowEtaOverrideReason'
    );

const etaOverrideOther =
    document.getElementById(
        'workflowEtaOverrideOther'
    );

const etaOverrideSave =
    document.getElementById(
        'workflowEtaOverrideSave'
    );

if (
    etaOverrideDate &&
    selectedCase.expected_completion_date
) {
    etaOverrideDate.value =
        selectedCase.expected_completion_date;
}

if (
    etaOverrideToggle &&
    etaOverrideFields
) {

    etaOverrideToggle.onclick =
        function () {

            etaOverrideFields
                .classList
                .toggle('hidden');
        };
}

if (
    etaOverrideReason &&
    etaOverrideOther
) {

    etaOverrideReason.onchange =
        function () {

            if (
                etaOverrideReason.value ===
                'Other'
            ) {

                etaOverrideOther
                    .classList
                    .remove('hidden');

            } else {

                etaOverrideOther
                    .classList
                    .add('hidden');

                etaOverrideOther.value =
                    '';
            }
        };
}

if (
    etaOverrideSave &&
    etaOverrideDate &&
    etaOverrideReason
) {

    etaOverrideSave.onclick =
        async function () {

            const newDate =
                etaOverrideDate.value;

            const selectedReason =
                etaOverrideReason.value;

            const finalReason =
                selectedReason === 'Other'
                    ? etaOverrideOther
                        ?.value
                        .trim()
                    : selectedReason;

            if (!newDate) {

                alert(
                    'Please select a new expected completion date.'
                );

                return;
            }

            if (!finalReason) {

                alert(
                    'Please select or enter a reason for the ETA override.'
                );

                return;
            }

            etaOverrideSave.disabled =
                true;

            etaOverrideSave.textContent =
                'Saving...';

            try {

                const {
                    error
                } =
                    await supabaseClient
                        .from(
                            'pdi_cases'
                        )
                        .update(
                            {
                                expected_completion_date:
                                    newDate,

                                expected_completion_override_reason:
                                    finalReason,

                                updated_at:
                                    new Date()
                                        .toISOString()
                            }
                        )
                        .eq(
                            'id',
                            selectedCase.id
                        );

                if (error) {
                    throw error;
                }

                selectedCase
                    .expected_completion_date =
                    newDate;

                selectedCase
                    .expected_completion_override_reason =
                    finalReason;

                expectedCompletionElement
                    .textContent =
                    new Date(
                        `${newDate}T00:00:00`
                    )
                    .toLocaleDateString(
                        'en-ZA',
                        {
                            day:
                                '2-digit',
                            month:
                                'short',
                            year:
                                'numeric'
                        }
                    );

                etaStatusElement
                    .textContent =
                    'Overridden';

                etaOverrideFields
                    .classList
                    .add('hidden');

                alert(
                    'Expected completion date updated successfully.'
                );

            } catch (error) {

                console.error(
                    'Could not update ETA:',
                    error
                );

                alert(
                    'The expected completion date could not be updated.'
                );

            } finally {

                etaOverrideSave.disabled =
                    false;

                etaOverrideSave.textContent =
                    'Save New ETA';
            }
        };
}

  document
    .getElementById(
      'workflowVehicleDescription'
    )
    .textContent =
      [
        selectedCase.make,
        selectedCase.model,
        selectedCase.vin
      ]
        .filter(Boolean)
        .join(' - ');


  document
    .getElementById(
      'workflowSection'
    )
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

}

async function initialiseBodybuilderPhase(selectedCase) {

    const requiredSelect =
        document.getElementById('bodybuilderRequired');

    const detailsFields =
        document.getElementById('bodybuilderDetailsFields');

    const saveButton =
        document.getElementById('saveBodybuilderDetailsBtn');

    const status =
        document.getElementById('bodybuilderPhaseStatus');


const checkoutButton =
    document.getElementById(
        'bodybuilderCheckoutBtn'
    );

const returnButton =
    document.getElementById(
        'bodybuilderReturnBtn'
    );

    if (
        !requiredSelect ||
        !detailsFields ||
        !saveButton
    ) {
        console.warn(
            'Bodybuilder controls not found.'
        );
        return;
    }

    // Reset display whenever another vehicle is opened
    requiredSelect.value = '';
    detailsFields.classList.add('hidden');

    status.textContent = 'Pending Decision';
    const {
    data: existingVisit,
    error: loadError
} =
    await supabaseClient
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
        .eq(
            'pdi_case_id',
            selectedCase.id
        )
        .maybeSingle();

if (loadError) {

    console.error(
        'Could not load bodybuilder details:',
        loadError
    );
}

if (existingVisit) {

    if (
        existingVisit.bodybuilder_required === false
    ) {

        requiredSelect.value =
            'not_applicable';

        detailsFields.classList.add(
            'hidden'
        );

        status.textContent =
            existingVisit.status ||
            'Not Applicable';

    } else if (
        existingVisit.bodybuilder_required === true
    ) {

        requiredSelect.value =
            'yes';

        detailsFields.classList.remove(
            'hidden'
        );

        document
            .getElementById(
                'bodybuilderSupplier'
            )
            .value =
                existingVisit.supplier_name ||
                '';

        document
            .getElementById(
                'bodybuilderDescription'
            )
            .value =
                existingVisit.body_description ||
                '';

        document
            .getElementById(
                'bodybuilderEstimatedDays'
            )
            .value =
                existingVisit.estimated_days ||
                '';

        status.textContent =
            existingVisit.status ||
            'Bodybuilder Required';
    }
}

const checkoutPanel =
    document.getElementById(
        'bodybuilderCheckoutPanel'
    );


const returnPanel =
    document.getElementById(
        'bodybuilderReturnPanel'
    );

    console.log(
    'Bodybuilder panel test:',
    {
        status: existingVisit?.status,
        checkoutPanel,
        returnPanel
    }
);

if (checkoutPanel) {
    checkoutPanel.classList.add('hidden');
}

if (returnPanel) {
    returnPanel.classList.add('hidden');
}

if (existingVisit) {

    if (
        existingVisit.status ===
        'Ready for Dispatch'
    ) {

        checkoutPanel
            ?.classList
            .remove('hidden');
    }

    if (
        existingVisit.status ===
        'At Bodybuilder'
    ) {

        returnPanel
            ?.classList
            .remove('hidden');
    }
}

if (
    checkoutButton &&
    existingVisit?.status === 'Ready for Dispatch'
) {

    checkoutButton.onclick = async function () {

        const checkoutPhotos = [
            {
                type: 'Front',
                inputId: 'bodybuilderCheckoutFront'
            },
            {
                type: 'Rear',
                inputId: 'bodybuilderCheckoutRear'
            },
            {
                type: 'Left Side',
                inputId: 'bodybuilderCheckoutLeft'
            },
            {
                type: 'Right Side',
                inputId: 'bodybuilderCheckoutRight'
            },
            {
                type: 'Fuel Gauge',
                inputId: 'bodybuilderCheckoutFuel'
            }
        ];

        const missingPhotos =
            checkoutPhotos.filter(
                item => {
                    const input =
                        document.getElementById(
                            item.inputId
                        );

                    return !input?.files?.[0];
                }
            );

        if (missingPhotos.length) {

            alert(
                'Please capture all five required check-out photographs before dispatch.'
            );

            return;
        }

        checkoutButton.disabled = true;
        checkoutButton.textContent =
            'Dispatching...';

        try {

            const {
                data: {
                    user
                },
                error: userError
            } =
                await supabaseClient
                    .auth
                    .getUser();

            if (userError || !user) {
                throw (
                    userError ||
                    new Error(
                        'No authenticated user found.'
                    )
                );
            }

            for (
                const photoItem
                of checkoutPhotos
            ) {

                const input =
                    document.getElementById(
                        photoItem.inputId
                    );

                const file =
                    input.files[0];

                const extension =
                    file.name
                        .split('.')
                        .pop()
                        ?.toLowerCase() ||
                    'jpg';

                const safeType =
                    photoItem.type
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9]+/g,
                            '-'
                        );

                const storagePath =
                    `${selectedCase.receiving_no}/checkout/${safeType}.${extension}`;

                const {
                    error: uploadError
                } =
                    await supabaseClient
                        .storage
                        .from(
                            'bodybuilder-photos'
                        )
                        .upload(
                            storagePath,
                            file,
                            {
                                contentType:
                                    file.type ||
                                    'image/jpeg',

                                upsert:
                                    true
                            }
                        );

                if (uploadError) {
                    throw uploadError;
                }

                const {
                    error: photoRecordError
                } =
                    await supabaseClient
                        .from(
                            'pdi_bodybuilder_photos'
                        )
                        .upsert(
                            {
                                bodybuilder_visit_id:
                                    existingVisit.id,

                                pdi_case_id:
                                    selectedCase.id,

                                receiving_no:
                                    selectedCase.receiving_no,

                                photo_stage:
                                    'Checkout',

                                photo_type:
                                    photoItem.type,

                                storage_path:
                                    storagePath,

                                captured_at:
                                    new Date()
                                        .toISOString(),

                                uploaded_by:
                                    user.id
                            },
                            {
                                onConflict:
                                    'bodybuilder_visit_id,photo_stage,photo_type'
                            }
                        );

                if (photoRecordError) {
                    throw photoRecordError;
                }
            }

            const checkoutTime =
                new Date().toISOString();

            const {
                error: checkoutError
            } =
                await supabaseClient
                    .from(
                        'pdi_bodybuilder_visits'
                    )
                    .update(
                        {
                            status:
                                'At Bodybuilder',

                            checkout_at:
                                checkoutTime,

                            checkout_by:
                                user.id,

                            updated_at:
                                checkoutTime
                        }
                    )
                    .eq(
                        'id',
                        existingVisit.id
                    );

            if (checkoutError) {
                throw checkoutError;
            }

            existingVisit.status =
                'At Bodybuilder';

            existingVisit.checkout_at =
                checkoutTime;

            status.textContent =
                'At Bodybuilder';

            checkoutPanel
                ?.classList
                .add('hidden');

            returnPanel
                ?.classList
                .remove('hidden');

            alert(
                'Vehicle dispatched to bodybuilder successfully.'
            );

        } catch (error) {

            console.error(
                'Could not dispatch vehicle to bodybuilder:',
                error
            );

            alert(
                'The vehicle could not be dispatched. Please check the browser console.'
            );

        } finally {

            checkoutButton.disabled =
                false;

            checkoutButton.textContent =
                'Confirm Vehicle Dispatched';
        }
    };
}
if (
    returnButton &&
    existingVisit?.status === 'At Bodybuilder'
) {

    returnButton.onclick = async function () {

        const returnPhotos = [
            {
                type: 'Front',
                inputId: 'bodybuilderReturnFront'
            },
            {
                type: 'Rear',
                inputId: 'bodybuilderReturnRear'
            },
            {
                type: 'Left Side',
                inputId: 'bodybuilderReturnLeft'
            },
            {
                type: 'Right Side',
                inputId: 'bodybuilderReturnRight'
            },
            {
                type: 'Fuel Gauge',
                inputId: 'bodybuilderReturnFuel'
            }
        ];

        const missingPhotos =
            returnPhotos.filter(
                item => {
                    const input =
                        document.getElementById(
                            item.inputId
                        );

                    return !input?.files?.[0];
                }
            );

        if (missingPhotos.length) {

            alert(
                'Please capture all five required return photographs before confirming the vehicle return.'
            );

            return;
        }

        returnButton.disabled = true;
        returnButton.textContent =
            'Confirming Return...';

        try {

            const {
                data: {
                    user
                },
                error: userError
            } =
                await supabaseClient
                    .auth
                    .getUser();

            if (userError || !user) {
                throw (
                    userError ||
                    new Error(
                        'No authenticated user found.'
                    )
                );
            }

            for (
                const photoItem
                of returnPhotos
            ) {

                const input =
                    document.getElementById(
                        photoItem.inputId
                    );

                const file =
                    input.files[0];

                const extension =
                    file.name
                        .split('.')
                        .pop()
                        ?.toLowerCase() ||
                    'jpg';

                const safeType =
                    photoItem.type
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9]+/g,
                            '-'
                        );

                const storagePath =
                    `${selectedCase.receiving_no}/return/${safeType}.${extension}`;

                const {
                    error: uploadError
                } =
                    await supabaseClient
                        .storage
                        .from(
                            'bodybuilder-photos'
                        )
                        .upload(
                            storagePath,
                            file,
                            {
                                contentType:
                                    file.type ||
                                    'image/jpeg',

                                upsert:
                                    true
                            }
                        );

                if (uploadError) {
                    throw uploadError;
                }

                const {
                    error: photoRecordError
                } =
                    await supabaseClient
                        .from(
                            'pdi_bodybuilder_photos'
                        )
                        .upsert(
                            {
                                bodybuilder_visit_id:
                                    existingVisit.id,

                                pdi_case_id:
                                    selectedCase.id,

                                receiving_no:
                                    selectedCase.receiving_no,

                                photo_stage:
                                    'Return',

                                photo_type:
                                    photoItem.type,

                                storage_path:
                                    storagePath,

                                captured_at:
                                    new Date()
                                        .toISOString(),

                                uploaded_by:
                                    user.id
                            },
                            {
                                onConflict:
                                    'bodybuilder_visit_id,photo_stage,photo_type'
                            }
                        );

                if (photoRecordError) {
                    throw photoRecordError;
                }
            }

            const returnTime =
                new Date().toISOString();

            const {
                error: returnError
            } =
                await supabaseClient
                    .from(
                        'pdi_bodybuilder_visits'
                    )
                    .update(
                        {
                            status:
                                'Completed',

                            returned_at:
                                returnTime,

                            returned_by:
                                user.id,

                            updated_at:
                                returnTime
                        }
                    )
                    .eq(
                        'id',
                        existingVisit.id
                    );

            if (returnError) {
                throw returnError;
            }

            existingVisit.status =
                'Completed';

            existingVisit.returned_at =
                returnTime;

            status.textContent =
                'Bodybuilder Complete';

            returnPanel
                ?.classList
                .add('hidden');

            alert(
                'Vehicle return from bodybuilder confirmed successfully.'
            );

        } catch (error) {

            console.error(
                'Could not confirm vehicle return:',
                error
            );

            alert(
                'The vehicle return could not be confirmed. Please check the browser console.'
            );

        } finally {

            returnButton.disabled =
                false;

            returnButton.textContent =
                'Confirm Vehicle Returned';
        }
    };
}
    requiredSelect.onchange = function () {

        if (requiredSelect.value === 'yes') {

            detailsFields.classList.remove('hidden');

            status.textContent =
                'Bodybuilder Required';

        } else if (
            requiredSelect.value ===
            'not_applicable'
        ) {

            detailsFields.classList.add('hidden');

            status.textContent =
                'Not Applicable';

        } else {

            detailsFields.classList.add('hidden');

            status.textContent =
                'Pending Decision';
        }
    };

saveButton.onclick = async function () {

        const decision =
            requiredSelect.value;

        if (!decision) {

            alert(
                'Please select whether a bodybuilder is required.'
            );

            return;
        }

        const supplier =
            document
                .getElementById('bodybuilderSupplier')
                ?.value
                .trim() || null;

        const bodyDescription =
            document
                .getElementById('bodybuilderDescription')
                ?.value
                .trim() || null;

        const estimatedDays =
            Number(
                document
                    .getElementById('bodybuilderEstimatedDays')
                    ?.value
            ) || null;

        if (decision === 'yes') {

            if (
                !supplier ||
                !bodyDescription ||
                !estimatedDays
            ) {

                alert(
                    'Please enter the supplier, body being fitted and estimated fitment days.'
                );

                return;
            }
        }

        console.log(
            'Saving bodybuilder decision:',
            {
                receivingNo:
                    selectedCase.receiving_no,
                decision,
                supplier,
                bodyDescription,
                estimatedDays
            }
        );

        const bodybuilderRequired =
    decision === 'yes';

const bodybuilderStatus =
    bodybuilderRequired
        ? 'Ready for Dispatch'
        : 'Not Applicable';

const {
    error: saveError
} =
    await supabaseClient
        .from('pdi_bodybuilder_visits')
        .upsert(
            {
                pdi_case_id:
                    selectedCase.id,

                receiving_no:
                    selectedCase.receiving_no,

                bodybuilder_required:
                    bodybuilderRequired,

                supplier_name:
                    bodybuilderRequired
                        ? supplier
                        : null,

                body_description:
                    bodybuilderRequired
                        ? bodyDescription
                        : null,

                estimated_days:
                    bodybuilderRequired
                        ? estimatedDays
                        : null,

                status:
                    bodybuilderStatus,

                updated_at:
                    new Date().toISOString()
            },
            {
                onConflict:
                    'pdi_case_id'
            }
        );

if (saveError) {

    console.error(
        'Could not save bodybuilder details:',
        saveError
    );

    alert(
        'Bodybuilder details could not be saved.'
    );

    return;
}
if (decision === 'yes') {

    status.textContent =
        'Ready for Dispatch';

} else {

    status.textContent =
        'Not Applicable';
}

await initialiseBodybuilderPhase(
    selectedCase
);

alert(
    'Bodybuilder details saved successfully.'
);

};
}
/* =========================================================
   CLOSE WORKFLOW
========================================================= */

document
  .getElementById(
    'closeWorkflowButton'
  )
  ?.addEventListener(
    'click',
    () => {

      document
        .getElementById(
          'workflowSection'
        )
        ?.classList
        .add(
          'hidden'
        );
    }
  );
  /* =========================================================
   SECTION 3
   LOAD + RENDER COMPLETE VEHICLE WORKFLOW
========================================================= */

let selectedPdiCaseId = null;
let selectedPdiSteps = [];
let selectedPdiStep = null;
let pdiStepCompletionInProgress = false;

/* =========================================================
   LOAD ALL STEPS FOR ONE PDI CASE
========================================================= */

async function loadPdiWorkflowSteps(caseId) {

  const {
    data,
    error
  } =
    await supabaseClient
      .from('pdi_case_steps')
      .select(`
        id,
        pdi_case_id,
        step_no,
        phase_no,
        activity,
        responsible_role,
        step_status,
        completed_by_name,
        completed_at,
        comments,
 reopened_by,
reopened_by_name,
reopened_at,
reopen_reason
      `)
      .eq(
        'pdi_case_id',
        caseId
      )
      .order(
        'step_no',
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      'Could not load PDI workflow steps:',
      error
    );

    return false;
  }


  selectedPdiCaseId =
    caseId;


  selectedPdiSteps =
    data || [];


  renderPdiWorkflowSteps();


  return true;
}


/* =========================================================
   RENDER ALL FOUR PHASES
========================================================= */

function renderPdiWorkflowSteps() {

  const phase1 =
    document.getElementById(
      'phase1Steps'
    );

  const phase2 =
    document.getElementById(
      'phase2Steps'
    );

  const phase3 =
    document.getElementById(
      'phase3Steps'
    );

  const phase4 =
    document.getElementById(
      'phase4Steps'
    );


  if (
    !phase1 ||
    !phase2 ||
    !phase3 ||
    !phase4
  ) {

    console.error(
      'One or more PDI phase containers were not found.'
    );

    return;
  }


  phase1.innerHTML = '';
  phase2.innerHTML = '';
  phase3.innerHTML = '';
  phase4.innerHTML = '';


  selectedPdiSteps.forEach(
    step => {

      const html =
        buildPdiStepHtml(
          step
        );


      switch (
        Number(
          step.phase_no
        )
      ) {

        case 1:
          phase1.insertAdjacentHTML(
            'beforeend',
            html
          );
          break;

        case 2:
          phase2.insertAdjacentHTML(
            'beforeend',
            html
          );
          break;

        case 3:
          phase3.insertAdjacentHTML(
            'beforeend',
            html
          );
          break;

        case 4:
          phase4.insertAdjacentHTML(
            'beforeend',
            html
          );
          break;
      }
    }
  );


  attachPdiStepButtons();
}


/* =========================================================
   CREATE ONE WORKFLOW STEP
========================================================= */

function buildPdiStepHtml(step) {

  const selectedCase =
    pdiCases.find(
      item =>
        item.id ===
        selectedPdiCaseId
    );


  const isCurrent =
    Number(
      selectedCase?.current_step
    ) ===
    Number(
      step.step_no
    );


  const isCompleted =
    step.step_status ===
    'Completed';


  let rowClass =
    'workflow-step';


  if (isCompleted) {

    rowClass +=
      ' completed';

  } else if (isCurrent) {

    rowClass +=
      ' current';
  }


  let statusClass =
    'status-pending';


  let statusLabel =
    'Pending';


  if (isCompleted) {

    statusClass =
      'status-completed';

    statusLabel =
      'Completed';

  } else if (isCurrent) {

    statusClass =
      'status-active';

    statusLabel =
      'Current';
  }


  const completedDetail =
    isCompleted
      ? `
        <span>
          ${
            step.completed_by_name
              ? `Completed by ${escapePdiHtml(step.completed_by_name)}`
              : 'Completed'
          }
          ${
            step.completed_at
              ? ` · ${formatPdiDateTime(step.completed_at)}`
              : ''
          }
        </span>
      `
      : '';

const reopenAuditHtml =
    step.reopened_at
        ? `
            <span class="workflow-step-reopen-audit">
                Reopened by ${
                    escapePdiHtml(
                        step.reopened_by_name || 'Administrator'
                    )
                }${
                    step.reopened_at
                        ? ` · ${formatPdiDateTime(step.reopened_at)}`
                        : ''
                }${
                    step.reopen_reason
                        ? ` · Reason: ${escapePdiHtml(step.reopen_reason)}`
                        : ''
                }
            </span>
        `
        : '';
const canAction =
  userCanHandlePdiRole(
    step.responsible_role
  );

  const isCurrentPhase =
  Number(step.phase_no) ===
  Number(selectedCase?.current_phase);

let actionButton = '';

const canReopen =
    isCompleted &&
    pdiUserProfile?.is_admin === true;

if (canReopen) {

    actionButton = `
        <button
            type="button"
            class="action-button reopen-pdi-step-button"
            data-step-id="${step.id}"
        >
            Reverse Completion
        </button>
    `;

} else if (
    isCurrentPhase &&
    !isCompleted &&
    canAction
) {

    actionButton = `
        <button
            type="button"
            class="action-button complete-pdi-step-button"
            data-step-id="${step.id}"
        >
            Complete
        </button>
    `;

} else if (
    isCurrentPhase &&
    !isCompleted &&
    !canAction
) {

    actionButton = `
        <span
            class="status-badge status-pending"
            title="This step must be completed by ${escapePdiHtml(
                step.responsible_role
            )}"
        >
            Awaiting ${
                escapePdiHtml(
                    step.responsible_role
                )
            }
        </span>
    `;

} else {

    actionButton = `
        <span
            class="status-badge ${statusClass}"
        >
            ${statusLabel}
        </span>
    `;
}


  return `
    <div class="${rowClass}">

      <div class="step-number">
        ${
          isCompleted
            ? '✓'
            : step.step_no
        }
      </div>


      <div class="step-info">

        <strong>
          Step ${step.step_no} —
          ${escapePdiHtml(step.activity)}
        </strong>

        ${completedDetail}

${reopenAuditHtml}

${
    step.comments
        ? `
            <span>
                Notes:
                ${escapePdiHtml(step.comments)}
            </span>
        `
        : ''
}

      </div>


      <div class="step-responsible">

        ${escapePdiHtml(
          step.responsible_role ||
          '-'
        )}

      </div>


      <div>

        ${actionButton}

      </div>

    </div>
  `;
}


/* =========================================================
   BUTTON HANDLERS
========================================================= */

function attachPdiStepButtons() {

  document
    .querySelectorAll(
      '.complete-pdi-step-button'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            const stepId =
              Number(
                button.dataset.stepId
              );


            openPdiStepModal(
              stepId
            );
          }
        );
      }
    );
}

document.addEventListener(
    'click',
    async event => {

        const button =
            event.target.closest(
                '.reopen-pdi-step-button'
            );

        if (!button) {
            return;
        }


        const stepId =
            Number(
                button.dataset.stepId
            );


        const reason =
            prompt(
                'Please enter the reason for reversing this completion:'
            );


        if (reason === null) {
            return;
        }


        if (reason.trim().length < 3) {

            alert(
                'Please enter a valid reason.'
            );

            return;
        }


        button.disabled = true;

        button.textContent =
            'Reopening...';


        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .rpc(
                        'reopen_pdi_step',
                        {
                            target_step_id:
                                stepId,

                            reopen_reason_text:
                                reason.trim()
                        }
                    );


            if (error) {
                throw error;
            }


            console.log(
                'PDI step reopened:',
                data
            );


            await loadPdiCases();


            if (selectedPdiCaseId) {

                await openPdiWorkflow(
                    selectedPdiCaseId
                );
            }


        } catch (error) {

            console.error(
                'Could not reopen PDI step:',
                error
            );


            alert(
                'The completed step could not be reversed. Please check the browser console.'
            );


        } finally {

            button.disabled = false;

            button.textContent =
                'Reverse Completion';
        }
    }
);

/* =========================================================
   OPEN STEP MODAL
========================================================= */

function openPdiStepModal(stepId) {

  const step =
    selectedPdiSteps.find(
      item =>
        item.id === stepId
    );


  if (!step) {

    console.error(
      'PDI step not found:',
      stepId
    );

    return;
  }


  selectedPdiStep =
    step;


  document
    .getElementById(
      'modalStepNumber'
    )
    .textContent =
      `Step ${step.step_no}`;


  document
    .getElementById(
      'modalStepTitle'
    )
    .textContent =
      step.activity;


  document
    .getElementById(
      'modalResponsible'
    )
    .textContent =
      step.responsible_role ||
      '-';


  document
    .getElementById(
      'stepComments'
    )
    .value =
      step.comments ||
      '';


  document
    .getElementById(
      'stepModal'
    )
    ?.classList
    .remove(
      'hidden'
    );
}


/* =========================================================
   CLOSE STEP MODAL
========================================================= */

function closePdiStepModal() {

  selectedPdiStep =
    null;


  document
    .getElementById(
      'stepModal'
    )
    ?.classList
    .add(
      'hidden'
    );


  const comments =
    document.getElementById(
      'stepComments'
    );


  if (comments) {
    comments.value = '';
  }
}


/* =========================================================
   COMPLETE CURRENT STEP
========================================================= */

async function completeSelectedPdiStep() {

  if (pdiStepCompletionInProgress) {
  return;
}

pdiStepCompletionInProgress = true;

  if (
    !selectedPdiStep ||
    !selectedPdiCaseId ||
    !pdiSession
  ) {

    return;
  }
if (
  !userCanHandlePdiRole(
    selectedPdiStep.responsible_role
  )
) {

  alert(
    `You are not authorised to complete this step.

Responsible role: ${selectedPdiStep.responsible_role}`
  );

  return;
}

  const comments =
    document.getElementById(
      'stepComments'
    )?.value.trim() ||
    '';


  const button =
    document.getElementById(
      'completeStepButton'
    );


  if (button) {

    button.disabled = true;

    button.textContent =
      'Saving...';
  }


  try {

    const completedAt =
      new Date()
        .toISOString();


    const userEmail =
      pdiSession.user.email ||
      'Authenticated User';

const {
  data,
  error
} =
  await supabaseClient
    .rpc(
      'complete_pdi_step',
      {
        target_step_id:
          selectedPdiStep.id,

        step_comments:
          comments
      }
    );

if (error) {
  throw error;
}

console.log(
  'PDI step completed securely:',
  data
);
    /*
    closePdiStepModal();


    /*
      4. Reload everything from Supabase
    */

    await loadPdiCases();


    const stillExists =
      pdiCases.find(
        item =>
          item.id ===
          selectedPdiCaseId
      );


    if (stillExists) {

      openPdiWorkflow(
        selectedPdiCaseId
      );

    } else {

      document
        .getElementById(
          'workflowSection'
        )
        ?.classList
        .add(
          'hidden'
        );
    }


  } catch (error) {

    console.error(
      'Could not complete PDI step:',
      error
    );


    alert(
      'The workflow step could not be completed. Please check the browser console.'
    );

  } finally {

    pdiStepCompletionInProgress = false;

    if (button) {

      button.disabled = false;

      button.textContent =
        'Complete Step';
    }
  }
}


/* =========================================================
   MODIFY EXISTING OPEN WORKFLOW FUNCTION
========================================================= */

/*
  This function wraps the summary function
  from Section 2 and then loads the real steps.
*/

const originalOpenPdiWorkflow =
  openPdiWorkflow;


openPdiWorkflow =
  async function(caseId) {

    originalOpenPdiWorkflow(
      caseId
    );


    await loadPdiWorkflowSteps(
      caseId
    );
  };


/* =========================================================
   MODAL EVENT LISTENERS
========================================================= */

document
  .getElementById(
    'completeStepButton'
  )
  ?.addEventListener(
    'click',
    completeSelectedPdiStep
  );


document
  .getElementById(
    'cancelStepButton'
  )
  ?.addEventListener(
    'click',
    closePdiStepModal
  );


document
  .getElementById(
    'closeStepModalButton'
  )
  ?.addEventListener(
    'click',
    closePdiStepModal
  );


/* =========================================================
   UTILITIES
========================================================= */

function escapePdiHtml(value) {

  return String(
    value ?? ''
  )
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    );
}


function formatPdiDateTime(value) {

  if (!value) return '';


  return new Date(
    value
  ).toLocaleString(
    'en-ZA',
    {
      dateStyle: 'medium',
      timeStyle: 'short'
    }
  );
}

/* =========================================================
   SECTION 4
   MY OUTSTANDING ACTIONS
========================================================= */


/* =========================================================
   CHECK WHETHER CURRENT USER CAN HANDLE ROLE
========================================================= */

function userCanHandlePdiRole(
  responsibleRole
) {

  if (!pdiUserProfile) {
    return false;
  }

  if (!pdiUserProfile.is_active) {
    return false;
  }

  if (pdiUserProfile.is_admin) {
    return true;
  }

  const roles =
    pdiUserProfile.roles || [];

  const required =
    String(
      responsibleRole || ''
    )
      .toLowerCase()
      .trim();
const isDriverStep =
    required === 'driver';

const userIsPdiController =
    roles.some(
        role =>
            String(role)
                .toLowerCase()
                .trim() ===
            'pdi controller'
    );

if (
    isDriverStep &&
    userIsPdiController
) {
    return true;
}
  return roles.some(
    role => {

      const userRole =
        String(role)
          .toLowerCase()
          .trim();

      return (
        required.includes(userRole) ||
        userRole.includes(required)
      );
    }
  );
}

/* =========================================================
   RENDER MY OUTSTANDING ACTIONS
========================================================= */

async function renderMyPdiActions() {

  const container =
    document.getElementById(
      'myActionsList'
    );


  if (!container) {
    return;
  }


  /* -------------------------------------------------------
     No cases or no user profile
  ------------------------------------------------------- */

  if (
    !pdiCases.length ||
    !pdiUserProfile
  ) {

    container.innerHTML = `
      <div class="empty-state">
        No outstanding actions assigned to you.
      </div>
    `;

    return;
  }


  /* -------------------------------------------------------
     Only work with active PDI cases
  ------------------------------------------------------- */

  const activeCases =
    pdiCases.filter(
      item =>
        item.workflow_status !==
        'Completed'
    );


  if (!activeCases.length) {

    container.innerHTML = `
      <div class="empty-state">
        No outstanding actions assigned to you.
      </div>
    `;

    return;
  }


  const caseIds =
    activeCases.map(
      item => item.id
    );


  /* -------------------------------------------------------
     Load workflow steps for active cases
  ------------------------------------------------------- */

  const {
    data,
    error
  } =
    await supabaseClient
      .from('pdi_case_steps')
      .select(`
        id,
        pdi_case_id,
        step_no,
        activity,
        responsible_role,
        step_status
      `)
      .in(
        'pdi_case_id',
        caseIds
      );


  if (error) {

    console.error(
      'Could not load My Outstanding Actions:',
      error
    );

    container.innerHTML = `
      <div class="empty-state">
        Could not load outstanding actions.
      </div>
    `;

    return;
  }


  const steps =
    data || [];


  /* -------------------------------------------------------
     Match each case to its CURRENT workflow step
  ------------------------------------------------------- */

  const myActions =
    activeCases
      .map(
        caseRecord => {

          const step =
            steps.find(
              item =>
                item.pdi_case_id ===
                  caseRecord.id &&
                Number(
                  item.step_no
                ) ===
                  Number(
                    caseRecord.current_step
                  )
            );


          if (!step) {
            return null;
          }


          /* Check whether this user's role may action it */

          if (
            !userCanHandlePdiRole(
              step.responsible_role
            )
          ) {

            return null;
          }


          return {
            caseRecord,
            step
          };
        }
      )
      .filter(Boolean);


  /* -------------------------------------------------------
     Nothing currently assigned to this user
  ------------------------------------------------------- */

  if (!myActions.length) {

    container.innerHTML = `
      <div class="empty-state">
        No outstanding actions assigned to you.
      </div>
    `;

    return;
  }


  /* -------------------------------------------------------
     Build action cards
  ------------------------------------------------------- */

  container.innerHTML =
    myActions
      .map(
        item => {

          const vehicle =
            [
              item.caseRecord.make,
              item.caseRecord.model
            ]
              .filter(Boolean)
              .join(' ') ||
            '-';


          return `
            <div class="workflow-step current">

              <div class="step-number">
                ${item.step.step_no}
              </div>


              <div class="step-info">

                <strong>
                  ${escapePdiHtml(vehicle)}
                </strong>


                <span>
                  VIN:
                  ${escapePdiHtml(
                    item.caseRecord.vin ||
                    '-'
                  )}
                </span>


                <span>
                  Step ${item.step.step_no} —
                  ${escapePdiHtml(
                    item.step.activity
                  )}
                </span>

              </div>


              <div class="step-responsible">

                ${escapePdiHtml(
                  item.step.responsible_role ||
                  '-'
                )}

              </div>


              <div>

                <button
                  type="button"
                  class="
                    action-button
                    my-action-open-button
                  "
                  data-case-id="${
                    item.caseRecord.id
                  }"
                >
                  Open
                </button>

              </div>

            </div>
          `;
        }
      )
      .join('');


  /* -------------------------------------------------------
     OPEN BUTTONS
  ------------------------------------------------------- */

  document
    .querySelectorAll(
      '.my-action-open-button'
    )
    .forEach(
      button => {

        button.addEventListener(
          'click',
          () => {

            openPdiWorkflow(
              Number(
                button.dataset.caseId
              )
            );
          }
        );
      }
    );
}

async function renderWorkflowReceivingPhotos(
    photos
) {

    const section =
        document.getElementById(
            'workflowReceivingPhotosSection'
        );

    const grid =
        document.getElementById(
            'workflowReceivingPhotosGrid'
        );

    if (!section || !grid) {
        return;
    }

    grid.innerHTML = '';

    if (!photos || !photos.length) {

        section.classList.add(
            'hidden'
        );

        return;
    }

    const photoLabels = {
        front: 'Front View',
        rear: 'Rear View',
        left: 'Left Side View',
        right: 'Right Side View',
        vin: 'VIN Plate',
        engine: 'Engine Plate',
        odometer: 'Odometer'
    };

    for (const photo of photos) {

        try {

            const signedUrl =
                await getReceivingPhotoSignedUrl(
                    photo.storage_path
                );

            if (!signedUrl) {
                continue;
            }

            const card =
                document.createElement(
                    'div'
                );

            card.className =
                'workflow-photo-card';

            const label =
                photoLabels[
                    photo.photo_type
                ] ||
                photo.photo_type;

            const capturedText =
                photo.captured_at
                    ? formatPdiDateTime(
                        photo.captured_at
                    )
                    : '';

            card.innerHTML = `
                <div class="workflow-photo-title">
                    ${escapePdiHtml(label)}
                </div>

                <img
                    src="${signedUrl}"
                    alt="${escapePdiHtml(label)}"
                    class="workflow-photo-image"
                >

                <div class="workflow-photo-meta">
                    ${
                        capturedText
                            ? `
                                <div>
                                    Captured:
                                    ${escapePdiHtml(
                                        capturedText
                                    )}
                                </div>
                            `
                            : ''
                    }

                    ${
                        photo.location_text
                            ? `
                                <div>
                                    ${escapePdiHtml(
                                        photo.location_text
                                    )}
                                </div>
                            `
                            : ''
                    }
                </div>

                <div class="workflow-photo-actions">

                    <button
                        type="button"
                        class="secondary-button workflow-photo-view-button"
                    >
                        View
                    </button>

                    <button
                        type="button"
                        class="secondary-button workflow-photo-download-button"
                    >
                        Download
                    </button>

                </div>
            `;

            const viewButton =
                card.querySelector(
                    '.workflow-photo-view-button'
                );

            const downloadButton =
                card.querySelector(
                    '.workflow-photo-download-button'
                );

            viewButton?.addEventListener(
                'click',
                () => {

                    window.open(
                        signedUrl,
                        '_blank',
                        'noopener'
                    );
                }
            );

            downloadButton?.addEventListener(
                'click',
                async () => {

                    try {

                        const response =
                            await fetch(
                                signedUrl
                            );

                        if (!response.ok) {
                            throw new Error(
                                'Could not download photo.'
                            );
                        }

                        const blob =
                            await response.blob();

                        const objectUrl =
                            URL.createObjectURL(
                                blob
                            );

                        const link =
                            document.createElement(
                                'a'
                            );

                        link.href =
                            objectUrl;

                        link.download =
                            `${photo.photo_type}.jpg`;

                        document.body
                            .appendChild(link);

                        link.click();

                        link.remove();

                        URL.revokeObjectURL(
                            objectUrl
                        );

                    } catch (error) {

                        console.error(
                            'Could not download receiving photo:',
                            error
                        );

                        alert(
                            'The photo could not be downloaded.'
                        );
                    }
                }
            );

            grid.appendChild(
                card
            );

        } catch (error) {

            console.error(
                'Could not display receiving photo:',
                photo,
                error
            );
        }
    }

    if (grid.children.length) {

        section.classList.remove(
            'hidden'
        );

    } else {

        section.classList.add(
            'hidden'
        );
    }
}