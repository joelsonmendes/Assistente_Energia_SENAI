
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');

const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(btn => btn.addEventListener('click', () => {
  navItems.forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  views.forEach(v => v.classList.toggle('active', v.id === btn.dataset.target));
  window.scrollTo({top:0, behavior:'smooth'});
}));

const search = document.getElementById('globalSearch');
const toast = document.getElementById('toast');

function showToast(text){
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(()=>toast.classList.remove('show'), 2200);
}

function runSearch(query){
  const q = query.toLowerCase().trim();
  const items = document.querySelectorAll('[data-search]');
  let hits = 0;
  items.forEach(el => {
    const ok = !q || el.dataset.search.toLowerCase().includes(q);
    el.classList.toggle('hidden-by-search', !ok);
    if (ok) hits++;
  });
  document.querySelector('[data-target="courses"]').click();
  showToast(q ? `${hits} resultado(s) encontrado(s)` : 'Filtro limpo');
}

document.getElementById('searchBtn').addEventListener('click', ()=>runSearch(search.value));
search.addEventListener('keydown', e => { if(e.key==='Enter') runSearch(search.value); });

document.querySelectorAll('.quick').forEach(btn => btn.addEventListener('click', ()=>{
  search.value = btn.dataset.query;
  showToast(`Consulta preparada: ${btn.dataset.query}`);
}));

const notes = document.getElementById('notesArea');
notes.value = localStorage.getItem('energiaHubNotes') || '';
document.getElementById('saveNotes').addEventListener('click', ()=>{
  localStorage.setItem('energiaHubNotes', notes.value);
  document.getElementById('saveStatus').textContent = 'Salvo neste dispositivo.';
  setTimeout(()=>document.getElementById('saveStatus').textContent='', 1800);
});
