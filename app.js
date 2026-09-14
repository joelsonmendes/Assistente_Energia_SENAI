
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const seed=window.ANA_SEED;
let state={courses:[],changes:[],syncRuns:[]};

const cfg={
  chatUrl:localStorage.getItem("ana_chat_url")||"https://chatgpt.com/c/6aa80830-031c-83e9-93e9-40541a9f4158",
  scheduleUrl:localStorage.getItem("ana_schedule_url")||seed.scheduleUrl,
  supabaseUrl:localStorage.getItem("ana_supabase_url")||"https://yeaseskoklzwtgneasfi.supabase.co",
  supabaseKey:localStorage.getItem("ana_supabase_key")||"sb_publishable_dIeobQdtkTY_ivChUqVFQQ_TbkcC7FI",
  edgeFunction:localStorage.getItem("ana_edge_function")||"sync-cronograma",
  autoAlerts:localStorage.getItem("ana_auto_alerts")!=="false",
  autoSync:localStorage.getItem("ana_auto_sync")!=="false"
};

function toast(msg){const e=$("#toast");e.textContent=msg;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2600)}
function setView(v){$$(".view").forEach(x=>x.classList.remove("active"));$$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.view===v));$("#view-"+v).classList.add("active");const t={home:"Painel do Coordenador",agenda:"Agenda",alerts:"Alertas Automáticos",labs:"Laboratórios",changes:"Mudanças no Cronograma",assistant:"Ana",settings:"Configurações"};$("#pageTitle").textContent=t[v]||"Ana Energia"}
$$(".nav-item").forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$("[data-view-jump]").forEach(b=>b.onclick=()=>setView(b.dataset.viewJump));
function openAna(prompt){navigator.clipboard?.writeText(prompt).catch(()=>{});toast("Pergunta copiada. Abrindo a Ana...");setTimeout(()=>window.open(localStorage.getItem("ana_chat_url")||cfg.chatUrl,"_blank","noopener"),250)}
$$("[data-prompt]").forEach(b=>b.onclick=()=>openAna(b.dataset.prompt));
$("#talkAnaHero").onclick=()=>openAna("Ana, mostre meu dashboard de hoje e diga o que precisa da minha atenção.");
$("#talkAnaSide").onclick=()=>openAna("Ana, estou no meu Centro de Comando. O que eu preciso saber agora sobre a área de Energia?");
$("#sendToAna").onclick=()=>{const p=$("#assistantPrompt").value.trim();if(!p)return toast("Digite uma pergunta.");openAna(p)}

function daysBetween(a,b){return Math.floor((b-a)/86400000)}
function today(){const d=new Date();d.setHours(0,0,0,0);return d}
function parseDate(s){if(!s)return null;const d=new Date(s+"T00:00:00");return isNaN(d)?null:d}
function normCourse(c){return {
  course_name:c.course_name||c.class_name||c.area||"Curso",
  uc:c.uc||c.module||"Unidade curricular",
  start_date:c.start_date||"",
  end_date:c.end_date||"",
  teacher:c.teacher||"",
  sge_status:c.sge_status===true||c.sge_status==="true",
  status:c.status||"",
  source:c.source_sheet||""
}}

function getCourses(){return (state.courses.length?state.courses:seed.courses).map(normCourse)}
function activeCourses(){
  const td=today();
  return getCourses().filter(c=>{const s=parseDate(c.start_date),e=parseDate(c.end_date);return s&&e&&s<=td&&e>=td})
}
function nextCourses(limit=8){
  const td=today();
  return getCourses().filter(c=>{const s=parseDate(c.start_date);return s&&s>td}).sort((a,b)=>parseDate(a.start_date)-parseDate(b.start_date)).slice(0,limit)
}
function buildAlerts(){
  const td=today(), out=[];
  for(const c of getCourses()){
    const s=parseDate(c.start_date), e=parseDate(c.end_date);
    if(!c.teacher && s && daysBetween(td,s)>=0 && daysBetween(td,s)<=30) out.push({level:"red",title:c.course_name,detail:`${c.uc} • inicia ${fmt(c.start_date)} • sem docente informado.`});
    if(!c.sge_status && s && daysBetween(td,s)>=0 && daysBetween(td,s)<=45) out.push({level:"yellow",title:c.course_name,detail:`${c.uc} • inicia ${fmt(c.start_date)} • SGE pendente/não confirmado.`});
    if(s && daysBetween(td,s)>=0 && daysBetween(td,s)<=7) out.push({level:"blue",title:"Próximo início",detail:`${c.course_name} • ${c.uc} • ${fmt(c.start_date)}.`});
    if(e && daysBetween(td,e)>=0 && daysBetween(td,e)<=3) out.push({level:"green",title:"Encerramento próximo",detail:`${c.course_name} • ${c.uc} • termina ${fmt(c.end_date)}.`});
  }
  return dedupe(out).slice(0,12)
}
function dedupe(arr){const seen=new Set;return arr.filter(x=>{const k=x.title+"|"+x.detail;if(seen.has(k))return false;seen.add(k);return true})}
function fmt(s){if(!s)return"—";const [y,m,d]=s.split("-");return `${d}/${m}/${y}`}

