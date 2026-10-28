/* Bloque 06 · Importación masiva de ordinarios y supletorios (CSV/TSV por cédula).
   Vista previa obligatoria; ningún registro previo se sobreescribe automáticamente. */
(function(root){
'use strict';
const X=()=>root.InformetitComplexivo;
const txt=x=>String(x??'').trim();
const norm=x=>txt(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const aliases={
 id:['CEDULA','CEDULA DE IDENTIDAD','NUMERO IDENTIFICACION','NUMERO DE IDENTIFICACION','IDENTIFICACION'],
 teoria:['TEORIA','TEORICA','NOTA TEORICA','CALIFICACION TEORICA','TEORIA ORDINARIO','TEORICA ORDINARIO'],
 practica:['PRACTICA','NOTA PRACTICA','CALIFICACION PRACTICA','PRACTICA ORDINARIO'],
 supTeoria:['TEORIA SUPLETORIO','TEORICA SUPLETORIO','SUPLETORIO TEORIA'],
 supPractica:['PRACTICA SUPLETORIO','SUPLETORIO PRACTICA'],
 supFinal:['NOTA SUPLETORIO','SUPLETORIO','NOTA FINAL SUPLETORIO','CALIFICACION SUPLETORIO'],
 actaOrd:['ACTA ORDINARIO','ACTA ORDINARIA','ACTA'],
 actaSup:['ACTA SUPLETORIO','ACTA SUPLETORIA'],
};
function split(line,sep){
 const out=[];let current='',quoted=false;
 for(let i=0;i<line.length;i++){
  const c=line[i];
  if(c==='"'){if(quoted&&line[i+1]==='"'){current+='"';i++}else quoted=!quoted}
  else if(c===sep&&!quoted){out.push(current.trim());current=''}
  else current+=c;
 }
 out.push(current.trim());
 if(quoted)throw Error('Comillas sin cerrar en una fila del archivo.');
 return out;
}
function parse(raw){
 const lines=String(raw||'').replace(/\r/g,'').split('\n').filter(x=>x.trim());
 if(lines.length<2)throw Error('Pega los encabezados y al menos una fila de calificaciones.');
 if(lines.length>1500)throw Error('La importación admite hasta 1.499 filas por lote.');
 const sep=lines[0].includes('\t')?'\t':';',headers=split(lines[0],sep).map(norm);
 const indices={};for(const [k,names] of Object.entries(aliases)){
  indices[k]=headers.findIndex(h=>names.includes(h));
 }
 for(const k of ['id','teoria','practica'])if(indices[k]<0)
  throw Error('Falta la columna '+(k==='id'?'Cédula':k==='teoria'?'Teoría':'Práctica')+'.');
 const rows=[];
 for(let line=1;line<lines.length;line++){
  const cells=split(lines[line],sep),v=k=>indices[k]>=0?txt(cells[indices[k]]):'';
  const studentId=v('id');if(!studentId)continue;
  rows.push({line:line+1,studentId,ordTeoria:v('teoria'),ordPractica:v('practica'),
   supTeoria:v('supTeoria'),supPractica:v('supPractica'),supFinal:v('supFinal'),
   actaOrdinario:v('actaOrd'),actaSupletorio:v('actaSup')});
 }
 return {rows,format:sep==='\t'?'TSV':'CSV',headers,indices};
}
function assess(raw,state,mode){
 const parsed=parse(raw),actual=mode==='online'?'online':'presencial';
 const map=new Map(),seen=new Map();
 for(const s of state.estudiantes||[])map.set(String(s.id),s);
 const rows=parsed.rows.map(row=>{
  const duplicate=seen.has(row.studentId);
  seen.set(row.studentId,(seen.get(row.studentId)||0)+1);
  const person=map.get(row.studentId);
  let status='ready',reason='Identificación exacta';
  if(!person){status='unmatched';reason='Cédula no encontrada en la base local'}
  else if(person.modalidad!==actual){status='wrong_mode';reason='Estudiante de otra modalidad'}
  else if(person.tipoTitulacion==='trabajo'){status='wrong_mechanism';reason='Estudiante de Trabajo de Titulación'}
  else if((state.evaluaciones||[]).some(e=>String(e.studentId)===row.studentId&&e.tipo!=='trabajo')){
   status='existing';reason='Tiene evaluación guardada; revisar individualmente antes de reemplazar'
  }
  if(status==='ready'){
   try{
    const rawEval={studentId:row.studentId,tipo:'complexivo',
     ordinario:{teoria:X().inputGrade(row.ordTeoria,'Teoría'),practica:X().inputGrade(row.ordPractica,'Práctica'),asistencia:'pendiente'},
     supletorio:{teoria:X().inputGrade(row.supTeoria,'Teoría supletorio'),practica:X().inputGrade(row.supPractica,'Práctica supletorio'),
       notaFinal:X().inputGrade(row.supFinal,'Nota supletorio'),asistencia:'pendiente'},
     actaOrdinario:row.actaOrdinario,actaSupletorio:row.actaSupletorio};
    if(Object.values(rawEval.ordinario).every(x=>x===null||x==='pendiente')&&
      Object.values(rawEval.supletorio).every(x=>x===null||x==='pendiente')){
      status='without_grade';reason='No hay ninguna calificación para guardar';
    }else{
      const result=X().evaluate(rawEval);
      if(result.warnings.length){status='invalid';reason=result.warnings.join('; ')}
    }
   }catch(e){status='invalid';reason=e.message}
  }
  if(duplicate){status='duplicate_in_file';reason='Cédula repetida en el lote'}
  return {...row,person,status,reason};
 });
 for(const r of rows)if(seen.get(r.studentId)>1){r.status='duplicate_in_file';r.reason='Cédula repetida en el lote'}
 const counts={total:rows.length,ready:rows.filter(x=>x.status==='ready').length,
  skipped:rows.filter(x=>x.status!=='ready').length,
  existing:rows.filter(x=>x.status==='existing').length,
  unmatched:rows.filter(x=>x.status==='unmatched').length,
  invalid:rows.filter(x=>x.status==='invalid').length,
  duplicate:rows.filter(x=>x.status==='duplicate_in_file').length};
 return {mode:actual,rows,counts,format:parsed.format};
}
function apply(state,assessment,stamp){
 const M=root.InformetitDataModel;let next=M.migrate(state),added=0;
 for(const r of assessment.rows.filter(x=>x.status==='ready')){
  // Revalidar contra el estado real antes de añadir cada nota.
  if((next.evaluaciones||[]).some(x=>String(x.studentId)===r.studentId&&x.tipo!=='trabajo'))continue;
  const saved=X().upsert(next,r.studentId,{
    ordTeoria:r.ordTeoria,ordPractica:r.ordPractica,ordAsistencia:'pendiente',
    supTeoria:r.supTeoria,supPractica:r.supPractica,supFinal:r.supFinal,supAsistencia:'pendiente',
    actaOrdinario:r.actaOrdinario,actaSupletorio:r.actaSupletorio
  },stamp);
  next=saved.next;added++;
 }
 next.importaciones.push({tipo:'notas_complexivo',nombre:'Examen Complexivo · lote '+assessment.format,
   fecha:stamp,filas:assessment.counts.total,incorporadas:added,omitidas:assessment.counts.total-added});
 return {next,stats:{added,skipped:assessment.counts.total-added}};
}
const api=Object.freeze({parse,assess,apply});
root.InformetitExamImport=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
