'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;
const Model=require('../data/model.js');
require('../public_summary.js');
require('../nucleos_agregados.js');
require('../document/codigo.js');
require('../document/institutional.js');
require('../analysis/requirements.js');
require('../analysis/nuclei.js');
require('../analysis/complexivo.js');
require('../analysis/trabajo.js');
require('../analysis/consolidado.js');
require('../analysis/quality.js');
require('../analysis/executive.js');
require('../analysis/informe-completo.js');
require('../data/nuclei-catalog.js');
require('../analysis/methodology.js');
const Narrative=require('../analysis/table-commentary.js');
require('../report_institucional.js');
const report=(mode='presencial')=>global.InformetitFullReport.makeReport(Model.empty(),mode);
const count=(txt,re)=>(txt.match(re)||[]).length;
test('comentarios de tabla son interpretativos, no inventan ni acreditan resultados',()=>{
 const c=Narrative.commentary('Cronograma de Examen Complexivo',
  ['Actividad','Inicio','Fin','Estado declarado'],[['Núcleo 1','01/04/2026','02/04/2026','Por revisar']],
  'Programado',4);
 assert.match(c.before,/Tabla 4/);
 assert.match(c.after,/no acreditan por sí solas/);
 assert.doesNotMatch(c.after,/^Análisis:/);
 const empty=Narrative.commentary('Calificaciones de Núcleo 1',['Nombre','Nota final'],[], '',8);
 assert.match(empty.after,/No se dispone de filas verificables/);
});
test('desglose con calificaciones ausentes cuenta datos válidos sin inventar',()=>{
 const x=Narrative.commentary('Calificaciones individuales — Administración',
  ['Estudiante','Nota final'],[['A','9,25'],['B','—'],['C','0,00']],
  'Moodle',2);
 assert.match(x.after,/2 de 3 filas/);
 assert.doesNotMatch(x.after,/reprobad/);
 const top=Narrative.commentary('Distribución por sede',['Sede','Estudiantes'],
  [['Norte',15],['Sur',8]],'',3);
 assert.match(top.after,/Norte/);
 assert.match(top.after,/15/);
});
test('ambos informes contienen antes y después de cada tabla incluso anexos',()=>{
 for(const mode of ['presencial','online']){
  const html=report(mode),tbl=count(html,/<p class="tlabel" id="inf-table-\d+">/g);
  const before=count(html,/<p class="apa-table-context">/g);
  const after=count(html,/<p class="apa-table-commentary">/g);
  assert.ok(tbl>30,'El informe debe tener tablas reales de distintas fases');
  assert.equal(tbl,before,mode+' sin introducción de tabla');
  assert.equal(tbl,after,mode+' sin interpretación de tabla');
  assert.match(html,/La Tabla 1 /);
  assert.equal(count(html,/<p class="note">Nota\./g),0);
  assert.match(html,/<p class="note"><em>Nota\.<\/em>/);
  assert.equal(count(html,/class="inf-index"/g),3);
 }
});
test('APA 7: sangría, espacio doble, tabla sin bordes verticales y referencias francesas',()=>{
 const html=report();
 for(const css of ['text-indent:1.27cm','font-size:12pt;line-height:2','font:italic 12pt/2',
  'border:0!important','text-indent:-1.27cm','break-after:avoid-page']){
  assert.ok(html.includes(css),css);
 }
 assert.match(html,/class="apa-ref"/);
 assert.match(html,/class="tlabel" id="inf-table-/);
 assert.match(html,/class="tname"/);
 assert.match(html,/class="flabel" id="inf-figure-/);
 assert.match(html,/class="fname"/);
});
test('la carátula y el espacio del encabezado institucional se conservan',()=>{
 const html=report();
 assert.match(html,/inf-cover/);
 assert.match(html,/@page\{size:A4;margin:5\.05cm 2\.54cm 2\.54cm\}/);
 assert.match(html,/inf-signatures/);
});
