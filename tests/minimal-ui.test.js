'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('navegación minimalista mantiene accesibles todas las pantallas',()=>{
 const html=read('index.html');
 const expected=['inicio','carga','estudiantes','nucleos','evaluaciones','trabajo',
  'informes','cronogramas','identidad','firebase','datos'];
 for(const item of expected)assert.match(html,new RegExp('data-page="'+item+'"'),item);
 assert.match(html,/id="nav-evaluaciones"/);
 assert.match(html,/id="nav-configuracion"/);
 assert.match(html,/analysis\/work-queue\.js/);
});
test('el inicio es una bandeja operativa y no una portada de estadísticas agregadas',()=>{
 const app=read('app.js');
 const first=app.slice(app.indexOf('function inicio(){'),app.indexOf('function estudiantes(){'));
 assert.match(first,/InformetitWorkQueue/);
 assert.match(first,/Subir listado de estudiantes/);
 assert.doesNotMatch(first,/Importar respaldo JSON/);
 assert.match(first,/taskRow/);
 assert.match(app,/data-queue-id/);
 assert.doesNotMatch(first,/statsPublic|publicStatsTable|nucleos_agregados|card\(/);
 assert.match(app,/taskButton\.dataset\.queueId/);
 assert.match(app,/smartNucleus=task.nucleus/);
 assert.match(app,/smartFilter=task.mode/);
});
test('carga inteligente conserva vista previa y simplifica opciones avanzadas',()=>{
 const app=read('app.js'),slice=app.slice(app.indexOf('function intelligentView(){'),app.indexOf('async function smartAction('));
 assert.match(slice,/Carga global de calificaciones/);
 assert.match(slice,/Formulario individual/);
 assert.match(app,/function manualView/);
 assert.match(app,/data-load-mode/);
 assert.match(slice,/smart-analyze/);
 assert.match(slice,/smart-apply/);
 assert.match(slice,/subtle-details/);
 assert.match(slice,/Ver cobertura detallada/);
 assert.match(slice,/Respaldos y exportaciones privadas/);
});
