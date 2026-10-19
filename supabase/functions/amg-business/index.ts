import {createBusinessHandler} from '../_shared/server.ts';
const handler=createBusinessHandler({url:Deno.env.get('SUPABASE_URL')||'',publicKey:Deno.env.get('SUPABASE_ANON_KEY')||'',secretKey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''});
Deno.serve(handler);
