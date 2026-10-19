import {mkdirSync,copyFileSync} from 'node:fs';
mkdirSync('supabase/functions/_shared',{recursive:true});
for(const file of ['business.ts','server.ts'])copyFileSync('lib/'+file,'supabase/functions/_shared/'+file);
