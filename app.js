
const CHAT_DEFAULT="https://chatgpt.com/c/6aa80830-031c-83e9-93e9-40541a9f4158";
const SCHEDULE_DEFAULT="https://docs.google.com/spreadsheets/d/1vX35JOwsYnmFEOacJNPijK3q1OLfXiZ6/edit?gid=52479465#gid=52479465";
const DATA_URL="./data/energia.json";
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let db={updated_at:null,source:"",courses:[],changes:[]};

function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2500)}
function fmt(s){if(!s)return"—";const p=s.split("-");return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:s}
function date(s){if(!s)return null;const d=new Date(s+"T00:00:00");return isNaN(d)?null:d}
function today(){const d=new Date();d.setHours(0,0,0,0);return d}
function dd(a,b){return Math.floor((b-a)/86400000)}
function clean(v){return String(v??"").trim()}
function boolSge(v){return ["true","confirmado","sim","ok","1"].includes(clean(v).toLowerCase())}
function course(c){return {course_name:clean(c.course_name||c.class_name||c.area||"Curso"),class_name:clean(c.class_name),uc:clean(c.uc||c.module||"UC"),start_date:clean(c.start_date),end_date:clean(c.end_date),teacher:clean(c.teacher),shift:clean(c.shift),status:clean(c.status),sge_status:c.sge_status,area:clean(c.area)}}
function courses(){return (db.courses||[]).map(course)}
function active(){const t=today();return courses().filter(c=>{const s=date(c.start_date),e=date(c.end_date);return s&&e&&s<=t&&e>=t})}
function upcoming(days=15){const t=today();return courses().filter(c=>{const s=date(c.start_date);return s&&s>t&&dd(t,s)<=days}).sort((a,b)=>date(a.start_date)-date(b.start_date))}
function alerts(){
  const t=today(),a=[];
  courses().forEach(c=>{
    const s=date(c.start_date),e=date(c.end_date),d=s?dd(t,s):999;
    if(!c.teacher && s && d>=0 && d<=30)a.push({level:"red",title:"Sem docente",detail:`${c.course_name} • ${c.uc} • início ${fmt(c.start_date)}`});
    if(!boolSge(c.sge_status) && s && d>=0 && d<=45)a.push({level:"yellow",title:"SGE pendente",detail:`${c.course_name} • ${c.uc} • ${fmt(c.start_date)}`});
    if(s&&d>=0&&d<=7)a.push({level:"blue",title:"Início próximo",detail:`${c.course_name} • ${c.uc} • ${fmt(c.start_date)} • ${c.teacher||"sem docente"}`});
    if(e){const x=dd(t,e);if(x>=0&&x<=3)a.push({level:"green",title:"Encerramento próximo",detail:`${c.course_name} • ${c.uc} • ${fmt(c.end_date)}`})}
  });
  const seen=new Set;return a.filter(x=>{const k=x.title+x.detail;if(seen.has(k))return false;seen.add(k);return true}).slice(0,20)
}
function setView(v){$$(".view").forEach(x=>x.classList.remove("active"));$$(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===v));$("#view-"+v).classList.add("active");const t={home:"Painel do Coordenador",courses:"Cursos e UCs",agenda:"Agenda",alerts:"Alertas Automáticos",changes:"Mudanças no Cronograma",ana:"Ana",settings:"Configurações"};$("#title").textContent=t[v]||"Ana Energia"}
$$(".nav").forEach(b=>b.onclick=()=>setView(b.dataset.view));

function openAna(prompt){navigator.clipboard?.writeText(prompt).catch(()=>{});toast("Pergunta copiada. Abrindo a Ana...");setTimeout(()=>window.open(localStorage.getItem("ana_chat_url")||CHAT_DEFAULT,"_blank","noopener"),220)}
$$("[data-prompt]").forEach(b=>b.onclick=()=>openAna(b.dataset.prompt));
$("#askAnaSide").onclick=()=>openAna("Ana, abra meu painel mental da área de Energia e diga o que exige minha atenção agora.");
$("#askAnaHero").onclick=()=>openAna("Ana, mostre meu dashboard de hoje da área de Energia e destaque prioridades.");
$("#sendAna").onclick=()=>{const p=$("#anaPrompt").value.trim();if(!p)return toast("Digite uma pergunta.");openAna(p)}

