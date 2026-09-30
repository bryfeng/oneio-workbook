import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, issueSession, verifySession } from '../worker/http.mjs';
const origin='https://bryfeng.github.io';
const env={SESSION_SIGNING_KEY:'test-signing-key',DYNAMIC_API_TOKEN:'test-upstream-key',DYNAMIC_ENVIRONMENT_ID:'3608a494-ff5c-4cbc-a425-ddc382e4a90a',ALLOWED_ORIGINS:origin,RATE_LIMITER:{limit:async()=>({success:true})},LAB_SESSIONS:{getByName:()=>({run:async()=>({status:200,body:{context:{state:'cancelled'},calls:[]}})})}};
const request=(path,options={})=>new Request('https://lab.example'+path,{...options,headers:{Origin:origin,...options.headers}});
test('signed lab sessions reject tampering, expiration and a different signing key',async()=>{
 const now=Date.now();const issued=await issueSession(env.SESSION_SIGNING_KEY,now);
 assert.equal((await verifySession(issued.token,env.SESSION_SIGNING_KEY,now)).clientId,issued.clientId);
 assert.equal(await verifySession(issued.token+'x',env.SESSION_SIGNING_KEY,now),null);
 assert.equal(await verifySession(issued.token,'other-key',now),null);
 assert.equal(await verifySession(issued.token,env.SESSION_SIGNING_KEY,issued.expiresAt),null);
 assert.ok(!issued.token.includes(env.SESSION_SIGNING_KEY));
});
test('public visitors receive distinct sessions without supplying any key',async()=>{
 let r=await handleRequest(request('/api/config'),env);const config=await r.json();assert.equal(config.connected,false);assert.equal(config.authRequired,false);
 r=await handleRequest(request('/api/session',{method:'POST'}),env);assert.equal(r.status,200);const first=await r.json();assert.ok(first.token);
 r=await handleRequest(request('/api/session',{method:'POST'}),env);const second=await r.json();assert.notEqual(first.clientId,second.clientId);
 assert.ok(!JSON.stringify(first).includes(env.DYNAMIC_API_TOKEN));assert.ok(!JSON.stringify(first).includes(env.SESSION_SIGNING_KEY));
 r=await handleRequest(request('/api/config',{headers:{Authorization:'Bearer '+first.token}}),env);assert.equal((await r.json()).connected,true);
});
test('CORS preflight permits the workbook but blocks foreign origins before routing',async()=>{
 let r=await handleRequest(request('/api/request',{method:'OPTIONS'}),env);assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);
 r=await handleRequest(request('/api/request',{method:'POST',headers:{Origin:'https://attacker.example'}}),env);assert.equal(r.status,403);assert.equal(r.headers.get('Access-Control-Allow-Origin'),null);
 r=await handleRequest(new Request('https://lab.example/api/config'),env);assert.equal(r.status,403);
});
test('missing sessions never reach durable objects; public sessions are isolated',async()=>{
 let reached=[];const configured={...env,LAB_SESSIONS:{getByName:id=>{reached.push(id);return {run:async()=>({status:200,body:{ok:true}})};}}};
 let r=await handleRequest(request('/api/request',{method:'POST',body:'{}',headers:{'Content-Type':'application/json'}}),configured);assert.equal(r.status,401);assert.equal(reached.length,0);
 const auth=await issueSession(env.SESSION_SIGNING_KEY);r=await handleRequest(request('/api/request',{method:'POST',body:'{}',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token}}),configured);assert.equal(r.status,200);assert.deepEqual(reached,[auth.clientId]);
});
test('rate limiting, invalid JSON and oversized bodies stop before upstream work',async()=>{
 const auth=await issueSession(env.SESSION_SIGNING_KEY);const headers={Authorization:'Bearer '+auth.token,'Content-Type':'application/json'};
 let r=await handleRequest(request('/api/request',{method:'POST',headers,body:'{}'}),{...env,RATE_LIMITER:{limit:async()=>({success:false})}});assert.equal(r.status,429);
 r=await handleRequest(request('/api/session',{method:'POST'}),{...env,RATE_LIMITER:{limit:async()=>({success:false})}});assert.equal(r.status,429);
 r=await handleRequest(request('/api/request',{method:'POST',headers,body:'{bad'}),env);assert.equal(r.status,400);
 r=await handleRequest(request('/api/request',{method:'POST',headers,body:'x'.repeat(64001)}),env);assert.equal(r.status,413);
});
