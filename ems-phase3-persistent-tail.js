/* EMS Phase 3 persistent tail
   Keeps steps 9-14 outside the steps 1-8 render target so normal Phase 3 refreshes cannot erase them. */
(function () {
  let moving = false;
  let queued = false;

  function phase3Visible() {
    const section = document.getElementById('emsPhase3Workflow');
    return section && !section.classList.contains('hidden');
  }

  function ensureTailHost() {
    const main = document.getElementById('emsPhase3Steps');
    if (!main) return null;
    let tail = document.getElementById('emsPhase3CompletionSteps');
    if (!tail) {
      tail = document.createElement('div');
      tail.id = 'emsPhase3CompletionSteps';
      tail.className = 'ems-workflow-steps';
      main.insertAdjacentElement('afterend', tail);
    }
    return tail;
  }

  function moveCompletionCards() {
    if (moving || !phase3Visible()) return;
    const main = document.getElementById('emsPhase3Steps');
    const tail = ensureTailHost();
    if (!main || !tail) return;

    const cards = Array.from(main.querySelectorAll('[data-ems-completion-step]'));
    if (!cards.length) return;

    moving = true;
    try {
      cards.forEach(card => tail.appendChild(card));
    } finally {
      moving = false;
    }
  }

  function requestRepair(delay = 0) {
    if (queued) return;
    queued = true;
    setTimeout(async () => {
      queued = false;
      if (!phase3Visible()) return;
      const tail = ensureTailHost();
      if (!tail) return;

      moveCompletionCards();

      /* If the legacy Phase 3 renderer erased 9-14, ask the completion renderer
         to recreate them, then immediately move them into the protected host. */
      if (!tail.querySelector('[data-ems-completion-step]') &&
          typeof window.renderEmsCompletionSteps === 'function') {
        try {
          await window.renderEmsCompletionSteps();
          moveCompletionCards();
        } catch (error) {
          console.error('EMS persistent completion render failed:', error);
        }
      }
    }, delay);
  }

  const observer = new MutationObserver(() => {
    if (moving) return;
    requestRepair(0);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  /* Workflow actions can refresh the case and rebuild steps 1-8. Run after those
     click handlers have had a chance to finish and restore 9-14 if required. */
  document.addEventListener('click', () => {
    requestRepair(25);
    setTimeout(() => requestRepair(0), 150);
    setTimeout(() => requestRepair(0), 500);
  }, false);

  window.addEventListener('load', () => requestRepair(50));
  requestRepair(50);
})();
