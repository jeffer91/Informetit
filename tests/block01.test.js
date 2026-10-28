'use strict';
/* Bloque 01: pruebas de contrato de datos y compatibilidad con el informe. */
const test=require('node:test');
const assert=require('node:assert/strict');
global.window=global;
const Model=require('../data/model.js');
require('../public_summary.js');
require('../nucleos_agregados.js');
require('../document/institutional.js');
require('../analysis/requirements.js');
require('../analysis/nuclei.js');
require('../report_institucional.js');
const requisites=()=>Object.fromEntries(Model.REQUIREMENTS.map(k=>[k,'CUMPLE']));
const one=(id,mode='presencial',career='ENFERMERIA')=>({
 id,modalidad:mode,nombre:'PERSONA DE PRUEBA',carrera:career,requisitos:requisites()
});
test('migración v1 preserva estudiantes y notas y asigna Complexivo por defecto',()=>{
 const old={version:1,estudiantes:[{...one('0123456789'),tipoTitulacion:'sin_definir'},{...one('0987654321'),tipoTitulacion:'trabajo'}],notas:[{studentId:'0123456789',nucleo:1,nota:8}]};
 const migrated=Model.migrate(old);
 assert.equal(migrated.version,2);
 assert.equal(migrated.estudiantes[0].id,'0123456789');
 assert.equal(migrated.estudiantes[0].tipoTitulacion,'complexivo');
 assert.equal(migrated.estudiantes[1].tipoTitulacion,'trabajo');
 assert.equal(migrated.notas.length,1);
});
test('población y requisitos corresponden a cada modalidad',()=>{
 const state=Model.empty();
 for(let i=0;i<262;i++)state.estudiantes.push(one(String(i).padStart(10,'0')));
 for(let i=0;i<101;i++)state.estudiantes.push(one(String(i+262).padStart(10,'0'),'online','CONTABILIDAD ONLINE'));
 state.estudiantes[0].requisitos.Financiero='NO CUMPLE';
 const presencial=Model.analyze(state,'presencial'),online=Model.analyze(state,'online');
 assert.equal(presencial.total,262);assert.equal(online.total,101);
 assert.equal(presencial.complete9,261);assert.equal(online.complete9,101);
 assert.equal(presencial.byReq.find(r=>r.field==='Financiero').pending,1);
 assert.equal(Model.audit(state).issues.length,0);
});
test('cédulas repetidas generan incidencia, no se pierden registros',()=>{
 const s=Model.empty();s.estudiantes=[one('123'),one('123')];
 const a=Model.audit(s);assert.equal(a.unique,1);
 assert.ok(a.issues.some(x=>x.type==='cedula_repetida'));
});
test('nota cero válida, vacío no es cero, decimales y carrera normalizada',()=>{
 assert.equal(Model.grade(''),null);
 assert.equal(Model.grade(null),null);
 assert.equal(Model.grade('0,00'),0);
 assert.equal(Model.grade('9,20'),9.2);
 assert.equal(Model.career('TECNOLOGÍA SUPERIOR EN DESARROLLO DE SOFTWARE'),'DESARROLLO DE SOFTWARE');
});
test('Moodle y Word coincidentes no duplican notas',()=>{
 const s=Model.empty();s.estudiantes=[one('01')];
 s.notas=[{studentId:'01',nucleo:1,nota:9.2,carrera:'ENFERMERIA'}];
 s.notasBorrador=[{studentId:'01',nucleo:1,nota:'9,20',carrera:'Enfermería'}];
 const a=Model.analyze(s,'presencial');
 assert.equal(a.notes.length,1);assert.equal(a.sourceCounts.moodle,1);
});
test('contradicciones entre dos fuentes no se promedian',()=>{
 const s=Model.empty();s.estudiantes=[one('01')];
 s.notas=[{studentId:'01',nucleo:1,nota:9.2}];
 s.notasBorrador=[{studentId:'01',nucleo:1,nota:9.3}];
 const a=Model.analyze(s,'presencial');
 assert.equal(a.notes.length,0);assert.equal(a.conflicts.length,1);
});
test('informe individual no mezcla una cohorte parcial con totales públicos',()=>{
 const s=Model.empty();s.estudiantes=[one('01')];
 s.notas=[{studentId:'01',nucleo:2,nota:0}];
 const report=window.InformetitFullReport.getData(s,'presencial');
 assert.equal(report.total,1);
 assert.equal(report.source,'base_local_parcial');
 assert.equal(report.N('Enfermería',2).mean,0);
 assert.ok(window.InformetitFullReport.makeReport(s,'presencial').includes('Fase I'));
});
test('sin base individual el informe utiliza resumen agregado explícito',()=>{
 const s=Model.empty(),d=window.InformetitFullReport.getData(s,'online');
 assert.equal(d.source,'resumen_publico_sin_identificacion');
 assert.equal(d.total,101);
 assert.equal(d.people.length,0);
});
