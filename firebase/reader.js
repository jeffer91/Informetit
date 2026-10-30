/* Informetit / UTET: perímetro de Firestore limitado a nucleos y complexivos.
 * Nunca se ejecutan solicitudes sobre matrículas, requisitos u otras colecciones.
 * Las credenciales solo existen en el proceso principal de Electron.
 */
'use strict';
const fs=require('node:fs/promises');
const backupCodec=require('./manual-backup.js');
const PROJECT='utet-4387a';
const COLLECTIONS=Object.freeze(['nucleos','complexivos']);
const COLLECTION_SET=new Set(COLLECTIONS);
const PERIOD='2025-10__2026-03';
const API='https://firestore.googleapis.com/v1/projects/'+PROJECT+'/databases/(default)/documents';
let authClient=null,authMethod='';
function assertCollection(name){
 if(!COLLECTION_SET.has(name))throw Error('Acceso denegado a colección fuera del alcance de Informetit.');
 return name;
}
function documentId(value){
 if(typeof value!=='string'||!(/^[A-Za-z0-9_-]{1,180}$/).test(value))throw Error('Identificador de documento no permitido.');
 return value;
}
function validateRecord(name,record){
 assertCollection(name);
 if(!record||typeof record!=='object'||Array.isArray(record))throw Error('Documento académico inválido');
 if(record.periodoId!==PERIOD)throw Error('Solo se permite el período '+PERIOD);
 if(!/^\d{10}$/.test(String(record.cedula||'')))throw Error('Cédula inválida');
 if(!['online','presencial'].includes(record.modalidad))throw Error('Modalidad no permitida');
 if(name==='nucleos'){
  if(!Number.isInteger(record.nucleo)||record.nucleo<1||record.nucleo>4)throw Error('Núcleo no permitido');
  if(typeof record.notaFinal!=='number'||!Number.isFinite(record.notaFinal)||record.notaFinal<0||record.notaFinal>10)
   throw Error('La nota del núcleo debe estar entre 0 y 10');
  if(record.verificado!==true)throw Error('No se publican notas provisionales');
 }else{
  if(record.verificado!==true||record.actaCotejada!==true||!record.actaOrdinario&&!record.actaSupletorio)
   throw Error('Examen sin verificación y referencia de acta; no se publica');
 }
 const allowed=name==='nucleos'?
  ['periodoId','cedula','modalidad','carrera','nucleo','curso','notaFinal','fuente','verificado','origen','schemaVersion']:
  ['periodoId','cedula','modalidad','carrera','ordinario','supletorio','actaOrdinario','actaSupletorio','actaCotejada','verificado','origen','schemaVersion'];
 if(Object.keys(record).some(k=>!allowed.includes(k)))throw Error('Campos del documento no permitidos para '+name);
 return record;
}
function encode(value){
 if(value===null)return {nullValue:null};
 if(typeof value==='string')return {stringValue:value};
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Número no finito');return {doubleValue:value}}
 if(typeof value==='boolean')return {booleanValue:value};
 if(Array.isArray(value))return {arrayValue:{values:value.map(encode)}};
 if(value&&typeof value==='object')return {mapValue:{fields:Object.fromEntries(Object.entries(value)
   .filter(([,v])=>v!==undefined).map(([k,v])=>[k,encode(v)]))}};
 throw Error('Tipo de campo Firestore incompatible');
}
async function connect({method='adc',selectFile}={}){
 const {GoogleAuth}=require('google-auth-library');
 let options={projectId:PROJECT,scopes:['https://www.googleapis.com/auth/datastore']};
 if(method==='service_account'){
  if(typeof selectFile!=='function')throw Error('Se necesita selector de credenciales local');
  const filename=await selectFile();if(!filename)return {canceled:true};
  const credential=JSON.parse(await fs.readFile(filename,'utf8'));
  if(credential.type!=='service_account'||credential.project_id!==PROJECT||!credential.private_key)
   throw Error('Esta cuenta de servicio no pertenece a Firebase UTET');
  options={...options,keyFile:filename};
 }else if(method!=='adc')throw Error('Método de autenticación no autorizado');
 const candidate=new GoogleAuth(options),client=await candidate.getClient();
 const token=await client.getAccessToken();
 if(!token?.token)throw Error('No se recibió token Google válido');
 authClient=client;authMethod=method;
 return {connected:true,project:PROJECT,authMethod:method,readOnly:false,collections:[...COLLECTIONS]};
}
async function request(url,opts={}){
 if(!authClient)throw Error('Conecta una cuenta Google autorizada');
 const token=await authClient.getAccessToken();
 if(!token?.token)throw Error('La sesión Google caducó');
 const response=await fetch(url,{
  method:opts.method||'GET',headers:{Authorization:'Bearer '+token.token,Accept:'application/json',
   ...(opts.body?{'Content-Type':'application/json'}:{})},
  body:opts.body?JSON.stringify(opts.body):undefined,signal:AbortSignal.timeout(30000)
 });
 if(response.status===404&&opts.missingIsEmpty)return {documents:[]};
 if(!response.ok){
  const body=(await response.text()).slice(0,500);
  const err=new Error('Firestore '+response.status+' en '+(opts.method||'GET')+
   ' de colección autorizada: '+body);
  err.httpStatus=response.status;throw err;
 }
 return response.json();
}
async function requestCollection(name){
 assertCollection(name);
 const docs=[];let cursor='';
 do{
  const url=new URL(API+'/'+name);url.searchParams.set('pageSize','500');
  if(cursor)url.searchParams.set('pageToken',cursor);
  const result=await request(url.toString(),{missingIsEmpty:true});
  docs.push(...(result.documents||[]));
  if(docs.length>20000)throw Error('Excedido límite de documentos en '+name);
  cursor=result.nextPageToken||'';
 }while(cursor);
 return docs;
}
async function readAll(){
 if(!authClient)throw Error('Sin conexión Google autorizada');
 const collections={};
 // Cualquier error se propaga. Nunca se interpreta un 403 como colección vacía.
 for(const name of COLLECTIONS)collections[name]=await requestCollection(name);
 return {project:PROJECT,collections,readAt:new Date().toISOString(),source:'Firestore UTET · exclusivamente nucleos y complexivos'};
}
async function writeAcademic({collection,id,record,precondition}={}){
 assertCollection(collection);documentId(id);validateRecord(collection,record);
 if(!precondition||typeof precondition!=='object'||!['create','update'].includes(precondition.mode))
  throw Error('Es obligatorio indicar precondición de escritura');
 const url=new URL(API+'/'+collection+'/'+id);
 if(precondition.mode==='create')url.searchParams.set('currentDocument.exists','false');
 else{
  if(typeof precondition.updateTime!=='string'||
    !/^\d{4}-\d{2}-\d{2}T/.test(precondition.updateTime))
   throw Error('Falta la versión Firestore que se va a actualizar');
  url.searchParams.set('currentDocument.updateTime',precondition.updateTime);
 }
 const fields=Object.fromEntries(Object.entries(record).filter(([,v])=>v!==undefined)
  .map(([k,v])=>[k,encode(v)]));
 return request(url.toString(),{method:'PATCH',body:{fields}});
}

