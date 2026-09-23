import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import document from './src/walkthrough-data.mjs';

const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const json = value => JSON.stringify(value,null,2);
const sourceLink = key => key ? `<a href="${escape(document.sources[key].url)}">Official docs ↗</a>` : '';
const blocks = (title,value) => value == null ? '' : `<div class="example-block"><h5>${title}</h5><pre><code>${escape(json(value))}</code></pre></div>`;
const pairs = rows => `<dl class="notes-list">${rows.map(([title,text])=>`<div><dt>${escape(title)}</dt><dd>${escape(text)}</dd></div>`).join('')}</dl>`;
const callHtml = call => `<article class="call"><div class="call-meta"><span class="contract-label ${call.kind.startsWith('Documented')?'documented':''}">${escape(call.kind)}</span>${sourceLink(call.source)}</div><h4>${escape(call.operation)}</h4><p class="actor">${escape(call.actor)}</p>${blocks('Headers',call.headers)}<div class="request-response">${blocks(call.operation.includes('({...})')?'Arguments':'Input',call.request)}${blocks('Example output',call.response)}</div><p class="call-note">${escape(call.notes)}</p></article>`;
const stepHtml = (step,index) => `<details class="walk-step" id="step-${step.id.replace('.','-')}"${step.id==='1.1'?' open':''}><summary><span class="step-number">${step.id}</span><span class="step-summary"><strong>${escape(step.title)}</strong><span>${escape(step.experience)}</span></span><span class="step-expand" aria-hidden="true">+</span></summary><div class="step-detail"><div class="service-handoff"><span class="small-label">Service handoff</span><p>${escape(step.service)}</p></div>${step.calls.map(callHtml).join('')}<div class="carry"><span class="small-label">Carries forward</span><p>${escape(step.carry)}</p></div></div></details>`;
const sourceHtml = Object.entries(document.sources).map(([key,s])=>`<li id="source-${key}"><a href="${escape(s.url)}">${escape(s.label)} ↗</a></li>`).join('');

