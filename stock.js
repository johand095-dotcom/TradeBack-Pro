/* ELT Stock Management — client UI; access enforcement resides in Supabase RPC/storage RLS. */
(() => {
'use strict';
const client=window.supabase.createClient('https://upkmtznkhfbwadofaxno.supabase.co','sb_publishable_Al-SumF_BuGOzzwpIX_yBw_LwGJUYet');
const $=id=>document.getElementById(id);
let records=[],selected=null,session=null;
const safe=v=>v==null?'—':String(v);
const localDate=t=>t?new Date(t).toLocaleDateString('en-ZA',{timeZone:'Africa/Johannesburg'}):'—';
function addCell(tr,v){const td=document.createElement('td');td.textContent=safe(v);tr.append(td);return td;}
function setStatus(message){$('status').textContent=message;}
function priority(r){return r.days_remaining<0?'overdue':r.days_remaining<=7?'critical':r.days_remaining<=15?'warning':'';}
function render(){
 const q=$('search').value.trim().toLowerCase();
 const list=records.filter(r=>[r.vin,r.stock_no,r.floorplan_provider,r.vehicle_range,r.make,r.model].some(v=>String(v||'').toLowerCase().includes(q)));
 const active=list.filter(r=>!r.settled_at),settled=list.filter(r=>r.settled_at);
 const allActive=records.filter(r=>!r.settled_at);
 $('mActive').textContent=allActive.length;
 $('mWarning').textContent=allActive.filter(r=>r.days_remaining>=8&&r.days_remaining<=15).length;
 $('mCritical').textContent=allActive.filter(r=>r.days_remaining<=7).length;
 $('mSettled').textContent=records.filter(r=>r.settled_at).length;
 const alerts=allActive.filter(r=>r.days_remaining<=15).sort((a,b)=>a.days_remaining-b.days_remaining);
 const alertBox=$('alerts');alertBox.replaceChildren();
 if(!alerts.length)alertBox.textContent='No payments due within 15 days.';
 for(const r of alerts){
  const p=document.createElement('p');p.className=priority(r);
  const strong=document.createElement('strong');
  strong.textContent=(r.days_remaining<0?'OVERDUE':r.days_remaining<=7?'CRITICAL':'WARNING')+' — '+safe(r.vin)+' ('+safe(r.floorplan_provider)+')';
  p.append(strong,document.createTextNode(' · '+(r.days_remaining<0?Math.abs(r.days_remaining)+' days overdue':r.days_remaining+' days remaining')+' · Due '+safe(r.due_date)));
  alertBox.append(p);
 }
 const tbody=$('activeBody');tbody.replaceChildren();
 if(!active.length){const tr=document.createElement('tr');const td=addCell(tr,'No active floorplans match the search.');td.colSpan=8;tbody.append(tr);}
 for(const r of active.sort((a,b)=>a.days_remaining-b.days_remaining)){
  const tr=document.createElement('tr');tr.className=priority(r);
  addCell(tr,safe(r.vin)+' / '+safe(r.stock_no));
  addCell(tr,[r.make,r.model].filter(Boolean).join(' '));
  addCell(tr,r.tradeback_option);
  addCell(tr,r.floorplan_provider+' / '+r.vehicle_range);
  addCell(tr,localDate(r.received_at));addCell(tr,r.due_date);
  const days=addCell(tr,r.days_remaining<0?Math.abs(r.days_remaining)+' overdue':r.days_remaining+' remaining');days.className='pill';
  const td=document.createElement('td'),btn=document.createElement('button');btn.textContent='Mark Paid';btn.addEventListener('click',()=>{selected=r;$('settlementVin').textContent=safe(r.vin)+' · '+r.floorplan_provider+' · Due '+r.due_date;$('settlementDialog').showModal();});td.append(btn);tr.append(td);tbody.append(tr);
 }
 const archive=$('settledBody');archive.replaceChildren();
 for(const r of settled.sort((a,b)=>new Date(b.settled_at)-new Date(a.settled_at))){
  const tr=document.createElement('tr');addCell(tr,safe(r.vin)+' / '+safe(r.stock_no));addCell(tr,r.floorplan_provider+' / '+r.vehicle_range);addCell(tr,r.due_date);addCell(tr,localDate(r.settled_at));
  const td=document.createElement('td'),btn=document.createElement('button');btn.textContent='View Document';
  btn.addEventListener('click',async()=>{const {data,error}=await client.storage.from('stock-settlement-docs').createSignedUrl(r.document_path,120);if(error){alert(error.message);return;}window.open(data.signedUrl,'_blank','noopener');});
  td.append(btn);tr.append(td);archive.append(tr);
 }
}
async function refresh(){
 setStatus('Loading stock records...');
 const {data,error}=await client.rpc('stock_floorplan_register');
 if(error){setStatus('Could not load floorplan records: '+error.message);return;}
 records=data||[];setStatus(records.length+' floorplan records loaded.');render();
}
function previewAlert(){
 const days=Number($('alertTestDays').value);
 const state=days<0?'OVERDUE':days<=7?'CRITICAL':days<=15?'WARNING':'NORMAL';
 const description=days<0?Math.abs(days)+' days overdue':days===0?'Payment due today':days+' days remaining';
 const node=$('alertTestResult');
 node.textContent='TEST ONLY — '+state+' · '+description;
 node.style.cssText='padding:14px;border-radius:8px;font-weight:700;background:'+(days<=7?'#ffe5e5':days<=15?'#fff1d9':'#e5f3ed');
}
$('runAlertTest').addEventListener('click',previewAlert);
async function start(){
 const {data:{session:current}}=await client.auth.getSession();session=current;
 if(!session){$('accessText').textContent='Please sign in through PDI Operations first.';return;}
 const {data:allowed,error}=await client.rpc('stock_access_allowed');
 if(error||allowed!==true){$('accessText').textContent='Access restricted to Sales Admin, authorised management accounts and full administrators.';return;}
 // Read-only simulator: visible to users already authorised by the stock_access_allowed RPC.
 // This avoids depending on a client-side profile role lookup with inconsistent role shapes.
 $('alertTestPanel').hidden=false;
 $('accessPanel').hidden=true;$('stockApp').hidden=false;
 await refresh();
}
$('refresh').addEventListener('click',refresh);$('search').addEventListener('input',render);
$('cancelSettlement').addEventListener('click',()=>$('settlementDialog').close());
$('signOut').addEventListener('click',async()=>{await client.auth.signOut();location.href='pdi.html';});
$('settlementForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!selected)return;
 const file=$('settlementFile').files[0];if(!file)return;
 if(file.size>15728640){alert('Document must be 15 MB or smaller.');return;}
 if(!['application/pdf','image/jpeg','image/png'].includes(file.type)){alert('Only PDF, JPG and PNG documents are allowed.');return;}
 if(!confirm('Confirm that the floorplan is fully settled for '+selected.vin+'? The vehicle will move to the settled archive.'))return;
 const button=$('confirmSettlement');button.disabled=true;button.textContent='Uploading document...';
 const path=session.user.id+'/'+selected.pdi_case_id+'/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
 try{
  const {error:uploadError}=await client.storage.from('stock-settlement-docs').upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError)throw uploadError;
  const {error:rpcError}=await client.rpc('stock_mark_settled',{p_case_id:selected.pdi_case_id,p_document_path:path,p_document_name:file.name,p_remarks:$('settlementRemarks').value.trim()||null});
  if(rpcError)throw rpcError;
  $('settlementDialog').close();$('settlementForm').reset();selected=null;await refresh();
 }catch(error){alert('Settlement not saved: '+error.message+'\nIf the document uploaded, please retry only after checking the archive.');}
 finally{button.disabled=false;button.textContent='Mark Paid & Archive';}
});
void start();
})();