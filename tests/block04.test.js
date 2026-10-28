'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
global.window=global;
const M=require('../data/model.js');
const Import=require('../moodle/importer.js');
const req=()=>Object.fromEntries(M.REQUIREMENTS.map(r=>[r,'CUMPLE']));
const student=(id='0000000001',career='Enfermería',mode='presencial')=>({
 id,nombre:'Persona De Prueba',carrera:career,modalidad:mode,correo:'persona@instituto.edu.ec',
 correoPersonal:'personal@example.org',tipoTitulacion:'complexivo',requisitos:req()
});
const state=()=>{const s=M.empty();s.estudiantes=[student()];return s};
const vertical='T- NUCLEO 1 ENFERMERIA\nPersona De Prueba\npersona@instituto.edu.ec\n8,00\n9,00\n7,00\n8,00\n9,00\n8,20';
const ctx=p=>Import.contextualize(p,{mode:'presencial',nucleus:'auto',career:'auto'});
test('texto vertical Moodle identifica núcleo, carrera y seis calificaciones',()=>{
 const p=Import.parse(vertical);
 assert.equal(p.format,'texto_vertical');
 assert.equal(p.nucleus,1);
 assert.equal(M.career(p.career),'ENFERMERIA');
 assert.equal(p.records[0].grade,8.2);
 assert.deepEqual(p.records[0].partials,[8,9,7,8,9]);
});
test('pegado tabular conserva solo la columna inequívoca Total del curso',()=>{
 const text='Nombre completo\tCorreo electrónico\tParcial 1\tTaller\tTotal del curso\n'
  +'Persona De Prueba\tpersona@instituto.edu.ec\t8,00\t9,00\t7,25';
 const parsed=Import.parse(text);
 assert.equal(parsed.format,'tabla_tab');
 assert.equal(parsed.records.length,1);
 assert.equal(parsed.records[0].grade,7.25);
 assert.deepEqual(parsed.records[0].partials,[8,9]);
});
test('CSV separado por punto y coma conserva cero como nota real',()=>{
 const input='Nombre completo;Correo electrónico;Nota final\nPersona De Prueba;persona@instituto.edu.ec;0,00';
 const parsed=Import.parse(input),context=Import.contextualize(parsed,{mode:'presencial',nucleus:2,career:'Enfermería'});
 assert.equal(parsed.records[0].grade,0);
 const evaluated=Import.assess(parsed,context,state());
 assert.equal(evaluated.summary.ready,1);
});
test('nota ausente o múltiple no se inventa ni se guarda',()=>{
 const text='Nombre completo\tCorreo electrónico\tTotal del curso\nPersona De Prueba\tpersona@instituto.edu.ec\t-';
 const p=Import.parse(text),a=Import.assess(p,Import.contextualize(p,{mode:'presencial',nucleus:1,career:'Enfermería'}),state());
 assert.equal(a.summary.missing_grade,1);
 assert.equal(Import.plan(state(),a,'2026-10-28').stats.added,0);
 const ambiguous=Import.parse('Nombre completo\tCorreo electrónico\tNota final\tTotal del curso\nPersona De Prueba\tpersona@instituto.edu.ec\t8,00\t9,00');
 assert.equal(ambiguous.records.length,0);
 assert.match(ambiguous.warnings[0],/varias columnas/);
});
test('debe indicarse núcleo y carrera cuando no constan en encabezado',()=>{
 const p=Import.parse('Nombre completo\tCorreo electrónico\tNota final\nPersona De Prueba\tpersona@instituto.edu.ec\t9,00');
 const c=ctx(p);
 assert.ok(c.errors.some(x=>x.includes('núcleo')));
 assert.ok(c.errors.some(x=>x.includes('carrera')));
 assert.throws(()=>Import.plan(state(),Import.assess(p,c,state()),'2026-10-28'));
});
test('identifica por correo y no admite cruces a otra carrera o modalidad',()=>{
 const p=Import.parse(vertical);
 const other=state();other.estudiantes[0].carrera='Contabilidad';
 assert.equal(Import.assess(p,ctx(p),other).summary.wrong_career,1);
 other.estudiantes[0].modalidad='online';
 assert.equal(Import.assess(p,ctx(p),other).summary.wrong_mode,1);
});
test('detecta discordancia entre correo, nombre y cédula',()=>{
 const p=Import.parse('Cédula\tNombre completo\tCorreo electrónico\tNota final\n0000000001\tNombre Incorrecto\tpersona@instituto.edu.ec\t9,00');
 const c=Import.contextualize(p,{mode:'presencial',nucleus:1,career:'Enfermería'});
 assert.equal(Import.assess(p,c,state()).summary.identity_conflict,1);
});
test('la primera importación añade una nota y reimportarla no duplica',()=>{
 const p=Import.parse(vertical),a=Import.assess(p,ctx(p),state());
 const first=Import.plan(state(),a,'2026-10-28');
 assert.equal(first.stats.added,1);
 assert.equal(first.next.notas.length,1);
 const again=Import.assess(p,ctx(p),first.next);
 assert.equal(again.summary.duplicate,1);
 const second=Import.plan(first.next,again,'2026-10-28');
 assert.equal(second.stats.added,0);
 assert.equal(second.next.notas.length,1);
});
test('mismo estudiante repetido en pegado no altera notas',()=>{
 const p=Import.parse(vertical+'\n'+vertical.replace(/^T- NUCLEO 1 ENFERMERIA\n/,''));
 const a=Import.assess(p,ctx(p),state());
 assert.equal(a.summary.repeat_in_paste,2);
 assert.equal(Import.plan(state(),a,'2026-10-28').stats.added,0);
});
test('Word coincidente admite enlace de Moodle sin duplicar el cálculo',()=>{
 const s=state();s.notasBorrador=[{id:'0000000001|1',studentId:'0000000001',nucleo:1,nota:8.2}];
 const a=Import.assess(Import.parse(vertical),ctx(Import.parse(vertical)),s);
 assert.equal(a.summary.ready,1);
 const imported=Import.plan(s,a,'2026-10-28').next;
 assert.equal(imported.notas.length,1);
 assert.equal(imported.notasBorrador.length,1);
 assert.equal(M.analyze(imported,'presencial').notes.length,1);
});
test('Word diferente genera conflicto y no modifica calificaciones existentes',()=>{
 const s=state();s.notasBorrador=[{id:'0000000001|1',studentId:'0000000001',nucleo:1,nota:9.2}];
 const p=Import.parse(vertical),a=Import.assess(p,ctx(p),s);
 assert.equal(a.summary.conflict,1);
 const imported=Import.plan(s,a,'2026-10-28').next;
 assert.equal(imported.conflictos.length,1);
 assert.equal(imported.notas.length,0);
 assert.equal(imported.notasBorrador[0].nota,9.2);
 assert.equal(M.analyze(imported,'presencial').notes.length,0);
});
test('aceptar Moodle archiva Word y el conflicto no reaparece',()=>{
 const s=state();s.notasBorrador=[{id:'0000000001|1',studentId:'0000000001',nucleo:1,nota:9.2}];
 const p=Import.parse(vertical),a=Import.assess(p,ctx(p),s);
 const staged=Import.plan(s,a,'2026-10-28').next;
 const resolved=Import.resolveConflict(staged,0,'new','2026-10-28');
 assert.equal(resolved.conflictos.length,0);
 assert.equal(resolved.notas[0].nota,8.2);
 assert.equal(resolved.notasBorrador.length,0);
 assert.equal(M.analyze(resolved,'presencial').notes.length,1);
 assert.equal(resolved.auditoria.length,1);
});
test('conservar Word archiva Moodle y el conflicto no reaparece',()=>{
 const s=state();s.notasBorrador=[{id:'0000000001|1',studentId:'0000000001',nucleo:1,nota:9.2}];
 const p=Import.parse(vertical),a=Import.assess(p,ctx(p),s);
 const staged=Import.plan(s,a,'2026-10-28').next;
 const resolved=Import.resolveConflict(staged,0,'current','2026-10-28');
 assert.equal(resolved.conflictos.length,0);
 assert.equal(resolved.notas.length,0);
 assert.equal(resolved.notasBorrador[0].nota,9.2);
 assert.equal(M.analyze(resolved,'presencial').notes.length,1);
});
test('registro sin vincular se registra una sola vez',()=>{
 const s=state(),p=Import.parse(vertical.replace(/persona@instituto.edu.ec/g,'desconocido@correo.test').replace(/Persona De Prueba/g,'Persona Inexistente'));
 const a=Import.assess(p,ctx(p),s);
 assert.equal(a.summary.unmatched,1);
 const once=Import.plan(s,a,'2026-10-28').next;
 const twice=Import.plan(once,a,'2026-10-28').next;
 assert.equal(twice.sinVincular.length,1);
 assert.equal(s.sinVincular.length,0);
});
test('archivo sin nómina nunca produce una nota inventada',()=>{
 const s=M.empty(),p=Import.parse(vertical);
 const a=Import.assess(p,ctx(p),s);
 assert.equal(a.summary.unmatched,1);
 assert.equal(Import.plan(s,a,'2026-10-28').stats.added,0);
});

