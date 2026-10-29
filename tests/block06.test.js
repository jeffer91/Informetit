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
const X=require('../analysis/complexivo.js');
require('../analysis/trabajo.js');
require('../analysis/consolidado.js');
require('../analysis/quality.js');
require('../report_institucional.js');
const create=(id='0000000001',tipo='complexivo',modalidad='presencial',carrera='Enfermería')=>({
 id,nombre:'ESTUDIANTE DE PRUEBA '+id,tipoTitulacion:tipo,modalidad,carrera,requisitos:{}
});
const state=()=>{const d=M.empty();d.estudiantes=[create()];return d};
const evaluation=(id='0000000001',teoria=8,practica=9,supletorio={})=>({
 studentId:id,tipo:'complexivo',ordinario:{teoria,practica,asistencia:'presentado'},
 supletorio:{teoria:null,practica:null,notaFinal:null,asistencia:'pendiente',...supletorio},
 actaOrdinario:'ACTA-ORD-1',actaSupletorio:''
});
const input=(o={})=>({ordTeoria:'8',ordPractica:'9',ordAsistencia:'presentado',
 supTeoria:'',supPractica:'',supFinal:'',supAsistencia:'pendiente',
 actaOrdinario:'ACTA-ORD-1',actaSupletorio:'',...o});
