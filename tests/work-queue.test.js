'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;
const D=require('../data/model.js');
require('../data/nuclei-catalog.js');
require('../analysis/complexivo.js');
require('../analysis/trabajo.js');
const Q=require('../analysis/work-queue.js');
const s=(id,tipo='complexivo',mode='presencial',career='Administración')=>({
 id,nombre:'ESTUDIANTE '+id,tipoTitulacion:tipo,modalidad:mode,carrera:career,requisitos:Object.fromEntries(D.REQUIREMENTS.map(k=>[k,'CUMPLE']))
});
test('sin nómina privada: solamente pide la base, sin inferir estudiantes de datos agregados',()=>{
 const r=Q.build(D.empty());
 assert.equal(r.hasRoster,false);
 assert.equal(r.upload.length,1);
 assert.equal(r.upload[0].id,'roster');
 assert.equal(r.review.length,0);
});
test('separa por carrera, modalidad y mecanismo sin pedir núcleos a Trabajo',()=>{
 const x=D.empty();x.estudiantes=[s('0000000001'),s('0000000002','trabajo'),s('0000000003','sin_definir'),
 s('0000000004','complexivo','online'),s('0000000005','complexivo','presencial','Contabilidad')];
 const r=Q.build(x);
 const p=r.careers.find(x=>x.career==='Administración'&&x.mode==='presencial');
 assert.ok(p);
 const a=r.upload.filter(x=>x.scope===p.id);
 assert.equal(a.filter(x=>x.nucleus>0).length,4);
 assert.equal(a.find(x=>x.nucleus===1).count,1);
 assert.equal(a.find(x=>x.page==='evaluaciones').count,1);
 assert.equal(a.find(x=>x.page==='trabajo').count,1);
 assert.ok(r.review.some(x=>x.scope===p.id&&/Clasificar mecanismo/.test(x.label)));
 assert.equal(r.careers.length,3);
});
test('37 de 38 notas: una única carga real; la nota provisional se revisa aparte',()=>{
 const x=D.empty();x.estudiantes=Array.from({length:38},(_,i)=>s(String(i+1).padStart(10,'0')));
 x.notas=Array.from({length:36},(_,i)=>({studentId:String(i+1).padStart(10,'0'),nucleo:1,nota:8.6,verificado:true}));
 x.notasBorrador=[{studentId:'0000000037',nucleo:1,nota:9,status:'provisional_por_conciliar'}];
 const r=Q.build(x);
 assert.equal(r.upload.find(x=>x.nucleus===1).count,1);
 assert.equal(r.review.find(x=>x.id.endsWith('verify1')).count,1);
 assert.equal(r.upload.find(x=>x.nucleus===2).count,38);
});
test('cero es nota válida y NO CUMPLE no se trata como campo vacío',()=>{
 const x=D.empty();x.estudiantes=[s('0000000001')];x.estudiantes[0].requisitos.Financiero='NO CUMPLE';
 x.notas=[{studentId:'0000000001',nucleo:1,nota:0,verificado:true}];
 let r=Q.build(x);
 assert.equal(r.upload.some(x=>x.id.endsWith('requirements')),false);
 assert.equal(r.upload.some(x=>x.nucleus===1),false);
 x.estudiantes[0].requisitos.Financiero='';
 r=Q.build(x);
 assert.equal(r.upload.find(x=>x.id.endsWith('requirements')).count,1);
});
test('al existir evaluación y proyecto no repite solicitudes de subida',()=>{
 const x=D.empty();x.estudiantes=[s('0000000001'),s('0000000002','trabajo')];
 x.evaluaciones=[{studentId:'0000000001',tipo:'complexivo',ordinario:{}}];
 x.trabajos=[{studentId:'0000000002',numeroActa:''}];
 const r=Q.build(x);
 assert.equal(r.upload.some(x=>x.page==='evaluaciones'),false);
 assert.equal(r.upload.some(x=>x.page==='trabajo'),false);
});
test('sólo clasificados en Complexivo generan faltantes de núcleos',()=>{
 const x=D.empty();x.estudiantes=[s('0000000001','sin_definir'),s('0000000002','trabajo')];
 const r=Q.build(x);
 assert.equal(r.upload.some(x=>x.nucleus>0),false);
 assert.ok(r.review.some(x=>/Clasificar mecanismo/.test(x.label)));
});

test('registros presentes pero incompletos generan tareas de completar, no de importar de nuevo',()=>{
 const x=D.empty();x.estudiantes=[s('0000000001'),s('0000000002','trabajo')];
 x.evaluaciones=[{studentId:'0000000001',tipo:'complexivo',
   ordinario:{teoria:8,practica:null,asistencia:'presentado'}}];
 x.trabajos=[{studentId:'0000000002',asistencia:'presentado',tutor:8,lector:9}];
 const r=Q.build(x);
 assert.equal(r.upload.some(t=>t.id.endsWith('exam')),false);
 assert.equal(r.upload.find(t=>t.id.endsWith('exam-components')).count,1);
 assert.equal(r.upload.some(t=>t.id.endsWith('project')),false);
 assert.equal(r.upload.find(t=>t.id.endsWith('project-rubric')).count,1);
});
test('acta ausente genera cotejo, nunca una segunda calificación ficticia',()=>{
 const x=D.empty();x.estudiantes=[s('0000000001')];
 x.evaluaciones=[{studentId:'0000000001',tipo:'complexivo',
   ordinario:{teoria:8,practica:9,asistencia:'presentado'}}];
 const r=Q.build(x);
 assert.equal(r.upload.some(t=>t.id.endsWith('exam-components')),false);
 assert.equal(r.review.find(t=>t.id.endsWith('exam-actas')).count,1);
});
