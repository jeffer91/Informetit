'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;
const M=require('../data/model.js'),Importer=require('../data/student-import.js');
require('../analysis/complexivo.js');
const Firebase=require('../firebase/sync.js');
const row=(id,mode='presencial')=>({
 id,nombre:'ESTUDIANTE '+id,carrera:'Administración',codigo:mode==='online'?'ADM-L-01':'ADM-P-01',
 modalidad:mode,horario:'Matutino',sede:'Matriz',
 correo:'correo@example.edu.ec',correoPersonal:'personal@example.com',telefono:'0999999999',
 aprobacionTitulacion:'CUMPLE',aprobacionComplexivoProyecto:'CUMPLE',
 requisitos:Object.fromEntries(M.REQUIREMENTS.map(x=>[x,'CUMPLE'])),
 tipoTitulacion:'sin_definir'
});
test('363 estudiantes nuevos conservan mecanismos por definir y no se duplican',()=>{
 const s=M.empty();
 const rows=Array.from({length:363},(_,i)=>row(String(i+1).padStart(10,'0'),i>=262?'online':'presencial'));
 const p=Importer.plan(s,rows,'reporte.xls');
 assert.equal(p.counts.added,363);
 const {next}=Importer.apply(s,p,'2026-10-29');
 assert.equal(next.estudiantes.length,363);
 assert.equal(next.estudiantes.filter(x=>x.modalidad==='presencial').length,262);
 assert.equal(next.estudiantes.filter(x=>x.modalidad==='online').length,101);
 assert.ok(next.estudiantes.every(x=>x.tipoTitulacion==='sin_definir'));
 assert.equal(Importer.plan(next,rows,'reporte.xls').updates.length,0);
 assert.equal(s.estudiantes.length,0);
});
test('Excel idéntico deja 0 actualizaciones, sin guardar auditoría nueva',()=>{
 const s=M.empty();s.estudiantes=[row('0000000001')];
 const p=Importer.plan(s,[row('0000000001')],'reporte.xls');
 assert.equal(p.counts.updated,0);assert.equal(p.counts.added,0);assert.equal(p.counts.unchanged,1);
 const result=Importer.apply(s,p,'2026-10-29');
 assert.equal(result.unchanged,true);assert.equal(result.next,s);
 assert.equal(s.importaciones.length,0);
});
test('preserva mecanismos complejo, trabajo y sin definir al actualizar requisitos',()=>{
 const s=M.empty();
 s.estudiantes=[row('0000000001'),row('0000000002'),row('0000000003')];
 s.estudiantes[0].tipoTitulacion='complexivo';
 s.estudiantes[1].tipoTitulacion='trabajo';
 const rows=s.estudiantes.map(st=>({...row(st.id),requisitos:{...st.requisitos,Financiero:'NO CUMPLE'}}));
 const p=Importer.plan(s,rows,'reporte.xls'),result=Importer.apply(s,p,'2026-10-29').next;
 assert.deepEqual(result.estudiantes.map(x=>x.tipoTitulacion),['complexivo','trabajo','sin_definir']);
 assert.ok(result.estudiantes.every(x=>x.requisitos.Financiero==='NO CUMPLE'));
});
test('preserva calificaciones, actas, observaciones, rúbricas y metadatos de sincronización',()=>{
 const s=M.empty();s.estudiantes=[{...row('0000000001'),observaciones:'Seguimiento firmado',tipoTitulacion:'complexivo'}];
 s.notas=[{studentId:'0000000001',nucleo:1,nota:8,verificado:true}];
 s.evaluaciones=[{studentId:'0000000001',actaOrdinario:'ACTA-55'}];
 s.trabajos=[{studentId:'0000000001',acta:'T-20'}];
 s.firebaseSync.enabled=true;s.firebaseSync.baseline={'academic':{signature:'old'}};
 const incoming={...row('0000000001'),correo:'nuevo@example.edu.ec'};
 const next=Importer.apply(s,Importer.plan(s,[incoming],'reporte.xls'),'2026-10-29').next;
 assert.equal(next.estudiantes[0].tipoTitulacion,'complexivo');
 assert.equal(next.estudiantes[0].observaciones,'Seguimiento firmado');
 assert.equal(next.estudiantes[0].correo,'nuevo@example.edu.ec');
 assert.deepEqual(next.notas,s.notas);assert.deepEqual(next.evaluaciones,s.evaluaciones);
 assert.deepEqual(next.trabajos,s.trabajos);
 assert.deepEqual(next.firebaseSync.baseline,s.firebaseSync.baseline);
 assert.equal(Firebase.pending(next).length,Firebase.pending(s).length);
 assert.ok(next.auditoria.some(x=>x.tipo==='importacion_estudiantes_requisitos'));
});
test('celdas en blanco no borran requisitos ni contactos registrados',()=>{
 const s=M.empty();s.estudiantes=[row('0000000001')];
 const incoming={...row('0000000001'),correo:'',telefono:'',requisitos:{...row('0000000001').requisitos,Financiero:''}};
 const p=Importer.plan(s,[incoming],'reporte.xls');
 assert.equal(p.updates.length,0);
});
test('identidad, carrera, código o modalidad en conflicto se bloquean sin tocar expediente',()=>{
 const s=M.empty();s.estudiantes=[row('0000000001')];
 const incoming={...row('0000000001'),carrera:'Contabilidad',codigo:'CONT-L-01',modalidad:'online'};
 const p=Importer.plan(s,[incoming],'reporte.xls');
 assert.equal(p.counts.blocked,1);
 assert.equal(p.conflicts.length,3);
 assert.equal(p.updates.length,0);
});
test('el reporte no elimina estudiantes que faltan en su nómina',()=>{
 const s=M.empty();s.estudiantes=[row('0000000001'),row('0000000002')];
 const p=Importer.plan(s,[row('0000000001')],'reporte.xls');
 assert.equal(p.counts.missing,1);
 assert.equal(Importer.apply(s,p,'2026-10-29').next.estudiantes.length,2);
});
test('rechaza cédulas duplicadas, vacías e inconsistencias de identidad antes de modificar',()=>{
 const s=M.empty();
 assert.throws(()=>Importer.plan(s,[row('0000000001'),row('0000000001')],'reporte.xls'),/duplicada/);
 assert.throws(()=>Importer.plan(s,[row('01')],'reporte.xls'),/inválida/);
 assert.throws(()=>Importer.plan(s,[{...row('0000000001'),nombre:''}],'reporte.xls'),/sin nombre/);
});
test('una vista previa caducada no puede sobrescribir cambios posteriores',()=>{
 const s=M.empty();s.estudiantes=[row('0000000001')];
 const p=Importer.plan(s,[{...row('0000000001'),correo:'nuevo@example.edu.ec'}],'r.xls');
 s.estudiantes[0].correo='cambiado@example.edu.ec';
 assert.throws(()=>Importer.apply(s,p,'2026-10-29'),/vuelve a analizar/);
});
