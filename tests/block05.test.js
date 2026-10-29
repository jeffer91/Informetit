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
const N=require('../analysis/nuclei.js');
require('../analysis/complexivo.js');
require('../analysis/trabajo.js');
require('../analysis/consolidado.js');
require('../analysis/quality.js');
require('../analysis/executive.js');
require('../analysis/informe-completo.js');
require('../report_institucional.js');
const required=()=>Object.fromEntries(M.REQUIREMENTS.map(x=>[x,'CUMPLE']));
const student=(id='0000000001',name='ESTUDIANTE DE PRUEBA',career='Enfermería',mode='presencial',mechanism='complexivo')=>({
 id,nombre:name,carrera:career,modalidad:mode,tipoTitulacion:mechanism,requisitos:required()
});
const state=()=>{const s=M.empty();s.estudiantes=[student()];return s};
const get=(st,career='Enfermería',mode='presencial')=>N.build(st,mode).careers.find(x=>x.key===M.career(career));
test('estadísticas: mediana par/impar, rango, media y desviación poblacional',()=>{
 const odd=N.stats([9,7,8]);
 assert.equal(odd.n,3);assert.equal(odd.median,8);assert.equal(odd.mean,8);
 assert.equal(odd.min,7);assert.equal(odd.max,9);
 assert.ok(Math.abs(odd.sd-Math.sqrt(2/3))<1e-12);
 const even=N.stats([7,10,8,9]);
 assert.equal(even.median,8.5);assert.equal(even.mean,8.5);
 assert.equal(even.sd,Math.sqrt(1.25));
});
test('rangos mutuamente excluyentes; cero es nota y no ausencia',()=>{
 const s=N.stats([0,6.99,7,7.99,8,8.99,9,10]);
 assert.equal(s.n,8);
 assert.deepEqual(s.bands.map(x=>x.count),[2,2,2,2]);
 assert.equal(s.bands.reduce((n,x)=>n+x.count,0),8);
});
test('sin datos no se generan promedios, porcentajes ni distribuciones falsas',()=>{
 const s=N.stats([]);
 assert.equal(s.mean,null);assert.equal(s.median,null);assert.equal(s.sd,null);
 assert.equal(s.bands[0].pct,null);
});
test('la nómina privada identifica nota y mantiene otros tres núcleos pendientes',()=>{
 const s=state();s.notas=[{studentId:'0000000001',nucleo:1,nota:8.25}];
 const c=get(s);
 assert.equal(c.eligible,1);assert.equal(c.projects,0);
 assert.equal(c.nuclei[0].gradeCount,1);
 assert.equal(c.nuclei[0].pendingCount,0);
 assert.equal(c.nuclei[0].summary.mean,8.25);
 assert.equal(c.nuclei[1].pendingCount,1);
 assert.equal(c.pendingStudents.length,1);
 assert.deepEqual(c.pendingStudents[0].missing,[2,3,4]);
});
test('estudiantes de Trabajo de Titulación no entran en el denominador ni en los pendientes',()=>{
 const s=state();s.estudiantes.push(student('0000000002','ESTUDIANTE PROYECTO','Enfermería','presencial','trabajo'));
 s.notas=[{studentId:'0000000002',nucleo:1,nota:10}];
 const c=get(s);
 assert.equal(c.roster,2);assert.equal(c.eligible,1);assert.equal(c.projects,1);
 assert.equal(c.nuclei[0].gradeCount,0);
 assert.equal(c.nuclei[0].pendingCount,1);
 assert.equal(c.pendingStudents.length,1);
});
test('se consolidan variantes de carreras dentro de la misma modalidad',()=>{
 const s=state();s.estudiantes.push(student('0000000002','OTRA PERSONA','TECNOLOGÍA SUPERIOR EN ENFERMERÍA'));
 s.notas=[{studentId:'0000000001',nucleo:1,nota:8},{studentId:'0000000002',nucleo:1,nota:9}];
 const d=N.build(s,'presencial');
 assert.equal(d.careers.length,1);
 assert.equal(d.careers[0].nuclei[0].summary.mean,8.5);
});
test('modalidades se calculan de manera independiente',()=>{
 const s=state();s.estudiantes.push(student('0000000002','ESTUDIANTE ONLINE','Enfermería Online','online'));
 s.notas=[{studentId:'0000000001',nucleo:1,nota:8},{studentId:'0000000002',nucleo:1,nota:9}];
 assert.equal(N.build(s,'presencial').individualGrades,1);
 assert.equal(N.build(s,'online').individualGrades,1);
});
test('conflictos Word–Moodle excluidos y ubicados en seguimiento',()=>{
 const s=state();
 s.notas=[{studentId:'0000000001',nucleo:1,nota:8}];
 s.notasBorrador=[{studentId:'0000000001',nucleo:1,nota:9}];
 const c=get(s),one=c.nuclei[0];
 assert.equal(one.gradeCount,0);
 assert.equal(one.conflictCount,1);
 assert.equal(one.pendingCount,0);
 assert.deepEqual(c.pendingStudents[0].conflicts,[1]);
 // El Word agregado de Enfermería existe, pero no representa una nota nominal.
 assert.equal(one.summary.source,'word_aggregate');
});
test('si hay notas individuales y un Word agregado, la media nominal no se mezcla',()=>{
 const s=state();s.notas=[{studentId:'0000000001',nucleo:1,nota:7.5}];
 const c=get(s),one=c.nuclei[0];
 assert.equal(one.summary.source,'individual');
 assert.equal(one.summary.n,1);
 assert.equal(one.summary.mean,7.5);
 assert.equal(one.wordReference.n,43);
 assert.equal(one.wordReference.mean,9.4447);
 assert.equal(N.build(s,'presencial').wordOnlyNuclei,3);
});
test('el resumen del Word permite 19 núcleos sin inventar estudiantes ni medianas',()=>{
 const d=N.build(M.empty(),'presencial');
 assert.equal(d.nucleiWithResults,19);
 assert.equal(d.wordOnlyNuclei,19);
 assert.equal(d.individualGrades,0);
 assert.equal(d.pendingSlots,null);
 const c=d.careers.find(x=>x.key==='ENFERMERIA');
 assert.equal(c.eligible,null);
 assert.equal(c.nuclei[0].summary.n,43);
 assert.equal(c.nuclei[0].summary.median,null);
 assert.equal(c.nuclei[0].summary.bands,null);
 assert.equal(c.nuclei[0].entries.length,0);
});
test('sin datos online no se trasladan estadísticas presenciales',()=>{
 const d=N.build(M.empty(),'online');
 assert.equal(d.nucleiWithResults,0);
 assert.equal(d.wordOnlyNuclei,0);
 assert.equal(d.careers.length,9);
});
test('Word no cotejado no constituye una calificación nominal oficial',()=>{
 const s=state();s.notasBorrador=[{studentId:'0000000001',nucleo:1,nota:9.1}];
 const c=get(s);
 assert.equal(c.nuclei[0].entries.length,0);
 assert.notEqual(c.nuclei[0].summary.source,'individual');
});

