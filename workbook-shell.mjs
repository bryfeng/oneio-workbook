import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const pages = [
  ['flow.html', 'V3 story', 'one-flow-delivery.html'],
  ['flow-experience.html', 'Collection spec', 'one-flow-experience.html'],
  ['index.html', 'API inventory', 'one-gateway-api-brief.html'],
  ['visuals.html', 'Visual map', 'one-visuals-draft.html'],
  ['system.html', 'Service map', 'one-system-map.html'],
  ['walkthrough.html', 'Wallets & payouts', 'one-api-walkthrough.html'],
  ['flow-lab.html', 'Flow Lab', 'flow-lab.html'],
];

export async function addWorkbookShell(root, dist) {
  const css = await readFile(path.join(root, 'src/workbook-shell.css'), 'utf8');
  for (const [canonical, , alias] of pages) {
    for (const file of new Set([canonical, alias])) {
      let html = await readFile(path.join(dist, file), 'utf8');
      const standalone = file !== canonical;
      const nav = pages.map(([href, label, download]) => `<a href="${standalone ? download : href}"${href === canonical ? ' aria-current="page"' : ''}>${label}</a>`).join('');
      const header = `<header class="workbook-header"><div class="workbook-brand"><a href="${standalone ? 'one-flow-delivery.html' : 'flow.html'}">ONE<span> / </span>workbook</a><span>CLEARER / ONE · GATEWAY V3</span></div><nav class="workbook-nav" aria-label="Workbook pages">${nav}</nav></header>`;
      // The page title and edition remain local content; navigation has one owner.
      html = html.replace(/<header class="masthead">([\s\S]*?)<\/header>/, (_, content) => '<section class="masthead page-intro">' + content.replace(/<a\b[^>]*href="(?:\.\/|[^"#]+\.html)"[^>]*>[\s\S]*?<\/a>/g, '') + '</section>');
      html = html.replace('</head>', `<style>${css}</style></head>`).replace(/<body([^>]*)>/, `<body$1>${header}`);
      await writeFile(path.join(dist, file), html);
    }
  }
}
