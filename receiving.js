const RECEIVING_DATABASE_KEY = 'eltReceivingDatabase';
const RECEIVING_ACTIVE_KEY = 'eltReceivingActive';
const RECEIVING_DRAFT_KEY = 'eltReceivingDraft';
const RECEIVING_IMAGE_MAX_WIDTH = 800;
const RECEIVING_IMAGE_MAX_HEIGHT = 800;
const RECEIVING_IMAGE_QUALITY = 0.48;

const MAX_ARRIVAL_PHOTOS_PER_VIEW = 1;
const MAX_CHECKLIST_PHOTOS_PER_ITEM = 3;
/* ========= SUPABASE ========= */

const SUPABASE_URL = 'https://upkmtznkhfbwadofaxno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Al-SumF_BuGOzzwpIX_yBw_LwGJUYet';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
/* ========= AUTHENTICATION ========= */

let receivingSession = null;

function setReceivingLoginMessage(
  message,
  isError = true
) {
  const element =
    document.getElementById(
      'receivingLoginMessage'
    );

  if (!element) return;

  element.innerText = message;
  element.style.color =
    isError ? '#b42318' : '#157347';
}

function showReceivingLogin() {
  const screen =
    document.getElementById(
      'receivingLoginScreen'
    );

  if (screen) {
    screen.style.display = 'flex';
  }
}

function hideReceivingLogin() {
  const screen =
    document.getElementById(
      'receivingLoginScreen'
    );

  if (screen) {
    screen.style.display = 'none';
  }
}

async function signInReceivingUser() {
  const email =
    document.getElementById(
      'receivingLoginEmail'
    )?.value.trim();

  const password =
    document.getElementById(
      'receivingLoginPassword'
    )?.value;

  const button =
    document.getElementById(
      'receivingLoginButton'
    );

  if (!email || !password) {
    setReceivingLoginMessage(
      'Please enter your email address and password.'
    );
    return;
  }

  if (button) {
    button.disabled = true;
    button.innerText = 'Signing in...';
  }

  setReceivingLoginMessage(
    'Checking your account...',
    false
  );

  const { data, error } =
    await supabaseClient.auth
      .signInWithPassword({
        email,
        password
      });

  if (button) {
    button.disabled = false;
    button.innerText = 'Sign In';
  }

  if (error) {
    console.error(
      'Supabase sign-in failed:',
      error
    );

    setReceivingLoginMessage(
      'Sign-in failed. Please check your email address and password.'
    );

    return;
  }

  receivingSession = data.session;

  setReceivingLoginMessage(
    'Signed in successfully.',
    false
  );

  hideReceivingLogin();

  if (!receivingAppReady) {
    initReceiving();
  }
}

async function signOutReceivingUser() {
  await supabaseClient.auth.signOut();

  receivingSession = null;
  receivingAppReady = false;

  showReceivingLogin();
}

async function initReceivingCloudAccess() {
  const {
    data: { session },
    error
  } =
    await supabaseClient.auth.getSession();

  if (error) {
    console.error(
      'Could not read Supabase session:',
      error
    );
  }

  receivingSession = session;

  if (session) {
    hideReceivingLogin();
    initReceiving();
  } else {
    showReceivingLogin();
  }

  supabaseClient.auth.onAuthStateChange(
    (event, nextSession) => {
      receivingSession = nextSession;

      if (event === 'SIGNED_OUT') {
        receivingAppReady = false;
        showReceivingLogin();
      }
    }
  );
}
function isStorageQuotaError(error) {
  return (
    error?.name === 'QuotaExceededError' ||
    error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error?.code === 22 ||
    error?.code === 1014
  );
}

function showReceivingStorageFullMessage() {
  alert(
    'Browser storage is full.\n\n' +
    'Please download any important reports and delete older test records or unnecessary drafts before continuing.\n\n' +
    'The most recent photo or change could not be saved.'
  );
}

// Update this list before publishing if additional recipients are required.
const RECEIVING_EMAIL_RECIPIENTS = [
  'johand@eltgroup.co.za',
  'fredb@eltgroup.co.za',
  'chantald@eltgroup.co.za',
  'shreenathp@eltgroup.co.za',
  'venecia@eltgroup.co.za',
  'nadiab@eltgroup.co.za',
  'paulam@eltgroup.co.za',

 

];

const RECEIVING_CHECKLIST = [
  'VIN Plate','PDI Certificate','Spare Key','Spare Wheel','Central Locking',
  'Locking Mechanisms','Jack','Wheel Spanner','Tool Kit','Chock Blocks',
  'Mirrors RH','Mirrors LH','Windscreen','Windows RH','Windows LH',
  'Door Handle RH','Door Handle LH','Fifth Wheel','Tail Board','Mudguards',
  'Dashboard','Curtains','Cubby Holes','Hood Lining','Driver Seat',
  'Passenger Seat','Carpets','Rear bunk bed','Air Suzie pipes','Electrical Suzie',
  'Hooter','Tail lights','Head Lights','Fog Lamps','Side Marker Lamps','Paint','Other'
];

