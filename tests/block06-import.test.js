'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
global.window=global;
const M=require('../data/model.js');
const X=require('../analysis/complexivo.js');
const Bulk=require('../analysis/complexivo_import.js');
const student=(id,tipo='complexivo',mode='presencial')=>({id,nombre:'PERSONA '+id,tipoTitulacion:tipo,modalidad:mode,carrera:'Enfermería',requisitos:{}});
const state=()=>{const s=M.empty();s.estudiantes=[student('0000000001'),student('0000000002')];return s};
const sample='Cédula\tTeoría\tPráctica\tNota supletorio\tActa ordinaria\tActa supletorio\n0000000001\t8,00\t9,00\t\tACTA-1\t\n0000000002\t5,00\t6,00\t7,50\tACTA-2\tACTA-SUP-2';
test('recibe encabezados reales de Excel y calcula ordinarios y supletorios',()=>{
 const parsed=Bulk.parse(sample),a=Bulk.assess(sample,state(),'presencial');
 assert.equal(parsed.rows.length,2);
 assert.equal(a.counts.ready,2);
 assert.equal(a.rows[0].studentId,'0000000001');
 const {next,stats}=Bulk.apply(state(),a,'2026-10-28');
 assert.equal(stats.added,2);
 const results=X.analyze(next,'presencial').counts;
 assert.equal(results.ordinaryApproved,1);
 assert.equal(results.recovered,1);
 assert.equal(results.verified,2);
});
test('CSV separado por punto y coma conserva nota cero',()=>{
 const csv='Cédula;Teórica;Práctica\n0000000001;0;0';
 const {rows}=Bulk.assess(csv,state(),'presencial');
 assert.equal(rows[0].status,'ready');
 const {next}=Bulk.apply(state(),Bulk.assess(csv,state(),'presencial'),'2026-10-28');
 assert.equal(next.evaluaciones[0].ordinario.teoria,0);
 assert.equal(X.analyze(next,'presencial').counts.ordinaryInsufficient,1);
});
test('cédulas desconocidas y estudiantes de Trabajo de Titulación no se vinculan',()=>{
 const s=state();s.estudiantes[1].tipoTitulacion='trabajo';
 const rows='Cédula\tTeoría\tPráctica\n0000000002\t8\t9\n0000000003\t8\t9';
 const a=Bulk.assess(rows,s,'presencial');
 assert.equal(a.counts.ready,0);
 assert.deepEqual(a.rows.map(x=>x.status),['wrong_mechanism','unmatched']);
 assert.equal(Bulk.apply(s,a,'2026-10-28').stats.added,0);
});
test('cédula duplicada dentro de un lote bloquea ambas filas',()=>{
 const csv='Cédula;Teoría;Práctica\n0000000001;8;9\n0000000001;9;9';
 const a=Bulk.assess(csv,state(),'presencial');
 assert.equal(a.counts.duplicate,2);
 assert.equal(Bulk.apply(state(),a,'2026-10-28').next.evaluaciones.length,0);
});
test('importación repetida nunca pisa evaluación existente',()=>{
 const s=state(),a=Bulk.assess(sample,s,'presencial'),first=Bulk.apply(s,a,'2026-10-28').next;
 const repeated=Bulk.assess(sample,first,'presencial');
 assert.equal(repeated.counts.existing,2);
 assert.equal(Bulk.apply(first,repeated,'2026-10-28').stats.added,0);
 assert.equal(first.evaluaciones[0].ordinario.teoria,8);
});
test('componentes inválidos, incompletos o contradictorios se separan',()=>{
 const raw='Cédula;Teoría;Práctica;Nota supletorio\n0000000001;12;9;\n0000000002;8;;';
 const a=Bulk.assess(raw,state(),'presencial');
 assert.equal(a.counts.ready,0);
 assert.equal(a.counts.invalid,2);
});
test('se respeta la modalidad antes de incorporar notas',()=>{
 const s=state();s.estudiantes[0].modalidad='online';
 const a=Bulk.assess('Cédula\tTeoría\tPráctica\n0000000001\t8\t9',s,'presencial');
 assert.equal(a.rows[0].status,'wrong_mode');
});
test('no se inventan notas sin cédula o columna requerida',()=>{
 assert.throws(()=>Bulk.parse('Nombre;Teoría;Práctica\nA;8;9'),/Cédula/);
 assert.throws(()=>Bulk.parse('Cédula;Teoría\n0000000001;8'),/Práctica/);
});
test('un lote sin valores no produce notas ficticias',()=>{
 const a=Bulk.assess('Cédula;Teoría;Práctica\n0000000001;;',state(),'presencial');
 assert.equal(a.rows[0].status,'without_grade');
 assert.equal(a.counts.ready,0);
});
