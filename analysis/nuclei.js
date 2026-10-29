/* Informetit · Bloque 05 · Rendimiento académico por carrera/núcleo.
   Esquema sin dependencias; ninguna nota individual se deduce de agregados del Word. */
(function(root){
'use strict';
const M=()=>root.InformetitDataModel;
const NUCLEI=[1,2,3,4];
const BANDS=Object.freeze([{label:'Menor de 7,00',min:0,max:7},{label:'7,00 a 7,99',min:7,max:8},
  {label:'8,00 a 8,99',min:8,max:9},{label:'9,00 a 10,00',min:9,max:10.0000001}]);
const format=(n,digits=2)=>n===null||n===undefined?'Sin datos':Number(n).toLocaleString('es-EC',
  {minimumFractionDigits:digits,maximumFractionDigits:digits});
const pct=(a,b)=>b?100*a/b:null;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=x=>M().career(x);
function stats(numbers){
 const values=numbers.filter(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=10).slice().sort((a,b)=>a-b);
 const n=values.length;
 if(!n)return {n:0,mean:null,median:null,min:null,max:null,sd:null,bands:BANDS.map(b=>({label:b.label,count:0,pct:null}))};
 const mean=values.reduce((a,b)=>a+b,0)/n;
 const median=n%2?values[(n-1)/2]:(values[n/2-1]+values[n/2])/2;
 const sd=Math.sqrt(values.reduce((sum,x)=>sum+(x-mean)**2,0)/n);
 return {n,mean,median,min:values[0],max:values[n-1],sd,
   bands:BANDS.map(b=>({label:b.label,count:values.filter(x=>x>=b.min&&x<b.max).length,
     pct:100*values.filter(x=>x>=b.min&&x<b.max).length/n}))};
}
function build(state,mode='presencial'){
 if(!M())throw Error('Módulo de estudiantes no disponible');
 const actual=mode==='online'?'online':'presencial',students=(state?.estudiantes||[]).filter(s=>s.modalidad===actual);
 const individual=students.length>0,raw=individual?M().analyze(state,actual):null;
 const overview=root.InformetitPublicSummary?.DATA?.[actual];
 if(!overview)throw Error('No existe la fuente agregada de '+actual);
 const items=individual?raw.careers.map(c=>({name:c.name,key:c.key})):
   overview.carreras.map(c=>({name:c[0],key:key(c[0])}));
 const word=root.InformetitNucleos?.datos||{};
 const wordMap=new Map(actual==='presencial'?Object.entries(word).map(([name,rows])=>[key(name),rows]):[]);
 const rawByStudent=new Map(individual?raw.notes.map(x=>[String(x.studentId)+'|'+x.nucleo,x]):[]);
 const conflictIds=new Set((individual?raw.conflicts:[]).map(String));
 const careers=items.map(({name,key:careerKey})=>{
   const members=students.filter(s=>key(s.carrera)===careerKey),
     complexivo=members.filter(s=>s.tipoTitulacion==='complexivo'),
     projects=members.filter(s=>s.tipoTitulacion==='trabajo'),
     unclassified=members.filter(s=>s.tipoTitulacion!=='complexivo'&&s.tipoTitulacion!=='trabajo');
   const wordNuclei=wordMap.get(careerKey)||[];
   const nuclei=NUCLEI.map(n=>{
     const entries=[],pending=[],unresolved=[];
     for(const st of complexivo){
       const noteId=String(st.id)+'|'+n;
       const grade=rawByStudent.get(noteId);
       if(grade)entries.push({id:String(st.id),name:st.nombre,grade:grade.nota,
          source:grade.sourceType==='word'?'Word (nota individual)':'Moodle',
          sourceDetail:grade.sourceDetail||'',mechanism:'complexivo'});
       else if(conflictIds.has(noteId))unresolved.push({id:String(st.id),name:st.nombre,status:'Conflicto sin resolver'});
       else pending.push({id:String(st.id),name:st.nombre,status:'Nota pendiente'});
     }
     entries.sort((a,b)=>a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id));
     pending.sort((a,b)=>a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id));
     unresolved.sort((a,b)=>a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id));
     const computed=stats(entries.map(e=>e.grade));
     const wordRows=wordNuclei[n-1]||null;
     const wordReference=Array.isArray(wordRows)?{
       n:Number(wordRows[0]),mean:Number(wordRows[1]),min:Number(wordRows[2]),max:Number(wordRows[3]),
       source:root.InformetitNucleos?.fuente||'Word institucional de trabajo'
     }:null;
     const useIndividual=computed.n>0;
     const useWord=!useIndividual&&wordReference&&wordReference.n>0;
     const summary=useIndividual?{n:computed.n,mean:computed.mean,min:computed.min,max:computed.max,
       median:computed.median,sd:computed.sd,bands:computed.bands,source:'individual',distribution:true}:
       useWord?{n:wordReference.n,mean:wordReference.mean,min:wordReference.min,max:wordReference.max,
         median:null,sd:null,bands:null,source:'word_aggregate',distribution:false}:
       {n:0,mean:null,min:null,max:null,median:null,sd:null,bands:null,source:'not_available',distribution:false};
     const eligible=individual?complexivo.length:null;
     return {number:n,eligible,gradeCount:computed.n,pendingCount:pending.length,conflictCount:unresolved.length,
       coverage:eligible===null?null:pct(computed.n,eligible),entries,pending,unresolved,
       wordReference,summary,
       // No es válido inferir quién obtuvo una nota del Word cuando solo existen estadísticas agregadas.
       individualSourceCount:computed.n};
   });
   const pendingStudents=complexivo.map(st=>{
     const missing=nuclei.filter(x=>x.pending.some(s=>s.id===String(st.id))).map(x=>x.number);
     const conflicts=nuclei.filter(x=>x.unresolved.some(s=>s.id===String(st.id))).map(x=>x.number);
     return {id:String(st.id),name:st.nombre,missing,conflicts};
   }).filter(x=>x.missing.length||x.conflicts.length).sort((a,b)=>a.name.localeCompare(b.name,'es'));
   return {name,key:careerKey,roster:individual?members.length:null,eligible:individual?complexivo.length:null,
     projects:individual?projects.length:null,unclassified:individual?unclassified.length:null,nuclei,pendingStudents,
     individualWithAnyNote:individual?complexivo.filter(st=>nuclei.some(x=>x.entries.some(e=>e.id===String(st.id)))).length:null,
     individualWithAllNotes:individual?complexivo.filter(st=>nuclei.every(x=>x.entries.some(e=>e.id===String(st.id)))).length:null};
 });
 const activeNuclei=careers.flatMap(c=>c.nuclei);
 const plan=[['Núcleo 1','30/03/2026','02/04/2026'],['Núcleo 2','06/04/2026','09/04/2026'],
 ['Núcleo 3','10/04/2026','14/04/2026'],['Núcleo 4','15/04/2026','18/04/2026']].map((row,i)=>{
  const d=state?.cronogramaPersonalizado?.['complexivo|'+i]||{};
  const f=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?x.slice(8,10)+'/'+x.slice(5,7)+'/'+x.slice(0,4):x||'Por definir';
  return [row[0],f(d.inicio??row[1]),f(d.fin??row[2])];
 });
 const result={mode:actual,source:individual?'individual':'aggregate',careers,individual,planning:plan,
   roster:individual?students.length:overview.total,
   eligible:individual?careers.reduce((n,c)=>n+c.eligible,0):null,
   projects:individual?careers.reduce((n,c)=>n+c.projects,0):null,
   individualGrades:activeNuclei.reduce((n,x)=>n+x.gradeCount,0),
   pendingSlots:individual?activeNuclei.reduce((n,x)=>n+x.pendingCount,0):null,
   unresolvedSlots:individual?activeNuclei.reduce((n,x)=>n+x.conflictCount,0):null,
   nucleiWithResults:activeNuclei.filter(x=>x.summary.n>0).length,
   nucleiExpected:careers.length*4,
   wordOnlyNuclei:activeNuclei.filter(x=>x.summary.source==='word_aggregate').length,
   provenance:'Se presentan notas individuales y agregados del Word por separado, sin mezclarlos ni completar notas faltantes.',
   auditedDuplicates:individual?M().audit(state).issues.filter(x=>['cedula_repetida','id_vacio'].includes(x.type)):[]};
 return result;
}
function narrative(c,n){
 const s=n.summary,total=n.eligible,word=n.wordReference;
 if(s.source==='not_available')return 'En el núcleo '+n.number+' de '+c.name+' no se dispone de notas finales asociadas a estudiantes'+
   (total!==null?' entre los '+total+' participantes de Complexivo registrados':'')+'. El resultado permanece pendiente; no se interpreta como reprobación.';
 if(s.source==='word_aggregate')return 'El Word institucional registra '+s.n+' calificaciones en el núcleo '+n.number+
   ' de '+c.name+', con promedio '+format(s.mean)+', mínimo '+format(s.min)+' y máximo '+format(s.max)+
   '. Se dispone únicamente del resumen agregado, por lo que no es posible identificar notas individuales, mediana, desviación estándar o distribución por rangos.';
 let message='En el núcleo '+n.number+' de '+c.name+' existen '+s.n+' calificaciones individuales, con una media de '+
   format(s.mean)+', mediana de '+format(s.median)+', mínimo de '+format(s.min)+', máximo de '+format(s.max)+
   ' y desviación estándar poblacional de '+format(s.sd)+'.';
 if(total!==null)message+=' La cobertura nominal es de '+format(n.coverage)+' % ('+s.n+' de '+total+
   ' estudiantes de Complexivo); '+n.pendingCount+' notas siguen pendientes y '+n.conflictCount+' casos permanecen en conflicto.';
 const low=s.bands[0].count;message+=' Se observan '+low+' notas inferiores a 7,00 entre las disponibles; este conteo describe calificaciones del núcleo, no resultados finales del Examen Complexivo.';
 if(word&&word.n!==s.n)message+=' El Word contiene un resumen de '+word.n+
   ' registros para este núcleo; se conserva como referencia documental independiente y no se combina con la media nominal.';
 return message;
}
function careerNarrative(c){
 const available=c.nuclei.filter(x=>x.summary.n>0);
 if(!available.length)return 'No se dispone de notas para los cuatro núcleos de '+c.name+
   '. La estructura del capítulo se conserva para incorporar los resultados cuando estén disponibles.';
 const sources=available.map(x=>x.summary.source);
 const nom=available.filter(x=>x.summary.source==='individual');
 const reference=available.filter(x=>x.summary.source==='word_aggregate');
 let result='En '+c.name+' existen '+available.length+' núcleos con resultados: '+nom.length+
   ' con calificaciones individuales y '+reference.length+' sustentados únicamente en estadísticas del Word.';
 if(c.eligible!==null)result+=' La base contiene '+c.eligible+' estudiantes asignados a Complexivo y '+c.projects+
   ' a Trabajo de Titulación; estos últimos no forman parte de las tablas de núcleos.';
 if(nom.length>=2){
   const averages=nom.map(x=>({n:x.number,mean:x.summary.mean,coverage:x.coverage}));
   const high=averages.reduce((a,b)=>a.mean>b.mean?a:b),low=averages.reduce((a,b)=>a.mean<b.mean?a:b);
   result+=' Entre los núcleos con datos nominales, la media más alta es '+format(high.mean)+' en N'+high.n+
    ' y la más baja '+format(low.mean)+' en N'+low.n+
    '. Esta comparación es descriptiva: la cobertura y las personas evaluadas pueden diferir.';
 }
 result+=' No se imputa la calificación de un estudiante a partir de promedios agregados.';
 return result;
}
function renderReport(dataset,helpers){
 const {H,Table,Figure,para,F}=helpers;
 const fmt=x=>x===null||x===undefined?'No calculable':F(x);
 let out=H(2,'5. Fase II. Resultados de núcleos estructurantes');
 out+=para('La Fase II presenta cada carrera con Núcleo 1, Núcleo 2, Núcleo 3, Núcleo 4 y su consolidado. Cada núcleo incluye la nómina del mecanismo Examen Complexivo, indicadores y gráficos. La ausencia de una nota se mantiene como pendiente y no se convierte en cero.');
 out+=Table('Cronograma planificado de los núcleos estructurantes',
  ['Núcleo','Fecha de inicio','Fecha de finalización'],dataset.planning,
  'El cronograma no es evidencia de aprobación ni de realización de evaluaciones');
 out+=H(3,'5.1. Cobertura y fuentes');
 out+=para('Se consideran '+dataset.careers.length+' carreras de la modalidad '+dataset.mode+
  ' y '+dataset.nucleiExpected+' combinaciones carrera–núcleo. '+(dataset.individual?
    'La nómina confirma '+dataset.eligible+' estudiantes de Examen Complexivo, '+
     dataset.individualGrades+' notas nominales, '+dataset.pendingSlots+' pendientes y '+
     dataset.unresolvedSlots+' conflictos.':
    'Sin una nómina individual no se pueden atribuir notas a estudiantes, aunque existan estadísticas agregadas.'));
 out+=Table('Cobertura académica y medias por carrera y núcleo',
  ['Carrera','Est. Complexivo','Núcleo 1','Núcleo 2','Núcleo 3','Núcleo 4'],
  dataset.careers.map(c=>[c.name,c.eligible===null?'Sin nómina':c.eligible,
   ...c.nuclei.map(n=>n.summary.n?String(n.summary.n)+' / '+fmt(n.summary.mean)+
   (n.summary.source==='individual'?' (Nominal)':' (Word agregado)'):'Sin datos')]),
   'Las cifras agregadas del Word no identifican calificaciones individuales');
 out+=H(3,'5.2. Resultados por carrera, núcleo y consolidado');
 dataset.careers.forEach((c,i)=>{
  const section='5.2.'+(i+1);
  out+=H(3,section+'. '+c.name);
  out+=para(careerNarrative(c));
  if(c.unclassified)out+=para('Existen '+c.unclassified+' estudiantes sin mecanismo confirmado en esta carrera. No se les asignan automáticamente notas de núcleos ni el mecanismo Examen Complexivo.');
  const names=new Map();
  for(const n of c.nuclei)for(const row of [...n.entries,...n.pending,...n.unresolved])
    names.set(row.id,row.name);
  const students=[...names].map(([id,name])=>({id,name})).sort((a,b)=>
   a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id));
  const index=c.nuclei.map(n=>({grade:new Map(n.entries.map(e=>[e.id,e])),
    conflict:new Set(n.unresolved.map(e=>e.id))}));
  for(const n of c.nuclei){
   out+=H(3,section+'.'+n.number+'. Núcleo '+n.number);
   out+=para(narrative(c,n));
   const grades=new Map(n.entries.map(x=>[x.id,x]));
   out+=Table('Estudiantes y notas — '+c.name+' — Núcleo '+n.number,
    ['N.º','Estudiante','Cédula','Nota final','Estado','Fuente'],
    students.map((st,j)=>{
     const e=grades.get(st.id),conflict=index[n.number-1].conflict.has(st.id);
     return [j+1,st.name,st.id,e?fmt(e.grade):'—',
       conflict?'En conflicto':e?'Verificada':'Pendiente',
       e?(e.sourceDetail||e.source):conflict?'Por conciliar':'Sin fuente verificada'];
    }), 'Se incluyen todos los estudiantes confirmados en Examen Complexivo. Pendiente y conflicto no representan calificación cero');
   if(!dataset.individual||c.eligible===0)
    out+=para('Todavía no existe una nómina confirmada de Examen Complexivo para esta carrera. Se conserva la estructura sin inventar estudiantes o calificaciones.');
   const official=n.summary.source==='individual'?n.summary:null;
   out+=Table('Indicadores — '+c.name+' — Núcleo '+n.number,
    ['Indicador','Valor','Indicador','Valor'],[
     ['Estudiantes de Complexivo',n.eligible===null?'Sin nómina':n.eligible,'Notas verificadas',n.gradeCount],
     ['Notas pendientes',n.pendingCount,'Conflictos',n.conflictCount],
     ['Promedio nominal',fmt(official?.mean??null),'Mediana nominal',fmt(official?.median??null)],
     ['Mínimo nominal',fmt(official?.min??null),'Máximo nominal',fmt(official?.max??null)],
     ['Desviación estándar',fmt(official?.sd??null),'Cobertura',n.coverage===null?'No calculable':fmt(n.coverage)+' %'],
     ['Notas de 7,00 a 10,00',n.entries.filter(x=>x.grade>=7).length,
      'Referencia Word',n.wordReference?'n='+n.wordReference.n+'; media '+fmt(n.wordReference.mean):'No consta']
    ],'Los estadísticos nominales usan exclusivamente notas individuales; el Word no se mezcla');
   if(dataset.individual&&c.eligible>0)
    out+=Figure('Cobertura por estado — '+c.name+' — Núcleo '+n.number,
     [['Con nota',n.gradeCount],['Pendiente',n.pendingCount],['Conflicto',n.conflictCount]],
     {max:Math.max(1,c.eligible),decimals:0,note:'Los registros sin nota y en conflicto no se consideran reprobados'});
   if(official?.bands){
    out+=Table('Distribución de calificaciones — '+c.name+' — Núcleo '+n.number,
     ['Rango','Estudiantes','Porcentaje'],official.bands.map(x=>[x.label,x.count,fmt(x.pct)+' %']),
     'Distribución calculada solo con notas nominales válidas');
    out+=Figure('Distribución de notas — '+c.name+' — Núcleo '+n.number,
     official.bands.map(x=>[x.label,x.count]),
     {decimals:0,note:'Frecuencias nominales; no se imputan calificaciones faltantes'});
   }
   if(typeof helpers.courseSections==='function')out+=helpers.courseSections(c.key,n.number,c.name);
  }
  const valid=[],partial=[],empty=[],conflictNames=[];
  const rows=students.map((st,j)=>{
   const four=index.map(m=>m.grade.get(st.id)?.grade??null);
   const conflict=index.some(m=>m.conflict.has(st.id));
   const complete=four.every(x=>x!==null)&&!conflict;
   const mean=complete?four.reduce((a,b)=>a+b,0)/4:null;
   const present=four.filter(x=>x!==null).length;
   if(complete)valid.push(mean);else if(present)partial.push(st.id);else empty.push(st.id);
   if(conflict)conflictNames.push(st.id);
   return [j+1,st.name,st.id,...four.map((x,k)=>index[k].conflict.has(st.id)?
    'Conflicto':x===null?'Pendiente':fmt(x)),mean===null?'—':fmt(mean),
    complete?'Completo':conflict?'En conflicto':'Incompleto'];
  });
  const consolidatedMean=valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;
  out+=H(3,section+'.5. Consolidado de '+c.name);
  out+=para('El consolidado reúne los cuatro núcleos por estudiante. La media simple descriptiva solo se calcula cuando constan cuatro notas individuales sin conflicto; no es la nota definitiva del Examen Complexivo ni sustituye una ponderación institucional validada.');
  out+=Table('Consolidado nominal de cuatro núcleos — '+c.name,
   ['N.º','Estudiante','Cédula','N1','N2','N3','N4','Media simple','Estado'],rows,
   'Una media ausente significa expediente incompleto o en conflicto; no es cero');
  out+=Table('Resumen del consolidado — '+c.name,
   ['Indicador','Valor','Indicador','Valor'],[
    ['Estudiantes Complexivo',c.eligible===null?'Sin nómina':c.eligible,'Con cuatro notas',valid.length],
    ['Con notas parciales',partial.length,'Sin notas verificadas',empty.length],
    ['Con conflicto',conflictNames.length,'Media de completos',fmt(consolidatedMean)],
    ['Cobertura completa',c.eligible?fmt(100*valid.length/c.eligible)+' %':'No calculable',
     'Sin mecanismo confirmado',c.unclassified===null?'Sin nómina':c.unclassified]
   ],'Se calcula únicamente para la nómina de Complexivo de esta carrera');
  const means=c.nuclei.filter(n=>n.summary.source==='individual'&&n.summary.mean!==null)
   .map(n=>['N'+n.number,n.summary.mean]);
  if(means.length)
   out+=Figure('Comparación de medias nominales — '+c.name,means,
    {max:10,decimals:2,note:'Comparación descriptiva de calificaciones nominales de los cuatro núcleos'});
  if(dataset.individual&&c.eligible>0)
   out+=Figure('Cobertura del consolidado — '+c.name,
    [['Cuatro notas',valid.length],['Parcial',partial.length],['Sin notas',empty.length]],
    {max:Math.max(1,c.eligible),decimals:0,note:'Los conflictos se identifican también de manera individual'});
  if(typeof helpers.courseSections==='function')out+=helpers.courseSections(c.key,0,c.name);
  if(!valid.length)out+=para('No hay expedientes completos con las cuatro notas verificadas. Los casos pendientes siguen visibles para su seguimiento.');
 });
 out+=H(3,'5.3. Interpretación general de la Fase II');
 out+=para('La organización por carrera distingue los cuatro núcleos y el consolidado. Los promedios agregados del Word se mantienen como referencia independiente; ningún dato agregado se atribuye a una persona. Las medias descriptivas de núcleos no acreditan la aprobación final del mecanismo de titulación.');
 if(dataset.auditedDuplicates.length)out+=para('La nómina contiene identificaciones duplicadas o vacías y requiere conciliación antes de validar el informe.');
 return out;
}

const api=Object.freeze({NUCLEI,BANDS,stats,build,narrative,careerNarrative,renderReport,format,pct,esc});
root.InformetitNuclei=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
