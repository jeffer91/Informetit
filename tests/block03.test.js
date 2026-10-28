'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
global.window=global;
const Model=require('../data/model.js');
require('../public_summary.js');
require('../nucleos_agregados.js');
require('../document/institutional.js');
const Req=require('../analysis/requirements.js');
require('../analysis/nuclei.js');
require('../report_institucional.js');
const all=()=>Object.fromEntries(Model.REQUIREMENTS.map(f=>[f,'CUMPLE']));
const student=(id,career='ENFERMERIA',mode='presencial')=>({
 id,nombre:'ESTUDIANTE DE PRUEBA '+id,carrera:career,modalidad:mode,
 tipoTitulacion:'complexivo',requisitos:all(),sede:'Matriz',horario:'Vespertino'
});
test('cuatro estados: NC, mora y no alcanza 70 son incumplimientos; blancos no',()=>{
 for(const x of ['NO','NC','NO CUMPLE','No cumple – mora','No alcanza 70','INCUMPLE'])
  assert.equal(Req.classify(x),'fail',x);
 for(const x of ['',null,'PENDIENTE','EN REVISIÓN','DESCONOCIDO'])
  assert.equal(Req.classify(x),'unknown',String(x));
 for(const x of ['N/A','NO APLICA','NO CORRESPONDE'])
  assert.equal(Req.classify(x),'na',x);
 assert.equal(Req.classify('CUMPLE'),'ok');
});
test('no aplica se excluye del denominador y no bloquea requisito conjunto',()=>{
 const s=Model.empty();s.estudiantes=[student('01')];
 s.estudiantes[0].requisitos.Financiero='N/A';
 const r=Req.analyze(s,'presencial'),financial=r.requirements.find(x=>x.key==='Financiero');
 assert.equal(financial.applicable,0);assert.equal(financial.na,1);
 assert.equal(financial.pct,null);assert.equal(r.complete8,1);assert.equal(r.complete9,1);
});
test('estados desconocidos no se presentan como NO CUMPLE',()=>{
 const s=Model.empty();s.estudiantes=[student('01'),student('02')];
 s.estudiantes[0].requisitos.Financiero='';
 s.estudiantes[1].requisitos.Financiero='NO CUMPLE';
 const r=Req.analyze(s,'presencial'),f=r.requirements.find(x=>x.key==='Financiero');
 assert.deepEqual([f.ok,f.fail,f.unknown,f.na],[0,1,1,0]);
 assert.equal(r.checks.fail,1);assert.equal(r.checks.unknown,1);
 assert.equal(r.complete8,0);assert.equal(r.fail8Students,1);
 assert.equal(r.unknown8Students,1);
});
test('dos requisitos pendientes en una persona son dos incidencias y una persona',()=>{
 const s=Model.empty();s.estudiantes=[student('00001'),student('00002')];
 s.estudiantes[0].requisitos.Financiero='NO CUMPLE';
 s.estudiantes[0].requisitos.Documentacion='NC';
 const r=Req.analyze(s,'presencial');
 assert.equal(r.checks.fail,2);assert.equal(r.fail8Students,1);
 assert.equal(r.notComplete8,1);assert.equal(r.complete9,1);
 assert.equal(r.cases.length,1);
 assert.deepEqual(r.cases[0].fail8,['Documentación','Financiero']);
});
test('titulación es noveno control independiente de los ocho previos',()=>{
 const s=Model.empty();s.estudiantes=[student('01')];
 s.estudiantes[0].requisitos.Titulacion='PENDIENTE';
 const r=Req.analyze(s,'presencial');
 assert.equal(r.complete8,1);assert.equal(r.complete9,0);
 assert.equal(r.cases.length,1);assert.equal(r.cases[0].onlyTitulacion,true);
 assert.equal(r.fail8Students,0);
});
test('fusiona variantes de carrera, pero no modalidades diferentes',()=>{
 const s=Model.empty();
 s.estudiantes=[student('01','ENFERMERIA'),student('02','Enfermería'),
  student('03','TECNOLOGIA SUPERIOR EN ENFERMERÍA','online')];
 const p=Req.analyze(s,'presencial'),o=Req.analyze(s,'online');
 assert.equal(p.careers.length,1);
 assert.equal(p.careers[0].total,2);
 assert.equal(o.total,1);
});
test('fuente agregada nunca presenta nombres ni divide pendientes entre incumplimiento y desconocido',()=>{
 const a=Req.analyze(Model.empty(),'online');
 assert.equal(a.source,'aggregate');assert.equal(a.total,101);
 assert.equal(a.cases.length,0);assert.equal(a.requirements[0].fail,null);
 assert.equal(a.careers[0].complete8,null);
 assert.equal(a.reference,null);
});
test('registros parciales no se mezclan con las cifras del Word',()=>{
 const s=Model.empty();s.estudiantes=[student('01')];
 const a=Req.analyze(s,'presencial');
 assert.equal(a.total,1);assert.equal(a.reference,null);
 assert.equal(a.source,'individual');
});
test('continuidad del Word se conserva como referencia independiente',()=>{
 const s=Model.empty();
 s.estudiantes=Array.from({length:262},(_,i)=>student(String(i).padStart(10,'0')));
 const a=Req.analyze(s,'presencial');
 assert.equal(a.reference.initial,267);
 assert.equal(a.reference.active,262);
 assert.equal(a.reference.withdrawn,5);
 assert.equal(a.reference.reachedFinal,255);
 assert.equal(a.complete9,262);
 assert.notEqual(a.complete9,a.reference.reachedFinal);
});
test('no se inventan sedes ni horarios en la base parcial',()=>{
 const s=Model.empty();
 const one=student('01');one.sede='';one.horario='';
 s.estudiantes=[one];
 const a=Req.analyze(s,'presencial');
 assert.equal(a.sites.rows.length,0);
 assert.equal(a.sites.missing,1);
 assert.equal(a.schedules.missing,1);
});
test('informe completo contiene fase I detallada y seguimiento nominal solo con base privada',()=>{
 const local=Model.empty();local.estudiantes=[student('01')];
 local.estudiantes[0].requisitos.Ingles='NO CUMPLE';
 const html=window.InformetitFullReport.makeReport(local,'presencial');
 for(const needle of ['4.1. Caracterización','4.2. Cumplimiento','4.3. Incidencias',
 '4.4. Incidencias por carrera','4.5. Cumplimiento integral','4.6. Seguimiento',
 '4.7. Continuidad','4.8. Análisis','ESTUDIANTE DE PRUEBA 01',
 'Incumplimientos y estados no verificados por carrera']){
   assert.ok(html.includes(needle),needle);
 }
 const publicPdf=window.InformetitFullReport.makeReport(Model.empty(),'presencial');
 assert.doesNotMatch(publicPdf,/ESTUDIANTE DE PRUEBA 01/);
 assert.match(publicPdf,/No desglosado/);
 assert.equal((publicPdf.match(/class="inf-index"/g)||[]).length,3);
});
test('IDs duplicados generan advertencia de calidad antes de aprobar',()=>{
 const s=Model.empty();s.estudiantes=[student('01'),student('01')];
 const a=Req.analyze(s,'presencial');
 assert.equal(a.valid,false);
 const html=window.InformetitFullReport.makeReport(s,'presencial');
 assert.match(html,/identificaciones vacías o repetidas/);
});

test('motor entrega nómina local para renderizar la pantalla de estudiantes',()=>{
 const s=Model.empty();s.estudiantes=[student('01'),student('02')];
 const individual=Req.analyze(s,'presencial');
 const aggregate=Req.analyze(Model.empty(),'presencial');
 assert.equal(individual.students.length,2);
 assert.equal(individual.students[0].id,'01');
 assert.deepEqual(aggregate.students,[]);
});
