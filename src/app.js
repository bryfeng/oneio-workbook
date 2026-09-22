/* Adapted from Compact Shortlist: local, read-only views and expandable evidence. */
(() => {
  'use strict';
  const data = window.SHORTLIST_DATA;
  const $ = id => document.getElementById(id);
  if (!data || !Array.isArray(data.sections)) { $('sections').textContent = 'Document data unavailable.'; return; }
  const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeURL(value) { try {const u = new URL(value); return ['https:','http:'].includes(u.protocol) ? u.href : null;} catch {return null;} }
  function link(source) {const u = safeURL(source.url); return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(source.label)} <span aria-hidden="true">↗</span></a>` : esc(source.label);}
  const expanded = new Set();
  let query = '';
  function updateCurrentSection() {
    const visible = data.sections.map(s => document.getElementById(s.id)).filter(Boolean);
    const reached = visible.filter(s => s.getBoundingClientRect().top <= 165);
    const atEnd = window.scrollY > 0 && Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2;
    const current = atEnd ? visible.at(-1) : reached.at(-1) || visible[0];
    document.querySelectorAll('#views a').forEach(a => {
      if (current && a.hash === '#' + current.id) a.setAttribute('aria-current','location');
      else a.removeAttribute('aria-current');
    });
  }
  function detailContent(r) {
    const ops = r.operations || [];
    const blocks = r.blocks || [];
    return `
      ${ops.length ? `<div class="operation-list">${ops.map(o => `<div class="operation"><div class="endpoint">${o.method ? `<span class="method method-${esc(o.method.toLowerCase())}">${esc(o.method)}</span>` : ''}<code>${esc(o.path)}</code></div><div class="operation-explanation"><p>${esc(o.technical)}</p>${o.business ? `<p class="business-purpose"><span>Business use</span> ${esc(o.business)}</p>` : ''}</div></div>`).join('')}</div>` : ''}
      ${blocks.length ? `<div class="details-grid">${blocks.map(b => `<div class="detail-block"><h4>${esc(b.label)}</h4><p>${esc(b.text)}</p></div>`).join('')}</div>` : ''}
      ${r.note ? `<p class="detail-note">${esc(r.note)}</p>` : ''}
      ${(r.groups || []).map(g=>`<div class="detail-group"><h3>${esc(g.title)}</h3>${detailContent(g)}</div>`).join('')}
      ${(r.sources || []).length ? `<div class="source-links">${r.sources.map(link).join('')}</div>` : ''}`;
  }
  function rowHTML(r, columns) {
    const open = expanded.has(r.id);
    return `<tr class="entry${open ? ' expanded' : ''}${r.paused ? ' paused' : ''}"><td><button type="button" class="company-button" data-id="${esc(r.id)}" aria-expanded="${open}" ${open ? `aria-controls="detail-${esc(r.id)}"` : ''}><span class="chevron" aria-hidden="true">›</span><span class="company-name">${esc(r.title)}</span></button>${r.paused ? '<span class="paused-label">On hold</span>' : ''}</td><td class="summary">${esc(r.summary)}</td>${columns===3?`<td><span class="status ${esc(r.tone)}">${esc(r.status)}</span></td>`:''}</tr>${open ? `<tr class="detail-row" id="detail-${esc(r.id)}"><td colspan="${columns}"><div class="details">${detailContent(r)}</div></td></tr>` : ''}`;
  }
  function sectionHTML(s, found) {
    if (!found.length && query) return '';
    const columns=s.columns.length;
    const intro=s.id==='inventory' ? `ONE documents ${s.rows.reduce((n,r)=>n+r.operations.length,0)} API operations that we can build on, once we confirm sandbox access.` : s.intro;
    return `<section class="brief-section" id="${esc(s.id)}" aria-labelledby="heading-${esc(s.id)}"><div class="section-heading"><span class="section-number">${esc(s.number)}</span><div><h2 id="heading-${esc(s.id)}">${esc(s.title)}</h2>${intro?`<p>${esc(intro)}</p>`:''}</div>${s.tag?`<span class="section-tag">${esc(s.tag)}</span>`:''}</div><div class="table-scroll"><table class="columns-${columns}"><caption class="sr-only">${esc(s.title)}. Open a capability for technical details and sources.</caption><colgroup><col class="col-capability"><col class="col-summary">${columns===3?'<col class="col-evidence">':''}</colgroup><thead><tr>${s.columns.map(c => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${found.map(r=>rowHTML(r,columns)).join('')}</tbody></table></div>${s.note ? `<p class="section-note">${esc(s.note)}</p>` : ''}</section>`;
  }
  function render() {
    let count = 0;
    $('sections').innerHTML = data.sections.map(s => {
      const found = s.rows.filter(r => JSON.stringify([r.title,r.summary,r.status,r.operations,r.blocks,r.note,r.groups]).toLowerCase().includes(query));
      count += found.length;
      return sectionHTML(s, found);
    }).join('');
    $('result-count').textContent = query ? `${count} matching ${count === 1 ? 'row' : 'rows'}` : '';
    $('empty').hidden = count !== 0;
    document.querySelectorAll('#views a').forEach(a => {const missing=!document.getElementById(a.hash.slice(1));a.classList.toggle('no-matches',missing);a.setAttribute('aria-disabled',String(missing));});
    updateCurrentSection();
  }
  $('sections').addEventListener('click', e => {
    const button = e.target.closest('button[data-id]'); if (!button) return;
    const id = button.dataset.id;
    if (expanded.has(id)) expanded.delete(id); else expanded.add(id);
    render(); $('sections').querySelector(`[data-id="${id}"]`).focus({preventScroll:true});
  });
  $('search').addEventListener('input', e => {query=e.target.value.trim().toLowerCase();render();});
  $('clear-search').addEventListener('click', () => {$('search').value='';query='';render();$('search').focus();});
  $('views').addEventListener('click', e => {const a=e.target.closest('a');if(!a)return;if(a.getAttribute('aria-disabled')==='true'){e.preventDefault();return;}document.querySelectorAll('#views a').forEach(x=>x.removeAttribute('aria-current'));a.setAttribute('aria-current','location');});
  let scrollPending = false;
  window.addEventListener('scroll', () => {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(() => {updateCurrentSection();scrollPending = false;});
  }, {passive:true});
  $('page-title').textContent = data.title;
  document.title = data.title + ' — API brief';
  $('eyebrow').textContent = data.eyebrow;
  $('subtitle').textContent = data.subtitle;
  $('footer-date').textContent = data.updated;
  $('views').innerHTML = data.sections.map((s,i)=>`<a href="#${esc(s.id)}" ${i===0?'aria-current="location"':''}><span class="nav-number">${esc(s.number)}</span>${esc(s.nav)}</a>`).join('');
  render();
})();