test('vinculación manual exige carrera, modalidad y nota final válida',()=>{
 const base=state();
 base.sinVincular=[{tipo:'nota_moodle',nucleo:1,carrera:'Enfermería',modalidad:'presencial',
  registro:{name:'Nombre de otra fuente',email:'sincoincidencia@example.org',nota:7.5,parciales:[7,8]}}];
 const linked=Import.linkPending(base,0,'0000000001','2026-10-28');
 assert.equal(linked.status,'added');
 assert.equal(linked.next.notas.length,1);
 assert.equal(linked.next.notas[0].nota,7.5);
 assert.deepEqual(linked.next.notas[0].parciales,[7,8]);
 assert.equal(linked.next.sinVincular.length,0);
 assert.equal(linked.next.auditoria.length,1);
 assert.equal(base.sinVincular.length,1);
 const other=state();other.estudiantes[0].carrera='Contabilidad';
 other.sinVincular=base.sinVincular;
 assert.throws(()=>Import.linkPending(other,0,'0000000001','2026-10-28'));
});
test('vinculación manual conflictiva conserva la nota Word y solicita decisión',()=>{
 const base=state();
 base.sinVincular=[{tipo:'nota_moodle',nucleo:1,carrera:'Enfermería',modalidad:'presencial',
  registro:{nota:8.7,email:'otra@example.org',parciales:[]}}];
 base.notasBorrador=[{id:'0000000001|1',studentId:'0000000001',nucleo:1,nota:9.2}];
 const result=Import.linkPending(base,0,'0000000001','2026-10-28');
 assert.equal(result.status,'conflict');
 assert.equal(result.next.conflictos.length,1);
 assert.equal(result.next.notasBorrador[0].nota,9.2);
 assert.equal(result.next.notas.length,0);
});

test('estudiantes de Trabajo de Titulación no se incluyen en núcleos Complexivo',()=>{
 const st=state();st.estudiantes[0].tipoTitulacion='trabajo';
 const p=Import.parse(vertical),assessment=Import.assess(p,ctx(p),st);
 assert.equal(assessment.summary.wrong_mechanism,1);
 assert.equal(Import.plan(st,assessment,'2026-10-28').stats.added,0);
 st.notas=[{studentId:'0000000001',nucleo:1,nota:8.2}];
 assert.equal(M.analyze(st,'presencial').notes.length,0);
 st.sinVincular=[{tipo:'nota_moodle',nucleo:1,carrera:'Enfermería',modalidad:'presencial',registro:{nota:8.2}}];
 assert.throws(()=>Import.linkPending(st,0,'0000000001','2026-10-28'));
});
