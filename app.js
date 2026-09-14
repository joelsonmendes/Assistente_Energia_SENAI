
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg = await fetch('/api/status').then(r=>r.json()).catch(()=>({configured:false}));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const toast = (m)=>{const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400)};
if(!cfg.configured){document.body.innerHTML='<div class="login-screen"><div class="login-card"><h1>Configuração necessária</h1><p>Adicione as variáveis do Supabase no Vercel e redeploy.</p></div></div>';throw new Error('Supabase não configurado');}
const supabase=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
let session=null, courses=[], changes=[], currentMonth=new Date();

async function boot(){
  const {data}=await supabase.auth.getSession(); session=data.session;
  supabase.auth.onAuthStateChange((_e,s)=>{session=s;renderAuth(); if(s) loadAll();});
  renderAuth();
  if(session) await loadAll();
}
function renderAuth(){$('#loginScreen').classList.toggle('hidden',!!session);$('#app').classList.toggle('hidden',!session);}
$('#loginGoogle').onclick=async()=>{await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin,scopes:'openid email profile https://www.googleapis.com/auth/drive.readonly',queryParams:{access_type:'offline',prompt:'consent'}}});};
$('#logoutBtn').onclick=()=>supabase.auth.signOut();

async function loadAll(){
  const [{data:c},{data:h},{data:n},{data:s}]=await Promise.all([
    supabase.from('courses').select('*').eq('active',true).order('start_date',{ascending:true}),
    supabase.from('course_changes').select('*').order('created_at',{ascending:false}).limit(50),
    supabase.from('notes').select('*').maybeSingle(),
    supabase.from('sync_runs').select('*').eq('status','success').order('finished_at',{ascending:false}).limit(1).maybeSingle()
  ]);
  courses=c||[]; changes=h||[]; $('#notesArea').value=n?.body||'';
  $('#lastSync').textContent=s?.finished_at?'Última sincronização: '+new Date(s.finished_at).toLocaleString('pt-BR'):'Aguardando sincronização';
  renderAll();
}

$('#syncBtn').onclick=async()=>{
  if(!session)return;
  const providerToken=session.provider_token;
  if(!providerToken){toast('Entre novamente com Google para liberar leitura do Drive.');return;}
  $('#syncBtn').disabled=true;$('#syncBtn').textContent='Sincronizando...';
  try{
    const r=await fetch('/api/sync',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'x-google-provider-token':providerToken}});
    const j=await r.json(); if(!r.ok)throw new Error(j.error||'Falha na sincronização');
    toast(`Sincronização concluída: ${j.energyRows} registros, ${j.changes} alteração(ões).`);
    await loadAll();
  }catch(e){toast(e.message)}
  finally{$('#syncBtn').disabled=false;$('#syncBtn').textContent='↻ Sincronizar cronograma';}
};

