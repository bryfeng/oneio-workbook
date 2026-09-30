import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { DEFAULTS, previewCalls } from '../src/flow-lab-shared.mjs';
const environment='3608a494-ff5c-4cbc-a425-ddc382e4a90a';
const flowId='11111111-1111-4111-8111-111111111111';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/eur-500-actual.json',import.meta.url),'utf8'));
const origin='https://bryfeng.github.io';
const requests=()=>previewCalls(DEFAULTS,environment).map(c=>JSON.parse(JSON.stringify(c).replaceAll('<FLOW_ID>','{{flowId}}').replaceAll('<GENERATED_SOURCE_ADDRESS>','{{sourceAddress}}').replaceAll('<GENERATED_DESTINATION_ADDRESS>','{{destinationAddress}}')));
test('real Worker runtime starts a public session, restores a session after restart, quotes and cancels',async()=>{
 const disk=await mkdtemp(join(tmpdir(),'oneio-worker-test-'));let invoice;const seen=[];
 const options={modules:true,scriptPath:fileURLToPath(new URL('../worker/.local/worker/index.js',import.meta.url)),compatibilityDate:'2026-09-29',compatibilityFlags:['nodejs_compat'],resourcePersistencePath:disk,bindings:{DYNAMIC_ENVIRONMENT_ID:environment,DYNAMIC_API_TOKEN:'runtime-api-secret',SESSION_SIGNING_KEY:'runtime-signing-secret',ALLOWED_ORIGINS:origin},durableObjects:{LAB_SESSIONS:{className:'FlowLabSession',useSQLite:true}},ratelimits:{RATE_LIMITER:{namespace_id:'2026093001',simple:{limit:60,period:60}}},outboundService:async req=>{
  assert.ok(req.url.startsWith('https://app.dynamicauth.com/api/v0/'));seen.push(req.url);let data;
  if(req.url.endsWith('/payment')){invoice=await req.json();data={flow:{id:flowId}};}
  else if(req.method==='GET'){data=structuredClone(invoice);data.settlementConfig.settlements[0].isNative=false;delete data.disableSwaps;}
  else if(req.url.endsWith('/source'))data={sessionToken:'runtime-flow-secret'};
  else if(req.url.endsWith('/quote')){assert.equal(req.headers.get('X-Dynamic-Flow-Session-Token'),'runtime-flow-secret');data={quote:fixture.quote};}
  else if(req.url.endsWith('/cancel'))data={executionState:'cancelled'};
  else throw Error('Unexpected upstream call');
  return new Response(JSON.stringify(data),{status:req.url.endsWith('/payment')?201:200});
 }};
 let mf=new Miniflare(convertV4MiniflareOptions(options));
 const send=(path,body,headers={})=>mf.dispatchFetch('https://lab.example'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 try {
  const login=await send('/api/session',{});assert.equal(login.status,200);const auth=await login.json();const headers={Authorization:'Bearer '+auth.token};
  let r=await send('/api/request',{requestId:crypto.randomUUID(),requests:[requests()[0]]},headers);assert.equal(r.status,200);let result=await r.json();assert.equal(result.error,undefined,JSON.stringify(result));assert.equal(result.context.state,'created');const contextId=result.context.contextId;
  const other=await (await send('/api/session',{})).json();
  r=await send('/api/request',{requestId:crypto.randomUUID(),contextId,requests:[requests()[1]]},{Authorization:'Bearer '+other.token});
  assert.equal(r.status,400);assert.match((await r.json()).error,/session was cleared/);assert.equal(seen.length,1);
  await mf.dispose();mf=new Miniflare(convertV4MiniflareOptions(options));
  for(const step of requests().slice(1,4)){r=await send('/api/request',{requestId:crypto.randomUUID(),contextId,requests:[step]},headers);assert.equal(r.status,200);result=await r.json();assert.equal(result.error,undefined);}
  assert.equal(result.context.cleanup.status,'cancelled');assert.equal(result.context.invoiceCheck.status,'rejected');assert.equal(seen.length,5);assert.ok(!JSON.stringify(result).includes('runtime-flow-secret'));
  const id=crypto.randomUUID();r=await send('/api/request',{requestId:id,contextId,close:true},headers);assert.equal(r.status,200);r=await send('/api/request',{requestId:id,contextId,close:true},headers);assert.equal(r.status,409);
 } finally {await mf.dispose();await rm(disk,{recursive:true,force:true});}
});
