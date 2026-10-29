/* Informetit: análisis ejecutivo visual con fuentes verificables y denominadores explícitos. */
(function(root){
'use strict';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const pct=(n,d)=>d?(100*n/d).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2})+' %':'No calculable';
const text=(x,y,s,size=19,anchor='middle',weight=400,color='#1e3550')=>
 '<text x="'+x+'" y="'+y+'" font-family="Arial, sans-serif" font-size="'+size+'" fill="'+color+
 '" font-weight="'+weight+'" text-anchor="'+anchor+'">'+E(s)+'</text>';
const multi=(x,y,values,dy=19,size=17,color='#1e3550')=>values.map((s,i)=>text(x,y+i*dy,s,size,'middle',400,color)).join('');
const round=(x,y,w,h,fill='#f4f8fc',stroke='#8aa5bf',radius=11)=>
 '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+radius+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1.6"/>';
const line=(d)=>'<path d="'+d+'" stroke="#69849f" stroke-width="2.4" fill="none" stroke-linejoin="round"/>';
const svgStart=(name,w,h)=>'<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+E(name)+'" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="xMidYMid meet"><rect width="'+w+'" height="'+h+'" fill="#fff"/>';
function bones(data={}){
 const r=data.requirements||{},c=data.cierre?.counts||{},q=data.quality||{},state=data.state||{};
 const unclassified=c.unclassified??0;
 const ids=new Set((state.estudiantes||[]).filter(s=>s.modalidad===data.mode).map(s=>String(s.id)));
 const provisional=(state.notasBorrador||[]).filter(x=>ids.has(String(x.studentId))&&/provisional|borrador/i.test(String(x.estado||x.status||''))).length;
 const blocks=[
  ['Requisitos',(r.notComplete9??0)+' casos por revisar'],
  ['Mecanismo',unclassified+' sin clasificar'],
  ['Núcleos',provisional+' notas provisionales'],
  ['Examen',c.pending??0+' evaluaciones pendientes'],
  ['Actas',(c.total??0)-(c.referenced??0)+' sin acta verificada'],
  ['Validación',(q.critical||[]).length+' alertas críticas']
 ];
 // Dibujo en espina con ramales superiores e inferiores y etiquetas al extremo.
 let out=svgStart('Ishikawa: seis ámbitos de verificación con indicadores',900,450);
 out+=round(18,11,864,38,'#edf2f8','#edf2f8',7)+text(450,36,'ANÁLISIS DE FACTORES A VERIFICAR',19,'middle',700);
 out+=line('M70 230 H740');
 for(let i=0;i<6;i++){
  const top=i<3,index=i%3,join=230+index*180,boxX=70+index*230,boxY=top?58:324;
  const branchX=top?join-35:join+25,branchY=top?185:276;
  out+=line('M'+join+' 230 L'+branchX+' '+branchY+' L'+(boxX+95)+' '+(top?146:324));
  out+=round(boxX,boxY,190,88,top?'#f0f5fa':'#f7f9fc','#9caec2',9);
  out+=text(boxX+95,boxY+30,blocks[i][0],18,'middle',700);
  out+=text(boxX+95,boxY+60,blocks[i][1],15,'middle');
 }
 out+=line('M740 185 L880 230 L740 275 Z');
 out+=round(754,200,115,62,'#dbe8f5','#54779a',6);
 out+=multi(812,222,['Cierre académico','por validar'],20,16);
 out+=text(450,428,'Las categorías son hipótesis de revisión; el esquema no prueba relaciones causales.',15,'middle',400,'#51677f');
 return out+'</svg>';
}
function foda(data={}){
 const r=data.requirements||{},c=data.cierre?.counts||{},q=data.quality||{},state=data.state||{};
 const total=r.total||0,complete=r.complete9||0,unclassified=c.unclassified||0;
 const ids=new Set((state.estudiantes||[]).filter(s=>s.modalidad===data.mode).map(s=>String(s.id)));
 const preliminary=(state.notasBorrador||[]).filter(x=>ids.has(String(x.studentId))&&/provisional|borrador/i.test(String(x.estado||x.status||''))).length;
 const quadrants=[
  {x:20,y:32,key:'F',label:'FORTALEZAS',shade:'#f0f6fb',lines:[
    total+' estudiantes identificados en la cohorte',
    complete+' con nueve controles completos',
    'Cumplimiento integral: '+pct(complete,total)]},
  {x:448,y:32,key:'O',label:'OPORTUNIDADES',shade:'#f5f7fa',lines:[
    'Integrar fuentes Moodle y actas',
    'Conciliar registros antes de su cierre',
    'Automatizar seguimiento por carrera']},
  {x:20,y:262,key:'D',label:'DEBILIDADES OBSERVADAS',shade:'#f5f7fa',lines:[
    unclassified+' mecanismos sin confirmar',
    preliminary+' transcripciones por cotejar',
    (q.critical||[]).length+' controles críticos de integridad']},
  {x:448,y:262,key:'A',label:'AMENAZAS POTENCIALES',shade:'#f0f6fb',lines:[
    'Riesgo de cerrar sin actas verificadas',
    'Diferencias entre fuentes académicas',
    'Demoras en aprobación documental']}
 ];
 let out=svgStart('Matriz FODA de cuatro cuadrantes del proceso de titulación',900,490);
 for(const z of quadrants){
  out+=round(z.x,z.y,412,210,z.shade,'#a8baca',11);
  out+=round(z.x+15,z.y+15,42,42,'#173b68','#173b68',8);
  out+=text(z.x+36,z.y+44,z.key,24,'middle',700,'#fff');
  out+=text(z.x+68,z.y+44,z.label,18,'start',700);
  z.lines.forEach((l,i)=>{
   out+='<circle cx="'+(z.x+33)+'" cy="'+(z.y+88+i*42)+'" r="4" fill="#54779a"/>';
   out+=text(z.x+48,z.y+94+i*42,l,16,'start');
  });
 }
 return out+'</svg>';
}
function tree(total,actual,summary,mode,requirements){
 const r=requirements||{},c=summary||{},name=mode==='online'?'Online':'Presencial';
 const full=r.complete9??0,remaining=total-full,complex=c.complexivo??0,work=c.trabajo??0;
 const unclassified=Math.max(0,c.unclassified??(total-actual)),approved=c.approved??0;
 const label=(x,y,name,value,denom,fill='#f0f5fb',w=230,h=86)=>{
  let result=round(x,y,w,h,fill,'#97b0c8',9);
  result+=text(x+w/2,y+27,name,17,'middle',700);
  result+=text(x+w/2,y+57,String(value)+' · '+pct(value,denom),18,'middle');
  return result;
 };
 let out=svgStart('Árbol de población, requisitos, mecanismos y resultados',930,625);
 out+=label(343,15,name+' · COHORTE',total,total,'#dce8f4',244,91);
 out+=line('M465 106 V136 M233 136 H697 M233 136 V167 M697 136 V167');
 out+=round(110,167,246,52,'#eaf1f7','#8aacc8')+text(233,201,'CONTROL DE REQUISITOS',18,'middle',700);
 out+=round(573,167,247,52,'#eaf1f7','#8aacc8')+text(696,201,'MECANISMO ASIGNADO',18,'middle',700);
 out+=line('M233 219 V243 M125 243 H341 M125 243 V272 M341 243 V272');
 out+=label(10,272,'Nueve completos',full,total,'#f2f7fb',230,82);
 out+=label(255,272,'No completos',remaining,total,'#f2f7fb',230,82);
 out+=line('M696 219 V243 M578 243 H814 M578 243 V272 M696 243 V272 M814 243 V272');
 out+=label(494,272,'Complexivo',complex,total,'#f5f8fb',150,82);
 out+=label(656,272,'Trabajo de titulación',work,total,'#f5f8fb',170,82);
 out+=label(839,272,'Sin definir',unclassified,total,'#f5f8fb',90,82);
 out+=line('M465 379 V408');
 out+=round(185,409,560,46,'#eaf1f7','#8aacc8')+text(465,439,'RESULTADOS ACADÉMICOS CALCULABLES',18,'middle',700);
 out+=line('M465 455 V474 M234 474 H699 M234 474 V500 M465 474 V500 M699 474 V500');
 out+=label(109,500,'Aprobaciones',approved,total,'#f2f7fb',248,81);
 out+=label(358,500,'Pendientes',(c.pending??0),total,'#f2f7fb',217,81);
 out+=label(587,500,'Reprobaciones',(c.failed??0),total,'#f2f7fb',240,81);
 out+=text(465,612,'Porcentajes calculados sobre la cohorte de esta modalidad; no equivalen a títulos emitidos.',15,'middle',400,'#51677f');
 return out+'</svg>';
}
function render(state,mode,data,{Table,Figure,H,para,F,P}){
 const r=data.requirements,q=data.quality,c=data.cierre,n=data.nuclei,total=r.total||0;
 const assigned=(c.counts.complexivo||0)+(c.counts.trabajo||0),complete=r.complete9||0;
 const u=c.counts.unclassified??Math.max(0,total-assigned);
 const provisional=(state?.notasBorrador||[]).filter(x=>/provisional|borrador/i.test(String(x.estado||x.status||''))&&
  (state.estudiantes||[]).some(st=>st.id===x.studentId&&st.modalidad===mode)).length;
 let out=H(2,'9. Resumen Ejecutivo');
 out+=H(3,'9.1. Hallazgos y cobertura de la modalidad');
 out+=para('La modalidad '+(mode==='online'?'online':'presencial')+' comprende '+total+' estudiantes en la fuente utilizada; '+
  complete+' cumplen los nueve controles ('+pct(complete,total)+'). Esta proporción describe requisitos administrativos y no equivale a aprobación del examen ni a titulación.');
 out+=para(assigned?
  'Existen '+c.counts.complexivo+' estudiantes identificados como Examen Complexivo y '+c.counts.trabajo+
  ' como Trabajo de Titulación. Permanecen '+u+' sin clasificación explícita. Se han calculado '+c.counts.approved+
  ' aprobaciones a partir de notas finales disponibles; antes del cierre deben cotejarse las actas.':
  'No existe aún una clasificación individual confirmada por mecanismo para esta modalidad. La presencia de la nómina no autoriza presumir que todas las personas corresponden a Examen Complexivo.');
 out+=para('La Fase II contiene '+n.nucleiWithResults+' combinaciones carrera–núcleo con información de alguna fuente. Existen '+
  provisional+' transcripciones provisionales en esta modalidad que no se incorporan a calificaciones oficiales antes del cotejo. El control documental registra '+q.critical.length+
  ' alertas críticas y '+q.warnings.length+' advertencias.');
 out+=H(3,'9.2. Diagrama de Ishikawa');
 out+=para('El diagrama presenta factores que deben verificarse para concluir el proceso; expresa líneas de investigación, no causalidad demostrada.');
 out+=Figure('Diagrama de Ishikawa: ámbitos de verificación del proceso',[['Control',1]],{
   diagramSvg:bones({requirements:r,cierre:c,quality:q,state,mode}),note:'Se muestran indicadores de la base local; son factores de revisión y no causas comprobadas'});
 out+=H(3,'9.3. Matriz FODA');
 out+=para('Las fortalezas y debilidades expresan observaciones disponibles. Las oportunidades y amenazas describen posibles acciones y riesgos institucionales, no hechos ya sucedidos.');
 out+=Figure('Matriz FODA: análisis interno y externo del proceso de titulación',[['Control',1]],{
   diagramSvg:foda({requirements:r,cierre:c,quality:q,state,mode}),note:'Matriz de cuatro cuadrantes; datos de la cohorte y oportunidades o riesgos propuestos'});
 out+=H(3,'9.4. Árbol de Población y Resultados');
 out+=para('El árbol conserva denominadores reales y distingue resultados por mecanismo, requisitos completos y clasificación pendiente. El valor cero corresponde a un recuento real solo si existe una población y registros evaluables.');
 out+=Figure('Árbol de clasificación de la cohorte y sus resultados',[['Control',1]],{
   diagramSvg:tree(total,assigned,c.counts,mode,r),note:'Todos los porcentajes se calculan sobre los '+total+' estudiantes de esta modalidad; no se infiere la graduación'});
 out+=H(3,'9.5. Prioridades para toma de decisiones');
 out+=Table('Prioridades de cierre institucional',
 ['Prioridad','Control','Estado de información'],[
  ['1','Clasificación individual del mecanismo',u+' estudiantes por confirmar'],
  ['2','Conciliación de calificaciones de núcleos',provisional+' transcripciones provisionales'],
  ['3','Verificación de resultados y actas',c.counts.referenced+' referencias declaradas, sin presunción de firma'],
  ['4','Resolución de alertas de integridad',q.critical.length+' bloqueos críticos']
 ],'Las prioridades se basan en registros disponibles; los responsables y plazos deberán aprobarse en el Plan de Mejora');
 return out;
}
const api=Object.freeze({render,bones,foda,tree});
root.InformetitExecutive=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
