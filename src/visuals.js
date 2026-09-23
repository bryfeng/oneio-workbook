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
    wallets:'The SPARK Flow adapter resolves an existing custody or verified self-custody destination from the merchant’s default profile.',
    batches:'After Flow checkout is established, ONE can add a shared business wallet under account services, with separate ownership and signer controls.',
    conversion:'Later TMS scope can include crypto batch payouts, stablecoin card issuance and other treasury workflows.'
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
