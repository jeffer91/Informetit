/* Informetit · Bloque 03 · Motor de requisitos y continuidad de cohorte.
   Estadística descriptiva; no equipara requisito, habilitación formal o aprobación académica. */
(function(root) {
'use strict';
const REQUIREMENTS=[
 {key:'Academico',label:'Académico',short:'ACA'},
 {key:'Documentacion',label:'Documentación',short:'DOC'},
 {key:'Financiero',label:'Financiero',short:'FIN'},
 {key:'Practicas',label:'Prácticas',short:'PRA'},
 {key:'Vinculacion',label:'Vinculación',short:'VIN'},
 {key:'Seguimiento',label:'Seguimiento',short:'SEG'},
 {key:'Ingles',label:'Inglés',short:'ING'},
 {key:'Datos',label:'Datos actualizados',short:'DAT'},
 {key:'Titulacion',label:'Titulación (control)',short:'TIT'}
];
const PREVIOUS_COHORT_REFERENCE={
 source:'Informe de titulación octubre 2025–marzo 2026, Word institucional en elaboración',
 presencial:{initial:267,active:262,withdrawn:5,reachedFinal:255,notReachedFinal:12},
 online:null
};
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(n,d)=>d>0?100*n/d:null;
const fmt=x=>x===null||x===undefined?'No calculable':Number(x).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2});
const NA=new Set(['NO APLICA','NO APLICABLE','N A','NA','NO CORRESPONDE']);
const FAIL=new Set(['NO','NC','NO CUMPLE','INCUMPLE','NO APROBADO','REPROBADO','NO APTO','MORA']);
const UNKNOWN=new Set(['','PENDIENTE','SIN VERIFICAR','SIN DATOS','SIN INFORMACION','POR REVISAR','EN PROCESO','POR VALIDAR','EN REVISION']);
function classify(value){
 const v=norm(value);
 if(NA.has(v))return 'na';
 if(v==='CUMPLE'||v==='SI'||v==='APROBADO'||v==='OK')return 'ok';
 if(FAIL.has(v)||v.startsWith('NO CUMPLE ')||v.startsWith('NO ALCANZA ')||v.startsWith('INCUMPLE ')||v.includes(' MORA ')||v.startsWith('NO APROBADO '))return 'fail';
 if(UNKNOWN.has(v))return 'unknown';
 // No se presume que un valor administrativo desconocido equivale a NO CUMPLE.
 return 'unknown';
}
function studentStatus(student,columns=REQUIREMENTS){
 const items=columns.map(r=>({...r,state:classify(student?.requisitos?.[r.key]),raw:student?.requisitos?.[r.key]}));
 const fail=items.filter(x=>x.state==='fail');
 const unknown=items.filter(x=>x.state==='unknown');
 const applicable=items.filter(x=>x.state!=='na');
 return {items,fail,unknown,nonApplicable:items.filter(x=>x.state==='na'),
  complete:applicable.length>0&&fail.length===0&&unknown.length===0,
  reviewRequired:fail.length>0||unknown.length>0};
}
function createIndividual(state,mode){
 const model=root.InformetitDataModel;
 if(!model)throw new Error('Se requiere data/model.js antes del motor de requisitos');
 const students=(state?.estudiantes||[]).filter(x=>x.modalidad===mode);
 const masterAudit=model.audit(state||{});
 const valid=masterAudit.canUseIndividual && !masterAudit.issues.some(x=>['id_vacio','cedula_repetida'].includes(x.type));
 const byReq=REQUIREMENTS.map(r=>{
  const counts={ok:0,fail:0,unknown:0,na:0};
  for(const st of students)counts[classify(st.requisitos?.[r.key])]++;
  return {...r,...counts,total:students.length,applicable:students.length-counts.na,
    pct:pct(counts.ok,students.length-counts.na),source:'individual'};
 });
 const byCareerMap=new Map(),cases=[];
 for(const st of students){
  const key=model.career(st.carrera),label=String(st.carrera||'Carrera por confirmar').trim();
  if(!byCareerMap.has(key))byCareerMap.set(key,{
   key,name:label,total:0,complete8:0,complete9:0,affected8:0,unverified8:0,
   requirementCounts:REQUIREMENTS.map(x=>({...x,fail:0,unknown:0,na:0}))
  });
  const row=byCareerMap.get(key);
  row.total++;
  const eight=studentStatus(st,REQUIREMENTS.slice(0,8)),nine=studentStatus(st,REQUIREMENTS);
  if(eight.complete)row.complete8++;else if(eight.fail.length||eight.unknown.length)row.affected8++;
  if(nine.complete)row.complete9++;
  if(eight.unknown.length)row.unverified8++;
  nine.items.forEach((x,i)=>{if(x.state==='fail')row.requirementCounts[i].fail++;if(x.state==='unknown')row.requirementCounts[i].unknown++;if(x.state==='na')row.requirementCounts[i].na++});
  if(nine.reviewRequired)cases.push({
   id:String(st.id),name:String(st.nombre||'Nombre pendiente'),
   career:label,careerKey:key,mechanism:st.tipoTitulacion==='trabajo'?'Trabajo de Titulación':'Examen Complexivo',
   fail8:eight.fail.map(x=>x.label),unknown8:eight.unknown.map(x=>x.label),
   fail9:nine.fail.map(x=>x.label),unknown9:nine.unknown.map(x=>x.label),
   onlyTitulacion:!eight.reviewRequired&&nine.reviewRequired
  });
 }
 const careers=[...byCareerMap.values()].sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const total=students.length,complete8=careers.reduce((x,c)=>x+c.complete8,0),
  complete9=careers.reduce((x,c)=>x+c.complete9,0);
 const fail8Students=cases.filter(c=>c.fail8.length).length;
 const unknown8Students=cases.filter(c=>c.unknown8.length).length;
 const direct8=byReq.slice(0,8);
 const checks={applicable:direct8.reduce((x,r)=>x+r.applicable,0),
  ok:direct8.reduce((x,r)=>x+r.ok,0),
  fail:direct8.reduce((x,r)=>x+r.fail,0),
  unknown:direct8.reduce((x,r)=>x+r.unknown,0),
  na:direct8.reduce((x,r)=>x+r.na,0)};
 const priorities=direct8.filter(r=>r.fail>0||r.unknown>0)
  .sort((a,b)=>(b.fail+b.unknown)-(a.fail+a.unknown)||b.fail-a.fail||a.label.localeCompare(b.label,'es'));
 return {
  mode,source:'individual',total,valid,complete8,complete9,
  notComplete8:total-complete8,notComplete9:total-complete9,
  fail8Students,unknown8Students,checks,requirements:byReq,careers,
  cases:cases.sort((a,b)=>a.career.localeCompare(b.career,'es')||a.name.localeCompare(b.name,'es')),
  priorities,reference:mode==='presencial'&&total===262?PREVIOUS_COHORT_REFERENCE.presencial:null,
  referenceSource:PREVIOUS_COHORT_REFERENCE.source,
  confidence:valid?'nominal':'revisar_identificaciones',
  audit:masterAudit.issues.filter(x=>['id_vacio','cedula_repetida'].includes(x.type))
 };
}
function createAggregate(mode){
 const base=root.InformetitPublicSummary?.DATA?.[mode];
 if(!base)throw new Error('No se encontró la estadística agregada para '+mode);
 const total=base.total;
 const requirements=REQUIREMENTS.map((r,i)=>{
  const item=base.requisitos[i]||[r.label,0,total];
  return {...r,ok:item[1],unclassified:item[2],total,applicable:total,fail:null,unknown:null,na:null,
   pct:pct(item[1],total),source:'aggregate'};
 });
 const careers=base.carreras.map(([name,n])=>({name,key:root.InformetitDataModel?.career(name)||norm(name),
  total:n,complete8:null,complete9:null,affected8:null,unverified8:null,requirementCounts:null}));
 const checks={applicable:total*8,ok:requirements.slice(0,8).reduce((x,r)=>x+r.ok,0),
   unclassified:requirements.slice(0,8).reduce((x,r)=>x+r.unclassified,0),
   fail:null,unknown:null,na:null};
 const priorities=requirements.slice(0,8).filter(x=>x.unclassified>0)
  .sort((a,b)=>b.unclassified-a.unclassified||a.label.localeCompare(b.label,'es'));
 return {mode,source:'aggregate',total,valid:false,complete8:base.completos8,
  complete9:base.completos9,notComplete8:total-base.completos8,
  notComplete9:total-base.completos9,
  fail8Students:null,unknown8Students:null,checks,requirements,careers,cases:[],priorities,
  reference:mode==='presencial'?PREVIOUS_COHORT_REFERENCE.presencial:null,
  referenceSource:PREVIOUS_COHORT_REFERENCE.source,confidence:'agregado_sin_detalle',audit:[]};
}
function analyze(state,mode='presencial'){
 const m=mode==='online'?'online':'presencial';
 const individuals=(state?.estudiantes||[]).filter(x=>x.modalidad===m);
 return individuals.length?createIndividual(state,m):createAggregate(m);
}
function insight(a){
 const subject=a.mode==='online'?'online':'presencial',s=[];
 s.push('La modalidad '+subject+' contiene '+a.total+' registros en la fuente '+(a.source==='individual'?'nominal local':'agregada institucional')+'.');
 s.push(a.complete8+' estudiantes figuran con ocho requisitos previos completos ('+fmt(pct(a.complete8,a.total))+' %), mientras '+a.complete9+' tienen completos los nueve controles ('+fmt(pct(a.complete9,a.total))+' %). El control Titulación no representa aprobación del examen o defensa.');
 if(a.source==='individual'){
  s.push('Se identifican '+a.checks.fail+' verificaciones con incumplimiento explícito y '+a.checks.unknown+' sin estado comprobado entre los ocho requisitos. Corresponden a '+a.fail8Students+' estudiantes con al menos un incumplimiento y '+a.unknown8Students+' con datos sin verificar; las dos poblaciones pueden superponerse.');
 }else{
  s.push('El resumen agregado muestra '+a.checks.unclassified+' verificaciones no cumplidas según su clasificación original, pero no permite distinguir incumplimientos confirmados de estados pendientes o desconocidos.');
 }
 const tops=a.priorities.slice(0,3);
 if(tops.length)s.push('Las mayores incidencias se concentran en '+tops.map(x=>x.label+' ('+(a.source==='individual'?(x.fail+x.unknown):x.unclassified)+')').join(', ')+'. Estas cifras corresponden a verificaciones y no a causas demostradas.');
 if(a.reference)s.push('El Word de referencia declara '+a.reference.initial+' estudiantes iniciales, '+a.reference.active+' activos, '+a.reference.withdrawn+' retirados y '+a.reference.reachedFinal+' que llegaron a fase final. Estos valores se mantienen como datos documentales independientes del cumplimiento integral, sin inferir que las mismas personas pertenecen a ambos grupos.');
 return s;
}
function renderReport(report,helper){
 const {Table,Figure,H,para,F,P}=helper;
 const n=report.total,individual=report.source==='individual',p=x=>x===null?'Por verificar':F(x);
 const rows=report.careers.map(c=>[c.name,c.total,n?pct(c.total,n).toFixed(2).replace('.',',')+' %':'—',
   c.complete8===null?'Por conciliar':c.complete8,
   c.complete9===null?'Por conciliar':c.complete9]);
 let out=H(2,'4. Fase I. Verificación de requisitos');
 out+=H(3,'4.1. Caracterización de la cohorte');
 out+=para('La Fase I identifica la población de la modalidad '+(report.mode==='online'?'online':'presencial')+' y verifica el cumplimiento documental y académico de la matriz de requisitos. No se confunde el cumplimiento de requisitos con la aprobación de las evaluaciones de titulación.');
 out+=Table('Distribución por carrera y cumplimiento integral',['Carrera','Estudiantes','Participación','Ocho controles','Nueve controles'],rows,
  individual?'Cálculos desde la nómina local, desagregados por carrera':'Cifras por carrera de la matriz agregada. No se infieren estados individuales por carrera');
 out+=Figure('Distribución de la cohorte por carrera',report.careers.map(c=>[c.name,c.total]),{note:'Total de estudiantes registrado para la modalidad.'});
 out+=H(3,'4.2. Cumplimiento por requisito');
 const reqRows=report.requirements.map(r=>individual?
  [r.label,r.applicable,r.ok,r.fail,r.unknown,r.na,p(r.pct)+' %']:
  [r.label,r.applicable,r.ok,'Sin desglose','Sin desglose','Sin desglose',p(r.pct)+' %']);
 out+=Table('Estado de los nueve controles de titulación',
  ['Requisito','Aplicables','Cumplen','No cumplen','Sin verificar','No aplica','Cumplimiento'],reqRows,
  individual?'Los estados sin verificar no se presentan como incumplimientos. El porcentaje se calcula sobre requisitos aplicables':
  'El resumen agregado permite comprobar el cumplimiento, pero no separa los otros estados administrativos');
 out+=Figure('Cumplimiento por tipo de requisito',report.requirements.map(x=>[x.label,x.pct??0]),{
  max:100,percentage:true,decimals:2,note:'Porcentajes sobre el total de verificaciones aplicables; en la fuente agregada se utiliza el total registrado.'});
 out+=H(3,'4.3. Incidencias y priorización');
 out+=Table('Prioridad de revisión por requisito',
  ['Requisito','Incumplimientos','Sin verificar','Total de incidencias'],
  report.priorities.map(x=>[x.label,individual?x.fail:'No desglosado',individual?x.unknown:'No desglosado',
   individual?x.fail+x.unknown:x.unclassified]),
  'Se contabilizan verificaciones; una persona puede tener varios requisitos pendientes');
 if(report.priorities.length)out+=Figure('Incidencias por requisito',report.priorities.map(x=>[x.label,individual?x.fail+x.unknown:x.unclassified]),{
  note:'Incidencias de verificaciones, no estudiantes únicos.'});
 out+=H(3,'4.4. Incidencias por carrera');
 if(individual){
  const matrix=report.careers.map(c=>[
    c.name,c.total,...c.requirementCounts.slice(0,8).map(x=>x.fail+' / '+x.unknown)
  ]);
  out+=Table('Incumplimientos y estados no verificados por carrera',
   ['Carrera','n',...REQUIREMENTS.slice(0,8).map(x=>x.short)],matrix,
   'Cada celda contiene incumplimientos confirmados / sin verificar. ACA: Académico; DOC: Documentación; FIN: Financiero; PRA: Prácticas; VIN: Vinculación; SEG: Seguimiento; ING: Inglés; DAT: Actualización de datos');
 }else out+=para('La fuente agregada no permite determinar cuántas incidencias pertenecen a cada carrera o estudiante sin examinar su nómina. Se conserva el apartado para completarlo con la base privada.');
 out+=H(3,'4.5. Cumplimiento integral y preparación para la evaluación');
 out+=Table('Cumplimiento conjunto de los controles',
  ['Indicador','Estudiantes','Porcentaje'],
  [['Ocho requisitos previos completos',report.complete8,p(P(report.complete8,n))+' %'],
   ['Al menos un requisito previo no completo',report.notComplete8,p(P(report.notComplete8,n))+' %'],
   ['Nueve controles completos',report.complete9,p(P(report.complete9,n))+' %'],
   ['Al menos un control no completo',report.notComplete9,p(P(report.notComplete9,n))+' %']],
  'Los estados no completos pueden incluir falta de información; no constituyen evidencia automática de reprobación');
 out+=Figure('Estado de los ocho requisitos previos',
  [['Completos',report.complete8],['No completos',report.notComplete8]],{
  note:'Cumplimiento de requisitos; no acredita por sí solo habilitación formal ni aprobación académica.'});
 out+=H(3,'4.6. Seguimiento de casos que requieren revisión');
 if(individual){
  const rows=report.cases.map(c=>[c.name,c.id,c.career,
    c.fail9.length?c.fail9.join('; '):'—',c.unknown9.length?c.unknown9.join('; '):'—']);
  out+=Table('Estudiantes con requisitos no completos o sin verificar',
    ['Estudiante','Cédula','Carrera','No cumple','Sin verificar'],rows,
    'Nómina de seguimiento generada exclusivamente con la base local; una celda sin verificar no indica reprobación');
  if(!rows.length)out+=para('No se detectan registros con requisitos incumplidos o sin verificar en la nómina disponible.');
 }else out+=para('La relación nominal de estudiantes con requisitos pendientes se genera solamente cuando esté disponible la base privada. Este resumen público no contiene identificaciones.');
 out+=H(3,'4.7. Continuidad de la cohorte');
 if(report.reference){
  const r=report.reference;
  out+=Table('Indicadores documentados de continuidad',
   ['Indicador','Estudiantes','Población de referencia','Porcentaje'],
   [['Registrados inicialmente',r.initial,r.initial,'100,00 %'],
    ['Activos',r.active,r.initial,p(P(r.active,r.initial))+' %'],
    ['Retirados',r.withdrawn,r.initial,p(P(r.withdrawn,r.initial))+' %'],
    ['Alcanzaron la fase final',r.reachedFinal,r.initial,p(P(r.reachedFinal,r.initial))+' %'],
    ['No alcanzaron la fase final',r.notReachedFinal,r.initial,p(P(r.notReachedFinal,r.initial))+' %']],
    'Cifras documentales del Word de referencia. El avance a fase final no equivale al estado integral de los requisitos');
  if(report.source==='individual')out+=para('Estos indicadores documentales no sustituyen el registro nominal de retiros o participación. Su conciliación requiere evidencias individuales de continuidad.');
 }else out+=para(report.mode==='online'?
 'No consta en los documentos recibidos un consolidado verificable de matrícula inicial y retiros para la modalidad online. Por tanto, no se trasladan los valores de presencial.':
 'La nómina disponible es parcial; no se mezcla con los indicadores históricos de continuidad hasta comprobar que corresponde a la cohorte completa.');
 out+=H(3,'4.8. Análisis e interpretación de la Fase I');
 for(const x of insight(report))out+=para(x);
 out+=para('La priorización de verificaciones pendientes permite orientar la gestión administrativa, pero no establece causas del incumplimiento ni acredita la aprobación final de las modalidades de titulación.');
 return out;
}
const api=Object.freeze({REQUIREMENTS,classify,studentStatus,analyze,insight,renderReport,fmt,pct});
root.InformetitRequirements=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