function render(){
  const ac=active(),up7=upcoming(7),al=alerts(),pending=al.filter(x=>x.level==="red"||x.level==="yellow");
  $("#kpis").innerHTML=[
    ["Em andamento",ac.length,"Cursos/UCs ativos hoje"],
    ["Próximos 7 dias",up7.length,"Novos inícios"],
    ["Alertas críticos",al.filter(x=>x.level==="red").length,"Sem docente / ação"],
    ["Pendências",pending.length,"SGE + confirmações"]
  ].map(x=>`<div class="kpi"><small>${x[0]}</small><strong>${x[1]}</strong><span>${x[2]}</span></div>`).join("");
  const card=x=>`<div class="item"><i class="dot ${x.level||"blue"}"></i><div><strong>${x.title}</strong><span>${x.detail}</span></div></div>`;
  $("#priority").innerHTML=al.slice(0,6).map(card).join("")||"<div class='callout'>Nenhuma prioridade crítica detectada.</div>";
  $("#alerts").innerHTML=al.map(card).join("")||"<div class='callout'>Nenhum alerta no momento.</div>";
  const agenda=[...ac.map(c=>({date:c.end_date,title:`Encerramento • ${c.course_name}`,detail:`${c.uc} • ${c.teacher||"sem docente"}`})),...upcoming(30).map(c=>({date:c.start_date,title:`Início • ${c.course_name}`,detail:`${c.uc} • ${c.teacher||"sem docente"} • ${c.shift||"turno não informado"}`}))].sort((a,b)=>date(a.date)-date(b.date));
  const ag=x=>`<div class="item"><i class="dot blue"></i><div><strong>${fmt(x.date)} — ${x.title}</strong><span>${x.detail}</span></div></div>`;
  $("#agendaMini").innerHTML=agenda.slice(0,5).map(ag).join("");
  $("#agendaFull").innerHTML=agenda.slice(0,30).map(ag).join("")||"<div class='callout'>Sem eventos futuros com data registrada.</div>";
  renderCourses();
  $("#changes").innerHTML=(db.changes||[]).slice(0,30).map(x=>`<div class="item"><i class="dot yellow"></i><div><strong>${clean(x.title)||"Alteração"}${x.date?` • ${fmt(x.date)}`:""}</strong><span>${clean(x.detail)}</span></div></div>`).join("")||"<div class='callout'>Nenhuma mudança registrada no arquivo dinâmico.</div>";
}
function renderCourses(){
  const q=clean($("#search")?.value).toLowerCase();
  const rows=courses().filter(c=>!q||[c.course_name,c.class_name,c.uc,c.teacher,c.status,c.area].join(" ").toLowerCase().includes(q));
  $("#courseTable").innerHTML=`<table class="table"><thead><tr><th>Curso/Turma</th><th>UC</th><th>Início</th><th>Término</th><th>Docente</th><th>Turno</th><th>Status</th><th>SGE</th></tr></thead><tbody>${rows.map(c=>`<tr><td>${c.course_name}${c.class_name?`<div class="muted">${c.class_name}</div>`:""}</td><td>${c.uc}</td><td>${fmt(c.start_date)}</td><td>${fmt(c.end_date)}</td><td>${c.teacher||"<span class='muted'>Não informado</span>"}</td><td>${c.shift||"—"}</td><td>${c.status||"—"}</td><td>${boolSge(c.sge_status)?"OK":"Pendente"}</td></tr>`).join("")}</tbody></table>`;
}
$("#search").addEventListener("input",renderCourses);