function d(s){return s?new Date(s+'T12:00:00'):null}
function today(){const x=new Date();x.setHours(0,0,0,0);return x}
function days(a,b){return Math.ceil((a-b)/86400000)}
function deriveStatus(c){
  const t=today(), s=d(c.start_date), e=d(c.end_date);
  if(!c.teacher)return 'Pendente';
  if(s&&e&&s<=t&&e>=t)return 'Em andamento';
  if(s&&days(s,t)>=0&&days(s,t)<=7)return 'Próximo';
  if(e&&days(e,t)>=0&&days(e,t)<=7)return 'Encerrando';
  return c.status||'Programado';
}
function alertFor(c){
  const s=d(c.start_date),e=d(c.end_date),t=today(), arr=[];
  if(!c.teacher)arr.push({sev:'critical',title:'Docente não informado',msg:`${c.uc||c.course_name||c.class_name} • ${c.period_text||''}`});
  if(s&&days(s,t)>=0&&days(s,t)<=7)arr.push({sev:'warn',title:'Início próximo',msg:`${c.uc||c.course_name||c.class_name} • ${c.period_text||''} • ${c.teacher||'sem docente'}`});
  if(e&&days(e,t)>=0&&days(e,t)<=7)arr.push({sev:'',title:'Encerramento próximo',msg:`${c.uc||c.course_name||c.class_name} • ${c.period_text||''}`});
  if(String(c.sge_status).toLowerCase()==='false' && s && days(s,t)>=0 && days(s,t)<=7)arr.push({sev:'warn',title:'SGE pendente',msg:`${c.uc||c.class_name||''} inicia em breve.`});
  return arr;
}
function renderAll(){
  const t=today();
  const running=courses.filter(c=>{const s=d(c.start_date),e=d(c.end_date);return s&&e&&s<=t&&e>=t});
  const start7=courses.filter(c=>{const s=d(c.start_date);return s&&days(s,t)>=0&&days(s,t)<=7});
  const noTeacher=courses.filter(c=>!c.teacher);
  const alerts=courses.flatMap(alertFor);
  $('#kpiRunning').textContent=running.length;$('#kpiStart7').textContent=start7.length;$('#kpiNoTeacher').textContent=noTeacher.length;$('#kpiAlerts').textContent=alerts.length;

  $('#priorityList').innerHTML=(alerts.slice(0,6).map(a=>`<div class="item ${a.sev}"><b>${esc(a.title)}</b><span>${esc(a.msg)}</span></div>`).join('')||'<div class="item"><b>Nenhuma prioridade crítica</b><span>Sincronização atual sem alertas imediatos.</span></div>');
  const next=[...courses].filter(c=>d(c.start_date)&&d(c.start_date)>=t).sort((a,b)=>d(a.start_date)-d(b.start_date)).slice(0,6);
  $('#nextCards').innerHTML=next.map(c=>`<article class="course-card"><div class="course-meta"><span class="tag">${esc(c.area||'ENERGIA')}</span><span class="tag">${esc(deriveStatus(c))}</span></div><h4>${esc(c.uc||c.course_name||c.class_name||'Curso')}</h4><p>${esc(c.class_name||'')} • ${esc(c.teacher||'Sem docente')}</p><p>${esc(c.period_text||'')}</p></article>`).join('')||'<p>Sincronize o cronograma para carregar os próximos compromissos.</p>';

  renderCourses();renderTeachers();renderAlerts();renderHistory();renderCalendar();
}
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function renderCourses(){
  const q=$('#courseSearch')?.value.toLowerCase()||'', area=$('#areaFilter')?.value||'', st=$('#statusFilter')?.value||'';
  const rows=courses.filter(c=>{
    const txt=[c.uc,c.course_name,c.class_name,c.teacher,c.area].join(' ').toLowerCase();
    return (!q||txt.includes(q))&&(!area||c.area===area)&&(!st||deriveStatus(c)===st);
  });
  $('#coursesBody').innerHTML=rows.map(c=>`<tr><td>${esc(c.uc||c.course_name||'')}</td><td>${esc(c.class_name||'')}</td><td>${esc(c.period_text||'')}</td><td>${esc(c.teacher||'—')}</td><td>${esc(c.sge_status??'—')}</td><td>${esc(deriveStatus(c))}</td></tr>`).join('');
}
['courseSearch','areaFilter','statusFilter'].forEach(id=>$('#'+id).addEventListener('input',renderCourses));

function renderTeachers(){
  const m={};courses.forEach(c=>{const n=c.teacher||'Sem docente';(m[n]??=[]).push(c)});
  $('#teacherCards').innerHTML=Object.entries(m).sort((a,b)=>b[1].length-a[1].length).map(([n,arr])=>`<article class="teacher-card"><span class="tag">${arr.length} registro(s)</span><h4>${esc(n)}</h4><p>${esc([...new Set(arr.map(x=>x.area).filter(Boolean))].join(' • '))}</p><p>${esc(arr.slice(0,3).map(x=>x.uc||x.class_name).filter(Boolean).join(' | '))}</p></article>`).join('');
}
function renderAlerts(){const a=courses.flatMap(alertFor);$('#alertsList').innerHTML=a.map(x=>`<div class="item ${x.sev}"><b>${esc(x.title)}</b><span>${esc(x.msg)}</span></div>`).join('')||'<div class="item"><b>Sem alertas</b><span>Nenhuma pendência imediata.</span></div>'}
function renderHistory(){$('#historyList').innerHTML=changes.map(x=>`<div class="item"><b>${x.change_type==='created'?'Novo registro':x.change_type==='updated'?'Registro alterado':'Registro não encontrado'}</b><span>${new Date(x.created_at).toLocaleString('pt-BR')} • ${esc(Object.keys(x.changed_fields||{}).join(', ')||x.snapshot?.uc||x.fingerprint)}</span></div>`).join('')||'<div class="item"><b>Sem histórico</b><span>O histórico aparecerá após as sincronizações.</span></div>'}

