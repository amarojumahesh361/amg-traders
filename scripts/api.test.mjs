import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBusinessHandler,ADMIN_EMAIL} from '../lib/server.ts';
import {initial,apply} from '../lib/business.ts';
const owner='11111111-1111-4111-8111-111111111111';
const id='22222222-2222-4222-8222-222222222222';
function setup(options={}){
 let snapshot={state:initial(),version:0,owner},writes=0,authCalls=0,reads=0;
 const mock=async(url,init={})=>{
  if(url.endsWith('/auth/v1/user')){authCalls++;return Response.json(options.badToken?{error:'Invalid token'}:{id:owner,email:options.email||ADMIN_EMAIL,email_confirmed_at:options.unverified?null:'2026-10-19T00:00:00Z'},{status:options.badToken?401:200})}
  assert.equal(init.headers.apikey,'server-test-secret');
  if(url.includes('/rest/v1/amg_business?')){reads++;return Response.json(snapshot.version?[{data:snapshot.state,version:snapshot.version}]:[])}
  if(url.endsWith('/rpc/amg_save_state')){
   const p=JSON.parse(init.body);writes++;assert.equal(p.p_owner,owner);
   if(options.conflict&&writes===1){snapshot={state:apply(snapshot.state,{id:'33333333-3333-4333-8333-333333333333',type:'expense',at:'2026-10-19T00:00:00Z',payload:{amount:100,mode:'cash',note:'Other device'}}),version:1,owner};return Response.json(false)}
   assert.equal(p.p_expected_version,snapshot.version);snapshot={state:p.p_state,version:snapshot.version+1,owner};return Response.json(true)
  }
  throw Error('Unexpected endpoint '+url);
 };
 return {handler:createBusinessHandler({url:'https://test.supabase.co',publicKey:'public-test-key',secretKey:'server-test-secret'},mock),get:()=>({snapshot,writes,authCalls,reads})};
}
function request(method='GET',body,token='valid-session'){return new Request('https://test.supabase.co/functions/v1/amg-business',{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})})}
const command={id,type:'expense',at:'2026-10-19T00:00:00Z',payload:{amount:10000,mode:'cash',note:'Shop rent'}};
test('no token cannot read private data',async()=>{const x=setup();assert.equal((await x.handler(request('GET',null,''))).status,401);assert.equal(x.get().authCalls,0);assert.equal(x.get().reads,0)});
test('invalid token is rejected before database access',async()=>{const x=setup({badToken:true});assert.equal((await x.handler(request())).status,401);assert.equal(x.get().reads,0)});
test('existing hosting account has no admin access',async()=>{const x=setup({email:'smmworks.gcs@gmail.com'});assert.equal((await x.handler(request())).status,403);assert.equal(x.get().reads,0)});
test('unverified admin email has no access',async()=>{const x=setup({unverified:true});assert.equal((await x.handler(request())).status,403);assert.equal(x.get().reads,0)});
test('verified admin reads empty business without creating sample data',async()=>{const x=setup();const r=await x.handler(request());assert.equal(r.status,200);const d=await r.json();assert.equal(d.owner,owner);assert.equal(d.state.products.length,0);assert.equal(x.get().writes,0);assert.equal(r.headers.get('cache-control'),'no-store')});
test('valid command commits once and retry returns same version',async()=>{const x=setup();const first=await (await x.handler(request('POST',command))).json();const again=await (await x.handler(request('POST',command))).json();assert.equal(first.version,1);assert.equal(again.version,1);assert.equal(x.get().writes,1)});
test('conflicting writes reload and preserve the other device transaction',async()=>{const x=setup({conflict:true});const r=await x.handler(request('POST',command));assert.equal(r.status,200);const d=await r.json();assert.equal(d.version,2);assert.equal(d.state.entries.length,2);assert.equal(x.get().writes,2)});
test('invalid business command never reaches commit',async()=>{const x=setup();const r=await x.handler(request('POST',{...command,payload:{amount:-1,mode:'cash',note:'Invalid'}}));assert.equal(r.status,422);assert.equal(x.get().writes,0)});
test('CORS preflight carries no financial data',async()=>{const x=setup();assert.equal((await x.handler(request('OPTIONS'))).status,204);assert.equal(x.get().authCalls,0)});
