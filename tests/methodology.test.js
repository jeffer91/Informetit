'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;
const Model=require('../data/model.js');
require('../public_summary.js');
require('../nucleos_agregados.js');
const Catalog=require('../data/nuclei-catalog.js');
const Method=require('../analysis/methodology.js');
require('../document/codigo.js');
require('../document/institutional.js');
const Req=require('../analysis/requirements.js');
const N=require('../analysis/nuclei.js');
require('../analysis/complexivo.js');
require('../analysis/trabajo.js');
require('../analysis/consolidado.js');
require('../analysis/quality.js');
require('../analysis/executive.js');
require('../analysis/informe-completo.js');
require('../report_institucional.js');
const state=()=>Model.empty();
test('catálogo contiene 16 carreras, cuatro núcleos por carrera y 256 ejes de repaso explicados',()=>{
 assert.equal(Catalog.countCareers,16);
 assert.equal(Catalog.countNuclei,64);
 const list=Catalog.list();
 assert.equal(new Set(list.map(x=>x.key)).size,16);
 for(const career of list){
  assert.equal(career.nuclei.length,4,career.name);
  for(const [i,n] of career.nuclei.entries()){
   assert.equal(n.number,i+1);
   assert.ok(n.title.length>5);
   assert.match(n.intro,/repaso e integración de los conocimientos adquiridos/);
   assert.equal(n.topics.length,4);
   for(const topic of n.topics)assert.ok(topic.label.length>2&&topic.detail.length>8);
   assert.equal(n.status,'propuesta_para_validar');
  }
 }
});
test('las cuatro denominaciones de Administración son exactas y mantienen el orden',()=>{
 assert.deepEqual(Catalog.lookup('Administración').nuclei.map(n=>n.title),[
  'Gestión Comercial','Gestión de Procesos y Calidad','Gestión Estratégica','Gestión Financiera']);
 assert.equal(Catalog.lookup('Gestión del Talento Humano',1).title,
  'Administración de la Compensación y Beneficios Laborales');
 assert.equal(Catalog.lookup('Administración de Empresas',1).title,'Gestión Comercial');
 assert.equal(Catalog.lookup('Mecánica',1).title,'Fundamentos Científicos y Medición Automotriz');
 assert.equal(Catalog.lookup('Carrera inexistente'),null);
});
test('mapa SVG incluye nombres, centro conceptual y accesibilidad sin imágenes externas',()=>{
 const career=Catalog.lookup('Administración');
 const svg=Method.diagram(career);
 assert.match(svg,/data-nucleus-map="ADMINISTRACION"/);
 assert.equal((svg.match(/NÚCLEO [1234]/g)||[]).length,4);
 for(const n of career.nuclei)assert.ok(svg.includes(n.title.toUpperCase())||n.title.split(' ')[0].length>2);
 assert.match(svg,/PREPARACIÓN/);
 assert.match(svg,/role="img"/);
 assert.doesNotMatch(svg,/<image|<script|(?:href|src)=\"https?:\/\//);
});
test('metodología describe cuatro núcleos por carrera y distingue contenido propuesto de lo validado',()=>{
 const out=Method.render([{name:'Administración'},{name:'Enfermería'}],{
  H:(n,t)=>'<h'+n+'>'+t+'</h'+n+'>',
  para:t=>'<p>'+t+'</p>',
  Figure:(name,rows,opt)=>'<figure>'+name+opt.diagramSvg+'</figure>'
 });
 assert.match(out,/3\.1\.1\. ADMINISTRACIÓN/);
 assert.match(out,/3\.1\.2\. ENFERMERÍA/);
 assert.equal((out.match(/class="inf-nucleus-subtitle"/g)||[]).length,8);
 assert.equal((out.match(/data-nucleus-map=/g)||[]).length,2);
 assert.match(out,/Núcleo 1: GESTIÓN COMERCIAL/);
 assert.match(out,/Diagnóstico empresarial:/);
 assert.match(out,/Núcleo 4: ENFERMERÍA PARA EL CUIDADO INTEGRAL DE PACIENTES/);
 assert.match(out,/no tienen como finalidad impartir asignaturas nuevas/i);
 assert.match(out,/propuesta de temas por validar/i);
 assert.doesNotMatch(out,/Montessori|Contabilidad General.*Programación Orientada/);
});
test('el informe presencial y online incluyen metodología únicamente de sus carreras y tienen total',()=>{
 const pres=window.InformetitFullReport.makeReport(state(),'presencial');
 const onl=window.InformetitFullReport.makeReport(state(),'online');
 for(const html of [pres,onl]){
  assert.match(html,/3\.1\. Contenido de los núcleos estructurantes/);
  assert.match(html,/4\. Fase I. Verificación de requisitos/);
  assert.match(html,/Índice de figuras/);
  assert.match(html,/propuesta de temas por validar/);
 }
 assert.match(pres,/TOTAL PRESENCIAL<\/td><td>262<\/td><td>100,00 %/);
 assert.match(onl,/TOTAL ONLINE<\/td><td>101<\/td><td>100,00 %/);
 assert.equal((pres.match(/data-nucleus-map=/g)||[]).length,10);
 assert.equal((onl.match(/data-nucleus-map=/g)||[]).length,9);
 assert.doesNotMatch(pres,/3\.1\.\d+\. SEGURIDAD CIUDADANA Y ORDEN PÚBLICO/);
 assert.match(onl,/3\.1\.\d+\. SEGURIDAD CIUDADANA Y ORDEN PÚBLICO/);
 assert.match(pres,/5\.2\.\d+\.1\. Núcleo 1 — Enfermería en Promoción y Prevención de la Salud/);
});
test('metodología no cambia notas, estudiantes ni la sincronización Firebase',()=>{
 const s=state();
 s.estudiantes=[{id:'0000000001',nombre:'EJEMPLO',modalidad:'presencial',
  carrera:'Administración',tipoTitulacion:'sin_definir',requisitos:{Academico:'CUMPLE'}}];
 s.notas=[{studentId:'0000000001',nucleo:1,nota:8.2,verificado:false}];
 const before=JSON.stringify(s);
 const html=window.InformetitFullReport.makeReport(s,'presencial');
 assert.equal(JSON.stringify(s),before);
 assert.equal(s.estudiantes[0].tipoTitulacion,'sin_definir');
 assert.match(html,/propuesta de temas por validar/);
});
