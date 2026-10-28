'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
global.window=global;
const Model=require('../data/model.js');
require('../public_summary.js');
require('../nucleos_agregados.js');
const Doc=require('../document/institutional.js');
require('../analysis/requirements.js');
require('../analysis/nuclei.js');
require('../analysis/complexivo.js');
require('../analysis/trabajo.js');
require('../analysis/consolidado.js');
require('../report_institucional.js');
function state(mode){
 const s=Model.empty();
 s.config.codigoPresencial='UTET-INF-01-PRO-95-2026-05';
 if(mode==='online')s.config.codigoOnline='';
 return s;
}
test('INF 3x3: encabezado con columnas 4,8 / 9,5 / 3,7 y combinaciones',()=>{
 const template=Doc.printHeader(state(),'presencial');
 assert.match(template,/26\.6667%/);
 assert.match(template,/52\.7778%/);
 assert.match(template,/20\.5555%/);
 assert.equal((template.match(/rowspan="2"/g)||[]).length,2);
 assert.match(template,/class="pageNumber"/);
 assert.match(template,/class="totalPages"/);
 assert.match(template,/2026-05/);
});
test('portada estándar contiene firmas, nombres y cargos',()=>{
 const f=Doc.cover(state(),'presencial');
 for(const x of ['inf-cover','ELABORADO POR','REVISADO POR','APROBADO POR',
 'Mgs. Jefferson Villarreal','Ing. Martha Tomalá','Dr. Alex León',
 'Coordinador de Titulación y Eficiencia Terminal'])assert.ok(f.includes(x),x);
 assert.equal((f.match(/class="inf-sign-space"/g)||[]).length,3);
});
test('código online no se inventa y queda como pendiente documental',()=>{
 const s=state('online');
 assert.equal(Doc.fields(s,'online').code,'POR ASIGNAR');
 assert.ok(Doc.pending(s,'online').some(x=>x.includes('Código')));
});
test('referencia de período únicamente octubre 2025-marzo 2026',()=>{
 const html=window.InformetitFullReport.makeReport(state(),'presencial');
 assert.match(html,/Octubre 2025 a marzo 2026/);
 assert.doesNotMatch(html,/comparación con abril/i);
 assert.match(html,/1\. Introducción/);
 assert.match(html,/2\. Marco legal y normativo/);
});
test('dos informes incluyen tres índices basados en contenidos reales',()=>{
 for(const mode of ['presencial','online']){
  const html=window.InformetitFullReport.makeReport(state(mode),mode);
  assert.equal((html.match(/class="inf-index"/g)||[]).length,3,mode);
  assert.match(html,/Índice de contenidos/);
  assert.match(html,/Índice de tablas/);
  assert.match(html,/Índice de figuras/);
  assert.match(html,/data-page="inf-sec-001"/);
  assert.match(html,/\[\[INF:inf-sec-/);
  assert.ok((html.match(/data-page="inf-table-/g)||[]).length>=10);
  assert.ok((html.match(/data-page="inf-figure-/g)||[]).length>=4);
  assert.match(html,/@page:first/);
 }
});
test('paginación sustituye sólo referencias para las que existe página real',()=>{
 const input='<span class="inf-index-page" data-page="inf-sec-001">—</span><span class="inf-index-page" data-page="inf-table-7">—</span>';
 const out=Doc.paginate(input,{'inf-sec-001':4,'inf-table-7':13});
 assert.match(out,/data-page="inf-sec-001">4/);
 assert.match(out,/data-page="inf-table-7">13/);
});
test('encabezado bloquea inyección HTML y conserva firma sin forjar rúbricas',()=>{
 const s=state();s.config.elaborado='<img onerror="alert(1)">';
 const html=Doc.cover(s,'presencial');
 assert.doesNotMatch(html,/<img onerror/);
 assert.match(html,/&lt;img/);
 assert.match(html,/BORRADOR/);
});
