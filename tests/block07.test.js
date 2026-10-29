'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
global.window=global;
const M=require('../data/model.js');
require('../public_summary.js');
require('../nucleos_agregados.js');
require('../document/codigo.js');
require('../document/institutional.js');
require('../analysis/requirements.js');
require('../analysis/nuclei.js');
require('../analysis/complexivo.js');
const T=require('../analysis/trabajo.js');
const C=require('../analysis/consolidado.js');
require('../analysis/quality.js');
require('../analysis/executive.js');
require('../analysis/informe-completo.js');
require('../data/nuclei-catalog.js');
require('../analysis/methodology.js');
require('../report_institucional.js');
const student=(id,type='trabajo',mode='presencial',career='Desarrollo de Software')=>({
 id,nombre:'ESTUDIANTE DE EJEMPLO '+id,tipoTitulacion:type,modalidad:mode,carrera:career,requisitos:{}
});
const state=()=>{const s=M.empty();s.estudiantes=[student('0000000001')];return s};
const rubric=(studentId='0000000001')=>({
 studentId,numeroActa:'4134',fechaActa:'2026-04-14',tutor:'9',lector:'9',asistencia:'presentado',
 vocales:Array.from({length:3},(_,i)=>({
 nombre:'VOCAL '+(i+1),
 practica:{diseno:'2',construccion:'2',funcionamiento:'2',aplicacion:'1'},
 defensa:{marco:'2',propuesta:'2',recursos:'2',preguntas:'2'}})),
 supletorio:{notaFinal:'',numeroActa:'',fechaActa:'',asistencia:'pendiente'}
});
test('reproduce el ejemplo de acta 4134: escrito 9, práctica 7, defensa 8, oral 7.5, final 8.4',()=>{
 const result=T.evaluate(rubric());
 assert.equal(result.written,9);
 assert.equal(result.practical,7);
 assert.equal(result.defense,8);
 assert.equal(result.oral,7.5);
 assert.equal(result.ordinary,8.4);
 assert.equal(result.definitive,8.4);
 assert.equal(result.status,'aprobado_ordinario');
 assert.equal(result.actaReferenced,true);
});
test('el promedio de vocales se calcula, no se usa solo un vocal',()=>{
 const r=rubric();r.vocales[0].practica.diseno='2.5';
 const result=T.evaluate(r);
 assert.ok(Math.abs(result.practical-(7.5+7+7)/3)<0.01);
 assert.equal(result.defense,8);
});
test('la rúbrica no admite un valor sobre el máximo de cada parámetro',()=>{
 const r=rubric();r.vocales[2].defensa.preguntas='4.5';
 assert.throws(()=>T.upsert(state(),'0000000001',r,'2026-10-28'),/Solventar preguntas/);
});
test('notas vacías no se convierten en cero',()=>{
 const r=rubric();r.vocales[1].practica.diseno='';
 const result=T.evaluate(r);
 assert.equal(result.practical,null);
 assert.equal(result.oral,null);
 assert.equal(result.ordinary,null);
 assert.equal(result.status,'pendiente');
});
test('cero real es válido para un parámetro',()=>{
 const r=rubric();r.vocales[2].defensa.preguntas='0';
 const {next,result}=T.upsert(state(),'0000000001',r,'2026-10-28');
 assert.equal(next.trabajos.length,1);
 assert.equal(result.defenses[2],6);
 assert.equal(result.warnings.length,0);
});
test('no se registra el expediente en estudiantes de Examen Complexivo',()=>{
 const s=state();s.estudiantes[0].tipoTitulacion='complexivo';
 assert.throws(()=>T.upsert(s,'0000000001',rubric(),'2026-10-28'),/Examen Complexivo/);
});
test('guardar una rúbrica registra historial y no reemplaza evaluaciones antiguas',()=>{
 const s=state();s.evaluaciones=[{studentId:'0000000001',tipo:'trabajo',one:8,two:9}];
 const first=T.upsert(s,'0000000001',rubric(),'2026-10-28');
 assert.equal(first.next.trabajos.length,1);
 assert.equal(first.next.evaluaciones.length,1);
 assert.equal(first.next.auditoria.length,1);
 const second=T.upsert(first.next,'0000000001',rubric(),'2026-10-29');
 assert.equal(second.next.trabajos.length,1);
 assert.equal(second.next.auditoria.length,2);
 assert.equal(s.trabajos.length,0);
});
test('supletorio bajo 7 registra reprobación solo cuando el proyecto ordinario es insuficiente',()=>{
 const r=rubric();r.tutor='4';r.lector='4';
 const p=T.evaluate(r);
 assert.equal(p.status,'supletorio_pendiente');
 r.supletorio={notaFinal:'6.50',numeroActa:'SUP-10',fechaActa:'2026-04-18',asistencia:'presentado'};
 const res=T.evaluate(r);
 assert.equal(res.status,'reprobado');
 assert.equal(res.definitive,6.5);
});
test('recuperación de 7 o más registra aprobado mediante supletorio',()=>{
 const r=rubric();r.tutor='4';r.lector='4';
 r.supletorio={notaFinal:'7.30',numeroActa:'SUP-10',fechaActa:'2026-04-18',asistencia:'presentado'};
 const res=T.evaluate(r);
 assert.equal(res.status,'aprobado_supletorio');
 assert.equal(res.definitive,7.3);
});
test('una recuperación sin nota ordinaria no inventa calificación final',()=>{
 const r=rubric();r.tutor='';
 r.supletorio.notaFinal='9';
 const res=T.evaluate(r);
 assert.equal(res.definitive,null);
 assert.equal(res.status,'pendiente');
 assert.ok(res.warnings.length);
});
test('registros repetidos se aíslan de los resultados por carrera',()=>{
 const s=state();s.trabajos=[rubric(),rubric()];
 const x=T.analyze(s);
 assert.equal(x.counts.duplicates,1);
 assert.equal(x.counts.approved,0);
 assert.throws(()=>T.upsert(s,'0000000001',rubric(),'2026-10-28'),/duplicados/);
});
test('no se presentan docentes ni contenidos en resultados de núcleos de Complexivo',()=>{
 const s=state();s.estudiantes.push(student('0000000002','complexivo'));
 s.trabajos=[rubric()];
 s.evaluaciones=[{studentId:'0000000002',tipo:'complexivo',
  ordinario:{teoria:8,practica:9,asistencia:'presentado'},actaOrdinario:'COM-1'}];
 const c=C.analyze(s,'presencial');
 assert.equal(c.counts.total,2);
 assert.equal(c.counts.complexivo,1);
 assert.equal(c.counts.trabajo,1);
 assert.equal(c.counts.approved,2);
 assert.equal(c.counts.approvedOrdinary,2);
 assert.equal(c.counts.calculatedRate,100);
});
test('consolidación por modalidad excluye proyectos de otra modalidad',()=>{
 const s=state();s.estudiantes.push(student('0000000002','trabajo','online'));
 s.trabajos=[rubric('0000000001'),rubric('0000000002')];
 assert.equal(C.analyze(s,'presencial').counts.total,1);
 assert.equal(C.analyze(s,'online').counts.total,1);
});
test('los proyectos sin rúbrica son pendientes, no reprobados',()=>{
 const x=C.analyze(state(),'presencial');
 assert.equal(x.counts.total,1);
 assert.equal(x.counts.pending,1);
 assert.equal(x.counts.failed,0);
 assert.equal(x.counts.approved,0);
});
test('fechas personalizadas se conservan en migraciones y aparecen en el informe PDF',()=>{
 const s=state();
 s.cronogramaPersonalizado={'trabajo|0':{inicio:'2026-01-03',fin:'2026-01-05'},
  'complexivo|0':{inicio:'2026-04-01',fin:'2026-04-03'}};
 const parsed=M.migrate(s);
 assert.deepEqual(parsed.cronogramaPersonalizado,s.cronogramaPersonalizado);
 const html=window.InformetitFullReport.makeReport(parsed,'presencial');
 assert.match(html,/03\/01\/2026/);
 assert.match(html,/01\/04\/2026/);
});
test('el informe presenta cálculos de proyecto, resultados y consolidación por carrera',()=>{
 const s=state();s.trabajos=[rubric()];
 const html=window.InformetitFullReport.makeReport(s,'presencial');
 for(const x of ['6. Trabajo de Titulación','6.1. Estructura','6.2. Cobertura',
  '6.3. Resultados','6.4. Evidencias','Trabajo escrito','Promedio oral',
  '8. Síntesis general de la cohorte','Consolidado de resultados por mecanismo']){
  assert.ok(html.includes(x),x);
 }
 assert.match(html,/8,40/);
 assert.equal((html.match(/class="inf-index"/g)||[]).length,3);
});
test('no se convierte una referencia de acta en graduación formal',()=>{
 const s=state();s.trabajos=[rubric()];
 const html=window.InformetitFullReport.makeReport(s,'presencial');
 assert.match(html,/no certifican incorporación/);
 assert.match(html,/normativa vigente/);
});

test('las rúbricas nominales de los tres vocales y la fecha del acta aparecen en el PDF',()=>{
 const d=state();d.trabajos=[rubric()];
 const html=window.InformetitFullReport.makeReport(d,'presencial');
 for(const value of ['4134','2026-04-14','VOCAL 1','VOCAL 2','VOCAL 3',
  'Sustento del marco teórico','Solventar preguntas','Promedio oral',
  'Nota final ordinaria: escrito 60 % + oral 40 %'])
   assert.ok(html.includes(value),value);
});
test('inasistencia expresa con nota de proyecto es una contradicción y no se guarda',()=>{
 const d=state(),r=rubric();r.asistencia='no_presentado';
 assert.throws(()=>T.upsert(d,'0000000001',r,'2026-10-28'),/no presentado/);
});
