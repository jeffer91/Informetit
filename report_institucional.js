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
 const base=window.InformetitPublicSummary?.DATA?.[mode];if(!base)throw Error('No existe resumen para '+mode);
 const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\bONLINE\b/g,'').replace(/[^A-Z0-9]+/g,' ').trim();
 const careerKey=x=>{const v=norm(x);return v==='ADMINISTRACION DE EMPRESAS'?'ADMINISTRACION':v==='GESTION DE TALENTO HUMANO'?'GESTION DEL TALENTO HUMANO':v;};
 const people=(state?.estudiantes||[]).filter(s=>s.modalidad===mode), ids=new Set(people.map(s=>String(s.id)));
 const fullRoster=people.length===base.total&&ids.size===base.total&&!ids.has('');
 const notes=(state?.notas||[]).filter(g=>ids.has(String(g.studentId))&&g.nota!==null&&g.nota!==undefined&&String(g.nota).trim()!==''&&!['ESTIMADO','PROVISIONAL','BORRADOR','TRANSCRIPCION PROVISIONAL'].includes(norm(g.status))&&Number.isFinite(Number(String(g.nota).replace(',','.')))&&Number(String(g.nota).replace(',','.'))>=0&&Number(String(g.nota).replace(',','.'))<=10);
 const unresolved=new Set((state?.conflictos||[]).map(x=>String(x.id)));
 const gradeMap=new Map(),invalidKeys=new Set();
 for(const g of notes){
   const k=String(g.studentId)+'|'+Number(g.nucleo);
   if(unresolved.has(k)||invalidKeys.has(k))continue;
   const prev=gradeMap.get(k);
   if(!prev){gradeMap.set(k,g);continue;}
   if(Number(String(prev.nota).replace(',','.'))!==Number(String(g.nota).replace(',','.'))){
     gradeMap.delete(k);invalidKeys.add(k);
   }
 }
 const uniqueNotes=[...gradeMap.values()];
 const finals=(state?.evaluaciones||[]).filter(x=>ids.has(String(x.studentId)));
 const careers=base.carreras.map(([name,n])=>{
  const group=people.filter(s=>careerKey(s.carrera)===careerKey(name));
  const passed=group.filter(s=>keys.every(k=>String(s.requisitos?.[k]||'').trim().toUpperCase()==='CUMPLE')).length;
  return {name,n:fullRoster?group.length:n,passed:fullRoster?passed:mode==='presencial'?presencialCompletes[name]??null:null};
 });
 function N(name,k){const found=uniqueNotes.filter(x=>careerKey(x.carrera||people.find(s=>String(s.id)===String(x.studentId))?.carrera)===careerKey(name)&&Number(x.nucleo)===k);
  const xs=found.map(x=>Number(String(x.nota).replace(',','.')));
  const documented=(mode==='presencial'&&window.InformetitNucleos?.datos?.[name]||[])[k-1];
  if(documented && documented[0]>xs.length){
    return {n:documented[0],mean:documented[1],min:documented[2],max:documented[3],aggregate:true,provisional:true,individual:xs.length};
  }
  return {n:xs.length,mean:avg(xs),min:xs.length?Math.min(...xs):null,max:xs.length?Math.max(...xs):null,aggregate:false,provisional:false};}
 let requisitos=base.requisitos, completos8=base.completos8,completos9=base.completos9;
 if(fullRoster){
   requisitos=base.requisitos.map((r,i)=>{const ok=people.filter(s=>norm(s.requisitos?.[keys[i]])==='CUMPLE').length;return [r[0],ok,people.length-ok]});
   completos8=people.filter(s=>keys.slice(0,8).every(k=>norm(s.requisitos?.[k])==='CUMPLE')).length;
   completos9=people.filter(s=>keys.every(k=>norm(s.requisitos?.[k])==='CUMPLE')).length;
 }
 return {...base,careers,people,notes:uniqueNotes,finals,N,requisitos,completos8,completos9,excludedConflicts:unresolved.size+invalidKeys.size,fullRoster,source:fullRoster?'base-local-completa':'agregado-publico'};
}
const STYLES='@page{size:A4;margin:2.54cm}@page:first{margin:1.5cm}*{box-sizing:border-box}body{font:12pt/2 "Times New Roman",serif;color:#121212;margin:0}p{text-align:justify;margin:0 0 9pt;orphans:3;widows:3}h2{font:bold 13pt/1.4 "Times New Roman",serif;text-align:center;margin:18pt 0 10pt;break-after:avoid}h3{font:bold 12pt/1.4 "Times New Roman",serif;margin:15pt 0 8pt;break-after:avoid}ol{padding-left:27pt;margin:4pt 0 12pt}li{padding-left:2pt;margin:3pt 0}table{border-collapse:collapse;width:100%}th,td{padding:5pt 4pt;text-align:left;border-bottom:.5pt solid #888;overflow-wrap:anywhere}th{border-top:1pt solid #222;border-bottom:1pt solid #222}tr{break-inside:avoid}.cover{font-family:Arial;line-height:1.35;min-height:245mm;break-after:page;position:relative}.cover .header{font:8pt Arial;table-layout:fixed}.cover .header td{border:1px solid #777;text-align:center}.cover .logo{max-width:70pt;max-height:44pt}.cover h1{font:bold 18pt Arial;text-align:center}.cover-title{margin-top:105pt;text-align:center}.cover-title p{text-align:center;font:bold 13pt/1.5 Arial}.cover-title small{font:9pt Arial}.sign{margin-top:125pt;font:8pt Arial}.sign th,.sign td{border:1px solid #888;vertical-align:top}.sign td{height:55pt}.tbl,.fig{margin:13pt 0 17pt;break-inside:auto}.tbl table{font:9pt/1.3 Arial,sans-serif}.tbl tr{break-inside:avoid}.tlabel,.flabel{font:bold 10pt/1.2 "Times New Roman",serif;text-align:left;break-after:avoid}.tname,.fname{font:italic 10pt/1.25 "Times New Roman",serif;text-align:left;break-after:avoid}.note{font:8pt/1.3 Arial,sans-serif;margin-top:5pt}.fig{break-inside:avoid}.fig svg{display:block;width:100%;height:auto;max-height:360pt;line-height:1}.toc{font:11pt/1.7 "Times New Roman",serif}.privacy{font:9pt Arial;color:#444}@media screen{body{max-width:840px;margin:auto;padding:24px;background:#fff}}';
function makeReport(state,mode){
 tables=0;figs=0;const d=getData(state,mode),n=d.total,desc=mode==='online'?'online':'presencial',cfg=state?.config||{};
 const totalChecks=n*8,done=d.requisitos.slice(0,8).reduce((a,r)=>a+r[1],0),pending=totalChecks-done;
 const notesCount=d.careers.reduce((x,c)=>x+[1,2,3,4].reduce((q,k)=>q+d.N(c.name,k).n,0),0);
 let out='<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe detallado '+desc+'</title><style>'+STYLES+'</style></head><body>';
 let logo=cfg.logoDataUrl?'<img class="logo" src="'+E(cfg.logoDataUrl)+'" alt="Instituto">':'<strong>ITSQMET</strong>';
 let code=mode==='online'?cfg.codigoOnline||'Pendiente de asignación':cfg.codigoPresencial||'UTET-INF-01-PRO-95-2026-05';
 out+='<section class="cover"><table class="header"><tr><td rowspan="2">'+logo+'</td><td rowspan="2"><b>Unidad de Titulación y Eficiencia Terminal</b><br>ITSQMET</td><td>Código: '+E(code)+'</td></tr><tr><td>Versión '+E(cfg.version||'1.0')+'</td></tr><tr><td>Fecha de elaboración: '+E(cfg.fechaElaboracion||'Por validar')+'</td><td>Informe Final del Proceso de Titulación</td><td>Control documental</td></tr></table><div class="cover-title"><h1>Informe Final del Proceso de Titulación</h1><p>Modalidad '+desc+'</p><p>Octubre de 2025 a marzo de 2026</p><p><small>BORRADOR · VALIDACIÓN INSTITUCIONAL PENDIENTE</small></p></div><table class="sign"><tr><th>ELABORADO POR</th><th>REVISADO POR</th><th>APROBADO POR</th></tr><tr><td>'+E(cfg.elaborado||'MSc. Jefferson Villarreal')+'<br>Coordinador de Titulación</td><td>'+E(cfg.revisado||'Ing. Martha Tomalá')+'<br>Coordinadora General de Carreras</td><td>'+E(cfg.aprobado||'Dr. Alex León')+'<br>Vicerrector</td></tr></table></section>';
 out+=H(2,'Contenido')+'<ol class="toc"><li>Introducción, objetivos y metodología</li><li>Marco legal y normativo</li><li>Planificación del proceso</li><li>Fase I. Verificación de requisitos</li><li>Fase II. Núcleos estructurantes</li><li>Trabajo de Titulación</li><li>Fase III. Examen Complexivo y defensa</li><li>Análisis general y comparativo</li><li>Conclusiones y recomendaciones</li><li>Referencias y observaciones</li></ol>';
 out+=H(2,'Resumen ejecutivo');
 out+=para('El informe caracteriza y analiza el proceso de titulación de la cohorte octubre de 2025 a marzo de 2026 del Instituto Superior Tecnológico Quito Metropolitano, para la modalidad '+desc+'. La información comprende la verificación de requisitos institucionales, la planificación de los núcleos estructurantes y las evaluaciones finales que cuentan con evidencias cargadas.');
 out+=para('En el registro de esta modalidad constan '+n+' estudiantes. De ellos, '+d.completos8+' cumplen conjuntamente los ocho requisitos previos ('+F(P(d.completos8,n))+' %) y '+d.completos9+' cumplen los nueve controles incluidos en la matriz ('+F(P(d.completos9,n))+' %). La categoría Titulación se considera preparación académica, y no equivale a aprobación final del Examen Complexivo.');
 out+=para('Este borrador presenta '+notesCount+' calificaciones de núcleos en forma individual o agregada, según la fuente disponible. Las notas ausentes no se interpolan y los indicadores de evaluación final quedan pendientes cuando no existen actas oficiales.');
 out+=H(2,'1. Introducción');
 out+=para('La titulación permite verificar competencias y resultados de aprendizaje al culminar la formación tecnológica superior. Su planificación exige coordinación académica, verificación documental y financiera, acompañamiento estudiantil y evaluación transparente. Para valorar adecuadamente el proceso, los resultados se presentan en tres fases diferenciadas.');
 out+=H(3,'1.1. Antecedentes y justificación');
 out+=para('La necesidad de consolidar registros de estudiantes, requisitos y calificaciones surge de la complejidad de articular áreas institucionales y aulas académicas. El informe facilita la trazabilidad de evidencias y evita comparar indicadores cuyos denominadores corresponden a poblaciones diferentes.');
 out+=H(3,'1.2. Objetivo general');
 out+=para('Analizar integralmente el proceso de titulación de la cohorte octubre 2025 – marzo 2026 para la modalidad '+desc+', considerando el cumplimiento de requisitos, la planificación y ejecución académica y los resultados evaluativos disponibles, con el fin de identificar dificultades y oportunidades de mejora.');
 out+=H(3,'1.3. Objetivos específicos');
 out+='<ol><li>Caracterizar la cohorte por carreras y requisitos institucionales.</li><li>Describir cronogramas, actividades y cobertura de cuatro núcleos.</li><li>Analizar las calificaciones efectivamente registradas por carrera y núcleo.</li><li>Documentar resultados finales y supletorios, únicamente cuando existan actas.</li><li>Proponer mejoras sustentadas en hallazgos y limitaciones observados.</li></ol>';
 out+=H(3,'1.4. Alcance y método');
 out+=para('Se aplica estadística descriptiva: frecuencias, proporciones y promedios de las calificaciones disponibles. Se mantienen separados la cohorte inicial, estudiantes activos, cumplimiento integral, notas por núcleo y participantes del examen. Las fuentes nominales se consultan únicamente cuando están cargadas de manera privada en Electron; los datos públicos solo permiten análisis agregado.');
 out+=H(2,'2. Marco legal y normativo');
 out+=para('El documento institucional de referencia fundamenta el proceso en la Constitución de la República del Ecuador, la Ley Orgánica de Educación Superior, el Reglamento de Régimen Académico y la normativa interna de titulación. Los artículos, reformas y su vigencia deberán ser validados por el área responsable antes de aprobar el informe.');
 out+=Table('Normas y su relación con las fases de análisis',['Documento','Aplicación general'],[['Constitución','Derecho a la educación, calidad e igualdad de oportunidades.'],['Ley Orgánica de Educación Superior','Derechos estudiantiles, egreso y requisitos generales.'],['Reglamento de Régimen Académico','Actividades de aprendizaje, titulación, evaluación y honestidad académica.'],['Normativa interna ITSQMET','Asignaciones, controles, procedimientos de titulación y actas.']],'Síntesis del documento institucional de referencia, con vigencia normativa pendiente de comprobar');
 out+=H(2,'3. Planificación y organización');
 out+=para('La planificación de Examen Complexivo contempla cuatro núcleos estructurantes y las etapas ordinaria y supletoria. Las fechas que se presentan son programadas y no deben interpretarse como constancia de ejecución. Los procesos de Trabajo de Titulación se registran separadamente.');
 out+=Table('Cronograma de Examen Complexivo',['Actividad','Inicio','Fin'],nucleus,'Cronograma de la cohorte comunicado por la coordinación');
 out+=H(2,'4. Fase I. Verificación de requisitos');
 out+=H(3,'4.1. Caracterización inicial');
 let cr=d.careers.map(c=>[c.name,c.n,F(P(c.n,n))+' %',c.passed==null?'Pendiente':c.passed,c.passed==null?'Pendiente':F(P(c.passed,c.n))+' %']);
 out+=Table('Estudiantes y cumplimiento integral por carrera',['Carrera','Activos','Participación','Completos','Cumplimiento'],cr,'Para presencial se usan los datos por carrera del informe Word; para online se requiere la matriz nominal para la columna de cumplimiento');
 out+=Figure('Población de estudiantes por carrera',d.careers.map(c=>[c.name,c.n]),{note:'Distribución de la modalidad '+desc+' según matriz de requisitos.'});
 if(mode==='presencial')out+=para('En la cohorte presencial, Enfermería cuenta con 45 estudiantes, mientras que Educación Inicial y Marketing Digital y Comercio Electrónico registran 39 cada una. En conjunto suman 123 estudiantes, equivalentes al '+F(P(123,n))+' % de la población activa. Al estudiar tasas por carrera debe considerarse el tamaño desigual de los grupos.');
 else out+=para('En la modalidad online, las carreras presentan poblaciones heterogéneas. La columna de cumplimiento por carrera se completará únicamente cuando pueda cruzarse con la matriz nominal individual; no se asignarán porcentajes desconocidos.');
 out+=H(3,'4.2. Resultados por requisito');
 out+=Table('Cumplimiento y pendientes por tipo de requisito',['Requisito','Cumplen','Pendientes','Porcentaje'],d.requisitos.map(r=>[r[0],r[1],r[2],F(P(r[1],n))+' %']),'Cada porcentaje utiliza '+n+' estudiantes como denominador');
 out+=Figure('Cumplimiento porcentual por requisito',d.requisitos.map(r=>[r[0],P(r[1],n)]),{max:100,percentage:true,decimals:2,note:'Cumplimiento del control específico, no aprobación final del examen.'});
 out+=para('Los ocho requisitos previos representan '+totalChecks+' verificaciones. Se registran '+done+' verificaciones completas ('+F(P(done,totalChecks))+' %) y '+pending+' pendientes. Las incidencias corresponden a controles, no necesariamente a estudiantes diferentes.');
 out+=H(3,'4.3. Requisitos pendientes y priorización');
 const priority=d.requisitos.slice(0,8).filter(r=>r[2]>0).sort((a,b)=>b[2]-a[2]);
 out+=para('Las categorías con más incidencias son '+priority.slice(0,4).map(r=>r[0]+' ('+r[2]+')').join(', ')+'. Esta identificación orienta el seguimiento y no permite atribuir automáticamente incumplimientos a estudiantes específicos sin conciliación nominal.');
 out+=Figure('Verificaciones pendientes por requisito',d.requisitos.slice(0,8).map(r=>[r[0],r[2]]),{note:'Se representan verificaciones pendientes, no estudiantes únicos.'});
 out+=H(3,'4.4. Cumplimiento integral y continuidad');
 out+=para('Los nueve controles completos corresponden a '+d.completos9+' estudiantes ('+F(P(d.completos9,n))+' %). Los '+(n-d.completos9)+' restantes presentan al menos un control pendiente. Este estado no demuestra inasistencia ni reprobación de exámenes o defensas.');
 out+=Figure('Estudiantes con nueve controles completos',[['Completos',d.completos9],['Con pendientes',n-d.completos9]],{note:'Indicador integral de requisitos, no de titulación definitiva.'});
 if(mode==='presencial'){
  out+=para('El informe Word registra inicialmente 267 estudiantes en la cohorte presencial; 262 activos, cinco retiros, 255 que alcanzaron la fase final y doce que no la alcanzaron, incluidos los cinco retiros. Este conjunto de 255 no debe confundirse sin verificación con los 254 de cumplimiento integral.');
  out+=Table('Continuidad de la cohorte presencial',['Condición','Estudiantes','Denominador','Porcentaje'],[['Inicialmente registrados',267,267,'100,00 %'],['Activos',262,267,F(P(262,267))+' %'],['Retirados',5,267,F(P(5,267))+' %'],['Llegaron a fase final',255,267,F(P(255,267))+' %'],['No llegaron a fase final',12,267,F(P(12,267))+' %']],'Indicadores del Word institucional de referencia; no se deducen del Excel de estudiantes activos');
 }else out+=para('Para online no se recibió una matriz de matrícula inicial y retiros equivalente a la presencial. Se mantiene pendiente este indicador, sin trasladar al informe online las cifras del presencial.');
 out+=H(2,'5. Fase II. Núcleos estructurantes');
 out+=para('Los cuatro núcleos son actividades de preparación académica y deben analizarse por carrera. La aplicación conserva las notas finales disponibles y, cuando corresponda, las evaluaciones parciales y talleres. Los promedios se calculan sobre registros individuales disponibles o se transcriben provisionalmente de las tablas del Word de trabajo, según su procedencia. Una nota faltante no equivale a cero; las cifras del Word requieren conciliación con Moodle.');
 out+=Table('Cronograma de núcleos estructurantes',['Núcleo','Inicio','Fin'],nucleus.slice(0,4),'Fechas programadas');
 out+=H(3,'5.1. Cobertura global por carrera y núcleo');
 const allRows=d.careers.map(c=>[c.name,...[1,2,3,4].map(k=>{let x=d.N(c.name,k);return x.n+' / '+(x.mean==null?'Pend.':F(x.mean));})]);
 out+=Table('Cantidad de registros y promedio por núcleo (n / media)',['Carrera','N1','N2','N3','N4'],allRows,'Las casillas pendientes no representan reprobación');
 out+=H(3,'5.2. Análisis por carrera');
 for(const c of d.careers){
  out+=H(3,'Resultados de '+c.name);
  const rs=[1,2,3,4].map(k=>({k,...d.N(c.name,k)}));
  out+=Table('Resultados por núcleo: '+c.name,['Núcleo','Registros','Promedio','Mínimo','Máximo'],rs.map(r=>['Núcleo '+r.k,r.n,r.mean==null?'Pendiente':F(r.mean),r.min==null?'No disponible':F(r.min),r.max==null?'No disponible':F(r.max)]),'Datos individuales de Electron o estadísticas extraídas del Word institucional en elaboración; estas últimas requieren conciliación con Moodle');
  const avail=rs.filter(r=>r.mean!==null);
  if(!avail.length)out+=para('No se han incorporado calificaciones verificadas de '+c.name+' en los cuatro núcleos. Las tablas están preparadas y permanecen pendientes hasta recibir los registros correspondientes.');
  else{
   out+=para('Las calificaciones disponibles en '+c.name+' cubren '+avail.length+' de cuatro núcleos. '+avail.map(r=>'En el núcleo '+r.k+' hay '+r.n+' registros y una media de '+F(r.mean)).join('; ')+'. Los tamaños de muestra deben revisarse antes de comparar los resultados con los de otras carreras.');
   out+=Figure('Promedio de núcleos disponibles: '+c.name,avail.map(r=>['Núcleo '+r.k,r.mean]),{max:10,decimals:2,note:'Escala 0 a 10; cada dato representa únicamente la muestra con calificación disponible.'});
  }
 }
 out+=H(3,'5.3. Interpretación y limitaciones');
 out+=para('Las 19 tablas de núcleos extraídas del Word de trabajo corresponden a Enfermería, Educación Inicial, Marketing, Redes y Contabilidad. Son resultados provisionales hasta la verificación de sus aulas y calificaciones. La aplicación no debe copiar sus notas a la cohorte nominal sin comprobar cédulas, cursos y modalidades. Comparar medias de aulas con coberturas distintas requiere identificar previamente esas diferencias.');
 out+=H(2,'6. Trabajo de Titulación');
 out+=para('El mecanismo de Trabajo de Titulación dispone de un cronograma distinto, que comprende formulación de temas, tutorías, revisión de borradores, informe antiplagio, defensa y supletorio. No se fusionan sus calificaciones con los cuatro núcleos del Examen Complexivo.');
 for(const [fase,rows] of Object.entries(thesis)){out+=H(3,fase);out+=Table('Actividades programadas: '+fase,['Actividad','Inicio','Fin'],rows,'Cronograma proporcionado para el período octubre 2025–marzo 2026');}
 out+=para('La Guía institucional para la formulación y aprobación de títulos de titulación (octubre de 2026) requiere una sola acción central, un objeto único, neutralidad, delimitación y viabilidad. La revisión puede finalizar en Aprobado, Corregir o Reformular. La guía debe considerarse un instrumento de validación de propuestas y no evidencia de ejecución del cronograma 2025–2026.');
 out+=H(2,'7. Fase III. Evaluación del Examen Complexivo y defensas');
 const finals=d.finals,ok=finals.filter(x=>x.status==='aprobado').length,bad=finals.filter(x=>x.status==='reprobado').length,abs=finals.filter(x=>x.status==='no_presentado').length,pend=finals.length-ok-bad-abs;
 if(finals.length){out+=Table('Resultados finales cargados en Informetit',['Estado','Registros'],[['Aprobados',ok],['Reprobados',bad],['No presentados',abs],['Pendientes',pend],['Actas o registros incorporados',finals.length]],'Resultados parciales; el denominador es el total de evaluaciones registradas');out+=Figure('Distribución de resultados cargados',[['Aprobado',ok],['Reprobado',bad],['No presentado',abs],['Pendiente',pend]]);}
 else out+=para('No se han incorporado actas oficiales de la evaluación ordinaria, defensa o supletorio en esta modalidad. No es válido presentar tasas de aprobación o reprobación calculadas desde los requisitos previos o las notas de los núcleos.');
 out+=Table('Evidencias necesarias para cerrar la Fase III',['Indicador','Situación actual'],[['Habilitados y convocados','Requiere registro individual'],['Asistentes a evaluación ordinaria','Requiere acta'],['Notas teóricas y prácticas',finals.length?'Parcialmente registrado':'Pendiente'],['Aprobación en primera instancia',finals.length?'Parcialmente registrado':'Pendiente'],['Supletorios y reprobaciones','Requiere actas de recuperación'],['Resultado definitivo','Pendiente de validación institucional']],'No se confunden datos no cargados con estudiantes reprobados');
 out+=H(2,'8. Síntesis de cohorte y comparación');
 out+=para('Los indicadores de cumplimiento integral pueden calcularse para la modalidad '+desc+', pero la eficiencia terminal no puede cerrarse mientras falten resultados finales y el universo evaluado. La comparación con abril–septiembre de 2025 también requiere datos equivalentes de la cohorte anterior. No se incorporan variaciones inventadas.');
 out+=H(2,'9. Conclusiones');
 out+='<ol><li>En la modalidad '+desc+' constan '+n+' estudiantes, de los que '+d.completos9+' cumplen íntegramente los nueve controles ('+F(P(d.completos9,n))+' %).</li><li>En los ocho requisitos previos se identifican '+pending+' verificaciones pendientes; no representan necesariamente a '+pending+' personas.</li><li>El análisis académico de los cuatro núcleos debe completarse con registros verificados y muestras comparables.</li><li>Los resultados definitivos de titulación están pendientes de actas suficientes para establecer un cierre institucional.</li></ol>';
 out+=H(2,'10. Recomendaciones');
 out+='<ol><li>Conciliar la base de estudiantes con los libros de calificaciones y resolver registros duplicados o discrepantes.</li><li>Dar seguimiento a las categorías con más verificaciones pendientes y documentar su cierre.</li><li>Separar planificado, ejecutado, evidenciado y aprobado para cada hito.</li><li>Incorporar actas y supletorios antes de calcular indicadores de aprobación definitiva.</li><li>Revisar la versión normativa, los códigos institucionales y las firmas antes de aprobar el informe.</li></ol>';
 out+=H(2,'Referencias y control documental');
 out+=para('Instituto Superior Tecnológico Quito Metropolitano. (2026). Informe final del proceso de titulación, octubre 2025 a marzo 2026 [Documento de trabajo].');
 out+=para('Instituto Superior Tecnológico Quito Metropolitano. (2026). Reporte de aprobación de titulación [Matriz institucional].');
 out+=para('Unidad de Titulación y Eficiencia Terminal. (2026). Cronogramas institucionales de Examen Complexivo y Trabajo de Titulación [Registros de planificación].');
 out+=para('Unidad de Titulación y Eficiencia Terminal. (2026). Guía institucional para la formulación y aprobación de títulos de titulación [Versión 1.0].');
 out+='<p class="privacy">BORRADOR SIN VALIDAR. La información pendiente no se sustituye por interpolaciones. Se requiere verificar cifras, denominadores, normativa vigente y evidencias antes de emisión oficial.</p></body></html>';
 return out;
}
async function download(state,mode){const html=makeReport(state,mode);if(window.informetitDesktop?.saveAPAHTML){return await window.informetitDesktop.saveAPAHTML(html,'Borrador_Informe_Completo_'+mode+'_Oct2025_Mar2026_APA7.pdf');}const w=window.open('','_blank');if(!w)throw Error('Ventana de impresión bloqueada');w.document.write(html);w.document.close();w.addEventListener('load',()=>w.print());return null;}
window.InformetitFullReport={makeReport,download,getData};
})();