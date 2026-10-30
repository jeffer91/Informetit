'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Codec=require('../firebase/manual-backup.js');

const fixture=()=>({
 version:2,periodo:'Octubre 2025 - Marzo 2026',
 estudiantes:[{id:'1712345678',nombre:'Prueba Local',carrera:'CONTABILIDAD',
  modalidad:'presencial',requisitos:{Financiero:'CUMPLE'}}],
 notas:[{id:'1712345678|1',studentId:'1712345678',nucleo:1,nota:8.5,verificado:true}],
 notasBorrador:[{id:'1712345678|2',nota:7.5,verificado:false}],
 trabajos:[],evaluaciones:[],flujoNucleos:{CONTABILIDAD:{'1':{completado:true}}}
});

test('respaldo total se cifra, divide y recupera sin perder datos privados',async()=>{
 const original=fixture(),secret='clave privada de pruebas muy larga';
 const result=await Codec.seal(original,secret);
 assert.equal(result.manifest.type,'manifest');
 assert.ok(result.manifest.parts>0);
 assert.equal(result.chunks.length,result.manifest.parts);
 assert.equal(result.manifest.students,1);
 assert.ok(!result.chunks.join('').includes('CONTABILIDAD'));
 assert.deepEqual(await Codec.unseal(result.manifest,result.chunks,secret),original);
});
test('clave equivocada no devuelve datos',async()=>{
 const pack=await Codec.seal(fixture(),'clave original de respaldo');
 await assert.rejects(Codec.unseal(pack.manifest,pack.chunks,'otra clave muy distinta'),/incorrecta|dañado/);
});
test('fragmento alterado impide recuperación',async()=>{
 const pack=await Codec.seal(fixture(),'clave segura de respaldo');
 const altered=[...pack.chunks];altered[0]=altered[0].slice(1);
 await assert.rejects(Codec.unseal(pack.manifest,altered,'clave segura de respaldo'),/incompleto|modificó/);
});
test('sin clave segura no se permite generar una copia',async()=>{
 await assert.rejects(Codec.seal(fixture(),'abc'),/12 caracteres/);
});
