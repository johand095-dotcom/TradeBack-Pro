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
        workflow_status,
        current_phase,
        current_step,
        current_step_started_at,
        started_at,
        updated_at,
        completed_at
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

function openPdiWorkflow(caseId) {

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