function render(){
  const active=activeCourses(), upcoming=nextCourses(), alerts=buildAlerts();
  $("#kpis").innerHTML=[
    ["Cursos em andamento",active.length,"Área de Energia"],
    ["Próximos 7 dias",upcoming.filter(c=>daysBetween(today(),parseDate(c.start_date))<=7).length,"Novos inícios"],
    ["Alertas críticos",alerts.filter(a=>a.level==="red").length,"Exigem ação"],
    ["Pendências",alerts.filter(a=>a.level==="red"||a.level==="yellow").length,"Docente / SGE"]
  ].map(([a,b,c])=>`<div class="kpi"><small>${a}</small><strong>${b}</strong><span>${c}</span></div>`).join("");

  const alertHtml=a=>`<div class="alert-card"><i class="dot ${a.level}"></i><div><strong>${a.title}</strong><span>${a.detail}</span></div></div>`;
  $("#attentionList").innerHTML=(alerts.slice(0,5).map(alertHtml).join("")||"<div class='callout'>Nenhuma pendência crítica detectada.</div>");
  $("#alertsList").innerHTML=(alerts.map(alertHtml).join("")||"<div class='callout'>Nenhum alerta no momento.</div>");

  const agenda=[...active.map(c=>({date:fmt(c.end_date).slice(0,5),title:`Encerramento • ${c.course_name}`,detail:`${c.uc} • ${c.teacher||"sem docente"}`})),...upcoming.map(c=>({date:fmt(c.start_date).slice(0,5),title:`Início • ${c.course_name}`,detail:`${c.uc} • ${c.teacher||"sem docente"}`}))].slice(0,10);
  const ag=a=>`<div class="agenda-card"><div class="agenda-date">${a.date}</div><div><strong>${a.title}</strong><span>${a.detail}</span></div></div>`;
  $("#agendaMini").innerHTML=agenda.slice(0,4).map(ag).join("");
  $("#agendaFull").innerHTML=agenda.map(ag).join("");

  $("#labsGrid").innerHTML=seed.labs.map(l=>`<div class="lab-card"><strong>${l.name}</strong><div class="row"><span>${l.detail}</span><b class="badge ${l.badge}">${l.status}</b></div></div>`).join("");

  const changes=state.changes.length?state.changes.map(ch=>({title:ch.change_type||"Alteração",detail:JSON.stringify(ch.changed_fields||ch.snapshot||{}).slice(0,260)})):[
    {title:"Modo de segurança ativo",detail:"Aguardando dados sincronizados do Supabase. O painel usa dados locais para não ficar vazio."},
    {title:"Regra ampliada de Energia",detail:"Inclui Eletrotécnica, Renováveis, Fotovoltaica, Eletricista Industrial 4.0, NR-10/SEP, Eficiência, Eólica e Biomassa."}
  ];
  $("#changesList").innerHTML=changes.map(c=>`<div class="change-card"><strong>${c.title}</strong><span>${c.detail}</span></div>`).join("");
  $("#scheduleLink").href=cfg.scheduleUrl;
}

async function supabaseFetch(path,opts={}){
  const url=cfg.supabaseUrl.replace(/\/$/,"")+path;
  const headers={apikey:cfg.supabaseKey,Authorization:`Bearer ${cfg.supabaseKey}`,"Content-Type":"application/json",...(opts.headers||{})};
  const r=await fetch(url,{...opts,headers});
  if(!r.ok)throw new Error(await r.text());
  return r.status===204?null:r.json();
}

async function loadSupabase(){
  try{
    const courses=await supabaseFetch("/rest/v1/courses?select=*&active=eq.true&order=start_date.asc&limit=300");
    state.courses=Array.isArray(courses)?courses:[];
    const changes=await supabaseFetch("/rest/v1/course_changes?select=*&order=created_at.desc&limit=50");
    state.changes=Array.isArray(changes)?changes:[];
    const runs=await supabaseFetch("/rest/v1/sync_runs?select=*&order=started_at.desc&limit=1");
    state.syncRuns=Array.isArray(runs)?runs:[];
    const last=state.syncRuns[0];
    const b=$("#syncBadge");
    if(last){b.textContent=`Última sync: ${new Date(last.started_at||last.finished_at).toLocaleString("pt-BR")}`;b.className="sync-badge ok"}else{b.textContent="Supabase conectado";b.className="sync-badge ok"}
    render();
    return true;
  }catch(e){
    $("#syncBadge").textContent="Modo local";
    $("#syncBadge").className="sync-badge error";
    render();
    return false;
  }
}

