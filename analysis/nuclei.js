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
     complexivo=members.filter(s=>s.tipoTitulacion!=='trabajo'),
     projects=members.filter(s=>s.tipoTitulacion==='trabajo');
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
     projects:individual?projects.length:null,nuclei,pendingStudents,
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
 const {Table,Figure,H,para,F}=helpers;
 const v=x=>x===null?'No disponible':F(x);
 let out=H(2,'5. Fase II. Resultados de núcleos estructurantes');
 out+=para('Los cuatro núcleos forman parte de la preparación del Examen Complexivo. Los análisis presentan únicamente las notas finales disponibles, con sus denominadores y fuentes. Se conservan los parciales en la base local sin incorporarlos a estas tablas. Los estudiantes de Trabajo de Titulación se analizan en su capítulo correspondiente.');
 out+=Table('Cronograma planificado de los núcleos estructurantes',
   ['Núcleo','Fecha de inicio','Fecha de finalización'],
   dataset.planning,
   'Fechas de la planificación de Examen Complexivo del período; no prueban por sí solas que las sesiones se hayan ejecutado');
 out+=H(3,'5.1. Cobertura y fuentes');
 out+=para('Se consideran '+dataset.careers.length+' carreras en la modalidad '+dataset.mode+'. Existen '+dataset.nucleiWithResults+
   ' combinaciones carrera–núcleo con resultados entre '+dataset.nucleiExpected+' posibles. '+
   (dataset.individual?('La nómina contiene '+dataset.eligible+' estudiantes asignados a Examen Complexivo y '+
    dataset.projects+' a Trabajo de Titulación. Se han asociado '+dataset.individualGrades+' notas nominales y quedan '+
    dataset.pendingSlots+' casillas sin calificación, además de '+dataset.unresolvedSlots+' en conflicto.'):
    'Sin la nómina individual, los resultados disponibles proceden de la fuente agregada y no permiten contar estudiantes pendientes por nombre.'));
 const coverageRows=dataset.careers.map(c=>[c.name,c.eligible===null?'Sin nómina':c.eligible,
  ...c.nuclei.map(n=>n.summary.n?String(n.summary.n)+' / '+v(n.summary.mean)+' ('+(n.summary.source==='individual'?'nom.':'Word')+')':'Sin datos')]);
 out+=Table('Cobertura académica y medias por carrera y núcleo',
  ['Carrera','Est. Complexivo','Núcleo 1','Núcleo 2','Núcleo 3','Núcleo 4'],coverageRows,
  'En cada núcleo: registros / media. Nom. indica datos individuales; Word indica resumen agregado no nominativo. La cobertura nominal no se infiere de agregados');
 out+=H(3,'5.2. Resultados detallados por carrera');
 dataset.careers.forEach((c,index)=>{
   out+=H(3,'5.2.'+(index+1)+'. '+c.name);
   out+=para(careerNarrative(c));
   const overview=c.nuclei.map(n=>[ 'Núcleo '+n.number,
     n.summary.n||'Sin datos',v(n.summary.mean),v(n.summary.median),
     v(n.summary.min),v(n.summary.max),v(n.summary.sd),
     n.summary.source==='individual'?'Individual':n.summary.source==='word_aggregate'?'Word agregado':'Pendiente']);
   out+=Table('Estadísticas de los cuatro núcleos — '+c.name,
     ['Núcleo','n','Media','Mediana','Mín.','Máx.','Desv. est.','Fuente'],overview,
     'La desviación estándar es poblacional y solo se calcula desde notas individuales; no se calculan estadísticos de distribución desde un agregado');
   const chart=c.nuclei.filter(x=>x.summary.mean!==null).map(x=>['N'+x.number,x.summary.mean]);
   if(chart.length)out+=Figure('Medias disponibles de los núcleos — '+c.name,chart,{
     max:10,decimals:2,note:'Comparación descriptiva; cada barra utiliza únicamente la muestra disponible de su núcleo y fuente.'});
   for(const n of c.nuclei){
     out+=para('Núcleo '+n.number+'. '+narrative(c,n));
     if(dataset.individual){
       const nominalRows=[
         ...n.entries.map(x=>[x.name,x.id,v(x.grade),x.source,'Registrada']),
         ...n.pending.map(x=>[x.name,x.id,'—','Sin calificación','Pendiente']),
         ...n.unresolved.map(x=>[x.name,x.id,'—','Sin calificación','Conflicto por resolver'])
       ].sort((x,y)=>x[0].localeCompare(y[0],'es')||x[1].localeCompare(y[1]));
       out+=Table('Calificaciones finales nominales — '+c.name+' — Núcleo '+n.number,
         ['Estudiante','Cédula','Calificación final','Fuente','Estado'],
         nominalRows,
         'Se incluyen TODOS los estudiantes de Complexivo de la carrera. Las notas no cargadas se dejan vacías (—) y se identifican como pendientes o en conflicto, nunca como cero');
     }
     if(n.summary.source==='individual'){
       out+=Table('Distribución de calificaciones — '+c.name+' — Núcleo '+n.number,
         ['Rango (escala 0–10)','Estudiantes','Porcentaje'],n.summary.bands.map(b=>[b.label,b.count,v(b.pct)+' %']),
         'Denominador: '+n.summary.n+' notas individuales disponibles; los valores menores de 7,00 no equivalen a reprobación del Examen Complexivo');
       out+=Figure('Distribución de notas — '+c.name+' — Núcleo '+n.number,
         n.summary.bands.map(b=>[b.label,b.count]),{
           decimals:0,note:'Frecuencias de notas individuales registradas; excluye faltantes y conflictos.'});
     }else if(n.summary.source==='word_aggregate')out+=para('La estadística agregada del Word se conserva como resultado documental aceptado, pero no autoriza construir una distribución ni asignar notas a nombres de estudiantes.');
   }
   if(dataset.individual){
     out+=H(3,'Notas pendientes de '+c.name);
     const missingRows=c.pendingStudents.map(s=>[s.name,s.id,
       s.missing.length?s.missing.map(n=>'N'+n).join(', '):'—',
       s.conflicts.length?s.conflicts.map(n=>'N'+n).join(', '):'—']);
     out+=Table('Seguimiento de calificaciones faltantes — '+c.name,
       ['Estudiante','Cédula','Notas sin cargar','Notas en conflicto'],missingRows,
       'Lista separada de seguimiento: una nota sin cargar o en conflicto no se contabiliza como reprobación');
     if(!missingRows.length)out+=para('No constan notas pendientes ni conflictos de núcleos entre los estudiantes de Complexivo registrados para esta carrera.');
   }
 });
 out+=H(3,'5.3. Interpretación y límites del análisis académico');
 out+=para('La muestra corresponde exclusivamente a la modalidad '+dataset.mode+' y al período octubre 2025–marzo 2026. Las comparaciones entre núcleos y carreras son descriptivas y requieren considerar diferencias de tamaño y cobertura.');
 out+=para('Las estadísticas del Word institucional se aceptan como referencia del período, sin convertir sus registros agregados en notas nominales. Cuando existen calificaciones individuales para un núcleo se calculan sus indicadores exclusivamente con ellas; cualquier resumen del Word permanece como referencia separada.');
 out+=para('Una nota faltante no se reemplaza por cero. Las notas en conflicto se excluyen de los estadísticos hasta que el responsable seleccione la fuente que corresponda. Los resultados de estos núcleos no equivalen a aprobación final del proceso de titulación.');
 if(dataset.auditedDuplicates.length)out+=para('Advertencia de integridad: la nómina contiene identificaciones repetidas o vacías y requiere conciliación antes de validar resultados definitivos.');
 return out;
}
const api=Object.freeze({NUCLEI,BANDS,stats,build,narrative,careerNarrative,renderReport,format,pct,esc});
root.InformetitNuclei=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
