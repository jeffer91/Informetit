/* Informetit · Clasificación auditable por mecanismo. No elimina notas ni actas. */
(function(root){
'use strict';
const M=()=>root.InformetitDataModel;
const STATES=['sin_definir','complexivo','trabajo'];
const id=x=>String(x??'').trim();
const format=x=>STATES.includes(x)?x:'sin_definir';
const rosterSignature=state=>JSON.stringify((state.estudiantes||[]).map(s=>[id(s.id),s.tipoTitulacion,s.carrera,s.modalidad]));
function evidence(state,studentId){
 const sid=id(studentId),match=x=>id(x.studentId)===sid;
 return {notas:(state.notas||[]).filter(match).length,
  provisionales:(state.notasBorrador||[]).filter(match).length,
  cursos:(state.cursosNucleos||[]).filter(match).length,
  examenes:(state.evaluaciones||[]).filter(match).length,
  proyectos:(state.trabajos||[]).filter(match).length};
}
function planOne(state,studentId,nextType){
 if(!STATES.includes(nextType))throw Error('Mecanismo inválido');
 const st=(state.estudiantes||[]).find(s=>id(s.id)===id(studentId));
 if(!st)throw Error('Estudiante no encontrado');
 return planBatch(state,[{id:st.id,career:st.carrera,mode:st.modalidad}],nextType,'Cambio individual');
}
function planBatch(state,rows,nextType,source='Listado de mecanismo'){
 if(!STATES.includes(nextType))throw Error('Mecanismo inválido');
 if(!Array.isArray(rows)||!rows.length)throw Error('Listado sin estudiantes');
 const roster=new Map((state.estudiantes||[]).map(s=>[id(s.id),s]));
 if(roster.size!==(state.estudiantes||[]).length)throw Error('La nómina contiene identificaciones duplicadas');
 const counts=new Map();
 for(const row of rows){let sid=id(row.id??row.cedula??row.numeroIdentificacion).replace(/\.0$/,'');if(/^\d{9}$/.test(sid))sid='0'+sid;counts.set(sid,(counts.get(sid)||0)+1)}
 const seen=new Set(),changes=[],rejected=[],unchanged=[];
 for(const row of rows){
  let sid=id(row.id??row.cedula??row.numeroIdentificacion).replace(/\.0$/,'');
  if(/^\d{9}$/.test(sid))sid='0'+sid;
  if(!/^\d{10}$/.test(sid)){rejected.push({id:sid,reason:'Cédula inválida'});continue}
  if((counts.get(sid)||0)>1){rejected.push({id:sid,reason:'Cédula duplicada en la carga; todas sus filas quedan bloqueadas'});continue}
  if(seen.has(sid)){rejected.push({id:sid,reason:'Cédula duplicada en la carga'});continue}
  seen.add(sid);
  const st=roster.get(sid);
  if(!st){rejected.push({id:sid,reason:'No figura en la nómina'});continue}
  if(row.career&&M().career(st.carrera)!==M().career(row.career)){
   rejected.push({id:sid,reason:'Carrera diferente'});continue;
  }
  if(row.mode&&st.modalidad!==row.mode){
   rejected.push({id:sid,reason:'Modalidad diferente'});continue;
  }
  const from=format(st.tipoTitulacion);
  if(from===nextType){unchanged.push(sid);continue}
  changes.push({id:sid,name:st.nombre,career:st.carrera,mode:st.modalidad,from,to:nextType,
   evidence:evidence(state,sid)});
 }
 return {baseline:rosterSignature(state),source:String(source||'Cambio de mecanismo'),
  target:nextType,changes,rejected,unchanged,rows:rows.length};
}
function apply(state,plan,stamp){
 if(!plan||plan.baseline!==rosterSignature(state))throw Error('La nómina cambió: vuelve a analizar el cambio');
 if(!STATES.includes(plan.target))throw Error('Mecanismo inválido');
 const next=M().migrate(state),index=new Map(next.estudiantes.map(s=>[id(s.id),s]));
 const changes=[];
 for(const change of plan.changes){
  const st=index.get(change.id);
  if(!st||format(st.tipoTitulacion)!==change.from)throw Error('Clasificación anterior distinta: vuelve a revisar');
  st.tipoTitulacion=change.to;
  changes.push({studentId:st.id,anterior:change.from,nuevo:change.to,
   carrera:st.carrera,modalidad:st.modalidad,evidenciaConservada:change.evidence});
 }
 if(changes.length){
  next.auditoria.push({tipo:'cambio_mecanismo',fecha:stamp,fuente:plan.source,
   cambios:changes,excluidos:plan.rejected.map(x=>({...x}))});
  next.importaciones.push({tipo:'clasificacion_mecanismo',nombre:plan.source,
   fecha:stamp,filas:plan.rows,actualizados:changes.length,bloqueados:plan.rejected.length});
 }
 return {next,stats:{changed:changes.length,blocked:plan.rejected.length,unchanged:plan.unchanged.length}};
}
const api=Object.freeze({planOne,planBatch,apply,evidence});
root.InformetitMechanism=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