const ARRIVAL_PHOTO_TYPES = [
  { id: 'front', label: 'Front View', required: true },
  { id: 'rear', label: 'Rear View', required: true },
  { id: 'left', label: 'Left Side View', required: true },
  { id: 'right', label: 'Right Side View', required: true },
  { id: 'vin', label: 'VIN Plate', required: false },
  { id: 'enginePlate', label: 'Engine Plate', required: true },
  { id: 'odometer', label: 'Odometer', required: false }
];

let receivingState = { items: {}, arrivalPhotos: {} };
let receivingAppReady = false;
let receivingSignatureHasInk = false;

function receivingField(id) {
  return document.getElementById(id)?.value || '';
}

function createReceivingNo() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `RCV-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${Math.floor(1000 + Math.random()*9000)}`;
}

function getReceivingDatabase() {
  try {
    return JSON.parse(localStorage.getItem(RECEIVING_DATABASE_KEY) || '[]');
  } catch (error) {
    console.error('Could not read receiving database:', error);
    return [];
  }
}

function saveReceivingDatabase(records) {
  try {
    localStorage.setItem(
      RECEIVING_DATABASE_KEY,
      JSON.stringify(records)
    );

    return true;
  } catch (error) {
    console.error(
      'Could not save receiving database:',
      error
    );

    if (isStorageQuotaError(error)) {
      showReceivingStorageFullMessage();
    } else {
      alert(
        'The receiving database could not be saved.'
      );
    }

    const status =
      document.getElementById(
        'receivingAutosaveStatus'
      );

    if (status) {
      status.innerText =
        'Storage full — record not saved';
    }

    return false;
  }
}

function upsertReceiving(record) {
  const records = getReceivingDatabase();
  const index = records.findIndex(r => r.receivingNo === record.receivingNo);
  if (index >= 0) records[index] = record;
  else records.push(record);
  records.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const saved = saveReceivingDatabase(records);
  if (saved) localStorage.setItem(RECEIVING_ACTIVE_KEY, record.receivingNo);
  return saved;
}

function compressReceivingImage(
  file,
  maxWidth = RECEIVING_IMAGE_MAX_WIDTH,
  maxHeight = RECEIVING_IMAGE_MAX_HEIGHT,
  quality = RECEIVING_IMAGE_QUALITY
) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(
        new Error('Unable to read the selected image.')
      );
    };

    reader.onload = event => {
      const image = new Image();

      image.onerror = () => {
        reject(
          new Error('Unable to process the selected image.')
        );
      };

      image.onload = () => {
        const scale = Math.min(
          1,
          maxWidth / image.width,
          maxHeight / image.height
        );

        const width = Math.max(
          1,
          Math.round(image.width * scale)
        );

        const height = Math.max(
          1,
          Math.round(image.height * scale)
        );

        const canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d', {
          alpha: false
        });

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);

        context.drawImage(
          image,
          0,
          0,
          width,
          height
        );

        resolve(
          canvas.toDataURL(
            'image/jpeg',
            quality
          )
        );
      };

      image.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}

function initReceiving() {
  receivingAppReady = false;
  renderArrivalPhotos();
  renderReceivingChecklist();
  initReceivingSignature();

 const draftReceivingNo =
    localStorage.getItem(RECEIVING_DRAFT_KEY);

if (draftReceivingNo) {

    const draftRecord =
        getReceivingDatabase().find(
            item => item.receivingNo === draftReceivingNo
        );

    if (draftRecord) {

        loadReceivingRecord(draftRecord, false);

    } else {

        localStorage.removeItem(RECEIVING_DRAFT_KEY);

        document.getElementById('receivingNo').value = createReceivingNo();
        document.getElementById('receivedDate').valueAsDate = new Date();
        document.getElementById('receivedTime').value =
            new Date().toTimeString().slice(0,5);
    }

} else {

    document.getElementById('receivingNo').value = createReceivingNo();
    document.getElementById('receivedDate').valueAsDate = new Date();
    document.getElementById('receivedTime').value =
        new Date().toTimeString().slice(0,5);

} 

  receivingAppReady = true;
  calculateReceivingResult();
  renderReceivingLibrary();
  updateReceivingDashboard();
}

