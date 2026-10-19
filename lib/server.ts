import {apply,initial,type Command,type State} from './business.ts';
export const ADMIN_EMAIL='amarojumahesh361@gmail.com';
type Config={url:string;publicKey:string;secretKey:string};
type Snapshot={state:State;version:number;owner:string};
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Cache-Control':'no-store'};
export function createBusinessHandler(config:Config,requestFetch:typeof fetch=fetch){return async function handler(request:Request):Promise<Response>{
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:cors});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(!['GET','POST'].includes(request.method))return reply({error:'Method not allowed'},405);
 if(!config.url||!config.publicKey||!config.secretKey)return reply({error:'Backend configuration is incomplete'},503);
 const authorization=request.headers.get('Authorization')||'';
 if(!/^Bearer \S+$/.test(authorization))return reply({error:'Sign in to sync'},401);
 try{
  const auth=await requestFetch(config.url+'/auth/v1/user',{headers:{apikey:config.publicKey,Authorization:authorization}});
  if(!auth.ok)return reply({error:'Sign in to sync'},401);
  const user=await auth.json() as {id?:string;email?:string;email_confirmed_at?:string};
  if(!user.id||user.email?.toLowerCase()!==ADMIN_EMAIL||!user.email_confirmed_at)return reply({error:'Admin access required'},403);
  const headers:Record<string,string>={apikey:config.secretKey,'Content-Type':'application/json'};
  if(!config.secretKey.startsWith('sb_secret_'))headers.Authorization='Bearer '+config.secretKey;
  async function load():Promise<Snapshot>{
   const res=await requestFetch(config.url+'/rest/v1/amg_business?owner=eq.'+encodeURIComponent(user.id!)+'&select=version,data',{headers});
   if(!res.ok)throw Error('Database is unavailable. Check the migration and backend configuration.');
   const rows=await res.json() as {version:number;data:State}[];
   return {state:rows[0]?.data||initial(),version:rows[0]?.version||0,owner:user.id!};
  }
  if(request.method==='GET')return reply(await load());
  if(!request.headers.get('content-type')?.includes('application/json'))return reply({error:'Use application/json'},415);
  const body=await request.text();if(body.length>60000)return reply({error:'Transaction too large'},413);
  let command:Command;
  try{command=JSON.parse(body)}catch{return reply({error:'Invalid JSON'},400)}
  if(!command||!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(command.id))return reply({error:'Invalid transaction ID'},422);
  for(let retry=0;retry<5;retry++){
   const old=await load();if(old.state.applied.includes(command.id))return reply(old);
   let state:State;try{state=apply(old.state,command)}catch(e){return reply({error:e instanceof Error?e.message:'Invalid transaction'},422)}
   const res=await requestFetch(config.url+'/rest/v1/rpc/amg_save_state',{method:'POST',headers,body:JSON.stringify({p_owner:user.id,p_expected_version:old.version,p_state:state,p_command:command})});
   if(!res.ok)throw Error('Database commit failed. Your transaction remains pending on the device.');
   if(await res.json())return reply({state,version:old.version+1,owner:user.id});
  }
  return reply({error:'Another device updated the business. Retry sync.'},409);
 }catch(e){return reply({error:e instanceof Error?e.message:'Business service unavailable'},503)}
}}

