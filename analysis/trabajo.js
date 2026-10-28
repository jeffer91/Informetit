/* Informetit · Bloque 07 · Trabajo de Titulación.
   Cálculo según ejemplo de acta: 60 % escrito, 40 % oral. Validar norma institucional. */
(function(root){
'use strict';
const WRITTEN_WEIGHT=.6,ORAL_WEIGHT=.4,PASS=7;
const PRACTICA=Object.freeze([
 {key:'diseno',name:'Diseño',max:2.5},
 {key:'construccion',name:'Construcción',max:2.5},
 {key:'funcionamiento',name:'Funcionamiento',max:2.5},
 {key:'aplicacion',name:'Aplicación',max:2.5}]);
const DEFENSA=Object.freeze([
 {key:'marco',name:'Sustento del marco teórico',max:2},
 {key:'propuesta',name:'Sustento de la propuesta',max:2},
 {key:'recursos',name:'Uso de recursos',max:2},
 {key:'preguntas',name:'Solventar preguntas',max:4}]);
const txt=x=>String(x??'').trim();
const valid=x=>{
 if(x===null||x===undefined||txt(x)==='')return null;
 const n=Number(txt(x).replace(',','.'));return Number.isFinite(n)&&n>=0&&n<=10?n:null;
};
const fixed=n=>Math.round((n+Number.EPSILON)*100)/100;
const percent=(x,n)=>n?fixed(x*100/n):null;
const fmt=n=>n===null||n===undefined?'Sin nota':Number(n).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2});
const blankVocal=()=>({nombre:'',practica:{},defensa:{}});
const blank=studentId=>({studentId:txt(studentId),numeroActa:'',fechaActa:'',tutor:null,lector:null,
 asistencia:'pendiente',vocales:[blankVocal(),blankVocal(),blankVocal()],
 supletorio:{notaFinal:null,numeroActa:'',fechaActa:'',asistencia:'pendiente'},actualizado:''});
const stateOf=x=>['presentado','no_presentado'].includes(x)?x:'pendiente';
function num(x,label,max=10){
 if(x===null||x===undefined||txt(x)==='')return null;
 const n=valid(x);
 if(n===null||n>max)throw Error(label+' debe estar entre 0 y '+String(max).replace('.',',')+'.');
 if(!/^\d{1,2}(?:[.,]\d{1,2})?$/.test(txt(x)))throw Error(label+' admite máximo dos decimales.');
 return n;
}
function normalize(raw){
 const record=blank(raw?.studentId);
 if(!raw||typeof raw!=='object')return record;
 record.numeroActa=txt(raw.numeroActa);
 record.fechaActa=txt(raw.fechaActa);
 record.tutor=raw.tutor??null;record.lector=raw.lector??null;
 record.asistencia=stateOf(raw.asistencia);
 record.vocales=Array.from({length:3},(_,i)=>({
   nombre:txt(raw.vocales?.[i]?.nombre),
   practica:{...(raw.vocales?.[i]?.practica||{})},
   defensa:{...(raw.vocales?.[i]?.defensa||{})}
 }));
 record.supletorio={notaFinal:raw.supletorio?.notaFinal??null,
   numeroActa:txt(raw.supletorio?.numeroActa),fechaActa:txt(raw.supletorio?.fechaActa),
   asistencia:stateOf(raw.supletorio?.asistencia)};
 record.actualizado=txt(raw.actualizado);
 return record;
}
function sumRubric(vocal,criteria,field){
 const scores=criteria.map(c=>valid(vocal?.[field]?.[c.key]));
 if(scores.some(x=>x===null))return null;
 if(scores.some((x,i)=>x>criteria[i].max))return null;
 return fixed(scores.reduce((sum,n)=>sum+n,0));
}
function average(values){return values.length&&values.every(x=>x!==null&&x!==undefined)?
 values.reduce((a,b)=>a+b,0)/values.length:null}
