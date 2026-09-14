
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import crypto from 'crypto';

const SUPA=()=>createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const FILE_ID=process.env.CRONOGRAMA_FILE_ID||'1vX35JOwsYnmFEOacJNPijK3q1OLfXiZ6';

const ENERGY_TERMS=[
 'eletrot','energia','energias renov','fotovolta','solar','eletricista industrial',
 'instalações elétricas','instalacoes eletricas','acionamentos elétricos','acionamentos eletricos',
 'nr-10','nr10','sep','eficiência energética','eficiencia energetica','biomassa','eólico','eolico'
];
const n=v=>String(v??'').replace(/\s+/g,' ').trim();
const low=v=>n(v).toLowerCase();
const energy=arr=>ENERGY_TERMS.some(t=>low(arr.join(' ')).includes(t));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');

function parseDate(v,year=2026){
 if(!v)return null;if(v instanceof Date)return v.toISOString().slice(0,10);
 const s=n(v);let m=s.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);if(!m)return null;
 let y=m[3]?+m[3]:year;if(y<100)y+=2000;return `${y}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`;
}
function periodDates(v){
 const s=n(v); if(!s)return [null,null];
 const ms=[...s.matchAll(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g)];
 if(!ms.length)return [null,null];
 const conv=(m, fallbackYear)=>{let y=m[3]?+m[3]:fallbackYear;if(y<100)y+=2000;return `${y}-${String(+m[2]).padStart(2,'0')}-${String(+m[1]).padStart(2,'0')}`};
 const year=ms[ms.length-1][3]?(+ms[ms.length-1][3]<100?2000+(+ms[ms.length-1][3]):+ms[ms.length-1][3]):2026;
 return [conv(ms[0],year),ms[1]?conv(ms[1],year):conv(ms[0],year)];
}
function classify(txt){
 const s=low(txt);
 if(s.includes('fotovolta'))return 'Fotovoltaica';
 if(s.includes('energia')||s.includes('biomassa')||s.includes('eólic')||s.includes('eolic'))return 'Energias Renováveis';
 if(s.includes('nr-10')||s.includes('nr10')||s.includes('sep'))return 'NR-10 / SEP';
 if(s.includes('eletricista industrial'))return 'Eletricista Industrial';
 if(s.includes('predial')||s.includes('instalações elétricas')||s.includes('instalacoes eletricas'))return 'Instalações Elétricas';
 if(s.includes('eletrot'))return 'Eletrotécnica';
 return 'Energia';
}
function normHeader(v){return low(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ')}
function pick(row, headers, variants){
 for(let i=0;i<headers.length;i++){const h=normHeader(headers[i]);if(variants.some(v=>h.includes(v)))return row[i]}
 return '';
}
function extractWorkbook(buf){
 const wb=XLSX.read(buf,{type:'buffer',cellDates:true});
 const out=[];let total=0;
 for(const sheetName of wb.SheetNames){
   const rows=XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,defval:'',raw:false});
   total+=rows.length;
   let lastContext='';
   for(let i=0;i<rows.length;i++){
     const row=rows[i].map(n); const joined=row.join(' | ');
     if(row.filter(Boolean).length===1 && row[0].length>4) lastContext=row[0];
     if(!energy([sheetName,lastContext,joined]))continue;
     // Find nearest plausible header row above.
     let hidx=-1;
     for(let k=i;k>=Math.max(0,i-25);k--){
       const hs=rows[k].map(normHeader).join(' ');
       if((hs.includes('docente')||hs.includes('professor')) && (hs.includes('periodo')||hs.includes('período')||hs.includes('turma'))){hidx=k;break}
     }
     if(hidx<0)continue;
     const headers=rows[hidx]; if(i<=hidx)continue;
     const uc=pick(row,headers,['uc','unidade curricular']);
     const turma=pick(row,headers,['turma turno','turma']);
     const periodo=pick(row,headers,['periodo']);
     const docente=pick(row,headers,['docente','professor']);
     const sge=pick(row,headers,['cod turma sge','codigo turma sge','cod sge']);
     const ch=pick(row,headers,['carga horaria','ch']);
     const sgeStatus=pick(row,headers,['sge']);
     const contrato=pick(row,headers,['contrato']);
     const tipo=pick(row,headers,['tipo']);
     const obs=pick(row,headers,['obs']);
     const module=pick(row,headers,['modulo']);
     if(![uc,turma,periodo,docente,sge].some(Boolean))continue;
     const [start,end]=periodDates(periodo);
     const courseName=lastContext||sheetName;
     const fp=hash([sheetName,uc,turma,sge,periodo].map(low).join('|'));
     out.push({fingerprint:fp,source_sheet:sheetName,source_row:i+1,area:classify([sheetName,lastContext,uc,turma].join(' ')),module:n(module),uc:n(uc),course_name:n(courseName),class_name:n(turma),sge_code:n(sge),period_text:n(periodo),start_date:start,end_date:end,shift:/manh/i.test(turma)?'Manhã':/tard/i.test(turma)?'Tarde':/noit/i.test(turma)?'Noite':'',teacher:n(docente),workload_hours:Number(String(ch).replace(',','.'))||null,status:'',sge_status:n(sgeStatus),contract:n(contrato),contract_type:n(tipo),notes:n(obs),raw_data:{row}});
   }
 }
 const uniq=new Map(); out.forEach(x=>uniq.set(x.fingerprint,x));
 return {total,rows:[...uniq.values()]};
}

