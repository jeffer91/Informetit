'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
require('../data/model.js');
require('../data/nuclei-catalog.js');
require('../moodle/importer.js');
const I=require('../moodle/intelligent.js');
const M=globalThis.InformetitDataModel;
const people=[
 {id:'1234567890',nombre:'ACOSTA CHICA CARLOS EDUARDO',correo:'caacosta@itsqmet.edu.ec',
  carrera:'ADMINISTRACION',modalidad:'online',tipoTitulacion:'complexivo',requisitos:{}},
 {id:'0123456789',nombre:'ALVARADO PEREZ MALENA RACHELL',correo:'malvarado@itsqmet.edu.ec',
  carrera:'ADMINISTRACION',modalidad:'presencial',tipoTitulacion:'sin_definir',requisitos:{}}
];
const master=()=>({...M.empty(),estudiantes:people.map(x=>({...x}))});
const row=(name,mail,nums)=>name+'Matriculación de usuarios suspendida\n'+mail+'\n'+nums.join('\n');
const input=[
 'T-NUCLEO - GESTIÓN COMERCIAL [Mod 13, OCT-MAR26 Esp. M-A]',
 row('CARLOS EDUARDO ACOSTA CHICA','caacosta@itsqmet.edu.ec',['9,00','10,00','10,00','10,00','10,00','10,00','9,83']),
 row('MALENA RACHELL ALVARADO PEREZ','malvarado@itsqmet.edu.ec',['9,00','10,00','10,00','10,00','10,00','10,00','9,83']),
 'Promedio general\n9,66',
 'T-NUCLEO - GESTIÓN FINANCIERA [Mod 11, OCT-MAR26 Esp. M-A]',
 row('CARLOS EDUARDO ACOSTA CHICA','caacosta@itsqmet.edu.ec',['10,00','10,00','10,00','10,00','8,00','9,60'])
].join('\n');
test('Identifica cursos por nombre, nunca por Mod 13 ni Mod 11',()=>{
 const x=I.assess(input,master());
 assert.equal(x.courses.length,2);
 assert.equal(x.courses[0].nucleus,1);
 assert.equal(x.courses[1].nucleus,4);
 assert.equal(x.courses[1].career,'Administración');
 assert.equal(x.courses[0].rows[0].student.modalidad,'online');
 assert.equal(x.courses[0].rows[1].student.modalidad,'presencial');
});
test('El cotejo preserva sin_definir y separa oficial de provisional',()=>{
 const s=master(),analysis=I.assess(input,s);
 const {next,stats}=I.apply(s,analysis,true,'2026-10-30');
 assert.equal(stats.verified,2);
 assert.equal(stats.provisional,1);
 assert.equal(next.notas.length,2);
 assert.equal(next.notasBorrador.length,1);
 assert.equal(next.estudiantes[1].tipoTitulacion,'sin_definir');
 assert.equal(next.notas.find(n=>n.nucleo===1).nota,9.83);
 assert.equal(next.notasBorrador[0].modalidad,'presencial');
 const again=I.assess(input,next);
 assert.equal(again.counts.already,2);
 assert.equal(again.courses[0].rows[1].status,'draft_same');
});
test('Sin nota final inequívoca, no inventa un total',()=>{
 const raw='T-NUCLEO - GESTIÓN COMERCIAL [Mod 13]\n'+
  row('CARLOS EDUARDO ACOSTA CHICA','caacosta@itsqmet.edu.ec',['10,00','10,00','10,00','10,00','10,00','10,00']);
 const a=I.assess(raw,master());
 assert.equal(a.courses[0].rows[0].status,'missing_grade');
 assert.equal(a.counts.ready,0);
});
test('Identidad diferente o correo extra quedan en cuarentena',()=>{
 const raw='T-NUCLEO - GESTIÓN COMERCIAL [Mod 13]\n'+
 row('ALVARADO PEREZ MALENA RACHELL','otra@itsqmet.edu.ec',['9,00','10,00','10,00','10,00','10,00','10,00','9,83']);
 const a=I.assess(raw,master());
 assert.equal(a.courses[0].rows[0].status,'identity_conflict');
 const s=I.apply(master(),a,false,'2026-10-30');
 assert.equal(s.next.notas.length,0);
 assert.equal(s.stats.quarantine,1);
});
test('Nunca sobrescribe notas distintas: registra conflicto',()=>{
 const s=master();s.notas=[{id:'1234567890|1',studentId:'1234567890',nucleo:1,nota:7,verificado:true}];
 const a=I.assess(input,s);
 assert.equal(a.courses[0].rows[0].status,'conflict');
 const out=I.apply(s,a,false,'2026-10-30');
 assert.equal(out.next.notas[0].nota,7);
 assert.equal(out.next.conflictos.length,1);
});
test('Rechaza un lote con dos filas de la misma persona y núcleo',()=>{
 const raw='T-NUCLEO - GESTIÓN COMERCIAL [Mod 13]\n'+
  row('CARLOS EDUARDO ACOSTA CHICA','caacosta@itsqmet.edu.ec',['9,00','10,00','10,00','10,00','10,00','10,00','9,83'])+'\n'+
  row('CARLOS EDUARDO ACOSTA CHICA','caacosta@itsqmet.edu.ec',['9,00','10,00','10,00','10,00','10,00','10,00','9,83']);
 const a=I.assess(raw,master());
 assert.equal(a.counts.ready,0);
 assert.ok(a.courses[0].rows.every(x=>x.status==='duplicate_paste'));
});
test('Pendientes se separan por carrera, modalidad y mecanismo',()=>{
 const p=I.pending(master());
 const admin=p.rows.filter(x=>x.career==='Administración');
 assert.equal(admin.length,2);
 assert.equal(admin.find(x=>x.mode==='online').known,1);
 assert.equal(admin.find(x=>x.mode==='presencial').unknown,1);
 assert.equal(admin[0].nuclei.length,4);
});


