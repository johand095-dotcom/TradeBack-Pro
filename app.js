const checklistData = [
  { section: 'Vehicle Identification', items: ['VIN plate present and legible', 'Engine number present and legible', 'Registration documents available', 'License disc valid', 'Odometer reading recorded'] },
  { section: 'Exterior Body', items: ['Front bumper condition', 'Rear bumper condition', 'Bonnet condition', 'Roof condition', 'Left side panels', 'Right side panels', 'Doors open and close correctly', 'Paintwork condition', 'Rust or corrosion check'] },
  { section: 'Glass and Lights', items: ['Windscreen condition', 'Side windows condition', 'Mirrors condition', 'Headlights working', 'Tail lights working', 'Indicators working', 'Brake lights working', 'Reverse lights working'] },
  { section: 'Tyres and Wheels', items: ['Front tyres condition', 'Rear tyres condition', 'Spare wheel present', 'Wheel nuts present and secure', 'Rims condition'] },
  { section: 'Interior and Cab', items: ['Seats condition', 'Seat belts working', 'Dashboard condition', 'Warning lights check', 'Air conditioner operation', 'Radio / infotainment operation', 'Interior cleanliness'] },
  { section: 'Mechanical', items: ['Engine starts', 'Engine idle condition', 'Oil leaks', 'Coolant leaks', 'Air leaks', 'Transmission operation', 'Clutch operation', 'Brakes operation', 'Steering operation', 'Suspension condition'] },
  { section: 'Road Test', items: ['Acceleration normal', 'Gear changes normal', 'Braking normal', 'Steering alignment', 'Unusual noises', 'Vehicle pulls correctly under load'] },
  { section: 'Accessories and Equipment', items: ['Jack and tools present', 'Triangle / emergency equipment present', 'Keys present', 'Service book / records available', 'Aftermarket fitments noted'] }
];

let state = { items: {} };
let appReady = false;
const DATABASE_KEY = 'tradebackProDatabase';
const ACTIVE_INSPECTION_KEY = 'tradebackProActiveInspection';

