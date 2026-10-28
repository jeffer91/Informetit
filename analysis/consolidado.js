/* Informetit · Bloque 07 · Consolidación por mecanismo, modalidad y carrera.
   Los estados calculados no certifican emisión de título ni firma de actas. */
(function(root){
'use strict';
const M=()=>root.InformetitDataModel,X=()=>root.InformetitComplexivo,T=()=>root.InformetitTrabajo;
const fmt=x=>x===null||x===undefined?'No calculable':Number(x).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2});
const percent=(n,total)=>total?Math.round(10000*n/total)/100:null;
function analyze(state,mode='presencial'){
 const m=mode==='online'?'online':'presencial',students=(state.estudiantes||[]).filter(x=>x.modalidad===m);
 const c=X().analyze(state,m),t=T().analyze(state,m);
 const all=[...c.records.map(r=>({id:r.studentId,name:r.name,career:r.career,
  key:r.careerKey,mechanism:'complexivo',status:r.status,grade:r.finalGrade,
  referenced:r.verified})),...t.entries.map(r=>({id:r.id,name:r.name,career:r.career,
  key:r.key,mechanism:'trabajo',status:r.status,grade:r.grade,
  referenced:!!r.record?.actaReferenced}))];
 const compile=list=>{
  const counts={total:list.length,complexivo:list.filter(r=>r.mechanism==='complexivo').length,
    trabajo:list.filter(r=>r.mechanism==='trabajo').length,
    approvedOrdinary:list.filter(r=>r.status==='aprobado_ordinario').length,
    approvedRescue:list.filter(r=>r.status==='aprobado_supletorio').length,
    failed:list.filter(r=>r.status==='reprobado').length,
    absent:list.filter(r=>r.status.startsWith('no_presentado')).length,
    duplicate:list.filter(r=>r.status==='conflicto_duplicado').length,
    pending:list.filter(r=>['pendiente','supletorio_pendiente'].includes(r.status)).length,
    referenced:list.filter(r=>r.referenced&&r.grade!==null).length};
  counts.approved=counts.approvedOrdinary+counts.approvedRescue;
  counts.calculatedRate=percent(counts.approved,counts.total);
  counts.closed=counts.pending===0&&counts.duplicate===0&&counts.total>0;
  return counts;
 };
 const careers=[...new Set(all.map(x=>x.key))].map(key=>{
  const entries=all.filter(r=>r.key===key);
  return {key,name:entries[0].career,entries,counts:compile(entries)};
 }).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const result={mode:m,students,complexivo:c,trabajo:t,records:all,careers,counts:compile(all)};
 if(result.counts.total!==students.length)throw Error('Inconsistencia: la población de ambos mecanismos no coincide con la nómina de la modalidad.');
 return result;
}
function renderReport(d,{Table,Figure,H,para}){
 let out=H(2,'8. Síntesis general de la cohorte');
 out+=para('Los resultados de Examen Complexivo y Trabajo de Titulación se consolidan por estudiante, modalidad y carrera. Las calificaciones de uno y otro mecanismo se obtienen de instrumentos distintos, pero sus resultados se expresan en categorías compatibles para analizar la cohorte.');
 const c=d.counts;
 out+=Table('Consolidado de resultados por mecanismo',
 ['Mecanismo','Estudiantes','Aprobados calculados','Reprobados','No presentados','Pendientes','Duplicados'],[
  ['Examen Complexivo',d.complexivo.counts.eligible,d.complexivo.counts.approved,d.complexivo.counts.failed,
    d.complexivo.counts.noPresentado,d.complexivo.counts.pending,d.complexivo.counts.duplicate],
  ['Trabajo de Titulación',d.trabajo.counts.eligible,d.trabajo.counts.approved,d.trabajo.counts.failed,
    d.trabajo.counts.noPresented,d.trabajo.counts.pending,d.trabajo.counts.duplicates],
  ['Total cohorte',c.total,c.approved,c.failed,c.absent,c.pending,c.duplicate]
 ],'Estados académicos calculados; no certifican incorporación, actas autenticadas ni emisión de títulos');
 out+=Table('Indicadores integrados de cierre de evaluación',
 ['Indicador','Estudiantes','Proporción sobre la cohorte'],[
  ['Aprobados en primera oportunidad',c.approvedOrdinary,fmt(percent(c.approvedOrdinary,c.total))+' %'],
  ['Aprobados después de supletorio',c.approvedRescue,fmt(percent(c.approvedRescue,c.total))+' %'],
  ['Aprobaciones calculadas totales',c.approved,fmt(c.calculatedRate)+' %'],
  ['Reprobados después de evaluación supletoria',c.failed,fmt(percent(c.failed,c.total))+' %'],
  ['No presentados declarados',c.absent,fmt(percent(c.absent,c.total))+' %'],
  ['Pendientes de resultados completos',c.pending,fmt(percent(c.pending,c.total))+' %'],
  ['Registros duplicados o en conflicto',c.duplicate,fmt(percent(c.duplicate,c.total))+' %'],
  ['Notas finales con referencia de acta',c.referenced,fmt(percent(c.referenced,c.total))+' %']
 ],'Tasa calculada sobre la nómina local de la modalidad; no equivale a eficiencia terminal ni tasa de graduación');
 out+=Table('Consolidado de resultados por carrera',
 ['Carrera','Total','Complexivo','Proyectos','Aprobados','Reprobados','Ausentes','Pendientes','Duplicados'],
 d.careers.map(x=>[x.name,x.counts.total,x.counts.complexivo,x.counts.trabajo,
 x.counts.approved,x.counts.failed,x.counts.absent,x.counts.pending,x.counts.duplicate]),
 'Las carreras agrupadas incluyen a estudiantes de ambas modalidades de titulación, pero solo de la modalidad de asistencia del presente informe');
 if(d.careers.length)out+=Figure('Aprobación académica calculada por carrera',
  d.careers.map(x=>[x.name,x.counts.calculatedRate??0]),
  {max:100,percentage:true,decimals:2,
   note:'Porcentaje sobre la nómina de cada carrera. Un 0 % puede representar notas aún no registradas, no reprobación; consultar las tablas.'});
 out+=para('Se dispone de '+c.approved+' aprobaciones calculadas, '+c.failed+' reprobaciones posteriores al proceso supletorio y '+c.pending+
  ' casos pendientes, entre '+c.total+' estudiantes. '+c.referenced+
  ' notas finales tienen referencia de acta, sujeta a revisión documental. '+(c.closed?
  'La clasificación académica no contiene estados pendientes o duplicados; falta verificar la documentación institucional de cierre.':
  'Los pendientes y duplicados impiden considerar cerrado el registro académico de la cohorte.'));
 out+=para('Los resultados de aprobación no se infieren del cumplimiento de requisitos o de las notas de núcleos. Tampoco prueban por sí solos la graduación: para calcular eficiencia terminal se necesita conciliar las actas firmadas, el registro de títulos y la población institucional autorizada.');
 return out;
}
const api=Object.freeze({analyze,renderReport,percent,fmt});
root.InformetitConsolidado=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
