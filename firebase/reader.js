/* Firebase UTET · Cliente de solo lectura en el proceso principal de Electron.
   Credenciales de Google exclusivamente en el proceso principal; jamás en el renderer.
   No hay métodos POST, PATCH, DELETE o escritura a Firestore. */
'use strict';
const fs=require('node:fs/promises');
const PROJECT='utet-4387a';
const COLLECTIONS=['Estudiante','matriculas','requisitos','periodos','nucleos','cronogramas'];
let authClient=null,authMethod='';
async function connect({method='adc',selectFile}={}){
 const {GoogleAuth}=require('google-auth-library');
 const scopes=['https://www.googleapis.com/auth/datastore'];
 let options={projectId:PROJECT,scopes};
 if(method==='service_account'){
  if(typeof selectFile!=='function')throw Error('No se ha configurado el selector local de credenciales.');
  const path=await selectFile();
  if(!path)return {canceled:true};
  const credential=JSON.parse(await fs.readFile(path,'utf8'));
  if(credential.type!=='service_account'||credential.project_id!==PROJECT||!credential.private_key)
   throw Error('El JSON no corresponde a una cuenta de servicio autorizada del proyecto UTET.');
  options={...options,keyFile:path};
 }else if(method!=='adc')throw Error('Tipo de autenticación no permitido.');
 const auth=new GoogleAuth(options);
 const client=await auth.getClient();
 const token=await client.getAccessToken();
 if(!token?.token)throw Error('Google no devolvió un token de acceso. Configura credenciales autorizadas.');
 authClient=client;authMethod=method;
 return {connected:true,project:PROJECT,authMethod:method,readOnly:true};
}
async function requestCollection(name){
 if(!authClient)throw Error('Primero conecta una identidad autorizada de Google.');
 if(!COLLECTIONS.includes(name))throw Error('Colección no autorizada para consulta.');
 const result=[];let pageToken='';
 do{
  const token=await authClient.getAccessToken();
  if(!token?.token)throw Error('Sesión caducada; vuelve a conectar.');
  const url=new URL('https://firestore.googleapis.com/v1/projects/'+PROJECT+'/databases/(default)/documents/'+encodeURIComponent(name));
  url.searchParams.set('pageSize','500');
  if(pageToken)url.searchParams.set('pageToken',pageToken);
  const response=await fetch(url,{method:'GET',headers:{Authorization:'Bearer '+token.token,Accept:'application/json'},
    signal:AbortSignal.timeout(30000)});
  if(response.status===404)return [];
  if(!response.ok){
   const message=response.status===403?'La identidad no tiene permiso para leer '+name+'. Revisa el rol de visor de Firestore.':
    'Firebase devolvió HTTP '+response.status+' al consultar '+name+'.';
   throw Error(message);
  }
  const page=await response.json();
  if(!Array.isArray(page.documents))page.documents=[];
  result.push(...page.documents);
  if(result.length>20000)throw Error('Se alcanzó el límite de seguridad de documentos en '+name+'.');
  pageToken=page.nextPageToken||'';
 }while(pageToken);
 return result;
}
async function readAll(){
 if(!authClient)throw Error('Sin conexión autorizada de Google');
 const collections={},errors=[];
 for(const name of COLLECTIONS){
  try{collections[name]=await requestCollection(name)}
  catch(error){
   if(['Estudiante','matriculas','requisitos'].includes(name))throw error;
   collections[name]=[];errors.push(name+': '+error.message);
  }
 }
 return {source:'Firestore UTET · consulta autorizada de solo lectura',
   project:PROJECT,collections,errors,readAt:new Date().toISOString()};
}
function status(){return {connected:!!authClient,authMethod,project:PROJECT,readOnly:true}}
module.exports={connect,readAll,status,COLLECTIONS};
