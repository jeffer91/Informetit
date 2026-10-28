'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
global.window=global;
const Model=require('../data/model.js');
const Sync=require('../firebase/sync.js');
const {COLLECTIONS,status}=require('../firebase/reader.js');
const base=()=>{
 const s=Model.empty();
 s.estudiantes=[{id:'0000000001',nombre:'ESTUDIANTE PRUEBA',carrera:'Enfermería',modalidad:'presencial',
  correo:'test@example.edu.ec',requisitos:{Academico:'CUMPLE',Financiero:'NO CUMPLE'},tipoTitulacion:'trabajo'}];
 s.notasBorrador=[{id:'0000000001|1',studentId:'0000000001',nucleo:1,nota:8.9}];
 s.evaluaciones=[{studentId:'0000000001',tipo:'trabajo',nota:9.0}];
 return s;
};
const fixture=()=>({
 Estudiante:[
  {cedula:'0000000001',nombres:'ESTUDIANTE PRUEBA',nombreCarreraActual:'ENFERMERIA',
   correoInstitucional:'test@example.edu.ec',sede:'Matriz',eliminado:false},
  {cedula:'0000000002',nombres:'OTRO ESTUDIANTE',nombreCarreraActual:'CONTABILIDAD ONLINE',
   correoInstitucional:'otro@example.edu.ec',eliminado:false}],
 matriculas:[
  {cedula:'0000000001',periodoId:'2025-10__2026-03',nombreCarrera:'ENFERMERIA',
    codigoCarrera:'550913A01-P-1701',estadoMatricula:'ACTIVO',eliminado:false},
  {cedula:'0000000002',periodoId:'2025-10__2026-03',nombreCarrera:'CONTABILIDAD ONLINE',
    codigoCarrera:'550411C02-L-1701',estadoMatricula:'ACTIVO',eliminado:false},
  {cedula:'0000000003',periodoId:'2026-04__2026-09',nombreCarrera:'OTRO',
    codigoCarrera:'1',eliminado:false}],
 requisitos:[
  {cedula:'0000000001',periodoId:'2025-10__2026-03',eliminado:false,
   valores:{Academico:'CUMPLE',Financiero:'NO CUMPLE',Titulacion:'NO CUMPLE',
     PracticasVinculacion:'CUMPLE',SeguimientoGraduados:'CUMPLE',
     AprobacionComplexivoProyecto:'NO CUMPLE',AprobacionTitulacion:'NO CUMPLE'}},
  {cedula:'0000000002',periodoId:'2025-10__2026-03',eliminado:false,
   valores:{Academico:'CUMPLE',Financiero:'CUMPLE',Titulacion:'CUMPLE'}}]});
test('solo proyecta período octubre 2025-marzo 2026 y conserva identificaciones',()=>{
 const snap=Sync.snapshot(fixture());
 assert.equal(snap.items.length,2);assert.equal(snap.items[0].id,'0000000001');
 assert.equal(snap.counts.presencial,1);assert.equal(snap.counts.online,1);
 assert.equal(snap.items[0].requisitos.Practicas,'CUMPLE');
 assert.equal(snap.items[0].requisitos.Seguimiento,'CUMPLE');
});
test('ninguna aprobación CUMPLE se trata como calificación',()=>{
 const snap=Sync.snapshot(fixture());
 assert.equal(snap.counts.gradeDocuments,0);
 assert.equal(snap.items[0].aprobacionComplexivoProyecto,'NO CUMPLE');
 assert.ok(!('notaFinal' in snap.items[0]));
});
test('no incluye registros de colecciones sin fichas ni requisitos',()=>{
 const s=fixture();
 s.requisitos=s.requisitos.slice(0,1);
 const snap=Sync.snapshot(s);
 assert.equal(snap.items.length,1);
 assert.ok(snap.issues.some(x=>x.includes('Sin requisitos')));
});
test('nombres de colección distinguen Estudiante de Estudiantes',()=>{
 const s=fixture();s.Estudiantes=s.Estudiante;delete s.Estudiante;
 assert.throws(()=>Sync.snapshot(s),/Estudiante \(singular\)/);
});
test('concilia identidades y detecta estudiantes adicionales sin incorporarlos',()=>{
 const snapshot=Sync.snapshot(fixture()),c=Sync.compare(base(),snapshot);
 assert.equal(c.stats.matched,1);
 assert.equal(c.stats.additional,1);
 assert.equal(c.stats.onlyLocal,0);
 assert.equal(c.stats.differences,0);
});
test('completar coincidencias conserva notas, evaluaciones y Trabajo de Titulación',()=>{
 const local=base(),remote=Sync.snapshot(fixture()),cmp=Sync.compare(local,remote);
 const applied=Sync.apply(local,cmp);
 assert.equal(applied.next.estudiantes.length,1);
 assert.equal(applied.next.estudiantes[0].tipoTitulacion,'trabajo');
 assert.equal(applied.next.notasBorrador[0].nota,8.9);
 assert.equal(applied.next.evaluaciones[0].nota,9);
 assert.equal(applied.next.estudiantes[0].requisitos.Financiero,'NO CUMPLE');
 assert.equal(applied.next.estudiantes[0].requisitos.Practicas,'CUMPLE');
 assert.equal(applied.stats.skippedAdditional,1);
 assert.equal(local.estudiantes[0].requisitos.Practicas,undefined);
});
test('agregar adicionales solo tras confirmación explícita, manteniendo local original',()=>{
 const cmp=Sync.compare(base(),Sync.snapshot(fixture()));
 const o=Sync.apply(base(),cmp,{includeAdditional:true});
 assert.equal(o.next.estudiantes.length,2);
 assert.equal(o.next.estudiantes[1].tipoTitulacion,'complexivo');
 assert.equal(o.next.estudiantes[1].modalidad,'online');
 assert.equal(o.next.notasBorrador.length,1);
 assert.equal(o.stats.added,1);
});
test('discrepancias se registran sin reemplazar datos locales',()=>{
 const local=base(),raw=fixture();
 raw.requisitos[0].valores.Financiero='CUMPLE';
 const cmp=Sync.compare(local,Sync.snapshot(raw));
 assert.equal(cmp.stats.differences,1);
 const merged=Sync.apply(local,cmp);
 assert.equal(merged.next.estudiantes[0].requisitos.Financiero,'NO CUMPLE');
 assert.equal(merged.next.firebaseDiferencias.length,1);
 assert.equal(merged.next.firebaseDiferencias[0].remote,'CUMPLE');
 const second=Sync.apply(merged.next,Sync.compare(merged.next,Sync.snapshot(raw)));
 assert.equal(second.next.firebaseDiferencias.length,1);
});
test('reconoce documentos de la API de Firestore con tipado',()=>{
 const original=fixture();
 const fire=(x)=>({name:'projects/utet-4387a/databases/(default)/documents/Estudiante/'+x.cedula,
  fields:Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='boolean'?{booleanValue:v}:{stringValue:String(v)}]))});
 const st=Sync.unpackFirestore(fire(original.Estudiante[0]));
 assert.equal(st.cedula,'0000000001');
 assert.equal(st.eliminado,false);
});
test('la conexión de red solo permite colecciones declaradas y no está conectada sin permisos',()=>{
 assert.ok(COLLECTIONS.includes('nucleos'));
 assert.ok(COLLECTIONS.includes('cronogramas'));
 assert.ok(!COLLECTIONS.includes('contraseñas'));
 assert.equal(status().readOnly,true);
});
