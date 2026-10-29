/* Informetit / UTET: motor bidireccional exclusivamente académico.
 * No lee ni escribe Estudiante, matriculas, requisitos, periodos ni cronogramas.
 * No adivina períodos, notas, mecanismos ni actas; difiere los conflictos.
 */
(function(root){
'use strict';
const PROJECT='utet-4387a',PERIOD='2025-10__2026-03';
const COLLECTIONS=Object.freeze(['nucleos','complexivos']);
const v=x=>String(x??'').trim();
const normalize=x=>v(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const G=()=>root.InformetitDataModel;
const grade=x=>G().grade(x);
const school=(st)=>({carrera:st.carrera,modalidad:st.modalidad});
const stableHash=value=>{
 let hash=2166136261;for(const char of unescape(encodeURIComponent(value))){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)}
 return (hash>>>0).toString(16).padStart(8,'0');
};
const identity=(collection,record)=>{
 if(collection==='nucleos')return PERIOD+'|'+record.cedula+'|'+record.nucleo+'|'+normalize(record.curso||'');
 if(collection==='complexivos')return PERIOD+'|'+record.cedula;
 throw Error('Colección fuera del alcance de sincronización');
};
const docId=(collection,record)=>{
 const suffix=stableHash(identity(collection,record));
 return (collection==='nucleos'?'nu_':'co_')+record.cedula+'_'+suffix;
};
const noteRecord=(st,note)=>{
 const numero=Number(note.nucleo),nota=grade(note.nota);
 if(!Number.isInteger(numero)||numero<1||numero>4||nota===null)return null;
 return {periodoId:PERIOD,cedula:st.id,...school(st),nucleo:numero,
  curso:v(note.curso||''),notaFinal:nota,fuente:v(note.source||note.fuente)||'Moodle / Informetit',
  verificado:true,origen:'Informetit',schemaVersion:1};
};
const isPending=note=>['PROVISIONAL','SIMULADO','ESTIMADO','BORRADOR','SIN VERIFICAR','PROVISIONAL POR CONCILIAR']
 .includes(normalize(note.status||note.estado));
function localRecords(state){
 const students=new Map((state.estudiantes||[]).map(s=>[v(s.id),s]));
 const result=new Map(),issues=[],duplicateKeys=new Set();
 const add=(collection,record,origin)=>{
  if(!record)return;
  const key=identity(collection,record);
  if(duplicateKeys.has(key))return;
  if(result.has(key)){
   const previous=result.get(key);
   if(signature(previous.record)!==signature(record)){
    issues.push({kind:'duplicate',collection,key,reason:'Dos registros locales distintos para la misma evaluación'});
    result.delete(key);duplicateKeys.add(key);
   }
  }else result.set(key,{collection,key,id:docId(collection,record),record,origin});
 };
 for(const n of state.notas||[]){
  if(isPending(n)||n.verificado!==true)continue;
  const st=students.get(v(n.studentId));
  if(!st||st.tipoTitulacion!=='complexivo')continue;
  if(n.curso&&Number(n.nucleo)===0)continue;
  add('nucleos',noteRecord(st,n),'notas');
 }
 for(const n of state.cursosNucleos||[]){
  if(n.verificado!==true||isPending(n))continue;
  const st=students.get(v(n.studentId));
  if(!st||st.tipoTitulacion!=='complexivo')continue;
  add('nucleos',noteRecord(st,n),'cursosNucleos');
 }
 const X=root.InformetitComplexivo;
 if(X)for(const e of state.evaluaciones||[]){
  const st=students.get(v(e.studentId));
  if(!st||st.tipoTitulacion!=='complexivo'||e.tipo==='trabajo')continue;
  const assessment=X.evaluate(e);
  if(!assessment.verified||!assessment.actaCotejada||assessment.warnings.length)continue;
  const ord=assessment.ordinario,sup=assessment.supletorio;
  const r={periodoId:PERIOD,cedula:st.id,...school(st),
   ordinario:{teoria:grade(ord.teoria),practica:grade(ord.practica),asistencia:ord.asistencia},
   supletorio:{teoria:grade(sup.teoria),practica:grade(sup.practica),
     notaFinal:grade(sup.notaFinal),asistencia:sup.asistencia},
   actaOrdinario:assessment.actaOrdinario,actaSupletorio:assessment.actaSupletorio,
   actaCotejada:true,verificado:true,origen:'Informetit',schemaVersion:1};
  add('complexivos',r,'evaluaciones');
 }
 return {items:result,issues};
}
const fields=x=>x&&typeof x==='object'?x:{};
function decode(x){
 if(!x||typeof x!=='object')return x;
 if('stringValue'in x)return x.stringValue;
 if('integerValue'in x)return Number(x.integerValue);
 if('doubleValue'in x)return x.doubleValue;
 if('booleanValue'in x)return x.booleanValue;
 if('nullValue'in x)return null;
 if('timestampValue'in x)return x.timestampValue;
 if('mapValue'in x)return Object.fromEntries(Object.entries(x.mapValue?.fields||{}).map(([k,v])=>[k,decode(v)]));
 if('arrayValue'in x)return (x.arrayValue?.values||[]).map(decode);
 return x;
}
function fromFirestore(doc){
 if(doc?.fields&&doc?.name){
  return {...Object.fromEntries(Object.entries(doc.fields).map(([k,f])=>[k,decode(f)])),
   firebaseDocumentId:v(doc.name).split('/').pop(),firebaseUpdateTime:doc.updateTime||''};
 }
 return {...doc};
}
function signature(record){
 if(!record)return '';
 const o={...record};delete o.firebaseDocumentId;delete o.firebaseUpdateTime;
 delete o.updatedAt;delete o.createdAt;delete o.origen;
 return JSON.stringify(Object.fromEntries(Object.keys(o).sort().map(k=>[k,o[k]])));
}
function validRemote(collection,r){
 if(r.periodoId!==PERIOD||!(/^\d{10}$/.test(v(r.cedula))))return false;
 if(!['presencial','online'].includes(r.modalidad)||r.verificado!==true)return false;
 if(collection==='nucleos')return Number.isInteger(Number(r.nucleo))&&Number(r.nucleo)>=1&&
   Number(r.nucleo)<=4&&grade(r.notaFinal)!==null;
 const o=r.ordinario||{},s=r.supletorio||{};
 return typeof o==='object'&&typeof s==='object'&&
  r.actaCotejada===true&&!!(v(r.actaOrdinario)||v(r.actaSupletorio))&&
  [o.teoria,o.practica,s.teoria,s.practica,s.notaFinal].some(x=>grade(x)!==null);
}
function safeRemoteRecord(collection,r){
 if(collection==='nucleos')return {
  periodoId:PERIOD,cedula:v(r.cedula),carrera:v(r.carrera),modalidad:v(r.modalidad),
  nucleo:Number(r.nucleo),curso:v(r.curso),notaFinal:grade(r.notaFinal),
  fuente:v(r.fuente),verificado:true,origen:v(r.origen)||'Firebase',schemaVersion:Number(r.schemaVersion)||1
 };
 const o=fields(r.ordinario),s=fields(r.supletorio);
 return {periodoId:PERIOD,cedula:v(r.cedula),carrera:v(r.carrera),modalidad:v(r.modalidad),
  ordinario:{teoria:grade(o.teoria),practica:grade(o.practica),asistencia:v(o.asistencia)||'pendiente'},
  supletorio:{teoria:grade(s.teoria),practica:grade(s.practica),notaFinal:grade(s.notaFinal),asistencia:v(s.asistencia)||'pendiente'},
  actaOrdinario:v(r.actaOrdinario),actaSupletorio:v(r.actaSupletorio),actaCotejada:true,
  verificado:true,origen:v(r.origen)||'Firebase',schemaVersion:Number(r.schemaVersion)||1};
}
function remoteSnapshot(raw){
 if(raw?.project&&raw.project!==PROJECT)throw Error('Respaldo de proyecto Firebase incorrecto');
 const src=raw?.collections||raw;
 if(!src||typeof src!=='object')throw Error('No existe una instantánea Firebase');
 const rows=[],blocked=[],seen=new Map();
 for(const name of COLLECTIONS){
  if(!Array.isArray(src[name]))throw Error('Falta colección '+name+' en la lectura; se requiere una lectura completa');
  for(const entry of src[name]){
   const r=fromFirestore(entry);
   if(r.periodoId!==PERIOD)continue;
   // Bloquear esquemas ambiguos, versiones desconocidas o documentos fuera del formato académico.
   const allowed=name==='nucleos'?
    ['periodoId','cedula','carrera','modalidad','nucleo','curso','notaFinal','fuente','verificado','origen','schemaVersion',
      'firebaseDocumentId','firebaseUpdateTime']:
    ['periodoId','cedula','carrera','modalidad','ordinario','supletorio','actaOrdinario','actaSupletorio','verificado',
      'origen','schemaVersion','actaCotejada','firebaseDocumentId','firebaseUpdateTime'];
   const key=identity(name,r);
   if(!validRemote(name,r)||Object.keys(r).some(f=>!allowed.includes(f))){
    blocked.push({collection:name,key,reason:'Esquema o estado de verificación no compatible; requiere inspección',id:r.firebaseDocumentId});continue;
   }
   const item={collection:name,key,id:r.firebaseDocumentId||docId(name,r),
    updateTime:r.firebaseUpdateTime||'',record:safeRemoteRecord(name,r)};
   if(seen.has(key)){
    blocked.push({collection:name,key,reason:'Documentos duplicados en Firebase'});seen.delete(key);
   }else seen.set(key,item);
  }
 }
 return {items:seen,blocked,project:PROJECT,period:PERIOD,source:raw?.source||'Firestore UTET'};
}
function normalizeRemoteForLocal(row){
 const r=row.record;
 if(row.collection==='nucleos'){
  return {id:r.cedula+'|'+r.nucleo,studentId:r.cedula,nucleo:r.nucleo,
   curso:r.curso,nota:r.notaFinal,verificado:true,source:r.fuente||'Firebase UTET',
   origen:'Firebase UTET',firebaseDocumentId:row.id};
 }
 return {studentId:r.cedula,tipo:'complexivo',ordinario:r.ordinario,supletorio:r.supletorio,
  actaOrdinario:r.actaOrdinario,actaSupletorio:r.actaSupletorio,actaCotejada:true,
  origen:'Firebase UTET',firebaseDocumentId:row.id};
}
function plan(local,remote){
 const snapshot=remoteSnapshot(remote);
 const l=localRecords(local),studentById=new Map((local.estudiantes||[]).map(s=>[v(s.id),s]));
 const stored=fields(local.firebaseSync?.baseline);
 const blockedKeys=new Set([...snapshot.blocked,...l.issues].map(x=>x.key));
 const pull=[],push=[],same=[],conflicts=[...snapshot.blocked,...l.issues],foreign=[];
 const keys=new Set([...l.items.keys(),...snapshot.items.keys()]);
 for(const key of keys){
  const a=l.items.get(key),b=snapshot.items.get(key),current=a||b,st=studentById.get(current.record.cedula);
  if(blockedKeys.has(key))continue;
  if(!st||st.modalidad!==current.record.modalidad){
   foreign.push({collection:current.collection,key,reason:'Cédula sin identidad local o modalidad distinta'});continue;
  }
  if(st.tipoTitulacion!=='complexivo'){
   conflicts.push({collection:current.collection,key,reason:'Mecanismo sin confirmar o Trabajo de Titulación'});continue;
  }
  const base=stored[key],localSig=a&&signature(a.record),remoteSig=b&&signature(b.record);
  if(a&&b){
   if(a.record.carrera&&b.record.carrera&&G().career(a.record.carrera)!==G().career(b.record.carrera)){
    conflicts.push({collection:current.collection,key,reason:'Carreras distintas'});continue;
   }
   // La identidad y el contenido se comparan sin aceptar cambios de terceros en silencio.
   if(localSig===remoteSig){same.push({key,updateTime:b.updateTime,signature:remoteSig});continue}
   if(base&&base.signature===localSig){pull.push(b);continue}
   if(base&&base.signature===remoteSig&&base.updateTime===b.updateTime){
    push.push({...a,id:b.id,precondition:{mode:'update',updateTime:b.updateTime}});continue;
   }
   conflicts.push({collection:current.collection,key,reason:'Notas o resultados distintos; resolver manualmente'});
  }else if(b){
   pull.push(b);
  }else if(a){
   if(base){
    conflicts.push({collection:a.collection,key,reason:'Documento previamente sincronizado desapareció de Firebase; no se recrea automáticamente'});continue;
   }
   push.push({...a,precondition:{mode:'create'}});
  }
 }
 return {pull,push,same,conflicts,foreign,blocked:snapshot.blocked,
  stats:{local:l.items.size,remote:snapshot.items.size,received:pull.length,toSend:push.length,
   equal:same.length,conflicts:conflicts.length,unmatched:foreign.length}};
}
function applyPull(local,assessment){
 const next=G().migrate(local),baseline={...fields(next.firebaseSync?.baseline)};
 let added=0,updated=0,conflicts=0;const pullConflicts=[];
 const students=new Map(next.estudiantes.map(s=>[v(s.id),s]));
 for(const row of assessment.pull){
  const r=row.record,st=students.get(r.cedula);
  if(!st||st.modalidad!==r.modalidad)continue;
  const rec=normalizeRemoteForLocal(row);
  if(row.collection==='nucleos'){
   const destination=r.curso?'cursosNucleos':'notas';
   const items=next[destination]||[],index=items.findIndex(x=>v(x.studentId)===r.cedula&&
    Number(x.nucleo)===r.nucleo&&normalize(x.curso||'')===normalize(r.curso||''));
   if(index<0){items.push(rec);added++}
   else{
    const prior=items[index];
    if((destination==='cursosNucleos'&&prior.verificado!==true)||isPending(prior)){
     conflicts++;pullConflicts.push({collection:row.collection,key:row.key,reason:'Existe un registro local sin cotejar; se conserva y se solicita conciliación antes de recibir Firebase'});continue;
    }
    items[index]={...prior,...rec};updated++;
   }
   next[destination]=items;
  }else{
   if(st.tipoTitulacion!=='complexivo')continue;
   const ix=next.evaluaciones.findIndex(x=>v(x.studentId)===r.cedula&&x.tipo!=='trabajo');
   if(ix<0){next.evaluaciones.push(rec);added++}
   else{next.evaluaciones[ix]={...next.evaluaciones[ix],...rec};updated++}
  }
  baseline[row.key]={signature:signature(r),updateTime:row.updateTime,documentId:row.id};
 }
 for(const row of assessment.same)baseline[row.key]={signature:row.signature,updateTime:row.updateTime};
 next.firebaseSync={...next.firebaseSync,baseline,conflicts:[...assessment.conflicts,...pullConflicts],
  lastPull:new Date().toISOString()};
 next.auditoria.push({tipo:'firebase_sync_pull',fecha:new Date().toISOString(),
  colecciones:[...COLLECTIONS],agregados:added,actualizados:updated,conflictos:assessment.conflicts.length+conflicts});
 return {next,stats:{added,updated,conflicts},conflicts:pullConflicts};
}
function applyWriteSuccess(local,successes){
 const next=G().migrate(local),baseline={...fields(next.firebaseSync?.baseline)};
 for(const row of successes)baseline[row.key]={signature:signature(row.record),
  updateTime:row.result?.updateTime||'',documentId:row.result?.name?.split('/').pop()||row.id};
 next.firebaseSync={...next.firebaseSync,baseline,lastPush:new Date().toISOString()};
 next.auditoria.push({tipo:'firebase_sync_push',fecha:new Date().toISOString(),cantidad:successes.length,
  colecciones:[...COLLECTIONS]});
 return next;
}
function pending(local){
 const base=fields(local.firebaseSync?.baseline);
 return [...localRecords(local).items.values()].filter(item=>base[item.key]?.signature!==signature(item.record));
}
const api=Object.freeze({PROJECT,PERIOD,COLLECTIONS,decode,fromFirestore,signature,identity,docId,
 localRecords,remoteSnapshot,plan,applyPull,applyWriteSuccess,pending});
root.InformetitFirebase=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
