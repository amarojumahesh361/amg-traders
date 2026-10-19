const NAME='amg-shell-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.includes('signin')||url.pathname.includes('callback')||url.pathname.includes('signout'))return;
 if(request.mode==='navigate')event.respondWith(fetch(request).then(response=>{if(response.ok&&response.headers.get('content-type')?.includes('text/html')){const copy=response.clone();event.waitUntil(caches.open(NAME).then(c=>c.put('/',copy)))}return response}).catch(()=>caches.match('/').then(r=>r||new Response('Open AMG Traders online once to enable offline billing.',{status:503}))));
 else if(url.pathname.includes('/assets/')||url.pathname.includes('/_next/')||url.pathname==='/brand-logo.png'||url.pathname.endsWith('.css')||url.pathname.endsWith('.js'))event.respondWith(caches.match(request).then(hit=>hit||fetch(request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(NAME).then(c=>c.put(request,copy)))}return response})));
});
self.addEventListener('message',event=>{if(event.data?.type==='CACHE')event.waitUntil(caches.open(NAME).then(c=>Promise.all(event.data.urls.filter(u=>new URL(u,self.location.origin).origin===self.location.origin).map(u=>c.add(u).catch(()=>{})))))});
