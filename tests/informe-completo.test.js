'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;
const M=require('../data/model.js');
require('../public_summary.js');require('../nucleos_agregados.js');
require('../document/codigo.js');require('../document/institutional.js');
require('../analysis/requirements.js');require('../analysis/nuclei.js');require('../analysis/complexivo.js');
require('../analysis/trabajo.js');require('../analysis/consolidado.js');require('../analysis/quality.js');
require('../analysis/executive.js');
const Full=require('../analysis/informe-completo.js');
require('../report_institucional.js');
const st=(id,name,kind='complexivo')=>({
 id,nombre:name,carrera:'Enfermería',modalidad:'presencial',tipoTitulacion:kind,
 requisitos:Object.fromEntries(M.REQUIREMENTS.map(x=>[x,'CUMPLE']))
});
const sample=()=>{
 const s=M.empty();
 s.estudiantes=[st('0000000001','ESTUDIANTE UNO'),st('0000000002','ESTUDIANTE DOS'),
  st('0000000003','ESTUDIANTE TRES','sin_definir')];
 s.notas=[{id:'0000000001|1',studentId:'0000000001',nucleo:1,nota:8.3,
  source:'Texto Moodle: curso práctico',status:'oficial_registro_moodle'}];
 s.notasBorrador=[{id:'0000000002|1',studentId:'0000000002',nucleo:1,nota:9.2,
  estado:'provisional_por_conciliar',fuente:'Word no validado'}];
 s.cursosNucleos=[{studentId:'0000000002',nucleo:1,curso:'Curso de control',nota:9.2,
  carrera:'Enfermería',modalidad:'presencial',docente:'DOCENTE A',verificado:true}];
 return s;
};
const helpers={
 H:(l,t)=>'<h'+l+'>'+t+'</h'+l+'>',
 para:t=>'<p>'+t+'</p>',
 Table:(name,heads,rows)=>'<table data-title="'+name+'">'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</table>',
 Figure:(name)=>'<figure>'+name+'</figure>',F:x=>String(x),P:(a,b)=>b?100*a/b:0
};
test('la cohorte de tres estudiantes preserva uno sin mecanismo asignado',()=>{
 const s=M.migrate(sample()),a=global.InformetitConsolidado.analyze(s,'presencial');
 assert.equal(a.counts.total,3);
 assert.equal(a.counts.complexivo,2);
 assert.equal(a.counts.trabajo,0);
 assert.equal(a.counts.unclassified,1);
 assert.equal(a.counts.approved,0);
});
test('los borradores Word no se vuelven notas oficiales y cursos cotejados aparecen por separado',()=>{
 const s=sample();
 assert.equal(M.analyze(s,'presencial').notes.length,1);
 assert.equal(Full.courseRows(s,'presencial').length,2);
 assert.match(Full.courseAnalysis(s,'presencial',helpers),/Curso de control/);
 assert.match(Full.courseAnalysis(s,'presencial',helpers),/DOCENTE A/);
 assert.match(Full.provisionalRows(s,'presencial',helpers),/Word no validado/);
});
test('el informe completo no sustituye tablas individuales por el consolidado',()=>{
 const html=global.InformetitFullReport.makeReport(sample(),'presencial');
 const required=['5.4. Resultados individuales por curso','Calificaciones individuales',
  '5.5. Registros provisionales','7.7. Desarrollo analítico por carrera',
  'Examen ordinario individual','Examen supletorio individual','Resultados definitivos',
  '12. Plan de Mejora','13.5. Matrices nominales','14. Referencias Bibliográficas',
  '9. Resumen Ejecutivo','Matriz FODA','Árbol de clasificación','BORRADOR SIN VALIDAR'];
 for(const x of required)assert.ok(html.includes(x),x);
 assert.ok(html.indexOf('8. Síntesis general de la cohorte')<html.indexOf('9. Resumen Ejecutivo'));
 assert.ok(html.indexOf('9. Resumen Ejecutivo')<html.indexOf('10. Conclusiones'));
 assert.ok(html.indexOf('10. Conclusiones')<html.indexOf('12. Plan de Mejora'));
 assert.match(html,/body>h2\{break-before:page/);
 assert.match(html,/apa-ref/);
});
test('Ishikawa, FODA y árbol usan cifras de la base y no valores decorativos',()=>{
 const s=sample(),r=global.InformetitRequirements.analyze(s,'presencial'),
 c=global.InformetitConsolidado.analyze(s,'presencial'),
 q=global.InformetitQuality.analyze(s,'presencial');
 const data={requirements:r,cierre:c,quality:q,state:s};
 const I=global.InformetitExecutive;
 for(const xml of [I.bones(data),I.foda(data),I.tree(3,2,c.counts,'presencial',r)]){
  assert.match(xml,/<svg/);assert.match(xml,/<\/svg>/);
 }
 assert.match(I.bones(data),/sin clasificar/);
 assert.match(I.foda(data),/DEBILIDADES OBSERVADAS/);
 assert.match(I.tree(3,2,c.counts,'presencial',r),/Sin definir/);
});
