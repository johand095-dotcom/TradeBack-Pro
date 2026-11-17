/* ELT Vehicle Suite - Receiving / PDI Waiting Orders integration */
let receivingWaitingOrders=[];
let receivingAllPdiCases=[];
let receivingSelectedPdiCaseId=null;
let receivingManualVehicleMode=false;

function normaliseReceivingVin(v){return String(v||'').trim().toUpperCase().replace(/\s+/g,'');}

function setReceivingVehicleSourceMessage(message,type='info'){
  const el=document.getElementById('receivingVehicleSourceMessage');
  if(!el)return;
  el.textContent=message||'';
  el.style.color=({info:'#475569',success:'#157347',warning:'#9a6700',error:'#b42318'})[type]||'#475569';
}

/* Vehicle identity fields must remain editable even when populated from Waiting Orders. */
function setReceivingCoreVehicleFieldsLocked(){
  ['receivingSupplier','stockNumber','receivingMake','receivingModel','receivingVin'].forEach(id=>{
    const el=document.getElementById(id); if(!el)return;
    el.readOnly=false;
    el.disabled=false;
    el.style.background='';
  });
}

async function loadReceivingPdiVehicleIndex(){
  // Supabase REST returns a maximum page size. Load all pages so recently ordered
  // vehicles cannot disappear behind older records.
  const fields='id,receiving_no,stock_no,vin,make,model,oem_supplier,order_status,order_reference,oem_eta,stock_classification,allocated_customer,ordered_at,received_at,workflow_status,current_phase,current_step';
  const all=[];const pageSize=500;
  try{
    for(let offset=0;offset<10000;offset+=pageSize){
      const {data,error}=await supabaseClient.from('pdi_cases').select(fields)
        .order('id',{ascending:false}).range(offset,offset+pageSize-1);
      if(error)throw error;
      all.push(...(data||[]));
      if(!data||data.length<pageSize)break;
      if(offset+pageSize>=10000)throw new Error('Vehicle index exceeds safety limit; contact administrator.');
    }
  }catch(error){
    console.error('Could not load PDI vehicle index:',error);
    setReceivingVehicleSourceMessage('Waiting Orders could not be loaded: '+error.message+'. Do not use Manual Receiving to bypass an existing order.','error');
    return false;
  }
  receivingAllPdiCases=all;
  // Match the PDI Awaiting Vehicle Arrival register exactly.
  receivingWaitingOrders=all.filter(x=>x.ordered_at&&x.order_status==='Awaiting Arrival'&&!x.received_at);
  renderReceivingWaitingOrderSelector();
  renderReceivingWaitingOrderMatches();
  setReceivingCoreVehicleFieldsLocked();
  return true;
}

function receivingWaitingOrderLabel(x){const vehicle=[x.make,x.model].filter(Boolean).join(' ');const vin=x.vin||'VIN not captured';const ref=x.order_reference?`PO ${x.order_reference}`:'No PO';const customer=x.allocated_customer?` · ${x.allocated_customer}`:'';return `${vin} · ${vehicle||'Vehicle'} · ${ref}${customer}`;}

function receivingSearchMatches(){
  const query=(document.getElementById('receivingWaitingOrderSearch')?.value||'').trim().toLowerCase();
  if(!query)return [];
  const words=query.split(/\\s+/).filter(Boolean);
  return receivingWaitingOrders.filter(x=>{
    const haystack=[x.vin,x.stock_no,x.make,x.model,x.oem_supplier,x.order_reference,x.allocated_customer,x.stock_classification].join(' ').toLowerCase();
    return words.every(w=>haystack.includes(w));
  }).sort((a,b)=>{
    const av=normaliseReceivingVin(a.vin),bv=normaliseReceivingVin(b.vin),n=normaliseReceivingVin(query);
    return (bv===n?1:0)-(av===n?1:0)|| (bv.startsWith(n)?1:0)-(av.startsWith(n)?1:0)||
      new Date(b.ordered_at||0)-new Date(a.ordered_at||0);
  });
}

