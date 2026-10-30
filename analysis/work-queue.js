/* Informetit · Bandeja operativa: solo pendientes deducibles de la base local. */
(function(root){
'use strict';
const D=()=>root.InformetitDataModel;
const C=()=>root.InformetitNucleiCatalog;
const clean=x=>String(x??'').trim(),id=clean;
function build(state){
 const students=state?.estudiantes||[];
 if(!students.length)return {hasRoster:false,careers:[],upload:[{
  id:'roster',scope:'global',kind:'upload',priority:0,label:'Importar base privada de estudiantes',
  detail:'Solo hay estadísticas agregadas; no se pueden detectar faltantes individuales.',
  page:'datos',action:'backup-file',count:1}],review:[]};
 const byCareer=new Map();
 for(const s of students){
  const career=C().canonical(s.carrera);
  const key=career+'|'+s.modalidad;
  if(!byCareer.has(key))byCareer.set(key,{id:key,career:s.carrera||'Carrera no informada',
   canonical:career,mode:s.modalidad,students:[]});
  byCareer.get(key).students.push(s);
 }
 const catalog=C().list(),upload=[],review=[],grade=D().grade;
 const add=(kind,g,slug,label,count,detail,page,nucleus=0,action='')=>{
  if(!count)return;
  const record={id:g.id+'|'+slug,scope:g.id,career:g.career,mode:g.mode,
   kind,priority:kind==='upload'?1:2,label,count,detail,page,nucleus,action};
  (kind==='upload'?upload:review).push(record);
 };
 for(const g of byCareer.values()){
  const people=g.students,complex=people.filter(s=>s.tipoTitulacion==='complexivo'),
    work=people.filter(s=>s.tipoTitulacion==='trabajo');
  add('review',g,'mechanism','Clasificar mecanismo de titulación',
   people.length-complex.length-work.length,
   'No asignar estudiantes a Complexivo o Trabajo de forma automática.','estudiantes');
  const withoutReq=people.filter(s=>(D().REQUIREMENTS||[]).some(k=>!clean(s.requisitos?.[k]))).length;
  add('upload',g,'requirements','Completar requisitos sin información',withoutReq,
   'Hay fichas con campos vacíos; NO CUMPLE no es un dato faltante.','estudiantes');
  const cat=catalog.find(x=>C().canonical(x.name)===g.canonical);
  if(cat&&complex.length){
   const ids=new Set(complex.map(s=>id(s.id)));
   const conflict=new Set((state.conflictos||[]).map(x=>id(x.id)));
   const valid=arr=>new Set((arr||[]).filter(n=>ids.has(id(n.studentId))&&
    Number(n.nucleo)>=1&&Number(n.nucleo)<=4&&grade(n.nota)!==null)
    .map(n=>id(n.studentId)+'|'+Number(n.nucleo)));
   const verified=new Set((state.notas||[]).filter(n=>n.verificado===true&&
    !['PROVISIONAL','BORRADOR','SIMULADO','ESTIMADO','SIN VERIFICAR','PROVISIONAL POR CONCILIAR']
     .includes(D().key(n.status||n.estado))&&grade(n.nota)!==null)
     .map(n=>id(n.studentId)+'|'+Number(n.nucleo)));
   const existing=new Set([...valid(state.notas),...valid(state.notasBorrador),...valid(state.cursosNucleos)]);
   for(const n of cat.nuclei){
    const records=complex.map(s=>id(s.id)+'|'+n.number),absent=records.filter(k=>!existing.has(k)&&!conflict.has(k)).length,
      provisional=records.filter(k=>existing.has(k)&&!verified.has(k)&&!conflict.has(k)).length,
      disputed=records.filter(k=>conflict.has(k)).length;
    add('upload',g,'n'+n.number,'Subir notas · Núcleo '+n.number,
      absent,absent===complex.length?'No hay notas nominales para este núcleo.':'Faltan '+absent+' de '+complex.length+' registros de Complexivo.',
      'carga',n.number);
    add('review',g,'verify'+n.number,'Cotejar notas · Núcleo '+n.number,provisional,
      'Existen registros preliminares, no deben cargarse como ausentes.','carga',n.number);
    add('review',g,'conflict'+n.number,'Resolver notas contradictorias · Núcleo '+n.number,disputed,
      'Existen discrepancias; no reemplazar las notas sin revisar.','datos',n.number);
   }
  }
  if(complex.length){
   const eligible=new Set(complex.map(s=>id(s.id)));
   const entries=(state.evaluaciones||[]).filter(e=>e.tipo!=='trabajo'&&eligible.has(id(e.studentId)));
   const evaluated=new Set(entries.map(e=>id(e.studentId)));
   add('upload',g,'exam','Cargar registros de Examen Complexivo',
     complex.filter(s=>!evaluated.has(id(s.id))).length,
    'Falta un registro de evaluación; no implica que el estudiante haya reprobado.','evaluaciones');
   const results=entries.map(e=>root.InformetitComplexivo?.evaluate(e)).filter(Boolean);
   add('upload',g,'exam-components','Completar teoría y práctica de Complexivo',
     new Set(results.filter(e=>!e.ordinaryComplete&&e.ordinario.asistencia!=='no_presentado')
       .map(e=>id(e.studentId))).size,
     'El registro existe, pero falta completar los componentes ordinarios.','evaluaciones');
   add('upload',g,'exam-rescue','Completar resultados supletorios',
     new Set(results.filter(e=>e.status==='supletorio_pendiente').map(e=>id(e.studentId))).size,
     'Solo casos con ordinario insuficiente y recuperación pendiente.','evaluaciones');
   add('review',g,'exam-actas','Cotejar actas y resultados de Complexivo',
     new Set(results.filter(e=>e.finalGrade!==null&&!e.verified).map(e=>id(e.studentId))).size,
     'Los cálculos no sustituyen una referencia y revisión documental.','evaluaciones');
  }
  if(work.length){
   const eligible=new Set(work.map(s=>id(s.id)));
   const entries=(state.trabajos||[]).filter(e=>eligible.has(id(e.studentId)));
   const projects=new Set(entries.map(e=>id(e.studentId)));
   add('upload',g,'project','Cargar registros de Trabajo de Titulación',
     work.filter(s=>!projects.has(id(s.id))).length,
    'Falta un registro de proyecto o defensa; no equivale a nota cero.','trabajo');
   const results=entries.map(e=>root.InformetitTrabajo?.evaluate(e)).filter(Boolean);
   add('upload',g,'project-rubric','Completar rúbricas de Trabajo de Titulación',
     new Set(results.filter(e=>!e.complete&&e.asistencia!=='no_presentado')
       .map(e=>id(e.studentId))).size,
     'La ficha existe, pero faltan componentes de evaluación.','trabajo');
   add('review',g,'project-actas','Cotejar actas de Trabajo de Titulación',
     new Set(results.filter(e=>e.definitive!==null&&!e.actaReferenced)
       .map(e=>id(e.studentId))).size,
     'El resultado calculado requiere documentación.','trabajo');
  }
  const groupIds=new Set(people.map(x=>id(x.id)));
  const conflicts=(state.conflictos||[]).filter(c=>groupIds.has(id(c.studentId||id(c.id).split('|')[0]))).length;
  add('review',g,'conflicts','Conciliar conflictos de información',conflicts,
   'Revisar registros contradictorios sin sobrescribir el expediente.','datos');
 }
 if((state.sinVincular||[]).length)review.unshift({id:'unmatched',scope:'global',priority:0,
   kind:'review',label:'Vincular registros sin identificar',count:state.sinVincular.length,
   detail:'Estos registros aún no tienen identidad confiable.',page:'datos'});
 const sorter=(a,b)=>a.priority-b.priority||a.label.localeCompare(b.label,'es')||a.scope.localeCompare(b.scope,'es');
 upload.sort(sorter);review.sort(sorter);
 return {hasRoster:true,careers:[...byCareer.values()].map(g=>({id:g.id,career:g.career,
  mode:g.mode,total:g.students.length})).sort((a,b)=>a.career.localeCompare(b.career,'es')||a.mode.localeCompare(b.mode)),
  upload,review};
}
const api=Object.freeze({build});
root.InformetitWorkQueue=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
