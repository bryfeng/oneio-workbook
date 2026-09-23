import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { buildWalkthrough } from './build-walkthrough.mjs';
import { buildFlow } from './build-flow.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
await mkdir(dist, { recursive: true });
for (const name of ['index.html','styles.css','app.js','data.js','visuals.html','visuals.css','visuals.js','system.html','system.css']) {
  await cp(path.join(root,'src',name),path.join(dist,name));
}
const [html, css, data, app] = await Promise.all(
  ['index.html','styles.css','data.js','app.js'].map(name => readFile(path.join(root,'src',name),'utf8'))
);
const script = text => text.replace(/<\/script/gi, '<\\/script');
const standalone = html
  .replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`)
  .replace('  <script src="data.js" defer></script>\n', '')
  .replace('  <script src="app.js" defer></script>\n', '')
  .replace('href="visuals.html"', 'href="one-visuals-draft.html"')
  .replace('href="system.html"', 'href="one-system-map.html"')
  .replace('href="walkthrough.html"', 'href="one-api-walkthrough.html"')
  .replace('href="flow.html"', 'href="one-flow-delivery.html"')
  .replaceAll('href="flow-experience.html"', 'href="one-flow-experience.html"')
  .replace('</body>', `<script>\n${script(data)}\n${script(app)}\n</script>\n</body>`);
await writeFile(path.join(dist,'one-gateway-api-brief.html'), standalone);
const [visualHtml, visualCss, visualJs] = await Promise.all(
  ['visuals.html','visuals.css','visuals.js'].map(name => readFile(path.join(root,'src',name),'utf8'))
);
const visualStandalone = visualHtml
  .replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`)
  .replace('<link rel="stylesheet" href="visuals.css">', `<style>\n${visualCss}\n</style>`)
  .replace('<script src="data.js" defer></script>\n', '')
  .replace('<script src="visuals.js" defer></script>\n', '')
  .replaceAll('href="./', 'href="one-gateway-api-brief.html')
  .replace('href="system.html"', 'href="one-system-map.html"')
  .replace('href="walkthrough.html"', 'href="one-api-walkthrough.html"')
  .replace('href="flow.html"', 'href="one-flow-delivery.html"')
  .replaceAll('href="flow-experience.html"', 'href="one-flow-experience.html"')
  .replace('</body>', `<script>\n${script(data)}\n${script(visualJs)}\n</script>\n</body>`);
await writeFile(path.join(dist,'one-visuals-draft.html'), visualStandalone);
const [systemHtml, systemCss] = await Promise.all(
  ['system.html','system.css'].map(name => readFile(path.join(root,'src',name),'utf8'))
);
const systemStandalone = systemHtml
  .replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`)
  .replace('<link rel="stylesheet" href="system.css">', `<style>\n${systemCss}\n</style>`)
  .replaceAll('href="./', 'href="one-gateway-api-brief.html')
  .replace('href="visuals.html"', 'href="one-visuals-draft.html"')
  .replace('href="walkthrough.html"', 'href="one-api-walkthrough.html"')
  .replace('href="flow.html"', 'href="one-flow-delivery.html"')
  .replaceAll('href="flow-experience.html"', 'href="one-flow-experience.html"');
await writeFile(path.join(dist,'one-system-map.html'), systemStandalone);
// Refresh linked assets together when a local page changes.
const revision = createHash('sha256').update(css + data + app + visualCss + visualJs + systemCss).digest('hex').slice(0,12);
for (const [name, markup] of [['index.html', html], ['visuals.html', visualHtml], ['system.html', systemHtml]]) {
  await writeFile(path.join(dist,name), markup.replace(/(src|href)="([^"\s]+\.(?:css|js))"/g, `$1="$2?v=${revision}"`));
}
const walkthrough = await buildWalkthrough(root,dist);
await buildFlow(root,dist);
console.log(`Built six workbook pages, including the static walkthrough (${walkthrough.sections} sections, ${walkthrough.steps} steps) and Flow delivery/API and collection specification pages, with standalone HTML and Markdown.`);
