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

function createInspectionNo(){
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  return `TBP-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${Math.floor(1000 + Math.random()*9000)}`;
}

function init(){
  document.getElementById('inspectionNo').value = createInspectionNo();
  document.getElementById('inspectionDate').valueAsDate = new Date();
  renderChecklist();
  initSignature();
}

function renderChecklist(){
  const wrap = document.getElementById('checklist');
  wrap.innerHTML = '';
  checklistData.forEach(group => {
    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = group.section;
    wrap.appendChild(title);
    group.items.forEach(item => {
      const id = `${group.section}-${item}`.replace(/[^a-z0-9]/gi,'_');
      state.items[id] = state.items[id] || { section: group.section, item, status: 'Not Checked', comment: '', photo: '' };
      const row = document.createElement('div');
      row.className = 'item-row';
      row.id = `row_${id}`;
      row.innerHTML = `
        <div class="item-name">${item}</div>
        <select onchange="setStatus('${id}', this.value)">
          <option>Not Checked</option><option>Passed</option><option>Failed</option><option>N/A</option>
        </select>
        <textarea placeholder="Line item comments" oninput="setComment('${id}', this.value)"></textarea>
        <div>
          <input type="file" accept="image/*" capture="environment" onchange="setPhoto('${id}', this.files[0])" />
          <img id="photo_${id}" class="photo-preview" style="display:none" />
        </div>`;
      wrap.appendChild(row);
    });
  });
}

function setStatus(id, status){
  state.items[id].status = status;
  const row = document.getElementById(`row_${id}`);
  row.classList.toggle('failed', status === 'Failed');
}
function setComment(id, comment){ state.items[id].comment = comment; }
function setPhoto(id, file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    state.items[id].photo = e.target.result;
    const img = document.getElementById(`photo_${id}`);
    img.src = e.target.result;
    img.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function field(id){ return document.getElementById(id).value || ''; }
function validateInspection(){
  const failedWithoutPhoto = Object.values(state.items).filter(i => i.status === 'Failed' && !i.photo);
  if(failedWithoutPhoto.length){
    alert('Photo evidence is required for every failed item.');
    return false;
  }
  if(!signaturePadHasInk){
    alert('Please capture a digital signature before downloading the report.');
    return false;
  }
  return true;
}

function buildReport(){
  const report = document.getElementById('report');
  const rows = Object.values(state.items).map(i => `
    <tr>
      <td>${i.section}</td><td>${i.item}</td><td>${i.status}</td><td>${i.comment || ''}</td>
      <td>${i.photo ? `<img class="evidence" src="${i.photo}"/>` : ''}</td>
    </tr>`).join('');
  report.innerHTML = `
    <div class="report-header"><div><h1>Tradeback Pro Inspection Report</h1><p>ELT Group (PTY) Ltd</p></div><div class="mini-logo">ELT</div></div>
    <table><tr><th>Inspection No.</th><td>${field('inspectionNo')}</td><th>Date</th><td>${field('inspectionDate')}</td></tr>
    <tr><th>Inspector</th><td>${field('inspector')}</td><th>Email</th><td>${field('inspectorEmail')}</td></tr>
    <tr><th>Customer / Seller</th><td>${field('customer')}</td><th>Location</th><td>${field('location')}</td></tr>
    <tr><th>Make</th><td>${field('make')}</td><th>Model</th><td>${field('model')}</td></tr>
    <tr><th>Registration</th><td>${field('registration')}</td><th>VIN</th><td>${field('vin')}</td></tr>
    <tr><th>Engine No.</th><td>${field('engine')}</td><th>Odometer</th><td>${field('odometer')}</td></tr></table>
    <h2>Inspection Results</h2><table><thead><tr><th>Section</th><th>Line Item</th><th>Status</th><th>Comment</th><th>Photo Evidence</th></tr></thead><tbody>${rows}</tbody></table>
    <h2>Comments</h2><p>${field('comments').replace(/\n/g,'<br>')}</p>
    <h2>Conclusion / Recommendation</h2><p>${field('conclusion').replace(/\n/g,'<br>')}</p>
    <h2>Digital Signature</h2><img style="max-width:320px;border:1px solid #999" src="${document.getElementById('signaturePad').toDataURL()}" />`;
}

function generateReport(){
  if(!validateInspection()) return;
  buildReport();
  const report = document.getElementById('report');
  report.style.display = 'block';
  const opt = { margin: 8, filename: `${field('inspectionNo')}_Tradeback_Report.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
  html2pdf().set(opt).from(report).save().then(() => report.style.display = 'none');
}

function saveDraft(){
  const fields = ['inspectionNo','inspectionDate','inspector','inspectorEmail','customer','make','model','registration','vin','engine','odometer','location','comments','conclusion'];
  const draft = { state, signature: document.getElementById('signaturePad').toDataURL(), fields: {} };
  fields.forEach(id => draft.fields[id] = field(id));
  localStorage.setItem('tradebackProDraft', JSON.stringify(draft));
  alert('Draft saved on this device.');
}
function loadDraft(){
  const draft = JSON.parse(localStorage.getItem('tradebackProDraft') || 'null');
  if(!draft) return alert('No saved draft found on this device.');
  Object.entries(draft.fields).forEach(([id,v]) => document.getElementById(id).value = v);
  state = draft.state;
  renderChecklist();
  Object.entries(state.items).forEach(([id,i]) => {
    const row = document.getElementById(`row_${id}`);
    row.querySelector('select').value = i.status;
    row.querySelector('textarea').value = i.comment || '';
    row.classList.toggle('failed', i.status === 'Failed');
    if(i.photo){ const img = document.getElementById(`photo_${id}`); img.src = i.photo; img.style.display='block'; }
  });
  restoreSignature(draft.signature);
}
function resetInspection(){ if(confirm('Start a new inspection and clear current entries?')) location.reload(); }

let signaturePadHasInk = false;
function initSignature(){
  const canvas = document.getElementById('signaturePad');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  const pos = e => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: (touch.clientX - rect.left) * (canvas.width / rect.width), y: (touch.clientY - rect.top) * (canvas.height / rect.height) };
  };
  const start = e => { drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); e.preventDefault(); };
  const move = e => { if(!drawing) return; const p = pos(e); ctx.lineWidth = 2; ctx.lineCap='round'; ctx.lineTo(p.x,p.y); ctx.stroke(); signaturePadHasInk = true; e.preventDefault(); };
  const end = () => drawing = false;
  canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start); canvas.addEventListener('touchmove', move); canvas.addEventListener('touchend', end);
}
function clearSignature(){ const c=document.getElementById('signaturePad'); c.getContext('2d').clearRect(0,0,c.width,c.height); signaturePadHasInk=false; }
function restoreSignature(dataUrl){ const img=new Image(); img.onload=()=>{ const c=document.getElementById('signaturePad'); c.getContext('2d').drawImage(img,0,0); signaturePadHasInk=true; }; img.src=dataUrl; }

init();
