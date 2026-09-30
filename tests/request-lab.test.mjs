import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequestLab } from '../server/request-lab.mjs';
import { DEFAULTS, previewCalls } from '../src/flow-lab-shared.mjs';
const environment = '3608a494-ff5c-4cbc-a425-ddc382e4a90a';
const id = '11111111-1111-4111-8111-111111111111';
const token = 'private-api-token', session = 'private-session-token';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/eur-500-actual.json', import.meta.url), 'utf8'));
const requests = () => previewCalls(DEFAULTS, environment).map(c => JSON.parse(JSON.stringify(c).replaceAll('<FLOW_ID>', '{{flowId}}').replaceAll('<GENERATED_SOURCE_ADDRESS>', '{{sourceAddress}}').replaceAll('<GENERATED_DESTINATION_ADDRESS>', '{{destinationAddress}}')));
function setup(options = {}) {
  const seen = []; let invoice;
  const lab = createRequestLab({ environment, token, fetcher: async (url, init) => {
    const body = init.body ? JSON.parse(init.body) : undefined;
    seen.push({ url, ...init, body });
    let status = 200, data;
    if (url.endsWith('/payment')) { invoice = structuredClone(body); data = { flow: { id } }; status = 201; }
    else if (init.method === 'GET') { data = structuredClone(invoice); data.settlementConfig.settlements[0].isNative = false; if (data.disableSwaps === false) delete data.disableSwaps; if (options.mismatch) data.amount = '1'; }
    else if (url.endsWith('/source')) data = { sessionToken: session };
    else if (url.endsWith('/quote')) { data = { quote: options.quote || fixture.quote, echoed: { token, session } }; if (options.quoteFails) { status = 422; data.message = `No route: ${session}`; } }
    else if (url.endsWith('/cancel')) { data = { executionState: 'cancelled' }; if (options.cancelFails) status = 500; }
    else throw Error('Unexpected request');
    return new Response(JSON.stringify(data), { status });
  } });
  return { lab, seen };
}
test('edited body fields and slippage reach the provider; mismatched invoice is rejected and cancelled', async () => {
  const { lab, seen } = setup(); const r = requests();
  r[0].body.memo = { purpose: 'Edited on the call' }; r[3].body.slippage = 0.012;
  const out = await lab.execute({ requests: r, sequence: true });
  assert.equal(out.error, undefined); assert.equal(seen.length, 5);
  assert.equal(seen[0].body.memo.purpose, 'Edited on the call'); assert.equal(seen[3].body.slippage, 0.012);
  assert.equal(out.context.verified, true); assert.equal(out.context.invoiceCheck.status, 'rejected');
  assert.equal(out.context.invoiceCheck.actual, '444.382837'); assert.equal(out.context.cleanup.status, 'cancelled');
  assert.ok(!JSON.stringify(out).includes(token)); assert.ok(!JSON.stringify(out).includes(session));
  assert.equal(seen[0].headers.Authorization, `Bearer ${token}`); assert.equal(seen[2].headers.Authorization, undefined);
  assert.equal(seen[3].headers['X-Dynamic-Flow-Session-Token'], session);
});
test('individual sends carry context; quote auto-cancels and a new sequence uses a new context', async () => {
  const { lab, seen } = setup(); let contextId; let out;
  for (const request of requests().slice(0, 4)) { out = await lab.execute({ contextId, requests: [request] }); contextId = out.context.contextId; assert.equal(out.error, undefined); }
  assert.equal(seen.length, 5); assert.equal(out.context.state, 'cancelled');
  assert.equal(out.calls[1].label, 'cancel');
  out = await lab.execute({ contextId, requests: requests(), sequence: true });
  assert.notEqual(out.context.contextId, contextId); assert.equal(out.error, undefined);
});
test('invalid endpoint, foreign environment, executable operation, wrong method and external host make no calls', async () => {
  const changes = [
    { url: 'https://example.com/api' },
    { url: requests()[0].url.replace(environment, id) },
    { url: requests()[3].url.replace('/quote', '/prepare') },
    { url: requests()[3].url.replace('/quote', '/submit') },
    { method: 'DELETE' },
    { url: requests()[0].url + '?token=secret' },
    { headers: { Authorization: 'Bearer real-secret' } },
  ];
  for (const change of changes) {
    const { lab, seen } = setup(); const r = requests(); Object.assign(r[0], change);
    await assert.rejects(lab.execute({ requests: r, sequence: true })); assert.equal(seen.length, 0);
  }
});
test('all five edited requests are preflighted before creation', async () => {
  const { lab, seen } = setup(); const r = requests(); r[4].method = 'GET';
  await assert.rejects(lab.execute({ requests: r, sequence: true })); assert.equal(seen.length, 0);
});
test('does not quote or attach until the stored immutable invoice is verified', async () => {
  const { lab, seen } = setup(); const c = await lab.execute({ requests: [requests()[0]] });
  const out = await lab.execute({ contextId: c.context.contextId, requests: [requests()[2]] });
  assert.match(out.error, /Verify/); assert.equal(seen.length, 1); assert.equal(out.context.cleanup.status, 'unconfirmed');
});
test('saved configuration mismatch stops the sequence and exposes incomplete cleanup', async () => {
  const { lab, seen } = setup({ mismatch: true });
  const out = await lab.execute({ requests: requests(), sequence: true });
  assert.match(out.error, /differs/); assert.equal(seen.length, 2); assert.equal(out.context.cleanup.status, 'unconfirmed');
});
test('only session-owned Flow IDs can be used', async () => {
  const { lab, seen } = setup(); const c = await lab.execute({ requests: [requests()[0]] });
  const r = requests()[1]; r.url = r.url.replace('{{flowId}}', '22222222-2222-4222-8222-222222222222');
  await assert.rejects(lab.execute({ contextId: c.context.contextId, requests: [r] }), /Only the Flow/); assert.equal(seen.length, 1);
});
test('quote errors are preserved and still cancel with secrets redacted', async () => {
  const { lab } = setup({ quoteFails: true });
  const out = await lab.execute({ requests: requests(), sequence: true });
  assert.match(out.error, /422/); assert.equal(out.context.cleanup.status, 'cancelled');
  assert.ok(!JSON.stringify(out).includes(token)); assert.ok(!JSON.stringify(out).includes(session));
});
test('unparseable quote amounts still cancel without inventing a payer preview', async () => {
  const { lab } = setup({ quote: { ...fixture.quote, fromAmount: 'not-an-amount' } });
  const out = await lab.execute({ requests: requests(), sequence: true });
  assert.ok(out.error); assert.equal(out.context.display, undefined); assert.equal(out.context.cleanup.status, 'cancelled');
});
test('cancel failure is visible and prevents quietly replacing an active Flow', async () => {
  const { lab, seen } = setup({ cancelFails: true });
  const out = await lab.execute({ requests: requests(), sequence: true });
  assert.equal(out.context.cleanup.status, 'unconfirmed');
  const out2 = await lab.execute({ contextId: out.context.contextId, requests: requests(), sequence: true });
  assert.match(out2.error, /Close the previous/); assert.equal(seen.filter(c => c.url.endsWith('/payment')).length, 1);
});
test('closing a manually attached session cancels it', async () => {
  const { lab } = setup(); let contextId;
  for (const request of requests().slice(0, 3)) { const out = await lab.execute({ contextId, requests: [request] }); contextId = out.context.contextId; }
  const out = await lab.execute({ contextId, close: true }); assert.equal(out.context.state, 'cancelled');
});