function renderArrivalPhotos() {
  const wrap = document.getElementById('arrivalPhotoGrid');
  wrap.innerHTML = '';
  ARRIVAL_PHOTO_TYPES.forEach(type => {
    receivingState.arrivalPhotos[type.id] = receivingState.arrivalPhotos[type.id] || [];
    const card = document.createElement('div');
    card.className = 'arrival-photo-card';
    card.innerHTML = `
      <strong>${type.label}${type.required ? ' *' : ''}</strong>
      <input type="file" accept="image/*" capture="environment" onchange="addArrivalPhoto('${type.id}', this.files)" />
      <div id="arrival_${type.id}" class="photo-list"></div>
    `;
    wrap.appendChild(card);
    refreshArrivalPhotos(type.id);
  });
}

async function addArrivalPhoto(typeId, files) {
  const selectedFiles = Array.from(files || []);

  if (!receivingState.arrivalPhotos[typeId]) {
    receivingState.arrivalPhotos[typeId] = [];
  }

  if (
    receivingState.arrivalPhotos[typeId].length >=
    MAX_ARRIVAL_PHOTOS_PER_VIEW
  ) {
    alert(
      'Only one arrival photo is allowed for each required view. Remove the current photo before adding another.'
    );
    return;
  }

  const file = selectedFiles[0];

  if (!file) return;

  try {
    const image =
      await compressReceivingImage(file);

    receivingState.arrivalPhotos[typeId].push(image);
    refreshArrivalPhotos(typeId);

    const saved = saveReceivingDraftSilent();

    if (!saved) {
      receivingState.arrivalPhotos[typeId].pop();
      refreshArrivalPhotos(typeId);

      alert(
        'The photo was removed because the receiving record could not be saved.'
      );
    }
  } catch (error) {
    console.error(error);

    alert(
      `The photo "${file.name}" could not be added.`
    );
  }
}
function refreshArrivalPhotos(typeId) {
  const box = document.getElementById(`arrival_${typeId}`);
  if (!box) return;
  box.innerHTML = '';
  (receivingState.arrivalPhotos[typeId] || []).forEach((photo,index) => {
    const div = document.createElement('div');
    div.className = 'photo-thumb';
    div.innerHTML = `<img src="${photo}" /><button type="button" onclick="removeArrivalPhoto('${typeId}',${index})">Remove</button>`;
    box.appendChild(div);
  });
}

function removeArrivalPhoto(typeId,index) {
  receivingState.arrivalPhotos[typeId].splice(index,1);
  refreshArrivalPhotos(typeId);
  saveReceivingDraftSilent();
}

function receivingItemId(item) {
  return `rcv_${item}`.replace(/[^a-z0-9]/gi,'_');
}

function renderReceivingChecklist() {
  const wrap = document.getElementById('receivingChecklist');
  wrap.innerHTML = '';
  RECEIVING_CHECKLIST.forEach(item => {
    const id = receivingItemId(item);
    receivingState.items[id] = receivingState.items[id] || {
      item, status: 'Not Checked', comment: '', photos: []
    };
    const row = document.createElement('div');
    row.className = 'item-row receiving-item-row';
    row.id = `receiving_row_${id}`;
    row.innerHTML = `
      <div class="item-name">${item}</div>
      <select onchange="setReceivingStatus('${id}',this.value)">
        <option>Not Checked</option><option>Pass</option><option>Fail</option><option>N/A</option>
      </select>
      <textarea placeholder="Comment / damage details" oninput="setReceivingComment('${id}',this.value)"></textarea>
      <div><input type="file" accept="image/*" capture="environment" multiple onchange="addReceivingPhotos('${id}',this.files)" /><div id="receiving_photos_${id}" class="photo-list"></div></div>
    `;
    wrap.appendChild(row);
    restoreReceivingRow(id);
  });
}

function restoreReceivingRow(id) {
  const row = document.getElementById(`receiving_row_${id}`);
  if (!row) return;
  const item = receivingState.items[id];
  row.querySelector('select').value = item.status || 'Not Checked';
  row.querySelector('textarea').value = item.comment || '';
  row.classList.toggle('failed', item.status === 'Fail');
  refreshReceivingPhotos(id);
}

function setReceivingStatus(id,status) {
  receivingState.items[id].status = status;
  const row = document.getElementById(`receiving_row_${id}`);
  row.classList.toggle('failed', status === 'Fail');
  calculateReceivingResult();
  saveReceivingDraftSilent();
}

function setReceivingComment(id,comment) {
  receivingState.items[id].comment = comment;
  saveReceivingDraftSilent();
}