/* Respaldo completo MANUAL. No comparte datos con nucleos ni complexivos.
 * El contenido se cifra antes de efectuar cualquier solicitud de red.
 */
const BACKUP_COLLECTION='informetit_backups';
function decoded(value){
 if(!value||typeof value!=='object')return null;
 if('stringValue' in value)return value.stringValue;
 if('integerValue' in value)return Number(value.integerValue);
 if('doubleValue' in value)return Number(value.doubleValue);
 if('booleanValue' in value)return !!value.booleanValue;
 if('nullValue' in value)return null;
 if('arrayValue' in value)return (value.arrayValue.values||[]).map(decoded);
 if('mapValue' in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([key,val])=>[key,decoded(val)]));
 return null;
}
function snapshotDocument(raw){
 return Object.fromEntries(Object.entries(raw?.fields||{}).map(([name,val])=>[name,decoded(val)]));
}
function safeBackupId(id){
 if(typeof id!=='string'||!/^bk_[A-Za-z0-9_]{10,65}$/.test(id))
  throw Error('Identificador de respaldo no válido');
 return id;
}
function backupURL(id){
 return API+'/'+BACKUP_COLLECTION+(id?'/'+encodeURIComponent(id):'');
}
async function putBackupDocument(id,record){
 const url=new URL(backupURL(id));
 url.searchParams.set('currentDocument.exists','false');
 const fields=Object.fromEntries(Object.entries(record).map(([key,val])=>[key,encode(val)]));
 return request(url.toString(),{method:'PATCH',body:{fields}});
}
async function uploadFullBackup({data,passphrase}={}){
 if(!authClient)throw Error('Conecta Firebase antes de subir el respaldo');
 const {manifest,chunks}=await backupCodec.seal(data,passphrase);
 // Solo se escribe un manifiesto completo cuando todos los fragmentos existen.
 // Un fallo previo no hace visible un respaldo parcialmente cargado.
 for(let i=0;i<chunks.length;i++){
  const id=manifest.backupId+'__part_'+String(i).padStart(3,'0');
  await putBackupDocument(id,{type:'chunk',backupId:manifest.backupId,index:i,data:chunks[i]});
 }
 await putBackupDocument(manifest.backupId,manifest);
 return {id:manifest.backupId,createdAt:manifest.createdAt,students:manifest.students,
  grades:manifest.grades,parts:manifest.parts,periodo:manifest.periodo,confirmed:true};
}
async function listFullBackups(){
 if(!authClient)throw Error('Conecta Firebase para consultar los respaldos');
 const backups=[];let token='',read=0;
 do{
  const url=new URL(backupURL(''));url.searchParams.set('pageSize','500');
  if(token)url.searchParams.set('pageToken',token);
  const batch=await request(url.toString(),{missingIsEmpty:true});
  for(const entry of batch.documents||[]){
   const row=snapshotDocument(entry);
   if(row.type==='manifest'&&row.format===1&&row.status==='complete'){
    const id=entry.name?.split('/').pop()||row.backupId;
    if(id===row.backupId&&/^bk_[A-Za-z0-9_]{10,65}$/.test(id))
     backups.push({id,createdAt:row.createdAt,periodo:row.periodo,
      students:row.students,grades:row.grades,parts:row.parts});
   }
  }
  read+=(batch.documents||[]).length;
  if(read>5000)throw Error('Demasiados documentos de respaldo: solicita mantenimiento');
  token=batch.nextPageToken||'';
 }while(token);
 return backups.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,100);
}
async function downloadFullBackup({id,passphrase}={}){
 if(!authClient)throw Error('Conecta Firebase antes de recuperar');
 const backupId=safeBackupId(id);
 const raw=await request(backupURL(backupId));
 const manifest=snapshotDocument(raw);
 if(manifest.backupId!==backupId||manifest.type!=='manifest'||manifest.status!=='complete')
  throw Error('El documento seleccionado no es un respaldo completo');
 if(!Number.isInteger(manifest.parts)||manifest.parts<1||manifest.parts>100)
  throw Error('Número de fragmentos inválido');
 const chunks=[];
 for(let i=0;i<manifest.parts;i++){
  const part=await request(backupURL(backupId+'__part_'+String(i).padStart(3,'0')));
  const record=snapshotDocument(part);
  if(record.type!=='chunk'||record.backupId!==backupId||record.index!==i||
   typeof record.data!=='string'||record.data.length>backupCodec.CHUNK)
   throw Error('Fragmento incompleto o no correspondiente al respaldo');
  chunks.push(record.data);
 }
 const data=await backupCodec.unseal(manifest,chunks,passphrase);
 return {data,metadata:{id:backupId,createdAt:manifest.createdAt,periodo:manifest.periodo,
  students:manifest.students,grades:manifest.grades}};
}

function status(){return {connected:!!authClient,project:PROJECT,authMethod,readOnly:false,collections:[...COLLECTIONS]}}
module.exports={PROJECT,PERIOD,COLLECTIONS,connect,readAll,status,writeAcademic,assertCollection,validateRecord,documentId,encode,
 uploadFullBackup,listFullBackups,downloadFullBackup};