function renderReceivingWaitingOrderSelector(){
  const select=document.getElementById('receivingWaitingOrderSelect');
  const count=document.getElementById('receivingWaitingOrderCount');
  const search=document.getElementById('receivingWaitingOrderSearch');
  const query=search?.value.trim()||'';
  const matches=query?receivingSearchMatches():receivingWaitingOrders;
  if(count)count.textContent=query?
    `${matches.length} matching vehicle${matches.length===1?'':'s'} · ${receivingWaitingOrders.length} awaiting arrival`:
    `${receivingWaitingOrders.length} vehicles awaiting arrival · Search to select`;
  if(!select)return;
  const selected=String(receivingSelectedPdiCaseId||'');
  select.replaceChildren(new Option(query?'Select a matching Waiting Order...':'Search first, or select a Waiting Order...',''));
  // Keep selected order available even when the search changes.
  const shown=matches.slice(0,150);
  const selectedOrder=receivingWaitingOrders.find(x=>String(x.id)===selected);
  if(selectedOrder&&!shown.some(x=>String(x.id)===selected))shown.unshift(selectedOrder);
  for(const item of shown)select.add(new Option(receivingWaitingOrderLabel(item),String(item.id)));
  if(selectedOrder)select.value=selected;
}

function renderReceivingWaitingOrderMatches(){
  const results=document.getElementById('receivingWaitingOrderResults');
  if(!results)return;
  results.replaceChildren();
  const query=document.getElementById('receivingWaitingOrderSearch')?.value.trim();
  if(!query){
    results.textContent='Type part of a VIN, stock number, customer, make or model to see matching orders. You can also use the dropdown.';
    return;
  }
  const matches=receivingSearchMatches();
  if(!matches.length){
    results.textContent='No matching awaiting orders. Check the spelling or click Refresh Waiting Orders. Manual Receiving is only for genuinely unplanned arrivals.';
    return;
  }
  const heading=document.createElement('div');
  heading.textContent=`Found ${matches.length} matching order${matches.length===1?'':'s'}. Click the correct vehicle below to select it.`;
  heading.style.cssText='font-weight:700;margin:8px 0';
  results.append(heading);
  for(const item of matches.slice(0,30)){
    const button=document.createElement('button');
    button.type='button';button.className='ghost';
    button.style.cssText='display:block;text-align:left;width:100%;margin:6px 0;padding:12px;border:1px solid #cbd5e1;border-radius:9px;white-space:normal;background:#fff;color:#123451;cursor:pointer';
    if(String(item.id)===String(receivingSelectedPdiCaseId)){
      button.style.borderColor='#16803a';button.style.background='#ecfdf3';
    }
    const primary=document.createElement('strong');
    primary.textContent=(item.vin||'VIN not captured')+' · '+[item.make,item.model].filter(Boolean).join(' ');
    const secondary=document.createElement('div');
    secondary.style.cssText='font-size:13px;margin-top:4px;color:#52647a';
    secondary.textContent='Stock: '+(item.stock_no||'—')+' · PO: '+(item.order_reference||'—')+
      ' · Customer: '+(item.allocated_customer||'—');
    button.append(primary,secondary);
    button.addEventListener('click',()=>{
      selectReceivingWaitingOrder(String(item.id));
      renderReceivingWaitingOrderSelector();renderReceivingWaitingOrderMatches();
    });
    results.append(button);
  }
  if(matches.length>30){
    const note=document.createElement('p');note.textContent='Showing the first 30 matches. Add more characters to narrow your search.';
    results.append(note);
  }
}

