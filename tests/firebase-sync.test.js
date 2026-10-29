'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;
const M=require('../data/model.js'),X=require('../analysis/complexivo.js');
const Sync=require('../firebase/sync.js');
const Fire=require('../firebase/reader.js');
const student=(id='0000000001',kind='complexivo')=>({
 id,nombre:'ESTUDIANTE PRUEBA',carrera:'Enfermería',modalidad:'presencial',tipoTitulacion:kind,
 requisitos:{Academico:'CUMPLE',Financiero:'NO CUMPLE'}
});
const state=()=>{
 const s=M.empty();s.estudiantes=[student()];
 s.notas=[{id:'0000000001|1',studentId:'0000000001',nucleo:1,nota:8.7,source:'Texto Moodle · N1',verificado:true}];
 s.notasBorrador=[{studentId:'0000000001',nucleo:2,nota:9.4,estado:'provisional_por_conciliar'}];
 return s;
};
const remote=(rows=[],exams=[])=>({project:'utet-4387a',collections:{nucleos:rows,complexivos:exams}});
const firebaseDoc=(collection,record,id,updateTime='2026-10-29T09:00:00.000000Z')=>({
 name:'projects/utet-4387a/databases/(default)/documents/'+collection+'/'+(id||Sync.docId(collection,record)),
 updateTime,fields:Object.fromEntries(Object.entries(record).map(([k,v])=>[k,Fire.encode(v)]))
});
test('Firestore permite solamente nucleos y complexivos, incluso cuando se intenta escribir',()=>{
 assert.deepEqual(Fire.COLLECTIONS,['nucleos','complexivos']);
 assert.deepEqual(Sync.COLLECTIONS,['nucleos','complexivos']);
 for(const other of ['Estudiante','matriculas','requisitos','periodos','cronogramas','notas','evaluaciones']){
  assert.throws(()=>Fire.assertCollection(other),/Acceso denegado/);
  assert.throws(()=>Fire.validateRecord(other,{}),/Acceso denegado/);
 }
 assert.throws(()=>Fire.documentId('../../Estudiante/123'),/Identificador/);
});
test('no se permite escribir notas provisionales, otros períodos ni documentos ajenos',()=>{
 const rec=Sync.localRecords(state()).items.values().next().value.record;
 assert.doesNotThrow(()=>Fire.validateRecord('nucleos',rec));
 assert.throws(()=>Fire.validateRecord('nucleos',{...rec,verificado:false}),/provisionales/);
 assert.throws(()=>Fire.validateRecord('nucleos',{...rec,periodoId:'2026-04__2026-09'}),/período/);
 assert.throws(()=>Fire.validateRecord('nucleos',{...rec,docentesSecretos:1}),/Campos/);
});
test('a partir de notas verificadas calcula cambios para crear sin tocar otros datos',()=>{
 const s=state(),p=Sync.plan(s,remote());
 assert.equal(p.stats.local,1);assert.equal(p.stats.toSend,1);
 assert.equal(p.push[0].collection,'nucleos');
 assert.deepEqual(p.push[0].precondition,{mode:'create'});
 assert.equal(p.push[0].record.notaFinal,8.7);
 assert.equal(s.notasBorrador[0].nota,9.4);
 assert.equal(Sync.pending(s).length,1);
});
test('las notas sin confirmación explícita no se envían a Firebase',()=>{
 const s=state();delete s.notas[0].verificado;
 assert.equal(Sync.localRecords(s).items.size,0);
});
test('las notas históricas sin cotejo no se envían a Firebase',()=>{
 const s=state();s.cursosNucleos=[{studentId:'0000000001',curso:'CURSO HISTÓRICO',
  nucleo:1,nota:10,verificado:false}];
 assert.equal(Sync.localRecords(s).items.size,1);
});
test('examen con referencia de acta se envía a complexivos; sin acta no se envía',()=>{
 const s=state();s.evaluaciones=[{studentId:'0000000001',tipo:'complexivo',
  ordinario:{teoria:8,practica:9,asistencia:'presentado'},
  supletorio:{teoria:null,practica:null,notaFinal:null,asistencia:'pendiente'},
  actaOrdinario:'ACTA-01',actaSupletorio:'',actaCotejada:true}];
 const items=[...Sync.localRecords(s).items.values()];
 assert.equal(items.length,2);
 const exam=items.find(x=>x.collection==='complexivos');
 assert.ok(exam);assert.equal(exam.record.ordinario.teoria,8);
 assert.doesNotThrow(()=>Fire.validateRecord('complexivos',exam.record));
 s.evaluaciones[0].actaOrdinario='';
 assert.equal(Sync.localRecords(s).items.size,1);
});
test('un examen con número de acta pero sin cotejo explícito no se publica',()=>{
 const s=state();
 s.evaluaciones=[{studentId:'0000000001',tipo:'complexivo',
  ordinario:{teoria:8,practica:9,asistencia:'presentado'},
  supletorio:{teoria:null,practica:null,notaFinal:null,asistencia:'pendiente'},
  actaOrdinario:'ACTA-01',actaSupletorio:''}];
 assert.equal([...Sync.localRecords(s).items.values()].filter(x=>x.collection==='complexivos').length,0);
});
test('un estudiante sin mecanismo clasificado no se publica como Complexivo',()=>{
 const s=state();s.estudiantes[0].tipoTitulacion='sin_definir';
 s.evaluaciones=[{studentId:'0000000001',tipo:'complexivo',
  ordinario:{teoria:8,practica:9,asistencia:'presentado'},actaOrdinario:'ACTA-01'}];
 assert.equal(Sync.localRecords(s).items.size,1);
 const exam=Sync.localRecords(state()).items;
 assert.ok(![...exam.values()].some(x=>x.collection==='complexivos'));
});
test('importa calificaciones de Firebase únicamente para cédulas de la nómina local',()=>{
 const s=state();s.notas=[];
 const row=Sync.localRecords(state()).items.values().next().value.record;
 const p=Sync.plan(s,remote([firebaseDoc('nucleos',row)]));
 assert.equal(p.stats.received,1);
 const next=Sync.applyPull(s,p).next;
 assert.equal(next.notas.length,1);
 assert.equal(next.notas[0].nota,8.7);
 assert.equal(next.estudiantes[0].requisitos.Financiero,'NO CUMPLE');
 const unknown={...row,cedula:'0000000002'};
 assert.equal(Sync.plan(s,remote([firebaseDoc('nucleos',unknown)])).stats.unmatched,1);
});
test('coincidencias no duplican las notas ni generan escrituras',()=>{
 const s=state(),row=[...Sync.localRecords(s).items.values()][0];
 const p=Sync.plan(s,remote([firebaseDoc('nucleos',row.record)]));
 assert.equal(p.stats.equal,1);assert.equal(p.push.length,0);
 const next=Sync.applyPull(s,p).next;
 assert.equal(next.notas.length,1);
 assert.ok(next.firebaseSync.baseline[row.key].updateTime);
});
test('nota diferente sin línea base no se sobreescribe',()=>{
 const s=state(),row=[...Sync.localRecords(s).items.values()][0];
 const modified={...row.record,notaFinal:6};
 const p=Sync.plan(s,remote([firebaseDoc('nucleos',modified)]));
 assert.equal(p.stats.conflicts,1);assert.equal(p.push.length,0);assert.equal(p.pull.length,0);
});
test('tras primera sincronización, cambio local puede enviarse con precondición de versión',()=>{
 let s=state();const r=[...Sync.localRecords(s).items.values()][0];
 s=Sync.applyPull(s,Sync.plan(s,remote([firebaseDoc('nucleos',r.record)]))).next;
 s.notas[0].nota=9;
 const p=Sync.plan(s,remote([firebaseDoc('nucleos',r.record)]));
 assert.equal(p.push.length,1);assert.equal(p.push[0].precondition.mode,'update');
 assert.ok(p.push[0].precondition.updateTime);
});
test('cambio simultáneo local y remoto se marca como conflicto, sin perder información',()=>{
 let s=state();const r=[...Sync.localRecords(s).items.values()][0];
 s=Sync.applyPull(s,Sync.plan(s,remote([firebaseDoc('nucleos',r.record)]))).next;
 s.notas[0].nota=9;
 const p=Sync.plan(s,remote([firebaseDoc('nucleos',{...r.record,notaFinal:6})]));
 assert.equal(p.push.length,0);assert.equal(p.pull.length,0);
 assert.equal(p.stats.conflicts,1);
});
test('los metadatos de origen no provocan escrituras ni conflictos espurios',()=>{
 const s=state(),row=[...Sync.localRecords(s).items.values()][0];
 const fire={...row.record,origen:'Firebase'};
 const p=Sync.plan(s,remote([firebaseDoc('nucleos',fire)]));
 assert.equal(p.stats.equal,1);
 assert.equal(p.push.length,0);
});
test('acepta 0 como nota válida y los campos de firestore conservan el tipo',()=>{
 const s=state();s.notas[0].nota=0;
 const row=[...Sync.localRecords(s).items.values()][0];
 const doc=firebaseDoc('nucleos',row.record);
 const decoded=Sync.fromFirestore(doc);
 assert.equal(decoded.notaFinal,0);
 assert.equal(decoded.verificado,true);
});
test('rechaza respaldos de otros proyectos o sin ambas colecciones académicas',()=>{
 assert.throws(()=>Sync.plan(state(),{project:'otro',collections:{nucleos:[],complexivos:[]}}),/proyecto/);
 assert.throws(()=>Sync.plan(state(),{Estudiante:[],matriculas:[],requisitos:[]}),/nucleos/);
});
test('al registrar escritura exitosa limpia la cola mediante línea base sin borrar otros datos',()=>{
 const s=state(),r=[...Sync.localRecords(s).items.values()][0],next=Sync.applyWriteSuccess(s,[{
  ...r,result:{updateTime:'2026-10-29T09:11:00Z',name:'documents/nucleos/'+r.id}
 }]);
 assert.equal(Sync.pending(next).length,0);
 assert.equal(next.notasBorrador.length,1);
 assert.equal(next.firebaseSync.baseline[r.key].documentId,r.id);
});
