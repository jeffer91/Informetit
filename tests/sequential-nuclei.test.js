/* Pruebas con estudiantes ficticios; nunca incluir nóminas privadas en GitHub. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const XLSX=require('xlsx');
const Model=require('../data/model.js');
require('../data/nuclei-catalog.js');
const Flow=require('../data/sequential-nuclei.js');
const Firebase=require('../firebase/sync.js');
function sample(){
 const s=Model.empty();
 s.estudiantes=[
  {id:'0000000001',nombre:'ESTUDIANTE PRUEBA UNO',carrera:'Contabilidad',modalidad:'presencial',tipoTitulacion:'complexivo'},
  {id:'0000000002',nombre:'ESTUDIANTE PRUEBA DOS',carrera:'Contabilidad',modalidad:'online',tipoTitulacion:'sin_definir'}
 ];
 return Model.migrate(s);
}
function workbook(state){
 const made=Flow.template(state,'Contabilidad',XLSX);
 return XLSX.read(made.bytes,{type:'array'});
}
function complete(wb,status='NO CURSA'){
 wb.Sheets.CALIFICACIONES.G2={t:'n',v:8.75};
 wb.Sheets.CALIFICACIONES.H2={t:'s',v:'VALIDADO'};
 wb.Sheets.CALIFICACIONES.G3={t:'s',v:''};
 wb.Sheets.CALIFICACIONES.H3={t:'s',v:status};
 return wb;
}
test('solo se ofrece el primer núcleo y la plantilla incluye presencial y online',()=>{
 const s=sample(),p=Flow.progress(s,'Contabilidad');
 assert.equal(p.current,1);
 assert.equal(p.students.length,2);
 assert.equal(p.catalog.nuclei[0].title,'Contabilidad Financiera');
 const made=Flow.template(s,'Contabilidad',XLSX);
 const wb=XLSX.read(made.bytes,{type:'array'});
 const rows=XLSX.utils.sheet_to_json(wb.Sheets.CALIFICACIONES,{defval:'',raw:false});
 assert.equal(rows.length,2);
 assert.deepEqual(rows.map(x=>x.Modalidad),['presencial','online']);
 assert.equal(rows[0]['Cédula'],'0000000001');
 assert.equal(rows[0]['Estado'],'PENDIENTE');
});
test('no se habilita el siguiente núcleo con una nota pendiente',()=>{
 const s=sample(),wb=workbook(s);
 const plan=Flow.plan(s,'Contabilidad',wb,XLSX,'test.xlsx');
 assert.equal(plan.complete,false);
 assert.equal(plan.stats.blocked,2);
 assert.throws(()=>Flow.apply(s,plan,'2026-10-30'),/resuelve/);
 assert.equal(Flow.progress(s,'Contabilidad').current,1);
});
test('un núcleo cotejado se guarda localmente y habilita solo el segundo',()=>{
 const s=sample(),wb=complete(workbook(s));
 const plan=Flow.plan(s,'Contabilidad',wb,XLSX,'nucleo1.xlsx');
 assert.equal(plan.complete,true);
 assert.equal(plan.stats.validated,1);
 assert.equal(plan.stats.excluded,1);
 const applied=Flow.apply(s,plan,'2026-10-30');
 assert.equal(s.notas.length,0);
 assert.equal(applied.next.notas.length,1);
 assert.equal(applied.next.notas[0].nota,8.75);
 assert.equal(applied.next.notas[0].verificado,true);
 assert.equal(Flow.progress(Model.migrate(applied.next),'Contabilidad').current,2);
 assert.equal(Firebase.pending(applied.next).length,1);
 assert.throws(()=>Flow.plan(applied.next,'Contabilidad',wb,XLSX,'nucleo1.xlsx'),/no corresponde/);
});
test('estudiante sin mecanismo confirmado queda provisional y no se envía a Firebase',()=>{
 const s=sample(),wb=workbook(s);
 wb.Sheets.CALIFICACIONES.G2={t:'n',v:7};
 wb.Sheets.CALIFICACIONES.H2={t:'s',v:'VALIDADO'};
 wb.Sheets.CALIFICACIONES.G3={t:'n',v:9};
 wb.Sheets.CALIFICACIONES.H3={t:'s',v:'VALIDADO'};
 const plan=Flow.plan(s,'Contabilidad',wb,XLSX,'n1.xlsx');
 assert.equal(plan.stats.provisional,1);
 const result=Flow.apply(s,plan,'2026-10-30');
 assert.equal(result.next.notasBorrador.length,1);
 assert.equal(result.next.notasBorrador[0].verificado,false);
 assert.equal(Firebase.pending(result.next).length,1);
});
test('una nota distinta jamás se sobreescribe silenciosamente',()=>{
 const s=sample();
 s.notas.push({studentId:'0000000001',nucleo:1,curso:'Contabilidad Financiera',nota:6,verificado:true});
 const wb=workbook(s);
 wb.Sheets.CALIFICACIONES.G2={t:'n',v:9};
 wb.Sheets.CALIFICACIONES.H2={t:'s',v:'VALIDADO'};
 wb.Sheets.CALIFICACIONES.H3={t:'s',v:'NO CURSA'};
 const plan=Flow.plan(s,'Contabilidad',wb,XLSX,'n1.xlsx');
 assert.equal(plan.complete,false);
 assert.ok(plan.errors.some(e=>e.includes('Diferencia')));
 assert.equal(s.notas[0].nota,6);
});
test('rechaza plantilla incompleta, identidad alterada y períodos incorrectos',()=>{
 const s=sample(),wb=complete(workbook(s));
 wb.Sheets.CALIFICACIONES.B2={t:'s',v:'NOMBRE ALTERADO'};
 let plan=Flow.plan(s,'Contabilidad',wb,XLSX,'n1.xlsx');
 assert.equal(plan.complete,false);
 assert.ok(plan.errors.some(e=>e.includes('Identidad')));
 wb.Sheets.CONTROL.B2={t:'s',v:'Otro período'};
 assert.throws(()=>Flow.plan(s,'Contabilidad',wb,XLSX,'n1.xlsx'),/no corresponde/);
});
test('un cambio posterior en la nómina invalida una finalización anterior',()=>{
 const s=sample(),wb=complete(workbook(s));
 const plan=Flow.plan(s,'Contabilidad',wb,XLSX,'n1.xlsx');
 const result=Flow.apply(s,plan,'2026-10-30');
 result.next.estudiantes.push({id:'0000000003',nombre:'ESTUDIANTE NUEVO',carrera:'Contabilidad',
  modalidad:'online',tipoTitulacion:'sin_definir'});
 assert.equal(Flow.progress(result.next,'Contabilidad').current,1);
});