function getInspectionDatabase() {
  try {
    const saved = localStorage.getItem(DATABASE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Could not read inspection database:', error);
    return [];
  }
}

function saveInspectionDatabase(records) {
  try {
    localStorage.setItem(DATABASE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    console.error('Could not save inspection database:', error);

    const status = document.getElementById('autosaveStatus');
    if (status) {
      status.innerText = 'Error saving inspection';
    }

    return false;
  }
}

function upsertInspectionRecord(record) {
  const records = getInspectionDatabase();

  const existingIndex = records.findIndex(
    item => item.inspectionNo === record.inspectionNo
  );

  if (existingIndex >= 0) {
    records[existingIndex] = record;
  } else {
    records.push(record);
  }

  records.sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );

  const saved = saveInspectionDatabase(records);

  if (saved) {
    localStorage.setItem(
      ACTIVE_INSPECTION_KEY,
      record.inspectionNo
    );
  }

  return saved;
}

function createInspectionNo() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `TBP-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function init() {
  appReady = false;

  renderChecklist();
  initSignature();

  const savedDraft = localStorage.getItem('tradebackProDraft');

  if (savedDraft) {
    loadDraft();
  } else {
    document.getElementById('inspectionNo').value = createInspectionNo();
    document.getElementById('inspectionDate').valueAsDate = new Date();

    calculateInspectionScore();
    updateNavigationStatus();
  }

  appReady = true;
}

function renderChecklist() {
  const wrap = document.getElementById('checklist');
  wrap.innerHTML = '';

  checklistData.forEach(group => {
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = group.section;
    wrap.appendChild(title);

    group.items.forEach(item => {
      const id = `${group.section}-${item}`.replace(/[^a-z0-9]/gi, '_');

      state.items[id] = state.items[id] || {
        section: group.section,
        item,
        status: 'Not Checked',
        comment: '',
        photos: []
      };

      const row = document.createElement('div');
      row.className = 'item-row';
      row.id = `row_${id}`;

      row.innerHTML = `
        <div class="item-name">${item}</div>

        <select onchange="setStatus('${id}', this.value)">
          <option>Not Checked</option>
          <option>Passed</option>
          <option>Advisory</option>
          <option>Failed</option>
          <option>N/A</option>
        </select>

        <textarea placeholder="Line item notes" oninput="setComment('${id}', this.value)"></textarea>

        <div>
          <input type="file" accept="image/*" capture="environment" multiple onchange="addPhotos('${id}', this.files)" />
          <div id="photos_${id}" class="photo-list"></div>
        </div>
      `;

      wrap.appendChild(row);
      refreshPhotos(id);
    });
  });
}

function setStatus(id, status) {
  state.items[id].status = status;

  const row = document.getElementById(`row_${id}`);
  row.classList.toggle('failed', status === 'Failed');
  row.classList.toggle('advisory', status === 'Advisory');

  calculateInspectionScore();
}saveDraftSilent();

function setComment(id, comment) {
  state.items[id].comment = comment;
}

function addPhotos(id, files) {
  Array.from(files).forEach(file => {
    const reader = new FileReader();

    reader.onload = e => {
      state.items[id].photos.push(e.target.result);
      refreshPhotos(id);
      saveDraftSilent();
    };

    reader.readAsDataURL(file);
  });
}

function refreshPhotos(id) {
  const box = document.getElementById(`photos_${id}`);
  if (!box) return;

  box.innerHTML = '';

  state.items[id].photos.forEach((photo, index) => {
    const div = document.createElement('div');
    div.className = 'photo-thumb';
    div.innerHTML = `
      <img src="${photo}" />
      <button type="button" onclick="removePhoto('${id}', ${index})">Remove</button>
    `;
    box.appendChild(div);
  });
}

function removePhoto(id, index) {
  state.items[id].photos.splice(index, 1);
  refreshPhotos(id);
  saveDraftSilent();
}

function field(id) {
  return document.getElementById(id).value || '';
}

function validateInspection() {
  const failedWithoutPhoto = Object.values(state.items).filter(i =>
    i.status === 'Failed' && (!i.photos || i.photos.length === 0)
  );

  if (failedWithoutPhoto.length) {
    alert('Photo evidence is required for every failed item before downloading the PDF report.');
    return false;
  }

  if (!signaturePadHasInk) {
    alert('Please capture a digital signature before downloading the report.');
    return false;
  }

  return true;
}

function buildReport() {
  const report = document.getElementById('report');

  const rows = Object.values(state.items).map(i => {
    const photoHtml = (i.photos || []).map(p => `<img class="evidence" src="${p}" />`).join('');
    return `
      <tr>
        <td>${i.section}</td>
        <td>${i.item}</td>
        <td>${i.status}</td>
        <td>${i.comment || ''}</td>
        <td>${photoHtml}</td>
      </tr>
    `;
  }).join('');

  report.innerHTML = `
    <div class="report-header">
      <div>
        <h1>Tradeback Pro Inspection Report</h1>
        <p>ELT Group (PTY) Ltd</p>
      </div>
      <div class="mini-logo">ELT</div>
    </div>

    <table>
      <tr><th>Inspection No.</th><td>${field('inspectionNo')}</td><th>Date</th><td>${field('inspectionDate')}</td></tr>
      <tr><th>Inspector</th><td>${field('inspector')}</td><th>Email</th><td>${field('inspectorEmail')}</td></tr>
      <tr><th>Customer / Seller</th><td>${field('customer')}</td><th>Location</th><td>${field('location')}</td></tr>
      <tr><th>Make</th><td>${field('make')}</td><th>Model</th><td>${field('model')}</td></tr>
      <tr><th>Registration</th><td>${field('registration')}</td><th>VIN</th><td>${field('vin')}</td></tr>
      <tr><th>Engine No.</th><td>${field('engine')}</td><th>Odometer</th><td>${field('odometer')}</td></tr>
    </table>

    <h2>Inspection Results</h2>
    <table>
      <thead>
        <tr>
          <th>Section</th>
          <th>Line Item</th>
          <th>Status</th>
          <th>Notes</th>
          <th>Photo Evidence</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <h2>Comments</h2>
    <p>${field('comments').replace(/\n/g, '<br>')}</p>

    <h2>Conclusion / Recommendation</h2>
    <p>${field('conclusion').replace(/\n/g, '<br>')}</p>

    <h2>Digital Signature</h2>
    <img style="max-width:320px;border:1px solid #999" src="${document.getElementById('signaturePad').toDataURL()}" />
  `;
}

function generateReport() {
  if (!validateInspection()) return;

  buildReport();

  const report = document.getElementById('report');

  if (!report || !report.innerHTML.trim()) {
    alert('Report content could not be generated.');
    return;
  }

  const inspectionNo =
    field('inspectionNo') || 'Tradeback-Pro-Report';

  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    alert(
      'The report window was blocked by the browser. Please allow pop-ups for Tradeback Pro and try again.'
    );
    return;
  }

  printWindow.document.open();

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">

      <title>${inspectionNo}</title>

      <style>
        @page {
          size: A4;
          margin: 12mm;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          background: white;
          font-size: 12px;
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 4px solid #003b73;
          padding-bottom: 12px;
          margin-bottom: 18px;
        }

        .report-header h1 {
          margin: 0 0 6px;
          color: #001e3c;
          font-size: 24px;
        }

        .report-header p {
          margin: 0;
        }

        .mini-logo {
          color: #003b73;
          font-size: 24px;
          font-weight: 900;
          border: 3px solid #003b73;
          padding: 10px;
          border-radius: 8px;
        }

        h2 {
          color: #001e3c;
          margin-top: 22px;
          margin-bottom: 8px;
          border-bottom: 2px solid #eaf3ff;
          padding-bottom: 6px;
          page-break-after: avoid;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0 18px;
        }

        th,
        td {
          border: 1px solid #9ca3af;
          padding: 7px;
          text-align: left;
          vertical-align: top;
          font-size: 10px;
        }

        th {
          background: #e8edf5;
          font-weight: 700;
        }

        thead {
          display: table-header-group;
        }

        tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        img.evidence {
          max-width: 100px;
          max-height: 75px;
          object-fit: contain;
          margin: 2px;
        }

        img {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        p {
          line-height: 1.45;
        }

        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>

    <body>
      ${report.innerHTML}
    </body>
    </html>
  `);

  printWindow.document.close();

  const markInspectionCompleted = () => {
    const records = getInspectionDatabase();

    const index = records.findIndex(
      item => item.inspectionNo === inspectionNo
    );

    if (index >= 0) {
      records[index].status = 'Completed';
      records[index].completedAt =
        new Date().toISOString();

      records[index].updatedAt =
        new Date().toISOString();

      saveInspectionDatabase(records);
      renderInspectionLibrary();
    }
  };

  const waitForImagesAndPrint = () => {
    const images =
      Array.from(printWindow.document.images);

    const pendingImages = images.map(img => {
      if (img.complete) {
        return Promise.resolve();
      }

      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    });

    Promise.all(pendingImages).then(() => {
      markInspectionCompleted();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    });
  };

  if (printWindow.document.readyState === 'complete') {
    waitForImagesAndPrint();
  } else {
    printWindow.onload = waitForImagesAndPrint;
  }
}

