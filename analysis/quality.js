/* Informetit · Bloque 08 · Auditoría de integridad y emisión de informes.
   Los controles provienen exclusivamente de registros disponibles en la base local.
   "Listo técnicamente" no significa aprobación o graduación oficial. */
(function(root){
'use strict';
const M=()=>root.InformetitDataModel;
const get=(x,name)=>root[name]?.analyze?.(x.state,x.mode);
const text=v=>String(v??'').trim();
function analyze(state,mode='presencial'){
 const m=mode==='online'?'online':'presencial';
 const local=(state?.estudiantes||[]).filter(s=>s.modalidad===m);
 const model=M();if(!model)throw Error('Modelo de estudiantes no disponible');
 const fallback=root.InformetitPublicSummary?.DATA?.[m];
 const req=root.InformetitRequirements.analyze(state,m),
  nuclei=root.InformetitNuclei.build(state,m),
  complex=root.InformetitComplexivo.analyze(state,m),
  project=root.InformetitTrabajo.analyze(state,m),
  summary=root.InformetitConsolidado.analyze(state,m);
 const doc=root.InformetitDocument.pending(state,m);
 const issues=[],push=(severity,code,label,value,description,remedy,blocking=false)=>{
  issues.push({severity,code,label,value,description,remedy,blocking});
 };
 if(!local.length)push('critical','NO_ROSTER','Nómina nominal','No cargada',
   'Solo hay resúmenes agregados; no se pueden verificar estudiantes y resultados individuales.',
   'Importar base privada del período y cotejar con padrón autorizado.',true);
 else if(fallback&&local.length!==fallback.total)
  push('warning','ROSTER_VARIATION','Población de la cohorte',
   local.length+' frente a '+fallback.total+' del resumen de referencia',
   'La cantidad actual difiere del documento de referencia; la diferencia puede ser legítima pero debe documentarse.',
   'Confirmar altas, bajas, retiros y población de corte antes de aprobar resultados.');
 const audit=model.audit(state);
 const localIds=new Set(local.map(s=>String(s.id)));
 const serious=audit.issues.filter(x=>['cedula_repetida','id_vacio','nombre_vacio','carrera_vacia'].includes(x.type)&&
   (!x.student||localIds.has(String(x.student))));
 if(serious.length)push('critical','ROSTER_INTEGRITY','Integridad de estudiantes',serious.length+' incidencias',
   'Hay identidades repetidas o datos esenciales incompletos.',
   'Depurar cédulas, nombres y carreras en la base privada.',true);
 if(req.source==='individual'&&req.checks.unknown)
  push('warning','REQUIREMENT_UNVERIFIED','Requisitos sin verificar',String(req.checks.unknown),
   'Existen controles de requisitos sin información suficiente.',
   'Completar los nueve requisitos por estudiante o mantener la categoría sin verificar.');
 if(req.source==='individual'&&req.checks.fail)
  push('info','REQUIREMENT_NOT_MET','Incumplimientos confirmados',String(req.checks.fail),
   'Los incumplimientos son incidencias, no necesariamente estudiantes diferentes.',
   'Revisar habilitación administrativa por estudiante.');
 const mismatch=(state?.conflictos||[]).filter(x=>localIds.has(String(x.studentId||x.id?.split('|')[0])));
 if(mismatch.length)push('critical','GRADE_CONFLICTS','Notas Moodle/Word en conflicto',
   mismatch.length+' pendientes','Hay calificaciones nominales contradictorias sin decisión registrada.',
   'Resolver cada conflicto en Datos y respaldo.',true);
 const unlinked=(state?.sinVincular||[]).filter(x=>!x.modalidad||x.modalidad===m);
 if(unlinked.length)push('warning','UNLINKED','Registros sin vincular',unlinked.length+' registros',
   'Existen notas o fuentes externas sin asociación nominal segura.',
   'Conciliar con cédula y carrera de la nómina.');
 const noMechanism=local.filter(x=>!['complexivo','trabajo'].includes(x.tipoTitulacion));
 if(noMechanism.length)push('critical','MECHANISM_UNCLASSIFIED','Mecanismo de titulación sin confirmar',noMechanism.length+' estudiantes',
 'Estos estudiantes no pueden atribuirse por defecto a Examen Complexivo.',
 'Clasificar expresamente por acta o nómina de mecanismo y conservar la evidencia.',true);
 const provisional=(state?.notasBorrador||[]).filter(x=>localIds.has(String(x.studentId)));
 if(provisional.length)push('warning','WORD_PROVISIONAL','Calificaciones provisionales sin cotejar',provisional.length+' registros',
 'El Word transcrito no constituye una calificación oficial de Moodle o de acta.',
 'Cotejar los registros antes de aprobarlos e incorporarlos al consolidado oficial.');
 if(nuclei.individual){
  if(nuclei.pendingSlots)push('warning','NUCLEI_MISSING','Calificaciones de núcleos faltantes',
   nuclei.pendingSlots+' casillas','No equivalen a notas cero ni a reprobaciones.',
   'Completar o justificar los núcleos sin nota final.');
  if(nuclei.unresolvedSlots)push('critical','NUCLEI_DISPUTED','Núcleos en conflicto',
   nuclei.unresolvedSlots+' casillas','Se excluyen del análisis académico nominal.',
   'Resolver el conflicto en la sección de notas.',true);
 }
 if(nuclei.wordOnlyNuclei)push('info','WORD_AGGREGATE','Fuente Word agregada',
   nuclei.wordOnlyNuclei+' núcleos','Existe información estadística sin notas individuales para esos núcleos.',
   'Conservar la referencia documental; no reconstruir calificaciones nominales.');
 if(summary.counts.pending)push('warning','FINAL_PENDING','Evaluaciones finales pendientes',
   summary.counts.pending+' estudiantes','Faltan notas ordinarias o supletorias de alguno de los dos mecanismos.',
   'Registrar evaluaciones y recuperar actas antes del cierre.');
 if(summary.counts.duplicate)push('critical','FINAL_DUPLICATES','Evaluaciones duplicadas',
   summary.counts.duplicate+' estudiantes','Los duplicados se excluyen del cómputo de resultados.',
   'Conciliar expedientes hasta dejar una evaluación por estudiante y mecanismo.',true);
 if(complex.issues.length)push('warning','EXAM_WARNINGS','Advertencias de Examen Complexivo',
   complex.issues.length+' expedientes','Hay discrepancias o inconsistencias de componentes y referencias.',
   'Revisar las evaluaciones y sus actas.');
 const projectIssues=project.entries.filter(x=>x.record?.warnings?.length);
 if(projectIssues.length)push('warning','PROJECT_WARNINGS','Observaciones de proyectos',
   projectIssues.length+' expedientes','La rúbrica o asistencia requiere verificación adicional.',
   'Conciliar puntajes y actas de Trabajo de Titulación.');
 if(project.legacy.length)push('warning','LEGACY_WORK','Proyectos en formato anterior',
   project.legacy.length+' expedientes','No permiten reconstruir los criterios de los tres vocales.',
   'Transcribir únicamente los puntajes efectivamente asentados en el acta.');
 const withGrade=summary.records.filter(x=>x.grade!==null&&x.grade!==undefined);
 const noRefs=withGrade.filter(x=>!x.referenced);
 if(noRefs.length)push('warning','ACTA_REFERENCES','Resultados sin referencia de acta',
   noRefs.length+' estudiantes','La calificación calculada no dispone de todas las referencias requeridas.',
   'Añadir números y fechas de actas y comprobar documentos originales.');
 if(doc.length)push('warning','DOCUMENT_FIELDS','Control documental',
   doc.length+' controles','Existen campos formales pendientes: '+doc.join('; '),
   'Completar fecha, códigos, responsables y validaciones documentales.');
 const schedule=(state?.ejecucion||{});const planned=Object.keys(schedule).filter(k=>/^(trabajo|complexivo)\|\d+$/.test(k));
 if(!planned.length)push('warning','SCHEDULE_EVIDENCE','Ejecución del cronograma','Sin seguimiento de ejecución',
   'Las fechas programadas no prueban que las actividades se realizaron.',
   'Registrar estado de ejecución con su evidencia.');
 const conflicts=(state?.firebaseDiferencias||[]).filter(x=>!x.estado||x.estado==='pendiente')
   .filter(x=>localIds.has(String(x.id)));
 if(conflicts.length)push('warning','FIREBASE_DIFFERENCES','Conciliación Firebase',
   conflicts.length+' discrepancias','Existen diferencias entre la base local y Firebase.',
   'Revisar la conciliación de requisitos y población.');
 // Ninguna aprobación calculada equivale a graduación, ni la referencia equivale a acta firmada.
 push('info','OFFICIAL_ENDORSEMENT','Validación institucional','No automática',
  'La app no puede autenticar las actas ni aprobar el informe por la institución.',
  'Contrastar notas, actas y marco legal; obtener revisión y aprobación institucional.');
 const counters={
  total:local.length||fallback?.total||0,localStudents:local.length,complexivo:complex.counts.eligible,
  trabajo:project.counts.eligible,complexivoApproved:complex.counts.approved,
  projectsApproved:project.counts.approved,approvedCalculated:summary.counts.approved,
  pending:summary.counts.pending,duplicate:summary.counts.duplicate,
  actaReferences:summary.counts.referenced,notesNominal:nuclei.individualGrades,
  wordOnlyNuclei:nuclei.wordOnlyNuclei,requirementComplete8:req.complete8,
  requirementComplete9:req.complete9
 };
 const critical=issues.filter(i=>i.severity==='critical');
 const warnings=issues.filter(i=>i.severity==='warning');
 const technicalReady=critical.length===0&&local.length>0;
 return {mode:m,period:'Octubre 2025–marzo 2026',source:local.length?'Nómina local':'Estadística agregada',
  counters,issues,critical,warnings,technicalReady,
  state:technicalReady&&!warnings.length?'REVISIÓN INSTITUCIONAL PENDIENTE':
    technicalReady?'BORRADOR · OBSERVACIONES':'BORRADOR · BLOQUEOS DE INTEGRIDAD',
  data:{req,nuclei,complex,project,summary},asOf:new Date().toISOString().slice(0,10)};
}
function report(a,{Table,H,para}){
 let out=H(2,'11. Anexos y trazabilidad de información');
 out+=para('Los anexos describen el origen, las limitaciones y el estado de conciliación de las fuentes utilizadas. Son generados desde la base local de la modalidad '+a.mode+', para el período octubre 2025–marzo 2026. No constituyen firma, acta autenticada ni aprobación institucional.');
 out+=H(3,'Anexo A. Inventario de fuentes utilizadas');
 out+=Table('Matriz de procedencia y alcance de las fuentes',
  ['Fuente','Información utilizada','Limitación'],[
   ['Nómina local del período','Identificación, carrera, modalidad y mecanismo',
     a.counters.localStudents?'Cotejar con padrón oficial y retiros':'Nómina no cargada'],
   ['Registros de requisitos','Cumplimiento e incidencias por estudiante',
     'No se traducen a calificaciones académicas'],
   ['Moodle / Word','Calificaciones finales de núcleos disponibles',
     'Los agregados del Word no proporcionan notas nominales'],
   ['Evaluaciones de Complexivo','Teoría 40 %, práctica 60 %, supletorio y referencias de acta',
     'Las referencias no acreditan autenticidad ni firmas'],
   ['Rúbricas de Trabajo de Titulación','Tutor, lector, práctica y tres vocales de defensa',
     'Ponderación conforme al ejemplo de acta, por validar normativamente'],
   ['Firebase UTET','Contraste de matrículas y requisitos, cuando existe',
     'El estado CUMPLE no es nota ni certifica aprobación del examen'],
   ['Cronogramas','Fechas planificadas y estados de ejecución registrados',
     'La planificación no prueba por sí sola actividades realizadas']
  ],'El inventario describe categorías de fuentes; la disponibilidad efectiva debe verificarse en cada expediente');
 out+=H(3,'Anexo B. Conciliación de población y resultados');
 const n=a.counters;
 out+=Table('Conciliación académica de la modalidad '+a.mode,
  ['Control','Resultado'],[
   ['Población en base local',n.localStudents],
   ['Población del informe',n.total],
   ['Asignados a Examen Complexivo',n.complexivo],
   ['Asignados a Trabajo de Titulación',n.trabajo],
   ['Suma de ambos mecanismos',n.complexivo+n.trabajo],
   ['Aprobaciones calculadas en Complexivo',n.complexivoApproved],
   ['Aprobaciones calculadas en proyectos',n.projectsApproved],
   ['Aprobaciones calculadas totales',n.approvedCalculated],
   ['Evaluaciones pendientes',n.pending],
   ['Duplicados académicos',n.duplicate],
   ['Resultados con referencias de acta',n.actaReferences],
   ['Notas nominales disponibles de núcleos',n.notesNominal],
   ['Núcleos solo con estadísticas del Word',n.wordOnlyNuclei]
  ],'Cuando no hay nómina local, la suma por mecanismo no se deduce de requisitos ni de fuentes agregadas');
 out+=H(3,'Anexo C. Matriz de control de calidad');
 out+=Table('Hallazgos y acciones antes de aprobar el documento',
 ['Nivel','Control','Resultado','Acción'],
 a.issues.map(x=>[x.severity==='critical'?'Crítico':x.severity==='warning'?'Advertencia':'Informativo',
   x.label,x.value,x.remedy]),
 'Los bloqueos críticos requieren conciliación. Otras advertencias pueden corresponder a información genuinamente pendiente');
 out+=H(3,'Anexo D. Integridad de las cifras');
 out+=para('Las notas vacías permanecen sin registrar. La cobertura académica se calcula con los estudiantes de Complexivo o Trabajo de Titulación que corresponden a cada fase, sin incluir en el mismo promedio registros nominales y agregados. Los estudiantes con datos contradictorios o duplicados quedan identificados para conciliación. Las aprobaciones calculadas se mantienen separadas de la emisión de actas y del registro de títulos.');
 out+=para('La versión del PDF y las evidencias deben comprobarse por el responsable de titulación y por las instancias institucionales antes de utilizar el documento como informe final.');
 return out;
}
root.InformetitQuality=Object.freeze({analyze,report});
if(typeof module==='object'&&module.exports)module.exports=root.InformetitQuality;
})(typeof window!=='undefined'?window:globalThis);
