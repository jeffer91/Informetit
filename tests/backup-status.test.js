'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;
global.indexedDB=undefined;
const map=new Map();
global.localStorage={getItem:key=>map.get(key)||null,setItem:(key,v)=>map.set(key,v)};
const M=require('../data/model.js');
const Store=require('../data/storage.js');
test('respaldo GPT confirmado: se informa el éxito solo si Electron devuelve saved=true',async()=>{
 await Store.load();
 global.informetitDesktop={backupMaster:async()=>({saved:true,location:'perfil privado de Informetit'})};
 await Store.save(M.empty());
 assert.equal(Store.backend(),'localStorage');
 assert.equal(Store.lastBackup().ok,true);
 assert.ok(map.has(Store.key));
});
test('error del respaldo no se oculta ni se afirma sincronización completa',async()=>{
 global.informetitDesktop={backupMaster:async()=>{throw Error('Sin espacio en disco')}};
 const value=M.empty();value.config.observaciones='comprobación de error de respaldo';
 await Store.save(value);
 assert.equal(Store.lastBackup().ok,false);
 assert.match(Store.lastBackup().reason,/Sin espacio en disco/);
 assert.equal(JSON.parse(map.get(Store.key)).config.observaciones,'comprobación de error de respaldo');
});
test('el respaldo no confirmado tampoco se marca como correcto',async()=>{
 global.informetitDesktop={backupMaster:async()=>({saved:false})};
 await Store.save(M.empty());
 assert.equal(Store.lastBackup().ok,false);
});
