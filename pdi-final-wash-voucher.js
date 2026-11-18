/* ELT PDI — Sales Controller final wash vouchers. Requires reviewed LIVE SQL migration. */
(function(){
'use strict';
const id=x=>document.getElementById(x);
const db=()=>window.supabaseClient;
const cases=()=>typeof pdiCases!=='undefined'?pdiCases:[];
const profile=()=>typeof pdiUserProfile!=='undefined'?pdiUserProfile:null;
const roles=()=>Array.isArray(profile()?.roles)?profile().roles.map(x=>String(x).toLowerCase().trim()):[];
const allowed=()=>profile()?.is_active===true&&(profile()?.is_admin===true||roles().includes('sales controller'));
const message=(s,bad=false)=>{const e=id('eltWashStatus');if(e){e.textContent=s;e.style.color=bad?'#b42318':'#176a3a';}};
const label=c=>[c.vin,c.stock_no,c.make,c.model].filter(Boolean).join(' · ');
let saving=false;
async function refreshHistory(){
 const caseId=id('eltWashVin')?.value;
 const box=id('eltWashHistory');if(!box)return;
 box.replaceChildren();
 if(!caseId)return;
 const {data,error}=await db().from('pdi_final_wash_vouchers').select('voucher_number,created_at,notes,message_sent_at').eq('pdi_case_id',Number(caseId)).order('created_at',{ascending:false}).limit(30);
 if(error){box.textContent='Voucher history unavailable: '+error.message;return;}
 if(!data?.length){box.textContent='No final wash vouchers recorded for this vehicle.';return;}
 for(const v of data){const row=document.createElement('p');row.textContent=[v.voucher_number,new Date(v.created_at).toLocaleString(),v.notes||'',v.message_sent_at?'QC notified':'QC notification pending'].filter(Boolean).join(' · ');box.append(row);}
}
async function createVoucher(){
 if(saving)return;
 if(!allowed())return message('Sales Controller access required.',true);
 const caseId=Number(id('eltWashVin')?.value),vehicle=cases().find(c=>Number(c.id)===caseId);
 if(!vehicle)return message('Select a vehicle VIN.',true);
 const notes=id('eltWashNotes').value.trim();
 if(!confirm('Create a final wash voucher for VIN '+vehicle.vin+' and notify Gerhard (QC)?'))return;
 saving=true;id('eltWashCreate').disabled=true;
 try{
  const {data,error}=await db().rpc('pdi_create_final_wash_voucher',{p_case_id:caseId,p_notes:notes||null});
  if(error)throw error;
  const voucher=Array.isArray(data)?data[0]:data;
  if(!voucher?.voucher_number)throw Error('Voucher was not returned by the database.');
  message(voucher.voucher_number+' created and delivered to Gerhard (QC).');
  id('eltWashNotes').value='';
  await refreshHistory();
 }catch(e){message('Voucher not created: '+e.message,true);}
 finally{saving=false;id('eltWashCreate').disabled=false;}
}
function render(){
 const panel=id('eltWashPanel');if(!panel)return;
 panel.hidden=!allowed();if(!allowed())return;
 const select=id('eltWashVin'),old=select.value;
 select.replaceChildren(new Option('Select vehicle by VIN',''));
 for(const c of cases().filter(c=>c.vin&&!['Deleted','Archived'].includes(c.workflow_status)))select.add(new Option(label(c),String(c.id)));
 if(Array.from(select.options).some(o=>o.value===old))select.value=old;
 void refreshHistory();
}
function init(){
 if(id('eltWashPanel'))return;
 const panel=document.createElement('section');panel.id='eltWashPanel';panel.className='card';panel.style.marginBottom='24px';
 panel.innerHTML='<h2>Final Wash Voucher — Sales Controller</h2><p>Select a vehicle by VIN to create a numbered final wash voucher. The voucher is recorded against the vehicle and sent to Gerhard (QC) in My Inbox.</p><label for="eltWashVin">Vehicle VIN</label><select id="eltWashVin" style="display:block;width:100%;padding:10px;margin:8px 0 14px"></select><label for="eltWashNotes">Voucher notes (optional)</label><textarea id="eltWashNotes" rows="3" maxlength="2000" style="display:block;width:100%;padding:10px;margin:8px 0 14px"></textarea><button type="button" id="eltWashCreate">Create Final Wash Voucher</button><p id="eltWashStatus" role="status"></p><h3>Vehicle voucher history</h3><div id="eltWashHistory"></div>';
 const anchor=id('pdiSalesSequencePanel')||id('myActions');
 if(anchor?.parentElement)anchor.parentElement.insertBefore(panel,anchor.nextSibling);
 else document.querySelector('main')?.append(panel);
 id('eltWashVin').addEventListener('change',refreshHistory);
 id('eltWashCreate').addEventListener('click',createVoucher);
 if(typeof loadPdiCases==='function'){
  const original=loadPdiCases;
  loadPdiCases=async function(...args){const result=await original.apply(this,args);render();return result;};
 }
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();