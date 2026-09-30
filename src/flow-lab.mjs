import { HOSTED_API } from './flow-lab-config.mjs';
import { validate, previewCalls, curl } from './flow-lab-shared.mjs';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels = ['Create payment', 'Verify config', 'Attach source', 'Get quote', 'Cancel preview'];
const operations = ['create', 'verify', 'source', 'quote', 'cancel'];
const form = $('#quote-form');
const local = ['localhost','127.0.0.1'].includes(location.hostname);
const apiBase = local ? '' : HOSTED_API;
let browserSession;
try { browserSession = JSON.parse(sessionStorage.getItem('oneio-flow-lab-session')); if(browserSession?.expiresAt<=Date.now()) browserSession=undefined; } catch {}
const apiHeaders = () => ({ 'Content-Type':'application/json', ...(!local && browserSession ? { Authorization:'Bearer '+browserSession.token } : {}) });
const apiRequest = async payload => {
  if (!local && (!browserSession || browserSession.expiresAt <= Date.now())) await readConfig();
  return fetch(apiBase+'/api/request', {method:'POST',headers:apiHeaders(),body:JSON.stringify({...payload,requestId:crypto.randomUUID()})});
};
function saveSession(session) {
  browserSession=session;
  try { if(session) sessionStorage.setItem('oneio-flow-lab-session',JSON.stringify(session)); else sessionStorage.removeItem('oneio-flow-lab-session'); } catch {}
}