function applyWaitingOrderToReceiving(item,source='selection'){
  if(!item)return;receivingSelectedPdiCaseId=item.id;receivingManualVehicleMode=false;
  const values={receivingSupplier:item.oem_supplier||'',stockNumber:item.stock_no||'',receivingMake:item.make||'',receivingModel:item.model||'',receivingVin:item.vin||'',deliveryReference:item.order_reference||''};
  Object.entries(values).forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.value=value;});
  const select=document.getElementById('receivingWaitingOrderSelect');if(select)select.value=item.id;
  setReceivingCoreVehicleFieldsLocked();
  const search=document.getElementById('receivingWaitingOrderSearch');
  if(search)search.value=item.vin||item.stock_no||'';
  renderReceivingWaitingOrderSelector();
  renderReceivingWaitingOrderMatches();
  const customer=item.allocated_customer?` Allocated customer: ${item.allocated_customer}.`:'';
  setReceivingVehicleSourceMessage(`Linked to Waiting Order.${customer} Existing PDI record will be continued — vehicle details may be corrected if required.`,'success');
  if(source!=='restore'&&typeof saveReceivingDraftSilent==='function')saveReceivingDraftSilent();
}

function selectReceivingWaitingOrder(id){const item=receivingWaitingOrders.find(x=>String(x.id)===String(id));if(!item){receivingSelectedPdiCaseId=null;setReceivingCoreVehicleFieldsLocked();return;}applyWaitingOrderToReceiving(item);}
function findPdiCasesByVin(vin){const n=normaliseReceivingVin(vin);return n?receivingAllPdiCases.filter(x=>normaliseReceivingVin(x.vin)===n):[];}
function findWaitingOrderByVin(vin){const n=normaliseReceivingVin(vin);return n?receivingWaitingOrders.find(x=>normaliseReceivingVin(x.vin)===n)||null:null;}
function findReceivingDuplicateByVin(vin,currentNo=''){const n=normaliseReceivingVin(vin);if(!n)return null;return (receivingCloudRecords||[]).find(r=>normaliseReceivingVin(r?.fields?.receivingVin)===n&&r.receivingNo!==currentNo)||null;}

function getReceivingDuplicateReason(){
  const vin=receivingField('receivingVin');const n=normaliseReceivingVin(vin);if(!n)return null;
  const r=findReceivingDuplicateByVin(vin,receivingField('receivingNo'));if(r)return `VIN ${n} already exists in Receiving as ${r.receivingNo}. Open the existing record instead of creating another vehicle.`;
  const conflict=findPdiCasesByVin(vin).find(x=>String(x.id)!==String(receivingSelectedPdiCaseId));
  if(conflict){if(conflict.order_status==='Awaiting Arrival'&&!conflict.received_at)return `VIN ${n} is already on PDI Waiting Orders. Select that Waiting Order instead of creating the vehicle manually.`;return `VIN ${n} already exists in Vehicle Suite. Duplicate vehicle creation is blocked.`;}
  return null;
}

function handleReceivingVinLookup(){
  const vin=receivingField('receivingVin');if(!vin)return;
  const waiting=findWaitingOrderByVin(vin);if(waiting){applyWaitingOrderToReceiving(waiting,'vin');return;}
  const existing=findPdiCasesByVin(vin);
  if(existing.length&&!existing.some(x=>String(x.id)===String(receivingSelectedPdiCaseId))){receivingManualVehicleMode=false;setReceivingCoreVehicleFieldsLocked();setReceivingVehicleSourceMessage(`VIN ${normaliseReceivingVin(vin)} already exists in Vehicle Suite and is not an available Waiting Order. Duplicate receiving blocked.`,'error');return;}
  if(!receivingManualVehicleMode&&!receivingSelectedPdiCaseId)setReceivingVehicleSourceMessage(`VIN ${normaliseReceivingVin(vin)} was not found on Waiting Orders. If this is a genuine unplanned arrival, choose “Vehicle Not Listed — Manual Receiving”.`,'warning');
}

