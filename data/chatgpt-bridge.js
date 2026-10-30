'use strict';
/* Puente privado a una carpeta sincronizada elegida explícitamente por el usuario.
 * No publica datos en GitHub ni habilita acceso a este equipo desde Internet.
 */
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const MAX=20*1024*1024;
const CONFIG='chatgpt-bridge-settings.json';
const SNAPSHOT='informetit-chatgpt.json';
const CODE='base-gpt.cjs';
const inside=(folder,root)=>{
 const rel=path.relative(root,folder);
 return !rel||(!rel.startsWith('..')&&!path.isAbsolute(rel));
};
async function readSettings(userData){
 try{
  const data=JSON.parse(await fs.readFile(path.join(userData,CONFIG),'utf8'));
  return data&&typeof data.folder==='string'?data.folder:'';
 }catch(error){if(error.code==='ENOENT')return '';throw error}
}
async function writeAtomic(file,content){
 const temp=file+'.tmp-'+crypto.randomBytes(6).toString('hex');
 try{
  await fs.writeFile(temp,content,{encoding:'utf8',mode:0o600});
  await fs.rename(temp,file);
 }catch(e){await fs.rm(temp,{force:true}).catch(()=>{});throw e}
}
async function setFolder(userData,folder,applicationPath){
 if(typeof folder!=='string'||!path.isAbsolute(folder))throw Error('Selecciona una carpeta válida');
 const real=await fs.realpath(folder);
 if((await fs.stat(real)).isDirectory()!==true)throw Error('Selecciona una carpeta y no un archivo');
 if(applicationPath&&inside(real,await fs.realpath(applicationPath)))
  throw Error('No puedes usar la carpeta del proyecto GitHub para datos privados');
 if(inside(real,await fs.realpath(userData)))
  throw Error('Selecciona una carpeta sincronizada fuera del perfil interno de Informetit');
 // Nunca escribir datos nominales dentro de un repositorio Git, sea o no el de Informetit.
 let ancestor=real;
 while(true){
  try{
   await fs.stat(path.join(ancestor,'.git'));
   throw Error('No puedes usar una carpeta dentro de un repositorio Git para datos personales');
  }catch(e){if(e.code!=='ENOENT')throw e}
  const parent=path.dirname(ancestor);if(parent===ancestor)break;ancestor=parent;
 }

 await writeAtomic(path.join(userData,CONFIG),JSON.stringify({folder:real,configuredAt:new Date().toISOString()}));
 return real;
}
async function stop(userData){
 await fs.rm(path.join(userData,CONFIG),{force:true});
 return {enabled:false};
}
async function status(userData){
 const folder=await readSettings(userData);
 if(!folder)return {enabled:false,folder:'',exists:false};
 let exists=false;
 try{exists=(await fs.stat(folder)).isDirectory()}catch{}
 return {enabled:true,folder,exists};
}
async function mirror(userData,data){
 const folder=await readSettings(userData);
 if(!folder)return {enabled:false,ok:null};
 const raw=JSON.stringify(data);
 if(Buffer.byteLength(raw,'utf8')>MAX)throw Error('La base GPT supera 20 MB');
 const stat=await fs.stat(folder);
 if(!stat.isDirectory())throw Error('La carpeta vinculada dejó de estar disponible');
 const now=new Date().toISOString(),message={
  format:'informetit-chatgpt-v1',createdAt:now,source:'Informetit Desktop',
  info:'Copia privada actualizada automáticamente. Datos reales: no son simulaciones.',
  data
 };
 await writeAtomic(path.join(folder,SNAPSHOT),JSON.stringify(message));
 await writeAtomic(path.join(folder,CODE),
  '/* INFORMETIT BASE GPT PRIVADA. NO PUBLICAR EN GITHUB. */\nmodule.exports = '+raw+';\n');
 return {enabled:true,ok:true,folder,updatedAt:now};
}
module.exports={readSettings,setFolder,stop,status,mirror,SNAPSHOT,CODE};