export default async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido'});
 const bearer=(req.headers.authorization||'').replace(/^Bearer\s+/i,''); const provider=req.headers['x-google-provider-token'];
 if(!bearer||!provider)return res.status(401).json({error:'Sessão Google/Supabase ausente. Entre novamente.'});
 const sb=SUPA(); const {data:{user},error:uerr}=await sb.auth.getUser(bearer); if(uerr||!user)return res.status(401).json({error:'Sessão inválida'});
 const {data:run,error:rerr}=await sb.from('sync_runs').insert({user_id:user.id,source_file_id:FILE_ID}).select().single(); if(rerr)return res.status(500).json({error:rerr.message});
 try{
   const metaR=await fetch(`https://www.googleapis.com/drive/v3/files/${FILE_ID}?fields=id,name,modifiedTime,size,mimeType`,{headers:{Authorization:`Bearer ${provider}`}});
   if(!metaR.ok)throw new Error('Não foi possível ler os metadados do cronograma. Verifique a permissão Google Drive.');
   const meta=await metaR.json();
   const fileR=await fetch(`https://www.googleapis.com/drive/v3/files/${FILE_ID}?alt=media`,{headers:{Authorization:`Bearer ${provider}`}});
   if(!fileR.ok)throw new Error('Não foi possível baixar o cronograma oficial.');
   const buf=Buffer.from(await fileR.arrayBuffer()); const parsed=extractWorkbook(buf);
   const {data:old}=await sb.from('courses').select('*').eq('owner_id',user.id); const oldMap=new Map((old||[]).map(x=>[x.fingerprint,x]));
   const seen=new Set();let changes=0;
   for(const x of parsed.rows){
     seen.add(x.fingerprint);const prev=oldMap.get(x.fingerprint); const payload={...x,owner_id:user.id,active:true,last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()};
     if(!prev){
       const {data:created,error}=await sb.from('courses').insert(payload).select().single();if(error)throw error;
       await sb.from('course_changes').insert({owner_id:user.id,sync_run_id:run.id,course_id:created.id,fingerprint:x.fingerprint,change_type:'created',snapshot:x});changes++;
     }else{
       const fields=['area','module','uc','course_name','class_name','sge_code','period_text','start_date','end_date','shift','teacher','workload_hours','status','sge_status','contract','contract_type','notes'];
       const diff={};fields.forEach(f=>{if(String(prev[f]??'')!==String(x[f]??''))diff[f]={from:prev[f],to:x[f]}});
       await sb.from('courses').update(payload).eq('id',prev.id);
       if(Object.keys(diff).length){await sb.from('course_changes').insert({owner_id:user.id,sync_run_id:run.id,course_id:prev.id,fingerprint:x.fingerprint,change_type:'updated',changed_fields:diff,snapshot:x});changes++;}
     }
   }
   for(const prev of old||[]){if(prev.active&&!seen.has(prev.fingerprint)){await sb.from('courses').update({active:false,updated_at:new Date().toISOString()}).eq('id',prev.id);await sb.from('course_changes').insert({owner_id:user.id,sync_run_id:run.id,course_id:prev.id,fingerprint:prev.fingerprint,change_type:'missing',snapshot:prev});changes++;}}
   await sb.from('sync_runs').update({source_modified_time:meta.modifiedTime,source_size:Number(meta.size||0),finished_at:new Date().toISOString(),status:'success',rows_total:parsed.total,rows_energy:parsed.rows.length,changes_count:changes,message:'Sincronização concluída'}).eq('id',run.id);
   return res.status(200).json({ok:true,energyRows:parsed.rows.length,changes,sourceModifiedTime:meta.modifiedTime});
 }catch(e){await sb.from('sync_runs').update({finished_at:new Date().toISOString(),status:'error',message:e.message}).eq('id',run.id);return res.status(500).json({error:e.message});}
}