function enableReceivingManualVehicleMode(){
  const reason=receivingField('receivingVin')?getReceivingDuplicateReason():null;if(reason){alert(reason);setReceivingVehicleSourceMessage(reason,'error');return;}
  if(!confirm('Manual Receiving is only for a vehicle that is NOT already on Waiting Orders or elsewhere in Vehicle Suite.\n\nContinue with manual vehicle entry?'))return;
  receivingSelectedPdiCaseId=null;receivingManualVehicleMode=true;const select=document.getElementById('receivingWaitingOrderSelect');if(select)select.value='';setReceivingCoreVehicleFieldsLocked();setReceivingVehicleSourceMessage('Manual Receiving enabled. Vehicle details are editable and the VIN will still be checked for duplicates before completion.','warning');
}

function insertReceivingWaitingOrdersPanel(){
  if(document.getElementById('receivingWaitingOrderPanel'))return;const details=document.getElementById('receivingDetails');if(!details)return;
  const panel=document.createElement('section');panel.id='receivingWaitingOrderPanel';panel.className='card';
  panel.innerHTML=`<h2>Vehicle Source — Waiting Orders</h2><p class="hint">Select the arriving vehicle from PDI Waiting Orders. Existing order data will populate automatically. Vehicle details remain editable so receiving staff can correct missing or inaccurate information.</p><div class="grid"><label>Search Waiting Orders<input id="receivingWaitingOrderSearch" type="search" placeholder="Search VIN, stock number, vehicle or PO..." autocomplete="off"></label><label>Waiting Vehicle<select id="receivingWaitingOrderSelect"><option value="">Loading Waiting Orders...</option></select></label><div style="align-self:end;padding-bottom:4px"><strong id="receivingWaitingOrderCount">Loading...</strong></div></div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px"><button type="button" id="receivingManualVehicleButton" class="ghost">Vehicle Not Listed — Manual Receiving</button><button type="button" id="receivingRefreshWaitingOrdersButton" class="ghost">Refresh Waiting Orders</button></div><div id="receivingWaitingOrderResults" style="margin-top:12px;max-height:340px;overflow:auto" aria-live="polite"></div><p id="receivingVehicleSourceMessage" style="margin:12px 0 0;font-weight:700"></p>`;
  details.parentNode.insertBefore(panel,details);
  document.getElementById('receivingWaitingOrderSelect')?.addEventListener('change',e=>selectReceivingWaitingOrder(e.target.value));
  document.getElementById('receivingWaitingOrderSearch')?.addEventListener('input',()=>{
    renderReceivingWaitingOrderSelector();renderReceivingWaitingOrderMatches();
  });
  document.getElementById('receivingManualVehicleButton')?.addEventListener('click',enableReceivingManualVehicleMode);
  document.getElementById('receivingRefreshWaitingOrdersButton')?.addEventListener('click',async()=>{const ok=await loadReceivingPdiVehicleIndex();if(ok)setReceivingVehicleSourceMessage('Waiting Orders refreshed.','success');});
  const vin=document.getElementById('receivingVin');vin?.addEventListener('input',()=>{if(normaliseReceivingVin(vin.value).length>=12)handleReceivingVinLookup();});vin?.addEventListener('change',handleReceivingVinLookup);vin?.addEventListener('blur',handleReceivingVinLookup);
  setReceivingCoreVehicleFieldsLocked();
  setReceivingVehicleSourceMessage('Select a vehicle from Waiting Orders, or use Manual Receiving for a genuine unplanned arrival. Vehicle details remain editable.','info');
}

