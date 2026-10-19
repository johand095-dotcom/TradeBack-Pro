/* ELT PDI — controlled stocktake bulk import. Test on development branch first. */
(function(){
'use strict';
let items=[],busy=false,singleTestPassed=false;
const $=id=>document.getElementById(id);
const trim=x=>String(x??'').trim();
const vin=x=>trim(x).toUpperCase().replace(/\s+/g,'');
const empty=x=>!trim(x)||/^(no\s*record|n\/?a)$/i.test(trim(x));
const admin=()=>typeof pdiUserProfile!=='undefined'&&pdiUserProfile?.is_admin===true&&pdiUserProfile?.is_active===true;
const escape=x=>trim(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const say=(s,bad=false)=>{const m=$('bulkPdiMessage');if(m){m.textContent=s;m.style.color=bad?'#b91c1c':'#16446a';}};
function setup(){
 if($('bulkPdiSection'))return;
 const anchor=$('preArrivalOrderSection')||$('awaitingArrivalSection');if(!anchor)return;
 const section=document.createElement('section');section.id='bulkPdiSection';section.className='card';
 section.style.cssText='display:none;margin:16px 0;padding:20px;border:1px solid #dbe3ed;border-radius:16px;background:white';
 section.innerHTML='<h2>Bulk Stocktake Import — Allocations <small style="font-size:12px">Administrator only</small></h2>'+
 '<p>For vehicles physically on site. Imports make, model, classification, salesperson and customer from the six-column stocktake sheet. Creates PDI records as <b>Received / In Progress</b> with a unique RCV tracking number, without generating Receiving inspections.</p>'+
 '<input id="bulkPdiFile" type="file" accept=".xlsx,.xls" aria-label="Choose Excel stocktake file">'+
 '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0"><button id="bulkPdiPreview" type="button">Validate & Preview</button>'+
 '<button id="bulkPdiSingle" type="button" disabled>Import Selected Test Vehicle</button>'+ 
 '<button id="bulkPdiImport" type="button" disabled>Import Remaining Eligible Vehicles</button>'+
 '<button id="bulkPdiExport" type="button" disabled>Download Results CSV</button></div>'+
 '<label><input type="checkbox" id="bulkPdiApprove"> I have reviewed the eligible vehicles and approve this import.</label>'+
 '<p id="bulkPdiMessage" role="status"></p><p id="bulkPdiSummary" style="font-weight:bold"></p>'+
 '<div style="max-height:400px;overflow:auto"><table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr><th>Test</th><th>Row</th><th>VIN</th><th>Make / Model</th><th>Classification</th><th>Salesperson</th><th>Customer</th><th>Result</th></tr></thead><tbody id="bulkPdiRows"></tbody></table></div>'+
 '<p style="font-size:12px;color:#64748b">VINs already present in PDI are skipped; VINs with existing Receiving records are rejected by the server. A stocktake import does not certify an inspection or establish the actual vehicle arrival date.</p>';
 anchor.insertAdjacentElement('beforebegin',section);
 $('bulkPdiPreview').onclick=preview;$('bulkPdiSingle').onclick=importSingle;$('bulkPdiImport').onclick=importRows;$('bulkPdiExport').onclick=exportCsv;
 $('bulkPdiApprove').onchange=refreshButton;
 $('bulkPdiFile').onchange=()=>{singleTestPassed=false;items=[];$('bulkPdiApprove').checked=false;$('bulkPdiExport').disabled=true;draw();};
 const visibility=()=>{section.style.display=admin()?'block':'none';};
 visibility();setInterval(visibility,2000);
}
function refreshButton(){
 const ready=!busy&&admin()&&$('bulkPdiApprove').checked&&items.some(x=>x.status==='Eligible');
 $('bulkPdiSingle').disabled=!ready;
 $('bulkPdiImport').disabled=!ready||!singleTestPassed;
}
function draw(){
 $('bulkPdiRows').innerHTML=items.map(x=>'<tr style="border-top:1px solid #ddd"><td>'+(x.status==='Eligible'?'<input type="radio" name="bulkPdiTestChoice" value="'+x.row+'" aria-label="Select row '+x.row+' for test">':'')+'</td><td>'+x.row+'</td><td>'+escape(x.vin)+'</td><td>'+escape(x.make+' / '+x.model)+'</td><td>'+escape(x.classification)+'</td><td>'+escape(x.salesperson)+'</td><td>'+escape(x.customer)+'</td><td>'+escape(x.status)+'</td></tr>').join('');
 const counts={};items.forEach(x=>counts[x.status]=(counts[x.status]||0)+1);
 $('bulkPdiSummary').textContent=items.length?'Total '+items.length+' | '+Object.entries(counts).map(([k,v])=>k+': '+v).join(' | '):'';
 refreshButton();
}
async function allCases(){
 const all=[];for(let offset=0;offset<=20000;offset+=500){
  const {data,error}=await supabaseClient.from('pdi_cases').select('id,vin').range(offset,offset+499);
  if(error)throw error;all.push(...(data||[]));if(!data||data.length<500)return all;
 }
 throw new Error('PDI index exceeds safe preview limit.');
}
async function preview(){
 if(!admin()){say('Administrator access required.',true);return;}
 const file=$('bulkPdiFile').files[0];if(!file){say('Choose the Excel file first.',true);return;}
 busy=true;singleTestPassed=false;items=[];draw();$('bulkPdiApprove').checked=false;
 try{
  if(typeof XLSX==='undefined')throw new Error('Excel reader unavailable. Reload the page.');
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
  const matrix=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false});
  const headings=(matrix[0]||[]).map(x=>trim(x).toUpperCase().replace(/\s+/g,' '));
  const column=(...names)=>headings.findIndex(h=>names.includes(h));
  const vinCol=column('VIN NUMBER','VIN','CHASSIS NUMBER');
  const makeCol=column('MAKE'),modelCol=column('MODEL');
  const salesCol=column('SALESPERSON','SALES PERSON');
  const classCol=column('STATUS','STOCK CLASSIFICATION','CLASSIFICATION');
  const customerCol=column('CUSTOMER NAME','CUSTOMER');
  if([vinCol,makeCol,modelCol,salesCol,classCol,customerCol].some(x=>x<0))
    throw new Error('Required columns: MAKE, MODEL, VIN NUMBER, SALESPERSON, Status, CUSTOMER NAME.');
  const seen=new Set();
  items=matrix.slice(1).map((cells,i)=>{
   const v=vin(cells[vinCol]),make=trim(cells[makeCol]),model=trim(cells[modelCol]);
   const rawSalesperson=trim(cells[salesCol]),customer=trim(cells[customerCol]);
   const rawClass=trim(cells[classCol]).toLowerCase();
   const classification=({'stock':'Stock','sold':'Sold','allocated':'Allocated','consignment stock':'Consignment Stock'})[rawClass]||'';
   const salesperson=['Stock','Consignment Stock'].includes(classification)?'':rawSalesperson;
   if(!v&&!make&&!model&&!classification&&!rawSalesperson&&!customer)return null;
   let status='Eligible';
   if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(v))status='Review: invalid VIN';
   else if(seen.has(v))status='Review: duplicate in file';
   else if(!make||!model)status='Review: missing make/model';
   else if(!classification)status='Review: unknown classification';
   else if(['Sold','Allocated'].includes(classification)&&!customer)status='Review: customer required';
   else if(['Sold','Allocated'].includes(classification)&&!salesperson)status='Review: salesperson required';
   else if(['Stock','Consignment Stock'].includes(classification)&&customer)status='Review: unexpected customer on stock';
   seen.add(v);
   return {row:i+2,vin:v,make,model,salesperson,classification,customer,receiving:'',pdi:'',status};
  }).filter(Boolean);
  const known=new Map((await allCases()).filter(x=>x.vin).map(x=>[vin(x.vin),x.id]));
  items.forEach(x=>{if(known.has(x.vin))x.status='Skip: existing PDI case '+known.get(x.vin);});
  // Restore the completed single-vehicle test from the durable server-side audit.
  // This must be checked against the VINs in the uploaded sheet; local browser state is not trusted.
  const {data:verified,error:verifyError}=await supabaseClient.rpc('has_stocktake_allocated_test',{p_vins:items.map(x=>x.vin)});
  if(verifyError){singleTestPassed=false;draw();say('Preview complete, but prior test could not be verified: '+verifyError.message+'. Remaining import remains locked.',true);return;}
  singleTestPassed=verified===true;
  draw();say(singleTestPassed?'Preview complete. Previous test import verified against audit. You may approve and import the remaining eligible vehicles.':'Preview complete. No verified test import found for this file; remaining import remains locked.');
 }catch(e){items=[];draw();say('Preview failed: '+e.message,true);}
 finally{busy=false;refreshButton();}
}
async function importSingle(){
 if(!admin()||!$('bulkPdiApprove').checked||busy)return;
 const selected=document.querySelector('input[name="bulkPdiTestChoice"]:checked');
 if(!selected){say('Select one eligible vehicle using the Test radio button in its row.',true);return;}
 const row=items.find(x=>String(x.row)===selected.value&&x.status==='Eligible');
 if(!row){say('Selected vehicle is no longer eligible. Validate again.',true);return;}
 await importSelected([row],true);
}
async function importRows(){
 if(!admin()||!$('bulkPdiApprove').checked||busy)return;
 const eligible=items.filter(x=>x.status==='Eligible');
 if(!singleTestPassed){say('First import and verify one test vehicle before using the bulk import.',true);return;}
 if(!eligible.length)return;
 await importSelected(eligible,false);
}
async function importSelected(eligible,isTest){
 if(!eligible.length||!admin()||busy||!$('bulkPdiApprove').checked)return;
 const message=isTest?'TEST IMPORT: create only VIN '+eligible[0].vin+' as Received / In Progress with a new RCV number? This creates a real PDI record.':'BULK IMPORT: create '+eligible.length+' remaining PDI records with unique RCV numbers?';
 if(!confirm(message))return;
 busy=true;refreshButton();$('bulkPdiPreview').disabled=true;
 try{
  const known=new Set((await allCases()).filter(x=>x.vin).map(x=>vin(x.vin)));
  for(const x of eligible){
   if(known.has(x.vin)){x.status='Skipped: VIN exists';draw();continue;}
   const {data:check,error:checkError}=await supabaseClient.from('pdi_cases').select('id').ilike('vin',x.vin).limit(1);
   if(checkError){x.status='Error: '+checkError.message;draw();continue;}
   if(check?.length){x.status='Skipped: PDI case '+check[0].id;known.add(x.vin);draw();continue;}
   const {data,error}=await supabaseClient.rpc('import_stocktake_pdi_allocated',{p_vin:x.vin,p_make:x.make,p_model:x.model,p_classification:x.classification,p_salesperson_name:x.salesperson||null,p_customer:x.customer||null});
   const result=Array.isArray(data)?data[0]:data;
   x.status=error?'Error: '+error.message:(result?.outcome==='Imported'?'Imported: '+result.rcv_number+' / PDI case '+result.pdi_case_id:'Skipped: '+(result?.outcome||'Existing VIN')+' / PDI case '+(result?.pdi_case_id||'?'));
   x.allocatedRcv=result?.rcv_number||'';
   if(!error)known.add(x.vin);
   draw();
  }
  if(isTest){
   singleTestPassed=eligible[0].status.startsWith('Imported:');
   say(singleTestPassed?'Test vehicle imported. Verify the allocated RCV and PDI case in the dashboard BEFORE importing the remaining vehicles.':'Test vehicle not imported. Review the error and do not proceed.',!singleTestPassed);
  }else say('Bulk import finished. Download the results CSV and review skipped or failed rows.');
  $('bulkPdiExport').disabled=false;
  if(typeof loadPdiCases==='function')await loadPdiCases();
 }catch(e){say('Import interrupted: '+e.message+'. Check results before retrying.',true);}
 finally{busy=false;$('bulkPdiPreview').disabled=false;draw();}
}
function exportCsv(){
 const records=[['Excel Row','VIN','Make','Model','Classification','Salesperson','Customer','Allocated RCV','Result'],...items.map(x=>[x.row,x.vin,x.make,x.model,x.classification,x.salesperson,x.customer,x.allocatedRcv||'',x.status])];
 const csv=records.map(r=>r.map(v=>'"'+trim(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='ELT-PDI-Stocktake-'+new Date().toISOString().slice(0,10)+'.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();