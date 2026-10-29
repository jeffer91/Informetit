'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
global.window=global;
const M=require('../data/model.js');
const C=require('../document/codigo.js');
const D=require('../document/institutional.js');
require('../public_summary.js');
require('../nucleos_agregados.js');
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
require('../report_institucional.js');
test('octubre 2025–marzo 2026: el código utiliza mayo 2026, nunca el mes de cierre',()=>{
 const c=C.issuance(M.PERIOD);
 assert.equal(c.periodEnd,'marzo de 2026');
 assert.equal(c.stamp,'2026-05');
 assert.equal(c.label,'mayo de 2026');
 assert.equal(C.build('UTET-INF-01-PRO-95',M.PERIOD).code,'UTET-INF-01-PRO-95-2026-05');
});
test('el cálculo funciona si el segundo mes atraviesa el cambio de año',()=>{
 assert.equal(C.issuance('Abril 2025 - Noviembre 2025').stamp,'2026-01');
 assert.equal(C.issuance('Mayo 2025 a Diciembre 2025').stamp,'2026-02');
 assert.equal(C.issuance('Octubre 2026 - Marzo 2027').stamp,'2027-05');
 assert.equal(C.issuance('Abril 2026 a Septiembre 2026').stamp,'2026-11');
});
test('preserva prefijo y corrige sufijos antiguos, sin duplicar año o mes',()=>{
 const value='UTET-INF-01-PRO-95-2025-12';
 assert.equal(C.prefix(value),'UTET-INF-01-PRO-95');
 assert.equal(C.build(value,M.PERIOD).code,'UTET-INF-01-PRO-95-2026-05');
 assert.equal(C.build('UTET-INF-01-PRO-95-2026-05',M.PERIOD).code,'UTET-INF-01-PRO-95-2026-05');
});
test('el código online conserva un prefijo independiente',()=>{
 const s=M.empty();s.config.codigoPresencial='UTET-INF-01-PRO-95';
 s.config.codigoOnline='UTET-INF-04-PRO-95';
 assert.equal(D.fields(s,'presencial').code,'UTET-INF-01-PRO-95-2026-05');
 assert.equal(D.fields(s,'online').code,'UTET-INF-02-PRO-95-2026-05');
});
test('aplica los dos códigos institucionales autorizados por defecto',()=>{
 const s=M.empty();
 assert.equal(D.fields(s,'presencial').code,'UTET-INF-01-PRO-95-2026-05');
 assert.equal(D.fields(s,'online').code,'UTET-INF-02-PRO-95-2026-05');
 assert.equal(C.forMode(s,'presencial').stamp,'2026-05');
 assert.equal(D.fields(s,'online').date,'29-mayo-2026');
});
test('logo subido localmente aparece en portada y encabezado de ambos informes',()=>{
 const s=M.empty();
 s.config.logoDataUrl='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/1QAAAABJRU5ErkJggg==';
 for(const mode of ['presencial','online']){
  assert.equal(D.fields(s,mode).logo,s.config.logoDataUrl);
  assert.match(D.cover(s,mode),/class="inf-logo"/);
  assert.match(D.printHeader(s,mode),/class="inf-logo"/);
  assert.ok(!D.pending(s,mode).some(x=>x.includes('Logo institucional pendiente')));
 }
});
test('archivo de logo con tipo no permitido no se imprime como HTML',()=>{
 const s=M.empty();s.config.logoDataUrl='data:image/svg+xml;base64,PHN2Zy8+';
 assert.equal(D.fields(s,'presencial').logo,'');
 assert.ok(D.pending(s,'presencial').some(x=>x.includes('Logo')));
});
test('fecha de informe por defecto es el último día laborable del mes previsto',()=>{
 const s=M.empty();
 assert.equal(D.fields(s,'presencial').date,'29-mayo-2026');
 assert.equal(D.lastWorkdayOfMonth('2026-05'),'2026-05-29');
 assert.ok(!D.pending(s,'presencial').some(x=>x.includes('Día de elaboración')));
 s.config.fechaElaboracion='2026-05-20';
 assert.equal(D.fields(s,'presencial').date,'20-mayo-2026');
 assert.ok(!D.pending(s,'presencial').some(x=>x.includes('difiere')));
 s.config.fechaElaboracion='2026-10-28';
 assert.ok(D.pending(s,'presencial').some(x=>x.includes('difiere')));
});
test('el backup local conserva logo y códigos después de migración',()=>{
 const s=M.empty();s.config.logoDataUrl='data:image/png;base64,iVBORw0KGgo=';
 s.config.codigoPresencial='UTET-INF-01-PRO-95';
 s.config.codigoOnline='UTET-INF-02-PRO-95';
 const copy=M.migrate(JSON.parse(JSON.stringify(s)));
 assert.equal(copy.config.logoDataUrl,s.config.logoDataUrl);
 assert.equal(D.fields(copy,'online').code,'UTET-INF-02-PRO-95-2026-05');
});
test('ambos informes llevan el mismo mes de emisión y códigos distintos',()=>{
 const s=M.empty();s.config.codigoPresencial='UTET-INF-01-PRO-95';
 s.config.codigoOnline='UTET-INF-02-PRO-95';
 const pres=global.InformetitFullReport.makeReport(s,'presencial');
 const online=global.InformetitFullReport.makeReport(s,'online');
 assert.match(pres,/UTET-INF-01-PRO-95-2026-05/);
 assert.match(online,/UTET-INF-02-PRO-95-2026-05/);
 assert.doesNotMatch(online,/UTET-INF-01-PRO-95-2026-05/);
});