async function updateLinkedPdiCaseFromReceiving(record, options={}){
  if(!record||record.status!=='Completed')throw new Error('Only completed inspections may enter PDI.');
  const f=record.fields||{}, vin=normaliseReceivingVin(f.receivingVin);
  if(!vin)throw new Error('VIN is required before PDI handover.');
  const no=String(record.receivingNo||'').trim();
  if(!no)throw new Error('Receiving number is missing.');
  const {data:byNo,error:noError}=await supabaseClient.from('pdi_cases')
    .select('id,vin,receiving_no,workflow_status,order_status,received_at').eq('receiving_no',no);
  if(noError)throw noError;
  const {data:byVin,error:vinError}=await supabaseClient.from('pdi_cases')
    .select('id,vin,receiving_no,workflow_status,order_status,received_at').ilike('vin',vin);
  if(vinError)throw vinError;
  const matches=byVin||[], linked=byNo?.[0]||null;
  if(linked&&normaliseReceivingVin(linked.vin)!==vin)
    throw new Error('Receiving number '+no+' belongs to a different VIN in PDI. Administrator investigation required.');
  if(matches.length>1)throw new Error('Multiple PDI vehicles share this VIN. Administrator investigation required.');
  const existing=matches[0]||linked;
  if(existing&&linked&&String(existing.id)!==String(linked.id))
    throw new Error('VIN and Receiving number refer to different PDI vehicles. No changes made.');
  if(existing?.receiving_no&&existing.receiving_no!==no)
    throw new Error('This VIN is already linked to Receiving '+existing.receiving_no+'. No changes made.');
  if(receivingSelectedPdiCaseId&&existing&&String(existing.id)!==String(receivingSelectedPdiCaseId))
    throw new Error('Selected Waiting Order conflicts with the existing PDI record.');
  const now=record.completedAt||new Date().toISOString();
  if(existing?.received_at&&existing.receiving_no===no)return true; // safe retry
  const payload={receiving_no:no,stock_no:f.stockNumber||null,vin,make:f.receivingMake||null,
    model:f.receivingModel||null,oem_supplier:f.receivingSupplier||null,received_at:now,
    order_status:'Received',workflow_status:'In Progress',current_phase:1,current_step:1,
    current_step_started_at:now,updated_at:new Date().toISOString()};
  if(existing){
    const {error}=await supabaseClient.from('pdi_cases').update(payload).eq('id',existing.id);
    if(error)throw error;
    receivingSelectedPdiCaseId=existing.id;
  }else{
    if(receivingSelectedPdiCaseId)throw new Error('Selected Waiting Order could not be verified in PDI. Refresh orders and retry.');
    if(!options.administratorRecovery&&!receivingManualVehicleMode&&f.receivingVehicleSource!=='Manual')
      throw new Error('No matching Waiting Order found. Use Manual Receiving for genuinely unplanned arrivals.');
    const {data,error}=await supabaseClient.from('pdi_cases')
      .insert({...payload,order_reference:f.deliveryReference||null,ordered_at:null,started_at:now})
      .select('id').single();
    if(error)throw error;
    receivingSelectedPdiCaseId=data.id;
  }
  await loadReceivingPdiVehicleIndex();
  return true;
}

window.updateLinkedPdiCaseFromReceiving = updateLinkedPdiCaseFromReceiving;

async function recoverCompletedReceivingToPdi(receivingNo){
  const {data:auth}=await supabaseClient.auth.getUser();
  const user=auth?.user;
  if(!user){alert('Please sign in.');return;}
  const {data:profile,error:profileError}=await supabaseClient.from('user_profiles')
    .select('is_admin,is_active,full_name').eq('user_id',user.id).single();
  if(profileError||!profile?.is_admin||!profile?.is_active){
    alert('Only an active administrator may recover a vehicle to PDI.');return;
  }
  const record=getAllReceivingRecords().find(x=>x.receivingNo===receivingNo);
  if(!record||record.status!=='Completed'){
    alert('Only completed Receiving inspections can be recovered.');return;
  }
  const reason=prompt('Reason for exceptional PDI recovery (required):');
  if(!reason||reason.trim().length<10){alert('Please provide a reason of at least 10 characters.');return;}
  if(!confirm('ADMINISTRATOR RECOVERY\\n\\nReceiving: '+receivingNo+
    '\\nVIN: '+(record.fields?.receivingVin||'-')+
    '\\n\\nThis will attempt to link the completed inspection to PDI. Continue?'))return;
  const audit=async(outcome,caseId=null)=>{
    const {error}=await supabaseClient.rpc('log_receiving_pdi_recovery',{
      p_receiving_no:receivingNo,p_vin:normaliseReceivingVin(record.fields?.receivingVin),
      p_pdi_case_id:caseId,p_reason:reason.trim(),p_outcome:outcome
    });
    if(error)throw new Error('Recovery audit unavailable: '+error.message);
  };
  try{await audit('Requested');}catch(error){alert(error.message);return;}
  const priorId=receivingSelectedPdiCaseId,priorManual=receivingManualVehicleMode;
  try{
    receivingSelectedPdiCaseId=record.fields?.receivingPdiCaseId||null;
    receivingManualVehicleMode=record.fields?.receivingVehicleSource==='Manual';
    await updateLinkedPdiCaseFromReceiving(record,{administratorRecovery:true});
    await audit('Succeeded',receivingSelectedPdiCaseId||null);
    alert('PDI link verified or recovered and audited. Please confirm the vehicle in PDI.');
  }catch(error){console.error('PDI recovery failed:',error);try{await audit('Failed: '+String(error?.message||'Unknown error').slice(0,150));}catch(auditError){console.error('Recovery failure audit failed:',auditError);}alert('Recovery stopped: '+(error?.message||'Unknown error'));}
  finally{receivingSelectedPdiCaseId=priorId;receivingManualVehicleMode=priorManual;}
}
window.recoverCompletedReceivingToPdi=recoverCompletedReceivingToPdi;

