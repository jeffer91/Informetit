/* Informetit · Centro de carga inteligente. Datos solo en el equipo. */
(function(root){
'use strict';
const M=()=>root.InformetitDataModel, C=()=>root.InformetitNucleiCatalog;
const clean=x=>String(x??'').trim();
const key=x=>M().key(x);
const email=x=>clean(x).toLowerCase();
const mailRE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normName=x=>key(x).split(' ').filter(Boolean).sort().join(' ');
const grade=x=>M().grade(x);
const emailOf=s=>[s.correo,s.correoPersonal,s.CorreoInstitucional,s.CorreoPersonal].filter(Boolean).map(email);
const courseHeader=/T-\s*N[ÚU]CLEO\s*-\s*([^\r\n[]+?)\s*\[([^\]]*)\]/gi;
function blocks(raw){
 const text=String(raw||''),hits=[...text.matchAll(courseHeader)],out=[];
 if(!hits.length)return [{title:'',text}];
 for(let i=0;i<hits.length;i++){
  const start=hits[i].index+hits[i][0].length,stop=i+1<hits.length?hits[i+1].index:text.length;
  const body=text.slice(start,stop);
  if(!/@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(body))continue;
  out.push({title:hits[i][1].trim(),text:body,header:hits[i][0]});
 }
 return out.length?out:[{title:hits[0][1].trim(),text:text.slice(hits[0].index+hits[0][0].length)}];
}
function vertical(raw){
 const lines=String(raw||'').replace(/\r/g,'').split('\n').map(clean).filter(Boolean);
 const records=[];
 for(let i=0;i<lines.length;i++){
  if(!mailRE.test(lines[i]))continue;
  let name='';
  for(let j=i-1;j>=Math.max(0,i-5);j--){
   const v=lines[j].replace(/Matriculaci[oó]n de usuarios suspendida/gi,'').trim();
   if(v.length>6&&!mailRE.test(v)&&!/^T-\s*N[ÚU]CLEO|^NOMBRE|^DIRECCI[OÓ]N|^M[EO]N[UÚ]|^CALIFICACI[OÓ]N/i.test(v)&&!/^[-+\d.,\s]+$/.test(v)){name=v;break}
  }
  const nums=[];
  for(let j=i+1;j<lines.length;j++){
   const v=lines[j];
   if(mailRE.test(v)||/Matriculaci[oó]n de usuarios suspendida|^Promedio general|^T-\s*N[ÚU]CLEO/i.test(v))break;
   if(/^\d{1,2}(?:[.,]\d{1,2})?$/.test(v))nums.push(Number(v.replace(',','.')));
  }
  let final=null,reason='';
  if(nums.length===7&&nums.every(n=>n>=0&&n<=10)){
   final=nums[6];
  }else if(nums.length===6&&nums.every(n=>n>=0&&n<=10)){
   const avg=nums.slice(0,5).reduce((a,b)=>a+b,0)/5;
   if(Math.abs(avg-nums[5])<=0.035&&new Set(nums.slice(0,5)).size>1)final=nums[5];
   else reason='Seis valores sin total final inequívoco';
  }else reason=nums.length+' valores: verificar columna Total del curso';
  records.push({name,email:email(lines[i]),id:'',grade:final,partials:final===null?nums:nums.slice(0,-1),
    reason,rawLine:i+1,rawNumbers:nums});
 }
 return records;
}
function delimitedRow(line,separator){
 const result=[];let field='',quoted=false;
 for(let i=0;i<line.length;i++){
  const char=line[i];
  if(char==='"'){
   if(quoted&&line[i+1]==='"'){field+='"';i++}
   else quoted=!quoted;
  }else if(char===separator&&!quoted){result.push(field.trim());field=''}
  else field+=char;
 }
 result.push(field.trim());return result;
}
function tabular(raw){
 const lines=String(raw||'').replace(/\r/g,'').split('\n').filter(x=>x.trim());
 for(const sep of ['\t',';',',']){
  let head=-1,headers=[];
  for(let i=0;i<Math.min(50,lines.length);i++){
   const cols=delimitedRow(lines[i],sep).map(key);
   if(cols.length<3)continue;
   if(cols.some(x=>/DIRECCION DE CORREO|CORREO ELECTRONICO|EMAIL|E MAIL/.test(x))&&
      cols.some(x=>/TOTAL DEL CURSO|COURSE TOTAL|NOTA FINAL|CALIFICACION FINAL/.test(x))){
    head=i;headers=cols;break;
   }
  }
  if(head<0)continue;
  const find=re=>headers.findIndex(x=>re.test(x));
  const emailIndex=find(/DIRECCION DE CORREO|CORREO ELECTRONICO|EMAIL|E MAIL/);
  const finals=headers.map((x,i)=>/TOTAL DEL CURSO|COURSE TOTAL|NOTA FINAL|CALIFICACION FINAL/.test(x)?i:-1).filter(i=>i>=0);
  if(finals.length!==1)return null;
  const first=find(/^NOMBRE|^FIRST NAME/),last=find(/^APELLIDO|^SURNAME|^LAST NAME/);
  const cedula=find(/CEDULA|IDENTIFICACION|ID NUMBER/);
  const partials=headers.map((x,i)=>i!==finals[0]&&/EVALUACION PARCIAL|TALLER PRACTICO|CUESTIONARIO|PRUEBA|QUIZ/.test(x)?i:-1).filter(i=>i>=0);
  const records=[];
  for(let i=head+1;i<lines.length;i++){
   const cells=delimitedRow(lines[i],sep);
   const address=email(cells[emailIndex]);
   if(!mailRE.test(address))continue;
   const n=[first>=0?clean(cells[first]):'',last>=0?clean(cells[last]):''].filter(Boolean).join(' ');
   const rawGrade=clean(cells[finals[0]]),number=grade(rawGrade);
   records.push({name:n,email:address,id:cedula>=0?clean(cells[cedula]):'',
     grade:number,partials:partials.map(j=>grade(cells[j])),reason:number===null?'Total del curso vacío o no válido':'',
     rawLine:i+1});
  }
  if(records.length)return records;
 }
 return null;
}
function parseRows(block){
 const tab=tabular(block.text);if(tab)return tab;
 const existing=root.InformetitMoodle?.parse(block.text);
 if(existing&&existing.format!=='texto_vertical'&&existing.records.length)
  return existing.records.map(x=>({...x,grade:grade(x.grade),reason:''}));
 return vertical(block.text);
}
function findStudent(row,students){
 const byId=row.id?students.filter(s=>clean(s.id)===clean(row.id)):[];
 const byMail=row.email?students.filter(s=>emailOf(s).includes(row.email)):[];
 const byName=row.name?students.filter(s=>normName(s.nombre)===normName(row.name)):[];
 if(byId.length>1||byMail.length>1||byName.length>1)return {status:'ambiguous',reason:'Identidad duplicada en el padrón'};
 if(byId.length&&byMail.length&&byId[0].id!==byMail[0].id)return {status:'identity_conflict',reason:'Cédula y correo distintos'};
 if(byMail.length&&byName.length&&byMail[0].id!==byName[0].id)return {status:'identity_conflict',reason:'Correo y nombre corresponden a personas distintas'};
 const student=byId[0]||byMail[0]||byName[0];
 if(!student)return {status:'unmatched',reason:'No figura en el padrón'};
 if(row.id&&row.id!==student.id)return {status:'identity_conflict',reason:'Cédula distinta'};
 if(row.email&&!emailOf(student).includes(row.email))return {status:'identity_conflict',reason:'Correo no coincide con el padrón'};
 if(row.name&&normName(student.nombre)!==normName(row.name))return {status:'identity_conflict',reason:'Nombre no coincide con el padrón'};
 return {status:'matched',student,reason:'Identidad exacta'};
}
function detectCourse(title,rows,selectedCareer){
 const catalog=C().list(),v=key(title);
 let matches=catalog.flatMap(c=>c.nuclei.filter(n=>key(n.title)===v).map(n=>({career:c.name,nucleus:n.number,title:n.title})));
 if(selectedCareer&&selectedCareer!=='auto')matches=matches.filter(x=>C().canonical(x.career)===C().canonical(selectedCareer));
 if(matches.length>1){
  const counts=new Map();
  for(const r of rows)if(r.identity?.student){
   const c=C().canonical(r.identity.student.carrera);counts.set(c,(counts.get(c)||0)+1);
  }
  const highest=Math.max(0,...matches.map(x=>counts.get(C().canonical(x.career))||0));
  if(highest>0&&matches.filter(x=>(counts.get(C().canonical(x.career))||0)===highest).length===1)
    matches=matches.filter(x=>(counts.get(C().canonical(x.career))||0)===highest);
 }
 return matches.length===1?matches[0]:null;
}
function academicSignature(state){
 return JSON.stringify({
  students:(state.estudiantes||[]).map(s=>[s.id,s.nombre,s.carrera,s.modalidad,s.tipoTitulacion,
    s.correo,s.correoPersonal,s.CorreoInstitucional,s.CorreoPersonal]),
  notes:(state.notas||[]).map(n=>[n.id,n.studentId,n.nucleo,n.curso,n.nota,n.status,n.verificado,n.parciales]),
  drafts:(state.notasBorrador||[]).map(n=>[n.id,n.studentId,n.nucleo,n.curso,n.nota,n.status,n.verificado,n.parciales]),
  courses:(state.cursosNucleos||[]).map(n=>[n.studentId,n.nucleo,n.curso,n.nota,n.verificado]),
  conflicts:(state.conflictos||[]).map(n=>[n.id,n.anterior,n.nuevo]),
  unmatched:(state.sinVincular||[]).map(n=>[n.tipo,n.carrera,n.nucleo,n.registro?.email,n.registro?.name])
 });
}
function assess(raw,state,opts={}){
 if(!state?.estudiantes?.length)throw Error('Primero carga la nómina privada de estudiantes.');
 const chunks=blocks(raw),results=[],seen=new Map();
 for(const chunk of chunks){
  const rows=parseRows(chunk).map(row=>({...row,identity:findStudent(row,state.estudiantes)}));
  const detected=detectCourse(chunk.title||opts.title,rows,opts.career||'auto');
  const manual=opts.career&&opts.career!=='auto'&&Number(opts.nucleus)>0
    ?C().lookup(opts.career,Number(opts.nucleus)):null;
  const context=detected||(!chunk.title&&manual?{career:opts.career,nucleus:Number(opts.nucleus),title:manual.title}:null);
  const course={title:chunk.title||context?.title||'',career:context?.career||'',
    nucleus:context?.nucleus||0,rows:[],error:context?'':'No se identificó carrera y núcleo de forma inequívoca'};
  for(const row of rows){
   const identity=row.identity,student=identity.student;
   let status=identity.status,reason=identity.reason,recordId='';
   if(status==='matched'&&!context){status='course_unknown';reason=course.error}
   else if(status==='matched'&&C().canonical(student.carrera)!==C().canonical(context.career)){
    status='wrong_career';reason='La carrera del estudiante difiere del curso';
   }else if(status==='matched'&&row.grade===null){status='missing_grade';reason=row.reason||'Nota final no identificada'}
   else if(status==='matched'&&student.tipoTitulacion==='trabajo'){
    status='wrong_mechanism';reason='Estudiante de Trabajo de Titulación: revisar aplicación del núcleo';
   }else if(status==='matched'){
    recordId=student.id+'|'+context.nucleus;
    const official=(state.notas||[]).find(n=>String(n.studentId)+'|'+Number(n.nucleo)===recordId);
    const draft=(state.notasBorrador||[]).find(n=>String(n.studentId)+'|'+Number(n.nucleo)===recordId);
    const before=official||draft;
    if((state.conflictos||[]).some(c=>String(c.id)===recordId)){
     status='conflict';reason='Conflicto previo sin resolver';
    }else if(before&&grade(before.nota)===row.grade){
     status=official?'already':'draft_same';
     reason=official?'Nota ya verificada, sin duplicar':'Coincide con un borrador: requiere cotejo antes de verificar';
    }else if(before){status='conflict';reason='Nota distinta de la registrada';}
    else {status='ready';reason=student.tipoTitulacion==='complexivo'?'Lista para guardar':'Mecanismo pendiente: se guardará provisional';}
    if(seen.has(recordId)){
     const earlier=seen.get(recordId);
     status='duplicate_paste';reason='Registro repetido en la misma carga';
     earlier.status='duplicate_paste';earlier.reason='Registro repetido en la misma carga';
    }else seen.set(recordId,{status,reason});
   }
   const entry={...row,status,reason,recordId,student:student||null};
   if(recordId)seen.set(recordId,entry);
   course.rows.push(entry);
  }
  results.push(course);
 }
 for(const course of results)for(const r of course.rows)
  if(r.recordId&&seen.get(r.recordId)?.status==='duplicate_paste'){
   r.status='duplicate_paste';r.reason='Registro repetido en la misma carga';
  }
 const all=results.flatMap(c=>c.rows);
 const counts={courses:results.length,students:all.length,ready:all.filter(x=>['ready','draft_same'].includes(x.status)).length,
  already:all.filter(x=>x.status==='already').length,
  review:all.filter(x=>!['ready','already','draft_same'].includes(x.status)).length};
 return {courses:results,counts,raw,signature:academicSignature(state)};
}
function apply(state,assessment,reviewed,stamp){
 const current=academicSignature(state);
 if(current!==assessment.signature)throw Error('La base cambió después del análisis. Vuelve a revisar.');
 const next=M().migrate(state),stats={verified:0,provisional:0,promoted:0,duplicates:0,conflicts:0,quarantine:0};
 const existingQ=new Set((next.sinVincular||[]).map(x=>[x.tipo,x.carrera,x.nucleo,x.registro?.email,x.registro?.name].join('|')));
 const existingConflicts=new Set((next.conflictos||[]).map(x=>String(x.id)));
 for(const course of assessment.courses)for(const r of course.rows){
  if(r.status==='already'){stats.duplicates++;continue}
  const student=r.student,base={id:r.recordId,studentId:student?.id||'',nucleo:course.nucleus,
   curso:course.title,carrera:student?.carrera||course.career,modalidad:student?.modalidad||'',
   nota:r.grade,parciales:r.partials,email:r.email,source:'Moodle · carga inteligente',fecha:stamp};
  if(r.status==='draft_same'){
   if(reviewed&&student.tipoTitulacion==='complexivo'){
    const previous=(next.notasBorrador||[]).filter(n=>String(n.studentId)+'|'+Number(n.nucleo)===r.recordId);
    if(!previous.length||previous.some(n=>grade(n.nota)!==r.grade))throw Error('El borrador cambió; revisa nuevamente');
    next.notasBorrador=next.notasBorrador.filter(n=>String(n.studentId)+'|'+Number(n.nucleo)!==r.recordId);
    next.notas.push({...base,status:'oficial_registro_moodle',verificado:true,origenBorrador:previous.map(n=>({
      fuente:n.source||n.fuente||'',estado:n.status||n.estado||'',fecha:n.fecha||n.fechaImportacion||''
    }))});
    next.auditoria.push({tipo:'cotejo_nota_borrador',studentId:student.id,nucleo:course.nucleus,
      fuente:'Moodle · carga inteligente',fecha:stamp,anteriores:previous,notaVerificada:base});
    stats.promoted++;stats.verified++;
   }else stats.duplicates++;
   continue;
  }
  if(r.status==='ready'){
   if(reviewed&&student.tipoTitulacion==='complexivo'){
    next.notas.push({...base,status:'oficial_registro_moodle',verificado:true});stats.verified++;
   }else{
    next.notasBorrador.push({...base,status:'provisional_por_conciliar',verificado:false});
    stats.provisional++;
   }
  }else if(r.status==='conflict'&&r.recordId&&!existingConflicts.has(r.recordId)){
   const anterior=[...next.notas,...next.notasBorrador].find(n=>String(n.studentId)+'|'+Number(n.nucleo)===r.recordId);
   if(anterior&&grade(anterior.nota)!==r.grade&&r.grade!==null){
    next.conflictos.push({id:r.recordId,anterior,nuevo:{...base,status:'provisional_por_conciliar'},
      fuente:'Moodle · carga inteligente',fecha:stamp});
    existingConflicts.add(r.recordId);stats.conflicts++;continue;
   }
  }
  if(r.status!=='ready'){
   const k=['carga_inteligente',course.career,course.nucleus,r.email,r.name].join('|');
   if(!existingQ.has(k)){
    next.sinVincular.push({tipo:'carga_inteligente',carrera:course.career,nucleo:course.nucleus,
     modalidad:student?.modalidad||'',registro:{name:r.name,email:r.email,id:r.id,nota:r.grade,
       parciales:r.partials,curso:course.title},estado:r.status,motivo:r.reason,fecha:stamp});
    existingQ.add(k);stats.quarantine++;
   }
  }
 }
 next.importaciones.push({tipo:'carga_inteligente',nombre:'Moodle · '+assessment.courses.map(c=>c.title).join(' / '),
  filas:assessment.counts.students,fecha:stamp,incorporados:stats.verified+stats.provisional,
  conflictos:stats.conflicts,sinVincular:stats.quarantine});
 next.auditoria.push({tipo:'carga_inteligente',fecha:stamp,fuente:'Moodle',total:assessment.counts.students,
  verificadas:stats.verified,provisionales:stats.provisional,conflictos:stats.conflicts});
 return {next,stats};
}
function pending(state){
 const records=(state.estudiantes||[]),notes=[...(state.notas||[]),...(state.notasBorrador||[]),...(state.cursosNucleos||[])];
 const rows=[],actions=[],conflictIds=new Set((state.conflictos||[]).map(x=>String(x.id)));
 const isProvisional=x=>['PROVISIONAL','ESTIMADO','SIMULADO','BORRADOR','SIN VERIFICAR','PROVISIONAL POR CONCILIAR']
  .includes(key(x.status||x.estado));
 for(const mode of ['presencial','online']){
  const byMode=records.filter(s=>s.modalidad===mode);
  for(const group of C().list()){
   const people=byMode.filter(s=>C().canonical(s.carrera)===C().canonical(group.name));
   if(!people.length)continue;
   const known=people.filter(s=>s.tipoTitulacion==='complexivo'),
     projects=people.filter(s=>s.tipoTitulacion==='trabajo'),
     unknown=people.filter(s=>s.tipoTitulacion==='sin_definir');
   const ids=new Set(known.map(s=>String(s.id)));
   const nuclei=group.nuclei.map(n=>{
    const relevant=notes.filter(x=>ids.has(String(x.studentId))&&Number(x.nucleo)===n.number&&grade(x.nota)!==null);
    const present=new Set(relevant.map(x=>String(x.studentId)));
    const verified=new Set((state.notas||[]).filter(x=>ids.has(String(x.studentId))&&Number(x.nucleo)===n.number
      &&x.verificado===true&&!isProvisional(x)&&grade(x.nota)!==null&&!conflictIds.has(String(x.studentId)+'|'+n.number))
      .map(x=>String(x.studentId)));
    const conflicted=known.filter(s=>conflictIds.has(String(s.id)+'|'+n.number)).length;
    const missing=known.filter(s=>!present.has(String(s.id))&&!conflictIds.has(String(s.id)+'|'+n.number)).length;
    const provisional=known.filter(s=>present.has(String(s.id))&&!verified.has(String(s.id))&&!conflictIds.has(String(s.id)+'|'+n.number)).length;
    const expected=known.length;
    let status='Sin Complexivo confirmado';
    if(expected){
     status=verified.size===expected&&conflicted===0?'Verificado':
      conflicted?'Conciliar conflictos':missing?'Cargar notas':provisional?'Cotejar':'Revisar';
     if(missing)actions.push('Completar '+missing+' notas · '+group.name+' · '+mode+' · Núcleo '+n.number);
     if(provisional)actions.push('Verificar '+provisional+' notas · '+group.name+' · '+mode+' · Núcleo '+n.number);
     if(conflicted)actions.push('Resolver '+conflicted+' conflictos · '+group.name+' · '+mode+' · Núcleo '+n.number);
    }
    return {number:n.number,title:n.title,present:present.size,verified:verified.size,
     expected,missing,provisional,conflicts:conflicted,status};
   });
   rows.push({career:group.name,mode,students:people.length,projects:projects.length,
    unknown:unknown.length,known:known.length,nuclei});
   if(unknown.length)actions.push('Clasificar mecanismo de '+unknown.length+' estudiantes · '+group.name+' · '+mode);
  }
 }
 if(state.sinVincular?.length)actions.unshift('Conciliar '+state.sinVincular.length+' registros sin vinculación segura');
 return {rows,actions};
}
const api=Object.freeze({blocks,vertical,assess,apply,pending});
root.InformetitCargaInteligente=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
