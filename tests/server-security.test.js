'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {server,isPublicAsset}=require('../server.js');
test('lista blanca excluye datos privados y generador histórico',()=>{
 for(const path of ['package.json','.env','.git/config','private/base-gpt.cjs',
  'base-gpt.cjs','base-gpt-autosave.json','data/base-gpt.cjs',
  'scripts/preparar-bibliotecas.js','report_pdf.js','README.md',
  'node_modules/electron/index.js','vendor/vfs_fonts.js.map'])
  assert.equal(isPublicAsset(path),false,path);
 for(const path of ['index.html','styles.css','app.js','analysis/nuclei.js',
  'moodle/intelligent.js','document/institutional.js','vendor/xlsx.full.min.js'])
  assert.equal(isPublicAsset(path),true,path);
});
test('servidor HTTP de diagnóstico bloquea credenciales y respaldos',async()=>{
 await new Promise((resolve,reject)=>server.listen(0,'127.0.0.1',err=>err?reject(err):resolve()));
 const port=server.address().port;
 const get=url=>new Promise((resolve,reject)=>{
  http.get({hostname:'127.0.0.1',port,path:url},res=>{
   let body='';res.setEncoding('utf8');res.on('data',v=>body+=v);
   res.on('end',()=>resolve({status:res.statusCode,body}));
  }).on('error',reject);
 });
 try{
  for(const path of ['/package.json','/.env','/.git/config','/base-gpt.cjs',
   '/private/base-gpt.json','/data/base-gpt.cjs','/README.md','/report_pdf.js']){
   const res=await get(path);assert.equal(res.status,404,path);
  }
  for(const path of ['/index.html','/data/model.js','/analysis/table-commentary.js']){
   const res=await get(path);assert.equal(res.status,200,path);
  }
 }finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))}
});
