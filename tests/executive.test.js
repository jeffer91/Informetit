'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;
const M=require('../data/model.js');require('../document/codigo.js');require('../document/institutional.js');
require('../public_summary.js');require('../nucleos_agregados.js');
require('../analysis/requirements.js');require('../analysis/nuclei.js');require('../analysis/complexivo.js');
require('../analysis/trabajo.js');require('../analysis/consolidado.js');require('../analysis/quality.js');
require('../analysis/executive.js');require('../analysis/informe-completo.js');
require('../data/nuclei-catalog.js');
require('../analysis/methodology.js');
require('../report_institucional.js');
test('resumen ejecutivo aparece después de resultados y antes de conclusiones',()=>{
 const h=global.InformetitFullReport.makeReport(M.empty(),'presencial');
 assert.ok(h.search(/<h2[^>]*>8\. Síntesis general de la cohorte/)<h.search(/<h2[^>]*>9\. Resumen Ejecutivo/));
 assert.ok(h.search(/<h2[^>]*>9\. Resumen Ejecutivo/)<h.search(/<h2[^>]*>10\. Conclusiones/));
 for(const x of ['Diagrama de Ishikawa','Matriz FODA','Árbol de clasificación'])assert.ok(h.includes(x),x);
});
test('no se presenta la población nominal ausente como cero titulados',()=>{
 const h=global.InformetitFullReport.makeReport(M.empty(),'online');
 assert.match(h,/no son calculables/i);
 assert.doesNotMatch(h,/La cohorte online registra 0 estudiantes en Examen Complexivo/);
 assert.doesNotMatch(h,/Total cohorte<\/td><td>0<\/td>/);
});
test('la base legal incluye narrativa y ninguna tabla de normas',()=>{
 const d=require('../document/institutional.js'),h=d.legal();
 for(const x of ['2.1. Constitución','2.2. Ley Orgánica','2.3. Reglamento','2.5. Manual de procesos'])assert.ok(h.includes(x),x);
 assert.doesNotMatch(h,/<table/);
});