async function syncNow(){
  const btn=$("#syncBtn");btn.disabled=true;btn.textContent="Sincronizando...";
  try{
    const fn=cfg.supabaseUrl.replace(/\/$/,"")+`/functions/v1/${cfg.edgeFunction}`;
    const token=localStorage.getItem("ana_supabase_access_token")||cfg.supabaseKey;
    const provider=localStorage.getItem("ana_google_provider_token")||"";
    if(!provider){
      toast("Para sincronização automática do Drive, faça login Google na versão conectada ou use a Ana para conferir o cronograma.");
      throw new Error("provider token ausente");
    }
    const r=await fetch(fn,{method:"POST",headers:{Authorization:`Bearer ${token}`,apikey:cfg.supabaseKey,"Content-Type":"application/json","x-google-provider-token":provider}});
    if(!r.ok)throw new Error(await r.text());
    toast("Cronograma sincronizado.");
    await loadSupabase();
  }catch(e){
    toast("Não foi possível sincronizar automaticamente. Mantendo dados locais.");
  }finally{btn.disabled=false;btn.textContent="Sincronizar"}
}

$("#syncBtn").onclick=syncNow;

async function requestNotifications(){
  if(!("Notification" in window)){toast("Este navegador não suporta notificações.");return}
  const p=await Notification.requestPermission();
  toast(p==="granted"?"Notificações ativadas.":"Permissão não concedida.");
  if(p==="granted")new Notification("Ana Energia V2",{body:"Alertas ativados.",icon:"./icon.svg"});
}
$("#notifyBtn").onclick=requestNotifications;
$("#testNotification").onclick=()=>Notification?.permission==="granted"?new Notification("Ana Energia V2 • Teste",{body:"Central de alertas operacional.",icon:"./icon.svg"}):requestNotifications();

$("#copySummary").onclick=()=>{
  const active=activeCourses(), alerts=buildAlerts();
  const txt=`ANA ENERGIA V2\nEm andamento: ${active.length}\nPendências: ${alerts.filter(a=>a.level==="red"||a.level==="yellow").length}\n\n`+active.map(c=>`- ${c.course_name} | ${c.uc} | ${fmt(c.start_date)} a ${fmt(c.end_date)} | ${c.teacher||"sem docente"}`).join("\n");
  navigator.clipboard?.writeText(txt);toast("Resumo copiado.");
};

$("#saveSettings").onclick=()=>{
  for(const [id,key] of [["chatUrl","ana_chat_url"],["scheduleUrl","ana_schedule_url"],["supabaseUrl","ana_supabase_url"],["supabaseKey","ana_supabase_key"],["edgeFunction","ana_edge_function"]])localStorage.setItem(key,$("#"+id).value.trim());
  localStorage.setItem("ana_auto_alerts",$("#autoAlerts").checked?"true":"false");
  localStorage.setItem("ana_auto_sync",$("#autoSync").checked?"true":"false");
  Object.assign(cfg,{chatUrl:$("#chatUrl").value.trim(),scheduleUrl:$("#scheduleUrl").value.trim(),supabaseUrl:$("#supabaseUrl").value.trim(),supabaseKey:$("#supabaseKey").value.trim(),edgeFunction:$("#edgeFunction").value.trim(),autoAlerts:$("#autoAlerts").checked,autoSync:$("#autoSync").checked});
  $("#scheduleLink").href=cfg.scheduleUrl;toast("Configurações salvas.");
};

function fillSettings(){
  $("#chatUrl").value=cfg.chatUrl;$("#scheduleUrl").value=cfg.scheduleUrl;$("#supabaseUrl").value=cfg.supabaseUrl;$("#supabaseKey").value=cfg.supabaseKey;$("#edgeFunction").value=cfg.edgeFunction;$("#autoAlerts").checked=cfg.autoAlerts;$("#autoSync").checked=cfg.autoSync;
}

function autoAlert(){
  if(!cfg.autoAlerts||!("Notification" in window)||Notification.permission!=="granted")return;
  const key=new Date().toISOString().slice(0,10), last=localStorage.getItem("ana_v2_last_alert");
  if(last===key)return;
  const top=buildAlerts()[0];if(top){new Notification("Ana Energia • Atenção",{body:top.title+" — "+top.detail,icon:"./icon.svg"});localStorage.setItem("ana_v2_last_alert",key)}
}

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
fillSettings();render();loadSupabase().then(()=>{if(cfg.autoSync)setTimeout(syncNow,1200)});setTimeout(autoAlert,1800);setInterval(()=>{loadSupabase();autoAlert()},60*60*1000);