function initialiseReceivingWaitingOrderIntegration(){
  insertReceivingWaitingOrdersPanel();setReceivingCoreVehicleFieldsLocked();
  const originalCollect=window.collectReceivingFields;if(typeof originalCollect==='function')window.collectReceivingFields=function(){return {...originalCollect(),receivingPdiCaseId:receivingSelectedPdiCaseId||'',receivingVehicleSource:receivingSelectedPdiCaseId?'Waiting Order':(receivingManualVehicleMode?'Manual':'')};};
  const originalLoad=window.loadReceivingRecord;if(typeof originalLoad==='function')window.loadReceivingRecord=function(record,scroll=true){const result=originalLoad(record,scroll);const f=record?.fields||{};receivingSelectedPdiCaseId=f.receivingPdiCaseId||null;receivingManualVehicleMode=f.receivingVehicleSource==='Manual';const item=receivingAllPdiCases.find(x=>String(x.id)===String(receivingSelectedPdiCaseId));if(item)applyWaitingOrderToReceiving(item,'restore');setReceivingCoreVehicleFieldsLocked();renderReceivingWaitingOrderSelector();return result;};
  const originalNew=window.newReceiving;if(typeof originalNew==='function')window.newReceiving=function(){const result=originalNew();receivingSelectedPdiCaseId=null;receivingManualVehicleMode=false;renderReceivingWaitingOrderSelector();setReceivingCoreVehicleFieldsLocked();setReceivingVehicleSourceMessage('Select a vehicle from Waiting Orders, or use Manual Receiving for a genuine unplanned arrival. Vehicle details remain editable.','info');return result;};
  const originalValidate=window.validateReceiving;if(typeof originalValidate==='function')window.validateReceiving=function(){const reason=getReceivingDuplicateReason();if(reason){alert(reason);setReceivingVehicleSourceMessage(reason,'error');return false;}if(!receivingSelectedPdiCaseId&&!receivingManualVehicleMode){alert('Select the vehicle from Waiting Orders first. If it is genuinely not on the system, choose “Vehicle Not Listed — Manual Receiving”.');return false;}return originalValidate();};
  const originalCloudSave=window.saveReceivingRecordToCloud;if(typeof originalCloudSave==='function')window.saveReceivingRecordToCloud=async function(record){if(record?.status==='Completed'){const reason=getReceivingDuplicateReason();if(reason){alert(reason);throw new Error(reason);}}const saved=await originalCloudSave(record);if(!saved)return false;if(record?.status==='Completed')await updateLinkedPdiCaseFromReceiving(record);return true;};
  loadReceivingPdiVehicleIndex();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialiseReceivingWaitingOrderIntegration);else initialiseReceivingWaitingOrderIntegration();
