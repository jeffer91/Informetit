/* Informetit: informe institucional extenso. No incluye registros nominales. */
(() => {
'use strict';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const F=(x,n=2)=>Number(x).toLocaleString('es-EC',{minimumFractionDigits:n,maximumFractionDigits:n});
const P=(x,n)=>n?100*x/n:0;
const avg=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
const keys=['Academico','Documentacion','Financiero','Practicas','Vinculacion','Seguimiento','Ingles','Datos','Titulacion'];
const nucleus=[['Núcleo 1','30/03/2026','02/04/2026'],['Núcleo 2','06/04/2026','09/04/2026'],['Núcleo 3','10/04/2026','14/04/2026'],['Núcleo 4','15/04/2026','18/04/2026'],['Examen ordinario','20/04/2026','24/04/2026'],['Supletorio','04/05/2026','04/05/2026']];
const thesis={
'Fase 1. Inicio y planificación':[['Inducción','16/12/2025','16/12/2025'],['Clase de redacción eficiente de tesis','28/01/2026','28/01/2026'],['Propuesta de temas','01/02/2026','01/02/2026'],['Aprobación del tema','02/02/2026','04/02/2026'],['Elaboración del plan','08/02/2026','08/02/2026'],['Aprobación del plan','09/02/2026','11/02/2026']],
'Fase 2. Desarrollo y tutorías':[['Desarrollo del trabajo','11/02/2026','28/02/2026'],['Borrador 1','01/03/2026','01/03/2026'],['Revisión del borrador 1','02/03/2026','05/03/2026'],['Borrador 2','08/03/2026','08/03/2026'],['Revisión del borrador 2','09/03/2026','13/03/2026'],['Ajustes finales','14/03/2026','19/03/2026'],['Entrega del trabajo','22/03/2026','22/03/2026'],['Aprobación del tutor e informe antiplagio','23/03/2026','25/03/2026'],['Fin de clases','27/03/2026','27/03/2026']],
'Fase 3. Defensa final':[['Preparación de defensa','25/03/2026','08/04/2026'],['Defensa','14/04/2026','15/04/2026'],['Tutoría extra de supletorio','14/04/2026','15/04/2026'],['Supletorio defensa','16/04/2026','18/04/2026'],['Cierre','20/04/2026','20/04/2026']]
};
const presencialCompletes={'Enfermería':43,'Educación Inicial':38,'Marketing Digital y Comercio Electrónico':39,'Redes y Telecomunicaciones':27,'Contabilidad':21,'Educación Básica':21,'Desarrollo de Software':17,'Estética Integral':17,'Administración':16,'Gestión del Talento Humano':15};
let tables=0,figs=0;
const para=(x)=>'<p>'+E(x)+'</p>';
const H=(n,t)=>'<h'+n+'>'+E(t)+'</h'+n+'>';
function Table(name,heads,rows,note='Datos disponibles de la cohorte, según registros institucionales'){
 tables++;let html='<div class="tbl"><p class="tlabel">Tabla '+tables+'</p><p class="tname">'+E(name)+'</p><table><thead><tr>'+heads.map(x=>'<th>'+E(x)+'</th>').join('')+'</tr></thead><tbody>';
 html+=(rows.length?rows.map(r=>'<tr>'+r.map(x=>'<td>'+E(x)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+heads.length+'">Sin información verificada</td></tr>');
 return html+'</tbody></table><p class="note">Nota. '+E(note)+'.</p></div>';
}
function Figure(name,rows,{max,percentage=false,decimals=0,note='No se interpolan los valores faltantes.'}={}){
 if(!rows.length)return '';
 figs++;
 const W=615,left=254,right=65,bw=W-left-right,rh=27,height=36+rows.length*rh;
 const ceiling=max||Math.max(1,...rows.map(r=>Number(r[1])||0));
 let svg='<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+E(name)+'" viewBox="0 0 '+W+' '+height+'"><rect width="'+W+'" height="'+height+'" fill="#fff"/>';
 rows.forEach((r,i)=>{
  const val=Number(r[1])||0,y=15+i*rh,bar=Math.max(0,Math.min(bw,bw*val/ceiling)),label=String(r[0]);
  const short=label.length>40?label.slice(0,37)+'…':label;
  svg+='<text x="'+(left-7)+'" y="'+(y+15)+'" font-family="Arial" font-size="11" fill="#22374e" text-anchor="end">'+E(short)+'</text><rect x="'+left+'" y="'+y+'" width="'+bw+'" height="18" rx="2" fill="#e7edf3"/><rect x="'+left+'" y="'+y+'" width="'+bar+'" height="18" rx="2" fill="#23628f"/><text x="'+(left+bw+4)+'" y="'+(y+14)+'" font-family="Arial" font-size="11">'+F(val,decimals)+(percentage?' %':'')+'</text>';
 });
 svg+='</svg>';
 return '<div class="fig"><p class="flabel">Figura '+figs+'</p><p class="fname">'+E(name)+'</p>'+svg+'<p class="note">Nota. '+E(note)+'</p></div>';
}
function getData(state,mode){
 const fallback=window.InformetitPublicSummary?.DATA?.[mode];
 if(!fallback)throw Error('No existe el resumen inicial de '+mode);
 const requirementSummary=window.InformetitRequirements?.analyze(state,mode);
 const model=window.InformetitDataModel;
 const hasIndividuals=(state?.estudiantes||[]).some(s=>s.modalidad===mode);
 if(hasIndividuals&&model){
  const a=model.analyze(state,mode),audit=model.audit(state);
  const careers=a.careers.map(c=>({name:c.name,n:c.total,passed:c.complete9}));
  const N=(name,k)=>{
   const x=a.nucleus(name,k);
   return {...x,aggregate:false,provisional:false,individual:x.n,source:'base_local'};
  };
  // Un documento con nómina individual parcial informa solo la parte disponible.
  return {...fallback,total:a.total,careers,completos8:requirementSummary?.complete8??a.complete8,completos9:requirementSummary?.complete9??a.complete9,
   requisitos:requirementSummary?.requirements.map(r=>[r.label,r.ok,r.fail+r.unknown])||a.byReq.map((r,i)=>[fallback.requisitos[i]?.[0]||r.field,r.compliant,r.pending]),
   people:a.students,notes:a.notes,finals:a.evaluations,N,excludedConflicts:a.conflicts.length,
   fullRoster:a.total===fallback.total&&audit.canUseIndividual,
   source:a.total===fallback.total&&audit.canUseIndividual?'base_local_completa':'base_local_parcial'};
 }
 const careers=fallback.carreras.map(([name,n])=>({name,n,passed:mode==='presencial'?presencialCompletes[name]??null:null}));
 const N=(name,k)=>{
  const source=mode==='presencial'?(window.InformetitNucleos?.datos?.[name]||[])[k-1]:null;
  return source?{n:source[0],mean:source[1],min:source[2],max:source[3],
     aggregate:true,provisional:false,source:'word_resumen_sin_individuos'}:
    {n:0,mean:null,min:null,max:null,aggregate:false,provisional:false,source:'no_disponible'};
 };
 return {...fallback,careers,people:[],notes:[],finals:[],N,fullRoster:false,
  source:'resumen_publico_sin_identificacion'};
}
const STYLES='@page{size:A4;margin:2.54cm}@page:first{margin:1.5cm}*{box-sizing:border-box}body{font:12pt/2 "Times New Roman",serif;color:#121212;margin:0}p{text-align:justify;margin:0 0 9pt;orphans:3;widows:3}h2{font:bold 13pt/1.4 "Times New Roman",serif;text-align:center;margin:18pt 0 10pt;break-after:avoid}h3{font:bold 12pt/1.4 "Times New Roman",serif;margin:15pt 0 8pt;break-after:avoid}ol{padding-left:27pt;margin:4pt 0 12pt}li{padding-left:2pt;margin:3pt 0}table{border-collapse:collapse;width:100%}th,td{padding:5pt 4pt;text-align:left;border-bottom:.5pt solid #888;overflow-wrap:anywhere}th{border-top:1pt solid #222;border-bottom:1pt solid #222}tr{break-inside:avoid}.cover{font-family:Arial;line-height:1.35;min-height:245mm;break-after:page;position:relative}.cover .header{font:8pt Arial;table-layout:fixed}.cover .header td{border:1px solid #777;text-align:center}.cover .logo{max-width:70pt;max-height:44pt}.cover h1{font:bold 18pt Arial;text-align:center}.cover-title{margin-top:105pt;text-align:center}.cover-title p{text-align:center;font:bold 13pt/1.5 Arial}.cover-title small{font:9pt Arial}.sign{margin-top:125pt;font:8pt Arial}.sign th,.sign td{border:1px solid #888;vertical-align:top}.sign td{height:55pt}.tbl,.fig{margin:13pt 0 17pt;break-inside:auto}.tbl table{font:9pt/1.3 Arial,sans-serif}.tbl tr{break-inside:avoid}.tlabel,.flabel{font:bold 10pt/1.2 "Times New Roman",serif;text-align:left;break-after:avoid}.tname,.fname{font:italic 10pt/1.25 "Times New Roman",serif;text-align:left;break-after:avoid}.note{font:8pt/1.3 Arial,sans-serif;margin-top:5pt}.fig{break-inside:avoid}.fig svg{display:block;width:100%;height:auto;max-height:360pt;line-height:1}.toc{font:11pt/1.7 "Times New Roman",serif}.privacy{font:9pt Arial;color:#444}@media screen{body{max-width:840px;margin:auto;padding:24px;background:#fff}}';
function makeReport(state,mode){
 tables=0;figs=0;const d=getData(state,mode),n=d.total,desc=mode==='online'?'online':'presencial',cfg=state?.config||{};
 const DOC=window.InformetitDocument;if(!DOC)throw Error('Módulo de formato INF no disponible');
 const phaseReq=window.InformetitRequirements.analyze(state,mode);
 const totalChecks=phaseReq.checks.applicable,done=phaseReq.checks.ok;
 const pending=phaseReq.source==='individual'?phaseReq.checks.fail+phaseReq.checks.unknown:phaseReq.checks.unclassified;
 const notesCount=d.careers.reduce((x,c)=>x+[1,2,3,4].reduce((q,k)=>q+d.N(c.name,k).n,0),0);
 let out='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe de titulación '+desc+'</title><style>'+STYLES+'\n'+DOC.CSS+'</style></head><body>';
 out+=DOC.cover(state,mode);
 out+='<!--INFORMETIT_INDEX-->';
 out+=H(2,'Resumen ejecutivo');
 out+=para('El presente informe documenta la cohorte octubre de 2025 a marzo de 2026 del Instituto Superior Tecnológico Quito Metropolitano, modalidad '+desc+'. Organiza el seguimiento en requisitos, núcleos estructurantes y evaluación final, distinguiendo Examen Complexivo y Trabajo de Titulación.');
 out+=para('En esta modalidad se registran '+n+' estudiantes. '+d.completos8+' cumplen los ocho requisitos previos ('+F(P(d.completos8,n))+' %) y '+d.completos9+' presentan los nueve controles completos ('+F(P(d.completos9,n))+' %). Este último resultado es administrativo y no representa aprobación académica del examen.');
 out+=para('Se dispone de '+notesCount+' registros de calificaciones correspondientes a núcleos en forma individual o agregada según fuente. Las notas no entregadas figuran como pendientes y no se convierten en calificaciones cero.');
 out+=DOC.introduction();
 out+=DOC.legal(Table);
 out+=H(2,'3. Planificación y organización');
 out+=para('La planificación de Examen Complexivo contempla cuatro núcleos estructurantes y las etapas ordinaria y supletoria. Las fechas que se presentan son programadas y no deben interpretarse como constancia de ejecución. Los procesos de Trabajo de Titulación se registran separadamente.');
 out+=Table('Cronograma de Examen Complexivo',['Actividad','Inicio','Fin'],nucleus,'Cronograma de la cohorte comunicado por la coordinación');
 const phase1=window.InformetitRequirements.analyze(state,mode);
 out+=window.InformetitRequirements.renderReport(phase1,{Table,Figure,H,para,F,P});
 out+=H(2,'5. Fase II. Núcleos estructurantes');
 out+=para('Los cuatro núcleos son actividades de preparación académica y deben analizarse por carrera. La aplicación conserva las notas finales disponibles y, cuando corresponda, las evaluaciones parciales y talleres. Los promedios se calculan con las notas individuales disponibles o con estadísticas procedentes del Word institucional de trabajo. Conforme al criterio de la coordinación, las notas del Word se utilizan como resultados de referencia; su procedencia se conserva y cualquier discrepancia con Moodle se registra para revisión. Una nota faltante no equivale a cero.');
 out+=Table('Cronograma de núcleos estructurantes',['Núcleo','Inicio','Fin'],nucleus.slice(0,4),'Fechas programadas');
 out+=H(3,'5.1. Cobertura global por carrera y núcleo');
 const allRows=d.careers.map(c=>[c.name,...[1,2,3,4].map(k=>{let x=d.N(c.name,k);return x.n+' / '+(x.mean==null?'Pend.':F(x.mean));})]);
 out+=Table('Cantidad de registros y promedio por núcleo (n / media)',['Carrera','N1','N2','N3','N4'],allRows,'Las casillas pendientes no representan reprobación');
 out+=H(3,'5.2. Análisis por carrera');
 for(const c of d.careers){
  out+=H(3,'Resultados de '+c.name);
  const rs=[1,2,3,4].map(k=>({k,...d.N(c.name,k)}));
  out+=Table('Resultados por núcleo: '+c.name,['Núcleo','Registros','Promedio','Mínimo','Máximo'],rs.map(r=>['Núcleo '+r.k,r.n,r.mean==null?'Pendiente':F(r.mean),r.min==null?'No disponible':F(r.min),r.max==null?'No disponible':F(r.max)]),'Datos individuales locales o estadísticas del Word de trabajo aceptadas para el período; divergencias con Moodle sujetas a revisión');
  const avail=rs.filter(r=>r.mean!==null);
  if(!avail.length)out+=para('No se han incorporado calificaciones verificadas de '+c.name+' en los cuatro núcleos. Las tablas están preparadas y permanecen pendientes hasta recibir los registros correspondientes.');
  else{
   out+=para('Las calificaciones disponibles en '+c.name+' cubren '+avail.length+' de cuatro núcleos. '+avail.map(r=>'En el núcleo '+r.k+' hay '+r.n+' registros y una media de '+F(r.mean)).join('; ')+'. Los tamaños de muestra deben revisarse antes de comparar los resultados con los de otras carreras.');
   out+=Figure('Promedio de núcleos disponibles: '+c.name,avail.map(r=>['Núcleo '+r.k,r.mean]),{max:10,decimals:2,note:'Escala 0 a 10; cada dato representa únicamente la muestra con calificación disponible.'});
  }
 }
 out+=H(3,'5.3. Interpretación y limitaciones');
 out+=para('Las 19 tablas de núcleos extraídas del Word de trabajo corresponden a Enfermería, Educación Inicial, Marketing, Redes y Contabilidad. Se emplean conforme al criterio de la coordinación, conservando su fuente y controles de coherencia frente a registros de Moodle. La aplicación no debe copiar sus notas a la cohorte nominal sin comprobar cédulas, cursos y modalidades. Comparar medias de aulas con coberturas distintas requiere identificar previamente esas diferencias.');
 out+=H(2,'6. Trabajo de Titulación');
 out+=para('El mecanismo de Trabajo de Titulación dispone de un cronograma distinto, que comprende formulación de temas, tutorías, revisión de borradores, informe antiplagio, defensa y supletorio. No se fusionan sus calificaciones con los cuatro núcleos del Examen Complexivo.');
 for(const [fase,rows] of Object.entries(thesis)){out+=H(3,fase);out+=Table('Actividades programadas: '+fase,['Actividad','Inicio','Fin'],rows,'Cronograma proporcionado para el período octubre 2025–marzo 2026');}
 out+=para('La Guía institucional para la formulación y aprobación de títulos de titulación (octubre de 2026) requiere una sola acción central, un objeto único, neutralidad, delimitación y viabilidad. La revisión puede finalizar en Aprobado, Corregir o Reformular. La guía debe considerarse un instrumento de validación de propuestas y no evidencia de ejecución del cronograma 2025–2026.');
 out+=H(2,'7. Fase III. Evaluación del Examen Complexivo y defensas');
 const finals=d.finals,ok=finals.filter(x=>x.status==='aprobado').length,bad=finals.filter(x=>x.status==='reprobado').length,abs=finals.filter(x=>x.status==='no_presentado').length,pend=finals.length-ok-bad-abs;
 if(finals.length){out+=Table('Resultados finales cargados en Informetit',['Estado','Registros'],[['Aprobados',ok],['Reprobados',bad],['No presentados',abs],['Pendientes',pend],['Actas o registros incorporados',finals.length]],'Resultados parciales; el denominador es el total de evaluaciones registradas');out+=Figure('Distribución de resultados cargados',[['Aprobado',ok],['Reprobado',bad],['No presentado',abs],['Pendiente',pend]]);}
 else out+=para('No se han incorporado actas oficiales de la evaluación ordinaria, defensa o supletorio en esta modalidad. No es válido presentar tasas de aprobación o reprobación calculadas desde los requisitos previos o las notas de los núcleos.');
 out+=Table('Evidencias necesarias para cerrar la Fase III',['Indicador','Situación actual'],[['Habilitados y convocados','Requiere registro individual'],['Asistentes a evaluación ordinaria','Requiere acta'],['Notas teóricas y prácticas',finals.length?'Parcialmente registrado':'Pendiente'],['Aprobación en primera instancia',finals.length?'Parcialmente registrado':'Pendiente'],['Supletorios y reprobaciones','Requiere actas de recuperación'],['Resultado definitivo','Pendiente de validación institucional']],'No se confunden datos no cargados con estudiantes reprobados');
 out+=H(2,'8. Síntesis general de la cohorte');
 out+=para('El cumplimiento integral de los requisitos, la preparación académica y los resultados definitivos de titulación se interpretan por separado. Para la modalidad '+desc+', los indicadores de eficiencia terminal solo podrán cerrarse al incorporar las actas oficiales y verificar los estudiantes convocados, presentados y aprobados. No se efectúan comparaciones con otras cohortes en este informe.');
 out+=H(2,'9. Conclusiones');
 out+='<ol><li>En la modalidad '+desc+' constan '+n+' estudiantes, de los que '+d.completos9+' cumplen íntegramente los nueve controles ('+F(P(d.completos9,n))+' %).</li><li>En los ocho requisitos previos se identifican '+pending+' verificaciones pendientes; no representan necesariamente a '+pending+' personas.</li><li>El análisis académico de los cuatro núcleos debe completarse con registros verificados y muestras comparables.</li><li>Los resultados definitivos de titulación están pendientes de actas suficientes para establecer un cierre institucional.</li></ol>';
 out+=H(2,'10. Recomendaciones');
 out+='<ol><li>Conciliar la base de estudiantes con los libros de calificaciones y resolver registros duplicados o discrepantes.</li><li>Dar seguimiento a las categorías con más verificaciones pendientes y documentar su cierre.</li><li>Separar planificado, ejecutado, evidenciado y aprobado para cada hito.</li><li>Incorporar actas y supletorios antes de calcular indicadores de aprobación definitiva.</li><li>Revisar la versión normativa, los códigos institucionales y las firmas antes de aprobar el informe.</li></ol>';
 out+=H(2,'Referencias y control documental');
 out+=para('Instituto Superior Tecnológico Quito Metropolitano. (2026). Informe final del proceso de titulación, octubre 2025 a marzo 2026 [Documento de trabajo].');
 out+=para('Instituto Superior Tecnológico Quito Metropolitano. (2026). Reporte de aprobación de titulación [Matriz institucional].');
 out+=para('Unidad de Titulación y Eficiencia Terminal. (2026). Cronogramas institucionales de Examen Complexivo y Trabajo de Titulación [Registros de planificación].');
 out+=para('Unidad de Titulación y Eficiencia Terminal. (2026). Guía institucional para la formulación y aprobación de títulos de titulación [Versión 1.0].');
 out+='<p class="privacy">BORRADOR SIN VALIDAR. Los resultados pendientes no se sustituyen por estimaciones. Se requiere validar actas, normativa y controles documentales antes de la aprobación institucional.</p></body></html>';
 const generated=DOC.indexize(out);
 return generated.html.replace('<!--INFORMETIT_INDEX-->',generated.front);
}
async function download(state,mode){
 const html=makeReport(state,mode),filename='Informe_Titulacion_'+mode+'_Oct2025_Mar2026_BORRADOR.pdf';
 const header=window.InformetitDocument.printHeader(state,mode);
 if(window.informetitDesktop?.saveAPAHTML)
   return window.informetitDesktop.saveAPAHTML(html,filename,{headerTemplate:header,indexPageNumbers:true});
 const w=window.open('','_blank');
 if(!w)throw Error('El navegador bloqueó la vista de impresión');
 w.document.write(html);w.document.close();w.addEventListener('load',()=>w.print());return null;
}
window.InformetitFullReport={makeReport,download,getData};
})();