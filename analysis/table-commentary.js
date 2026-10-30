/* Informetit · Comentarios breves y verificables alrededor de cada tabla.
   Los textos se generan de sus celdas y títulos, nunca de notas inventadas. */
(function(root){
'use strict';
const str=x=>String(x??'').trim();
const norm=x=>str(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const missing=x=>!str(x)||/^(?:—|-|SIN (?:DATOS|INFORMACION|CALIFICACION|NOMINA)|NO (?:DISPONIBLE|CALCULABLE|EVALUADO)|PENDIENTE|POR (?:REVISAR|CONCILIAR|DEFINIR)|SIN VERIFICAR)$/i.test(str(x));
const integer=x=>{if(typeof x==='number')return Number.isInteger(x)&&x>=0?x:null;
 const v=str(x);return /^\d{1,3}(?:\.\d{3})*$|^\d+$/.test(v)?Number(v.replace(/\./g,'')):null};
const grade=x=>{const v=str(x);if(!/^\d{1,2}(?:[,.]\d{1,2})?$/.test(v))return null;
 const n=Number(v.replace(',','.'));return Number.isFinite(n)&&n>=0&&n<=10?n:null};
const format=x=>Number(x).toLocaleString('es-EC',{minimumFractionDigits:0,maximumFractionDigits:2});
function kind(name){
 const n=norm(name);
 if(/CRONOGRAMA|ACTIVIDADES PROGRAMADAS|PLANIFICACION|FECHA DE/.test(n))return 'schedule';
 if(/REQUISIT|CONTROLES DE TITULACION|CUMPLIMIENTO|INCIDENCIAS POR REQUISITO/.test(n))return 'requirements';
 if(/NOTAS PROVISIONALES|TRANSCRIPCION PENDIENTE|FUENTES NOMINALES/.test(n))return 'provisional';
 if(/CALIFICACION|NOTAS|PROMEDIO|MEDIA|NUCLEO|RENDIMIENTO|PUNTAJ/.test(n))return 'grades';
 if(/ORDINARIO|SUPLETORIO|COMPLEXIVO|EVALUACION|RESULTADOS/.test(n))return 'exams';
 if(/PROYECTO|DEFENSA|TITULACION|RUBRICA|VOCAL|TUTOR/.test(n))return 'work';
 if(/DISTRIBUCION|CARACTERIZACION|COHORTE|SEDE|HORARIO/.test(n))return 'population';
 if(/HALLAZGO|INTEGRIDAD|CONCILIACION|EVIDENCIA|CONTROL DE CALIDAD|FUENTE/.test(n))return 'quality';
 if(/PLAN DE MEJORA|META|PRIORIDAD|ACCION|RESPONSABLE/.test(n))return 'planning';
 return 'overview';
}
const templates={
 schedule:[
  'reúne las actividades y fechas consignadas para el seguimiento del cronograma.',
  'Su finalidad es distinguir la planificación de los estados declarados de ejecución, sin confundirlos con evidencia documental.',
  'La información temporal permite localizar las actividades que requieren cotejo con respaldos. Las fechas consignadas no acreditan por sí solas su realización.'
 ],
 requirements:[
  'organiza las verificaciones administrativas y académicas correspondientes a los requisitos de titulación.',
  'Permite localizar los controles cumplidos y los que requieren seguimiento, según los registros disponibles.',
  'Estas verificaciones describen el estado de los requisitos y no constituyen, por sí solas, resultados del Examen Complexivo ni acreditación del título.'
 ],
 provisional:[
  'identifica registros de origen documental que todavía requieren cotejo con la fuente académica.',
  'Su propósito es conservar trazabilidad sin convertir información provisional en calificaciones verificadas.',
  'Estos registros deben conciliarse antes de utilizarse para establecer resultados académicos definitivos.'
 ],
 grades:[
  'presenta los registros académicos disponibles del curso o núcleo señalado.',
  'Permite contrastar calificaciones, cobertura y pendientes sin atribuir a una persona resultados provenientes de agregados.',
  'Las estadísticas describen únicamente las observaciones disponibles; los datos ausentes no se sustituyen por cero ni por estimaciones.'
 ],
 exams:[
  'resume las evaluaciones y los resultados académicos registrados para la población correspondiente.',
  'Su lectura diferencia los resultados calculables de los casos pendientes o sujetos a verificación documental.',
  'Los resultados calculados deben contrastarse con las actas antes de considerarse definitivos; un dato pendiente no equivale a reprobación.'
 ],
 work:[
  'organiza la evidencia del mecanismo de Trabajo de Titulación y sus componentes de evaluación.',
  'Ayuda a identificar avances, resultados y documentos pendientes para cada caso, según corresponda.',
  'La existencia de una calificación o referencia de acta debe distinguirse de la aprobación y autenticación institucional.'
 ],
 population:[
  'presenta la composición de la cohorte según las categorías registradas.',
  'Permite observar la distribución y establecer la población de referencia de los análisis posteriores.',
  'Estas cifras describen la distribución registrada y no permiten deducir, por sí solas, aprobaciones o graduaciones.'
 ],
 quality:[
  'recoge controles de procedencia, integridad o conciliación del expediente académico.',
  'Permite reconocer las fuentes utilizadas y los asuntos que deben resolverse para sustentar el informe.',
  'Los controles señalados orientan la validación documental y no deben interpretarse como resultados individuales de evaluación.'
 ],
 planning:[
  'organiza las acciones y los indicadores propuestos para el seguimiento institucional.',
  'Facilita distinguir las responsabilidades y metas previstas de los resultados efectivamente comprobados.',
  'Los compromisos y metas indicados siguen sujetos a validación y no se presentan como actividades ejecutadas.'
 ],
 overview:[
  'ordena los datos disponibles en categorías comparables para su revisión.',
  'Permite reconocer la información registrada y los aspectos que necesitan comprobación adicional.',
  'La lectura debe limitarse al alcance de la fuente y no extender sus resultados a registros ausentes.'
 ]
};
function topCategory(heads,rows,type){
 if(rows.length<2||rows.length>100||!['population','requirements','exams'].includes(type))return null;
 const candidate=heads.findIndex((h,i)=>i>0&&/^(?:ESTUDIANTES|CONVOCADOS|TOTAL DE INCIDENCIAS|INCIDENCIAS|CUMPLEN|PROYECTOS|REGISTROS)$/i.test(norm(h)));
 if(candidate<0)return null;
 const items=rows.filter(r=>Array.isArray(r)&&r.length>candidate&&
    str(r[0])&&!/^(?:TOTAL|SUMA|PROMEDIO|PORCENTAJE)/i.test(norm(r[0])))
  .map(r=>({label:str(r[0]),value:integer(r[candidate])})).filter(x=>x.value!==null);
 if(items.length<2)return null;
 const max=Math.max(...items.map(x=>x.value)),leaders=items.filter(x=>x.value===max);
 if(leaders.length!==1||max===0)return null;
 return {label:leaders[0].label,value:max,column:heads[candidate]};
}
function gradeCoverage(heads,rows,type){
 if(!['grades','exams','work'].includes(type)||!rows.length)return null;
 const idx=heads.findIndex(h=>/^(?:NOTA FINAL|NOTA|DEFINITIVA|CALIFICACION FINAL|MEDIA SIMPLE)$/i.test(norm(h)));
 if(idx<0)return null;
 const found=rows.filter(r=>Array.isArray(r)&&grade(r[idx])!==null).length;
 if(found===rows.length)return 'En las '+rows.length+' filas de esta tabla consta un valor numérico en la columna de calificación seleccionada.';
 return 'En '+found+' de '+rows.length+' filas consta un valor numérico en la columna de calificación seleccionada; las demás requieren revisión de su estado.';
}
function commentary(name,heads,rows,note,number){
 if(!Array.isArray(heads)||!Array.isArray(rows))throw Error('Tabla institucional sin estructura válida');
 const type=kind(name),tpl=templates[type],n=Number(number);
 const ref=Number.isInteger(n)&&n>0?'La Tabla '+n:'Esta tabla';
 const before=ref+' '+tpl[0]+' '+tpl[1];
 let after;
 if(!rows.length)after='No se dispone de filas verificables en esta tabla. '+tpl[2];
 else{
  const top=topCategory(heads,rows,type),coverage=gradeCoverage(heads,rows,type);
  if(top)after='Entre las categorías consignadas, '+top.label+' registra el valor más alto en «'+top.column+'» ('+format(top.value)+'). '+tpl[2];
  else if(coverage)after=coverage+' '+tpl[2];
  else after='Se presentan '+rows.length+' '+(rows.length===1?'registro':'registros')+' en esta tabla, conforme a la fuente señalada. '+tpl[2];
 }
 return {before,after,type};
}
const api=Object.freeze({commentary,kind,integer,grade});
root.InformetitTableCommentary=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
