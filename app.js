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

function createInspectionNo() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `TBP-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function init() {
  document.getElementById('inspectionNo').value = createInspectionNo();
  document.getElementById('inspectionDate').valueAsDate = new Date();
  renderChecklist();
  initSignature();
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
}

function setComment(id, comment) {
  state.items[id].comment = comment;
}

function addPhotos(id, files) {
  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      state.items[id].photos.push(e.target.result);
      refreshPhotos(id);
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
  report.style.display = 'block';

  setTimeout(() => {
    window.print();
  }, 300);
}

function saveDraft() {
  const fields = ['inspectionNo','inspectionDate','inspector','inspectorEmail','customer','make','model','registration','vin','engine','odometer','location','comments','conclusion'];
  const draft = { state, signature: document.getElementById('signaturePad').toDataURL(), fields: {} };

  fields.forEach(id => draft.fields[id] = field(id));

  localStorage.setItem('tradebackProDraft', JSON.stringify(draft));
  alert('Draft saved on this device.');
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
  if (confirm('Start a new inspection and clear current entries?')) {
    location.reload();
  }
}

let signaturePadHasInk = false;

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
}

document.addEventListener("change", function(e) {
  if (e.target.matches("select")) {
    calculateInspectionScore();
  }
});

calculateInspectionScore();