function loadDraft() {
  const draft = JSON.parse(localStorage.getItem('tradebackProDraft') || 'null');

  if (!draft) {
    alert('No saved draft found on this device.');
    return;
  }

  Object.entries(draft.fields).forEach(([id, value]) => {
    document.getElementById(id).value = value;
  });

  state = draft.state;
  renderChecklist();

  Object.entries(state.items).forEach(([id, i]) => {
    const row = document.getElementById(`row_${id}`);
    row.querySelector('select').value = i.status;
    row.querySelector('textarea').value = i.comment || '';
    row.classList.toggle('failed', i.status === 'Failed');
    row.classList.toggle('advisory', i.status === 'Advisory');
    refreshPhotos(id);
  });

  restoreSignature(draft.signature);
}

function resetInspection() {
  const confirmed = confirm(
    'Start a new inspection? The current inspection will be saved first.'
  );

  if (!confirmed) return;

  if (appReady && field('inspectionNo')) {
    saveDraftSilent();
  }

  appReady = false;

  state = { items: {} };

  const fieldsToClear = [
    'customer',
    'make',
    'model',
    'registration',
    'vin',
    'engine',
    'odometer',
    'location',
    'comments',
    'conclusion'
  ];

  fieldsToClear.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.value = '';
  });

  document.getElementById('inspectionNo').value =
    createInspectionNo();

  document.getElementById('inspectionDate').valueAsDate =
    new Date();

  clearSignature();
  renderChecklist();
  calculateInspectionScore();
  updateNavigationStatus();

  localStorage.removeItem('tradebackProDraft');

  localStorage.setItem(
    ACTIVE_INSPECTION_KEY,
    field('inspectionNo')
  );

  appReady = true;

  saveDraftSilent();
  renderInspectionLibrary();

  document.getElementById('inspectionDetails')
    ?.scrollIntoView({ behavior: 'smooth' });
}
function initSignature() {
  const canvas = document.getElementById('signaturePad');
  const ctx = canvas.getContext('2d');
  let drawing = false;

  const pos = e => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const start = e => {
    drawing = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    e.preventDefault();
  };

  const move = e => {
    if (!drawing) return;
    const p = pos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    signaturePadHasInk = true;
    e.preventDefault();
  };

  const end = () => drawing = false;

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);

  canvas.addEventListener('touchstart', start);
  canvas.addEventListener('touchmove', move);
  canvas.addEventListener('touchend', end);
}

