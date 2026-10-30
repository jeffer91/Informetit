/* Informetit · Formularios de carga: comparten expediente con Moodle sin crear notas falsas. */
(function(root){
'use strict';
const M=()=>root.InformetitDataModel;
const C=()=>root.InformetitNucleiCatalog;
const str=v=>String(v??'').trim();
const normalize=v=>M().key(v);
const noteKey=(sid,n)=>str(sid)+'|'+Number(n);
const verified=n=>n?.verificado===true&&!['PROVISIONAL','BORRADOR','SIMULADO','ESTIMADO','SIN VERIFICAR','PROVISIONAL POR CONCILIAR'].includes(normalize(n.status||n.estado));
function student(state,studentId){
 const arr=(state.estudiantes||[]).filter(s=>str(s.id)===str(studentId));
 if(arr.length!==1)throw Error(arr.length?'Identificación duplicada en el padrón.':'Selecciona un estudiante de la nómina.');
 return arr[0];
}
function nucleus(state,{studentId,nucleus,score,source,reviewed=false},stamp){
 const st=student(state,studentId),n=Number(nucleus),value=M().grade(score);
 if(st.tipoTitulacion!=='complexivo')throw Error('Clasifica primero al estudiante en Examen Complexivo.');
 const catalog=C().lookup(st.carrera,n);
 if(!catalog||!Number.isInteger(n)||n<1||n>4)throw Error('Núcleo no reconocido para la carrera.');
 if(!str(score)||!/^\d{1,2}(?:[.,]\d{1,2})?$/.test(str(score))||value===null)throw Error('Ingresa una nota real entre 0 y 10, máximo dos decimales.');
 if(!str(source))throw Error('Indica la fuente o referencia de la nota.');
 const next=M().migrate(state),k=noteKey(st.id,n),
  matches=list=>(next[list]||[]).filter(x=>noteKey(x.studentId,x.nucleo)===k);
 const official=matches('notas'),drafts=matches('notasBorrador'),courses=matches('cursosNucleos');
 const previous=[...official,...drafts,...courses];
 if(official.length>1||drafts.length>1||courses.some(x=>M().grade(x.nota)!==value)){
  return conflict(next,k,st,n,value,source,previous,stamp);
 }
 if(previous.some(x=>M().grade(x.nota)!==value))
  return conflict(next,k,st,n,value,source,previous,stamp);
 if((next.conflictos||[]).some(x=>str(x.id)===k))
  throw Error('Hay un conflicto abierto para este estudiante y núcleo; concílialo antes de guardar.');
 const record={id:k,studentId:st.id,nucleo:n,curso:catalog.title,carrera:st.carrera,
  modalidad:st.modalidad,nota:value,source:str(source),fecha:stamp,
  verificado:!!reviewed,status:reviewed?'oficial_registro_manual':'provisional_por_conciliar'};
 if(official.length){
  if(official[0].verificado===true||!reviewed)return {next,kind:'already'};
  next.notas=next.notas.map(x=>noteKey(x.studentId,x.nucleo)===k?{...x,...record}:x);
 }else if(drafts.length){
  if(!reviewed)return {next,kind:'already'};
  next.notasBorrador=next.notasBorrador.filter(x=>noteKey(x.studentId,x.nucleo)!==k);
  next.notas.push({...record,origenBorrador:drafts});
 }else if(courses.length){
  if(!reviewed)return {next,kind:'already'};
  // Conserva la hoja Excel como evidencia histórica; no crea un segundo curso nominal.
  next.cursosNucleos=next.cursosNucleos.map(x=>noteKey(x.studentId,x.nucleo)===k?
    {...x,verificado:true,status:'cotejado_en_formulario',fuenteCotejo:str(source)}:x);
 }else if(reviewed)next.notas.push(record);
 else next.notasBorrador.push(record);
 next.auditoria.push({tipo:'formulario_nucleo',fecha:stamp,studentId:st.id,nucleo:n,
  nota:value,verificado:!!reviewed,fuente:str(source),anterior:previous});
 return {next,kind:reviewed?'verified':'provisional',student:st};
}
function conflict(next,k,st,n,value,source,previous,stamp){
 if((next.conflictos||[]).some(x=>str(x.id)===k))throw Error('El núcleo ya tiene un conflicto por conciliar.');
 const propuesta={id:k,studentId:st.id,nucleo:n,nota:value,curso:C().lookup(st.carrera,n)?.title||'',
  source:str(source),verificado:false,status:'provisional_por_conciliar'};
 next.conflictos.push({id:k,anterior:previous[0],nuevo:propuesta,fecha:stamp,fuente:'Formulario individual'});
 next.auditoria.push({tipo:'formulario_conflicto_nucleo',fecha:stamp,studentId:st.id,nucleo:n,
  notaPropuesta:value,anteriores:previous});
 return {next,kind:'conflict',student:st};
}
function requirement(state,{studentId,field,value,source},stamp){
 const st=student(state,studentId);
 if(!M().REQUIREMENTS.includes(field))throw Error('Selecciona un requisito válido.');
 if(!['CUMPLE','NO CUMPLE','SIN VERIFICAR','NO APLICA'].includes(value))throw Error('Selecciona el estado del requisito.');
 if(!str(source))throw Error('Indica el documento o fuente que respalda el cambio.');
 const previous=str(st.requisitos?.[field]);
 if(previous===value)return {next:state,kind:'already'};
 const next=M().migrate(state),studentNew=next.estudiantes.find(s=>s.id===st.id);
 studentNew.requisitos={...(studentNew.requisitos||{}),[field]:value};
 next.auditoria.push({tipo:'formulario_requisito',fecha:stamp,studentId:st.id,campo:field,
  anterior:previous,nuevo:value,fuente:str(source)});
 return {next,kind:'updated',student:st};
}
const api=Object.freeze({nucleus,requirement});
root.InformetitManualEntry=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
