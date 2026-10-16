/* ELT PDI — controlled stocktake bulk import. Test on development branch first. */
(function(){
'use strict';
let items=[],busy=false;
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
 section.innerHTML='<h2>Bulk Stocktake Import <small style="font-size:12px">Administrator only</small></h2>'+
 '<p>For vehicles physically on site. Creates PDI records as <b>Received / In Progress</b>, without generating Receiving inspections.</p>'+
 '<input id="bulkPdiFile" type="file" accept=".xlsx,.xls" aria-label="Choose Excel stocktake file">'+
 '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0"><button id="bulkPdiPreview" type="button">Validate & Preview</button>'+
 '<button id="bulkPdiImport" type="button" disabled>Import Eligible Vehicles</button>'+
 '<button id="bulkPdiExport" type="button" disabled>Download Results CSV</button></div>'+
 '<label><input type="checkbox" id="bulkPdiApprove"> I have reviewed the eligible vehicles and approve this import.</label>'+
 '<p id="bulkPdiMessage" role="status"></p><p id="bulkPdiSummary" style="font-weight:bold"></p>'+
 '<div style="max-height:400px;overflow:auto"><table style="width:100%;font-size:12px;border-collapse:collapse"><thead><tr><th>Row</th><th>VIN</th><th>Receiving</th><th>PDI</th><th>Result</th></tr></thead><tbody id="bulkPdiRows"></tbody></table></div>'+
 '<p style="font-size:12px;color:#64748b">Rows with existing Receiving/PDI references require manual review. A stocktake import does not certify an inspection or establish the actual vehicle arrival date.</p>';
 anchor.insertAdjacentElement('beforebegin',section);
 $('bulkPdiPreview').onclick=preview;$('bulkPdiImport').onclick=importRows;$('bulkPdiExport').onclick=exportCsv;
 $('bulkPdiApprove').onchange=refreshButton;
 $('bulkPdiFile').onchange=()=>{items=[];$('bulkPdiApprove').checked=false;$('bulkPdiExport').disabled=true;draw();};
 const visibility=()=>{section.style.display=admin()?'block':'none';};
 visibility();setInterval(visibility,2000);
}
function refreshButton(){
 $('bulkPdiImport').disabled=busy||!admin()||!$('bulkPdiApprove').checked||!items.some(x=>x.status==='Eligible');
}
function draw(){
 $('bulkPdiRows').innerHTML=items.map(x=>'<tr style="border-top:1px solid #ddd"><td>'+x.row+'</td><td>'+escape(x.vin)+'</td><td>'+escape(x.receiving)+'</td><td>'+escape(x.pdi)+'</td><td>'+escape(x.status)+'</td></tr>').join('');
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
 busy=true;items=[];draw();$('bulkPdiApprove').checked=false;
 try{
  if(typeof XLSX==='undefined')throw new Error('Excel reader unavailable. Reload the page.');
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
  const matrix=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:'',raw:false});
  const headings=(matrix[0]||[]).map(vin);
  const vcol=Math.max(0,headings.findIndex(x=>x==='VIN'||x==='CHASSIS NUMBER'));
  const vinCol=headings.some(x=>x==='VIN'||x==='CHASSIS NUMBER')?vcol:1;
  const recCol=headings.indexOf('RECEIVING')>=0?headings.indexOf('RECEIVING'):2;
  const pdiCol=headings.indexOf('PDI')>=0?headings.indexOf('PDI'):3;
  const seen=new Set();
  items=matrix.slice(1).map((cells,i)=>{
   const v=vin(cells[vinCol]),receiving=trim(cells[recCol]),pdi=trim(cells[pdiCol]);
   if(!v&&!receiving&&!pdi)return null;
   let status='Eligible';
   if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(v))status='Review: invalid VIN';
   else if(seen.has(v))status='Review: duplicate in file';
   else if(!empty(pdi))status='Review: PDI reference';
   else if(!empty(receiving))status='Review: Receiving reference';
   seen.add(v);return {row:i+2,vin:v,receiving,pdi,status};
  }).filter(Boolean);
  const known=new Map((await allCases()).filter(x=>x.vin).map(x=>[vin(x.vin),x.id]));
  items.forEach(x=>{if(known.has(x.vin))x.status='Skip: existing PDI case '+known.get(x.vin);});
  draw();say('Preview complete. No database changes made. Review exclusions and approve eligible rows.');
 }catch(e){items=[];draw();say('Preview failed: '+e.message,true);}
 finally{busy=false;refreshButton();}
}
async function importRows(){
 if(!admin()||!$('bulkPdiApprove').checked||busy)return;
 const eligible=items.filter(x=>x.status==='Eligible');
 if(!eligible.length||!confirm('Import '+eligible.length+' missing vehicles into PDI as Received / In Progress?'))return;
 busy=true;refreshButton();$('bulkPdiPreview').disabled=true;
 try{
  const known=new Set((await allCases()).filter(x=>x.vin).map(x=>vin(x.vin)));
  for(const x of eligible){
   if(known.has(x.vin)){x.status='Skipped: VIN exists';draw();continue;}
   const {data:check,error:checkError}=await supabaseClient.from('pdi_cases').select('id').ilike('vin',x.vin).limit(1);
   if(checkError){x.status='Error: '+checkError.message;draw();continue;}
   if(check?.length){x.status='Skipped: PDI case '+check[0].id;known.add(x.vin);draw();continue;}
   const now=new Date().toISOString();
   const {data,error}=await supabaseClient.from('pdi_cases').insert({
    vin:x.vin,receiving_no:null,stock_no:null,order_status:'Received',
    workflow_status:'In Progress',current_phase:1,current_step:1,
    started_at:now,current_step_started_at:now,updated_at:now,
    ordered_at:null,received_at:null
   }).select('id').single();
   x.status=error?'Error: '+error.message:'Imported: PDI case '+data.id;
   if(!error)known.add(x.vin);
   draw();
  }
  say('Import finished. Download the results CSV and review skipped or failed rows.');
  $('bulkPdiExport').disabled=false;
  if(typeof loadPdiCases==='function')await loadPdiCases();
 }catch(e){say('Import interrupted: '+e.message+'. Check results before retrying.',true);}
 finally{busy=false;$('bulkPdiPreview').disabled=false;draw();}
}
function exportCsv(){
 const records=[['Excel Row','VIN','Receiving Reference','PDI Reference','Result'],...items.map(x=>[x.row,x.vin,x.receiving,x.pdi,x.status])];
 const csv=records.map(r=>r.map(v=>'"'+trim(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='ELT-PDI-Stocktake-'+new Date().toISOString().slice(0,10)+'.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();