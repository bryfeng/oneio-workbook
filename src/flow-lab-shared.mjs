export const API = 'https://app.dynamicauth.com/api/v0';
export const DEFAULTS = {
  amount: '500.00', currency: 'EUR', sourceChainId: '8453', settlementChainId: '8453',
  sourceTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  settlementTokenAddress: '0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42',
  settlementSymbol: 'EURC', settlementDecimals: 6,
  sourceAddress: '', destinationAddress: '', slippagePercent: 0.5, expiresIn: 900,
  pegStablecoins: true, disableSwaps: false,
};
export function validate(input) {
  const p = { ...DEFAULTS, ...input };
  p.amount = String(p.amount).trim();
  if (!/^\d{1,9}(\.\d{1,6})?$/.test(p.amount) || Number(p.amount) <= 0) throw Error('Enter a positive amount, with up to 6 decimal places.');
  if (!['EUR', 'USD'].includes(p.currency)) throw Error('Choose EUR or USD.');
  for (const key of ['sourceChainId', 'settlementChainId']) {
    p[key] = String(p[key]);
    if (!/^[1-9]\d{0,9}$/.test(p[key])) throw Error('Chain IDs must be positive integers.');
  }
  for (const key of ['sourceTokenAddress', 'settlementTokenAddress', 'sourceAddress', 'destinationAddress']) {
    p[key] = String(p[key]).trim();
    if ((!['sourceAddress', 'destinationAddress'].includes(key) || p[key]) && !/^0x[0-9a-fA-F]{40}$/.test(p[key])) throw Error('Enter a valid EVM address for ' + key + '.');
  }
  p.settlementSymbol = String(p.settlementSymbol).trim();
  if (!/^[A-Za-z0-9._-]{1,15}$/.test(p.settlementSymbol)) throw Error('Enter a short token symbol.');
  for (const key of ['settlementDecimals', 'expiresIn', 'slippagePercent']) p[key] = Number(p[key]);
  if (!Number.isInteger(p.settlementDecimals) || p.settlementDecimals < 0 || p.settlementDecimals > 36) throw Error('Token decimals must be an integer from 0 to 36.');
  if (!Number.isInteger(p.expiresIn) || p.expiresIn < 60 || p.expiresIn > 3600) throw Error('Flow expiry must be from 60 to 3,600 seconds.');
  if (!Number.isFinite(p.slippagePercent) || p.slippagePercent < 0 || p.slippagePercent > 5) throw Error('Slippage must be between 0% and 5%.');
  for (const key of ['pegStablecoins', 'disableSwaps']) if (typeof p[key] !== 'boolean') throw Error(key + ' must be a boolean.');
  return p;
}
export function createBody(p, destinationAddress) {
  return {
    amount: p.amount, currency: p.currency, expiresIn: p.expiresIn,
    pegStablecoins: p.pegStablecoins, disableSwaps: p.disableSwaps,
    settlementConfig: { strategy: 'cheapest', settlements: [{
      chainName: 'EVM', chainId: p.settlementChainId, tokenAddress: p.settlementTokenAddress,
      symbol: p.settlementSymbol, tokenDecimals: p.settlementDecimals,
    }] },
    destinationConfig: { destinations: [{ chainName: 'EVM', type: 'address', identifier: destinationAddress }] },
    memo: { purpose: 'Flow Lab quote-only preview' },
  };
}
export function sourceBody(p, sourceAddress) {
  return { sourceType: 'wallet', fromAddress: sourceAddress, fromChainId: p.sourceChainId, fromChainName: 'EVM' };
}
export function quoteBody(p) { return { fromTokenAddress: p.sourceTokenAddress, slippage: p.slippagePercent / 100 }; }
export function previewCalls(p, environment) {
  const flow = '<FLOW_ID>';
  const auth = { Authorization: 'Bearer <DYNAMIC_API_TOKEN>' };
  const session = { 'X-Dynamic-Flow-Session-Token': '<FLOW_SESSION_TOKEN>' };
  const call = (label, method, path, headers, body) => ({ label, method, url: API + path, headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(body ? { body } : {}) });
  return [
    call('Create payment', 'POST', `/server/${environment}/flow/payment`, auth, createBody(p, p.destinationAddress || '<GENERATED_DESTINATION_ADDRESS>')),
    call('Verify configuration', 'GET', `/server/${environment}/flow/${flow}`, auth),
    call('Attach source', 'POST', `/sdk/${environment}/flow/${flow}/source`, {}, sourceBody(p, p.sourceAddress || '<GENERATED_SOURCE_ADDRESS>')),
    call('Get quote', 'POST', `/sdk/${environment}/flow/${flow}/quote`, session, quoteBody(p)),
    call('Cancel preview', 'POST', `/sdk/${environment}/flow/${flow}/cancel`, session, {}),
  ];
}
export function formatUnits(value, decimals) {
  if (!/^\d+$/.test(String(value)) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw Error('Quote is missing a valid base-unit amount or token decimals.');
  const s = BigInt(value).toString().padStart(decimals + 1, '0');
  if (!decimals) return s;
  return (s.slice(0, -decimals) + '.' + s.slice(-decimals)).replace(/\.?0+$/, '');
}
export function normalizeQuote(q) {
  const from = formatUnits(q.fromAmount, q.fromTokenInfo?.decimals);
  const to = formatUnits(q.toAmount, q.toTokenInfo?.decimals);
  return { from, to, fromSymbol: q.fromTokenInfo?.symbol || 'Token', toSymbol: q.toTokenInfo?.symbol || 'Token', fromChainId: q.fromChainId, toChainId: q.toChainId };
}
// A successful quote response is not proof that it satisfies the invoice.
// Only compare nominal amounts for the two known Base stablecoin contracts.
export function checkInvoiceAmount(p, q) {
  const tokens = {
    [DEFAULTS.settlementTokenAddress.toLowerCase()]: { currency: 'EUR', symbol: 'EURC', decimals: 6 },
    [DEFAULTS.sourceTokenAddress.toLowerCase()]: { currency: 'USD', symbol: 'USDC', decimals: 6 },
  };
  const token = String(p.settlementChainId) === '8453' ? tokens[p.settlementTokenAddress.toLowerCase()] : null;
  if (!token || p.currency !== token.currency) return { status: 'not-checked', message: 'This currency/token pair needs a separate conversion check.' };
  if (String(q.toChainId) !== String(p.settlementChainId) || q.toToken?.toLowerCase() !== p.settlementTokenAddress.toLowerCase() || q.toTokenInfo?.decimals !== token.decimals || q.toTokenInfo?.symbol !== token.symbol) {
    return { status: 'rejected', message: 'The returned settlement asset does not match the expected contract, network, and decimals.' };
  }
  const [whole, fraction = ''] = p.amount.split('.');
  if (fraction.length > token.decimals || !/^\d+$/.test(String(q.toAmount))) return { status: 'rejected', message: 'Cannot verify the quote amount precisely.' };
  const expected = BigInt(whole + fraction.padEnd(token.decimals, '0'));
  const actual = BigInt(q.toAmount);
  const difference = expected - actual;
  return {
    status: difference === 0n ? 'matched' : 'rejected',
    reason: difference > 0n ? 'shortfall' : difference < 0n ? 'excess' : 'exact',
    expected: formatUnits(expected.toString(), token.decimals), actual: formatUnits(actual.toString(), token.decimals),
    difference: formatUnits((difference < 0n ? -difference : difference).toString(), token.decimals), symbol: token.symbol,
    message: difference === 0n ? 'Quoted receiver amount matches the invoice target.' : 'The quote does not deliver the requested merchant amount.',
  };
}
export function curl(call) {
  const shell = (s) => "'" + String(s).replaceAll("'", "'\\''") + "'";
  return [`curl --request ${call.method} ${shell(call.url)}`, ...Object.entries(call.headers || {}).map(([k, v]) => `  --header ${shell(k + ': ' + v)}`), ...(call.body ? [`  --data-raw ${shell(JSON.stringify(call.body, null, 2))}`] : [])].join(' \\\n');
}