async function addReceivingPhotos(id, files) {
  const selectedFiles = Array.from(files || []);

  if (!receivingState.items[id]) return;

  const currentPhotos =
    receivingState.items[id].photos || [];

  const remainingSlots =
    MAX_CHECKLIST_PHOTOS_PER_ITEM -
    currentPhotos.length;

  if (remainingSlots <= 0) {
    alert(
      `A maximum of ${MAX_CHECKLIST_PHOTOS_PER_ITEM} photos is allowed per checklist item.`
    );
    return;
  }

  const filesToAdd =
    selectedFiles.slice(0, remainingSlots);

  if (selectedFiles.length > remainingSlots) {
    alert(
      `Only ${remainingSlots} more photo` +
      `${remainingSlots === 1 ? '' : 's'} can be added to this item.`
    );
  }

  for (const file of filesToAdd) {
    try {
      const image =
        await compressReceivingImage(file);

      receivingState.items[id].photos.push(image);
      refreshReceivingPhotos(id);

      const saved = saveReceivingDraftSilent();

      if (!saved) {
        receivingState.items[id].photos.pop();
        refreshReceivingPhotos(id);

        alert(
          'The photo was removed because the receiving record could not be saved.'
        );

        break;
      }
    } catch (error) {
      console.error(error);

      alert(
        `The photo "${file.name}" could not be added.`
      );
    }
  }
}

function refreshReceivingPhotos(id) {
  const box = document.getElementById(`receiving_photos_${id}`);
  if (!box) return;
  box.innerHTML = '';
  (receivingState.items[id].photos || []).forEach((photo,index) => {
    const div = document.createElement('div');
    div.className = 'photo-thumb';
    div.innerHTML = `<img src="${photo}" /><button type="button" onclick="removeReceivingPhoto('${id}',${index})">Remove</button>`;
    box.appendChild(div);
  });
}

function removeReceivingPhoto(id,index) {
  receivingState.items[id].photos.splice(index,1);
  refreshReceivingPhotos(id);
  saveReceivingDraftSilent();
}

function calculateReceivingResult() {
  const items = Object.values(receivingState.items);
  const pass = items.filter(i => i.status === 'Pass').length;
  const fail = items.filter(i => i.status === 'Fail').length;
  const unchecked = items.filter(i => i.status === 'Not Checked').length;
  const assessed = items.length - unchecked;
  const progress = items.length ? Math.round((assessed/items.length)*100) : 0;
  const autoResult = unchecked > 0 ? 'Incomplete' : fail > 0 ? 'Accepted with Damage' : 'Accepted';
  const decision = receivingField('receivingDecision');
  const finalResult = decision && decision !== 'Auto' ? decision : autoResult;

  document.getElementById('receivingPassCount').innerText = pass;
  document.getElementById('receivingFailCount').innerText = fail;
  document.getElementById('receivingUncheckedCount').innerText = unchecked;
  document.getElementById('receivingResult').innerText = finalResult;
  document.getElementById('receivingProgressText').innerText = `${progress}% completed`;
  document.getElementById('receivingProgressFill').style.width = `${progress}%`;

  const detailComplete = ['stockNumber','receivingVin','receivingMake','receivingModel'].some(id => receivingField(id));
  document.getElementById('navReceivingDetails').innerText = detailComplete ? '✓' : '○';
  document.getElementById('navReceivingChecklist').innerText = unchecked === 0 ? '✓' : '○';
  document.getElementById('navReceivingSummary').innerText = receivingField('receivingDamageSummary') || receivingField('receivingComments') ? '✓' : '○';
  document.getElementById('navReceivingSignature').innerText = receivingSignatureHasInk ? '✓' : '○';
  return { pass, fail, unchecked, progress, autoResult, finalResult };
}

function collectReceivingFields() {
  const ids = [
    'receivingNo','receivedDate','receivedTime','receivingController','receivingControllerEmail','receivingLocation',
    'receivingSupplier','stockNumber','receivingMake','receivingModel','receivingVin','receivingEngine','receivingColour',
    'receivingOdometer','transportCompany','driverName','driverContact','deliveryReference','receivingDecision',
    'receivingDamageSummary','receivingComments'
  ];
  return Object.fromEntries(ids.map(id => [id, receivingField(id)]));
}
/* ========= CLOUD RECEIVING SAVE ========= */