function clearSignature() {
  const c = document.getElementById('signaturePad');
  c.getContext('2d').clearRect(0, 0, c.width, c.height);
  signaturePadHasInk = false;
}

function restoreSignature(dataUrl) {
  const img = new Image();
  img.onload = () => {
    const c = document.getElementById('signaturePad');
    c.getContext('2d').drawImage(img, 0, 0);
    signaturePadHasInk = true;
  };
  img.src = dataUrl;
}

init();
function calculateInspectionScore() {
  const items = Object.values(state.items);

  let totalPossible = 0;
  let totalScore = 0;
  let pass = 0;
  let advisory = 0;
  let fail = 0;
  let checked = 0;

  items.forEach(item => {
    const status = item.status;

    if (status === "Passed") {
      totalScore += 2;
      totalPossible += 2;
      pass++;
      checked++;
    }

    if (status === "Advisory") {
      totalScore += 1;
      totalPossible += 2;
      advisory++;
      checked++;
    }

    if (status === "Failed") {
      totalScore += 0;
      totalPossible += 2;
      fail++;
      checked++;
    }

    if (status === "N/A") {
      checked++;
    }
  });

  const percentage = totalPossible > 0
    ? Math.round((totalScore / totalPossible) * 100)
    : 0;

  let grade = "Not Rated";
  let condition = "Incomplete";
  let recommendation = "Complete the inspection to generate a result.";

  if (percentage >= 90) {
    grade = "A";
    condition = "Excellent";
    recommendation = "Suitable for resale with minimal or no repairs required.";
  } else if (percentage >= 75) {
    grade = "B";
    condition = "Good";
    recommendation = "Suitable for resale after minor attention.";
  } else if (percentage >= 60) {
    grade = "C";
    condition = "Average";
    recommendation = "Repairs required before resale.";
  } else if (percentage > 0) {
    grade = "D";
    condition = "Poor";
    recommendation = "Major repairs required before resale.";
  }

  const totalItems = items.length;
  const progress = totalItems > 0 ? Math.round((checked / totalItems) * 100) : 0;

  document.getElementById("scorePercentage").innerText = percentage + "%";
  document.getElementById("scoreGrade").innerText = grade;
  document.getElementById("scoreCondition").innerText = condition;
  document.getElementById("scoreRecommendation").innerText = recommendation;

  document.getElementById("passCount").innerText = pass;
  document.getElementById("advisoryCount").innerText = advisory;
  document.getElementById("failCount").innerText = fail;

  document.getElementById("dashScore").innerText = percentage + "%";
  document.getElementById("dashGrade").innerText = grade === "Not Rated" ? "-" : grade;
  document.getElementById("dashFails").innerText = fail;

  document.getElementById("progressText").innerText = progress + "% completed";
  document.getElementById("progressFill").style.width = progress + "%";
 updateGauge(percentage);
  updateNavigationStatus();
}

