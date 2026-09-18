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