test('ordinario pondera 40 % teoría y 60 % práctica y redondea a dos decimales',()=>{
 assert.equal(X.weighted(8,9),8.6);
 assert.equal(X.weighted('7,50','8,50'),8.1);
 assert.equal(X.weighted(0,0),0);
 assert.equal(X.weighted(null,9),null);
 assert.equal(X.weighted('',9),null);
 assert.equal(X.weighted(10,10),10);
});
test('aprueba ordinario desde 7,00; no requiere supletorio',()=>{
 const e=X.evaluate(evaluation('0000000001',7,7));
 assert.equal(e.status,'aprobado_ordinario');
 assert.equal(e.finalGrade,7);
 assert.equal(e.needsSuple,false);
 assert.equal(e.verified,true);
});
test('nota ordinaria menor de 7 sin supletorio no es reprobación definitiva',()=>{
 const e=X.evaluate(evaluation('0000000001',5,6));
 assert.equal(e.ordinary,5.6);
 assert.equal(e.status,'supletorio_pendiente');
 assert.equal(e.finalGrade,null);
 assert.equal(e.needsSuple,true);
});
test('supletorio con teoría y práctica se calcula 40/60 y sustituye resultado insuficiente',()=>{
 const r=evaluation('0000000001',5,6,{teoria:7,practica:9,asistencia:'presentado'});
 r.actaSupletorio='SUP-1';
 const e=X.evaluate(r);
 assert.equal(e.ordinary,5.6);
 assert.equal(e.recovery,8.2);
 assert.equal(e.finalGrade,8.2);
 assert.equal(e.status,'aprobado_supletorio');
 assert.equal(e.verified,true);
});
test('supletorio con nota final expresa se preserva sin inventar componentes',()=>{
 const r=evaluation('0000000001',5,6,{notaFinal:7.35,asistencia:'presentado'});
 r.actaSupletorio='SUP-2';
 const e=X.evaluate(r);
 assert.equal(e.recovery,7.35);
 assert.equal(e.status,'aprobado_supletorio');
 assert.equal(e.supletorio.teoria,null);
 assert.equal(e.supletorio.practica,null);
});
test('supletorio inferior a 7 establece reprobación final calculada',()=>{
 const r=evaluation('0000000001',5,6,{notaFinal:6.5,asistencia:'presentado'});
 r.actaSupletorio='SUP-3';
 const e=X.evaluate(r);
 assert.equal(e.status,'reprobado');
 assert.equal(e.finalGrade,6.5);
 assert.equal(e.verified,true);
});
test('separar ordinario no presentado, supletorio no presentado y nota faltante',()=>{
 const a=X.evaluate({studentId:'01',ordinario:{asistencia:'no_presentado'},tipo:'complexivo'});
 assert.equal(a.status,'no_presentado');
 assert.equal(a.finalGrade,null);
 const b=evaluation('0000000001',4,5,{asistencia:'no_presentado'});
 assert.equal(X.evaluate(b).status,'no_presentado_supletorio');
 assert.equal(X.evaluate({studentId:'01',tipo:'complexivo'}).status,'pendiente');
});
test('calificaciones cero son notas válidas, no ausencia de nota',()=>{
 const e=X.evaluate(evaluation('0000000001',0,0,{notaFinal:0,asistencia:'presentado'}));
 assert.equal(e.ordinary,0);
 assert.equal(e.recovery,0);
 assert.equal(e.status,'reprobado');
});
test('notas fuera de rango y más de dos decimales se rechazan al guardar',()=>{
 for(const value of ['11','-1','9.999','hola','9,123']){
  assert.throws(()=>X.upsert(state(),'0000000001',input({ordTeoria:value}),'2026-10-28'));
 }
});
test('supletorio contradictorio entre componentes y nota final se bloquea',()=>{
 assert.throws(()=>X.upsert(state(),'0000000001',input({
  ordTeoria:'5',ordPractica:'6',supTeoria:'7',supPractica:'8',supFinal:'9',
  supAsistencia:'presentado'}),'2026-10-28'),/difiere/);
});
test('no presentado con notas se bloquea antes de persistir',()=>{
 assert.throws(()=>X.upsert(state(),'0000000001',input({ordAsistencia:'no_presentado'}),'2026-10-28'),/no presentado/);
});
test('un supletorio sin ordinario calculable queda pendiente y advierte',()=>{
 const e=X.evaluate({studentId:'01',tipo:'complexivo',ordinario:{asistencia:'pendiente'},
  supletorio:{notaFinal:9,asistencia:'presentado'}});
 assert.equal(e.status,'pendiente');
 assert.equal(e.finalGrade,null);
 assert.ok(e.warnings.some(x=>x.includes('sin calificación ordinaria')));
});
test('aprobado ordinario con supletorio extra emite discrepancia',()=>{
 const e=X.evaluate(evaluation('0000000001',9,9,{notaFinal:8,asistencia:'presentado'}));
 assert.equal(e.status,'aprobado_ordinario');
 assert.ok(e.warnings.some(x=>x.includes('supletorio')));
 assert.equal(e.verified,false);
});
test('no presenta aprobación institucional si falta referencia del acta',()=>{
 const r=evaluation();r.actaOrdinario='';
 const e=X.evaluate(r);
 assert.equal(e.status,'aprobado_ordinario');
 assert.equal(e.verified,false);
});
test('conserva evaluaciones antiguas sin convertir un estado manual en nota',()=>{
 const old={studentId:'0000000001',tipo:'complexivo',one:8,two:9,rescue:null,
  status:'aprobado',source:'ACTA ANTIGUA'};
 const e=X.evaluate(old);
 assert.equal(e.ordinary,8.6);
 assert.equal(e.actaOrdinario,'ACTA ANTIGUA');
 assert.equal(e.status,'aprobado_ordinario');
 const incomplete=X.evaluate({studentId:'01',tipo:'complexivo',status:'aprobado',source:'ACTA-REF'});
 assert.equal(incomplete.finalGrade,null);
 assert.equal(incomplete.status,'pendiente');
 assert.ok(incomplete.warnings.some(x=>x.includes('difiere')));
});
test('no mezcla Trabajo de Titulación con Complexivo',()=>{
 const s=state();s.estudiantes.push(create('0000000002','trabajo'));
 s.evaluaciones=[evaluation(),{studentId:'0000000002',tipo:'trabajo',nota:8.5}];
 assert.equal(X.analyze(s,'presencial').counts.eligible,1);
 assert.throws(()=>X.upsert(s,'0000000002',input(),'2026-10-28'),/Trabajo de Titulación/);
});
test('por carrera se calculan aprobados, recuperados, reprobados y pendientes sin mezclarlos',()=>{
 const s=state();s.estudiantes.push(create('0000000002'),create('0000000003'),create('0000000004'));
 s.evaluaciones=[evaluation('0000000001',8,9),
  {...evaluation('0000000002',4,5,{notaFinal:8,asistencia:'presentado'}),actaSupletorio:'SUP'},
  {...evaluation('0000000003',5,5,{notaFinal:6,asistencia:'presentado'}),actaSupletorio:'SUP'}];
 const d=X.analyze(s,'presencial').counts;
 assert.equal(d.eligible,4);assert.equal(d.ordinaryComplete,3);
 assert.equal(d.ordinaryApproved,1);assert.equal(d.recovered,1);
 assert.equal(d.failed,1);assert.equal(d.pending,1);assert.equal(d.approved,2);
 assert.equal(d.approvalRate,50);
});
test('modalidades y carreras se computan por separado',()=>{
 const s=state();s.estudiantes.push(create('0000000002','complexivo','online','Contabilidad'));
 s.evaluaciones=[evaluation('0000000001',8,8),evaluation('0000000002',9,9)];
 assert.equal(X.analyze(s,'presencial').counts.eligible,1);
 assert.equal(X.analyze(s,'online').counts.eligible,1);
});
test('evaluación duplicada queda en conflicto y se excluye de promedios',()=>{
 const s=state();s.evaluaciones=[evaluation(),evaluation()];
 const d=X.analyze(s,'presencial');
 assert.equal(d.counts.duplicate,1);
 assert.equal(d.counts.ordinaryComplete,0);
 assert.equal(d.records[0].status,'conflicto_duplicado');
 assert.throws(()=>X.upsert(s,'0000000001',input(),'2026-10-28'),/duplicadas/);
});
test('guardar actualiza registro sin eliminar actas o evaluaciones de otros estudiantes',()=>{
 const s=state();s.estudiantes.push(create('0000000002','trabajo'));
 s.evaluaciones=[evaluation(),{studentId:'0000000002',tipo:'trabajo',nota:8.5}];
 const {next,result}=X.upsert(s,'0000000001',input({
  ordTeoria:'5',ordPractica:'6',supFinal:'7,50',supAsistencia:'presentado',
  actaSupletorio:'SUP-2026'}),'2026-10-28');
 assert.equal(next.evaluaciones.length,2);
 assert.equal(next.evaluaciones.find(e=>e.tipo==='trabajo').nota,8.5);
 assert.equal(result.status,'aprobado_supletorio');
 assert.equal(next.evaluaciones.find(e=>e.tipo==='complexivo').status,'aprobado');
 assert.equal(next.auditoria.length,1);
 assert.equal(s.evaluaciones[0].one,undefined);
});
test('Fase III del PDF presenta ordinarios, recuperación, notas y pendientes nominales',()=>{
 const s=state();s.estudiantes.push(create('0000000002'));s.evaluaciones=[evaluation()];
 const html=window.InformetitFullReport.makeReport(s,'presencial');
 for(const fragment of ['7. Fase III. Evaluación del Examen Complexivo',
  '7.1. Cobertura de evaluación','7.2. Resultados ordinarios','7.3. Resultados por carrera',
  '7.4. Resultados individuales','7.5. Conciliación','ESTUDIANTE DE PRUEBA 0000000001']){
  assert.ok(html.includes(fragment),fragment);
 }
 assert.match(html,/8,60/);
 assert.match(html,/Evaluación pendiente/);
 assert.equal((html.match(/class="inf-index"/g)||[]).length,3);
});
test('si falta nómina privada no se deducen aprobados desde requisitos ni Firebase',()=>{
 const html=window.InformetitFullReport.makeReport(M.empty(),'online');
 assert.match(html,/No consta una nómina nominal local de Examen Complexivo/);
 assert.doesNotMatch(html,/ESTUDIANTE DE PRUEBA/);
});
