import {createClient} from '@supabase/supabase-js';
export const ADMIN_EMAIL='amarojumahesh361@gmail.com';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'amg-supabase-auth-v1'}}):null;
export async function authenticatedFetch(_input:RequestInfo|URL,init:RequestInit={}){
 if(!supabase)throw Error('Supabase configuration is missing');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error||!session)throw Error('Sign in to sync');
 const headers=new Headers(init.headers);headers.set('Authorization','Bearer '+session.access_token);headers.set('apikey',key);
 return fetch(url+'/functions/v1/amg-business',{...init,headers});
}
export async function signOut(){
 if(!supabase)return;
 const pending=await new Promise<number>((yes,no)=>{const r=indexedDB.open('amg-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onerror=()=>no(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('data','readonly'),get=tx.objectStore('data').get('state');tx.oncomplete=()=>{db.close();yes(get.result?.queue?.length||0)};tx.onerror=()=>{db.close();no(tx.error)}}});
 if(pending)throw Error('Sync pending entries before signing out. Export a backup if the session cannot be restored.');
 const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error;
 await new Promise<void>((yes,no)=>{const r=indexedDB.open('amg-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onerror=()=>no(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('data','readwrite');tx.objectStore('data').clear();tx.oncomplete=()=>{db.close();yes()};tx.onerror=()=>{db.close();no(tx.error)}}});
}

export async function requestAdminLink(){
 if(!supabase)throw Error('Supabase configuration is missing');
 const {error}=await supabase.auth.signInWithOtp({email:ADMIN_EMAIL,options:{shouldCreateUser:true,emailRedirectTo:window.location.origin+'/'}});
 if(error)throw error;
}

