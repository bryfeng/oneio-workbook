import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULTS, formatUnits, normalizeQuote, checkInvoiceAmount } from '../src/flow-lab-shared.mjs';
const reported = JSON.parse(readFileSync(new URL('./fixtures/eur-500-actual.json', import.meta.url), 'utf8'));
const quote = reported.quote;

test('normalizes base units exactly, including 18 decimals and zero', () => {
  assert.equal(formatUnits('1009533575', 6), '1009.533575');
  assert.equal(formatUnits('1000000000000000001', 18), '1.000000000000000001');
  assert.equal(formatUnits('1000000000', 6), '1000');
  assert.equal(formatUnits('0', 6), '0');
  assert.equal(formatUnits('10', 0), '10');
  assert.throws(() => normalizeQuote({ ...quote, fromTokenInfo: {} }), /decimals/);
});
test('accepts an exact 500 EURC receiver amount and rejects a one-base-unit shortfall', () => {
  const p = { ...DEFAULTS, amount: '500.00', pegStablecoins: true };
  assert.equal(checkInvoiceAmount(p, { ...reported.quote, toAmount: '500000000' }).status, 'matched');
  const short = checkInvoiceAmount(p, { ...reported.quote, toAmount: '499999999' });
  assert.equal(short.status, 'rejected'); assert.equal(short.difference, '0.000001');
  const excess = checkInvoiceAmount(p, { ...reported.quote, toAmount: '500000001' });
  assert.equal(excess.status, 'rejected'); assert.equal(excess.reason, 'excess');
});
test('pegging and slippage settings do not waive the merchant amount requirement', () => {
  for (const pegStablecoins of [true, false]) {
    assert.equal(checkInvoiceAmount({ ...DEFAULTS, amount: '500', pegStablecoins, slippagePercent: 5 }, reported.quote).status, 'rejected');
  }
});
test('matching nominal amounts cannot hide the wrong settlement asset or decimals', () => {
  const p = { ...DEFAULTS, amount: '500' };
  for (const changes of [{ toToken: DEFAULTS.sourceTokenAddress }, { toChainId: '1' }, { toTokenInfo: { symbol: 'EURC', decimals: 18 } }]) {
    assert.equal(checkInvoiceAmount(p, { ...reported.quote, toAmount: '500000000', ...changes }).status, 'rejected');
  }
});
test('does not assume USD invoices equal EURC token units or trust an arbitrary token symbol', () => {
  assert.equal(checkInvoiceAmount({ ...DEFAULTS, amount: '500', currency: 'USD' }, reported.quote).status, 'not-checked');
  assert.equal(checkInvoiceAmount({ ...DEFAULTS, amount: '500', settlementTokenAddress: '0x' + '1'.repeat(40) }, reported.quote).status, 'not-checked');
});