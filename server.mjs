import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { createRequestLab } from './server/request-lab.mjs';

const port = Number(process.env.PORT || 4318);
const environment = process.env.DYNAMIC_ENVIRONMENT_ID || '3608a494-ff5c-4cbc-a425-ddc382e4a90a';
const token = process.env.DYNAMIC_API_TOKEN;
const lab = createRequestLab({ environment, token });
const publicFiles = new Set(await readdir(new URL('./dist/', import.meta.url)));
const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', md: 'text/markdown' };
let busy = false;
const server = createServer(async (req, res) => {
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  if (!hosts.includes(req.headers.host) || (req.headers.origin && !hosts.map(h => `http://${h}`).includes(req.headers.origin))) return send(403, { error: 'Local, same-origin access only.' });
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname === '/api/config' && req.method === 'GET') return send(200, { environmentId: environment, connected: Boolean(token), quoteOnly: true });
  if (url.pathname === '/api/request' && req.method === 'POST') {
    if (!token) return send(503, { error: 'Set DYNAMIC_API_TOKEN on the local server to send live requests.' });
    if (busy) return send(409, { error: 'A request is still running. Wait for its response.' });
    if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'Send application/json.' });
    let input;
    try {
      let body = '';
      for await (const part of req) { body += part; if (Buffer.byteLength(body) > 64000) throw Error('Request exceeds 64 KB.'); }
      input = JSON.parse(body);
    } catch (e) { return send(400, { error: e.message }); }
    if (busy) return send(409, { error: 'A request is still running.' });
    busy = true;
    try { send(200, await lab.execute(input)); }
    catch (e) { send(400, { error: e.message }); }
    finally { busy = false; }
    return;
  }
  const file = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  if (req.method === 'GET' && publicFiles.has(file) && types[file.split('.').pop()]) {
    res.writeHead(200, { 'Content-Type': `${types[file.split('.').pop()]}; charset=utf-8` });
    res.end(await readFile(new URL(`./dist/${file}`, import.meta.url))); return;
  }
  send(404, { error: 'Not found.' });
});
server.requestTimeout = 160000;
server.listen(port, '127.0.0.1', () => console.log(`ONE workbook at http://127.0.0.1:${port}/flow-lab.html · ${token ? 'API connected' : 'preview only'}`));