function renderCalendar(){
  const y=currentMonth.getFullYear(),m=currentMonth.getMonth();$('#monthTitle').textContent=currentMonth.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const first=new Date(y,m,1), start=new Date(y,m,1-first.getDay()), names=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  let html=names.map(n=>`<div class="day-head">${n}</div>`).join('');
  for(let i=0;i<42;i++){const date=new Date(start);date.setDate(start.getDate()+i);const iso=date.toISOString().slice(0,10);const ev=[];
    courses.forEach(c=>{if(c.start_date===iso)ev.push(`<div class="event start">▶ ${esc((c.uc||c.class_name||'').slice(0,30))}</div>`);if(c.end_date===iso)ev.push(`<div class="event end">■ ${esc((c.uc||c.class_name||'').slice(0,30))}</div>`)});
    html+=`<div class="day ${date.getMonth()!==m?'muted':''}"><span class="daynum">${date.getDate()}</span>${ev.join('')}</div>`;
  }$('#calendarGrid').innerHTML=html;
}
$('#prevMonth').onclick=()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1);renderCalendar()};
$('#nextMonth').onclick=()=>{currentMonth=new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1);renderCalendar()};

function answer(q){
  q=q.toLowerCase();let list=[],title='Resultado da consulta';
  if(q.includes('sem docente')){list=courses.filter(c=>!c.teacher);title='Turmas/UCs sem docente'}
  else if(q.includes('come')&&(q.includes('semana')||q.includes('7 dias'))){const t=today();list=courses.filter(c=>{const s=d(c.start_date);return s&&days(s,t)>=0&&days(s,t)<=7});title='Cursos que começam nos próximos 7 dias'}
  else if(q.includes('fotovolta')){list=courses.filter(c=>JSON.stringify(c).toLowerCase().includes('fotovolta'));title='Fotovoltaica'}
  else if(q.includes('eletrot')){list=courses.filter(c=>JSON.stringify(c).toLowerCase().includes('eletrot'));title='Eletrotécnica'}
  else if(q.includes('nr-10')||q.includes('nr10')||q.includes('sep')){list=courses.filter(c=>{const x=JSON.stringify(c).toLowerCase();return x.includes('nr-10')||x.includes('nr10')||x.includes('sep')});title='NR-10 / SEP'}
  else if(q.includes('altera')){showAnswer('Alterações recentes',changes.slice(0,10).map(x=>`${x.change_type}: ${Object.keys(x.changed_fields||{}).join(', ')||x.snapshot?.uc||x.fingerprint}`));return}
  else {list=courses.filter(c=>JSON.stringify(c).toLowerCase().includes(q));}
  showAnswer(title,list.slice(0,15).map(c=>`${c.uc||c.course_name||c.class_name} — ${c.period_text||''} — ${c.teacher||'Sem docente'}`));
}
function showAnswer(title,lines){const el=$('#assistantAnswer');el.innerHTML=`<b>${esc(title)}</b><div>${lines.length?lines.map(x=>`<div>• ${esc(x)}</div>`).join(''):'Nenhum registro encontrado.'}</div>`;el.classList.remove('hidden')}
$('#askBtn').onclick=()=>answer($('#askInput').value);$('#askInput').addEventListener('keydown',e=>{if(e.key==='Enter')answer(e.target.value)});
$$('.quick button').forEach(b=>b.onclick=()=>{$('#askInput').value=b.dataset.q;answer(b.dataset.q)});

$$('.nav').forEach(b=>b.onclick=()=>{$$('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.view').forEach(v=>v.classList.toggle('active',v.id===b.dataset.view));window.scrollTo({top:0,behavior:'smooth'})});

$('#saveNotes').onclick=async()=>{const body=$('#notesArea').value;const {error}=await supabase.from('notes').upsert({owner_id:session.user.id,body,updated_at:new Date().toISOString()},{onConflict:'owner_id'});$('#notesState').textContent=error?error.message:'Salvo no Supabase';if(!error)setTimeout(()=>$('#notesState').textContent='',1800)};
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true}};
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js');
boot();
