import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const inline = text => {
  const pattern = /(`[^`]+`|\*\*.+?\*\*|\[[^\]]+\]\([^)]+\))/g;
  let result = '', cursor = 0;
  for (const match of text.matchAll(pattern)) {
    result += escape(text.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith('`')) result += `<code>${escape(token.slice(1,-1))}</code>`;
    else if (token.startsWith('**')) result += `<strong>${inline(token.slice(2,-2))}</strong>`;
    else {
      const [, label, originalHref] = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const href = originalHref === '2026-09-22-flow-whitelabel-api-outline.md' ? '#flow-api' : originalHref;
      result += `<a href="${escape(href)}">${escape(label)}</a>`;
    }
    cursor = match.index + token.length;
  }
  return result + escape(text.slice(cursor));
};
const cells = line => line.trim().replace(/^\||\|$/g,'').split('|').map(x=>x.trim());

// Render only the Markdown constructs used by the reviewed Flow documents.
function render(markdown) {
  const lines = markdown.trim().split('\n');
  const output = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const content = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) content.push(lines[i]);
      output.push(`<pre><code class="language-${escape(language)}">${escape(content.join('\n'))}</code></pre>`);
      i++; continue;
    }
    if (line.startsWith('|')) {
      const header = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(cells(lines[i++]));
      output.push(`<div class="flow-table"><table${header.length === 4 ? ' class="call-table"' : ''}><thead><tr>${header.map(c=>`<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((c,j)=>`<td data-label="${escape(header[j])}">${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /,''));
      output.push(`<ol class="build-steps">${items.map(x=>`<li>${inline(x)}</li>`).join('')}</ol>`);
      continue;
    }
    const paragraph = [];
    while (i < lines.length && lines[i].trim()) paragraph.push(lines[i++]);
    const text = paragraph.join(' ');
    output.push(`<p${text.startsWith('**') && text.includes('→') && text.endsWith('**') ? ' class="flow-route"' : ''}>${inline(text)}</p>`);
  }
  return output.join('\n');
}

function sections(markdown) {
  const parts = markdown.split(/^## /m);
  return { intro: parts.shift(), sections: Object.fromEntries(parts.map(part => {
    const end = part.indexOf('\n');
    return [part.slice(0,end), part.slice(end+1).trim()];
  })) };
}
const detail = (title, body, meta = '', id = '') => `<details class="flow-detail"${id ? ` id="${id}"` : ''}><summary><span>${escape(title)}</span>${meta ? `<small>${escape(meta)}</small>` : ''}<span class="expand-mark" aria-hidden="true">+</span></summary><div class="flow-detail-body">${render(body)}</div></details>`;
const heading = (number, title, tag = '') => `<div class="section-heading"><span class="section-number">${number}</span><h2>${title}</h2>${tag ? `<span class="section-tag">${tag}</span>` : ''}</div>`;

export async function buildFlow(root, dist) {
  const [delivery, api, baseCss, css, js] = await Promise.all(['flow-delivery.md','flow-api.md','styles.css','flow.css','flow.js'].map(name => readFile(path.join(root,'src',name),'utf8')));
  const d = sections(delivery), a = sections(api);
  const needed = (document, title) => {
    if (!document.sections[title]) throw new Error(`Missing Flow source section: ${title}`);
    return document.sections[title];
  };
  const intro = d.intro.split('\n\n').find(p=>p.startsWith('The SPARK'));
  const rows = d.intro.split('\n').filter(line=>line.startsWith('| **')).map(cells);
  if (rows.length !== 2) throw new Error('Flow delivery must retain exactly two options.');
  const options = rows.map((row,index) => {
    const key = index === 0 ? '1 · Flow-first SPARK demo' : '2 · Full Gateway V3 + TMS';
    return `<details class="flow-option" id="option-${index+1}"${index === 0 ? ' open' : ''}><summary><span class="option-title"><span class="row-chevron" aria-hidden="true">›</span>${inline(row[0])}</span><span class="option-experience">${inline(row[1])}</span><span class="option-dependency">${inline(row[2])}</span></summary><div class="flow-detail-body">${render(needed(d,key))}</div></details>`;
  }).join('');
  const creation = needed(a,'1. Create the payment from ONE’s backend');
  const [, parameters] = creation.split(/```http[\s\S]*?```/);
  const exampleMarker = '**Illustrative request — USD invoice, USDC settlement on Base**';
  const controlsMarker = '**Other documented controls**';
  const [required, examples] = parameters.split(exampleMarker);
  const [example, controls] = examples.split(controlsMarker);
  const apiIntro = a.intro.split('\n\n').find(p=>p.startsWith('ONE’s white-label'));
  const markup = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ONE Gateway V3 — Flow inside ONE</title><meta name="description" content="The Gateway V3 product story: a Flow-powered ONE checkout using the merchant’s configured custody or verified self-custody destination."><style>${baseCss}\n${css}</style></head>
<body><a class="skip-link" href="#delivery">Skip to the V3 story</a><main class="flow-document">
<header class="masthead"><div><div class="eyebrow">CLEARER / ONE</div><h1>ONE Gateway V3</h1><p class="subtitle">Flow inside ONE · product story and API handoff</p></div><div class="edition"><span>Direction aligned · 23 September 2026</span><a href="./">API inventory ↗</a><a href="system.html">ONE service map ↗</a><a href="walkthrough.html">Later wallet/payout example ↗</a><a href="flow-experience.html">Collection product spec ↗</a><a href="one-flow-brief.md" download>Download notes ↓</a></div></header>
<nav class="view-tabs" aria-label="Flow document sections"><a href="#delivery" aria-current="location"><span class="nav-number">01</span>Product story</a><a href="#flow-api"><span class="nav-number">02</span>API handoff</a><a href="#checkout"><span class="nav-number">03</span>Checkout path</a><a href="#timeline"><span class="nav-number">04</span>Full V3 path</a></nav>
<section id="delivery" class="flow-section">${heading('01','V3 product story','Aligned')}<div class="flow-intro">${render(intro)}</div><div class="option-head" aria-hidden="true"><span>Delivery stage</span><span>Product scope</span><span>Main dependency</span></div>${options}<p class="reading-hint">The SPARK demo and the full Gateway V3 platform are separate deliveries.</p>${detail('Shared build · White-label checkout',needed(d,'Common build · White-label Flow inside ONE'),'Shared Flow foundation')}</section>
<section id="flow-api" class="flow-section">${heading('02','Flow API','Documented')}<div class="flow-intro">${render(apiIntro)}</div><div class="endpoint-banner"><div><span class="method-label">POST</span><code>/server/{environmentId}/flow/payment</code></div><p>https://app.dynamicauth.com/api/v0</p><div class="endpoint-auth"><span>ONE backend</span><span>Bearer token · flow.write</span><span>Content-Type: application/json</span><a href="https://www.dynamic.xyz/docs/api-reference/server/create-a-flow">Official reference ↗</a></div></div>${detail('Creation parameters',required,'Required + optional','creation-parameters')}${detail('Worked request · 25 USD → Base USDC',exampleMarker+'\n\n'+example,'Illustrative JSON','worked-request')}${detail('Additional controls',controls,'Fees, return URL & expiry')}${detail('Shareable links to ONE’s checkout',needed(a,'Optional: Generate a link to ONE’s checkout'),'Optional')}</section>
<section id="checkout" class="flow-section">${heading('03','Checkout & receipt')}<div class="journey-line" aria-label="Payment sequence"><span>Attach payer</span><span aria-hidden="true">→</span><span>Quote</span><span aria-hidden="true">→</span><span>Sign & submit</span><span aria-hidden="true">→</span><span>Verify receipt</span></div>${detail('Checkout calls and parameters',needed(a,'2. Drive the payment inside ONE’s checkout'),'Source → settlement','checkout-calls')}${detail('Connect settlement to ONE’s receipt',needed(a,'3. Connect settlement to ONE’s receipt'),'Flow → deposit → credit')}</section>
<section id="timeline" class="flow-section">${heading('04','Delivery sequence','Product phases')}<div class="flow-prose">${render(needed(d,'Delivery sequence'))}</div></section>
<footer><span>clearer.money · Static planning document · Auto-conversion on hold</span><span>Provider docs reviewed 23 September 2026</span></footer>
</main><script>${js.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
  await writeFile(path.join(dist,'flow.html'),markup);
  await writeFile(path.join(dist,'one-flow-delivery.html'),markup.replace('href="./"','href="one-gateway-api-brief.html"').replace('href="system.html"','href="one-system-map.html"').replace('href="walkthrough.html"','href="one-api-walkthrough.html"').replaceAll('href="flow-experience.html"','href="one-flow-experience.html"'));
  await writeFile(path.join(dist,'one-flow-brief.md'), delivery.replace('(2026-09-22-flow-whitelabel-api-outline.md)','(#flow-api)')+'\n\n---\n\n<a id="flow-api"></a>\n\n'+api);
  await buildExperience(root, dist, baseCss, css, js);
}

async function buildExperience(root, dist, baseCss, css, js) {
  const source = await readFile(path.join(root, 'src', 'flow-experience.md'), 'utf8');
  const document = sections(source);
  const body = title => {
    if (!document.sections[title]) throw new Error(`Missing experience section: ${title}`);
    return document.sections[title];
  };
  const steps = Object.keys(document.sections).filter(title => /^\d+\. /.test(title));
  if (steps.length !== 7) throw new Error('The collection specification must retain its seven connected steps.');
  const introduction = document.intro.split('\n\n').find(p => p.startsWith('The merchant'));
  const markup = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Collect a payment through ONE — Product specification</title><meta name="description" content="The merchant and payer experience, ONE and Dynamic API calls, records, states and acceptance criteria for Flow collection."><style>${baseCss}\n${css}\n.experience-document .flow-table th:first-child{width:26%}.experience-document .flow-table th:nth-child(2){width:34%}.experience-document .flow-table th:last-child{width:auto}.experience-document .flow-route{color:var(--green);font-size:12px;padding:15px 0;border-block:1px solid var(--rule)}.experience-document .view-tabs{overflow-x:auto}.experience-document .flow-detail>summary small{flex-shrink:0}@media(max-width:620px){.experience-document .flow-detail>summary{gap:9px}.experience-document .flow-detail>summary small{max-width:85px;text-align:right;flex-shrink:1}.experience-document .view-tabs{gap:22px}}@media print{.experience-document details:not([open])>.flow-detail-body{display:block}.experience-document .view-tabs{position:static}.experience-document pre{break-inside:avoid}}</style></head>
<body><a class="skip-link" href="#experience">Skip to the experience</a><main class="flow-document experience-document">
<header class="masthead"><div><div class="eyebrow">CLEARER / ONE</div><h1>Gateway V3 collection through ONE</h1><p class="subtitle">Flow inside ONE, using the merchant’s approved default destination</p></div><div class="edition"><span>Product spec draft · 23 September 2026</span><a href="flow.html">Flow delivery & API ↗</a><a href="./">API brief ↗</a><a href="one-flow-experience.md" download>Download product spec ↓</a></div></header>
<nav class="view-tabs" aria-label="Product specification sections"><a href="#experience" aria-current="location"><span class="nav-number">01</span>Experience</a><a href="#api-sequence"><span class="nav-number">02</span>API sequence</a><a href="#records"><span class="nav-number">03</span>Records & states</a><a href="#acceptance"><span class="nav-number">04</span>Acceptance</a></nav>
<section id="experience" class="flow-section">${heading('01','The experience','Flow first')}<div class="flow-intro">${render(introduction)}</div>${render(body('The experience'))}${detail('What we tested and what remains',body('Scope and evidence'),'Evidence boundary','test-evidence')}</section>
<section id="api-sequence" class="flow-section">${heading('02','API sequence','ONE ↔ Dynamic')}<p class="reading-hint">Open each step for the user action, API request and values carried forward.</p>${detail('Example carried through the calls',body('Example carried through the calls'),'1 USD · Base Sepolia','example-values')}${steps.map((title,i)=>detail(title,body(title),i===0?'Existing ONE API':i===1?'Proposed ONE contract':i===2?'Address handoff tested':'Checkout / receipt to build',`call-${i+1}`)).join('\n')}</section>
<section id="records" class="flow-section">${heading('03','Records & states')}${render(body('Records and service responsibilities'))}${detail('Status shown to users',body('Status shown to users'),'Delivery ≠ account credit','status-model')}</section>
<section id="acceptance" class="flow-section">${heading('04','Acceptance criteria')}${render(body('Acceptance criteria'))}${detail('Follow-up items',body('Follow-up items'),'ONE integration details','follow-ups')}</section>
<footer><span>clearer.money · Static product specification · Auto-conversion on hold</span><span>Provider docs and test evidence reviewed 23 September 2026</span></footer>
</main><script>${js.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
  await writeFile(path.join(dist, 'flow-experience.html'), markup);
  await writeFile(path.join(dist, 'one-flow-experience.html'), markup.replace('href="flow.html"', 'href="one-flow-delivery.html"').replace('href="./"', 'href="one-gateway-api-brief.html"'));
  await writeFile(path.join(dist, 'one-flow-experience.md'), source);
}
