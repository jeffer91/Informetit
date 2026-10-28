/* Informetit · Bloque 01 · Persistencia segura compatible con la base existente. */
(function(root){
'use strict';
const DATABASE='informetit-v1',STORE='data',MASTER='master';
const LEGACY='master-backup-before-block01';
let dbPromise=null,backend='indexeddb';
const model=()=>root.InformetitDataModel;
function open(){
 if(dbPromise)return dbPromise;
 if(!root.indexedDB)return Promise.reject(new Error('IndexedDB no disponible'));
 dbPromise=new Promise((resolve,reject)=>{
  const req=root.indexedDB.open(DATABASE,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||new Error('No se pudo abrir base local'));
  req.onblocked=()=>reject(new Error('Cierra la otra ventana de Informetit para actualizar la base'));
 }).catch(e=>{dbPromise=null;throw e});
 return dbPromise;
}
function transact(db,mode,callback){
 return new Promise((resolve,reject)=>{
  let tx;
  try{tx=db.transaction(STORE,mode)}catch(e){reject(e);return}
  let data;
  tx.oncomplete=()=>resolve(data);
  tx.onerror=()=>reject(tx.error||new Error('Error de lectura/escritura en base'));
  tx.onabort=()=>reject(tx.error||new Error('Transacción de base cancelada'));
  try{callback(tx.objectStore(STORE),v=>{data=v})}catch(e){try{tx.abort()}catch{}reject(e)}
 });
}
function legacyRead(){
 try{const text=root.localStorage?.getItem(DATABASE);return text?JSON.parse(text):null}
 catch(e){throw new Error('Respaldo antiguo de localStorage ilegible: '+e.message)}
}
async function load(){
 const M=model();let raw=null;
 try{
  const db=await open();
  raw=await transact(db,'readonly',(store,set)=>{
   const req=store.get(MASTER);req.onsuccess=()=>set(req.result||null);
  });
  backend='indexeddb';
  if(!raw){const old=legacyRead();if(old)raw=old;}
 }catch(e){
  if(!root.indexedDB){backend='localStorage';raw=legacyRead();}
  else if(/no se pudo abrir|indexeddb no disponible/i.test(String(e.message))){
   backend='localStorage';raw=legacyRead();
  }else throw e;
 }
 return M.migrate(raw);
}
async function save(data){
 const M=model(),value=M.migrate(data),issues=M.audit(value).issues.filter(p=>['id_vacio','cedula_repetida'].includes(p.type));
 if(issues.length)throw new Error('La base tiene '+issues.length+' identificaciones vacías o duplicadas. Resuelve esas incidencias antes de guardar.');
 if(backend==='localStorage'){
  if(!root.localStorage)throw new Error('Este entorno no permite guardar registros');
  root.localStorage.setItem(DATABASE,JSON.stringify(value));return value;
 }
 const db=await open();
 await transact(db,'readwrite',(store)=>{
  const original=store.get(MASTER);
  original.onsuccess=()=>{
   const prior=original.result;
   if(prior&&Number(prior.version||1)<M.SCHEMA_VERSION){
    const oldBackup=store.get(LEGACY);
    oldBackup.onsuccess=()=>{if(!oldBackup.result)store.put(prior,LEGACY);store.put(value,MASTER)};
   }else store.put(value,MASTER);
  };
 });
 return value;
}
async function hasLegacyBackup(){
 if(backend==='localStorage')return false;
 const db=await open();
 return !!(await transact(db,'readonly',(store,set)=>{
  const req=store.get(LEGACY);req.onsuccess=()=>set(req.result||null);
 }));
}
const api=Object.freeze({load,save,hasLegacyBackup,backend:()=>backend,key:DATABASE});
root.InformetitStore=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
