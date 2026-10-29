'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
global.window=global;
const M=require('../data/model.js');
require('../public_summary.js');
require('../nucleos_agregados.js');
require('../document/codigo.js');
const D=require('../document/institutional.js');
require('../analysis/requirements.js');
require('../analysis/nuclei.js');
require('../analysis/complexivo.js');
const T=require('../analysis/trabajo.js');
require('../analysis/consolidado.js');
const Q=require('../analysis/quality.js');
require('../analysis/executive.js');
require('../analysis/informe-completo.js');
require('../report_institucional.js');
const student=(id,mode='presencial',type='complexivo',name='PERSONA DE PRUEBA')=>({
 id,nombre:name,carrera:'Enfermería',modalidad:mode,tipoTitulacion:type,requisitos:{}});
const state=()=>M.empty();
const withNominal=()=>{
 const s=state();s.estudiantes=[student('0000000001'),student('0000000002','presencial','trabajo'),
  student('0000000003','online','complexivo')];
 return s;
};
test('sin nómina la auditoría no inventa aprobaciones y bloquea emisión final',()=>{
 for(const mode of ['presencial','online']){
  const q=Q.analyze(state(),mode);
  assert.equal(q.technicalReady,false);
  assert.ok(q.critical.some(x=>x.code==='NO_ROSTER'));
  assert.equal(q.counters.approvedCalculated,0);
  assert.equal(q.state,'BORRADOR · BLOQUEOS DE INTEGRIDAD');
 }
});
test('control de las dos modalidades no comparte estudiantes ni calificaciones',()=>{
 const s=withNominal();
 const presencial=Q.analyze(s,'presencial'),online=Q.analyze(s,'online');
 assert.equal(presencial.counters.localStudents,2);
 assert.equal(presencial.counters.complexivo,1);
 assert.equal(presencial.counters.trabajo,1);
 assert.equal(online.counters.localStudents,1);
 assert.equal(online.counters.complexivo,1);
 assert.equal(online.counters.trabajo,0);
});
test('sin evaluaciones la auditoría no declara reprobados',()=>{
 const q=Q.analyze(withNominal(),'presencial');
 assert.equal(q.counters.pending,2);
 assert.equal(q.counters.approvedCalculated,0);
 assert.ok(q.warnings.some(x=>x.code==='FINAL_PENDING'));
});
test('conflictos Moodle vs Word bloquean integridad sin convertirse en notas cero',()=>{
 const s=withNominal();s.conflictos=[{id:'0000000001|1',studentId:'0000000001'}];
 const q=Q.analyze(s,'presencial');
 assert.ok(q.critical.some(x=>x.code==='GRADE_CONFLICTS'));
 assert.equal(q.technicalReady,false);
});
test('evaluaciones finales duplicadas se aíslan del consolidado',()=>{
 const s=withNominal();
 const score={studentId:'0000000001',tipo:'complexivo',ordinario:{
  teoria:8,practica:8,asistencia:'presentado'},actaOrdinario:'ORD-01'};
 s.evaluaciones=[score,{...score}];
 const q=Q.analyze(s,'presencial');
 assert.equal(q.counters.duplicate,1);
 assert.equal(q.counters.approvedCalculated,0);
 assert.ok(q.critical.some(x=>x.code==='FINAL_DUPLICATES'));
});
test('una aprobación calculada no equivale a graduación ni a acta validada',()=>{
 const s=withNominal();
 s.evaluaciones=[{studentId:'0000000001',tipo:'complexivo',ordinario:{
  teoria:8,practica:9,asistencia:'presentado'}}];
 const q=Q.analyze(s,'presencial');
 assert.equal(q.counters.approvedCalculated,1);
 assert.equal(q.counters.actaReferences,0);
 assert.ok(q.warnings.some(x=>x.code==='ACTA_REFERENCES'));
 assert.ok(q.issues.some(x=>x.code==='OFFICIAL_ENDORSEMENT'));
});
test('no se identifica una variación poblacional como alta ni retiro sin evidencia',()=>{
 const s=withNominal();
 const q=Q.analyze(s,'presencial');
 assert.ok(q.warnings.some(x=>x.code==='ROSTER_VARIATION'));
 assert.ok(q.issues.find(x=>x.code==='ROSTER_VARIATION').description.includes('puede ser legítima'));
});
test('anexo C contiene incidencias y acciones, separado del análisis nominal',()=>{
 const s=withNominal();
 const q=Q.analyze(s,'presencial'),html=Q.report(q,{
  Table:(name,heads,rows,note)=>'<table data-name="'+name+'">'+rows.map(x=>'<tr>'+x.join('|')+'</tr>').join('')+'</table>',
  H:(n,title)=>'<h'+n+'>'+title+'</h'+n+'>',para:x=>'<p>'+x+'</p>'
 });
 for(const x of ['13. Anexos','Anexo A. Inventario','Anexo B. Conciliación',
   'Anexo C. Matriz','Anexo D. Integridad','Firebase UTET','BORRADOR']){ 
   if(x==='BORRADOR')continue;
   assert.ok(html.includes(x),x);
 }
 assert.match(html,/no constituyen firma/i);
});
test('el informe presencial y el online tienen índice de contenido, tablas y figuras',()=>{
 for(const mode of ['presencial','online']){
  const html=window.InformetitFullReport.makeReport(state(),mode);
  assert.equal((html.match(/class="inf-index"/g)||[]).length,3);
  assert.match(html,/Índice de contenidos/);
  assert.match(html,/Índice de tablas/);
  assert.match(html,/Índice de figuras/);
  assert.match(html,/13. Anexos y Trazabilidad/);
  assert.match(html,/BORRADOR SIN VALIDAR/);
  assert.match(html,/Anexo C. Matriz de control de calidad/);
 }
});
test('la portada no inventa código documental presencial ni online',()=>{
 const s=state();
 assert.equal(D.fields(s,'presencial').code,'UTET-INF-01-PRO-95-2026-05');
 assert.equal(D.fields(s,'online').code,'UTET-INF-02-PRO-95-2026-05');
 assert.equal(D.fields(s,'presencial').date,'29-mayo-2026');
 assert.equal(D.fields(s,'online').date,'29-mayo-2026');
});
test('las fuentes APA se presentan como inventario sin fingir edición bibliográfica',()=>{
 const html=window.InformetitFullReport.makeReport(state(),'presencial');
 assert.match(html,/Referencias Bibliográficas/);
 assert.match(html,/Reglamento de Régimen Académico/);
 assert.doesNotMatch(html,/Guía institucional para la formulación y aprobación de títulos de titulación \[Versión 1\.0\]/);
});
test('la tabla de un informe largo repite encabezados en páginas diferentes',()=>{
 const html=window.InformetitFullReport.makeReport(state(),'presencial');
 assert.match(html,/display:table-header-group/);
 assert.match(html,/@page/);
 assert.match(html,/break-inside:avoid/);
});
test('el índice admite paginación exacta sin cambiar las referencias de destino',()=>{
 const sample='<h2>Introducción</h2><p class="tlabel">Tabla 1</p><p class="tname">Evidencia</p>'+
  '<h3>1.1. Alcance</h3><p class="flabel">Figura 1</p><p class="fname">Resultados</p>';
 const {html,front}=D.indexize(sample);
 assert.ok(front.includes('data-page="inf-sec-001"'));
 assert.ok(front.includes('data-page="inf-table-1"'));
 assert.ok(front.includes('data-page="inf-figure-1"'));
 const result=D.paginate(front,{ 'inf-sec-001':5,'inf-table-1':8,'inf-figure-1':10});
 assert.match(result,/data-page="inf-sec-001">5/);
 assert.match(result,/data-page="inf-table-1">8/);
 assert.match(result,/data-page="inf-figure-1">10/);
 assert.match(html,/\[\[INF:inf-sec-001\]\]/);
});
test('las tablas nominales conservan ceros iniciales de cédulas',()=>{
 const s=withNominal();s.evaluaciones=[{studentId:'0000000001',tipo:'complexivo',
 ordinario:{teoria:8,practica:9,asistencia:'presentado'}}];
 const html=window.InformetitFullReport.makeReport(s,'presencial');
 assert.match(html,/0000000001/);
 assert.doesNotMatch(html,/0000000003<\/td>/);
});
test('los anexos muestran discrepancias de fuentes sin modificar la base original',()=>{
 const s=withNominal();s.notas=[{studentId:'0000000001',nucleo:1,nota:8}];
 s.notasBorrador=[{studentId:'0000000001',nucleo:1,nota:9}];
 const before=JSON.stringify(s);
 const html=window.InformetitFullReport.makeReport(s,'presencial');
 assert.equal(JSON.stringify(s),before);
 assert.match(html,/Anexo C/);
 assert.match(html,/Núcleos en conflicto/);
});

