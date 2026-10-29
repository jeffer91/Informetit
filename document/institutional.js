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
 const logo=/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(c.logoDataUrl||'')?c.logoDataUrl:'';
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
function logo(f){return f.logo?'<img class="inf-logo" src="'+E(f.logo)+'" alt="Logo institucional">':'<strong>ITSQMET</strong>'}
function header(f,real){
 const pages=real?'<span class="pageNumber"></span> de <span class="totalPages"></span>':'automática en PDF';
 return '<table class="inf-header"><colgroup><col style="width:26.6667%"><col style="width:52.7778%"><col style="width:20.5555%"></colgroup><tbody>'
 +'<tr class="inf-headrow-1"><td rowspan="2">'+logo(f)+'</td><td rowspan="2">'+UNIT+'</td><td>Código:<div>'+E(f.code)+'</div></td></tr>'
 +'<tr class="inf-headrow-2"><td>Versión: '+E(f.version)+'</td></tr>'
 +'<tr class="inf-headrow-3"><td>Fecha de elaboración:<div>'+E(f.date)+'</div></td><td><b>'+TITLE+'</b><div>'+PERIOD+' · '+f.modality+'</div></td><td>Página '+pages+'</td></tr></tbody></table>';
}
function printHeader(state,mode){
 const css='*{box-sizing:border-box}html,body{margin:0;padding:0;font:8pt Arial,sans-serif;color:#000}.inf-wrap{margin:0 auto;width:18cm}.inf-header{width:18cm;border-collapse:collapse;table-layout:fixed;font:8pt/1.15 Arial,sans-serif}.inf-header td{border:.5pt solid #000;text-align:center;vertical-align:middle;padding:.1cm;overflow-wrap:anywhere}.inf-headrow-1{height:1.28cm}.inf-headrow-2{height:.75cm}.inf-headrow-3{height:1.20cm}.inf-logo{max-height:1.7cm;max-width:3.7cm;object-fit:contain}';
 return '<!doctype html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body><div class="inf-wrap">'+header(fields(state,mode),true)+'</div></body></html>';
}
function cover(state,mode){
 const f=fields(state,mode);
 const cell=(t,n,j)=>'<td><div class="inf-sign-title">'+t+'</div><div class="inf-sign-space"></div><div class="inf-sign-name"><b>NOMBRE:</b> '+E(n)+'</div><div class="inf-sign-job"><b>CARGO:</b> '+E(j)+'</div></td>';
 return '<section class="inf-cover"><div class="inf-cover-head">'+header(f,false)+'</div><div class="inf-cover-middle"><h1>'+TITLE+'</h1><p>'+PERIOD+'</p><p>Modalidad '+f.modality+'</p><small>BORRADOR · VALIDACIÓN INSTITUCIONAL PENDIENTE</small></div>'
 +'<table class="inf-signatures"><colgroup><col style="width:33.3333%"><col style="width:33.3333%"><col style="width:33.3333%"></colgroup><tbody><tr>'
 +cell('ELABORADO POR:',f.prepared,'Coordinador de Titulación y Eficiencia Terminal')
 +cell('REVISADO POR:',f.reviewed,'Coordinadora General de Carreras')
 +cell('APROBADO POR:',f.approved,'Vicerrector')+'</tr></tbody></table></section>';
}
function introduction(){
 const p=x=>'<p>'+E(x)+'</p>';
 return '<h2>1. Introducción</h2>'+p('El proceso de titulación constituye la etapa de verificación de competencias y resultados de aprendizaje de la formación tecnológica superior. El Instituto Superior Tecnológico Quito Metropolitano, mediante la Unidad de Titulación y Eficiencia Terminal, organiza la verificación de requisitos, la preparación académica y los mecanismos de evaluación final.')
 +'<h3>1.1. Antecedentes y justificación</h3>'+p('Los informes institucionales anteriores se centraron en los núcleos estructurantes y en los resultados del Examen Complexivo. Para el período octubre 2025 a marzo 2026 se amplía el análisis mediante una fase específica de requisitos, sin confundir la habilitación administrativa con la aprobación de las evaluaciones.')
 +p('La integración de las tres fases permite caracterizar la cohorte, reconocer incidencias y formular propuestas de mejora respaldadas en registros académicos y administrativos.')
 +'<h3>1.2. Objetivo general</h3>'+p('Analizar el proceso de titulación del período octubre 2025 a marzo 2026 mediante el cumplimiento de requisitos, los resultados de los núcleos estructurantes y las evaluaciones finales disponibles, con el fin de identificar hallazgos y recomendaciones para la mejora institucional.')
 +'<h3>1.3. Objetivos específicos</h3><ol><li>Caracterizar la cohorte por carrera y modalidad de estudio.</li><li>Analizar el cumplimiento de requisitos y las incidencias registradas.</li><li>Examinar las calificaciones de los cuatro núcleos estructurantes por carrera.</li><li>Diferenciar los resultados del Examen Complexivo y del Trabajo de Titulación.</li><li>Consolidar los indicadores y formular conclusiones sustentadas.</li></ol>'
 +'<h3>1.4. Alcance y metodología</h3>'+p('El informe comprende exclusivamente octubre 2025 a marzo 2026, con documentos separados para presencial y online. Se utilizan frecuencias absolutas, porcentajes y estadísticas descriptivas de calificaciones. El denominador de cada indicador se determina según la fase y la población efectivamente registrada. Las notas faltantes permanecen pendientes, no se convierten en cero ni en reprobaciones.');
}
function legal(Table){
 return '<h2>2. Marco legal y normativo</h2><p>El proceso se examina en relación con la Constitución de la República del Ecuador, la Ley Orgánica de Educación Superior, el Reglamento de Régimen Académico y la normativa institucional vigente de titulación. Los artículos específicos y sus reformas deben validarse antes de aprobar el informe; no se reproducen automáticamente citas de documentos antiguos.</p>'
 +Table('Referentes normativos para titulación',['Norma','Ámbito de aplicación'],[
 ['Constitución de la República del Ecuador','Derecho a la educación, calidad e igualdad de oportunidades.'],
 ['Ley Orgánica de Educación Superior','Derechos estudiantiles, permanencia, egreso y titulación.'],
 ['Reglamento de Régimen Académico','Organización académica, mecanismos y evaluación de titulación.'],
 ['Normativa interna ITSQMET','Requisitos, actas, responsabilidades y criterios de evaluación.']
 ],'Síntesis de fuentes institucionales; pendiente de validar artículos y vigencia')
 +'<p>Las ponderaciones académicas se registran conforme a las reglas del período facilitadas por la Coordinación de Titulación; la aprobación definitiva exige contrastarlas con actas y normativa aplicable.</p>';
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
'.inf-index{break-after:page;page-break-after:always;line-height:1.4;font-family:"Times New Roman",serif}',
'.inf-index h2{font:bold 13pt/1.3 "Times New Roman",serif;text-align:center;margin:0 0 14pt}',
'.inf-index-item{display:flex;gap:7pt;align-items:flex-end;margin:4pt 0;break-inside:avoid}',
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