async function saveReceivingRecordToCloud(record) {
  if (!receivingSession) {
    console.warn(
      'Cloud save skipped because no user is signed in.'
    );

    return false;
  }

  const fields = record.fields || {};
  const items = record.state?.items || {};

  /*
   * Do not send Base64 photographs into the database.
   * Photographs will be uploaded to Supabase Storage
   * during the next migration step.
   */
  const cloudChecklist = Object.fromEntries(
    Object.entries(items).map(([id, item]) => [
      id,
      {
        item: item.item,
        status: item.status,
        comment: item.comment || '',
        photoCount: (item.photos || []).length
      }
    ])
  );

  const payload = {
    receiving_no: record.receivingNo,
    stock_no: fields.stockNumber || null,
    vin: fields.receivingVin || null,
    make: fields.receivingMake || null,
    model: fields.receivingModel || null,
    received_date: fields.receivedDate || null,
    received_time: fields.receivedTime || null,
    controller: fields.receivingController || null,
    location: fields.receivingLocation || null,
    status: record.status || 'Draft',
    result: record.result || 'Incomplete',
    damage_count: Object.values(items).filter(
      item => item.status === 'Fail'
    ).length,
    report: {
      fields,
      checklist: cloudChecklist,
      damageSummary:
        fields.receivingDamageSummary || '',
      controllerComments:
        fields.receivingComments || ''
    },
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from('receivings')
    .upsert(payload, {
      onConflict: 'receiving_no'
    });

  if (error) {
    console.error(
      'Supabase receiving save failed:',
      error
    );

    const status = document.getElementById(
      'receivingAutosaveStatus'
    );

    if (status) {
      status.innerText =
        'Saved locally — cloud backup failed';
    }

    return false;
  }

  const status = document.getElementById(
    'receivingAutosaveStatus'
  );

  if (status) {
    status.innerText =
      'Saved locally and backed up to cloud at ' +
      new Date().toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit'
      });
  }

  return true;
}
function saveReceivingDraftSilent() {
  if (!receivingAppReady) {
    return false;
  }

  if (!receivingField('receivingNo')) {
    document.getElementById(
      'receivingNo'
    ).value = createReceivingNo();
  }

  const fields = collectReceivingFields();

  const signatureCanvas =
    document.getElementById(
      'receivingSignaturePad'
    );

  const signature =
    signatureCanvas &&
    receivingSignatureHasInk
      ? signatureCanvas.toDataURL(
          'image/jpeg',
          0.45
        )
      : '';

  const metrics =
    calculateReceivingResult();

  const previous =
    getReceivingDatabase().find(
      record =>
        record.receivingNo ===
        fields.receivingNo
    );

  const record = {
    receivingNo: fields.receivingNo,
    status:
      previous?.status === 'Completed'
        ? 'Completed'
        : 'Draft',
    result: metrics.finalResult,
    fields,
    state: receivingState,
    signature,
    createdAt:
      previous?.createdAt ||
      new Date().toISOString(),
    completedAt:
      previous?.completedAt || null,
    updatedAt:
      new Date().toISOString()
  };

  try {
    /*
     * Store the full record only once,
     * inside the receiving database.
     */
    const saved =
      upsertReceiving(record);

    if (!saved) {
      return false;
    }
saveReceivingRecordToCloud(record);
    /*
     * The active draft now stores only
     * the receiving number, not another
     * complete copy of all photographs.
     */
    localStorage.setItem(
      RECEIVING_DRAFT_KEY,
      fields.receivingNo
    );

    const status =
      document.getElementById(
        'receivingAutosaveStatus'
      );

    if (status) {
      status.innerText =
        'Saved at ' +
        new Date().toLocaleTimeString(
          'en-ZA',
          {
            hour: '2-digit',
            minute: '2-digit'
          }
        );
    }

    renderReceivingLibrary();
    updateReceivingDashboard();

    return true;
  } catch (error) {
    console.error(
      'Receiving draft save failed:',
      error
    );

    if (isStorageQuotaError(error)) {
      showReceivingStorageFullMessage();
    } else {
      alert(
        'The receiving draft could not be saved.'
      );
    }

    return false;
  }
}

function saveReceivingDraft() {
  const saved = saveReceivingDraftSilent();
  alert(saved ? `${receivingField('receivingNo')} saved successfully.` : 'The receiving draft could not be saved.');
}

