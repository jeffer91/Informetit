/* Informetit · Metodología de repaso de los cuatro núcleos estructurantes.
 * Solo representación de nombres y ejes; NO se crea ni modifica nota alguna.
 */
(function(root){
'use strict';
const E=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function wrap(text,max=27){
 const parts=String(text).split(/\s+/),lines=[];let current='';
 for(const word of parts){
  if(!current){current=word;continue}
  if((current+' '+word).length<=max)current+=' '+word;
  else{lines.push(current);current=word}
 }
 if(current)lines.push(current);
 return lines;
}
function diagram(career){
 if(!career||career.nuclei.length!==4)throw Error('El mapa requiere cuatro núcleos');
 const boxes=[
  {x:12,y:14,w:267,h:132},
  {x:481,y:14,w:267,h:132},
  {x:12,y:245,w:267,h:132},
  {x:481,y:245,w:267,h:132}
 ];
 const colors=['#174a75','#16687a','#28617c','#36547d'];
 let svg='<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+
  E('Mapa de núcleos de '+career.name)+'" viewBox="0 0 760 395" '+
  'data-nucleus-map="'+E(career.key)+'">';
 svg+='<rect x="0" y="0" width="760" height="395" rx="16" fill="#f7f9fc"/>';
 svg+='<g stroke="#a6b9ce" stroke-width="2.5" stroke-linecap="round" fill="none">'+
  '<path d="M325 143 L280 118"/><path d="M435 143 L480 118"/>'+
  '<path d="M325 247 L280 270"/><path d="M435 247 L480 270"/></g>';
 svg+='<circle cx="380" cy="195" r="76" fill="#173b68"/>'+
  '<circle cx="380" cy="195" r="68" fill="none" stroke="#a7cde3" stroke-width="1.5"/>'+
  '<text x="380" y="168" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" fill="#d4eaf9" font-weight="bold">REPASO</text>'+
  '<text x="380" y="189" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#fff" font-weight="bold">PREPARACIÓN</text>'+
  '<text x="380" y="209" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#fff" font-weight="bold">PARA EL</text>'+
  '<text x="380" y="228" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" fill="#fff" font-weight="bold">COMPLEXIVO</text>';
 career.nuclei.forEach((n,i)=>{
  const box=boxes[i],cx=box.x+box.w/2,lines=wrap(n.title,32);
  const font=lines.length>=4?12.7:14.2,line=17.2;
  svg+='<rect x="'+box.x+'" y="'+box.y+'" width="'+box.w+'" height="'+box.h+
   '" rx="14" fill="#ffffff" stroke="#cad7e4" stroke-width="1.4"/>'+
   '<rect x="'+box.x+'" y="'+box.y+'" width="7" height="'+box.h+'" rx="3" fill="'+colors[i]+'"/>'+
   '<circle cx="'+(box.x+29)+'" cy="'+(box.y+27)+'" r="14" fill="'+colors[i]+'"/>'+
   '<text x="'+(box.x+29)+'" y="'+(box.y+32)+'" text-anchor="middle" font-size="14" font-family="Arial,sans-serif" fill="#fff" font-weight="bold">'+(i+1)+'</text>'+
   '<text x="'+(box.x+52)+'" y="'+(box.y+32)+'" font-family="Arial,sans-serif" font-weight="bold" font-size="12" fill="'+colors[i]+'">NÚCLEO '+(i+1)+'</text>';
  const base=box.y+56;
  lines.forEach((lineText,j)=>{
   svg+='<text x="'+cx+'" y="'+(base+j*line)+'" text-anchor="middle" font-family="Arial,sans-serif" font-size="'+font+
    '" fill="#202e3d">'+E(lineText)+'</text>';
  });
 });
 svg+='</svg>';
 return svg;
}
function render(careers,{H,para,Figure}){
 const catalog=root.InformetitNucleiCatalog;
 if(!catalog)throw Error('Catálogo metodológico de núcleos no disponible');
 let out=H(3,'3.1. Contenido de los núcleos estructurantes');
 out+=para('Los núcleos estructurantes son espacios de repaso y preparación previos al Examen Complexivo. No tienen como finalidad impartir asignaturas nuevas, sino recuperar, integrar, reforzar y aplicar los conocimientos y competencias adquiridos durante la carrera. La revisión se desarrolla mediante contenidos conceptuales, ejercicios de aplicación y situaciones relacionadas con la formación profesional.');
 out+=para('Cada carrera comprende cuatro ámbitos de repaso. A continuación se presentan sus denominaciones académicas, un mapa de integración y los temas orientadores que corresponde revisar. Las denominaciones proceden de la relación suministrada por la coordinación; las explicaciones y los ejes son propuestas de redacción sujetas al cotejo de las guías y sílabos de cada carrera.');
 out+=para('La sección describe la organización metodológica de la preparación. Los estudiantes, las notas nominales, la cobertura y los gráficos de resultados se presentan por separado en la Fase II; una actividad de repaso no equivale a aprobación del examen.');
 const known=[],notFound=[];
 for(const item of careers){
  const name=typeof item==='string'?item:item.name;
  const matched=catalog.lookup(name);
  if(matched&&!known.some(x=>x.key===matched.key))known.push(matched);
  else if(!matched)notFound.push(name);
 }
 known.forEach((career,index)=>{
  out+=H(3,'3.1.'+(index+1)+'. '+career.name.toLocaleUpperCase('es-EC'));
  out+=para('Para '+career.name+' se organizan cuatro núcleos de repaso que recuperan contenidos esenciales de su formación y permiten integrar conocimientos antes del Examen Complexivo. El esquema muestra la relación de estos cuatro ámbitos con la preparación evaluativa.');
  out+=Figure('Mapa de los cuatro núcleos de '+career.name,[['Esquema',4]],{
   diagramSvg:diagram(career),
   note:'Mapa metodológico de repaso; no representa nuevas asignaturas ni resultados de evaluación. Denominaciones facilitadas por coordinación.'
  });
  for(const n of career.nuclei){
   out+='<div class="inf-nucleus-method"><h5 class="inf-nucleus-subtitle">'+E('Núcleo '+n.number+': '+n.title.toLocaleUpperCase('es-EC'))+'</h5>';
   out+=para(n.intro);
   out+='<ul class="inf-nucleus-topics">'+n.topics.map(topic=>
     '<li><strong>'+E(topic.label)+':</strong> '+E(topic.detail)+'.</li>').join('')+'</ul></div>';
  }
  out+=para('En conjunto, los cuatro núcleos sirven para consolidar aprendizajes previos, identificar temas por reforzar y preparar la resolución de preguntas y casos del Examen Complexivo. Sus calificaciones de repaso no sustituyen la evaluación ordinaria ni el supletorio.');
  out+='<p class="inf-method-source">Estado del contenido: propuesta de temas por validar con la coordinación de carrera. Los nombres de los núcleos corresponden al catálogo facilitado.</p>';
 });
 if(notFound.length)out+=para('Carreras sin catálogo metodológico homologado: '+notFound.join(', ')+
  '. No se asignan nombres o contenidos de otras carreras por semejanza.');
 return out;
}
const api=Object.freeze({diagram,render,wrap});
root.InformetitNucleiMethodology=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