document.addEventListener("change", function(e) {
  if (e.target.matches("select")) {
    calculateInspectionScore();
  }
});

calculateInspectionScore();
function updateGauge(percentage) {
  const gauge = document.getElementById("dashGauge");
  if (!gauge) return;

  const degrees = Math.round((percentage / 100) * 360);
  gauge.style.background = `conic-gradient(var(--blue-main) ${degrees}deg, #e5edf6 ${degrees}deg)`;
}

function updateNavigationStatus() {
  const vehicleFields = ['customer','make','model','registration','vin','odometer'];
  const vehicleComplete = vehicleFields.some(id => field(id));

  const items = Object.values(state.items);
  const checkedItems = items.filter(i => i.status !== "Not Checked").length;
  const inspectionComplete = items.length > 0 && checkedItems === items.length;

  const summaryComplete = field('comments') || field('conclusion');

  document.getElementById("navVehicle").innerText = vehicleComplete ? "✓" : "○";
  document.getElementById("navInspection").innerText = inspectionComplete ? "✓" : "○";
  document.getElementById("navScore").innerText = checkedItems > 0 ? "✓" : "○";
  document.getElementById("navSummary").innerText = summaryComplete ? "✓" : "○";
  document.getElementById("navSignature").innerText = signaturePadHasInk ? "✓" : "○";
}