function loadReceivingRecord(record, scroll = true) {
  receivingAppReady = false;
  receivingState = record.state || {items:{},arrivalPhotos:{}};
  Object.entries(record.fields || {}).forEach(([id,value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value || '';
  });
  renderArrivalPhotos();
  renderReceivingChecklist();
  clearReceivingSignature();
  if (record.signature) restoreReceivingSignature(record.signature);
  receivingAppReady = true;
  calculateReceivingResult();
  localStorage.setItem(RECEIVING_ACTIVE_KEY, record.receivingNo);
  if (scroll) document.getElementById('receivingDetails').scrollIntoView({behavior:'smooth'});
}

function loadLatestReceivingDraft() {
  const receivingNo =
    localStorage.getItem(
      RECEIVING_DRAFT_KEY
    );

  if (!receivingNo) {
    alert(
      'No receiving draft is saved on this device.'
    );
    return;
  }

  const record =
    getReceivingDatabase().find(
      item =>
        item.receivingNo === receivingNo
    );

  if (!record) {
    localStorage.removeItem(
      RECEIVING_DRAFT_KEY
    );

    alert(
      'The saved draft could not be found.'
    );

    return;
  }

  loadReceivingRecord(record);
}

function openReceiving(receivingNo) {
  const record = getReceivingDatabase().find(r => r.receivingNo === receivingNo);
  if (!record) return alert('Receiving record not found.');
  loadReceivingRecord(record);
}

function deleteReceiving(receivingNo) {
  if (!confirm(`Delete receiving ${receivingNo}? This cannot be undone.`)) return;
  saveReceivingDatabase(getReceivingDatabase().filter(r => r.receivingNo !== receivingNo));
  renderReceivingLibrary();
  updateReceivingDashboard();
}

function newReceiving() {
  if (!confirm('Start a new receiving inspection? The current record will be saved first.')) return;
  if (receivingAppReady && receivingField('receivingNo')) saveReceivingDraftSilent();
  receivingAppReady = false;
  receivingState = {items:{},arrivalPhotos:{}};
  document.querySelectorAll('#receivingDetails input, #receivingSummarySection textarea').forEach(el => {
    if (!['receivingController','receivingControllerEmail'].includes(el.id)) el.value = '';
  });
  document.getElementById('receivingDecision').value = 'Auto';
  document.getElementById('receivingNo').value = createReceivingNo();
  document.getElementById('receivedDate').valueAsDate = new Date();
  document.getElementById('receivedTime').value = new Date().toTimeString().slice(0,5);
  clearReceivingSignature();
  renderArrivalPhotos();
  renderReceivingChecklist();
  localStorage.removeItem(RECEIVING_DRAFT_KEY);
  receivingAppReady = true;
  calculateReceivingResult();
  saveReceivingDraftSilent();
  document.getElementById('receivingDetails').scrollIntoView({behavior:'smooth'});
}

function validateReceiving() {
  const missingRequired = ['stockNumber','receivingVin','receivingMake','receivingModel','receivingController'].filter(id => !receivingField(id));
  if (missingRequired.length) return alert('Please complete Stock Number, VIN, Make, Model and Receiving Controller.'), false;
  const failedInvalid = Object.values(receivingState.items).filter(i => i.status === 'Fail' && (!i.comment.trim() || !i.photos.length));
  if (failedInvalid.length) return alert('Every failed checklist item requires a comment and at least one photo.'), false;
  const missingArrival = ARRIVAL_PHOTO_TYPES.filter(t => t.required && !(receivingState.arrivalPhotos[t.id] || []).length);
  if (missingArrival.length) return alert(`Please add the required arrival photos: ${missingArrival.map(x=>x.label).join(', ')}.`), false;
  if (!receivingSignatureHasInk) return alert('Please capture the receiving controller signature.'), false;
  return true;
}

function initReceivingSignature() {
  const canvas = document.getElementById('receivingSignaturePad');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  const pos = e => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {x:(touch.clientX-rect.left)*(canvas.width/rect.width), y:(touch.clientY-rect.top)*(canvas.height/rect.height)};
  };
  const start = e => {drawing=true; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); e.preventDefault();};
  const move = e => {if(!drawing)return; const p=pos(e); ctx.lineWidth=2; ctx.lineCap='round'; ctx.lineTo(p.x,p.y); ctx.stroke(); receivingSignatureHasInk=true; calculateReceivingResult(); e.preventDefault();};
  const end = () => drawing=false;
  canvas.addEventListener('mousedown',start); canvas.addEventListener('mousemove',move); window.addEventListener('mouseup',end);
  canvas.addEventListener('touchstart',start); canvas.addEventListener('touchmove',move); canvas.addEventListener('touchend',end);
}

function clearReceivingSignature() {
  const canvas = document.getElementById('receivingSignaturePad');
  canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
  receivingSignatureHasInk=false;
  calculateReceivingResult();
}

function restoreReceivingSignature(dataUrl) {
  if (!dataUrl) return;
  const img = new Image();
  img.onload = () => {
    const canvas = document.getElementById('receivingSignaturePad');
    canvas.getContext('2d').drawImage(img,0,0);
    receivingSignatureHasInk=true;
    calculateReceivingResult();
  };
  img.src=dataUrl;
}

