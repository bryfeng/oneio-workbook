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
  const address=draftBody(2).fromAddress;
  payer.mode=/^0x[0-9a-f]{40}$/i.test(address || '') ? 'address' : 'example';payer.wallet=payer.mode==='address'?address:'';payer.step='method';payer.error='';
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
  $('#editor-help').textContent = activeTab === 'headers' ? 'Edit JSON headers. Keep authentication placeholders; the real credentials stay on the protected backend.' : selected === 1 ? 'GET has no request body. Verification checks the saved invoice and settlement against your Create request.' : '{{flowId}} comes from Create. {{sourceAddress}} and {{destinationAddress}} generate synthetic addresses. Individual requests stay open. Cancel closes the Flow; Run quote sequence includes cancellation.';
  shownRecord = history.findLast(c => c.label === operations[selected]);
  renderResponse();
}
function renderResponse() {
  $('#response-meta').textContent = shownRecord ? `${shownRecord.status ? `HTTP ${shownRecord.status}` : 'Error'} · ${shownRecord.durationMs ?? 0} ms` : 'Not sent';
  document.querySelectorAll('[data-result]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.result === resultTab)));
  $('#response-content').textContent = shownRecord ? serialize(resultTab === 'request' ? { method: shownRecord.method, url: shownRecord.url, headers: shownRecord.headers, ...(shownRecord.body ? { body: shownRecord.body } : {}) } : shownRecord.response ?? { error: shownRecord.error }) : 'Send a request to see the real provider response here.';
  $('#call-history').innerHTML = history.map((c, i) => `<button type="button" data-history="${i}" title="Inspect ${esc(c.label)} response">${esc(c.label)} ${c.status || 'error'}</button>`).join('');
}
const chainName = id => ({'8453':'Base','1':'Ethereum','42161':'Arbitrum','84532':'Base Sepolia'}[id] || `Chain ${id}`);
const dollars = value => Number.isFinite(Number(value)) ? '$'+Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4}) : 'Not returned';
const shortAddress = value => /^0x[0-9a-f]{40}$/i.test(value || '') ? value.slice(0,6)+'…'+value.slice(-4) : value;
let payer = { step:'method', mode:'example', wallet:'', error:'' }, creationDraft, sourceDraft;
function draftBody(index) { try { return parsed(index).body || {}; } catch { return {}; } }
function checkoutTokens() {
  const source = draftBody(2), quote = draftBody(3);
  const tokens = String(source.fromChainId) === '8453' ? [
    {address:'0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',symbol:'USDC',name:'USD Coin'},
    {address:'0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',symbol:'EURC',name:'Euro Coin'},
    {address:'0x0000000000000000000000000000000000000000',symbol:'ETH',name:'Ether'},
  ] : [];
  if (quote.fromTokenAddress && !tokens.some(t=>t.address.toLowerCase()===quote.fromTokenAddress.toLowerCase())) tokens.unshift({address:quote.fromTokenAddress,symbol:'Token',name:'Configured token'});
  return tokens;
}
function renderQuote() {
  const invoice = draftBody(0), source = draftBody(2), request = draftBody(3), d=context?.display, q=context?.quote;
  const check=context?.invoiceCheck || {status:'not-checked'}, tokens=checkoutTokens();
  const active=tokens.find(t=>t.address.toLowerCase()===request.fromTokenAddress?.toLowerCase());
  const review=payer.step==='review' && d;
  const stale=Boolean(d && resultDrafts!==fingerprint());
  const receiver=invoice.settlementConfig?.settlements?.[0];
  const amount=review ? context.invoice.amount : invoice.amount || '—';
  const currency=review ? context.invoice.currency : invoice.currency || '';
  const notice = d && check.status!=='matched' ? `<div class="checkout-notice"><strong>${check.status==='rejected' ? 'Amount difference under review' : 'Conversion check pending'}</strong><p>${check.expected ? `Requested ${esc(check.expected)} ${esc(check.symbol)}; the provider returned ${esc(d.to)} ${esc(d.toSymbol)}.` : esc(check.message)} You can continue exploring this preview.</p></div>` : '';
  const wallet = context?.source?.fromAddress || payer.wallet;
  const pair = (label,value) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`;
  $('#result-region').innerHTML=`<div class="checkout-stage"><div class="checkout-card">
    <aside class="checkout-invoice"><div class="merchant-mark" aria-hidden="true">↗</div><span class="checkout-kicker">PAYMENT REQUEST</span><h3>Complete your payment</h3><div class="invoice-amount">${esc(amount)} <span>${esc(currency)}</span></div><p>Pay from your wallet using the token you prefer.</p><dl>${pair('Merchant settlement',`${review ? d.toSymbol : receiver?.symbol || 'Token'} · ${chainName(review ? d.toChainId : receiver?.chainId)}`)}${pair('Reference',context?.flowId ? shortAddress(context.flowId.slice(0,8)) : 'Checkout preview')}</dl><div class="checkout-preview-label">Interactive preview · no funds sent</div></aside>
    <div class="checkout-body"><ol class="checkout-steps" aria-label="Checkout progress"><li ${!review?'aria-current="step"':''}>1 <span>Payment method</span></li><li ${review?'aria-current="step"':''}>2 <span>Review</span></li></ol>
    ${payer.error ? `<p class="checkout-error" role="alert">${esc(payer.error)}</p>` : ''}
    ${review ? `<div class="checkout-review"><span class="checkout-kicker">YOU WOULD PAY</span><h3>${esc(d.from)} <span>${esc(d.fromSymbol)}</span></h3><p class="checkout-subtitle">${esc(chainName(d.fromChainId))} · ${payer.mode==='example' ? 'Example wallet' : 'Wallet'} ${esc(shortAddress(wallet || ''))}</p>
      ${stale ? '<div class="checkout-notice"><strong>Requests have changed</strong><p>This quote uses the previous request. Refresh it to use your edits.</p></div>' : ''}${notice}
      <dl class="checkout-breakdown">${pair('Merchant quoted receipt',`${d.to} ${d.toSymbol}`)}${pair('Network',`${chainName(d.fromChainId)} → ${chainName(d.toChainId)}`)}${pair('Provider fees',q.fees?.totalFeeUsd != null ? dollars(q.fees.totalFeeUsd) : 'Not returned')}${pair('Estimated gas',q.fees?.gasEstimate?.usdValue != null ? dollars(q.fees.gasEstimate.usdValue) : 'Not returned')}${pair('Estimated time',q.estimatedTimeSec ? q.estimatedTimeSec+' seconds' : 'Not returned')}</dl>
      <p class="checkout-quote-age" data-quote-age></p><button class="primary checkout-main-action" data-checkout="quote" ${running?'disabled':''}>${running?'Getting live quote…':'Refresh live quote ↻'}</button><button class="checkout-text-button" data-checkout="method" ${running?'disabled':''}>← Change payment method</button><p class="checkout-footnote">This preview stops at quote review. No wallet approval or payment is submitted.</p></div>` : `<h3>Choose how to pay</h3><p class="checkout-subtitle">Select your wallet and payment token.</p><div class="wallet-options"><button data-checkout="example" class="wallet-option ${payer.mode==='example'?'selected':''}" aria-pressed="${payer.mode==='example'}" ${running?'disabled':''}><span class="wallet-icon">◇</span><span><strong>Example wallet</strong><small>Explore without connecting</small></span><span class="selection-dot"></span></button><button data-checkout="wallet" class="wallet-option ${payer.mode==='wallet'?'selected':''}" aria-pressed="${payer.mode==='wallet'}" ${running?'disabled':''}><span class="wallet-icon">▣</span><span><strong>${payer.mode==='wallet' && payer.wallet ? shortAddress(payer.wallet) : 'Connect wallet'}</strong><small>Use your browser wallet</small></span><span class="selection-dot"></span></button></div>
      <details class="wallet-address-option" ${payer.mode==='address'?'open':''}><summary>Use a wallet address</summary><label for="checkout-wallet-address">EVM wallet address</label><input id="checkout-wallet-address" placeholder="0x…" value="${esc(payer.mode==='address'?payer.wallet:'')}" spellcheck="false" ${running?'disabled':''}></details>
      <div class="checkout-token-heading"><span>Pay with</span><span>${esc(chainName(source.fromChainId))}</span></div><div class="checkout-token-options" role="group" aria-label="Payment token">${tokens.map(t=>`<button data-checkout-token="${esc(t.address)}" class="checkout-token ${active===t?'selected':''}" aria-pressed="${active===t}" ${running?'disabled':''}><span class="token-mark ${t.symbol.toLowerCase()}">${esc(t.symbol==='ETH'?'◆':t.symbol[0])}</span><span><strong>${esc(t.symbol)}</strong><small>${esc(t.name)}</small></span><span class="selection-dot"></span></button>`).join('')}</div>
      <button class="primary checkout-main-action" data-checkout="quote" ${running || !config.connected?'disabled':''}>${running?'Getting live quote…':'Get live quote →'}</button><p class="checkout-footnote">Live pricing for your selected token. Review the route and amounts before any payment.</p>`}
    </div></div><div class="checkout-caption"><span>White-label checkout · powered by the Flow API</span>${context?.flowId ? `<button data-checkout="close" ${running || context.state==='cancelled'?'disabled':''}>${context.state==='cancelled'?'Live session closed':'Close preview session'}</button>` : '<span>Live quotes · no key needed</span>'}</div></div>`;
  updateQuoteAge();
}
function updateQuoteAge() {
  const el=$('[data-quote-age]'); if(!el) return;
  const expires=Date.parse(context?.quote?.expiresAt), seconds=Math.ceil((expires-Date.now())/1000);
  el.textContent=context?.state==='cancelled' ? 'Quote snapshot · refresh to open a live session.' : Number.isFinite(seconds) ? seconds>0 ? `Live quote · ${seconds}s until repricing is needed` : 'Quote expired · refresh for current pricing.' : 'Returned provider quote';
}
function replaceBody(index, patch) { drafts[index].body=serialize({...parsed(index).body,...patch}); }
async function checkoutRequest(index) {
  const response=await apiRequest({contextId:context?.contextId,requests:[parsed(index)],keepOpen:true});
  const result=await response.json();
  history.push(...(result.calls || []));
  if(result.context) context=result.context;
  if(result.error || !response.ok) {
    if(!result.context && result.error?.includes('session was cleared')) context=undefined;
    throw Error(result.error || 'The quote request could not complete.');
  }
  if(index===0) creationDraft=serialize(parsed(0));
  if(index===2) sourceDraft=serialize(parsed(2));
}
async function closeCheckout() {
  if(!context?.contextId || context.state==='cancelled') return;
  const response=await apiRequest({contextId:context.contextId,close:true});const result=await response.json();
  history.push(...(result.calls || []));if(result.context) context=result.context;
  if(result.error || !response.ok || (result.context?.flowId && result.context.cleanup?.status!=='cancelled')) throw Error(result.error || result.context?.cleanup?.message || 'Could not confirm closure.');
}
async function requestCheckoutQuote() {
  if(running) return;
  payer.error='';
  try {
    for(const index of [0,1,2,3]) parsed(index);
    const requestedSource=draftBody(2);
    if(requestedSource.fromChainName!=='EVM') throw Error('This payer preview currently supports EVM wallets. Other chains remain available in the API editor.');
    if(payer.mode!=='example' && !/^0x[0-9a-f]{40}$/i.test(payer.wallet)) throw Error('Enter a valid wallet address or choose the example wallet.');
    replaceBody(2,{fromAddress:payer.mode==='example' ? '{{sourceAddress}}' : payer.wallet});
    lock(true);renderQuote();message('Getting live pricing for the checkout…');
    if(context && (creationDraft!==serialize(parsed(0)) || Date.parse(context.expiresAt)<=Date.now())) {await closeCheckout();context=undefined;}
    if(!context || context.state==='cancelled') {context=undefined;history=[];await checkoutRequest(0);}
    if(!context.verified) await checkoutRequest(1);
    if(sourceDraft!==serialize(parsed(2)) || !context.source) await checkoutRequest(2);
    await checkoutRequest(3);
    resultDrafts=fingerprint();payer.step='review';selected=3;
    message('Live quote ready. The checkout remains open for review and repricing.');
  } catch(error) {payer.error=error.message;message(error.message,true);}
  finally {lock(false);renderEditor();renderQuote();updateSession();if(!payer.error) $('#checkout-preview').scrollIntoView({behavior:'smooth',block:'start'});}
}
$('#result-region').addEventListener('input',e=>{
  if(e.target.id==='checkout-wallet-address') {payer.mode='address';payer.wallet=e.target.value.trim();for(const button of document.querySelectorAll('.wallet-option')) {button.classList.remove('selected');button.setAttribute('aria-pressed','false');}}
});
$('#result-region').addEventListener('click',async e=>{
  const token=e.target.closest('[data-checkout-token]'), button=e.target.closest('[data-checkout]');
  if(running || (!button && !token)) return;
  if(token) {replaceBody(3,{fromTokenAddress:token.dataset.checkoutToken});payer.error='';changed();renderEditor();return;}
  const action=button.dataset.checkout;
  if(action==='quote') {await requestCheckoutQuote();return;}
  if(action==='method') {payer.step='method';payer.error='';renderQuote();$('#checkout-preview').scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(action==='example') {payer.mode='example';payer.wallet='';payer.error='';replaceBody(2,{fromAddress:'{{sourceAddress}}'});renderEditor();renderQuote();return;}
  if(action==='wallet') {
    payer.error='';
    if(!window.ethereum?.request) {payer.mode='address';payer.error='No browser wallet found. Paste a wallet address below or use the example wallet.';renderQuote();return;}
    lock(true);
    try {
      const accounts=await window.ethereum.request({method:'eth_requestAccounts'});
      if(!accounts?.[0]) throw Error('No wallet account was selected.');
      payer.wallet=accounts[0];payer.mode='wallet';
    } catch(error) {payer.error=error.code===4001?'Wallet connection cancelled.':error.message;}
    finally {lock(false);renderQuote();}return;
  }
  if(action==='close') {lock(true);try {await closeCheckout();message('Live session closed. The quote remains available to explore.');}catch(error){payer.error=error.message;}finally{lock(false);renderEditor();renderQuote();updateSession();}}
});
setInterval(updateQuoteAge,1000);
function changed() { $('#draft-status').textContent = 'Edited drafts'; renderQuote(); }
function lock(value) {
  running = value;
  for (const el of document.querySelectorAll('#run-sequence,#send-request,#new-session,#apply-parameters,#format-json,#request-method,#request-url,#request-content,#quote-form input,#quote-form select')) el.disabled = value || (el.id === 'format-json' && activeTab === 'curl') || (['run-sequence','send-request'].includes(el.id) && !config.connected);
  $('#run-sequence').textContent = value ? 'Requesting…' : 'Run quote sequence ↗';
  for(const el of document.querySelectorAll('[data-checkout],[data-checkout-token],#checkout-wallet-address')) el.disabled=value || (el.dataset.checkout==='quote' && !config.connected) || (el.dataset.checkout==='close' && context?.state==='cancelled');
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
    const response = await apiRequest({ contextId: context?.contextId, requests, sequence, keepOpen: !sequence });
    const result = await response.json();
    if(response.status===401) { saveSession(undefined); config.connected=false; renderConnection(); }
    if (sequence && result.context?.contextId !== context?.contextId) history = [];
    history.push(...(result.calls || []));
    if (result.context) context = result.context;
    if (result.calls?.some(c => c.label === 'create')) creationDraft=serialize(parsed(0));
    if (result.calls?.some(c => c.label === 'source')) sourceDraft=serialize(parsed(2));
    if (result.calls?.some(c => c.label === 'quote') && context?.display) payer.step='review';
    if (context?.quote && result.calls?.some(c => c.label === 'quote')) resultDrafts = sentDrafts;
    if (sequence && result.calls?.some(c => c.label === 'quote')) selected = 3;
    const cleanup = context?.cleanup;
    message((result.error ? result.error + (['unconfirmed','unknown'].includes(cleanup?.status) ? ' ' + cleanup.message : '') : '') || (cleanup?.status === 'unconfirmed' || cleanup?.status === 'unknown' ? cleanup.message : cleanup?.status === 'cancelled' ? 'Quote captured. Explore the checkout preview above, or inspect the response here.' : `Request complete. ${cleanup?.message || ''}`), Boolean(result.error) || ['unconfirmed','unknown'].includes(cleanup?.status));
    renderEditor(); renderQuote(); updateSession();
  } catch { message('Connection interrupted. The server may still be completing the request; do not assume that creation or cancellation failed.', true); }
  finally { lock(false); }
}
document.querySelectorAll('[data-result]').forEach(b => b.addEventListener('click', () => { resultTab = b.dataset.result; renderResponse(); }));
$('#request-list').addEventListener('click', e => { const b = e.target.closest('[data-index]'); if (b) { selected = Number(b.dataset.index); renderEditor(); } });
$('#call-history').addEventListener('click', e => { const b = e.target.closest('[data-history]'); if (b) { shownRecord = history[Number(b.dataset.history)]; renderResponse(); } });
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { activeTab = b.dataset.tab; renderEditor(); }));
$('#request-content').addEventListener('input', e => { drafts[selected][activeTab] = e.target.value; if(selected===2 && activeTab==='body') {const address=draftBody(2).fromAddress;if(/^0x[0-9a-f]{40}$/i.test(address || '')) {payer.mode='address';payer.wallet=address;}else if(address==='{{sourceAddress}}') {payer.mode='example';payer.wallet='';}} changed(); });
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
    context = undefined; history = []; shownRecord = undefined; payer.step='method';payer.error='';
    renderQuote(); renderEditor(); updateSession(); message('New session ready. Your edited requests are unchanged.');
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