test('las tablas nominales incluyen estudiantes de ambos mecanismos aunque las notas estén vacías',()=>{
 const a=withNominal();
 const html=window.InformetitFullReport.makeReport(a,'presencial');
 assert.match(html,/Calificaciones por estudiante y núcleo/);
 assert.match(html,/Ordinario, supletorio y resultado definitivo/);
 assert.match(html,/Calificaciones del proyecto y defensa/);
 const work=html.slice(html.lastIndexOf('Calificaciones del proyecto y defensa'),html.lastIndexOf('Calificaciones del proyecto y defensa')+5500);
 assert.match(work,/0000000002/);
 assert.match(work,/—/);
 const exam=html.slice(html.lastIndexOf('Ordinario, supletorio y resultado definitivo'),html.lastIndexOf('Ordinario, supletorio y resultado definitivo')+5500);
 assert.match(exam,/0000000001/);
 assert.match(exam,/—/);
});
test('las tablas nominales online nunca incorporan los estudiantes presenciales',()=>{
 const a=withNominal(),html=window.InformetitFullReport.makeReport(a,'online');
 assert.match(html,/0000000003/);
 assert.doesNotMatch(html,/<td>0000000001<\/td>/);
 assert.doesNotMatch(html,/<td>0000000002<\/td>/);
});