function renderReceivingLibrary() {
  const body = document.getElementById('receivingLibraryBody');
  const search = receivingField('receivingLibrarySearch').trim().toLowerCase();
  const filter = receivingField('receivingLibraryStatus') || 'all';
  const records = getReceivingDatabase().filter(record => {
    const f = record.fields || {};
    const haystack = [record.receivingNo,f.stockNumber,f.receivingVin,f.receivingMake,f.receivingModel].join(' ').toLowerCase();
    return (!search || haystack.includes(search)) && (filter === 'all' || (record.status || '').toLowerCase() === filter);
  });
  if (!records.length) {
    body.innerHTML='<tr><td colspan="7" class="empty-library">No saved receiving reports found.</td></tr>';
    return;
  }
  body.innerHTML = records.map(record => {
    const f=record.fields||{};
    return `<tr><td><strong>${record.receivingNo}</strong></td><td>${f.stockNumber||'-'}</td><td>${[f.receivingMake,f.receivingModel].filter(Boolean).join(' ')||'-'}</td><td>${f.receivingVin||'-'}</td><td>${record.result||'-'}</td><td>${record.status||'Draft'}</td><td><button type="button" onclick="openReceiving('${record.receivingNo}')">Open</button> <button type="button" class="ghost" onclick="deleteReceiving('${record.receivingNo}')">Delete</button></td></tr>`;
  }).join('');
}

function updateReceivingDashboard() {
  const records=getReceivingDatabase();
  document.getElementById('receivingTotalCount').innerText=records.length;
  document.getElementById('receivingDamageCount').innerText=records.filter(r => r.result === 'Accepted with Damage' || r.result === 'Rejected').length;
  document.getElementById('receivingCompletedCount').innerText=records.filter(r => r.status === 'Completed').length;
}

function buildReceivingReport() {
  const metrics=calculateReceivingResult();
  const rows=Object.values(receivingState.items).map(i => `<tr><td>${i.item}</td><td>${i.status}</td><td>${i.comment||''}</td><td>${i.photos.length ? `${i.photos.length} photo${i.photos.length===1?'':'s'} attached` : '-'}</td></tr>`).join('');
  const allPhotos=[];
  ARRIVAL_PHOTO_TYPES.forEach(type => (receivingState.arrivalPhotos[type.id]||[]).forEach((p,index)=>allPhotos.push({title:type.label,photo:p,index:index+1})));
  Object.values(receivingState.items).filter(i=>i.photos.length).forEach(i=>i.photos.forEach((p,index)=>allPhotos.push({title:i.item,photo:p,index:index+1,status:i.status})));
  const photoHtml=allPhotos.map(p=>`<div class="report-photo-card"><img class="report-photo" src="${p.photo}"/><div class="report-photo-caption"><strong>${p.title}</strong><br>${p.status?`Status: ${p.status}<br>`:''}Photo ${p.index}</div></div>`).join('');
  const report=document.getElementById('receivingReport');
  report.innerHTML=`
    <div class="report-header"><div><h1>New Vehicle Receiving Report</h1><p>ELT Group (PTY) Ltd</p></div><div class="mini-logo">ELT</div></div>
    <table>
      <tr><th>Receiving No.</th><td>${receivingField('receivingNo')}</td><th>Date / Time</th><td>${receivingField('receivedDate')} ${receivingField('receivedTime')}</td></tr>
      <tr><th>Stock No.</th><td>${receivingField('stockNumber')}</td><th>Supplier / OEM</th><td>${receivingField('receivingSupplier')}</td></tr>
      <tr><th>Make</th><td>${receivingField('receivingMake')}</td><th>Model</th><td>${receivingField('receivingModel')}</td></tr>
      <tr><th>VIN</th><td>${receivingField('receivingVin')}</td><th>Engine No.</th><td>${receivingField('receivingEngine')}</td></tr>
      <tr><th>Colour</th><td>${receivingField('receivingColour')}</td><th>Odometer</th><td>${receivingField('receivingOdometer')}</td></tr>
      <tr><th>Branch</th><td>${receivingField('receivingLocation')}</td><th>Controller</th><td>${receivingField('receivingController')}</td></tr>
      <tr><th>Transporter</th><td>${receivingField('transportCompany')}</td><th>Driver</th><td>${receivingField('driverName')} ${receivingField('driverContact')}</td></tr>
      <tr><th>Delivery Reference</th><td>${receivingField('deliveryReference')}</td><th>Result</th><td><strong>${metrics.finalResult}</strong></td></tr>
    </table>
    <h2>Receiving Summary</h2>
    <table><tr><th>Passed</th><td>${metrics.pass}</td><th>Failed</th><td>${metrics.fail}</td></tr><tr><th>Not Checked</th><td>${metrics.unchecked}</td><th>Completion</th><td>${metrics.progress}%</td></tr><tr><th>Damage / Exceptions</th><td colspan="3">${receivingField('receivingDamageSummary').replace(/\n/g,'<br>')||'None recorded'}</td></tr></table>
    <h2>Visual Check Sheet</h2>
    <table><thead><tr><th>Item</th><th>Status</th><th>Comment</th><th>Photo Evidence</th></tr></thead><tbody>${rows}</tbody></table>
    ${photoHtml ? `<h2 class="photo-appendix-heading">Photo Evidence</h2><div class="report-photo-grid">${photoHtml}</div>` : ''}
    <h2>Controller Comments</h2><p>${receivingField('receivingComments').replace(/\n/g,'<br>')||'-'}</p>
    <h2>Receiving Controller Signature</h2><img style="max-width:320px;border:1px solid #999" src="${document.getElementById('receivingSignaturePad').toDataURL()}" />
  `;
  return {report,metrics};
}

