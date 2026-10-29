/* Importación de la nómina de requisitos de Informetit.
 * Nunca infiere el mecanismo de titulación ni modifica notas, rúbricas o Firebase.
 */
(function(root){
'use strict';
const M=()=>root.InformetitDataModel;
const T=x=>String(x??'').trim();
const FIELDS=['nombre','horario','sede','correo','correoPersonal','telefono','aprobacionTitulacion','aprobacionComplexivoProyecto'];
function plan(state,rows,filename){
 const m=M();
 if(!Array.isArray(rows)||!rows.length)throw Error('El Excel no contiene estudiantes');
 const index=new Map((state.estudiantes||[]).map(x=>[T(x.id),x]));
 if(index.size!==(state.estudiantes||[]).length)throw Error('Hay cédulas duplicadas en la base local');
 const seen=new Set(),changes=[],conflicts=[],updates=[];
 let matched=0,added=0,updated=0,unchanged=0,blocked=0,filled=0,revised=0;
 for(const raw of rows){
  const row=m.normalizeStudent(raw),id=T(row.id);
  if(!/^\d{10}$/.test(id))throw Error('Identificación inválida en el Excel: '+id);
  if(seen.has(id))throw Error('Identificación duplicada en el Excel: '+id);
  seen.add(id);
  if(!row.nombre||!row.carrera)throw Error('Estudiante sin nombre o carrera: '+id);
  const old=index.get(id);
  if(!old){
   const newStudent=m.normalizeStudent({...row,tipoTitulacion:'sin_definir'});
   updates.push({id,student:newStudent});
   changes.push({id,name:row.nombre,field:'Nuevo estudiante',before:'—',after:row.carrera,kind:'new'});
   added++;continue;
  }
  matched++;
  const conflictsForStudent=[];
  if(m.career(old.carrera)!==m.career(row.carrera))
   conflictsForStudent.push({field:'Carrera',before:old.carrera,after:row.carrera});
  if(old.modalidad!==row.modalidad)
   conflictsForStudent.push({field:'Modalidad',before:old.modalidad,after:row.modalidad});
  if(T(old.codigo)&&T(row.codigo)&&m.key(old.codigo)!==m.key(row.codigo))
   conflictsForStudent.push({field:'Código de carrera',before:old.codigo,after:row.codigo});
  if(conflictsForStudent.length){
   blocked++;
   conflicts.push(...conflictsForStudent.map(x=>({id,name:old.nombre,...x})));
   continue;
  }
  const next={...old,requisitos:{...(old.requisitos||{})}},diff=[];
  for(const field of FIELDS){
   const incoming=T(row[field]),before=T(old[field]);
   if(!incoming||m.key(incoming)===m.key(before))continue;
   next[field]=incoming;
   diff.push({id,name:old.nombre,field,before:before||'—',after:incoming,kind:before?'change':'fill'});
  }
  for(const requirement of m.REQUIREMENTS){
   const incoming=T(row.requisitos?.[requirement]),before=T(old.requisitos?.[requirement]);
   if(!incoming||m.key(incoming)===m.key(before))continue;
   next.requisitos[requirement]=incoming;
   diff.push({id,name:old.nombre,field:'Requisito: '+requirement,
    before:before||'—',after:incoming,kind:before?'change':'fill'});
  }
  if(diff.length){
   // old.tipoTitulacion y campos no declarados nunca se sustituyen.
   updates.push({id,student:next});changes.push(...diff);
   filled+=diff.filter(x=>x.kind==='fill').length;
   revised+=diff.filter(x=>x.kind==='change').length;
   updated++;
  }else unchanged++;
 }
 return {filename:T(filename),rows:rows.length,updates,changes,conflicts,
  counts:{rows:rows.length,matched,added,updated,unchanged,blocked,
   missing:(state.estudiantes||[]).filter(x=>!seen.has(T(x.id))).length,
   filled,revised},baseline:JSON.stringify(state.estudiantes||[])};
}
function apply(state,p,when){
 if(!p||!Array.isArray(p.updates)||p.baseline!==JSON.stringify(state.estudiantes||[]))
  throw Error('La nómina cambió: vuelve a analizar el Excel');
 if(!p.updates.length)return {next:state,unchanged:true,stats:p.counts};
 const m=M(),index=new Map((state.estudiantes||[]).map(x=>[T(x.id),x]));
 for(const u of p.updates)index.set(u.id,u.student);
 const date=T(when)||new Date().toISOString().slice(0,10);
 const next=m.migrate({...state,estudiantes:[...index.values()]});
 next.importaciones.push({nombre:p.filename,tipo:'estudiantes_requisitos',fecha:date,filas:p.rows,
  nuevos:p.counts.added,actualizados:p.counts.updated,bloqueados:p.counts.blocked});
 next.auditoria.push({tipo:'importacion_estudiantes_requisitos',fecha:date,fuente:p.filename,
  cambios:p.changes.map(x=>({id:x.id,campo:x.field,anterior:x.before,nuevo:x.after})),
  conflictos:p.conflicts.map(x=>({...x}))});
 return {next,unchanged:false,stats:p.counts};
}
const api=Object.freeze({plan,apply});
root.InformetitStudentImport=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
