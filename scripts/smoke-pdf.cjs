'use strict';
/* Informetit: prueba de impresión nativa Electron/Chromium.
   Usa únicamente registros sintéticos en memoria; no lee ni escribe datos privados. */
const {app,BrowserWindow}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const os=require('node:os');
const isolatedProfile=fs.mkdtempSync(path.join(os.tmpdir(),'informetit-pdf-smoke-'));
app.setPath('userData',isolatedProfile);
app.on('quit',()=>{try{fs.rmSync(isolatedProfile,{recursive:true,force:true})}catch(error){
 console.warn('[Informetit PDF smoke] No se pudo limpiar perfil temporal:',error.message);
}});

// Solo en la prueba sintética de CI se permite no-sandbox: Linux runners no ofrecen SUID helper.
if(process.platform==='linux'&&(process.env.CI||process.getuid?.()===0))app.commandLine.appendSwitch('no-sandbox');
const label='[Informetit PDF smoke]';
async function makeInput(win,mode){
 const expression="(()=>{"+
  "const D=window.InformetitDataModel,R=window.InformetitFullReport,H=window.InformetitDocument;"+
  "if(!D||!R||!H||!window.InformetitQuality)throw Error('No se cargaron motores del informe');"+
  "const s=D.empty(),m="+JSON.stringify(mode)+";"+
  "s.estudiantes.push({id:'0000000101',nombre:'PERSONA FICTICIA PDF',carrera:'Enfermería',modalidad:m,"+
  "tipoTitulacion:'complexivo',requisitos:{Academico:'CUMPLE'}});"+
  "return {html:R.makeReport(s,m),header:H.printHeader(s,m)};"+
  "})()";
 const data=await win.webContents.executeJavaScript(expression,true);
 if(!data?.html?.startsWith('<!doctype html>'))throw Error('Documento HTML inválido');
 return data;
}
async function render(window,html,header){
 await window.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
 await window.webContents.executeJavaScript(
  'Promise.all([document.fonts.ready,...Array.from(document.images).map(x=>x.decode().catch(()=>null))]).then(()=>true)');
 const buffer=Buffer.from(await window.webContents.printToPDF({
  printBackground:true,preferCSSPageSize:true,pageSize:'A4',
  displayHeaderFooter:true,headerTemplate:header,footerTemplate:'<span></span>',
  generateDocumentOutline:true
 }));
 if(buffer.subarray(0,5).toString('ascii')!=='%PDF-')throw Error('Firma PDF inválida');
 return buffer;
}
async function inspect(data){
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const task=pdfjs.getDocument({data:new Uint8Array(data),useSystemFonts:true,disableFontFace:true});
 const document=await task.promise;const locations={};let contents='';
 try{
  for(let pageNumber=1;pageNumber<=document.numPages;pageNumber++){
   const page=await document.getPage(pageNumber);
   const items=(await page.getTextContent()).items;
   const joined=items.map(x=>x.str||'').join('');
   contents+=' '+joined;
   for(const m of joined.matchAll(/\[\[INF:([a-z0-9-]+)\]\]/g))locations[m[1]]=pageNumber;
   page.cleanup();
  }
  return {pageCount:document.numPages,markers:Object.keys(locations).length,locations,contents};
 }finally{await document.destroy()}
}
async function run(){
 let sourceWindow=null,outputWindow=null;
 try{
  sourceWindow=new BrowserWindow({show:false,webPreferences:{
   nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true
  }});
  await sourceWindow.loadFile(path.join(__dirname,'..','index.html'));
  outputWindow=new BrowserWindow({show:false,webPreferences:{
   nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true
  }});
  for(const mode of ['presencial','online']){
   const input=await makeInput(sourceWindow,mode);
   let pdf=await render(outputWindow,input.html,input.header),result=await inspect(pdf);
   if(result.pageCount<5)throw Error(mode+': páginas insuficientes: '+result.pageCount);
   if(result.markers===0)throw Error(mode+': marcadores de índice ausentes en PDF');
   if(!result.contents.toLowerCase().includes('resumen ejecutivo')||
      !result.contents.toLowerCase().includes('examen complexivo'))
    throw Error(mode+': no se detectó el texto académico esperado');
   let indexed=false;
   for(let round=0;round<6;round++){
    const filled=input.html.replace(
     /(<span class="inf-index-page" data-page=")([^"]+)(">)(?:—|\d+)(<\/span>)/g,
     (whole,a,id,b,c)=>a+id+b+
      (Number.isInteger(result.locations[id])?result.locations[id]:'—')+c);
    const repaginated=await render(outputWindow,filled,input.header);
    const next=await inspect(repaginated);
    if(JSON.stringify(result.locations)===JSON.stringify(next.locations)){
     pdf=repaginated;result=next;indexed=true;break;
    }
    pdf=repaginated;result=next;
   }
   if(!indexed)throw Error(mode+': índice no estabilizó la paginación');
   const expected=(input.html.match(/class="inf-page-marker"/g)||[]).length;
   if(result.markers<expected)throw Error(mode+': solo '+result.markers+' de '+expected+' marcadores imprimibles');
   console.info(label,mode,'páginas',result.pageCount,'marcadores',result.markers,'bytes',pdf.length,'índice verificado');
  }
  console.info(label,'OK: impresión de ambas modalidades con datos ficticios');
 }finally{
  if(outputWindow&&!outputWindow.isDestroyed())outputWindow.destroy();
  if(sourceWindow&&!sourceWindow.isDestroyed())sourceWindow.destroy();
 }
}
app.whenReady().then(run).then(()=>app.quit()).catch(error=>{
 console.error(label,error?.stack||error);
 process.exitCode=1;app.quit();
});
app.on('window-all-closed',()=>{});