function generateReceivingReport() {
  if (!validateReceiving()) return;
  const {report,metrics}=buildReceivingReport();
  const printWindow=window.open('','_blank');
  if (!printWindow) return alert('Please allow pop-ups for this site and try again.');
  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${receivingField('receivingNo')}</title><style>
    @page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#111827;font-size:12px}.report-header{display:flex;justify-content:space-between;align-items:center;border-bottom:4px solid #003b73;padding-bottom:12px;margin-bottom:18px}.report-header h1{margin:0 0 6px;color:#001e3c;font-size:24px}.mini-logo{color:#003b73;font-size:24px;font-weight:900;border:3px solid #003b73;padding:10px;border-radius:8px}h2{color:#001e3c;margin-top:22px;margin-bottom:8px;border-bottom:2px solid #eaf3ff;padding-bottom:6px;page-break-after:avoid}table{width:100%;border-collapse:collapse;margin:10px 0 18px}th,td{border:1px solid #9ca3af;padding:7px;text-align:left;vertical-align:top;font-size:10px}th{background:#e8edf5}thead{display:table-header-group}tr,img{page-break-inside:avoid}.report-photo-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.report-photo-card{border:1px solid #cbd5e1;border-radius:6px;padding:6px;break-inside:avoid}.report-photo{display:block;width:100%;height:150px;object-fit:contain;background:#f8fafc}.report-photo-caption{padding-top:5px;font-size:9px}.photo-appendix-heading{page-break-before:always}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>${report.innerHTML}</body></html>`);
  printWindow.document.close();
  const completeRecord=()=>{
    const fields=collectReceivingFields();
    const records=getReceivingDatabase();
    const index=records.findIndex(r=>r.receivingNo===fields.receivingNo);
    const record={receivingNo:fields.receivingNo,status:'Completed',result:metrics.finalResult,fields,state:receivingState,signature:document.getElementById('receivingSignaturePad').toDataURL(),createdAt:index>=0?records[index].createdAt:new Date().toISOString(),completedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(index>=0)records[index]=record;else records.push(record);
    saveReceivingDatabase(records);saveReceivingDatabase(records);

localStorage.setItem(
  RECEIVING_DRAFT_KEY,
  record.receivingNo
);

renderReceivingLibrary();
updateReceivingDashboard();
  };
  const printWhenReady=()=>Promise.all(Array.from(printWindow.document.images).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;}))).then(()=>{completeRecord();setTimeout(()=>{printWindow.focus();printWindow.print();},300);});
  if(printWindow.document.readyState==='complete')printWhenReady();else printWindow.onload=printWhenReady;
}

function emailReceivingReport() {
  const metrics=calculateReceivingResult();
 const to = RECEIVING_EMAIL_RECIPIENTS.join(';');
  const subject=encodeURIComponent(`New Vehicle Receiving Report - ${receivingField('receivingNo')} - ${receivingField('receivingVin')}`);
  const body=encodeURIComponent(`Good day,\n\nPlease find the new vehicle receiving report details below.\n\nReceiving No: ${receivingField('receivingNo')}\nStock No: ${receivingField('stockNumber')}\nVehicle: ${receivingField('receivingMake')} ${receivingField('receivingModel')}\nVIN: ${receivingField('receivingVin')}\nResult: ${metrics.finalResult}\nFailed Items: ${metrics.fail}\n\nDamage / Exception Summary:\n${receivingField('receivingDamageSummary') || 'None recorded'}\n\nPlease attach the saved PDF report before sending.\n\nRegards,\n${receivingField('receivingController')}\nELT Group (PTY) Ltd`);
  window.location.href=`mailto:${to}?subject=${subject}&body=${body}`;
}

setInterval(()=>saveReceivingDraftSilent(),30000);
document.addEventListener('input',event=>{if(event.target.closest('main'))saveReceivingDraftSilent();});
document.addEventListener('change',event=>{if(event.target.closest('main')){calculateReceivingResult();saveReceivingDraftSilent();}});
document.getElementById('receivingLibrarySearch')?.addEventListener('input',renderReceivingLibrary);
document.getElementById('receivingLibraryStatus')?.addEventListener('change',renderReceivingLibrary);

initReceivingCloudAccess();
