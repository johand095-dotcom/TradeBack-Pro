/* Linked make/model selectors for ELT vehicle capture. */
(function () {
  function initialise(makeId, modelId) {
    const make = document.getElementById(makeId);
    const model = document.getElementById(modelId);
    const catalogue = window.ELT_VEHICLE_MODELS;
    if (!make || !model || !catalogue) return;
    function option(select, value, label) {
      const el = document.createElement('option');
      el.value = value; el.textContent = label; select.appendChild(el);
    }
    function updateModels() {
      const previous = model.value;
      model.replaceChildren();
      option(model, '', make.value ? 'Select model' : 'Select make first');
      (catalogue[make.value] || []).forEach(name => option(model, name, name));
      model.disabled = !make.value;
      if ((catalogue[make.value] || []).includes(previous)) model.value = previous;
    }
    make.replaceChildren();
    option(make, '', 'Select make');
    Object.keys(catalogue).forEach(name => option(make, name, name));
    make.addEventListener('change', updateModels);
    updateModels();
  }
  document.addEventListener('DOMContentLoaded', () => initialise('preArrivalMake', 'preArrivalModel'));
})();
