/* Informetit · Proyección estadística EN MEMORIA. Nunca altera datos académicos. */
(function(root){
'use strict';
const M=()=>root.InformetitDataModel;
const key=x=>M().career(x),id=x=>String(x??'').trim();
const provisional=x=>['PROVISIONAL','ESTIMADO','SIMULADO','BORRADOR','SIN VERIFICAR','PROVISIONAL POR CONCILIAR'].includes(
 M().key(x.status||x.estado));
function project(state,mode,career,nucleus){
 const selectedMode=mode==='online'?'online':'presencial',number=Number(nucleus);
 if(!Number.isInteger(number)||number<1||number>4)throw Error('Selecciona un núcleo del 1 al 4');
 const students=(state.estudiantes||[]).filter(s=>s.modalidad===selectedMode&&key(s.carrera)===key(career)&&s.tipoTitulacion==='complexivo');
 const validIds=new Set(students.map(s=>id(s.id))),verified=new Map(),provisionalIds=new Set(),conflictIds=new Set();
 for(const c of state.conflictos||[]){
  const parts=id(c.id).split('|');
  if(validIds.has(parts[0])&&Number(parts[1])===number)conflictIds.add(parts[0]);
 }
 const addProvisional=row=>{
  const sid=id(row.studentId);
  if(validIds.has(sid)&&Number(row.nucleo)===number&&M().grade(row.nota)!==null)provisionalIds.add(sid);
 };
 for(const row of state.notasBorrador||[])addProvisional(row);
 for(const row of state.cursosNucleos||[])if(row.verificado!==true||provisional(row))addProvisional(row);
 for(const row of state.notas||[]){
  const sid=id(row.studentId),value=M().grade(row.nota);
  if(!validIds.has(sid)||Number(row.nucleo)!==number)continue;
  if(row.verificado!==true||provisional(row)||value===null){if(value!==null)provisionalIds.add(sid);continue}
  if(verified.has(sid)&&verified.get(sid)!==value)conflictIds.add(sid);
  verified.set(sid,value);
 }
 const observed=[],missing=[],pending=[],conflicts=[];
 for(const st of students){
  const sid=id(st.id);
  if(conflictIds.has(sid)){conflicts.push({id:sid,name:st.nombre});continue}
  if(verified.has(sid)){observed.push({id:sid,name:st.nombre,grade:verified.get(sid)});continue}
  if(provisionalIds.has(sid)){pending.push({id:sid,name:st.nombre});continue}
  missing.push({id:sid,name:st.nombre});
 }
 const count=observed.length,mean=count?observed.reduce((sum,x)=>sum+x.grade,0)/count:null;
 const possible=count>0&&missing.length>0;
 return {mode:selectedMode,career,nucleus:number,expected:students.length,verified:count,
  provisional:pending.length,conflicts:conflicts.length,missing:missing.length,
  missingStudents:missing,pendingStudents:pending,conflictStudents:conflicts,
  realMean:mean,projectedMean:possible?mean:null,
  estimatedValue:possible?mean:null,simulated:possible?missing.length:0,possible,
  label:'SIMULACIÓN ESTADÍSTICA · No es nota individual ni evidencia académica',
  persisted:false};
}
const api=Object.freeze({project});
root.InformetitInterpolation=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