async function loadData(force=false){
  const b=$("#sourceBadge");b.textContent="Atualizando...";b.className="badge neutral";
  try{
    const sep=DATA_URL.includes("?")?"&":"?";
    const r=await fetch(DATA_URL+(force?`${sep}t=${Date.now()}`:""),{cache:force?"no-store":"default"});
    if(!r.ok)throw new Error("HTTP "+r.status);
    const x=await r.json();
    if(!Array.isArray(x.courses))throw new Error("Formato inválido");
    db=x;localStorage.setItem("ana_v3_last_data",JSON.stringify(x));
    const when=x.updated_at?new Date(x.updated_at).toLocaleString("pt-BR"):"sem horário";
    b.textContent=`Atualizado: ${when}`;b.className="badge ok";render();autoNotify();return true;
  }catch(e){
    try{const x=JSON.parse(localStorage.getItem("ana_v3_last_data")||"null");if(x?.courses){db=x;b.textContent="Offline • último dado salvo";b.className="badge error";render();return false}}catch{}
    b.textContent="Sem dados";b.className="badge error";db={courses:[],changes:[]};render();return false;
  }
}
$("#refresh").onclick=()=>loadData(true).then(ok=>toast(ok?"Dados atualizados.":"Usando último dado disponível."));
$("#scheduleLink").href=localStorage.getItem("ana_schedule_url")||SCHEDULE_DEFAULT;

async function askNotif(){if(!("Notification" in window))return toast("Notificações não suportadas.");const p=await Notification.requestPermission();toast(p==="granted"?"Notificações ativadas.":"Permissão não concedida.");if(p==="granted")new Notification("Ana Energia V3",{body:"Alertas do painel ativados.",icon:"./icon.svg"})}
$("#notify").onclick=askNotif;$("#testNotif").onclick=()=>Notification?.permission==="granted"?new Notification("Ana Energia V3",{body:"Teste de notificação concluído.",icon:"./icon.svg"}):askNotif();
function autoNotify(){if(localStorage.getItem("ana_auto_alerts")==="false"||Notification?.permission!=="granted")return;const a=alerts()[0];if(!a)return;const key=(new Date).toISOString().slice(0,10)+"|"+a.title+a.detail;if(localStorage.getItem("ana_v3_notif")===key)return;new Notification("Ana Energia • Atenção",{body:a.title+" — "+a.detail,icon:"./icon.svg"});localStorage.setItem("ana_v3_notif",key)}

$("#copyPanel").onclick=()=>{const txt=`ANA ENERGIA V3\nAtualização: ${db.updated_at||"—"}\nEm andamento: ${active().length}\nPróximos 7 dias: ${upcoming(7).length}\nPendências: ${alerts().filter(x=>x.level==="red"||x.level==="yellow").length}\n\n`+active().map(c=>`- ${c.course_name} | ${c.uc} | ${fmt(c.start_date)} a ${fmt(c.end_date)} | ${c.teacher||"sem docente"}`).join("\n");navigator.clipboard?.writeText(txt);toast("Resumo copiado.")}

$("#chatUrl").value=localStorage.getItem("ana_chat_url")||CHAT_DEFAULT;
$("#scheduleUrl").value=localStorage.getItem("ana_schedule_url")||SCHEDULE_DEFAULT;
$("#autoAlerts").checked=localStorage.getItem("ana_auto_alerts")!=="false";
$("#save").onclick=()=>{localStorage.setItem("ana_chat_url",$("#chatUrl").value.trim()||CHAT_DEFAULT);localStorage.setItem("ana_schedule_url",$("#scheduleUrl").value.trim()||SCHEDULE_DEFAULT);localStorage.setItem("ana_auto_alerts",$("#autoAlerts").checked?"true":"false");$("#scheduleLink").href=$("#scheduleUrl").value.trim()||SCHEDULE_DEFAULT;toast("Configurações salvas.")}

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
loadData(true);setInterval(()=>loadData(true),60*60*1000);
