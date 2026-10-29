/* Informetit: Bloque 02 - Documento INF y secciones introductorias */
(function(root){
'use strict';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PERIOD='Octubre 2025 a marzo 2026',TITLE='Informe final del proceso de titulación',UNIT='Unidad de Titulación y Eficiencia Terminal';
function date(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||'')),names=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];return m&&+m[2]>=1&&+m[2]<=12?+m[3]+'-'+names[+m[2]-1]+'-'+m[1]:String(s||'Por confirmar')}
function fields(state,mode){
 const c=state?.config||{},online=mode==='online';
 const info=root.InformetitCodigo?.forMode(state,mode);
 if(!info)throw Error('No se cargó el motor de códigos del período');
 const logo=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(c.logoDataUrl||'')?c.logoDataUrl:(root.InformetitDefaultLogo||'');
 return {modality:online?'Online':'Presencial',code:info.code,codePrefix:info.prefix,
   codeValid:info.valid,codeReason:info.reason,codeStamp:info.stamp,codeMonth:info.label,
   version:c.version||'1.0',date:c.fechaElaboracion?date(c.fechaElaboracion):info.label,
   logo,prepared:c.elaborado||'Mgs. Jefferson Villarreal',
   reviewed:c.revisado||'Ing. Martha Tomalá',
   approved:c.aprobado||'Dr. Alex León',
   legal:!!c.marcoLegalValidado,signatures:!!c.firmasValidadas};
}
function pending(state,mode){
 const f=fields(state,mode),a=[];
 if(!f.codeValid)a.push('Prefijo/consecutivo documental '+(mode==='online'?'online':'presencial')+' por confirmar');
 if(!state?.config?.fechaElaboracion)a.push('Día de elaboración por registrar (mes previsto: '+f.codeMonth+')');
 else if(String(state.config.fechaElaboracion).slice(0,7)!==f.codeStamp)
  a.push('La fecha de elaboración difiere del mes programado '+f.codeMonth);
 if(!f.logo)a.push('Logo institucional pendiente');
 if(!f.legal)a.push('Vigencia del marco normativo pendiente');
 if(!f.signatures)a.push('Firmas institucionales pendientes');
 return a;
}
function logo(f){return f.logo?'<img class="inf-logo" src="'+E(f.logo)+'" alt="Logo institucional">':'<span class="inf-missing">LOGO POR CARGAR</span>'}
function header(f,real){
 const pages=real?'<span class="pageNumber"></span> de <span class="totalPages"></span>':'automática en PDF';
 return '<table class="inf-header"><colgroup><col style="width:26.6667%"><col style="width:52.7778%"><col style="width:20.5555%"></colgroup><tbody>'
 +'<tr class="inf-headrow-1"><td rowspan="2">'+logo(f)+'</td><td rowspan="2">'+UNIT+'</td><td>Código:<div>'+E(f.code)+'</div></td></tr>'
 +'<tr class="inf-headrow-2"><td>Versión: '+E(f.version)+'</td></tr>'
 +'<tr class="inf-headrow-3"><td>Fecha de elaboración:<div>'+E(f.date)+(f.date===f.codeMonth?'<span class="inf-missing"> · DÍA POR CONFIRMAR</span>':'')+'</div></td><td><b>'+TITLE+'</b><div>'+PERIOD+' · '+f.modality+'</div></td><td>Página '+pages+'</td></tr></tbody></table>';
}
function printHeader(state,mode){
 const css='*{box-sizing:border-box}html,body{margin:0;padding:0;font:8pt Arial,sans-serif;color:#000}.inf-wrap{margin:0 auto;width:18cm}.inf-header{width:18cm;border-collapse:collapse;table-layout:fixed;font:8pt/1.15 Arial,sans-serif}.inf-header td{border:.5pt solid #000;text-align:center;vertical-align:middle;padding:.1cm;overflow-wrap:anywhere}.inf-headrow-1{height:1.28cm}.inf-headrow-2{height:.75cm}.inf-headrow-3{height:1.20cm} .inf-logo{max-height:1.7cm;max-width:3.7cm;object-fit:contain}.inf-missing{color:#b91c1c;text-decoration:underline;font-weight:bold}';
 return '<!doctype html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body><div class="inf-wrap">'+header(fields(state,mode),true)+'</div></body></html>';
}
function cover(state,mode){
 const f=fields(state,mode);
 const cell=(t,n,j)=>'<td><div class="inf-sign-title">'+t+'</div><div class="inf-sign-space"></div><div class="inf-sign-name"><b>NOMBRE:</b> '+E(n)+'</div><div class="inf-sign-job"><b>CARGO:</b> '+E(j)+'</div></td>';
 return '<section class="inf-cover"><div class="inf-cover-head">'+header(f,false)+'</div><div class="inf-cover-middle">'+(f.logo?'<img class="inf-cover-logo" src="'+E(f.logo)+'" alt="Identidad institucional ITSQMET">':'')+'<h1>'+TITLE+'</h1><p>'+PERIOD+'</p><p>Modalidad '+f.modality+'</p><small>BORRADOR · VALIDACIÓN INSTITUCIONAL PENDIENTE</small></div>'
 +'<table class="inf-signatures"><colgroup><col style="width:33.3333%"><col style="width:33.3333%"><col style="width:33.3333%"></colgroup><tbody><tr>'
 +cell('ELABORADO POR:',f.prepared,'Coordinador de Titulación y Eficiencia Terminal')
 +cell('REVISADO POR:',f.reviewed,'Coordinadora General de Carreras')
 +cell('APROBADO POR:',f.approved,'Vicerrector')+'</tr></tbody></table></section>';
}
function introduction(){
 const p=x=>'<p>'+E(x)+'</p>';
 return '<h2>1. Introducción</h2>'
 +p('La titulación representa una etapa decisiva de la trayectoria académica: permite examinar el cumplimiento de las condiciones administrativas y académicas, documentar los resultados de aprendizaje y sustentar la conclusión del proceso formativo. En el Instituto Superior Tecnológico Quito Metropolitano, la Unidad de Titulación y Eficiencia Terminal coordina la información que proviene de las carreras, los registros académicos y las instancias responsables de verificar requisitos y evaluaciones.')
 +p('El período octubre de 2025 a marzo de 2026 requiere un seguimiento diferenciado de la modalidad presencial y la modalidad online. Aunque comparten los principios generales de calidad, trazabilidad y verificación, sus poblaciones, carreras, incidencias y resultados deben analizarse de manera independiente para evitar la duplicación o mezcla de expedientes.')
 +p('El informe articula la verificación de requisitos previos, el desarrollo de los cuatro núcleos estructurantes para Examen Complexivo, las evaluaciones ordinarias y supletorias y, cuando corresponda, el Trabajo de Titulación. Cada mecanismo posee instrumentos y registros propios, por lo que una condición de cumplimiento administrativo no sustituye una calificación ni una constancia de graduación.')
 +'<h3>1.1. Antecedentes y justificación</h3>'
 +p('La gestión institucional de titulación reúne datos que originalmente pueden encontrarse en hojas de cálculo, libros de calificaciones, actas, cronogramas y plataformas de información académica. El análisis integrado de estas fuentes permite reconocer el avance del proceso, sus restricciones documentales y las oportunidades de mejora sin atribuir resultados que aún no cuentan con soporte.')
 +p('Los informes institucionales anteriores daban prioridad a las etapas académicas y a los resultados del examen. Para este período se incorpora de forma explícita la Fase I de requisitos, con indicadores por carrera y modalidad, así como controles de calidad para distinguir incumplimientos confirmados, estados pendientes de verificación y registros no aplicables.')
 +p('La elaboración del documento responde a la necesidad de contar con una síntesis verificable para seguimiento, revisión institucional y toma de decisiones. El reporte no reemplaza las actas firmadas, el registro oficial de títulos ni los procedimientos de aprobación. Antes de su emisión definitiva, sus cifras, cronogramas y referencias deben cotejarse con la documentación autorizada.')
 +'<h3>1.2. Objetivo general</h3>'
 +p('Analizar integralmente el desarrollo del proceso de titulación del período octubre de 2025 a marzo de 2026, mediante la caracterización de la cohorte, la verificación de requisitos, el examen de los resultados académicos disponibles y la identificación de incidencias documentales, para sustentar decisiones de seguimiento y mejora institucional.')
 +'<h3>1.3. Objetivos específicos</h3>'
 +'<ol><li>Caracterizar a los estudiantes por carrera y modalidad con poblaciones claramente identificadas.</li><li>Determinar el cumplimiento de requisitos previos y registrar las verificaciones no resueltas.</li><li>Examinar la cobertura y las calificaciones disponibles de los cuatro núcleos estructurantes, diferenciando fuentes nominales y estadísticas agregadas.</li><li>Describir de manera separada el Examen Complexivo y el Trabajo de Titulación, sus evaluaciones y evidencias documentales.</li><li>Consolidar hallazgos, limitaciones, conclusiones y acciones de mejora basadas en datos comprobables.</li></ol>'
 +'<h3>1.4. Alcance y metodología</h3>'
 +p('El alcance temporal comprende la cohorte octubre de 2025 a marzo de 2026 y sus actividades de titulación asociadas. Los documentos presencial y online utilizan el mismo procedimiento analítico, pero emplean denominadores propios. Las observaciones se presentan por fase, carrera y mecanismo cuando la fuente permite ese nivel de detalle.')
 +p('Se aplica un análisis descriptivo de frecuencias absolutas, proporciones y, en presencia de calificaciones individuales, medidas de tendencia central y dispersión. El origen de cada resultado se diferencia entre nómina nominal, registros de Moodle, cuadros agregados y actas. Los datos agregados no se distribuyen artificialmente entre personas y las notas ausentes no se transforman en cero.')
 +p('La calidad de la información se revisa mediante controles de identidad, duplicidad, correspondencia de modalidad, fechas, diferencias entre fuentes y referencia documental. Cuando falta una fuente necesaria, el informe declara la limitación y evita presentar una tasa como si representara a toda la cohorte. La clasificación de pendiente no equivale a reprobación ni a incumplimiento definitivo.');
}
function legal(){
 const p=x=>'<p>'+E(x)+'</p>';
 return '<h2>2. Marco legal y normativo</h2>'
 +p('La gestión del proceso de titulación se interpreta conforme al marco jurídico ecuatoriano de educación superior y a las disposiciones institucionales aplicables al período analizado. Este apartado expone la relación funcional de las normas con el seguimiento académico, sin sustituir la revisión jurídica de sus textos consolidados y reformas vigentes al momento de aprobar el informe.')
 +'<h3>2.1. Constitución de la República del Ecuador</h3>'
 +p('Los artículos 26 y 27 reconocen el derecho a la educación y orientan su desarrollo hacia la formación integral, la calidad y la inclusión. En el ámbito de la educación superior, el artículo 350 vincula la formación académica y profesional con el desarrollo científico, tecnológico y la solución de problemas del país. Los artículos 351 y 352 sitúan a los institutos superiores en el sistema de educación superior y recogen principios de igualdad de oportunidades, pertinencia y calidad.')
 +p('En consecuencia, el seguimiento institucional de titulación debe sustentarse en criterios transparentes de evaluación, registros comprobables y aplicación consistente de los procedimientos, atendiendo las condiciones académicas previstas para cada estudiante y modalidad.')
 +'<h3>2.2. Ley Orgánica de Educación Superior</h3>'
 +p('La Ley Orgánica de Educación Superior regula los derechos, responsabilidades y principios de la formación superior. Sus artículos 4 y 5 se refieren al ejercicio del derecho a la educación superior y al acceso, permanencia, egreso y titulación sin discriminación, conforme a las condiciones académicas establecidas por la normativa.')
 +p('Para efectos del informe, esta referencia exige diferenciar el derecho del estudiante a seguir el procedimiento institucional de las constancias formales de aprobación, egreso y emisión del título. Las verificaciones administrativas, por sí solas, no acreditan la calificación final ni la inscripción posterior de un título.')
 +'<h3>2.3. Reglamento de Régimen Académico del Consejo de Educación Superior</h3>'
 +p('El Reglamento de Régimen Académico constituye un referente para la organización de carreras, períodos académicos, evaluación y opciones relacionadas con la culminación de estudios. Su aplicación concreta debe contrastarse con la versión vigente y las reformas correspondientes al período y al mecanismo de titulación desarrollado por la institución.')
 +p('Desde el punto de vista del control académico, este marco obliga a conservar el instrumento de evaluación utilizado, la evidencia de cumplimiento del cronograma y la correspondencia entre las actividades formativas y el resultado registrado. Por esta razón se mantienen separados los resultados de los núcleos, las calificaciones del examen y las rúbricas de Trabajo de Titulación.')
 +'<h3>2.4. Regulación de instituciones de formación técnica y tecnológica</h3>'
 +p('La regulación emitida por el Consejo de Educación Superior para las instituciones de formación técnica y tecnológica complementa el régimen académico general. Sus disposiciones y reformas deben revisarse junto con la condición institucional, las atribuciones de las autoridades y los instrumentos internos que sustentan el desarrollo y la aprobación de los procesos académicos.')
 +p('La referencia a esta regulación no permite presumir que todos los mecanismos o ponderaciones sean idénticos para todas las carreras. Los porcentajes y reglas utilizados en los cálculos se confrontarán con el manual y las actas institucionales autorizadas.')
 +'<h3>2.5. Manual de procesos y normativa interna del ITSQMET</h3>'
 +p('El manual de procesos de la Unidad de Titulación y Eficiencia Terminal y los instrumentos institucionales aprobados especifican actividades, responsables, validaciones, cronogramas, documentación y mecanismos de evaluación. Su aplicación exige mantener evidencia de los nueve controles de seguimiento, las notas de los núcleos, las evaluaciones finales y los expedientes particulares que se apartan del Examen Complexivo.')
 +p('Los procedimientos de elaboración, revisión y aprobación del informe son distintos de los procedimientos de aprobación de cada estudiante. La inclusión del nombre de una autoridad en la carátula no constituye una firma, y la referencia de un acta no acredita su autenticidad sin cotejo con el documento institucional.')
 +'<h3>2.6. Trazabilidad y suficiencia de la evidencia</h3>'
 +p('Para evitar interpretaciones incorrectas, se distingue entre población registrada, personas con requisitos completos, evaluaciones con calificaciones, resultados académicos calculados y graduaciones formalmente acreditadas. Cada categoría requiere su propia fuente, fecha de corte y denominador. La ausencia de un registro individual debe declararse como limitación de información y no como valor cero.')
 +p('Los documentos de referencia consultados comprenden la Constitución, la Ley Orgánica de Educación Superior, la normativa publicada por el Consejo de Educación Superior y los documentos internos del ITSQMET. Las versiones, las reformas pertinentes y la aprobación de los instrumentos institucionales permanecen sujetas a cotejo documental antes de suscribir el informe.');
}
function indexize(html,pages={}){
 const sections=[];let i=0;
 let body=html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,(raw,level,attrs,value)=>{
  const label=value.replace(/<[^>]+>/g,'').trim();if(!label)return raw;
  const old=/\bid=["']([^"']+)["']/.exec(attrs),id=old?old[1]:'inf-sec-'+String(++i).padStart(3,'0');
  sections.push({id,label,level:+level});
  return '<h'+level+(old?attrs:attrs+' id="'+id+'"')+'>'+value+'<span class="inf-page-marker">[[INF:'+id+']]</span></h'+level+'>';
 });
 const tables=[...body.matchAll(/<p class="tlabel">Tabla (\d+)<\/p><p class="tname">([^<]*)<\/p>/g)].map(m=>({id:'inf-table-'+m[1],label:'Tabla '+m[1]+'. '+m[2],level:2}));
 body=body.replace(/<p class="tlabel">Tabla (\d+)<\/p>/g,(_,n)=>'<p class="tlabel" id="inf-table-'+n+'">Tabla '+n+'<span class="inf-page-marker">[[INF:inf-table-'+n+']]</span></p>');
 const figures=[...body.matchAll(/<p class="flabel">Figura (\d+)<\/p><p class="fname">([^<]*)<\/p>/g)].map(m=>({id:'inf-figure-'+m[1],label:'Figura '+m[1]+'. '+m[2],level:2}));
 body=body.replace(/<p class="flabel">Figura (\d+)<\/p>/g,(_,n)=>'<p class="flabel" id="inf-figure-'+n+'">Figura '+n+'<span class="inf-page-marker">[[INF:inf-figure-'+n+']]</span></p>');
 const entries=a=>a.map(x=>'<div class="inf-index-item'+(x.level===3?' sub':'')+'"><a href="#'+E(x.id)+'">'+E(x.label)+'</a><span class="inf-index-dots"></span><span class="inf-index-page" data-page="'+E(x.id)+'">'+(Number.isInteger(pages[x.id])?pages[x.id]:'—')+'</span></div>').join('');
 const make=(title,items)=>items.length?'<nav class="inf-index"><h2>'+title+'</h2>'+entries(items)+'</nav>':'';
 return {html:body,front:make('Índice de contenidos',sections)+make('Índice de tablas',tables)+make('Índice de figuras',figures),sections,tables,figures};
}
function paginate(html,pages){return html.replace(/(<span class="inf-index-page" data-page=")([^"]+)(">)(?:—|\d+)(<\/span>)/g,(m,prefix,id,middle,end)=>prefix+id+middle+(Number.isInteger(pages?.[id])?pages[id]:'—')+end);}

const CSS=[
'@page{size:A4;margin:5.05cm 2.54cm 2.54cm}',
'@page:first{size:A4;margin:5.05cm 1.5cm 1.5cm}',
'@media print{.inf-cover-head{display:none!important}}',
'@media print{thead{display:table-header-group!important}tfoot{display:table-footer-group!important}h2,h3,.tlabel,.tname,.flabel,.fname{break-after:avoid-page;page-break-after:avoid}.tbl tr,.fig{break-inside:avoid-page}.inf-index a{color:#000!important;text-decoration:none}}',
'.inf-cover{background:#fff!important;min-height:21.6cm!important;break-after:page;page-break-after:always;display:flex;flex-direction:column;justify-content:space-between;margin:0!important;padding:0!important;box-shadow:none!important}',
'.inf-cover-head{width:18cm;margin:0 auto}.inf-header{width:18cm!important;table-layout:fixed;border-collapse:collapse;font:8pt/1.15 Arial,sans-serif}',
'.inf-header td{border:.5pt solid #000;text-align:center;vertical-align:middle;padding:.1cm;overflow-wrap:anywhere}',
'.inf-headrow-1{height:1.28cm}.inf-headrow-2{height:.75cm}.inf-headrow-3{height:1.20cm}',
'.inf-logo{max-height:1.7cm;max-width:3.7cm;object-fit:contain}',
'.inf-cover-logo{display:block;width:7.5cm;max-height:3.4cm;object-fit:contain;margin:0 auto 1.5cm}',
'.inf-missing{color:#b91c1c!important;text-decoration:underline!important;text-decoration-thickness:1.2pt;font-weight:700}',
'.inf-cover-middle{text-align:center;padding:2cm 0;font-family:Arial,sans-serif}',
'.inf-cover-middle h1{font:bold 18pt/1.25 Arial,sans-serif!important;margin:0 0 1cm!important;text-align:center!important}',
'.inf-cover-middle p{font:bold 12pt/1.35 Arial,sans-serif!important;text-align:center!important;margin:.5cm 0!important}',
'.inf-cover-middle small{font:9pt Arial,sans-serif;display:block;margin-top:1.6cm}',
'.inf-signatures{width:18cm!important;table-layout:fixed!important;border-collapse:collapse!important;font:8pt/1.15 Arial,sans-serif!important;margin:0!important}',
'.inf-signatures td{border:.5pt solid #000!important;vertical-align:top!important;padding:0!important;overflow-wrap:anywhere}',
'.inf-sign-title{text-align:center;font-weight:bold;min-height:.5cm;padding:.12cm}',
'.inf-sign-space{height:2.4cm;border-top:.5pt solid #000;border-bottom:.5pt solid #000}',
'.inf-sign-name{min-height:.75cm;padding:.12cm .1cm}',
'.inf-sign-job{min-height:1.05cm;border-top:.5pt solid #000;padding:.12cm .1cm}',
'.inf-index{break-before:page;page-break-before:always;break-after:auto;page-break-after:auto;line-height:1.3;font-family:"Times New Roman",serif}',
'.inf-index + .inf-index + .inf-index{break-before:auto;page-break-before:auto}',
'.inf-index h2{font:bold 13pt/1.3 "Times New Roman",serif;text-align:center;margin:0 0 14pt}',
'.inf-index-item{display:flex;gap:7pt;align-items:flex-end;margin:3pt 0;break-inside:avoid}',
'.inf-index-item.sub{padding-left:15pt;font-size:10pt}',
'.inf-index-item a{color:inherit;text-decoration:none;overflow-wrap:anywhere}',
'.inf-index-dots{flex:1;border-bottom:1pt dotted #999;min-width:10pt}',
'.inf-index-page{min-width:22pt;text-align:right;font-variant-numeric:tabular-nums}',
'.inf-page-marker{font-size:3px;color:#fff;letter-spacing:0}',
'.inf-cover + .inf-index{break-before:auto}',
'@media screen{.inf-cover{min-height:24cm!important;max-width:21cm;margin:0 auto 24px!important;padding:14px!important;box-shadow:0 1px 6px #d6dce7!important}',
'.inf-cover-head{width:100%}.inf-cover-head .inf-header{width:100%!important}',
'.inf-index{background:#fff;max-width:21cm;margin:0 auto 24px;padding:20px;box-shadow:0 1px 6px #d6dce7}}'
].join('\n');

const api=Object.freeze({fields,pending,printHeader,cover,introduction,legal,indexize,paginate,date,CSS});
root.InformetitDocument=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
