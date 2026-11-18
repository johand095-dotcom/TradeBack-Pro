/* ELT PDI — Sales Admin workshop sequencing. Uses LIVE Supabase RPC. */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
const canManage=()=>{
 const profile=typeof pdiUserProfile!=='undefined'?pdiUserProfile:null;
 return profile?.is_active===true&&(profile.is_admin===true||
  (Array.isArray(profile.roles)?profile.roles:[]).some(role=>String(role).trim().toLowerCase()==='sales admin'));
};
const activeSold=()=>{
 const cases=typeof pdiCases!=='undefined'?pdiCases:[];
 return cases.filter(c=>c.stock_classification==='Sold'&&c.received_at&&
 !['Completed','Archived','Deleted'].includes(c.workflow_status)&&Number(c.current_step||0)<22);
};
function textCell(tr,value){
 const td=document.createElement('td');td.textContent=value==null?'—':String(value);tr.append(td);return td;
}
function render(){
 const tbody=byId('pdiSalesSequenceBody');if(!tbody)return;
 const list=activeSold().sort((a,b)=>{
  const ar=Number(a.sales_priority_sequence)||Number.MAX_SAFE_INTEGER;
  const br=Number(b.sales_priority_sequence)||Number.MAX_SAFE_INTEGER;
  return ar-br||String(a.stock_no||'').localeCompare(String(b.stock_no||''))||Number(a.id)-Number(b.id);
 });
 tbody.replaceChildren();
 const msg=byId('pdiSequenceMessage');
 if(msg)msg.textContent=list.length+' active sold vehicles · '+list.filter(c=>c.sales_priority_sequence).length+' sequenced · '+list.filter(c=>!c.sales_priority_sequence).length+' awaiting sequence'+(canManage()?' · Sales Admin editing enabled':' · Read-only workshop view');
 if(!list.length){
  const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=7;td.textContent='No active received sold vehicles.';tr.append(td);tbody.append(tr);return;
 }
 for(const item of list){
  const tr=document.createElement('tr');
  const seq=textCell(tr,item.sales_priority_sequence?'#'+item.sales_priority_sequence:'Not assigned');
  if(item.sales_priority_sequence){seq.style.fontWeight='800';seq.style.color='#174a72';}
  textCell(tr,item.stock_no);textCell(tr,item.vin);textCell(tr,[item.make,item.model].filter(Boolean).join(' '));
  textCell(tr,item.allocated_customer);textCell(tr,item.current_step);
  const action=document.createElement('td');
  if(canManage()){
   const select=document.createElement('select');select.setAttribute('aria-label','Workshop sequence for '+(item.vin||item.stock_no||item.id));
   select.style.cssText='padding:8px;max-width:180px;margin-right:8px';
   select.add(new Option('Unassigned',''));
   for(let n=1;n<=list.length;n++)select.add(new Option('Position '+n,String(n)));
   select.value=item.sales_priority_sequence?String(item.sales_priority_sequence):'';
   const save=document.createElement('button');save.type='button';save.className='secondary-button';save.textContent='Save';
   save.addEventListener('click',async()=>{
    const position=select.value?Number(select.value):null;
    if(position===Number(item.sales_priority_sequence||0)||(position===null&&!item.sales_priority_sequence))return;
    if(!confirm('Update workshop sequence for '+(item.vin||item.stock_no)+' to '+(position?'position '+position:'Unassigned')+'? Other vehicle positions will adjust automatically.'))return;
    save.disabled=true;select.disabled=true;
    try{
     const {error}=await supabaseClient.rpc('pdi_set_sales_priority',{p_case_id:item.id,p_position:position});
     if(error)throw error;
     await loadPdiCases();
     render();
    }catch(error){alert('Unable to update sequence: '+error.message);}
    finally{save.disabled=false;select.disabled=false;}
   });
   action.append(select,save);
  }else action.textContent='Workshop view';
  tr.append(action);tbody.append(tr);
 }
}
function install(){
 if(typeof loadPdiCases!=='function'){return;}
 const original=loadPdiCases;
 loadPdiCases=async function(...args){const result=await original.apply(this,args);render();return result;};
 const toggle=byId('pdiSequenceToggle'),content=byId('pdiSequenceContent');
 if(toggle&&content)toggle.addEventListener('click',()=>{
   const opening=content.hidden;
   content.hidden=!opening;
   toggle.setAttribute('aria-expanded',String(opening));
   toggle.textContent=opening?'Hide Sequence ▲':'Show Sequence ▼';
 });
 byId('pdiSequenceRefresh')?.addEventListener('click',async()=>{await loadPdiCases();});
 render();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
else install();
})();
