/* Informetit: generador local de los dos informes. Incluye registros nominales únicamente
   cuando existen en la base privada de Electron; nunca se publican en el repositorio. */
(() => {
'use strict';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const F=(x,n=2)=>Number(x).toLocaleString('es-EC',{minimumFractionDigits:n,maximumFractionDigits:n});
const dateText=x=>{const v=String(x??'');return /^\d{4}-\d{2}-\d{2}$/.test(v)?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):v||'Por definir'};
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
const missingText=x=>/^(?:sin (?:datos|información|desglose|nómina|calificación)|no (?:disponible|calculable|cargada)|por (?:confirmar|asignar|conciliar|validar)|pendiente|ejecución por verificar)/i.test(String(x??'').trim())?'<span class="inf-missing">'+E(x)+'</span>':E(x);
const H=(n,t)=>{const level=n===3&&/^\d+\.\d+\.\d+\./.test(String(t))?4:n;return '<h'+level+'>'+E(t)+'</h'+level+'>'};
function Table(name,heads,rows,note='Datos disponibles de la cohorte, según registros institucionales'){
 tables++;let html='<div class="tbl"><p class="tlabel">Tabla '+tables+'</p><p class="tname">'+E(name)+'</p><table><thead><tr>'+heads.map(x=>'<th>'+E(x)+'</th>').join('')+'</tr></thead><tbody>';
 html+=(rows.length?rows.map(r=>'<tr>'+r.map(x=>'<td>'+missingText(x)+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+heads.length+'">Sin información verificada</td></tr>');
 return html+'</tbody></table><p class="note">Nota. '+E(note)+'.</p></div>';
}
function Figure(name,rows,{max,percentage=false,decimals=0,note='No se interpolan los valores faltantes.',diagramSvg=null}={}){
 if(!rows.length)return '';
 figs++;
 if(diagramSvg)return '<div class="fig"><p class="flabel">Figura '+figs+'</p><p class="fname">'+E(name)+'</p>'+diagramSvg+'<p class="note">Nota. '+E(note)+'.</p></div>';
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
const STYLES='@page{size:A4;margin:2.54cm}@page:first{margin:1.5cm}*{box-sizing:border-box}body{font:12pt/2 "Times New Roman",serif;color:#121212;margin:0}p{text-align:justify;margin:0 0 9pt;orphans:3;widows:3}h2{font:bold 13pt/1.4 "Times New Roman",serif;text-align:center;margin:18pt 0 10pt;break-after:avoid}h3{font:bold 12pt/1.4 "Times New Roman",serif;margin:15pt 0 8pt;break-after:avoid}ol{padding-left:27pt;margin:4pt 0 12pt}li{padding-left:2pt;margin:3pt 0}table{border-collapse:collapse;width:100%;table-layout:auto}thead{display:table-header-group}tfoot{display:table-footer-group}th,td{padding:5pt 4pt;text-align:left;border-bottom:.5pt solid #888;overflow-wrap:anywhere;word-break:normal}th{border-top:1pt solid #222;border-bottom:1pt solid #222}tr{break-inside:avoid;page-break-inside:avoid}.cover{font-family:Arial;line-height:1.35;min-height:245mm;break-after:page;position:relative}.cover .header{font:8pt Arial;table-layout:fixed}.cover .header td{border:1px solid #777;text-align:center}.cover .logo{max-width:70pt;max-height:44pt}.cover h1{font:bold 18pt Arial;text-align:center}.cover-title{margin-top:105pt;text-align:center}.cover-title p{text-align:center;font:bold 13pt/1.5 Arial}.cover-title small{font:9pt Arial}.sign{margin-top:125pt;font:8pt Arial}.sign th,.sign td{border:1px solid #888;vertical-align:top}.sign td{height:55pt}.tbl,.fig{margin:13pt 0 17pt;break-inside:auto}.tbl table{font:8.6pt/1.35 Arial,sans-serif;table-layout:auto;hyphens:none}.tbl td,.tbl th{overflow-wrap:break-word;word-break:normal}.tbl tr{break-inside:avoid}.tlabel,.flabel{font:bold 10pt/1.2 "Times New Roman",serif;text-align:left;break-after:avoid}.tname,.fname{font:italic 10pt/1.25 "Times New Roman",serif;text-align:left;break-after:avoid}.note{font:8pt/1.3 Arial,sans-serif;margin-top:5pt}.fig{break-inside:avoid}.fig svg{display:block;width:100%;height:auto;max-height:360pt;line-height:1}.toc{font:11pt/1.7 "Times New Roman",serif}.privacy{font:9pt Arial;color:#444}@media screen{body{max-width:840px;margin:auto;padding:24px;background:#fff}}';
function makeReport(state,mode){
 tables=0;figs=0;const d=getData(state,mode),n=d.total,desc=mode==='online'?'online':'presencial',cfg=state?.config||{};
 const DOC=window.InformetitDocument;if(!DOC)throw Error('Módulo de formato INF no disponible');
 if(!window.InformetitNuclei)throw Error('Motor de núcleos no disponible');
 if(!window.InformetitComplexivo)throw Error('Motor de Examen Complexivo no disponible');
 if(!window.InformetitTrabajo||!window.InformetitConsolidado)throw Error('Motores de Trabajo de Titulación y consolidación no disponibles');
 if(!window.InformetitQuality)throw Error('Motor de control documental no disponible');
 if(!window.InformetitInformeCompleto)throw Error('Módulo de informe completo no disponible');
 const quality=window.InformetitQuality.analyze(state,mode);
 const phaseReq=window.InformetitRequirements.analyze(state,mode);
 const totalChecks=phaseReq.checks.applicable,done=phaseReq.checks.ok;
 const pending=phaseReq.source==='individual'?phaseReq.checks.fail+phaseReq.checks.unknown:phaseReq.checks.unclassified;
 let out='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe Final del Proceso de Titulación · '+desc+'</title><style>'+STYLES+'\n'+DOC.CSS+'</style></head><body>';
 out+=DOC.cover(state,mode);
 out+='<!--INFORMETIT_INDEX-->';
 out+=DOC.introduction();
 out+=DOC.legal(Table);
 out+=H(2,'3. Planificación y organización');
 out+=para('La planificación de Examen Complexivo comprende cuatro núcleos estructurantes, evaluación ordinaria y supletorio. Según lo comunicado por la coordinación, todas estas actividades se realizaron. Su realización declarada se distingue de la revisión documental de actas y evidencias. Los procesos de Trabajo de Titulación se informan por separado.');
 const statusPlan={pendiente:'Por revisar',cumple:'Realizado (declarado)',no_cumple:'No realizado',no_aplica:'No aplica'};
 const statusFor=key=>Object.prototype.hasOwnProperty.call(state?.ejecucion||{},key)?statusPlan[state.ejecucion[key]]||statusPlan.pendiente:statusPlan.cumple;
 out+=Table('Cronograma de Examen Complexivo',['Actividad','Inicio','Fin','Estado declarado'],
  nucleus.map((row,i)=>{const key='complexivo|'+i,over=state?.cronogramaPersonalizado?.[key]||{};
    return [row[0],dateText(over.inicio??row[1]),dateText(over.fin??row[2]),
      statusFor(key)]}),
  'Realización declarada por coordinación. La verificación de actas y evidencias es un control documental independiente');
 if(!window.InformetitNucleiMethodology)throw Error('Módulo metodológico no disponible');
 out+=window.InformetitNucleiMethodology.render(d.careers,{H,para,Figure});
 const phase1=window.InformetitRequirements.analyze(state,mode);
 out+=window.InformetitRequirements.renderReport(phase1,{Table,Figure,H,para,F,P});
 const nucleiData=window.InformetitNuclei.build(state,mode);
 out+=window.InformetitNuclei.renderReport(nucleiData,{Table,Figure,H,para,F,P,
   courseSections:(careerKey,n,careerName)=>window.InformetitInformeCompleto.courseSections(
     state,mode,careerKey,n,careerName,{Table,Figure,H,para,F,P})});
 const trabajosData=window.InformetitTrabajo.analyze(state,mode);
 out+=window.InformetitTrabajo.renderReport(trabajosData,{Table,Figure,H,para,F,P});
 out+=H(3,'6.5. Cronograma de Trabajo de Titulación');
 out+=para('Según lo comunicado por la coordinación, las actividades de Trabajo de Titulación se realizaron. Sus fechas se mantienen editables y el soporte de cada actividad debe revisarse por separado.');
 let workIndex=0;
 for(const [fase,rows] of Object.entries(thesis)){
   out+=H(3,fase);
   const plan=rows.map(row=>{
     const key='trabajo|'+(workIndex++),override=state?.cronogramaPersonalizado?.[key]||{};
     return [row[0],dateText(override.inicio??row[1]),dateText(override.fin??row[2]),
       statusFor(key)];
   });
   out+=Table('Actividades programadas: '+fase,['Actividad','Inicio','Fin','Estado declarado'],plan,
     'Realización declarada por coordinación; los documentos y actas de respaldo requieren cotejo independiente');
 }
 const complexivoData=window.InformetitComplexivo.analyze(state,mode);
 out+=window.InformetitComplexivo.renderReport(complexivoData,{Table,Figure,H,para,F,P});
 out+=window.InformetitInformeCompleto.examDetail(complexivoData,{Table,Figure,H,para,F,P});
 const cierre=window.InformetitConsolidado.analyze(state,mode);
 out+=window.InformetitConsolidado.renderReport(cierre,{Table,Figure,H,para,F,P});
 out+=window.InformetitExecutive.render(state,mode,{requirements:phaseReq,nuclei:nucleiData,quality,cierre},{Table,Figure,H,para,F,P});
 out+=H(2,'10. Conclusiones');
 if(!cierre.counts.total){
  out+=para('La fuente agregada identifica '+n+' estudiantes de la modalidad '+desc+', pero no se dispone en esta ejecución de una nómina nominal que permita distribuirlos entre Examen Complexivo y Trabajo de Titulación. Por esa razón, las tasas de aprobación, reprobación y recuperación no son calculables y no se presentan como cero.');
  out+=para('Se han identificado '+d.completos8+' estudiantes con ocho requisitos previos completos y '+d.completos9+' con nueve controles completos, según el resumen disponible. La ausencia de evaluaciones finales nominales impide deducir resultados de graduación.');
 }else{
  out+=para('La cohorte '+desc+' comprende '+cierre.counts.total+' estudiantes nominales: '+cierre.counts.complexivo+' asignados a Examen Complexivo y '+cierre.counts.trabajo+' a Trabajo de Titulación. De sus registros disponibles, '+cierre.counts.approved+' presentan aprobación calculada y '+cierre.counts.pending+' resultados siguen pendientes; corresponde contrastar cada resultado con actas originales.');
  out+=para('Los resultados calculados no acreditan por sí solos la emisión de títulos ni la aprobación institucional. El análisis requiere mantener separadas la verificación de requisitos y la evaluación final.');
 }
 out+=para('El cierre de la modalidad exige conciliar las poblaciones, las fuentes de notas, la ejecución del cronograma y los instrumentos de evaluación antes de presentar una tasa oficial de titulación.');
 out+='<ol><li>La modalidad '+desc+' registra '+n+' estudiantes en la fuente poblacional utilizada.</li><li>Constan '+d.completos9+' estudiantes con nueve controles completos, cifra que no equivale a aprobación de examen.</li><li>Los indicadores individuales sin respaldo nominal se mantienen como no calculables.</li><li>Las observaciones de integridad y trazabilidad deben resolverse antes de la aprobación del documento.</li></ol>';
 out+=H(2,'11. Recomendaciones');
 out+='<ol><li>Conciliar la base de estudiantes con los libros de calificaciones y resolver registros duplicados o discrepantes.</li><li>Dar seguimiento a las categorías con más verificaciones pendientes y documentar su cierre.</li><li>Separar planificado, ejecutado, evidenciado y aprobado para cada hito.</li><li>Incorporar actas y supletorios antes de calcular indicadores de aprobación definitiva.</li><li>Revisar la versión normativa, los códigos institucionales y las firmas antes de aprobar el informe.</li></ol>';
 out+=window.InformetitInformeCompleto.improvementPlan(state,mode,quality,{Table,Figure,H,para,F,P});
 const reportQuality=window.InformetitQuality.analyze(state,mode);
 out+=window.InformetitQuality.report(reportQuality,{Table,Figure,H,para,F,P});
 out+=window.InformetitInformeCompleto.requirementAppendix(state,mode,{Table,Figure,H,para,F,P});
 out+=window.InformetitInformeCompleto.coverageReport(state,mode,{Table,Figure,H,para,F,P});
 out+='<p class="privacy">BORRADOR SIN VALIDAR. Las notas provisionales y los resultados sin acta cotejada no se consideran oficiales. Las observaciones deben resolverse antes de la aprobación institucional.</p>';
 out+=H(2,'14. Referencias Bibliográficas');
 out+=para('Las referencias siguientes identifican las fuentes normativas públicas consultadas. La vigencia de sus reformas se cotejará con las versiones aplicables al período antes de la aprobación institucional.');
 const referencias=[
 ['Asamblea Constituyente. (2008).','Constitución de la República del Ecuador',' (Registro Oficial No. 449).','https://www.asambleanacional.gob.ec/sites/default/files/private/asambleanacional/filesasambleanacionalnameuid-29/constitucion-republica-inc-sent-cc.pdf'],
 ['Asamblea Nacional del Ecuador. (2010).','Ley Orgánica de Educación Superior',' (Suplemento del Registro Oficial No. 298).','https://www.registroficial.gob.ec/suplemento-al-registro-oficial-no-298-8/'],
 ['Consejo de Educación Superior. (2022).','Reglamento de Régimen Académico',' (Resolución RPC-SE-08-No.023-2022).','https://www.ces.gob.ec/wp-content/uploads/2025/05/Reglamento-de-Regimen-Academico.pdf']
 ];
 out+=referencias.map(([autor,titulo,info,url])=>'<p class="apa-ref">'+E(autor)+' <i>'+E(titulo)+'</i>'+E(info)+' <a href="'+E(url)+'">'+E(url)+'</a></p>').join('');
 out+='<p class="privacy">La normativa institucional de circulación interna, los libros de Moodle y las actas individuales se relacionan como fuentes de evidencia en el Anexo A hasta disponer de metadatos documentales verificables. No se les asignan ediciones o fechas ficticias.</p>';
 out+='</body></html>';
 const generated=DOC.indexize(out);
 return generated.html.replace('<!--INFORMETIT_INDEX-->',generated.front);
}
async function download(state,mode){
 const html=makeReport(state,mode),codigo=window.InformetitDocument.fields(state,mode).code;
 const filename=codigo+'_Informe_Titulacion_'+(mode==='online'?'Online':'Presencial')+'.pdf';
 const header=window.InformetitDocument.printHeader(state,mode);
 if(window.informetitDesktop?.saveAPAHTML)
   return window.informetitDesktop.saveAPAHTML(html,filename,{headerTemplate:header,indexPageNumbers:true});
 const w=window.open('','_blank');
 if(!w)throw Error('El navegador bloqueó la vista de impresión');
 w.document.write(html);w.document.close();w.addEventListener('load',()=>w.print());return null;
}
window.InformetitFullReport={makeReport,download,getData};
})();