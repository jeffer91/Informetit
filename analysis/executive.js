/* Resumen ejecutivo situado inmediatamente después de resultados. Diagramas basados en hallazgos, sin atribuir causalidad no demostrada. */
(function(root){
'use strict';
const E=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function bones(){
 const names=[['Requisitos',185,52],['Calificaciones',370,52],['Actas',565,52],
 ['Población',185,214],['Cronogramas',370,214],['Validación',565,214]];
 let svg='<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ishikawa de ámbitos de control pendientes" viewBox="0 0 800 265">';
 svg+='<rect width="800" height="265" fill="#fff"/><path d="M80 133 H700" stroke="#173b68" stroke-width="4"/>';
 for(const a of names){
  const above=a[2]<130,stem=above?93:170,edge=above?72:194;
  svg+='<path d="M'+a[1]+' '+stem+' L'+(a[1]+55)+' 133" stroke="#426587" stroke-width="2" fill="none"/>';
  svg+='<text x="'+a[1]+'" y="'+edge+'" font-size="15" text-anchor="middle" fill="#1c3045" font-family="Arial">'+E(a[0])+'</text>';
 }
 svg+='<path d="M700 105 L770 133 L700 161 Z" fill="#e7edf4" stroke="#173b68" stroke-width="2"/>';
 svg+='<text x="726" y="129" font-size="11" text-anchor="middle" font-family="Arial" fill="#173b68">Cierre</text><text x="726" y="142" font-size="11" text-anchor="middle" font-family="Arial" fill="#173b68">por validar</text></svg>';
 return svg;
}
function tree(total,actual,summary,mode){
 const known=actual>0,one=known?String(summary.complexivo):'Sin clasificación',two=known?String(summary.trabajo):'Sin clasificación';
 const final=known?String(summary.approved)+' aprobaciones calculadas':'Sin evaluación nominal';
 const rootLabel='Cohorte '+(mode==='online'?'online':'presencial')+': '+total;
 return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Árbol de población y evaluación" viewBox="0 0 800 280">'+
 '<rect width="800" height="280" fill="#fff"/>'+
 '<path d="M400 72 V105 H200 V138 M400 105 H600 V138 M200 190 V215 H400 V235 M600 190 V215 H400" fill="none" stroke="#6d89a5" stroke-width="2"/>'+
 '<rect x="255" y="20" width="290" height="52" rx="9" fill="#173b68"/>'+
 '<text x="400" y="52" text-anchor="middle" font-family="Arial" font-size="17" fill="#fff">'+E(rootLabel)+'</text>'+
 '<rect x="40" y="138" width="320" height="52" rx="8" fill="#e6eff7" stroke="#9eb8ce"/>'+
 '<text x="200" y="158" text-anchor="middle" font-family="Arial" font-size="15" fill="#173b68">Examen Complexivo</text>'+
 '<text x="200" y="176" text-anchor="middle" font-family="Arial" font-size="13" fill="#173b68">'+E(one)+'</text>'+
 '<rect x="440" y="138" width="320" height="52" rx="8" fill="#e6eff7" stroke="#9eb8ce"/>'+
 '<text x="600" y="158" text-anchor="middle" font-family="Arial" font-size="15" fill="#173b68">Trabajo de Titulación</text>'+
 '<text x="600" y="176" text-anchor="middle" font-family="Arial" font-size="13" fill="#173b68">'+E(two)+'</text>'+
 '<rect x="240" y="235" width="320" height="36" rx="8" fill="#f5f6f8" stroke="#b6bfcb"/>'+
 '<text x="400" y="258" text-anchor="middle" font-family="Arial" font-size="14" fill="#173b68">'+E(final)+'</text></svg>';
}
function render(state,mode,data,{Table,Figure,H,para,F,P}){
 const r=data.requirements,q=data.quality,c=data.cierre,n=data.nuclei;
 const total=r.total,nominal=c.counts.total>0,complete=r.complete9;
 let out=H(2,'Resumen ejecutivo');
 out+=para('El presente resumen sintetiza los resultados del período octubre de 2025 a marzo de 2026, modalidad '+(mode==='online'?'online':'presencial')+'. Se registran '+total+' estudiantes según la fuente poblacional utilizada; '+complete+' presentan los nueve controles completos ('+F(P(complete,total))+' %). Este indicador administrativo no equivale a aprobación académica de titulación.');
 out+=para(nominal?'La nómina individual permite diferenciar '+c.counts.complexivo+' estudiantes en Examen Complexivo y '+c.counts.trabajo+' en Trabajo de Titulación. Se registran '+c.counts.approved+' aprobaciones calculadas y '+c.counts.pending+' evaluaciones pendientes de cierre documental.':
  'No se dispone de una nómina nominal cargada para clasificar los estudiantes por mecanismo de titulación. Por consiguiente, las aprobaciones finales y sus tasas no son calculables; el valor cero de registros locales no se interpreta como cero titulados.');
 out+=para('La Fase II documenta '+n.nucleiWithResults+' combinaciones carrera–núcleo con información disponible. Las notas individuales y las estadísticas agregadas se mantienen separadas, y los resultados faltantes requieren conciliación antes de consolidar indicadores académicos oficiales.');
 const important=q.issues.filter(x=>x.severity==='critical'||x.severity==='warning');
 out+=para('La auditoría documental identifica '+q.critical.length+' bloqueos críticos y '+q.warnings.length+' advertencias. Entre los controles se encuentran la integridad de la nómina, la trazabilidad de calificaciones, las actas, el cronograma y la validación institucional. Estas observaciones describen asuntos por revisar, no causas que hayan sido demostradas empíricamente.');
 out+=H(3,'Análisis de causas potenciales: diagrama de Ishikawa');
 out+=para('El esquema organiza seis ámbitos de control cuya revisión es necesaria para cerrar el informe. Se utiliza como guía de diagnóstico y no como demostración de causalidad; cada hallazgo debe contrastarse con la evidencia institucional.');
 out+=Figure('Diagrama de Ishikawa: ámbitos de verificación del proceso',[['Control',1]],{diagramSvg:bones(),note:'Categorías de control para investigar; no se imputan causas sin evidencia'});
 out+=H(3,'Matriz FODA del proceso de titulación');
 const strength=total?('Matriz agregada identificada; '+complete+' de '+total+' estudiantes con nueve controles completos.'):'No hay datos suficientes para identificar fortalezas cuantitativas.';
 const weakness=important.length?important.map(x=>x.label).slice(0,3).join('; ')+'.':'No se informan incidencias críticas en las fuentes disponibles.';
 out+=Table('Matriz FODA: situación y acciones de mejora',
 ['Fortalezas (evidencia disponible)','Oportunidades (propuestas)'],
 [[strength,'Unificar libros académicos, nóminas y actas mediante controles de trazabilidad.'],
 ['Debilidades o limitaciones observadas: '+weakness,'Amenazas o riesgos potenciales: retrasos de validación documental y emisión de resultados sin respaldo suficiente.']],
 'Las oportunidades y amenazas son escenarios de gestión; no se presentan como hechos ocurridos');
 out+=H(3,'Árbol de población y resultados');
 out+=para('El árbol muestra la población de referencia y la clasificación individual cuando existe. No se distribuye la cohorte entre mecanismos a partir de estadísticas globales.');
 out+=Figure('Árbol de clasificación de la cohorte y sus resultados',[['Control',1]],{
  diagramSvg:tree(total,c.counts.total,c.counts,mode),
  note:nominal?'Las cifras por mecanismo corresponden únicamente a la nómina individual cargada':'Sin nómina nominal, las ramas se identifican como no clasificadas'});
 out+=H(3,'Lectura ejecutiva y prioridades');
 out+=para('Las prioridades institucionales son validar la población de corte, completar o conciliar los registros de evaluación y verificar actas, responsables y evidencia de ejecución del cronograma. El reporte continuará identificado como borrador mientras existan bloqueos críticos o verificaciones obligatorias sin soporte.');
 return out;
}
const api=Object.freeze({render,bones,tree});
root.InformetitExecutive=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