function evaluate(input){
 const r=normalize(input),warnings=[];
 if(r.asistencia==='no_presentado'){
  const contradictory=valid(r.tutor)!==null||valid(r.lector)!==null||
   r.vocales.some(v=>[...PRACTICA.map(k=>v.practica[k.key]),...DEFENSA.map(k=>v.defensa[k.key])]
    .some(g=>valid(g)!==null));
  if(contradictory)warnings.push('El estudiante figura como no presentado, pero tiene calificaciones registradas.');
  return {...r,practices:[null,null,null],defenses:[null,null,null],
    written:null,practical:null,defense:null,oral:null,ordinary:null,recovery:null,
    definitive:null,status:'no_presentado',warnings,actaReferenced:!!r.numeroActa,complete:false};
 }
 for(const [label,v] of [['Tutor',r.tutor],['Lector',r.lector]]){
  if(v!==null&&v!==undefined&&txt(v)!==''&&valid(v)===null)warnings.push(label+' contiene una nota inválida.');
 }
 const written=average([valid(r.tutor),valid(r.lector)]);
 const practices=r.vocales.map(v=>sumRubric(v,PRACTICA,'practica'));
 const defenses=r.vocales.map(v=>sumRubric(v,DEFENSA,'defensa'));
 for(let i=0;i<3;i++){
  for(const [field,criteria] of [['practica',PRACTICA],['defensa',DEFENSA]]){
   for(const c of criteria){
    const value=r.vocales[i][field][c.key];
    if(value!==undefined&&value!==null&&txt(value)!==''){
     const n=valid(value);
     if(n===null||n>c.max)warnings.push('Vocal '+(i+1)+', '+c.name+': puntaje inválido.');
    }
   }
  }
 }
 const practical=average(practices),defense=average(defenses);
 const oral=practical!==null&&defense!==null?(practical+defense)/2:null;
 const ordinary=written!==null&&oral!==null?fixed(written*WRITTEN_WEIGHT+oral*ORAL_WEIGHT):null;
 const supplement=valid(r.supletorio.notaFinal);
 if(r.supletorio.notaFinal!==null&&txt(r.supletorio.notaFinal)!==''&&supplement===null)
  warnings.push('La nota final de supletorio es inválida.');
 if(r.supletorio.asistencia==='no_presentado'&&supplement!==null)
  warnings.push('Supletorio figura como no presentado pero tiene nota.');
 if(ordinary!==null&&ordinary>=PASS&&supplement!==null)
  warnings.push('Existe nota de supletorio para un proyecto aprobado inicialmente.');
 if(ordinary===null&&supplement!==null)
  warnings.push('La nota supletoria carece de calificación ordinaria completa.');
 let status='pendiente',definitive=null;
 if(ordinary!==null){
  if(ordinary>=PASS){status='aprobado_ordinario';definitive=ordinary}
  else if(supplement!==null&&r.supletorio.asistencia!=='no_presentado'){
   status=supplement>=PASS?'aprobado_supletorio':'reprobado';
   definitive=supplement;
  }else if(r.supletorio.asistencia==='no_presentado')status='no_presentado_supletorio';
  else status='supletorio_pendiente';
 }
 const complete=ordinary!==null;
 return {...r,practices,defenses,written,practical,defense,oral,ordinary,recovery:supplement,
  definitive,status,warnings,complete,
  actaReferenced:!!r.numeroActa&&(status!=='aprobado_supletorio'&&status!=='reprobado'||
    !!r.supletorio.numeroActa)};
}
const STATES=Object.freeze({
 aprobado_ordinario:'Aprobado en defensa ordinaria',aprobado_supletorio:'Aprobado en supletorio',
 reprobado:'Reprobado después del supletorio',no_presentado:'No presentado',
 no_presentado_supletorio:'No presentado al supletorio',
 supletorio_pendiente:'Supletorio pendiente',pendiente:'Defensa pendiente',
 conflicto_duplicado:'Registro duplicado'
});
function upsert(state,studentId,input,stamp){
 const M=root.InformetitDataModel;
 const st=(state?.estudiantes||[]).find(x=>String(x.id)===String(studentId));
 if(!st)throw Error('Estudiante no encontrado en la nómina.');
 if(st.tipoTitulacion!=='trabajo')throw Error('El estudiante está asignado a Examen Complexivo.');
 const existing=(state.trabajos||[]).filter(x=>String(x.studentId)===String(studentId));
 if(existing.length>1)throw Error('Existen proyectos duplicados: concilia antes de actualizar.');
 const next=M.migrate(state),r=blank(studentId);
 r.numeroActa=txt(input.numeroActa);
 r.fechaActa=txt(input.fechaActa);
 r.asistencia=stateOf(input.asistencia);
 r.tutor=num(input.tutor,'Calificación del tutor');
 r.lector=num(input.lector,'Calificación del lector');
 r.vocales=Array.from({length:3},(_,i)=>{
  const vocal={nombre:txt(input.vocales?.[i]?.nombre),practica:{},defensa:{}};
  for(const [field,criteria] of [['practica',PRACTICA],['defensa',DEFENSA]]){
   for(const c of criteria)vocal[field][c.key]=num(input.vocales?.[i]?.[field]?.[c.key],
      'Vocal '+(i+1)+' · '+c.name,c.max);
  }
  return vocal;
 });
 r.supletorio={notaFinal:num(input.supletorio?.notaFinal,'Nota supletoria'),
  numeroActa:txt(input.supletorio?.numeroActa),fechaActa:txt(input.supletorio?.fechaActa),
  asistencia:stateOf(input.supletorio?.asistencia)};
 r.actualizado=stamp;
 const calculated=evaluate(r);
 if(calculated.warnings.length)throw Error(calculated.warnings.join(' '));
 const idx=next.trabajos.findIndex(x=>String(x.studentId)===String(studentId));
 const previous=idx>=0?next.trabajos[idx]:null;
 if(idx>=0)next.trabajos[idx]=r;else next.trabajos.push(r);
 next.auditoria.push({tipo:'registro_trabajo_titulacion',studentId,fecha:stamp,anterior:previous,nuevo:r,
  resultado:calculated.status,notaCalculada:calculated.definitive});
 return {next,result:calculated};
}
function analyze(state,mode='presencial'){
 const M=root.InformetitDataModel;
 const m=mode==='online'?'online':'presencial';
 const students=(state?.estudiantes||[]).filter(x=>x.modalidad===m&&x.tipoTitulacion==='trabajo');
 const entries=students.map(st=>{
  const ids=(state.trabajos||[]).filter(x=>String(x.studentId)===String(st.id));
  const duplicate=ids.length>1;
  const calc=ids.length===1?evaluate(ids[0]):null;
  return {id:st.id,name:st.nombre,career:st.carrera,key:M.career(st.carrera),student:st,
   record:calc,status:duplicate?'conflicto_duplicado':calc?.status||'pendiente',
   grade:calc?.definitive??null,duplicate};
 }).sort((a,b)=>a.career.localeCompare(b.career,'es')||a.name.localeCompare(b.name,'es'));
 function counts(list){
  const result={eligible:list.length,recorded:list.filter(x=>!!x.record).length,
   complete:list.filter(x=>x.record?.complete).length,
   approvedOrdinary:list.filter(x=>x.status==='aprobado_ordinario').length,
   approvedRescue:list.filter(x=>x.status==='aprobado_supletorio').length,
   failed:list.filter(x=>x.status==='reprobado').length,
   noPresented:list.filter(x=>x.status.startsWith('no_presentado')).length,
   pending:list.filter(x=>['pendiente','supletorio_pendiente'].includes(x.status)).length,
   duplicates:list.filter(x=>x.duplicate).length,
   referenced:list.filter(x=>x.record?.actaReferenced&&x.grade!==null&&!x.record.warnings.length).length,
   withoutActa:list.filter(x=>x.grade!==null&&!x.record?.actaReferenced).length};
  result.approved=result.approvedOrdinary+result.approvedRescue;
  result.approvalRate=percent(result.approved,result.eligible);
  result.average=average(list.map(x=>x.grade).filter(x=>x!==null));
  return result;
 }
 const careers=[...new Set(entries.map(x=>x.key))].map(k=>{
  const rows=entries.filter(x=>x.key===k);
  return {name:rows[0].career,key:k,entries:rows,counts:counts(rows)};
 }).sort((a,b)=>a.name.localeCompare(b.name,'es'));
 return {mode:m,entries,careers,counts:counts(entries),source:entries.length?'nominal':'sin_nomina',
  legacy:(state.evaluaciones||[]).filter(x=>x.tipo==='trabajo'&&students.some(s=>String(s.id)===String(x.studentId)))};
}
function renderReport(dataset,{Table,Figure,H,para,F}){
 let out=H(2,'6. Trabajo de Titulación');
 out+=para('El Trabajo de Titulación se registra separadamente de Examen Complexivo. La rúbrica del acta institucional distingue calificación del tutor, lector, evaluación práctica y defensa ante tres vocales. Para reproducir el ejemplo facilitado, la nota final se obtiene con 60 % del promedio del trabajo escrito y 40 % del promedio oral. Esta ponderación debe cotejarse con la normativa vigente antes de validar el informe definitivo.');
 out+=H(3,'6.1. Estructura de la evaluación y cálculo');
 out+=Table('Estructura y ponderación del Trabajo de Titulación',
 ['Componente','Criterio','Escala o peso'],[
  ['Trabajo escrito','Promedio aritmético de tutor y lector','60 % del resultado final'],
  ['Práctica','Promedio de las puntuaciones de los tres vocales','50 % del promedio oral'],
  ['Defensa','Promedio de las puntuaciones de los tres vocales','50 % del promedio oral'],
  ['Oral','Promedio de práctica y defensa','40 % del resultado final'],
  ['Aprobación','Mínimo de la nota final','7,00/10']
 ],'La fórmula 60/40 deriva del ejemplo de acta aportado. Las puntuaciones vacías se excluyen de resultados hasta completar la rúbrica');
 out+=Table('Rúbrica práctica y defensa',
 ['Componente','Parámetro','Máximo por vocal'],
 [...PRACTICA.map(x=>['Práctica',x.name,fmt(x.max)]),...DEFENSA.map(x=>['Defensa',x.name,fmt(x.max)])],
 'Cada vocal registra individualmente ocho parámetros: práctica hasta 10 puntos y defensa hasta 10 puntos');
 const c=dataset.counts;
 out+=H(3,'6.2. Cobertura de Trabajo de Titulación');
 out+=para('La modalidad '+dataset.mode+' registra '+c.eligible+' estudiantes identificados con este mecanismo; '+
   c.complete+' cuentan con la rúbrica completa y '+c.pending+' permanecen pendientes de evaluación ordinaria o supletoria. '+
   'Las referencias de actas se reportan por separado de la validación efectiva del documento.');
 out+=Table('Situación de proyectos de titulación',
 ['Indicador','Estudiantes'],[
  ['Asignados a Trabajo de Titulación',c.eligible],['Con expediente registrado',c.recorded],
  ['Con calificación ordinaria calculable',c.complete],
  ['Aprobados en defensa ordinaria',c.approvedOrdinary],
  ['Aprobados mediante supletorio',c.approvedRescue],
  ['Reprobados tras recuperación',c.failed],
  ['No presentados',c.noPresented],
  ['Pendientes',c.pending],['Duplicados',c.duplicates],
  ['Con referencia de acta',c.referenced]],
  'No se incluyen en este consolidado las notas de núcleos ni los exámenes de Complexivo');
 out+=H(3,'6.3. Resultados por carrera y estudiante');
 out+=Table('Consolidado de Trabajo de Titulación por carrera',
 ['Carrera','Estudiantes','Rúbrica completa','Apr. ordinario','Apr. supletorio','Reprobado','Pendientes','Con acta'],
 dataset.careers.map(x=>[x.name,x.counts.eligible,x.counts.complete,x.counts.approvedOrdinary,
  x.counts.approvedRescue,x.counts.failed,x.counts.pending,x.counts.referenced]),
 'Población restringida a Trabajo de Titulación de la modalidad');
 if(dataset.careers.length)out+=Figure('Resultados de Trabajo de Titulación por carrera',
  dataset.careers.map(x=>[x.name,x.counts.approved]),{
  note:'Aprobaciones calculadas sobre las rúbricas disponibles; no indican validación de acta institucional.'});
 for(const career of dataset.careers){
  out+=H(3,'6.3. '+career.name);
  out+=Table('Calificaciones del proyecto y defensa — '+career.name,
    ['Estudiante','Cédula','Acta','Escrito','Práctica','Defensa','Promedio oral','Definitiva','Estado'],
    career.entries.filter(e=>e.record?.complete&&!e.duplicate).map(e=>[
      e.name,e.id,e.record.numeroActa||'Sin referencia',
      fmt(e.record.written),fmt(e.record.practical),fmt(e.record.defense),
      fmt(e.record.oral),fmt(e.grade),STATES[e.status]||e.status]),
    'Calificaciones procedentes de las actas o rúbricas individuales guardadas en Informetit; no se mezclan con los núcleos de Complexivo');
  for(const entry of career.entries.filter(x=>x.record&&!x.duplicate)){
   const r=entry.record;
   out+=H(3,'Detalle de acta de grado — '+entry.name);
   out+=Table('Identificación y calificación escrita del proyecto — '+entry.name,
    ['Dato','Registro'],[
      ['Estudiante',entry.name],['Cédula',entry.id],['Carrera',career.name],
      ['Número de acta',r.numeroActa||'Pendiente de registrar'],
      ['Fecha de acta',r.fechaActa||'Por definir'],
      ['Calificación del tutor',fmt(valid(r.tutor))],
      ['Calificación del lector',fmt(valid(r.lector))],
      ['Promedio escrito',fmt(r.written)]
    ],'Referencia documental declarada en la base local; pendiente de cotejo con el acta firmada');
   const rubricRows=(criteria,field)=>criteria.map(c=>[
     c.name,fmt(c.max),
     ...r.vocales.map(v=>fmt(valid(v[field][c.key])))
   ]);
   const rubricHeaders=['Parámetro','Máximo',
      ...r.vocales.map((v,i)=>'Vocal '+(i+1)+(v.nombre?' · '+v.nombre:''))];
   out+=Table('Puntajes de evaluación práctica — '+entry.name,rubricHeaders,
     [...rubricRows(PRACTICA,'practica'),
     ['Total práctica','10,00',...r.practices.map(fmt)]],
     'Se muestran los puntajes ingresados por cada vocal, sin completar valores ausentes');
   out+=Table('Puntajes de defensa del proyecto — '+entry.name,rubricHeaders,
     [...rubricRows(DEFENSA,'defensa'),
     ['Total defensa','10,00',...r.defenses.map(fmt)]],
     'Se muestran los puntajes de los tres vocales; los totales requieren todos los criterios');
   out+=Table('Cálculo final del proyecto — '+entry.name,
     ['Elemento','Calificación'],[
      ['Promedio escrito: tutor + lector',fmt(r.written)],
      ['Promedio evaluación práctica',fmt(r.practical)],
      ['Promedio defensa',fmt(r.defense)],
      ['Promedio oral: práctica + defensa',fmt(r.oral)],
      ['Nota final ordinaria: escrito 60 % + oral 40 %',fmt(r.ordinary)],
      ['Supletorio, cuando existe',fmt(r.recovery)],
      ['Nota final calculada',fmt(r.definitive)],
      ['Resultado',STATES[entry.status]||entry.status]
     ],'La ponderación reproduce el acta de ejemplo; confirmar su vigencia y aplicación institucional');
  }
  out+=Table('Seguimiento de proyectos pendientes — '+career.name,
    ['Estudiante','Cédula','Situación'],
    career.entries.filter(e=>!e.record?.complete||e.duplicate||e.status==='supletorio_pendiente').map(e=>[
      e.name,e.id,e.duplicate?'Duplicado':STATES[e.status]||'Incompleto']),
    'Los proyectos sin calificación no se consideran reprobados');
  out+=para('La carrera '+career.name+' registra '+career.counts.eligible+' estudiantes en Trabajo de Titulación. '+
   career.counts.approved+' presentan aprobación calculada y '+career.counts.pending+
   ' requieren completar o conciliar calificaciones y evidencias.');
 }
 out+=H(3,'6.4. Evidencias y limitaciones');
 out+=para('Se conservan el número y fecha de acta, los puntajes de cada vocal y la referencia de supletorio. Una referencia de acta no certifica por sí sola la autenticidad del documento ni la aprobación institucional. Los proyectos duplicados o incompletos no se incluyen en las medias.');
 if(dataset.legacy.length)out+=para('Existen '+dataset.legacy.length+' evaluaciones de Trabajo de Titulación registradas en el formulario antiguo. Se conservan en la base para conciliación; no se transforman automáticamente en una rúbrica de vocales ni se usan para derivar una calificación final.');
 return out;
}
const api=Object.freeze({PRACTICA,DEFENSA,WRITTEN_WEIGHT,ORAL_WEIGHT,PASS,STATES,blank,normalize,
 valid,num,sumRubric,average,evaluate,upsert,analyze,renderReport,fmt,percent});
root.InformetitTrabajo=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
