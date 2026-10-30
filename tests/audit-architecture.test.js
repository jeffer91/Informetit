'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('no existen rutas de generación PDF antiguas que compitan con el informe INF',()=>{
 const page=read('index.html'),app=read('app.js'),pkg=JSON.parse(read('package.json'));
 assert.doesNotMatch(page,/report_pdf\.js|vendor\/pdfmake|min\.js.*pdfmake|vfs_fonts/);
 assert.doesNotMatch(app,/InformetitPDF/);
 assert.equal(fs.existsSync(path.join(root,'report_pdf.js')),false);
 assert.equal('pdfmake' in pkg.dependencies,false);
 assert.match(page,/report_institucional\.js/);
 assert.match(page,/analysis\/table-commentary\.js/);
});
test('la exclusión de datos privados incluye copias previas y respaldos automáticos',()=>{
 const ignore=read('.gitignore');
 for(const fragment of ['base-gpt*.cjs','base-gpt*.json',
  '**/base-gpt*.cjs','**/base-gpt*.json','*.pem','*.p12','*.key'])
  assert.ok(ignore.includes(fragment),fragment);
});
test('bibliotecas instaladas corresponden al motor PDF actual',()=>{
 const installer=read('scripts/preparar-bibliotecas.js');
 assert.match(installer,/xlsx\/dist\/xlsx\.full\.min\.js/);
 assert.doesNotMatch(installer,/pdfmake|vfs_fonts/);
});
