/* Informetit · Bloque 06 · Examen Complexivo: teoría 40 %, práctica 60 %.
   Cálculos académicos y evidencias son dimensiones independientes; ninguna nota se inventa. */
(function(root){
'use strict';
const WEIGHTS=Object.freeze({teoria:0.4,practica:0.6}),PASS=7;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=x=>String(x??'').trim();
const grade=x=>{
 if(x===null||x===undefined||text(x)==='')return null;
 const num=Number(text(x).replace(',','.'));
 return Number.isFinite(num)&&num>=0&&num<=10?num:null;
};
const inputGrade=(x,label)=>{
 if(x===null||x===undefined||text(x)==='')return null;
 const n=grade(x);if(n===null)throw Error(label+' debe estar entre 0 y 10; deja vacío para pendiente.');
 if(!/^\d{1,2}(?:[.,]\d{1,2})?$/.test(text(x)))throw Error(label+' admite como máximo dos decimales.');
 return n;
};
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
const num=(x)=>x===null||x===undefined?'—':Number(x).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2});
const percent=(x,n)=>n?round(100*x/n):null;
const key=x=>root.InformetitDataModel?.career(x)||text(x).toUpperCase();
function weighted(teoria,practica){
 const a=grade(teoria),b=grade(practica);
 return a===null||b===null?null:round(a*WEIGHTS.teoria+b*WEIGHTS.practica);
}
const attend=value=>['presentado','no_presentado'].includes(value)?value:'pendiente';
const blank=()=>({teoria:null,practica:null,asistencia:'pendiente'});
function normalize(raw){
 const legacy=!(raw&&raw.ordinario);
 const ordinary={...blank(),...(raw?.ordinario||{})};
 if(legacy){
  ordinary.teoria=raw?.one??null;
  ordinary.practica=raw?.two??null;
  if(raw?.status==='no_presentado')ordinary.asistencia='no_presentado';
  else if(grade(ordinary.teoria)!==null||grade(ordinary.practica)!==null)ordinary.asistencia='presentado';
 }
 const recovery={...blank(),...(raw?.supletorio||{})};
 if(legacy&&raw?.rescue!==undefined)recovery.notaFinal=raw.rescue;
 if(legacy&&grade(recovery.notaFinal)!==null)recovery.asistencia='presentado';
 return {
  studentId:text(raw?.studentId),tipo:raw?.tipo||'complexivo',
  ordinario:{teoria:ordinary.teoria??null,practica:ordinary.practica??null,asistencia:attend(ordinary.asistencia)},
  supletorio:{teoria:recovery.teoria??null,practica:recovery.practica??null,
    notaFinal:recovery.notaFinal??null,asistencia:attend(recovery.asistencia)},
  actaOrdinario:text(raw?.actaOrdinario||raw?.source),actaSupletorio:text(raw?.actaSupletorio),
  estadoActa:raw?.status||'',fecha:raw?.updated||'',actaCotejada:raw?.actaCotejada===true,legacy,
  raw
 };
}
function evaluate(source){
 const r=normalize(source),warnings=[];
 const o=r.ordinario,s=r.supletorio;
 const ordinary=weighted(o.teoria,o.practica),recoveryComponents=weighted(s.teoria,s.practica),
   recoveryExplicit=grade(s.notaFinal);
 if((o.teoria!==null&&grade(o.teoria)===null)||(o.practica!==null&&grade(o.practica)===null))
  warnings.push('Calificación ordinaria inválida; se excluye del cálculo.');
 if((s.teoria!==null&&grade(s.teoria)===null)||(s.practica!==null&&grade(s.practica)===null)||
   (s.notaFinal!==null&&recoveryExplicit===null))
  warnings.push('Calificación supletoria inválida; se excluye del cálculo.');
 if(o.asistencia==='no_presentado'&&(grade(o.teoria)!==null||grade(o.practica)!==null))
  warnings.push('Ordinario marcado como no presentado, pero contiene notas.');
 if(s.asistencia==='no_presentado'&&(grade(s.teoria)!==null||grade(s.practica)!==null||recoveryExplicit!==null))
  warnings.push('Supletorio marcado como no presentado, pero contiene notas.');
 if(recoveryExplicit!==null&&recoveryComponents!==null&&recoveryExplicit!==recoveryComponents)
  warnings.push('La nota final supletoria difiere del cálculo 40/60; revise el acta.');
 const recovery=recoveryComponents!==null?recoveryComponents:recoveryExplicit;
 const ordinaryValid=o.asistencia!=='no_presentado'&&ordinary!==null;
 const recoveryValid=s.asistencia!=='no_presentado'&&recovery!==null;
 let status='pendiente',finalGrade=null,path='sin_evaluacion';
 if(o.asistencia==='no_presentado'){
  status='no_presentado';path='ordinario_ausente';
 }else if(ordinaryValid){
  if(ordinary>=PASS){
   status='aprobado_ordinario';finalGrade=ordinary;path='ordinario';
   if(recoveryValid||s.asistencia==='no_presentado')warnings.push('Existe supletorio para un estudiante aprobado en ordinario.');
  }else if(recoveryValid){
   finalGrade=recovery;
   status=recovery>=PASS?'aprobado_supletorio':'reprobado';
   path='supletorio';
  }else if(s.asistencia==='no_presentado'){
   status='no_presentado_supletorio';path='supletorio_ausente';
  }else{status='supletorio_pendiente';path='ordinario_insuficiente'}
 }
 if(ordinary===null&&(grade(o.teoria)!==null||grade(o.practica)!==null))
  warnings.push('Falta uno de los componentes del ordinario (teoría/práctica).');
 if(recoveryComponents===null&&(grade(s.teoria)!==null||grade(s.practica)!==null)&&recoveryExplicit===null)
  warnings.push('Falta un componente del supletorio o la nota final del acta.');
 if(recoveryValid&&ordinary===null&&o.asistencia!=='no_presentado')
  warnings.push('Hay supletorio sin calificación ordinaria completa; el resultado queda pendiente.');
 const needsSuple=ordinaryValid&&ordinary<PASS;
 const requiresActa=path==='ordinario'?['ordinario']:path==='supletorio'?['ordinario','supletorio']:[];
 const verified=requiresActa.length>0&&requiresActa.every(t=>!!(t==='ordinario'?r.actaOrdinario:r.actaSupletorio))&&warnings.length===0;
 const declared=r.estadoActa.toLowerCase();
 const inferred=status.startsWith('aprobado')?'aprobado':status==='reprobado'?'reprobado':
   status.startsWith('no_presentado')?'no_presentado':'pendiente';
 if(['aprobado','reprobado','no_presentado'].includes(declared)&&declared!==inferred)
  warnings.push('El estado anterior del acta ('+declared+') difiere del resultado calculado ('+inferred+').');
 return {...r,ordinary,recovery,finalGrade,path,status,warnings,verified:verified&&warnings.length===0,
  needsSuple,ordinaryComplete:ordinaryValid,recoveryComplete:recoveryValid,
  hasRecordedOrdinary:grade(o.teoria)!==null||grade(o.practica)!==null||o.asistencia==='no_presentado',
  hasRecordedRecovery:grade(s.teoria)!==null||grade(s.practica)!==null||recoveryExplicit!==null||s.asistencia==='no_presentado'};
}
const DESCRIPTIONS=Object.freeze({
 aprobado_ordinario:'Aprobado en ordinario',aprobado_supletorio:'Aprobado en supletorio',
 reprobado:'Reprobado después de supletorio',no_presentado:'No presentado al ordinario',
 no_presentado_supletorio:'No presentado al supletorio',supletorio_pendiente:'Supletorio pendiente',
 pendiente:'Evaluación pendiente'
});
function analyze(state,mode='presencial'){
 const actual=mode==='online'?'online':'presencial',M=root.InformetitDataModel;
 if(!M)throw Error('Motor central de estudiantes no disponible');
 const students=(state?.estudiantes||[]).filter(s=>s.modalidad===actual&&s.tipoTitulacion==='complexivo');
 const grouped=new Map();for(const raw of state?.evaluaciones||[]){
  if(!raw?.studentId||raw.tipo==='trabajo')continue;
  const student=students.find(x=>String(x.id)===String(raw.studentId));
  if(!student)continue;
  const id=String(raw.studentId),items=grouped.get(id)||[];items.push(raw);grouped.set(id,items);
 }
 const records=students.map(s=>{
  const source=grouped.get(String(s.id))||[],duplicate=source.length>1;
  const e=source.length===1?evaluate(source[0]):null;
  const status=duplicate?'conflicto_duplicado':e?.status||'pendiente';
  return {studentId:String(s.id),student:s,name:s.nombre,career:s.carrera,careerKey:M.career(s.carrera),
   tipo:s.tipoTitulacion||'complexivo',rawCount:source.length,duplicate,
   evaluation:e,status,finalGrade:e?.finalGrade??null,ordinary:e?.ordinary??null,
   recovery:e?.recovery??null,verified:!!e?.verified};
 }).sort((a,b)=>a.career.localeCompare(b.career,'es')||a.name.localeCompare(b.name,'es')||a.studentId.localeCompare(b.studentId));
 const calc=items=>{
  const d={eligible:items.length,withRecord:items.filter(x=>!!x.evaluation).length,
    ordinaryComplete:items.filter(x=>x.evaluation?.ordinaryComplete).length,
    ordinaryApproved:items.filter(x=>x.status==='aprobado_ordinario').length,
    ordinaryInsufficient:items.filter(x=>x.evaluation?.needsSuple).length,
    supletorioComplete:items.filter(x=>x.evaluation?.recoveryComplete).length,
    recovered:items.filter(x=>x.status==='aprobado_supletorio').length,
    failed:items.filter(x=>x.status==='reprobado').length,
    noPresentado:items.filter(x=>x.status==='no_presentado'||x.status==='no_presentado_supletorio').length,
    pending:items.filter(x=>x.status==='pendiente'||x.status==='supletorio_pendiente').length,
    duplicate:items.filter(x=>x.duplicate).length,
    approved:items.filter(x=>x.status.startsWith('aprobado_')).length,
    verified:items.filter(x=>x.verified).length,
    withoutEvidence:items.filter(x=>x.evaluation&&x.finalGrade!==null&&!x.verified).length
  };
  d.ordinaryMean=mean(items.map(x=>x.ordinary));
  d.finalMean=mean(items.map(x=>x.finalGrade));
  d.approvalRate=d.eligible?percent(d.approved,d.eligible):null;
  d.evaluatedRate=d.eligible?percent(d.ordinaryComplete,d.eligible):null;
  d.pendingIncludesNotRecorded=items.filter(x=>!x.evaluation).length;
  return d;
 };
 const careers=[...new Set(records.map(x=>x.careerKey))].map(careerKey=>{
  const items=records.filter(x=>x.careerKey===careerKey);
  return {key:careerKey,name:items[0].career,records:items,stats:calc(items)};
 }).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 const counts=calc(records),issues=records.filter(x=>x.duplicate||x.evaluation?.warnings.length);
 return {mode:actual,records,careers,counts,issues,source:students.length?'base_local_individual':'sin_nomina',
  hasGrades:counts.ordinaryComplete>0||counts.supletorioComplete>0};
}
function mean(xs){const items=xs.filter(x=>x!==null&&x!==undefined);return items.length?
  round(items.reduce((a,b)=>a+b,0)/items.length):null}
