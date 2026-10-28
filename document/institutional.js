/* Informetit: Bloque 02 - Documento INF y secciones introductorias */
(function(root){
'use strict';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PERIOD='Octubre 2025 a marzo 2026',TITLE='Informe final del proceso de titulación',UNIT='Unidad de Titulación y Eficiencia Terminal';
function date(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||'')),names=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];return m&&+m[2]>=1&&+m[2]<=12?+m[3]+'-'+names[+m[2]-1]+'-'+m[1]:String(s||'Por confirmar')}
function fields(state,mode){
 const c=state?.config||{},online=mode==='online';
 return {modality:online?'Online':'Presencial',code:online?(c.codigoOnline||'POR ASIGNAR'):(c.codigoPresencial||'UTET-INF-01-PRO-95-2026-05'),version:c.version||'1.0',date:date(c.fechaElaboracion),logo:/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(c.logoDataUrl||'')?c.logoDataUrl:'',prepared:c.elaborado||'Mgs. Jefferson Villarreal',reviewed:c.revisado||'Ing. Martha Tomalá',approved:c.aprobado||'Dr. Alex León',legal:!!c.marcoLegalValidado,signatures:!!c.firmasValidadas};
}
function pending(state,mode){
 const f=fields(state,mode),a=[];
 if(f.code==='POR ASIGNAR')a.push('Código documental online por confirmar');
 if(!state?.config?.fechaElaboracion)a.push('Fecha de elaboración pendiente');
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
const api=Object.freeze({fields,pending,printHeader,cover,introduction,legal,indexize,paginate,date});
root.InformetitDocument=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
