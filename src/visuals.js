/* Read-only diagram controls; no provider calls or financial actions. */
(() => {
  'use strict';
  const inventory = window.SHORTLIST_DATA?.sections?.find(s => s.id === 'inventory');
  if (inventory) {
    document.getElementById('operation-total').textContent = inventory.rows.reduce((sum,r) => sum + r.operations.length,0);
    for (const r of inventory.rows) {
      const node = document.querySelector(`[data-count="${r.id}"]`);
      if (node) node.textContent = r.operations.length;
    }
  }
  const notes = {
    all:'',
    wallets:'Dynamic creates the wallet, while ONE verifies the business relationship and gives its products a shared wallet reference; the organisation record can optionally link to it.',
    batches:'ONE checks the batch and tracks each payment against its authorised funding source, using Flow where the payment needs a supported route.',
    conversion:'ONE follows the merchant’s agreed instructions, checking the deposit, sweeping if needed, executing the trade and crediting the actual fiat proceeds.'
  };
  document.querySelector('.diagram-controls').addEventListener('click', event => {
    const button = event.target.closest('button[data-focus]');
    if (!button) return;
    const key = button.dataset.focus;
    document.querySelector('.integration-board').dataset.active = key;
    document.querySelectorAll('.diagram-controls button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    document.querySelectorAll('.service-column').forEach(c => c.classList.toggle('selected',c.dataset.service === key));
    const note = document.getElementById('trace-note');
    note.textContent = notes[key];
    note.hidden = key === 'all';
  });
  const sections = [...document.querySelectorAll('.visual-section')];
  function updateNav() {
    const reached = sections.filter(s => s.getBoundingClientRect().top <= 160);
    const atEnd = window.scrollY > 0 && Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2;
    const current = atEnd ? sections.at(-1) : reached.at(-1) || sections[0];
    document.querySelectorAll('.visual-nav a').forEach(a => {
      if (a.hash === '#' + current.id) a.setAttribute('aria-current','location');
      else a.removeAttribute('aria-current');
    });
  }
  let pending = false;
  window.addEventListener('scroll', () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {updateNav(); pending = false;});
  }, {passive:true});
  updateNav();
})();
