/* Linked make/model selectors for PDI and Receiving.
   Existing legacy values remain visible for old records, but new capture
   requires selecting an approved make and model. */
(function () {
  const catalogue = () => window.ELT_VEHICLE_MODELS || {};
  const addOption = (node,value,label) => node.add(new Option(label,value));
  function initialise(makeId,modelId) {
    const make=document.getElementById(makeId),model=document.getElementById(modelId);
    if(!make||!model)return;
    function updateModels(preserveModel='') {
      const previous=preserveModel;
      model.replaceChildren();
      addOption(model,'',make.value?'Select model':'Select make first');
      for(const name of catalogue()[make.value]||[])addOption(model,name,name);
      if(previous && !(catalogue()[make.value]||[]).includes(previous)){
        addOption(model,previous,previous+' (existing description — please standardise)');
      }
      model.disabled=!make.value;
      if(previous)model.value=previous;
    }
    function setValues(makeValue='',modelValue='') {
      make.replaceChildren();
      addOption(make,'','Select make');
      for(const name of Object.keys(catalogue()))addOption(make,name,name);
      if(makeValue && !catalogue()[makeValue])addOption(make,makeValue,makeValue+' (existing — please standardise)');
      make.value=makeValue;
      updateModels(modelValue);
    }
    make.addEventListener('change',()=>updateModels(''));
    setValues(make.value,model.value);
    window.eltSetVehicleMakeModel=window.eltSetVehicleMakeModel||{};
    window.eltSetVehicleMakeModel[makeId]=setValues;
  }
  document.addEventListener('DOMContentLoaded',()=>{
    initialise('preArrivalMake','preArrivalModel');
    initialise('receivingMake','receivingModel');
  });
})();
