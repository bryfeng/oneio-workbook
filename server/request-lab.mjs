import { randomBytes, randomUUID } from 'node:crypto';
import { API, normalizeQuote, checkInvoiceAmount } from '../src/flow-lab-shared.mjs';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const matchesRequested = (actual, expected) => Array.isArray(expected) ? Array.isArray(actual) && actual.length === expected.length && expected.every((v, i) => matchesRequested(actual[i], v)) : object(expected) ? object(actual) && Object.entries(expected).every(([k, v]) => matchesRequested(actual[k], v)) : actual === expected;
const address = () => '0x' + randomBytes(20).toString('hex');
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const normalizeAmount = value => String(value).replace(/^0+(?=\d)/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

export function createRequestLab({ environment, token, fetcher = fetch, initialContexts = [], persist = async () => {} }) {
  const contexts = new Map(initialContexts.map(c => [c.id, c]));
  const secrets = new Set([token, ...initialContexts.map(c => c.session).filter(Boolean)]);
  const checkpoint = () => persist(structuredClone([...contexts.values()]));
  function redact(value) {
    if (Array.isArray(value)) return value.map(redact);
    if (object(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /^(authorization|sessionToken|x-dynamic-flow-session-token|signature|signingPayload|calldata)$/i.test(key) ? '<SERVER_HELD_SECRET>' : redact(item)]));
    return typeof value === 'string' ? [...secrets].filter(Boolean).reduce((s, secret) => s.replaceAll(secret, '<REDACTED>'), value).replace(/\b(?:dyn_|dft_)[A-Za-z0-9_.-]+/g, '<REDACTED>') : value;
  }
  const snapshot = c => redact({ contextId: c.id, flowId: c.flowId, verified: c.verified, state: c.state, expiresAt: c.expiresAt, addresses: c.addresses, source: c.source, invoice: c.invoice, quote: c.quote, display: c.display, invoiceCheck: c.invoiceCheck, cleanup: c.cleanup });
  function resolve(value, c, preflight = false) {
    const vars = { environmentId: environment, flowId: c.flowId || (preflight ? '11111111-1111-4111-8111-111111111111' : undefined), sourceAddress: c.addresses.source, destinationAddress: c.addresses.destination };
    if (typeof value === 'string') return value.replace(/\{\{(\w+)\}\}/g, (_, key) => { if (!vars[key]) throw Error(`No ${key} yet. Send the preceding requests first.`); return vars[key]; });
    if (Array.isArray(value)) return value.map(v => resolve(v, c, preflight));
    if (object(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolve(v, c, preflight)]));
    return value;
  }
  function validateRequest(request, c, preflight = false) {
    if (!object(request)) throw Error('A request object is required.');
    const method = String(request.method || '').toUpperCase();
    const rawUrl = resolve(String(request.url || ''), c, preflight);
    const url = new URL(rawUrl);
    if (url.origin !== new URL(API).origin || url.username || url.password || url.search || url.hash) throw Error('Use the Dynamic Flow API URL without credentials, query parameters, or fragments.');
    const escapedEnv = environment.replaceAll('-', '\\-');
    const match = url.pathname.match(new RegExp(`^/api/v0/(server|sdk)/${escapedEnv}/flow/(payment|[a-f0-9-]+)(?:/(source|quote|cancel))?$`, 'i'));
    if (!match) throw Error('Only create, verify, source, quote and cancel in this environment are available.');
    const [, surface, id, action] = match;
    const operation = surface === 'server' && id === 'payment' && !action ? 'create' : surface === 'server' && uuid.test(id) && !action ? 'verify' : surface === 'sdk' && uuid.test(id) && action ? action : null;
    if (!operation || method !== (operation === 'verify' ? 'GET' : 'POST')) throw Error('The method does not match a supported Flow operation.');
    if (operation !== 'create' && id !== (c.flowId || (preflight ? '11111111-1111-4111-8111-111111111111' : undefined))) throw Error('Only the Flow created in this lab session can be used.');
    const body = request.body === undefined ? undefined : resolve(request.body, c, preflight);
    if (method === 'POST' && !object(body)) throw Error('The request body must be a JSON object.');
    if (method === 'GET' && body !== undefined) throw Error('GET requests have no body.');
    const headers = request.headers || {};
    if (!object(headers)) throw Error('Headers must be a JSON object.');
    for (const [key, value] of Object.entries(headers)) {
      if (!['accept', 'content-type', 'authorization', 'x-dynamic-flow-session-token'].includes(key.toLowerCase())) throw Error(`Header ${key} is not supported in this quote lab.`);
      if (typeof value !== 'string' || /[\r\n]/.test(value)) throw Error('Header values must be single-line strings.');
      if (/^(authorization|x-dynamic-flow-session-token)$/i.test(key) && !['Bearer <DYNAMIC_API_TOKEN>', '<FLOW_SESSION_TOKEN>'].includes(value)) throw Error('Keep the credential placeholders. Secrets are supplied by the server.');
    }
    if (operation === 'create') {
      if (!/^\d{1,9}(\.\d{1,6})?$/.test(String(body.amount)) || Number(body.amount) <= 0 || typeof body.currency !== 'string' || !body.currency) throw Error('Create needs a positive decimal amount and currency.');
      if (!Number.isInteger(body.expiresIn) || body.expiresIn < 60 || body.expiresIn > 3600) throw Error('Set expiresIn between 60 and 3600 seconds.');
      if (!body.settlementConfig?.settlements?.length || !body.destinationConfig?.destinations?.length) throw Error('Create needs settlement and destination configurations.');
    }
    return { operation, method, url: url.href, body, headers };
  }
  async function send(request, c, calls) {
    const r = validateRequest(request, c);
    if (r.operation === 'create' && c.flowId) throw Error('Start a new session before creating another Flow.');
    if (['source', 'quote'].includes(r.operation) && !c.verified) throw Error('Verify the saved Flow configuration before attaching a source or quoting.');
    if (['source', 'quote'].includes(r.operation) && c.state === 'cancelled') throw Error('This preview was cancelled. Run a new sequence to request another quote.');
    if (['quote', 'cancel'].includes(r.operation) && !c.session) throw Error('Attach a source first to obtain the server-held session.');
    const headers = { Accept: 'application/json', ...(r.body ? { 'Content-Type': 'application/json' } : {}) };
    for (const [k, v] of Object.entries(r.headers)) if (!/^(authorization|x-dynamic-flow-session-token)$/i.test(k)) headers[k] = v;
    if (['create', 'verify'].includes(r.operation)) headers.Authorization = `Bearer ${token}`;
    if (['quote', 'cancel'].includes(r.operation) || (r.operation === 'source' && c.session)) headers['X-Dynamic-Flow-Session-Token'] = c.session;
    const record = { label: r.operation, method: r.method, url: r.url, headers: redact(headers), body: r.body, startedAt: new Date().toISOString() };
    calls.push(record);
    const started = Date.now();
    try {
      const response = await fetcher(r.url, { method: r.method, headers, ...(r.body ? { body: JSON.stringify(r.body) } : {}), redirect: 'manual', signal: AbortSignal.timeout(25000) });
      record.status = response.status;
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = { message: raw.slice(0, 16000) }; }
      if (typeof data.sessionToken === 'string') secrets.add(data.sessionToken);
      record.response = redact(data);
      if (!response.ok) throw Error(`Flow returned HTTP ${response.status}. Inspect the response.`);
      const flow = data.flow || data;
      if (r.operation === 'create') {
        if (!uuid.test(flow.id || '')) throw Error('Create returned no valid Flow ID; creation status is unknown.');
        c.flowId = flow.id; c.invoice = r.body; c.state = 'created'; c.expiresAt = new Date(Date.now() + r.body.expiresIn * 1000).toISOString();
        c.cleanup = { status: 'pending', message: 'No payment prepared. Attach a source to enable cancellation.' };
      }
      if (r.operation === 'verify') {
        const keys = ['currency', 'settlementConfig', 'destinationConfig'];
        const flagsMatch = ['pegStablecoins', 'disableSwaps'].filter(k => k in c.invoice).every(k => (flow[k] ?? false) === c.invoice[k]);
        if (normalizeAmount(flow.amount) !== normalizeAmount(c.invoice.amount) || keys.some(k => !matchesRequested(flow[k], c.invoice[k])) || !flagsMatch) throw Error('The saved invoice or settlement differs from the create request.');
        c.verified = true; if (['created', 'verified'].includes(c.state)) c.state = 'verified';
      }
      if (r.operation === 'source') {
        if (!data.sessionToken && !c.session) throw Error('Source attachment returned no session token.');
        c.session = data.sessionToken || c.session; c.source = r.body; c.state = 'source-attached';
        c.quote = undefined; c.display = undefined; c.invoiceCheck = undefined;
        c.cleanup = { status: 'pending', message: 'Quote or Cancel will close this preview. Leaving the page also requests cancellation.' };
      }
      if (r.operation === 'quote') {
        c.quote = redact(data.quote || flow.quote || data);
        c.display = normalizeQuote(c.quote);
        const settlements = c.invoice.settlementConfig.settlements;
        const target = settlements.find(s => String(s.chainId) === String(c.quote.toChainId) && s.tokenAddress?.toLowerCase() === c.quote.toToken?.toLowerCase());
        c.invoiceCheck = target ? checkInvoiceAmount({ amount: String(c.invoice.amount), currency: c.invoice.currency, settlementChainId: String(target.chainId), settlementTokenAddress: target.tokenAddress }, c.quote) : { status: 'rejected', message: 'Returned settlement does not match any requested asset and network.' };
        c.state = 'quoted';
        c.cleanup = { status: 'pending', message: 'Checkout is open for quote review. Close the preview to cancel.' };
      }
      if (r.operation === 'cancel') {
        if (flow.executionState !== 'cancelled') throw Error('Provider did not confirm cancellation.');
        c.state = 'cancelled'; c.cleanup = { status: 'cancelled', message: 'Preview cancelled. No payment was prepared or submitted.' };
      }
      await checkpoint();
      return record;
    } catch (error) { record.error = redact(error.message); throw error; }
    finally { record.durationMs = Date.now() - started; }
  }
  async function cleanup(c, calls) {
    if (!c.flowId || c.state === 'cancelled') return;
    if (!c.session) { c.cleanup = { status: 'unconfirmed', message: `No session is available to cancel Flow ${c.flowId}. It expires at ${c.expiresAt}. No payment was prepared.` }; return; }
    try { await send({ method: 'POST', url: `${API}/sdk/${environment}/flow/${c.flowId}/cancel`, body: {} }, c, calls); }
    catch (error) { c.cleanup = { status: 'unconfirmed', message: redact(error.message) }; }
  }
  async function execute({ contextId, requests, sequence = false, close = false, keepOpen = false }) {
    if (!uuid.test(environment || '') || !token) throw Error('Configure the server with the Dynamic environment ID and API token.');
    if (typeof keepOpen !== 'boolean' || (keepOpen && sequence)) throw Error('keepOpen is available only for individual checkout requests.');
    let c = contextId && contexts.get(contextId);
    if (contextId && !c && !sequence && !close) throw Error('The lab session was cleared or the server restarted. Start a new sequence.');
    const calls = [];
    if (close) { if (c) await cleanup(c, calls); await checkpoint(); return { context: c ? snapshot(c) : null, calls }; }
    if (!Array.isArray(requests) || requests.length !== (sequence ? 5 : 1)) throw Error('Send one request, or the five-step sequence.');
    const candidate = { id: randomUUID(), addresses: { source: address(), destination: address() }, state: 'new', cleanup: { status: 'not-created' } };
    const target = sequence || !c ? candidate : c;
    const operations = requests.map(r => validateRequest(r, target, sequence || !c).operation);
    if (sequence && operations.join(',') !== 'create,verify,source,quote,cancel') throw Error('The sequence must be create, verify, source, quote, cancel.');
    if (!c && operations[0] !== 'create') throw Error('Create a Flow first.');
    if (sequence && c) {
      await cleanup(c, calls);
      if (c.flowId && c.cleanup.status !== 'cancelled') return { error: 'Close the previous Flow before starting another.', context: snapshot(c), calls };
    }
    c = target; contexts.set(c.id, c);
    // Retain bounded in-memory sessions; active previews remain visible until expiry.
    for (const [id, old] of contexts) if (id !== c.id && (old.state === 'cancelled' || (old.expiresAt && Date.parse(old.expiresAt) < Date.now()))) contexts.delete(id);
    await checkpoint();
    let error;
    try { for (const request of requests) await send(request, c, calls); }
    catch (e) { error = redact(e.message); if (!c.flowId) c.cleanup = { status: 'unknown', message: 'Creation may have reached the provider; no usable Flow ID was returned. No payment was prepared.' }; }
    finally { if (error || (!keepOpen && (sequence || operations.includes('quote')))) await cleanup(c, calls); await checkpoint(); }
    return { ...(error ? { error } : {}), context: snapshot(c), calls: redact(calls) };
  }
  return { execute };
}
