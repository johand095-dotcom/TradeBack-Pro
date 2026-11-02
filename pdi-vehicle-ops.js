/* ELT Vehicle Suite: location and VIN-linked communications (development branch).
   Requires reviewed Supabase migration; fails closed if tables are unavailable. */
(function () {
  'use strict';
  const locations = ['Stock Yard','Workshop','Washbay','Fitment Bays','Waiting collection Bays','Bodybuilder'];
  let activeCase = null, refreshHandle = null, busy = false;
  const el = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const client = () => window.supabaseClient;
  const userId = () => window.pdiSession?.user?.id || (typeof pdiSession !== 'undefined' ? pdiSession?.user?.id : null);
  const caseList = () => typeof pdiCases !== 'undefined' ? pdiCases : [];
  const status = (message, isError=false) => { const node=el('eltOpsStatus'); if(node){node.textContent=message;node.style.color=isError?'#b42318':'#176a3a';} };
  function label(c) {return [c.stock_no,c.vin,c.make,c.model].filter(Boolean).join(' · ');}
  function selectCase(id) {
    activeCase = caseList().find(c=>String(c.id)===String(id)) || null;
    const title=el('eltOpsVehicle');
    if(title) title.textContent=activeCase?label(activeCase):'Select a vehicle';
    const select=el('eltOpsCaseSelect');
    if(select) select.value=activeCase?String(activeCase.id):'';
    void loadVehicle();
  }
  async function loadVehicle() {
    if(!activeCase || !userId())return;
    status('');
    const [loc,history,msgs]=await Promise.all([
      client().from('pdi_cases').select('current_location,bodybuilder_name').eq('id',activeCase.id).single(),
      client().from('pdi_location_history').select('location,bodybuilder_name,changed_at').eq('pdi_case_id',activeCase.id).order('changed_at',{ascending:false}).limit(30),
      client().from('pdi_messages').select('id,body,created_at,sender_id').eq('pdi_case_id',activeCase.id).order('created_at',{ascending:true}).limit(500)
    ]);
    if(loc.error || history.error || msgs.error){status('Location or messaging database is not ready yet. Please ask the administrator to complete the test migration.',true);return;}
    const location=el('eltOpsLocation');if(location)location.value=loc.data?.current_location||'';
    const builder=el('eltOpsBuilder');if(builder)builder.value=loc.data?.bodybuilder_name||'';
    toggleBuilder();
    const h=el('eltOpsLocationHistory');
    if(h)h.textContent=(history.data||[]).map(x=>new Date(x.changed_at).toLocaleString()+' — '+x.location+(x.bodybuilder_name?' ('+x.bodybuilder_name+')':'')).join('\n')||'No location changes recorded.';
    const container=el('eltOpsMessages');
    if(container){
      container.replaceChildren();
      for(const m of msgs.data||[]){
        const line=document.createElement('div');line.style.cssText='padding:9px 0;border-bottom:1px solid #d9e1eb;white-space:pre-wrap;overflow-wrap:anywhere';
        const head=document.createElement('strong');head.textContent=(m.sender_id===userId()?'You':(window.eltOpsUsers||[]).find(u=>u.user_id===m.sender_id)?.full_name||'Team member')+' · '+new Date(m.created_at).toLocaleString();
        const body=document.createElement('div');body.textContent=m.body;line.append(head,body);container.append(line);
      }
    }
  }
  function toggleBuilder(){const box=el('eltOpsBuilderWrap');if(box)box.hidden=el('eltOpsLocation')?.value!=='Bodybuilder';}
  async function saveLocation(){
    if(!activeCase)return status('Select a vehicle first.',true);
    const location=el('eltOpsLocation').value, builder=el('eltOpsBuilder').value.trim();
    if(!locations.includes(location))return status('Select a valid location.',true);
    if(location==='Bodybuilder'&&!builder)return status('Enter the bodybuilder name.',true);
    if(busy)return;busy=true;
    try{

const {error}=await client().rpc('elt_update_pdi_location',{p_case_id:activeCase.id,p_location:location,p_bodybuilder_name:location==='Bodybuilder'?builder:null});

      if(error)throw error;
      status('Location saved and history recorded.');await loadVehicle();
    }catch(e){status('Location not saved: '+e.message,true)}finally{busy=false}
  }
  async function loadUsers(){
    if(!userId())return;
    const {data,error}=await client().from('user_profiles').select('user_id,full_name,email').eq('is_active',true).order('full_name');
    if(error)return status('Could not load recipients: '+error.message,true);
    window.eltOpsUsers=(data||[]).filter(u=>u.user_id!==userId());
    const select=el('eltOpsRecipients');if(!select)return;select.replaceChildren();
    for(const u of window.eltOpsUsers){const option=document.createElement('option');option.value=u.user_id;option.textContent=u.full_name||u.email||u.user_id;select.append(option)}
  }
  async function sendMessage(){
    if(!activeCase)return status('Select a vehicle first.',true);
    const recipients=Array.from(el('eltOpsRecipients').selectedOptions).map(o=>o.value);
    const body=el('eltOpsBody').value.trim();
    if(!recipients.length)return status('Select at least one recipient (Ctrl+click for multiple).',true);
    if(!body||body.length>5000)return status('Enter a message of 1–5000 characters.',true);
    if(busy)return;busy=true;
    try{
      const {error}=await client().rpc('elt_send_pdi_message',{vehicle_case_id:activeCase.id,recipient_ids:recipients,message_body:body});
      if(error)throw error;
      el('eltOpsBody').value='';status('Message sent and linked to this vehicle.');await loadVehicle();await pollUnread();
    }catch(e){status('Message not sent: '+e.message,true)}finally{busy=false}
  }
  async function pollUnread(){
    if(!userId())return;
    const {data,error}=await client().from('pdi_message_recipients').select('message_id,pdi_messages(pdi_case_id,body,created_at)').eq('recipient_id',userId()).is('read_at',null).limit(100);
    if(error)return;
    const count=data?.length||0, badge=el('eltOpsUnread');
    if(badge)badge.textContent=count?' ('+count+' unread)':'';
    const inbox=el('eltOpsInbox');if(!inbox)return;inbox.replaceChildren();
    for(const entry of data||[]){
      const row=document.createElement('button');row.type='button';row.style.cssText='display:block;width:100%;text-align:left;margin:5px 0;padding:9px;background:#eef4fa;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer';
      const item=entry.pdi_messages;row.textContent='VIN '+(caseList().find(c=>String(c.id)===String(item?.pdi_case_id))?.vin||'Unknown')+' · '+(item?.body||'').slice(0,120);
      row.addEventListener('click',async()=>{
       
const {error:e}=await client().rpc('elt_mark_pdi_message_read',{p_message_id:entry.message_id});

        if(e)return status('Could not mark message read: '+e.message,true);
        selectCase(item?.pdi_case_id);await pollUnread();
      });inbox.append(row);
    }
  }
  function render(){
    const root=el('eltOpsPanel');if(!root)return;
    root.innerHTML='<h2>Vehicle Location & Communications <span id="eltOpsUnread"></span></h2><p>Choose a VIN or open its workflow. Messages remain on the vehicle record after completion.</p><label>Vehicle <select id="eltOpsCaseSelect" style="width:100%;padding:9px"></select></label><h3 id="eltOpsVehicle">Select a vehicle</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px"><section><h3>Current location</h3><label>Location <select id="eltOpsLocation" style="width:100%;padding:9px"></select></label><div id="eltOpsBuilderWrap" hidden><label>Bodybuilder name <input id="eltOpsBuilder" maxlength="150" style="width:100%;padding:9px"></label></div><button id="eltOpsSaveLocation" type="button">Save location</button><h4>Location history</h4><pre id="eltOpsLocationHistory" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></section><section><h3>Send VIN-linked message</h3><label>Recipients (Ctrl+click for multiple)<select id="eltOpsRecipients" multiple size="6" style="width:100%;padding:9px"></select></label><textarea id="eltOpsBody" maxlength="5000" rows="4" placeholder="Type your message..." style="width:100%;padding:9px"></textarea><button id="eltOpsSend" type="button">Send message</button><h4>Unread messages</h4><div id="eltOpsInbox"></div></section></div><h3>Vehicle communication trail</h3><div id="eltOpsMessages" style="max-height:360px;overflow:auto"></div><p id="eltOpsStatus" role="status"></p>';
    const selector=el('eltOpsCaseSelect');selector.append(new Option('Select a vehicle',''));
    for(const c of caseList())selector.append(new Option(label(c),String(c.id)));
    selector.addEventListener('change',()=>selectCase(selector.value));
    const loc=el('eltOpsLocation');loc.append(new Option('Select location',''));for(const v of locations)loc.append(new Option(v,v));
    loc.addEventListener('change',toggleBuilder);
    el('eltOpsSaveLocation').addEventListener('click',saveLocation);
    el('eltOpsSend').addEventListener('click',sendMessage);
    if(activeCase)selector.value=String(activeCase.id);
    const profile = typeof pdiUserProfile !== 'undefined' ? pdiUserProfile : null;
    const canMove = Boolean(profile?.is_admin || (Array.isArray(profile?.roles) && profile.roles.some(role => ['sales admin','sales_admin'].includes(String(role).toLowerCase()))));
    const saveButton = el('eltOpsSaveLocation');
    if(saveButton){saveButton.disabled=!canMove;saveButton.title=canMove?'Save vehicle location':'Only Sales Admins can change vehicle locations';}
    void loadUsers();void pollUnread();if(activeCase)void loadVehicle();
  }
  function init(){
    if(el('eltOpsPanel'))return;
    const panel=document.createElement('section');panel.id='eltOpsPanel';panel.style.cssText='padding:22px;margin:22px 0;border:1px solid #ccd8e6;border-radius:12px;background:white';
    const archive=el('archiveSection');const workflow=el('workflowSection');
    if(workflow?.parentElement)workflow.parentElement.insertBefore(panel,workflow.nextSibling);
    else if(archive?.parentElement)archive.parentElement.insertBefore(panel,archive);
    else document.body.append(panel);
    render();
    // Wrap existing workflow navigation without changing the original handler.
    if(typeof openPdiWorkflow==='function'){
      const original=openPdiWorkflow;
      window.openPdiWorkflow=async function(caseId){const result=await original.apply(this,arguments);selectCase(caseId);return result;};
    }
    if(!refreshHandle)refreshHandle=setInterval(()=>{if(userId())void pollUnread()},20000);
  }
  document.addEventListener('DOMContentLoaded',init);
  window.eltOpsRefresh=()=>{if(el('eltOpsPanel'))render();};
})();
