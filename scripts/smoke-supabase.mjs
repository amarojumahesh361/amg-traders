import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const env=Object.fromEntries(readFileSync('.env.local','utf8').trim().split(/\r?\n/).map(x=>{const i=x.indexOf('=');return [x.slice(0,i).replace(/^\uFEFF/,''),x.slice(i+1)]}));
const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
const checks=[
 ['unauthenticated function',url+'/functions/v1/amg-business',{headers:{apikey:key}},[401]],
 ['invalid user token',url+'/functions/v1/amg-business',{headers:{apikey:key,Authorization:'Bearer invalid-test-token'}},[401]],
 ['anonymous data read',url+'/rest/v1/amg_business?select=version',{headers:{apikey:key}},[401,403]],
 ['anonymous command commit',url+'/rest/v1/rpc/amg_save_state',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({p_owner:'11111111-1111-4111-8111-111111111111',p_expected_version:0,p_state:{schema:1},p_command:{id:'22222222-2222-4222-8222-222222222222'}})},[401,403]],
 ['preflight',url+'/functions/v1/amg-business',{method:'OPTIONS'},[204]],
];
for(const [label,target,init,expected] of checks){const res=await fetch(target,{...init,signal:AbortSignal.timeout(15000)});assert.ok(expected.includes(res.status),label+' returned '+res.status);console.log('PASS',label,res.status)}
