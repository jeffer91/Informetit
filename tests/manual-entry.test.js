'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;
const M=require('../data/model.js');
require('../data/nuclei-catalog.js');
require('../analysis/complexivo.js');
const Manual=require('../data/manual-entry.js');
const Firebase=require('../firebase/sync.js');
const st=(id,type='complexivo')=>({id,nombre:'ESTUDIANTE '+id,
 carrera:'Contabilidad',modalidad:'presencial',tipoTitulacion:type,requisitos:{}});
const base=()=>{const d=M.empty();d.estudiantes=[st('0000000001'),st('0000000002','trabajo'),st('0000000003','sin_definir')];return d};
test('formulario provisional conserva nota en la misma base privada, pero no la ofrece a Firebase',()=>{
 const s=base(),r=Manual.nucleus(s,{studentId:'0000000001',nucleus:1,score:'9,25',source:'Moodle',reviewed:false},'2026-10-30');
 assert.equal(r.kind,'provisional');
 assert.equal(r.next.notasBorrador[0].nota,9.25);
 assert.equal(r.next.notas.length,0);
 assert.equal(Firebase.localRecords(r.next).items.size,0);
 assert.equal(s.notasBorrador.length,0);
});
test('formulario verificado de núcleo está listo para Firebase sin necesidad de duplicar la nota',()=>{
 const s=base(),first=Manual.nucleus(s,{studentId:'0000000001',nucleus:1,score:'8,50',source:'Moodle',reviewed:false},'2026-10-30');
 const result=Manual.nucleus(first.next,{studentId:'0000000001',nucleus:1,score:'8,5',source:'Moodle cotejado',reviewed:true},'2026-10-30');
 assert.equal(result.kind,'verified');
 assert.equal(result.next.notas.length,1);
 assert.equal(result.next.notasBorrador.length,0);
 assert.equal(result.next.notas[0].nota,8.5);
 assert.equal(result.next.notas[0].curso,'Contabilidad Financiera');
 const pending=Firebase.pending(result.next);
 assert.equal(pending.length,1);
 assert.equal(pending[0].collection,'nucleos');
 const previous=Firebase.applyWriteSuccess(result.next,[{...pending[0],result:{updateTime:'2026-10-30T00:00:00Z'}}]);
 assert.equal(Firebase.pending(previous).length,0);
});
test('dos notas distintas no se reemplazan, se crea conflicto sin enviar nueva versión',()=>{
 const s=base();s.notas=[{studentId:'0000000001',nucleo:1,curso:'Contabilidad Financiera',nota:7,
  status:'oficial_registro_moodle',verificado:true,source:'Moodle'}];
 const r=Manual.nucleus(s,{studentId:'0000000001',nucleus:1,score:'8',source:'Acta cotejada',reviewed:true},'2026-10-30');
 assert.equal(r.kind,'conflict');
 assert.equal(r.next.notas[0].nota,7);
 assert.equal(r.next.conflictos.length,1);
 assert.equal(r.next.conflictos[0].nuevo.nota,8);
 assert.equal(s.conflictos.length,0);
});
test('cero es calificación válida y las notas ausentes o inválidas se rechazan',()=>{
 const s=base();
 assert.equal(Manual.nucleus(s,{studentId:'0000000001',nucleus:1,score:'0,00',source:'Moodle',reviewed:true},'2026-10-30').next.notas[0].nota,0);
 assert.throws(()=>Manual.nucleus(s,{studentId:'0000000001',nucleus:1,score:'',source:'Moodle'},'2026-10-30'),/nota real/);
 assert.throws(()=>Manual.nucleus(s,{studentId:'0000000001',nucleus:1,score:'11',source:'Moodle'},'2026-10-30'),/nota real/);
 assert.throws(()=>Manual.nucleus(s,{studentId:'0000000002',nucleus:1,score:'8',source:'Moodle'},'2026-10-30'),/Complexivo/);
});
test('requisitos en formulario no se envían a Firebase y preservan la nota existente',()=>{
 const s=base(),r=Manual.requirement(s,{studentId:'0000000002',field:'Financiero',value:'NO CUMPLE',source:'Matriz institucional'},'2026-10-30');
 assert.equal(r.next.estudiantes[1].requisitos.Financiero,'NO CUMPLE');
 assert.equal(r.next.auditoria[0].anterior,'');
 assert.equal(Firebase.localRecords(r.next).items.size,0);
 assert.equal(s.estudiantes[1].requisitos.Financiero,undefined);
});
test('el usuario no puede marcar Trabajo ni estudiantes sin clasificar como nota Complexivo',()=>{
 const s=base();
 for(const studentId of ['0000000002','0000000003'])
  assert.throws(()=>Manual.nucleus(s,{studentId,nucleus:1,score:'10',source:'Moodle',reviewed:true},'2026-10-30'),/Complexivo/);
});
test('si el curso Excel ya existe se coteja sin crear una segunda nota local',()=>{
 const s=base();s.cursosNucleos=[{studentId:'0000000001',nucleo:1,nota:8.2,
  curso:'Contabilidad Financiera',verificado:false}];
 const r=Manual.nucleus(s,{studentId:'0000000001',nucleus:1,score:'8,2',source:'Moodle',reviewed:true},'2026-10-30');
 assert.equal(r.next.notas.length,0);
 assert.equal(r.next.cursosNucleos.length,1);
 assert.equal(r.next.cursosNucleos[0].verificado,true);
 assert.equal(Firebase.pending(r.next).length,1);
});
