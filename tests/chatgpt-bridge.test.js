'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const Bridge=require('../data/chatgpt-bridge.js');

test('la copia GPT refleja cada guardado y puede desvincularse sin eliminar datos',async()=>{
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'informetit-bridge-test-'));
 try{
  const profile=path.join(temp,'profile'),cloud=path.join(temp,'cloud');
  await fs.mkdir(profile);await fs.mkdir(cloud);
  assert.equal((await Bridge.status(profile)).enabled,false);
  await Bridge.setFolder(profile,cloud,path.join(temp,'app'));
  const data={estudiantes:[{id:'1712345678'}],notas:[{studentId:'1712345678',nucleo:1,nota:7}]};
  let result=await Bridge.mirror(profile,data);
  assert.equal(result.ok,true);
  const first=JSON.parse(await fs.readFile(path.join(cloud,Bridge.SNAPSHOT),'utf8'));
  assert.deepEqual(first.data,data);
  assert.match(await fs.readFile(path.join(cloud,Bridge.CODE),'utf8'),/module.exports/);
  data.notas[0].nota=9;
  await Bridge.mirror(profile,data);
  const second=JSON.parse(await fs.readFile(path.join(cloud,Bridge.SNAPSHOT),'utf8'));
  assert.equal(second.data.notas[0].nota,9);
  await Bridge.stop(profile);
  assert.equal((await Bridge.status(profile)).enabled,false);
  assert.equal((await Bridge.mirror(profile,data)).enabled,false);
  assert.equal(JSON.parse(await fs.readFile(path.join(cloud,Bridge.SNAPSHOT),'utf8')).data.notas[0].nota,9);
 }finally{await fs.rm(temp,{recursive:true,force:true})}
});
