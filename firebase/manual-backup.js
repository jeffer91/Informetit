'use strict';
/* Backups privados completos: se comprimen y cifran antes de salir del equipo. */
const crypto=require('node:crypto');
const zlib=require('node:zlib');
const {promisify}=require('node:util');
const derive=promisify(crypto.pbkdf2);
const LIMIT=20*1024*1024;
const CHUNK=480000;
const ITERATIONS=310000;

function checkPayload(data){
 if(!data||typeof data!=='object'||!Array.isArray(data.estudiantes)||!Array.isArray(data.notas))
  throw Error('La base local no tiene el formato requerido');
 const json=Buffer.from(JSON.stringify(data),'utf8');
 if(json.length>LIMIT)throw Error('La base supera el límite de respaldo de 20 MB');
 return json;
}
async function seal(data,passphrase){
 if(typeof passphrase!=='string'||passphrase.length<12)
  throw Error('La clave de respaldo debe tener al menos 12 caracteres');
 const json=checkPayload(data),salt=crypto.randomBytes(16),iv=crypto.randomBytes(12);
 const key=await derive(passphrase,salt,ITERATIONS,32,'sha256');
 const cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
 const zipped=zlib.gzipSync(json);
 const encrypted=Buffer.concat([cipher.update(zipped),cipher.final()]);
 const encoded=encrypted.toString('base64'),chunks=encoded.match(new RegExp('.{1,'+CHUNK+'}','g'))||[];
 if(!chunks.length||chunks.length>100)throw Error('Cantidad de fragmentos fuera de límite');
 const stamp=new Date().toISOString();
 const id='bk_'+stamp.replace(/[-:.]/g,'').replace('Z','Z')+'_'+crypto.randomBytes(5).toString('hex');
 const manifest={
  type:'manifest',format:1,backupId:id,status:'complete',createdAt:stamp,periodo:String(data.periodo||''),
  students:data.estudiantes.length,grades:data.notas.length,parts:chunks.length,
  bytes:encrypted.length,cipherSha256:crypto.createHash('sha256').update(encrypted).digest('hex'),
  salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),
  iterationCount:ITERATIONS
 };
 return {manifest,chunks};
}
async function unseal(manifest,chunks,passphrase){
 if(!manifest||manifest.type!=='manifest'||manifest.format!==1||manifest.status!=='complete'||
  !Number.isInteger(manifest.parts)||manifest.parts<1||manifest.parts>100||
  !Array.isArray(chunks)||chunks.length!==manifest.parts)
  throw Error('El respaldo está incompleto o no es compatible');
 if(typeof passphrase!=='string'||passphrase.length<12)
  throw Error('Introduce la clave de respaldo');
 const encoded=chunks.join('');
 if(encoded.length>100*CHUNK)throw Error('El respaldo supera el tamaño permitido');
 const encrypted=Buffer.from(encoded,'base64');
 if(encrypted.length!==manifest.bytes||
  crypto.createHash('sha256').update(encrypted).digest('hex')!==manifest.cipherSha256)
  throw Error('El respaldo está incompleto o se modificó');
 const salt=Buffer.from(manifest.salt||'','base64');
 const iv=Buffer.from(manifest.iv||'','base64');
 const tag=Buffer.from(manifest.tag||'','base64');
 if(salt.length!==16||iv.length!==12||tag.length!==16||manifest.iterationCount!==ITERATIONS)
  throw Error('Parámetros criptográficos incorrectos');
 const key=await derive(passphrase,salt,ITERATIONS,32,'sha256');
 try{
  const decipher=crypto.createDecipheriv('aes-256-gcm',key,iv);
  decipher.setAuthTag(tag);
  const zipped=Buffer.concat([decipher.update(encrypted),decipher.final()]);
  const json=zlib.gunzipSync(zipped,{maxOutputLength:LIMIT});
  const data=JSON.parse(json.toString('utf8'));
  checkPayload(data);
  return data;
 }catch(e){throw Error('Clave incorrecta o contenido de respaldo dañado')}
}
module.exports={seal,unseal,checkPayload,LIMIT,CHUNK};
