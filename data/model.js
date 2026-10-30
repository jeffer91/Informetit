/* Informetit · Bloque 01 · Contrato canónico de datos y análisis (sin dependencias). */
(function(root){
'use strict';
const SCHEMA_VERSION=2;
const PERIOD='Octubre 2025 - Marzo 2026';
const REQUIREMENTS=['Academico','Documentacion','Financiero','Practicas','Vinculacion','Seguimiento','Ingles','Datos','Titulacion'];
const arrays=['estudiantes','notas','notasBorrador','cursosNucleos','evaluaciones','trabajos','conflictos','sinVincular','complementarios','importaciones','auditoria','firebaseDiferencias'];
const empty=()=>({
  version:SCHEMA_VERSION,periodo:PERIOD,estudiantes:[],notas:[],notasBorrador:[],cursosNucleos:[],
  evaluaciones:[],trabajos:[],ejecucion:{},cronogramaPersonalizado:{},flujoNucleos:{},conflictos:[],sinVincular:[],complementarios:[],
  importaciones:[],auditoria:[],firebaseDiferencias:[],gptSeedFingerprint:'',
  firebaseSync:{enabled:false,baseline:{},pending:[],conflicts:[],lastError:'',lastPull:'',lastPush:''},
  config:{codigoPresencial:'UTET-INF-01-PRO-95',codigoOnline:'UTET-INF-02-PRO-95',version:'1.0',fechaElaboracion:'',
    elaborado:'Mgs. Jefferson Villarreal',revisado:'Ing. Martha Tomalá',
    aprobado:'Dr. Alex León',observaciones:''}
});
const text=s=>String(s??'').trim();
const key=s=>text(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
  .replace(/[^A-Z0-9]+/g,' ').trim();
const id=x=>text(x);
const career=s=>{
  let v=key(s).replace(/\bONLINE\b|\bEN LINEA\b/g,'').replace(/\s+/g,' ').trim();
  if(v==='ADMINISTRACION DE EMPRESAS')v='ADMINISTRACION';
  if(v==='GESTION DE TALENTO HUMANO')v='GESTION DEL TALENTO HUMANO';
  if(v.startsWith('TECNOLOGIA SUPERIOR EN '))v=v.slice('TECNOLOGIA SUPERIOR EN '.length).trim();
  return v;
};
const grade=x=>{
  if(x===null||x===undefined||text(x)==='')return null;
  const n=Number(text(x).replace(',','.'));
  return Number.isFinite(n)&&n>=0&&n<=10?n:null;
};
const mode=x=>{
  const m=key(x?.modalidad);
  if(['ONLINE','EN LINEA','VIRTUAL'].includes(m))return 'online';
  if(['PRESENCIAL','PRESENCIALES'].includes(m))return 'presencial';
  return /\bONLINE\b|\bEN LINEA\b/.test(key(x?.carrera||x?.NombreCarrera))||/-L-/i.test(text(x?.codigo||x?.CodigoCarrera))?'online':'presencial';
};
const isCompliant=x=>key(x)==='CUMPLE';
const scoreSignature=x=>JSON.stringify({nota:grade(x.nota),parciales:(x.parciales||[]).map(grade)});
function normalizeStudent(student){
  const s={...student},studentID=id(s.id||s.numeroIdentificacion);
  return {...s,id:studentID,modalidad:mode(s),
    tipoTitulacion:['trabajo','complexivo'].includes(s.tipoTitulacion)?s.tipoTitulacion:'sin_definir',
    nombre:text(s.nombre||s.Nombres),carrera:text(s.carrera||s.NombreCarrera),
    correo:text(s.correo||s.CorreoInstitucional).toLowerCase(),
    requisitos:s.requisitos&&typeof s.requisitos==='object'?{...s.requisitos}:{}};
}
function migrate(raw){
  const d=empty();
  if(!raw||typeof raw!=='object')return d;
  for(const k of arrays)if(Array.isArray(raw[k]))d[k]=raw[k].map(x=>x&&typeof x==='object'?{...x}:x);
  d.estudiantes=d.estudiantes.filter(s=>s&&typeof s==='object').map(normalizeStudent);
  if(raw.ejecucion&&typeof raw.ejecucion==='object'&&!Array.isArray(raw.ejecucion))d.ejecucion={...raw.ejecucion};
  if(raw.cronogramaPersonalizado&&typeof raw.cronogramaPersonalizado==='object'&&!Array.isArray(raw.cronogramaPersonalizado))d.cronogramaPersonalizado={...raw.cronogramaPersonalizado};
  if(raw.flujoNucleos&&typeof raw.flujoNucleos==='object'&&!Array.isArray(raw.flujoNucleos))d.flujoNucleos={...raw.flujoNucleos};
  if(raw.config&&typeof raw.config==='object'&&!Array.isArray(raw.config))d.config={...d.config,...raw.config};
  if(typeof raw.gptSeedFingerprint==='string')d.gptSeedFingerprint=raw.gptSeedFingerprint;
  if(raw.firebaseSync&&typeof raw.firebaseSync==='object'&&!Array.isArray(raw.firebaseSync)){
    d.firebaseSync={...d.firebaseSync,...raw.firebaseSync,
      baseline:raw.firebaseSync.baseline&&typeof raw.firebaseSync.baseline==='object'&&!Array.isArray(raw.firebaseSync.baseline)?{...raw.firebaseSync.baseline}:{},
      pending:Array.isArray(raw.firebaseSync.pending)?raw.firebaseSync.pending:[],
      conflicts:Array.isArray(raw.firebaseSync.conflicts)?raw.firebaseSync.conflicts:[]};
  }
  d.config.codigoPresencial='UTET-INF-01-PRO-95';
  d.config.codigoOnline='UTET-INF-02-PRO-95';
  if(typeof raw.periodo==='string'&&raw.periodo.trim())d.periodo=raw.periodo;
  d.version=SCHEMA_VERSION;
  return d;
}
function audit(state){
  const problems=[],students=state.estudiantes||[], seen=new Map();
  for(const s of students){
    const sid=id(s.id);
    if(!sid)problems.push({type:'id_vacio',student:''});
    else if(seen.has(sid))problems.push({type:'cedula_repetida',student:sid});
    else seen.set(sid,s);
    if(s.modalidad!==mode(s))problems.push({type:'modalidad_inconsistente',student:sid});
    const careerOnline=/\bONLINE\b|\bEN LINEA\b/.test(key(s.NombreCarrera||s.carrera));
    const codeOnline=/-L-/i.test(text(s.codigo||s.CodigoCarrera));
    const codePresencial=/-P-/i.test(text(s.codigo||s.CodigoCarrera));
    if((careerOnline&&codePresencial)||(!careerOnline&&codeOnline&&text(s.NombreCarrera||s.carrera)))
      problems.push({type:'carrera_codigo_discrepante',student:sid});
    if(!text(s.nombre))problems.push({type:'nombre_vacio',student:sid});
    if(!text(s.carrera))problems.push({type:'carrera_vacia',student:sid});
  }
  const masterIds=new Set(students.map(s=>id(s.id)));
  for(const score of [...state.notas||[],...state.notasBorrador||[]])
    if(score?.studentId&&!masterIds.has(id(score.studentId)))
      problems.push({type:'nota_sin_estudiante',student:id(score.studentId)});
  return {students:students.length,unique:seen.size,issues:problems,
    canUseIndividual:students.length>0&&problems.every(p=>p.type!=='cedula_repetida'&&p.type!=='id_vacio')};
}
function analyze(state,mod){
  const m=mod==='online'?'online':'presencial',students=(state.estudiantes||[]).filter(s=>s.modalidad===m);
  const studentMap=new Map(students.map(s=>[id(s.id),s]));
  const byReq=REQUIREMENTS.map((field)=>{
    const applicable=students.filter(s=>!['NO APLICA','N A','NA'].includes(key(s.requisitos?.[field])));
    const compliant=applicable.filter(s=>isCompliant(s.requisitos?.[field])).length;
    const unknown=applicable.filter(s=>!text(s.requisitos?.[field])).length;
    return {field,total:applicable.length,compliant,pending:applicable.length-compliant,unknown,percent:applicable.length?100*compliant/applicable.length:null};
  });
  const complete9=students.filter(s=>REQUIREMENTS.every(f=>isCompliant(s.requisitos?.[f]))).length;
  const complete8=students.filter(s=>REQUIREMENTS.slice(0,8).every(f=>isCompliant(s.requisitos?.[f]))).length;
  const careerMap=new Map();
  for(const s of students){let k=career(s.carrera);if(!careerMap.has(k))careerMap.set(k,{key:k,name:s.carrera,total:0,complete9:0,complete8:0});const x=careerMap.get(k);x.total++;if(REQUIREMENTS.every(f=>isCompliant(s.requisitos?.[f])))x.complete9++;if(REQUIREMENTS.slice(0,8).every(f=>isCompliant(s.requisitos?.[f])))x.complete8++}
  const unresolved=new Set((state.conflictos||[]).map(c=>text(c.id)));
  const index=new Map(), contradictory=new Set(), sourceCounts={moodle:0,word:0};
  const admit=(rec,src)=>{
    if(!rec||!studentMap.has(id(rec.studentId)))return;
    const nk=Number(rec.nucleo),value=grade(rec.nota);
    if(!Number.isInteger(nk)||nk<1||nk>4||value===null)return;
    const s=studentMap.get(id(rec.studentId)),recordId=id(rec.studentId)+'|'+nk;
    if(s.tipoTitulacion!=='complexivo')return; // Solo estudiantes expresamente clasificados entran en núcleos.
    if(unresolved.has(recordId)||contradictory.has(recordId))return;
    const entry={...rec,nota:value,nucleo:nk,studentId:s.id,carrera:s.carrera,modalidad:s.modalidad,
      sourceType:src,sourceDetail:text(rec.source||rec.fuente||'')};
    const prev=index.get(recordId);
    if(!prev){index.set(recordId,entry);sourceCounts[src]++;return}
    if(grade(prev.nota)!==value){
      // Fuentes discordantes no se promedian ni sobrescriben en silencio.
      index.delete(recordId);contradictory.add(recordId);
      sourceCounts[prev.sourceType]--;
      return;
    }
    // Misma calificación: conserva Moodle como registro preferente.
    if(src==='moodle'&&prev.sourceType==='word'){index.set(recordId,entry);sourceCounts.word--;sourceCounts.moodle++}
  };
  for(const g of state.notas||[]){
    if(g.verificado===false||['ESTIMADO','PROVISIONAL','SIMULADO','BORRADOR','SIN VERIFICAR','PROVISIONAL POR CONCILIAR'].includes(key(g.status||g.estado)))continue;
    admit(g,'moodle');
  }
  // Conservar las diferencias Moodle/Word como incidencias sin acreditar el Word.
  for(const entry of state.notasBorrador||[]){
    const sid=id(entry?.studentId),noteId=sid+'|'+Number(entry?.nucleo);
    if(!studentMap.has(sid)||unresolved.has(noteId)||contradictory.has(noteId))continue;
    const source=index.get(noteId),wordGrade=grade(entry?.nota);
    if(!source||wordGrade===null||grade(source.nota)===wordGrade)continue;
    index.delete(noteId);sourceCounts[source.sourceType]--;contradictory.add(noteId);
  }
  // Nunca promocionar notasBorrador a los resultados oficiales. Las notas históricas
  // deben cotejarse y transferirse explícitamente a notas con evidencia verificable.
  const notes=[...index.values()].sort((a,b)=>career(a.carrera).localeCompare(career(b.carrera))||a.nucleo-b.nucleo||a.studentId.localeCompare(b.studentId));
  const conflicts=[...new Set([...unresolved,...contradictory])];
  const byNucleus=new Map();
  for(const g of notes){const k=career(g.carrera)+'|'+g.nucleo;if(!byNucleus.has(k))byNucleus.set(k,[]);byNucleus.get(k).push(g.nota)}
  const nucleus=(careerName,n)=>{
    const vals=byNucleus.get(career(careerName)+'|'+n)||[];
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
    return {n:vals.length,mean:avg,min:vals.length?Math.min(...vals):null,max:vals.length?Math.max(...vals):null};
  };
  return {mode:m,students,total:students.length,byReq,complete8,complete9,
    careers:[...careerMap.values()].sort((a,b)=>a.name.localeCompare(b.name,'es')),notes,conflicts,
    evaluations:(state.evaluaciones||[]).filter(x=>studentMap.has(id(x.studentId))),
    sourceCounts,nucleus,source:'base_local_individual'};
}
const api=Object.freeze({SCHEMA_VERSION,PERIOD,REQUIREMENTS,empty,migrate,audit,analyze,
  key,career,id,grade,mode,normalizeStudent,isCompliant});
root.InformetitDataModel=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