export async function buildWalkthrough(root,dist) {
  const css = await readFile(path.join(root,'src/styles.css'),'utf8');
  const pageCss = await readFile(path.join(root,'src/walkthrough.css'),'utf8');
  const markup = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${document.title}</title><meta name="description" content="Later business-wallet and crypto-payout examples that extend the Flow-first Gateway V3 path."><style>${css}\n${pageCss}</style></head>
<body><a class="skip-link" href="#business-wallet">Skip to walkthrough</a><main class="walkthrough-document">
<header class="masthead"><div><div class="eyebrow">CLEARER / ONE</div><h1>${document.title}</h1><p class="subtitle">${escape(document.subtitle)}</p></div><div class="edition"><span>Static discussion draft</span><a href="./">API inventory ↗</a><a href="system.html">System map ↗</a><a href="flow.html">Flow inside ONE ↗</a><a href="one-api-walkthrough.md" download>Download LLM brief ↓</a></div></header>
<nav class="view-tabs" aria-label="Walkthrough sections">${document.sections.map(s=>`<a href="#${s.id}"><span class="nav-number">${s.number}</span>${s.title}</a>`).join('')}</nav>
<div class="walk-intro"><p>${escape(document.intro)}</p><p class="muted">${escape(document.scope)}</p></div>
<figure class="journey-strip" aria-label="Later extension: business wallet setup, one thousand USDC received, eight hundred USDC paid"><div><small>LATER / SET UP</small><strong>Business wallet</strong><span>USDC on Base · one merchant</span></div><span class="journey-arrow" aria-hidden="true">→</span><div><small>FLOW / COLLECT</small><strong>1,000 USDC received</strong><span>Flow → the same wallet</span></div><span class="journey-arrow" aria-hidden="true">→</span><div><small>TMS / PAY OUT</small><strong>800 USDC to suppliers</strong><span>400 + 250 + 150 · 200 retained</span></div></figure>
<details class="context-detail"><summary>The shared example · IDs, asset and assumptions</summary><p>${escape(document.premise)}</p>${pairs(document.assumptions)}<div class="binding-table-wrap"><table class="binding-table"><thead><tr><th>Reference</th><th>Example value</th><th>Comes from</th><th>Used by</th></tr></thead><tbody>${document.bindings.map(row=>`<tr>${row.map(cell=>`<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${blocks('Shared asset',document.checks.asset)}</details>
${document.sections.map(s=>`<section id="${s.id}" class="walk-section"><div class="section-heading"><span class="section-number">${s.number}</span><div><h2>${s.title}</h2><p>${escape(s.description)}</p></div><span class="outcome">${s.outcome}</span></div><p class="service-path">${escape(s.services)}</p>${s.steps.map(stepHtml).join('')}</section>`).join('')}
<section class="handoff-section" id="llm-handoff"><div class="section-heading"><div><h2>For the spec</h2><p>The downloadable brief includes every worked example, so the development team can carry these decisions into their implementation spec.</p></div><a class="download-link" href="one-api-walkthrough.md" download>Download Markdown ↓</a></div><details class="context-detail"><summary>Rules to preserve in the spec</summary>${pairs(document.rules)}</details><details class="context-detail"><summary>Follow-up items with ONE</summary>${pairs(document.followups)}</details><details class="context-detail"><summary>Suggested prompt for the development team</summary><p>${escape(document.llmBrief)}</p></details><details class="context-detail"><summary>Official provider documentation</summary><ul class="walk-sources">${sourceHtml}</ul><p>Provider methods were checked against these official pages; ONE’s proposed service ownership remains subject to the system-map follow-up items.</p></details></section>
<footer><span>clearer.money · Example data throughout · Auto-conversion on hold</span><span>Provider docs checked ${document.date}</span></footer>
</main></body></html>`;
  await writeFile(path.join(dist,'walkthrough.html'),markup);
  await writeFile(path.join(dist,'one-api-walkthrough.html'),markup.replace('href="./"','href="one-gateway-api-brief.html"').replace('href="system.html"','href="one-system-map.html"').replace('href="flow.html"','href="one-flow-delivery.html"'));
  const fence = (heading,value) => value == null ? '' : `\n**${heading}**\n\n\`\`\`json\n${json(value)}\n\`\`\`\n`;
  const mdPairs = rows => rows.map(([title,text])=>`- **${title}:** ${text}`).join('\n');
  let md = `# ${document.title}\n\nStatic discussion draft · ${document.date}\n\n${document.intro}\n\n${document.scope}\n\n${document.premise}\n\n## Scope and assumptions\n\n${mdPairs(document.assumptions)}\n\n## Shared identifiers\n\n| Reference | Example value | Comes from | Used by |\n| --- | --- | --- | --- |\n${document.bindings.map(row=>`| ${row.map(cell=>cell.replaceAll('<','&lt;').replaceAll('>','&gt;')).join(' | ')} |`).join('\n')}\n${fence('Shared asset',document.checks.asset)}\n## Contract and implementation rules\n\n${mdPairs(document.rules)}\n`;
  for (const section of document.sections) {
    md += `\n## ${section.number}. ${section.title}\n\n${section.description}\n\n**Service path:** ${section.services}\n\n**Example outcome:** ${section.outcome}\n`;
    for (const step of section.steps) {
      md += `\n### ${step.id} ${step.title}\n\n**Merchant / payer experience:** ${step.experience}\n\n**Service handoff:** ${step.service}\n`;
      for (const c of step.calls) {
        md += `\n#### ${c.operation}\n\n**Contract:** ${c.kind}\n\n**Actor:** ${c.actor}\n${c.request===null?'\n**Input:** No request body.\n':''}${fence('Headers',c.headers)}${fence(c.operation.includes('({...})')?'Arguments':'Input',c.request)}${fence('Example output',c.response)}\n${c.notes}\n${c.source?`\nSource: [${document.sources[c.source].label}](${document.sources[c.source].url})\n`:''}`;
      }
      md += `\n**Carries forward:** ${step.carry}\n`;
    }
  }
  md += `\n## Follow-up items with ONE\n\n${mdPairs(document.followups)}\n\n## Suggested prompt for the development team\n\n${document.llmBrief}\n\n## Official provider sources\n\n${Object.values(document.sources).map(s=>`- [${s.label}](${s.url})`).join('\n')}\n\nService context: the companion ONE system map reconstructs shared diagrams and does not establish current deployed service boundaries. The API specification outline remains the broader inventory; these examples add proposed field names and handoffs for discussion, not published ONE behaviour.\n`;
  await writeFile(path.join(dist,'one-api-walkthrough.md'),md);
  return {sections:document.sections.length,steps:document.sections.reduce((n,s)=>n+s.steps.length,0)};
}
