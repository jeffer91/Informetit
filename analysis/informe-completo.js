/* Informetit: extensión del informe institucional completo.
   Datos privados en memoria. No se promueven notas provisionales ni se crean notas ausentes. */
(function(root){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const M=()=>root.InformetitDataModel;
const format=(x,d=2)=>x===null||x===undefined||!Number.isFinite(Number(x))?'—':
 Number(x).toLocaleString('es-EC',{minimumFractionDigits:d,maximumFractionDigits:d});
const percentage=(a,b)=>b?format(100*a/b)+' %':'No calculable';
const plain=x=>String(x??'').trim();
const valid=x=>M().grade(x);
const type=x=>M().key(x);
const stats=values=>root.InformetitNuclei.stats(values.map(valid).filter(x=>x!==null));
const contains=(a,m)=>Array.isArray(a)&&a.some(x=>x.modalidad===m);
function byStudent(state){return new Map((state?.estudiantes||[]).map(s=>[String(s.id),s]));}
function courseSource(row){
 return plain(row.curso||row.nombreCurso||row.materia||row.course||row.courseName||
   (row.source&&/^Texto Moodle:/i.test(row.source)?row.source:'')||('Núcleo '+(row.nucleo||'?')));
}
function courseRows(state,mode){
 const roster=byStudent(state),list=[];
 for(const raw of [...state?.notas||[],...state?.cursosNucleos||[]]){
  const id=plain(raw.studentId||raw.cedula||raw.id?.split('|')[0]),st=roster.get(id);
  if(!st||st.modalidad!==mode)continue;
  const n=Number(raw.nucleo??raw.nucleus??0);
  const grade=valid(raw.nota),approved=raw.verificado===true||raw.verified===true||
    (Array.isArray(state.notas)&&state.notas.includes(raw)&&!['PROVISIONAL','SIMULADO','ESTIMADO'].includes(type(raw.estado||raw.status)));
  if(!approved||!Number.isInteger(n)||n<0||n>4||
   (grade===null&&!((state.cursosNucleos||[]).includes(raw)&&/no evaluado/i.test(String(raw.estadoAcademico||'')))))continue;
  const title=courseSource(raw),name=st.nombre||'Sin nombre';
  list.push({id,name,career:st.carrera,nucleo:n,course:title,
   teacher:plain(raw.docente||raw.teacher),grade,modality:mode,
   source:plain(raw.source||raw.fuente),status:grade===null?'No evaluado':grade>=7?'Aprobado':'Reprobado'});
 }
 const unique=new Map();
 for(const r of list){const k=[r.id,r.nucleo,r.course].join('|');if(!unique.has(k))unique.set(k,r)}
 return [...unique.values()];
}
function courseAnalysis(state,mode,helpers){
 const {H,Table,Figure,para}=helpers,rows=courseRows(state,mode),groups=new Map();
 for(const r of rows){
  const k=[M().career(r.career),r.nucleo,r.course].join('|');
  if(!groups.has(k))groups.set(k,[]);
  groups.get(k).push(r);
 }
 const all=stats(rows.map(r=>r.grade));
 let out=H(3,'5.4. Resultados individuales por curso o núcleo');
 if(!groups.size){
  out+=para('No se han cargado registros oficiales con identificación de curso y nota final para generar el desglose individual. La base de datos provisional se presenta por separado y no sustituye esta evidencia.');
  return out;
 }
 const ordered=[...groups.values()].sort((a,b)=>a[0].career.localeCompare(b[0].career,'es')||a[0].nucleo-b[0].nucleo||a[0].course.localeCompare(b[0].course,'es'));
 const careers=new Map();
 for(const row of rows){const key=M().career(row.career);if(!careers.has(key))careers.set(key,[]);careers.get(key).push(row.grade)}
 ordered.forEach((g,i)=>{
  const first=g[0],s=stats(g.map(x=>x.grade)),careerValues=stats(careers.get(M().career(first.career))||[]);
  const approved=g.filter(x=>x.grade!==null&&x.grade>=7).length,
   failed=g.filter(x=>x.grade!==null&&x.grade<7).length,notEvaluated=g.length-s.n;
  out+=H(3,'5.4.'+(i+1)+'. '+first.career+' — '+first.course);
  out+=para('El registro corresponde a '+(first.nucleo?'Núcleo '+first.nucleo:'un curso sin núcleo homologado')+' de '+first.career+
   (first.teacher?', a cargo de '+first.teacher:'; el docente no consta en los registros cargados')+
   '. Se muestran todos los estudiantes identificados en esta fuente, sin extrapolar resultados a personas no registradas.');
  out+=Table('Calificaciones individuales — '+first.course+' — '+first.career,
   ['Estudiante','Cédula','Nota final','Estado'],g.sort((a,b)=>a.name.localeCompare(b.name,'es')).map(x=>[x.name,x.id,format(x.grade),x.status]),
   'Fuente: registro nominal importado; '+g.length+' estudiantes. Las notas verificadas corresponden exclusivamente a la fuente registrada');
  out+=Table('Indicadores de rendimiento — '+first.course,
   ['Indicador','Valor','Indicador','Valor'],
   [['Registros',g.length,'Evaluados',s.n],
    ['Aprobados',approved,'No evaluados',notEvaluated],
    ['Reprobados',failed,'Aprobación',percentage(approved,s.n)],
    ['Promedio',format(s.mean),'Mediana',format(s.median)],
    ['Mínimo',format(s.min),'Máximo',format(s.max)],
    ['Desviación estándar',format(s.sd),'Docente',first.teacher||'Por verificar']],
   'Desviación estándar poblacional; los resultados ausentes no se sustituyen por nota cero');
  out+=para('De '+g.length+' registros y '+s.n+' evaluados, '+approved+' aprobaron ('+percentage(approved,s.n)+') y '+failed+
   ' obtuvieron menos de 7,00. El promedio es '+format(s.mean)+', la mediana '+format(s.median)+
   ', con extremos '+format(s.min)+'–'+format(s.max)+' y desviación estándar '+format(s.sd)+
   '. El promedio de esta carrera en los registros disponibles es '+format(careerValues.mean)+
   ' y el promedio general de esta modalidad es '+format(all.mean)+
   '. Las diferencias son descriptivas y dependen de la cobertura de cada fuente.');
  out+=Figure('Resultados del curso — '+first.course,[['Aprobados',approved],['Reprobados',failed],['No evaluados',notEvaluated]],{
   note:'Distribución de notas individuales del curso; no representa aprobación final del Examen Complexivo'});
 });
 return out;
}
function provisionalRows(state,mode,helpers){
 const {H,Table,para}=helpers,roster=byStudent(state),groups=new Map();
 for(const raw of [...state?.notasBorrador||[],...(state?.cursosNucleos||[]).filter(x=>x.verificado!==true&&x.verified!==true)]){
  const st=roster.get(plain(raw.studentId||raw.cedula||raw.id?.split('|')[0]));
  if(!st||st.modalidad!==mode)continue;
  const explicitlyUnverified=['PROVISIONAL','PROVISIONAL POR CONCILIAR','SIN VERIFICAR','BORRADOR'].includes(type(raw.estado||raw.status));
  if(!explicitlyUnverified&&!(state.cursosNucleos||[]).includes(raw))continue;
  const n=Number(raw.nucleo??0),course=(state.cursosNucleos||[]).includes(raw)?courseSource(raw):'Núcleo '+n;
  const k=[M().career(st.carrera),n,course].join('|');
  if(!groups.has(k))groups.set(k,{career:st.carrera,n,course,rows:[]});
  groups.get(k).rows.push([st.nombre,st.id,valid(raw.nota)===null?'Sin nota':format(valid(raw.nota)),
   plain(raw.fuente||raw.source)||'Sin referencia']);
 }
 let out=H(3,'5.5. Registros provisionales en conciliación');
 if(!groups.size)return out+para('No se han adjuntado transcripciones provisionales para esta modalidad.');
 out+=para('Los cuadros siguientes reproducen registros preliminares procedentes de otras fuentes. **No son calificaciones oficiales** y no se suman a los indicadores de aprobación. Su publicación en el borrador permite identificar las verificaciones pendientes, sin conferir validez académica a la transcripción.');
 let i=0;
 for(const x of [...groups.values()].sort((a,b)=>a.career.localeCompare(b.career,'es')||a.n-b.n)){
  i++;
  out+=H(3,'5.5.'+i+'. '+x.career+' — '+x.course);
  out+=Table('Transcripción pendiente de cotejo — '+x.career+' — '+x.course,
   ['Estudiante','Cédula','Nota provisional','Referencia de origen'],x.rows,
   'Provisional, no autorizado para cálculo de aprobación o promedio oficial; verificar con Moodle o acta individual');
 }
 return out;
}
function examDetail(data,helpers){
 const {H,Table,Figure,para}=helpers,careers=data.careers||[];
 let out=H(3,'7.7. Desarrollo analítico por carrera');
 if(!careers.length)return out+para('No hay estudiantes confirmados para el mecanismo de Examen Complexivo en esta modalidad. No se generan tasas ni calificaciones de personas sin mecanismo asignado.');
 for(const [i,c] of careers.entries()){
  const r=c.records,known=r.filter(x=>x.ordinary!==null),rec=r.filter(x=>x.recovery!==null);
  const mean=values=>stats(values).mean;
  const final=r.filter(x=>x.finalGrade!==null);
  out+=H(3,'7.7.'+(i+1)+'. '+c.name);
  out+=H(3,'Evaluación ordinaria — '+c.name);
  out+=Table('Examen ordinario individual — '+c.name,
   ['Estudiante','Cédula','Teoría','Práctica','Ponderación','Estado'],
   r.map(x=>[x.name,x.studentId,format(valid(x.evaluation?.ordinario?.teoria)),
    format(valid(x.evaluation?.ordinario?.practica)),format(x.ordinary),
    x.ordinary===null?'Pendiente':x.ordinary>=7?'Aprobado ordinario':'Requiere recuperación']),
   'Fórmula: teoría 40 % y práctica 60 %. El resultado faltante permanece sin calcular');
  out+=para('Existen '+known.length+' evaluaciones ordinarias calculables entre '+r.length+
   ' estudiantes clasificados. El promedio ordinario disponible es '+format(mean(known.map(x=>x.ordinary)))+
   ', el teórico es '+format(mean(r.map(x=>valid(x.evaluation?.ordinario?.teoria))))+
   ' y el práctico '+format(mean(r.map(x=>valid(x.evaluation?.ordinario?.practica))))+
   '. El porcentaje de aprobación ordinaria es '+percentage(c.stats.ordinaryApproved,r.length)+
   ' y no representa una graduación registrada.');
  out+=H(3,'Evaluación supletoria — '+c.name);
  out+=Table('Examen supletorio individual — '+c.name,
   ['Estudiante','Cédula','Teoría','Práctica','Nota del acta','Resultado','Estado'],
   r.filter(x=>x.evaluation?.needsSuple||x.evaluation?.hasRecordedRecovery)
    .map(x=>[x.name,x.studentId,format(valid(x.evaluation?.supletorio?.teoria)),
      format(valid(x.evaluation?.supletorio?.practica)),format(valid(x.evaluation?.supletorio?.notaFinal)),
      format(x.recovery),x.recovery===null?'Por resolver':x.recovery>=7?'Recuperado':'No recuperado']),
   'Solo estudiantes con supletorio indicado o registrado; no se inventan notas de recuperación');
  out+=para('El mecanismo de recuperación dispone de '+rec.length+' calificaciones calculables y '+
   c.stats.recovered+' aprobaciones supletorias. La proporción de recuperación se calcula sobre quienes efectivamente tienen supletorio evaluado: '+percentage(c.stats.recovered,rec.length)+'.');
  out+=H(3,'Resultados definitivos — '+c.name);
  out+=Table('Calificación final y situación de acta — '+c.name,
   ['Estudiante','Cédula','Definitiva','Estado','Referencia de acta'],
   r.map(x=>[x.name,x.studentId,format(x.finalGrade),x.status.replace(/_/g,' '),
    x.evaluation?.actaSupletorio||x.evaluation?.actaOrdinario||'Acta por verificar']),
   'Una calificación definitiva calculada y una referencia de acta no equivalen a titulación legalmente acreditada');
  out+=Figure('Estados definitivos — '+c.name,[['Aprobados',c.stats.approved],['Reprobados',c.stats.failed],
   ['No presentados',c.stats.noPresentado],['Pendientes',c.stats.pending]],{
    note:'Distribución según el mecanismo de Examen Complexivo en '+c.name});
  out+=Figure('Aprobación ordinaria y final — '+c.name,[['Ordinario',c.stats.ordinaryApproved],
   ['Final calculada',c.stats.approved]],{note:'Frecuencias de aprobaciones calculadas; la diferencia puede corresponder al supletorio'});
  const theo=mean(r.map(x=>valid(x.evaluation?.ordinario?.teoria))),pract=mean(r.map(x=>valid(x.evaluation?.ordinario?.practica)));
  if(theo!==null||pract!==null)out+=Figure('Promedio teórico frente al práctico — '+c.name,
   [['Teoría',theo??0],['Práctica',pract??0]],{max:10,decimals:2,
   note:'Medias calculadas con las notas disponibles; los componentes sin registros no se interpretan como cero'});
  out+=para('El balance final de '+c.name+' registra '+c.stats.approved+' aprobaciones calculadas ('+
   percentage(c.stats.approved,r.length)+'), '+c.stats.failed+' reprobados después de recuperación, '+
   c.stats.noPresentado+' no presentados y '+c.stats.pending+' pendientes. El promedio de notas finales calculables es '+
   format(mean(final.map(x=>x.finalGrade)))+'. Para conclusiones oficiales deben cotejarse actas y asistencia.');
 }
 return out;
}
function requirementAppendix(state,mode,helpers){
 const {H,Table,para}=helpers,students=(state?.estudiantes||[]).filter(x=>x.modalidad===mode),
   careers=new Map(),R=M().REQUIREMENTS,Req=root.InformetitRequirements;
 for(const st of students){
  const key=M().career(st.carrera);if(!careers.has(key))careers.set(key,[]);
  careers.get(key).push(st);
 }
 let out=H(3,'13.5. Matrices nominales de los nueve requisitos');
 if(!students.length)return out+para('La nómina individual no está cargada. No se reconstruye ninguna identificación a partir de estadísticas agregadas.');
 out+=para('Cada estudiante conserva sus nueve estados. C=Cumple, NC=No cumple, SV=Sin verificar, NA=No aplica. Las tablas se dividen para asegurar legibilidad en formato A4.');
 let i=0;
 for(const group of [...careers.values()].sort((a,b)=>a[0].carrera.localeCompare(b[0].carrera,'es'))){
  out+=H(3,'13.5.'+(++i)+'. '+group[0].carrera);
  const names=['Académico','Documentación','Financiero','Prácticas','Vinculación','Seguimiento','Inglés','Datos','Titulación'];
  const val=(st,key)=>({ok:'C',fail:'NC',unknown:'SV',na:'NA'})[Req.classify(st.requisitos?.[key])]||'SV';
  for(const range of [[0,5],[5,9]]){
   out+=Table('Matriz de requisitos — '+group[0].carrera+' ('+(range[0]+1)+'–'+range[1]+')',
    ['Estudiante','Cédula',...names.slice(...range)],
    group.slice().sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')).map(st=>
     [st.nombre,st.id,...R.slice(...range).map(key=>val(st,key))]),
    'Fuente: nómina nominal de la modalidad '+mode+'; estado de los nueve controles por estudiante');
  }
 }
 return out;
}
function improvementPlan(state,mode,quality,helpers){
 const {H,Table,Figure,para}=helpers,critical=quality.critical||[],warnings=quality.warnings||[];
 const issues=[...critical,...warnings],actions=[
  ['Población nominal sin integrar','Importar la nómina privada; cotejar matrícula, modalidad y cédulas','UTET / Sistemas','Nómina conciliada','100 % de identificaciones cotejadas'],
  ['Mecanismos no confirmados','Clasificar expresamente Examen Complexivo y Trabajo de Titulación con fuente de respaldo','UTET / Coordinación de Carrera','Estudiantes con mecanismo explícito','100 % de la cohorte clasificada'],
  ['Calificaciones de núcleos incompletas','Conciliar los libros Moodle y las transcripciones Word con docentes responsables','UTET / Docentes de Núcleos','Notas con fuente verificada','100 % de notas utilizadas con fuente identificada'],
  ['Actas y evaluaciones finales','Registrar ordinarios, supletorios y rúbricas; cotejar actas originales','UTET / Tribunales','Resultados con acta','100 % de resultados declarados como definitivos con acta'],
  ['Referencias y aprobación','Verificar normas, firmar y archivar los documentos aprobados','UTET / Vicerrectorado','Informe aprobado y archivado','Documentación final institucional validada']
 ];
 let out=H(2,'12. Plan de Mejora Institucional');
 out+=para('Este plan contiene acciones propuestas a partir de los controles de integridad de la presente modalidad. No atribuye responsables confirmados ni fechas ejecutadas: tales campos deben aprobarse formalmente. Los objetivos propuestos no constituyen resultados realizados.');
 out+=Table('Situación de integridad de datos y expedientes',
  ['Severidad','Hallazgo','Situación observada'],
  issues.map(x=>[x.severity==='critical'?'Crítica':'Advertencia',x.label,x.description]),
  'Incidencias obtenidas del motor de control documental para esta modalidad');
 out+=Table('Propuesta de acciones y responsables',
  ['Hallazgo a resolver','Acción prioritaria','Responsable propuesto'],
  actions.map(x=>x.slice(0,3)),'La designación definitiva corresponde a las autoridades institucionales');
 out+=Table('Indicadores y metas propuestas',
  ['Acción','Indicador de seguimiento','Meta propuesta','Plazo','Estado'],
  actions.map((x,i)=>['Acción '+(i+1),x[3],x[4],'Por definir','Propuesta']),
  'Las metas no se presentan como logros alcanzados; requieren aprobación institucional');
 out+=Figure('Prioridades de revisión del informe',
  [['Bloqueos críticos',critical.length],['Advertencias',warnings.length]],{
  note:'Número de hallazgos detectados en esta exportación; la magnitud no mide el desempeño de los estudiantes'});
 return out;
}
const api=Object.freeze({courseRows,courseAnalysis,provisionalRows,examDetail,requirementAppendix,improvementPlan,stats});
root.InformetitInformeCompleto=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