function upsert(state,studentId,input,stamp){
 const M=root.InformetitDataModel,student=(state?.estudiantes||[]).find(x=>String(x.id)===String(studentId));
 if(!student)throw Error('Selecciona un estudiante de la nómina.');
 if(student.tipoTitulacion!=='complexivo')throw Error('Clasifica primero al estudiante en Examen Complexivo; no se registran evaluaciones de mecanismos sin definir ni de Trabajo de Titulación.');
 const next=M.migrate(state),entries=(next.evaluaciones||[]).filter(e=>String(e.studentId)===String(studentId)&&e.tipo!=='trabajo');
 if(entries.length>1)throw Error('El estudiante tiene evaluaciones duplicadas; hay que conciliarlas antes de guardar.');
 const old=entries.length?entries[0]:null;
 const o={
  studentId:String(studentId),tipo:'complexivo',
  ordinario:{teoria:inputGrade(input.ordTeoria,'Teoría ordinaria'),practica:inputGrade(input.ordPractica,'Práctica ordinaria'),
    asistencia:attend(input.ordAsistencia)},
  supletorio:{teoria:inputGrade(input.supTeoria,'Teoría supletoria'),practica:inputGrade(input.supPractica,'Práctica supletoria'),
    notaFinal:inputGrade(input.supFinal,'Nota final del supletorio'),asistencia:attend(input.supAsistencia)},
  actaOrdinario:text(input.actaOrdinario),actaSupletorio:text(input.actaSupletorio),
  actaCotejada:input.actaCotejada===true,updated:stamp,
  status:'pendiente'
 };
 const calculated=evaluate(o);
 if(calculated.warnings.some(w=>/inválid|marcado como no presentado|difiere del cálculo|supletorio para un estudiante aprobado|sin calificación ordinaria/i.test(w)))
  throw Error(calculated.warnings.join(' '));
 // El estado es una conclusión derivada, nunca un selector manual editable.
 o.status=calculated.status.startsWith('aprobado_')?'aprobado':calculated.status==='reprobado'?'reprobado':
  calculated.status.startsWith('no_presentado')?'no_presentado':'pendiente';
 if(old){
  const index=next.evaluaciones.findIndex(e=>e===old || (e.studentId===old.studentId&&e.tipo===old.tipo));
  if(index>=0)next.evaluaciones[index]=o;
 }else next.evaluaciones.push(o);
 next.auditoria.push({tipo:'registro_examen_complexivo',studentId:String(studentId),fecha:stamp,
   anterior:old||null,nuevo:o,notaCalculada:calculated.finalGrade,estado:calculated.status});
 return {next,result:calculated};
}
function renderReport(data,{Table,Figure,H,para,F,P}){
 let out=H(2,'7. Fase III. Evaluación del Examen Complexivo');
 out+=para('La calificación del examen ordinario se calcula con el 40 % del componente teórico y el 60 % del componente práctico, en escala de cero a diez. La aprobación académica requiere una nota mínima de 7,00. El informe distingue el resultado calculado del respaldo institucional mediante actas.');
 out+=para('El supletorio se registra por separado. Cuando dispone de componentes teórico y práctico se aplica la ponderación 40/60; cuando existe únicamente una nota final consignada en el acta, esta se conserva como dato expreso, sin descomponerla artificialmente. El resultado definitivo procede del ordinario si aprueba o del supletorio registrado cuando el ordinario es insuficiente. Si todavía falta el supletorio, el estado permanece pendiente.');
 out+=H(3,'7.1. Cobertura de evaluación y mecanismos');
 const c=data.counts;
 out+=Table('Cobertura de Examen Complexivo en la modalidad '+data.mode,
 ['Indicador','Estudiantes','Porcentaje de convocados en la nómina'],[
  ['Estudiantes identificados en Examen Complexivo',c.eligible,'100,00 %'],
  ['Con evaluación registrada',c.withRecord,c.eligible?num(percent(c.withRecord,c.eligible))+' %':'No calculable'],
  ['Con ordinario calculable',c.ordinaryComplete,c.eligible?num(percent(c.ordinaryComplete,c.eligible))+' %':'No calculable'],
  ['Con supletorio calculable',c.supletorioComplete,c.eligible?num(percent(c.supletorioComplete,c.eligible))+' %':'No calculable'],
  ['Pendientes o sin notas',c.pending,c.eligible?num(percent(c.pending,c.eligible))+' %':'No calculable'],
  ['Registros duplicados por conciliar',c.duplicate,c.eligible?num(percent(c.duplicate,c.eligible))+' %':'No calculable']
 ],'El denominador corresponde a estudiantes clasificados como Complexivo en la nómina local, no a todos los matriculados');
 if(data.source==='sin_nomina'){
  out+=para('No consta una nómina nominal local de Examen Complexivo para esta modalidad. No se calculan resultados de aprobación a partir de los requisitos, las notas de núcleos ni los estados generales de Firebase.');
 }else{
  out+=H(3,'7.2. Resultados ordinarios, supletorios y definitivos');
  out+=Table('Resultados calculados del Examen Complexivo',
   ['Resultado académico','Estudiantes','Sobre estudiantes de Complexivo'],[
   ['Aprobados en ordinario',c.ordinaryApproved,num(percent(c.ordinaryApproved,c.eligible))+' %'],
   ['Ordinarios insuficientes que requieren supletorio',c.ordinaryInsufficient,num(percent(c.ordinaryInsufficient,c.eligible))+' %'],
   ['Aprobados mediante supletorio',c.recovered,num(percent(c.recovered,c.eligible))+' %'],
   ['Reprobados después del supletorio',c.failed,num(percent(c.failed,c.eligible))+' %'],
   ['No presentados (ordinario o supletorio)',c.noPresentado,num(percent(c.noPresentado,c.eligible))+' %'],
   ['Pendientes de evaluación o supletorio',c.pending,num(percent(c.pending,c.eligible))+' %'],
   ['Aprobados totales calculados',c.approved,num(percent(c.approved,c.eligible))+' %'],
   ['Con referencia de acta registrada',c.verified,num(percent(c.verified,c.eligible))+' %']
  ],'Se separan resultados calculados y actas disponibles; un pendiente no equivale a reprobado');
  out+=Figure('Resultados del Examen Complexivo — '+data.mode,[
    ['Aprobados en ordinario',c.ordinaryApproved],['Recuperados',c.recovered],['Reprobados',c.failed],
    ['No presentados',c.noPresentado],['Pendientes',c.pending],['Duplicados',c.duplicate]
  ],{note:'Frecuencias por estado calculado; no incluyen estudiantes clasificados como Trabajo de Titulación.'});
  out+=para('De '+c.eligible+' estudiantes clasificados como Examen Complexivo, '+c.ordinaryComplete+
   ' cuentan con un ordinario calculable. A partir de las calificaciones registradas, '+c.ordinaryApproved+
   ' aprobaron directamente y '+c.recovered+' aprobaron mediante supletorio. Permanecen '+c.pending+
   ' sin resultado completo, '+c.noPresentado+' con una ausencia explícita y '+c.duplicate+
   ' con registros duplicados. '+c.verified+' resultados tienen referencias de acta registradas; su autenticidad y contenido aún deben contrastarse con los documentos institucionales.');
  out+=H(3,'7.3. Resultados por carrera');
  out+=Table('Consolidado de Examen Complexivo por carrera',
   ['Carrera','Convocados','Ordinarios calculables','Aprobados ordinarios','Aprobados supletorio'],
   data.careers.map(x=>[x.name,x.stats.eligible,x.stats.ordinaryComplete,
     x.stats.ordinaryApproved,x.stats.recovered]),
   'El ordinario se pondera 40 % teoría y 60 % práctica');
  out+=Table('Estados finales de Examen Complexivo por carrera',
   ['Carrera','Reprobados','Ausentes','Pendientes','Aprobados','Tasa de aprobación'],
   data.careers.map(x=>[x.name,x.stats.failed,x.stats.noPresentado,x.stats.pending,x.stats.approved,
     x.stats.approvalRate===null?'No calculable':num(x.stats.approvalRate)+' %']),
   'La tasa toma como denominador la nómina de Complexivo de cada carrera');
  out+=Figure('Aprobación calculada por carrera',
    data.careers.map(x=>[x.name,x.stats.approvalRate??0]),{
     max:100,percentage:true,decimals:2,
     note:'Porcentaje sobre la nómina de Complexivo de cada carrera. Una barra de cero puede corresponder a falta de notas; consultar la tabla de cobertura.'});
  out+=H(3,'7.4. Resultados individuales por carrera');
  for(const [careerIndex,c] of data.careers.entries()){
   out+=H(3,'7.4.'+(careerIndex+1)+'. '+c.name);
   out+=Table('Ordinario, supletorio y resultado definitivo — '+c.name,
    ['Estudiante','Cédula','Teoría ordinario','Práctica ordinario','Ordinario','Supletorio'],
    c.records.map(x=>[x.name,x.studentId,
      x.evaluation?num(grade(x.evaluation.ordinario.teoria)):'—',
      x.evaluation?num(grade(x.evaluation.ordinario.practica)):'—',
      x.ordinary===null?'—':num(x.ordinary),x.recovery===null?'—':num(x.recovery)]),
    'Una nota ausente no se convierte en cero ni en reprobación');
   out+=Table('Resultado definitivo y actas — '+c.name,
    ['Estudiante','Cédula','Definitiva','Estado','Acta'],
    c.records.map(x=>[x.name,x.studentId,
      x.finalGrade===null?'—':num(x.finalGrade),
      x.duplicate?'Duplicado':DESCRIPTIONS[x.status]||x.status,
      x.verified?'Con referencia':'Sin evidencia completa']),
    'La referencia documental se revisa frente al acta institucional');
   const followup=c.records.filter(x=>x.status==='pendiente'||x.status==='supletorio_pendiente'||x.duplicate||x.evaluation?.warnings.length);
   out+=Table('Seguimiento de evaluaciones y actas — '+c.name,
    ['Estudiante','Cédula','Situación','Acción requerida'],
    followup.map(x=>[x.name,x.studentId,x.duplicate?'Duplicado':DESCRIPTIONS[x.status]||'Revisar',
      x.duplicate?'Conciliar registros':x.evaluation?.warnings.length?x.evaluation.warnings.join('; '):
       x.status==='supletorio_pendiente'?'Registrar recuperación o acta': 'Completar ordinario o confirmar asistencia']),
    'Lista de control independiente; no se equiparan datos faltantes con estudiantes reprobados');
   out+=para('La carrera '+c.name+' registra '+c.stats.ordinaryComplete+' ordinarios calculables entre '+
    c.stats.eligible+' estudiantes de Complexivo; '+c.stats.approved+' presentan aprobación calculada y '+
    c.stats.pending+' permanecen pendientes. La interpretación es descriptiva y está sujeta a la completitud de notas y actas.');
  }
  out+=H(3,'7.5. Conciliación y control de actas');
  out+=Table('Estado de evidencias del Examen Complexivo',
   ['Control','Registros'],[['Resultados con referencias de acta registradas',c.verified],
    ['Notas finales calculadas sin evidencia completa',c.withoutEvidence],
    ['Evaluaciones sin registro',c.pendingIncludesNotRecorded],['Registros duplicados',c.duplicate],
    ['Casos con advertencias',data.issues.length]],
   'La presencia de una referencia no verifica el documento ni equivale a su aprobación formal; los cálculos sin acta permanecen en borrador');
 }
 out+=H(3,data.source==='sin_nomina'?'7.2. Interpretación y límites':'7.6. Interpretación y límites');
 out+=para('El cumplimiento de requisitos, las notas de los núcleos estructurantes y los estados CUMPLE/NO CUMPLE en Firebase no sustituyen el resultado del Examen Complexivo. Las cifras de aprobación se calculan únicamente desde los componentes teórico y práctico o desde la nota de recuperación registrada en las actas.');
 out+=para('Las referencias de actas son datos declarados, no documentos autenticados. Para cerrar esta fase como definitiva se requiere comprobar la totalidad de las actas ordinarias y supletorias, resolver duplicados, registrar las inasistencias e identificar de forma explícita a quienes siguen pendientes.');
 return out;
}
const api=Object.freeze({WEIGHTS,PASS,grade,inputGrade,weighted,normalize,evaluate,analyze,upsert,renderReport,
 DESCRIPTIONS,num,percent,mean});
root.InformetitComplexivo=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