function autoSaveDraft() {
  saveDraftSilent();

  const el = document.getElementById("autosaveStatus");
  if (el) {
    const now = new Date();
    el.innerText = "Auto-saved at " + now.toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

function saveDraftSilent() {
  if (!appReady) return false;
  if (!field('inspectionNo')) {
  document.getElementById('inspectionNo').value = createInspectionNo();
}

if (!field('inspectionDate')) {
  document.getElementById('inspectionDate').valueAsDate = new Date();
}

  const fields = [
    'inspectionNo',
    'inspectionDate',
    'inspector',
    'inspectorEmail',
    'customer',
    'make',
    'model',
    'registration',
    'vin',
    'engine',
    'odometer',
    'location',
    'comments',
    'conclusion'
  ];

  const fieldValues = {};

  fields.forEach(id => {
    fieldValues[id] = field(id);
  });

  const signatureCanvas = document.getElementById('signaturePad');

  const signature =
    signatureCanvas && signaturePadHasInk
      ? signatureCanvas.toDataURL()
      : '';

  const legacyDraft = {
    state,
    signature,
    fields: fieldValues
  };

  try {
    // Preserve compatibility with the current recovery system.
    localStorage.setItem(
      'tradebackProDraft',
      JSON.stringify(legacyDraft)
    );

    const record = {
      inspectionNo: fieldValues.inspectionNo,
      status: 'Draft',
      fields: fieldValues,
      state,
      signature,
      score:
        document.getElementById('scorePercentage')?.innerText || '0%',
      grade:
        document.getElementById('scoreGrade')?.innerText || 'Not Rated',
      createdAt:
        getInspectionDatabase().find(
          item => item.inspectionNo === fieldValues.inspectionNo
        )?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = upsertInspectionRecord(record);

    if (saved && typeof renderInspectionLibrary === 'function') {
      renderInspectionLibrary();
    }

    return saved;
  } catch (error) {
    console.error('Draft save failed:', error);

    const status = document.getElementById('autosaveStatus');

    if (status) {
      status.innerText = 'Error saving draft';
    }

    return false;
  }
}
setInterval(autoSaveDraft, 30000);

function handleInspectionChange() {
  saveDraftSilent();

  try {
    updateNavigationStatus();
  } catch (error) {
    console.warn("Navigation status could not update:", error);
  }

  const autosaveStatus = document.getElementById("autosaveStatus");

  if (autosaveStatus) {
    autosaveStatus.innerText =
      "Saved at " +
      new Date().toLocaleTimeString("en-ZA", {
        hour: "2-digit",
        minute: "2-digit"
      });
  }
}

document.addEventListener("input", handleInspectionChange);
document.addEventListener("change", handleInspectionChange);
function renderInspectionLibrary() {
  const body = document.getElementById('inspectionLibraryBody');
  if (!body) return;

  const records = getInspectionDatabase();

  const search =
    (document.getElementById('librarySearch')?.value || '')
      .trim()
      .toLowerCase();

  const statusFilter =
    document.getElementById('libraryStatusFilter')?.value || 'all';

  const filtered = records.filter(record => {
    const fields = record.fields || {};

    const searchable = [
      record.inspectionNo,
      fields.customer,
      fields.make,
      fields.model,
      fields.registration,
      fields.vin
    ]
      .join(' ')
      .toLowerCase();

    const matchesSearch =
      !search || searchable.includes(search);

    const matchesStatus =
      statusFilter === 'all' ||
      (record.status || '').toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7" class="empty-library">
          No saved inspections found.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = filtered.map(record => {
    const fields = record.fields || {};

    const vehicle =
      [fields.make, fields.model]
        .filter(Boolean)
        .join(' ') || '-';

    const updated = record.updatedAt
      ? new Date(record.updatedAt).toLocaleString('en-ZA')
      : '-';

    return `
      <tr>
        <td><strong>${record.inspectionNo || '-'}</strong></td>
        <td>${fields.customer || '-'}</td>
        <td>${vehicle}</td>
        <td>${fields.registration || '-'}</td>
        <td>${record.status || 'Draft'}</td>
        <td>${updated}</td>
        <td>
          <button
            type="button"
            onclick="openInspection('${record.inspectionNo}')">
            Open
          </button>

          <button
            type="button"
            class="ghost"
            onclick="deleteInspection('${record.inspectionNo}')">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join('');
}


function openInspection(inspectionNo) {
  const record = getInspectionDatabase().find(
    item => item.inspectionNo === inspectionNo
  );

  if (!record) {
    alert('Inspection could not be found.');
    return;
  }

  appReady = false;

  state = record.state || { items: {} };

  Object.entries(record.fields || {}).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.value = value || '';
  });

  renderChecklist();

  Object.entries(state.items || {}).forEach(([id, item]) => {
    const row = document.getElementById(`row_${id}`);
    if (!row) return;

    const select = row.querySelector('select');
    const textarea = row.querySelector('textarea');

    if (select) select.value = item.status || 'Not Checked';
    if (textarea) textarea.value = item.comment || '';

    row.classList.toggle('failed', item.status === 'Failed');
    row.classList.toggle('advisory', item.status === 'Advisory');

    refreshPhotos(id);
  });

  clearSignature();

  if (record.signature) {
    restoreSignature(record.signature);
  }

  localStorage.setItem(
    ACTIVE_INSPECTION_KEY,
    inspectionNo
  );

  calculateInspectionScore();
  updateNavigationStatus();

  appReady = true;

  document.getElementById('inspectionDetails')
    ?.scrollIntoView({ behavior: 'smooth' });
}


function deleteInspection(inspectionNo) {
  const confirmed = confirm(
    `Delete inspection ${inspectionNo}? This cannot be undone.`
  );

  if (!confirmed) return;

  const records = getInspectionDatabase().filter(
    item => item.inspectionNo !== inspectionNo
  );

  saveInspectionDatabase(records);

  if (
    localStorage.getItem(ACTIVE_INSPECTION_KEY) === inspectionNo
  ) {
    localStorage.removeItem(ACTIVE_INSPECTION_KEY);
  }

  renderInspectionLibrary();
}


document
  .getElementById('librarySearch')
  ?.addEventListener('input', renderInspectionLibrary);

document
  .getElementById('libraryStatusFilter')
  ?.addEventListener('change', renderInspectionLibrary);