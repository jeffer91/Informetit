/* Informetit · Firebase UTET: conciliación local, sin escrituras en Firestore.
   Nunca infiere notas numéricas desde estados CUMPLE/NO CUMPLE. */
(function(root){
'use strict';
const PROJECT='utet-4387a', PERIOD='2025-10__2026-03';
const MAP=Object.freeze({Academico:'Academico',Documentacion:'Documentacion',
 Financiero:'Financiero',PracticasVinculacion:'Practicas',Vinculacion:'Vinculacion',
 SeguimientoGraduados:'Seguimiento',Ingles:'Ingles',ActualizacionDatos:'Datos',
 Titulacion:'Titulacion'});
const val=x=>String(x??'').trim();
const norm=x=>val(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
const id=x=>val(x);
const mode=m=>{
 const division=norm(m?.division||m?.modalidad||'');
 const carrera=norm(m?.nombreCarrera||'');
 const codigo=val(m?.codigoCarrera);
 if(division==='ONLINE'||division==='EN LINEA'||division==='VIRTUAL')return 'online';
 if(division==='PRESENCIAL')return 'presencial';
 return /\bONLINE\b|\bEN LINEA\b/.test(carrera)||/-L-/i.test(codigo)?'online':'presencial';
};
function decode(v){
 if(!v||typeof v!=='object')return v;
 if('stringValue'in v)return v.stringValue;
 if('integerValue'in v)return Number(v.integerValue);
 if('doubleValue'in v)return v.doubleValue;
 if('booleanValue'in v)return v.booleanValue;
 if('timestampValue'in v)return v.timestampValue;
 if('nullValue'in v)return null;
 if('arrayValue'in v)return (v.arrayValue?.values||[]).map(decode);
 if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue?.fields||{}).map(([k,o])=>[k,decode(o)]));
 return v;
}
function unpackFirestore(doc){
 if(doc?.fields&&doc?.name){
  const record=Object.fromEntries(Object.entries(doc.fields).map(([k,v])=>[k,decode(v)]));
  return {...record,firebaseDocumentId:val(doc.name).split('/').pop()};
 }
 return doc;
}
function snapshot(raw){
 if(!raw||typeof raw!=='object')throw Error('El respaldo Firebase debe ser un objeto JSON.');
 const src=raw.collections&&typeof raw.collections==='object'?raw.collections:raw;
 const rows=name=>Array.isArray(src[name])?src[name].map(unpackFirestore):[];
 if(!Array.isArray(src.matriculas)||!Array.isArray(src.requisitos)||!Array.isArray(src.Estudiante))
  throw Error('Se necesitan las colecciones Estudiante (singular), matriculas y requisitos.');
 const students=new Map(rows('Estudiante').filter(x=>!x.eliminado).map(x=>[id(x.cedula||x.id),x]));
 const requisites=new Map(rows('requisitos').filter(x=>x.periodoId===PERIOD&&!x.eliminado)
  .map(x=>[id(x.cedula),x]));
 const registered=rows('matriculas').filter(x=>x.periodoId===PERIOD&&!x.eliminado);
 const observed=new Set(),issues=[],items=[];
 for(const m of registered){
  const studentId=id(m.cedula);if(!studentId){issues.push('Matrícula sin identificación');continue}
  if(observed.has(studentId)){issues.push('Matrícula repetida: '+studentId);continue}
  observed.add(studentId);
  const st=students.get(studentId),r=requisites.get(studentId);
  if(!st){issues.push('Sin ficha de estudiante: '+studentId);continue}
  if(!r){issues.push('Sin requisitos para el período: '+studentId);continue}
  const requisitos={};for(const [from,to] of Object.entries(MAP))requisitos[to]=val(r.valores?.[from]);
  const rawCareer=val(m.nombreCarrera||st.nombreCarreraActual);
  const studentMode=mode(m);
  items.push({id:studentId,nombre:val(st.nombres),carrera:rawCareer.replace(/\s+ONLINE\s*$/i,''),
   modalidad:studentMode,codigo:val(m.codigoCarrera||st.codigoCarreraActual),
   sede:val(m.sede||st.sede),correo:val(st.correoInstitucional).toLowerCase(),
   correoPersonal:val(st.correoPersonal).toLowerCase(),telefono:val(st.celular),
   requisitos,aprobacionTitulacion:val(r.valores?.AprobacionTitulacion),
   aprobacionComplexivoProyecto:val(r.valores?.AprobacionComplexivoProyecto),
   firebaseEstado:val(m.estadoMatricula),firebaseRetirado:!!m.retirado});
 }
 const gradeCollections=['nucleos','notas','calificaciones','evaluaciones'];
 const gradeKeys=/(?:^|_)(nota|calificacion|puntaje|teorica|practica|ponderacion)(?:$|_)/i;
 const foundGrades=gradeCollections.flatMap(name=>rows(name).slice(0,10000).flatMap(entry=>{
  const keys=Object.keys(entry).filter(k=>gradeKeys.test(k));
  return keys.length?[{collection:name,documentId:val(entry.firebaseDocumentId||entry.id),fields:keys}]:[];
 }));
 return {project:PROJECT,period:PERIOD,items,issues,counts:{
   registered:registered.length,linked:items.length,presencial:items.filter(x=>x.modalidad==='presencial').length,
   online:items.filter(x=>x.modalidad==='online').length,
   gradeDocuments:foundGrades.length},
  gradeDiscovery:{found:foundGrades.slice(0,60),collections:gradeCollections.filter(n=>Array.isArray(src[n]))},
  collectionCounts:Object.fromEntries(Object.keys(src).filter(k=>Array.isArray(src[k])).map(k=>[k,src[k].length])),
  source:raw.source||'Respaldo / Firestore UTET'};
}
function compare(local,remote){
 if(remote.project!==PROJECT||remote.period!==PERIOD)throw Error('Proyecto o período Firebase incorrecto.');
 const model=root.InformetitDataModel;
 if(!model)throw Error('Modelo maestro no disponible.');
 const index=new Map((local.estudiantes||[]).map(s=>[id(s.id),s]));
 const matches=[],added=[],differences=[],seen=new Set();
 for(const incoming of remote.items){
  if(seen.has(incoming.id))continue;seen.add(incoming.id);
  const old=index.get(incoming.id);
  if(!old){added.push(incoming);continue}
  matches.push(incoming);
  if(old.modalidad!==incoming.modalidad)
   differences.push({id:incoming.id,field:'modalidad',local:old.modalidad,remote:incoming.modalidad});
  if(model.career(old.carrera)!==model.career(incoming.carrera))
   differences.push({id:incoming.id,field:'carrera',local:old.carrera,remote:incoming.carrera});
  for(const key of Object.values(MAP)){
   const prev=val(old.requisitos?.[key]),next=val(incoming.requisitos[key]);
   if(prev&&next&&norm(prev)!==norm(next))
    differences.push({id:incoming.id,field:'requisitos.'+key,local:prev,remote:next});
  }
 }
 const onlyLocal=(local.estudiantes||[]).filter(s=>!seen.has(id(s.id)));
 return {matches,added,onlyLocal,differences,remote,
  stats:{local:(local.estudiantes||[]).length,source:remote.items.length,matched:matches.length,
   additional:added.length,onlyLocal:onlyLocal.length,differences:differences.length}};
}
function apply(local,comparison,{includeAdditional=false}={}){
 const model=root.InformetitDataModel;
 const next=model.migrate(local),byId=new Map(next.estudiantes.map((s,i)=>[id(s.id),i]));
 let filled=0,inserted=0,conflicts=0;
 const existingDifferences=new Set((next.firebaseDiferencias||[]).map(x=>x.id+'|'+x.field+'|'+x.local+'|'+x.remote));
 if(!Array.isArray(next.firebaseDiferencias))next.firebaseDiferencias=[];
 for(const remote of [...comparison.matches,...(includeAdditional?comparison.added:[])]){
  const idx=byId.get(remote.id);
  if(idx===undefined){
   next.estudiantes.push(model.normalizeStudent({...remote,tipoTitulacion:'complexivo',
     firebaseOrigen:'UTET Firestore',firebasePeriodo:PERIOD}));
   byId.set(remote.id,next.estudiantes.length-1);inserted++;continue;
  }
  const old=next.estudiantes[idx],student={...old,requisitos:{...(old.requisitos||{})}};
  // Completa solo campos vacíos y conserva decisiones académicas de Informetit.
  for(const field of ['nombre','carrera','codigo','sede','correo','correoPersonal','telefono']){
   if(!val(student[field])&&val(remote[field])){student[field]=remote[field];filled++}
  }
  for(const field of Object.values(MAP)){
   const before=val(student.requisitos[field]),after=val(remote.requisitos[field]);
   if(!before&&after){student.requisitos[field]=after;filled++}
  }
  for(const field of ['aprobacionTitulacion','aprobacionComplexivoProyecto']){
   if(!val(student[field])&&val(remote[field])){student[field]=remote[field];filled++}
  }
  next.estudiantes[idx]=model.normalizeStudent(student);
 }
 for(const d of comparison.differences){
  const fingerprint=d.id+'|'+d.field+'|'+d.local+'|'+d.remote;
  if(!existingDifferences.has(fingerprint)){
   next.firebaseDiferencias.push({...d,origen:'Firebase UTET',estado:'pendiente'});existingDifferences.add(fingerprint);conflicts++;
  }
 }
 next.importaciones.push({nombre:'Firebase UTET · '+PERIOD,tipo:'firebase_lectura',
   fecha:new Date().toISOString(),filas:comparison.remote.items.length,coincidentes:comparison.matches.length,
   nuevos:inserted,completados:filled,discrepancias:conflicts});
 return {next,stats:{matched:comparison.matches.length,added:inserted,filled,conflicts,
   skippedAdditional:includeAdditional?0:comparison.added.length}};
}
root.InformetitFirebase=Object.freeze({PROJECT,PERIOD,MAP,snapshot,compare,apply,decode,unpackFirestore,mode});
if(typeof module==='object'&&module.exports)module.exports=root.InformetitFirebase;
})(typeof window!=='undefined'?window:globalThis);