test('nómina completa con cuatro notas tiene cero pendientes',()=>{
 const s=state();
 s.notas=[1,2,3,4].map(n=>({studentId:'0000000001',nucleo:n,nota:8+n*.1}));
 const d=N.build(s,'presencial'),c=get(s);
 assert.equal(d.individualGrades,4);
 assert.equal(d.pendingSlots,0);
 assert.equal(c.pendingStudents.length,0);
 assert.equal(c.individualWithAllNotes,1);
});
test('informe presencial contiene cuatro apartados nominales y consolidado por carrera',()=>{
 const s=state();s.notas=[{studentId:'0000000001',nucleo:1,nota:8.2}];
 const html=window.InformetitFullReport.makeReport(s,'presencial');
 for(const text of ['5. Fase II. Resultados de núcleos estructurantes',
 '5.2.1.1. Núcleo 1','5.2.1.2. Núcleo 2','5.2.1.3. Núcleo 3',
 '5.2.1.4. Núcleo 4','5.2.1.5. Consolidado de Enfermería',
 'Estudiantes y notas','Distribución de calificaciones','ESTUDIANTE DE PRUEBA','5.3. Interpretación']){
  assert.ok(html.includes(text),text);
 }
 assert.match(html,/8,20/);
 assert.equal((html.match(/class="inf-index"/g)||[]).length,3);
});
test('PDF agregado no muestra notas individuales de estudiantes que no estén disponibles',()=>{
 const html=window.InformetitFullReport.makeReport(M.empty(),'presencial');
 assert.match(html,/estadísticas agregadas/);
 assert.doesNotMatch(html,/ESTUDIANTE DE PRUEBA/);
 assert.doesNotMatch(html,/ESTUDIANTE DE PRUEBA/);
 assert.match(html,/19 combinaciones carrera/);
});
test('estructura Enfermería mantiene N1, N2, N3, N4 y consolidado en ese orden con la nómina completa',()=>{
 const s=state();
 s.estudiantes.push(student('0000000002','SEGUNDO ESTUDIANTE'));
 s.notas=[{studentId:'0000000001',nucleo:1,nota:8},{studentId:'0000000001',nucleo:2,nota:9},
  {studentId:'0000000001',nucleo:3,nota:7},{studentId:'0000000001',nucleo:4,nota:10}];
 const html=window.InformetitFullReport.makeReport(s,'presencial');
 const names=['Núcleo 1','Núcleo 2','Núcleo 3','Núcleo 4','Consolidado de Enfermería'];
 let last=-1;
 for(let i=0;i<names.length;i++){
  const tag='5.2.1.'+(i+1)+'. '+names[i],pos=html.lastIndexOf(tag);
  assert.ok(pos>last,'Falta el orden '+tag);last=pos;
 }
 for(let i=1;i<=4;i++){
  const from=html.lastIndexOf('5.2.1.'+i+'. Núcleo '+i),end=html.lastIndexOf('5.2.1.'+(i+1)+'.');
  const body=html.slice(from,end);
  assert.match(body,/Estudiantes y notas/);
  assert.match(body,/0000000001/);
  assert.match(body,/0000000002/);
  assert.match(body,/Cobertura por estado/);
  assert.match(body,/Pendiente/);
 }
 assert.match(html,/Consolidado nominal de cuatro núcleos/);
 assert.match(html,/8,50/);
 assert.match(html,/Incompleto/);
 assert.match(html,/Comparación de medias nominales/);
});
test('el consolidado no calcula media si falta algún núcleo o existe conflicto',()=>{
 const s=state();s.notas=[{studentId:'0000000001',nucleo:1,nota:8},
  {studentId:'0000000001',nucleo:2,nota:9},
  {studentId:'0000000001',nucleo:3,nota:10}];
 const html=window.InformetitFullReport.makeReport(s,'presencial');
 const idx=html.lastIndexOf('Consolidado nominal de cuatro núcleos');
 const excerpt=html.slice(idx,idx+2800);
 assert.match(excerpt,/Pendiente/);
 assert.match(excerpt,/Incompleto/);
 assert.match(excerpt,/<td>—<\/td><td>Incompleto<\/td>/);
});
test('el cronograma de cuatro núcleos se conserva como planificación, no como ejecución',()=>{
 const html=window.InformetitFullReport.makeReport(M.empty(),'presencial');
 assert.match(html,/Cronograma planificado de los núcleos estructurantes/);
 assert.match(html,/30\/03\/2026/);
 assert.match(html,/18\/04\/2026/);
 assert.match(html,/no es evidencia de aprobación/);
});
test('media inferior a 7 en un núcleo no declara reprobado el complexivo',()=>{
 const s=state();s.notas=[{studentId:'0000000001',nucleo:1,nota:5.5}];
 const c=get(s),n=c.nuclei[0],p=N.narrative(c,n);
 assert.match(p,/no resultados finales del Examen Complexivo/);
 assert.equal(n.summary.bands[0].count,1);
});
