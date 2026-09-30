const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const bytes = new TextEncoder();
const b64 = value => btoa(String.fromCharCode(...value)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const unb64 = value => Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
async function signingKey(secret) { return crypto.subtle.importKey('raw', bytes.encode(secret), { name:'HMAC', hash:'SHA-256' }, false, ['sign','verify']); }
export async function issueSession(secret, now = Date.now()) {
  const session = { version:1, clientId:crypto.randomUUID(), expiresAt:now + 2*60*60*1000 };
  const payload = b64(bytes.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), bytes.encode(payload));
  return { token:payload+'.'+b64(new Uint8Array(signature)), ...session };
}
export async function verifySession(token, secret, now = Date.now()) {
  try {
    if (typeof token !== 'string' || token.length>1000) return null;
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra || !await crypto.subtle.verify('HMAC', await signingKey(secret), unb64(signature), bytes.encode(payload))) return null;
    const session = JSON.parse(new TextDecoder().decode(unb64(payload)));
    return session.version === 1 && uuid.test(session.clientId) && Number.isFinite(session.expiresAt) && session.expiresAt>now && session.expiresAt<=now+2*60*60*1000 ? session : null;
  } catch { return null; }
}
export async function handleRequest(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGINS.split(',').map(s=>s.trim());
  const headers = { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'Vary':'Origin', 'X-Content-Type-Options':'nosniff' };
  if (origin && allowed.includes(origin)) Object.assign(headers, { 'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Headers':'Content-Type, Authorization', 'Access-Control-Allow-Methods':'GET, POST, OPTIONS', 'Access-Control-Max-Age':'600' });
  const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers});
  if (!origin || !allowed.includes(origin)) return json({error:'Origin not allowed.'},403);
  if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
  const url = new URL(request.url);
  if (url.search) return json({error:'Query parameters are not supported.'},400);
  if (!env.DYNAMIC_API_TOKEN || !env.SESSION_SIGNING_KEY) return json({error:'The lab backend is not configured.'},503);
  if (url.pathname==='/api/session' && request.method==='POST') {
    if (!(await env.RATE_LIMITER.limit({key:'session:'+request.headers.get('CF-Connecting-IP')})).success) return json({error:'Too many connection attempts. Try again in a minute.'},429);
    // Public sessions isolate each visitor's Flows; no access key is required.
    return json(await issueSession(env.SESSION_SIGNING_KEY));
  }
  const session = await verifySession(request.headers.get('Authorization')?.replace(/^Bearer /,''),env.SESSION_SIGNING_KEY);
  if (url.pathname==='/api/config' && request.method==='GET') return json({ environmentId:env.DYNAMIC_ENVIRONMENT_ID, connected:Boolean(session), authRequired:false, quoteOnly:true, ...(session ? {sessionExpiresAt:session.expiresAt} : {}) });
  if (!session) return json({error:'The connection expired. Reload the page to reconnect.'},401);
  if (url.pathname!=='/api/request' || request.method!=='POST') return json({error:'Not found.'},404);
  if (!(await env.RATE_LIMITER.limit({key:'public-lab'})).success) return json({error:'Request limit reached. Try again in a minute.'},429);
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'Send application/json.'},415);
  try {
    const reader = request.body?.getReader(); let size=0; const chunks=[];
    if (!reader) return json({error:'A JSON body is required.'},400);
    while (true) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>64000) { await reader.cancel(); return json({error:'Request exceeds 64 KB.'},413); } chunks.push(value); }
    const body = new Uint8Array(size); let offset=0; for(const chunk of chunks) {body.set(chunk,offset);offset+=chunk.length;}
    const input = JSON.parse(new TextDecoder().decode(body));
    if (!input || Array.isArray(input) || typeof input!=='object') return json({error:'A request object is required.'},400);
    const result = await env.LAB_SESSIONS.getByName(session.clientId).run(input);
    return json(result.body,result.status);
  } catch (error) {
    return json({error:error instanceof SyntaxError ? 'The request is not valid JSON.' : 'The lab request could not complete. Its outcome may be unknown; inspect the session before retrying.'},error instanceof SyntaxError ? 400 : 502);
  }
}
