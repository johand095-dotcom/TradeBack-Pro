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

async function initialiseEmsModule() {

    try {

        console.log(
            'Starting EMS Operations Module...'
        );

        hideEmsApplication();

        setEmsLoginMessage(
            'Checking user...'
        );

        const {
            data: { session },
            error
        } =
            await supabaseClient.auth
                .getSession();

        if (error) {

            console.error(
                'Could not read EMS session:',
                error
            );

            setEmsLoginMessage(
                'Unable to verify signed-in user.',
                true
            );

            return;
        }

        emsSession =
            session;

            console.log('EMS SESSION DEBUG:', session);

        if (session) {

            await loadEmsUserProfile();
        }
        
        console.log('EMS PROFILE DEBUG:', emsUserProfile);

        updateEmsSignedInUser();

        if (session && emsUserProfile) {

            showEmsApplication();

            console.log(
                'Existing EMS session restored:',
                session.user.email
            );

        } else {

            console.warn(
                'No existing EMS session found.'
            );

            setEmsLoginMessage(
                'Please sign in through the ELT Vehicle Suite to access EMS Operations.',
                true
            );
        }

    } catch (error) {

        console.error(
            'EMS authentication startup failed:',
            error
        );

        setEmsLoginMessage(
            'EMS authentication could not be started.',
            true
        );
    }
}

/* =========================================================
   START APPLICATION
========================================================= */

initialiseEmsModule();