test('TSV o Excel Moodle con Total del curso explícito conserva nota cero',()=>{
 const raw='Nombre / Apellido(s)\tDirección de correo\tCuestionarioEVALUACIÓN PARCIAL 1\tMedia de calificacionesTotal del curso\n'
   +'CARLOS EDUARDO ACOSTA CHICA\tcaacosta@itsqmet.edu.ec\t9,00\t9,83\n'
   +'MALENA RACHELL ALVARADO PEREZ\tmalvarado@itsqmet.edu.ec\t0,00\t0,00';
 const a=I.assess(raw,master(),{career:'Administración',nucleus:1});
 assert.equal(a.counts.ready,2);
 assert.equal(a.courses[0].rows[0].grade,9.83);
 assert.equal(a.courses[0].rows[1].grade,0);
});

test('no permite guardar vista previa si cambia una nota o mecanismo sin variar el número de filas',()=>{
 const old=master();const raw='T-NUCLEO - GESTIÓN COMERCIAL [Mod 13]\n'+
 row('CARLOS EDUARDO ACOSTA CHICA','caacosta@itsqmet.edu.ec',
 ['9,00','10,00','10,00','10,00','10,00','10,00','9,83']);
 const staged=I.assess(raw,old);
 old.estudiantes[0].tipoTitulacion='trabajo';
 assert.throws(()=>I.apply(old,staged,false,'2026-10-30'),/base cambió/);
 const fresh=master(),preview=I.assess(raw,fresh);
 fresh.notas.push({studentId:'1234567890',nucleo:1,nota:8,verificado:true});
 assert.throws(()=>I.apply(fresh,preview,true,'2026-10-30'),/base cambió/);
});

test('cotejar Moodle promociona borrador coincidente sin duplicar nota, conserva procedencia',()=>{
 const s=master();
 s.notasBorrador.push({id:'1234567890|1',studentId:'1234567890',nucleo:1,nota:9.83,
  status:'provisional_por_conciliar',fuente:'Word preliminar'});
 const raw='T-NUCLEO - GESTIÓN COMERCIAL [Mod 13]\n'+
 row('CARLOS EDUARDO ACOSTA CHICA','caacosta@itsqmet.edu.ec',
 ['9,00','10,00','10,00','10,00','10,00','10,00','9,83']);
 let preview=I.assess(raw,s);
 assert.equal(preview.courses[0].rows[0].status,'draft_same');
 const without=I.apply(s,preview,false,'2026-10-30');
 assert.equal(without.next.notas.length,0);
 assert.equal(without.next.notasBorrador.length,1);
 const applied=I.apply(s,preview,true,'2026-10-30');
 assert.equal(applied.stats.promoted,1);
 assert.equal(applied.next.notas.length,1);
 assert.equal(applied.next.notasBorrador.length,0);
 assert.equal(applied.next.notas[0].verificado,true);
 assert.equal(applied.next.notas[0].origenBorrador[0].fuente,'Word preliminar');
 assert.equal(applied.next.auditoria.some(x=>x.tipo==='cotejo_nota_borrador'),true);
});