let config = { environmentId: '<ENVIRONMENT_ID>', connected: false };
let drafts = [], selected = 0, activeTab = 'body', context, running = false, history = [], resultDrafts, shownRecord, resultTab = 'response';
const serialize = value => JSON.stringify(value, null, 2);
const fingerprint = () => JSON.stringify(drafts);
function parameters() {
  const p = Object.fromEntries(new FormData(form));
  for (const key of ['pegStablecoins','disableSwaps']) p[key] = form.elements[key].checked;
  return validate(p);
}
function message(text, error = false) { $('#message').hidden = !text; $('#message').textContent = text; $('#message').classList.toggle('error', error); }
function loadParameters() {
  const p = parameters();
  drafts = previewCalls(p, config.environmentId).map(c => ({
    method: c.method,
    url: c.url.replace(config.environmentId, '{{environmentId}}').replace('<FLOW_ID>', '{{flowId}}'),
    headers: serialize(c.headers),
    body: c.body ? serialize(c.body).replaceAll('<GENERATED_DESTINATION_ADDRESS>', '{{destinationAddress}}').replaceAll('<GENERATED_SOURCE_ADDRESS>', '{{sourceAddress}}') : '',
  }));
  $('#parameter-summary').textContent = `${p.amount} ${p.currency} · settlement ${p.settlementSymbol} · chain ${p.settlementChainId}`;
  $('#draft-status').textContent = 'Editable collection';
  renderEditor(); renderQuote();
}
function parsed(index) {
  const d = drafts[index];
  let headers, body;
  try { headers = JSON.parse(d.headers); } catch { throw Error(`${labels[index]}: headers are not valid JSON.`); }
  try { body = d.body.trim() ? JSON.parse(d.body) : undefined; } catch { throw Error(`${labels[index]}: body is not valid JSON.`); }
  if (!headers || Array.isArray(headers) || typeof headers !== 'object') throw Error(`${labels[index]}: headers must be a JSON object.`);
  return { method: d.method, url: d.url, headers, ...(body !== undefined ? { body } : {}) };
}
function renderEditor() {
  $('#request-list').innerHTML = labels.map((label, i) => `<button type="button" data-index="${i}" aria-current="${i === selected ? 'step' : 'false'}"><span>0${i+1}</span>${label}<small>${esc(drafts[i].method)}${history.findLast(c => c.label === operations[i])?.status ? ` · ${history.findLast(c => c.label === operations[i]).status}` : ''}</small></button>`).join('');
  const d = drafts[selected];
  $('#request-method').value = d.method;
  $('#request-url').value = d.url;
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === activeTab)));
  $('#request-content').hidden = activeTab === 'curl'; $('#curl-content').hidden = activeTab !== 'curl';
  $('#format-json').disabled = activeTab === 'curl';
  if (activeTab === 'curl') {
    try { $('#curl-content').textContent = curl(parsed(selected)); }
    catch (e) { $('#curl-content').textContent = e.message; }
  } else $('#request-content').value = d[activeTab];
  $('#editor-help').textContent = activeTab === 'headers' ? 'Edit JSON headers. Keep authentication placeholders; the real credentials stay on the protected backend.' : selected === 1 ? 'GET has no request body. Verification checks the saved invoice and settlement against your Create request.' : '{{flowId}} comes from Create. {{sourceAddress}} and {{destinationAddress}} generate synthetic addresses. Quote automatically triggers cancellation.';
  shownRecord = history.findLast(c => c.label === operations[selected]);
  renderResponse();
}
function renderResponse() {
  $('#response-meta').textContent = shownRecord ? `${shownRecord.status ? `HTTP ${shownRecord.status}` : 'Error'} · ${shownRecord.durationMs ?? 0} ms` : 'Not sent';
  document.querySelectorAll('[data-result]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.result === resultTab)));
  $('#response-content').textContent = shownRecord ? serialize(resultTab === 'request' ? { method: shownRecord.method, url: shownRecord.url, headers: shownRecord.headers, ...(shownRecord.body ? { body: shownRecord.body } : {}) } : shownRecord.response ?? { error: shownRecord.error }) : 'Send a request to see the real provider response here.';
  $('#call-history').innerHTML = history.map((c, i) => `<button type="button" data-history="${i}" title="Inspect ${esc(c.label)} response">${esc(c.label)} ${c.status || 'error'}</button>`).join('');
}
function renderQuote() {
  if (!context?.display) return;
  const d = context.display, q = context.quote, check = context.invoiceCheck || { status: 'not-checked' };
  const rejected = check.status === 'rejected';
  const stale = resultDrafts !== fingerprint();
  const tag = rejected ? 'Merchant amount not met' : check.status === 'matched' ? 'Merchant amount matches' : 'Invoice amount unverified';
  const metric = (label, value, detail, cls = '') => `<div class="${cls}"><small>${esc(label)}</small><strong>${esc(value)}</strong><em>${esc(detail)}</em></div>`;
  const network = id => ({ '8453':'Base', '1':'Ethereum', '84532':'Base Sepolia' }[id] || `Chain ${id}`);
  $('#result-region').innerHTML = `${stale ? '<p class="stale-note">Requests changed. This is the previous quote; run the sequence to refresh.</p>' : ''}<div class="quote-card ${rejected ? 'rejected' : ''}"><div class="quote-status"><strong>${tag}</strong><span>${context.cleanup?.status === 'cancelled' ? 'Preview flow cancelled' : 'Check cleanup status'}</span></div><div class="quote-values">${metric('Payer would send', `${d.from} ${d.fromSymbol}`, network(d.fromChainId))}${metric('Merchant must receive', check.expected ? `${check.expected} ${check.symbol}` : `${context.invoice.amount} ${context.invoice.currency}`, 'Requested invoice target')}${metric('Provider quoted delivery', `${d.to} ${d.toSymbol}`, rejected && check.reason === 'shortfall' ? `${check.difference} ${check.symbol} short` : network(d.toChainId), rejected ? 'shortfall' : '')}</div><div class="quote-details"><span>Fees: ${q.fees?.totalFeeUsd != null ? '$' + esc(q.fees.totalFeeUsd) : 'not returned'} · estimated gas: ${q.fees?.gasEstimate?.usdValue != null ? '$' + esc(q.fees.gasEstimate.usdValue) : 'not returned'}</span><span>${esc(check.message)}</span></div></div>`;
}
function changed() { $('#draft-status').textContent = 'Edited drafts'; renderQuote(); }
function lock(value) {
  running = value;
  for (const el of document.querySelectorAll('#run-sequence,#send-request,#new-session,#apply-parameters,#format-json,#request-method,#request-url,#request-content,#quote-form input,#quote-form select')) el.disabled = value || (el.id === 'format-json' && activeTab === 'curl') || (['run-sequence','send-request'].includes(el.id) && !config.connected);
  $('#run-sequence').textContent = value ? 'Requesting…' : 'Run quote sequence ↗';
}
function updateSession() {
  $('#session-state').textContent = context?.flowId ? `Flow ${context.flowId} · ${context.state}${context.expiresAt && context.state !== 'cancelled' ? ` · expires ${new Date(context.expiresAt).toLocaleTimeString()}` : ''}` : 'No Flow created';
}
async function send(sequence) {
  if (running) return;
  let requests;
  try { requests = sequence ? drafts.map((_, i) => parsed(i)) : [parsed(selected)]; }
  catch (e) { message(e.message, true); return; }
  const sentDrafts = fingerprint();
  lock(true); message(sequence ? 'Running the edited requests. The unused Flow will be cancelled after quoting.' : 'Sending the edited request…');
  try {
    const response = await apiRequest({ contextId: context?.contextId, requests, sequence });
    const result = await response.json();
    if(response.status===401) { saveSession(undefined); config.connected=false; renderConnection(); }
    if (sequence && result.context?.contextId !== context?.contextId) history = [];
    history.push(...(result.calls || []));
    if (result.context) context = result.context;
    if (context?.quote && result.calls?.some(c => c.label === 'quote')) resultDrafts = sentDrafts;
    if (sequence && result.calls?.some(c => c.label === 'quote')) selected = 3;
    const cleanup = context?.cleanup;
    message((result.error ? result.error + (['unconfirmed','unknown'].includes(cleanup?.status) ? ' ' + cleanup.message : '') : '') || (cleanup?.status === 'unconfirmed' || cleanup?.status === 'unknown' ? cleanup.message : cleanup?.status === 'cancelled' ? 'Quote preview closed. Inspect the response and checkout amounts below.' : `Request complete. ${cleanup?.message || ''}`), Boolean(result.error) || ['unconfirmed','unknown'].includes(cleanup?.status));
    renderEditor(); renderQuote(); updateSession();
  } catch { message('Connection interrupted. The server may still be completing the request; do not assume that creation or cancellation failed.', true); }
  finally { lock(false); }
}
document.querySelectorAll('[data-result]').forEach(b => b.addEventListener('click', () => { resultTab = b.dataset.result; renderResponse(); }));
$('#request-list').addEventListener('click', e => { const b = e.target.closest('[data-index]'); if (b) { selected = Number(b.dataset.index); renderEditor(); } });
$('#call-history').addEventListener('click', e => { const b = e.target.closest('[data-history]'); if (b) { shownRecord = history[Number(b.dataset.history)]; renderResponse(); } });
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { activeTab = b.dataset.tab; renderEditor(); }));
$('#request-content').addEventListener('input', e => { drafts[selected][activeTab] = e.target.value; changed(); });
$('#request-url').addEventListener('input', e => { drafts[selected].url = e.target.value; changed(); });
$('#request-method').addEventListener('change', e => { drafts[selected].method = e.target.value; changed(); });
$('#format-json').addEventListener('click', () => { try { drafts[selected][activeTab] = serialize(JSON.parse(drafts[selected][activeTab])); renderEditor(); changed(); } catch { message('This is not valid JSON. Correct it before formatting or sending.', true); } });
form.addEventListener('input', () => { $('#parameter-summary').textContent = 'Parameters changed · apply to replace the request drafts'; });
form.addEventListener('submit', e => { e.preventDefault(); try { loadParameters(); message('Parameters applied to the editable request collection.'); } catch (e) { message(e.message, true); } });
$('#run-sequence').addEventListener('click', () => send(true));
$('#send-request').addEventListener('click', () => send(false));
$('#new-session').addEventListener('click', async () => {
  if (running) return;
  lock(true);
  try {
    if (context?.contextId) {
      const r = await apiRequest({ contextId: context.contextId, close: true });
      const result = await r.json();
      if (result.error || (result.context?.flowId && result.context.cleanup?.status !== 'cancelled')) throw Error(result.error || result.context.cleanup.message);
    }
    context = undefined; history = []; shownRecord = undefined;
    $('#result-region').innerHTML = '<div class="empty-preview"><strong>Ready for a new quote.</strong><p>Your edited requests are kept. Start with Create or run the sequence.</p></div>';
    renderEditor(); updateSession(); message('New session ready. Your edited requests are unchanged.');
  } catch (e) { message(e.message, true); }
  finally { lock(false); }
});
async function copy(button, text) { try { await navigator.clipboard.writeText(text); button.textContent = 'Copied'; } catch { button.textContent = 'Select & copy'; } setTimeout(() => { button.textContent = 'Copy'; }, 1600); }
$('#copy-request').addEventListener('click', e => copy(e.target, activeTab === 'curl' ? $('#curl-content').textContent : drafts[selected][activeTab]));
$('#copy-response').addEventListener('click', e => copy(e.target, $('#response-content').textContent));
window.addEventListener('pagehide', () => {
  if (context?.contextId && context.state !== 'cancelled') fetch(apiBase+'/api/request', {method:'POST',headers:apiHeaders(),body:JSON.stringify({contextId:context.contextId,close:true,requestId:crypto.randomUUID()}),keepalive:true}).catch(()=>{});
});
function renderConnection() {
  $('#connection').textContent=config.connected ? '● Live API connected' : local ? 'Local API key needed' : 'Backend unavailable';
  $('#environment-label').textContent=config.environmentId ? `Environment ${config.environmentId}` : 'Quote backend';
}
async function readConfig() {
  const response=await fetch(apiBase+'/api/config',{headers:apiHeaders()});
  const data=await response.json(); if(!response.ok) throw Error(data.error || 'The backend is unavailable.');
  if(!local && !data.connected) {
    const connection=await fetch(apiBase+'/api/session',{method:'POST'});
    const session=await connection.json(); if(!connection.ok) throw Error(session.error || 'Could not connect.');
    saveSession(session);
    data.connected=true;
  }
  config=data;
  renderConnection();
}
let connectionError;
try { await readConfig(); }
catch(error) { connectionError=error.message; $('#connection').textContent='Backend unavailable'; }
loadParameters(); lock(false);
if (!config.connected) message(connectionError || (local ? 'Configure the local server credential to send requests.' : 'Could not connect. Reload the page to try again.'),true);
