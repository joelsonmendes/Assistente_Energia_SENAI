const CACHE='energia-hub-v3';
const ASSETS=['./','./index.html','./styles.css','./app.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.hostname.endsWith('supabase.co')||u.hostname.includes('googleapis.com')) return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const copy=resp.clone();if(resp.ok&&u.origin===location.origin)caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;})));
});
