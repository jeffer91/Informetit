/* Informetit · Bloque 04 · Importación determinista de notas Moodle.
   Solo datos locales. Nunca se infieren notas o identidades con coincidencia aproximada. */
(function(root){
'use strict';
const M=()=>root.InformetitDataModel;
const clean=x=>String(x??'').trim();
const key=x=>clean(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
const email=x=>clean(x).toLowerCase();
const emailRE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validGrade=x=>{if(x===null||x===undefined||clean(x)==='')return null;return M().grade(x)};
const career=x=>M().career(x);
const tokens=x=>key(x).split(' ').filter(Boolean).sort().join(' ');
const code=x=>String(x||'').replace(/\s+/g,'').toUpperCase();
const gradeEqual=(x,y)=>validGrade(x)!==null&&validGrade(x)===validGrade(y);
function findHeader(raw){
 const text=String(raw||'');
 const m=text.match(/N[ÚU]CLEO\s*([1-4])\s+([^\r\n\t|]+)/i);
 if(!m)return {nucleus:null,career:''};
 let name=m[2].replace(/\b(?:CALIFICACIONES|LIBRO DE CALIFICACIONES|CURSO|ESTUDIANTES|NOTAS)\b.*$/i,'').replace(/\s*[-–—|]\s*$/,'').trim();
 return {nucleus:Number(m[1]),career:name};
}
function splitDelimited(line,separator){
 const fields=[];let value='',quoted=false;
 for(let i=0;i<line.length;i++){
  const ch=line[i];
  if(ch==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++}else quoted=!quoted}
  else if(ch===separator&&!quoted){fields.push(value.trim());value=''}
  else value+=ch;
 }
 fields.push(value.trim());return fields;
}
const isMailHeader=x=>/(?:^| )(?:(?:CORREO|EMAIL|E MAIL|DIRECCION DE CORREO)(?: ELECTRONICO| INSTITUCIONAL| ADDRESS)?)(?: |$)/.test(key(x));
const isFinalHeader=x=>/^(?:TOTAL DEL CURSO|COURSE TOTAL|NOTA FINAL|CALIFICACION FINAL|FINAL GRADE|RESULTADO FINAL)(?: |$)/.test(key(x));
const isPartialHeader=x=>/^(?:PARCIAL|EVALUACION|ACTIVIDAD|TALLER|TAREA|CUESTIONARIO|QUIZ|EXAMEN)(?: |$)/.test(key(x));
function parseDelimited(raw){
 const lines=String(raw||'').replace(/\r/g,'').split('\n').filter(x=>x.trim());
 for(const separator of ['\t',';']){
  let headerIndex=-1,headers=[];
  for(let i=0;i<Math.min(lines.length,35);i++){
   const cells=splitDelimited(lines[i],separator);
   if(cells.length>=3&&cells.some(isMailHeader)&&cells.some(isFinalHeader)){headerIndex=i;headers=cells;break}
  }
  if(headerIndex<0)continue;
  const finals=headers.flatMap((h,i)=>isFinalHeader(h)?[i]:[]);
  const mails=headers.flatMap((h,i)=>isMailHeader(h)?[i]:[]);
  if(finals.length!==1||mails.length!==1)
   return {format:'tabla',records:[],warnings:['La tabla contiene varias columnas de nota final o correo; selecciona una exportación inequívoca.']};
  const col=(expr)=>headers.findIndex(x=>expr.test(key(x)));
  const first=col(/^(?:NOMBRE|FIRST NAME|NOMBRES)(?: |$)/);
  const last=col(/^(?:APELLIDO|APELLIDOS|SURNAME|LAST NAME)(?: |$)/);
  const id=col(/^(?:CEDULA|NUMERO IDENTIFICACION|NUMERO DE IDENTIFICACION|ID NUMBER|IDENTIFICACION)(?: |$)/);
  const partial=headers.flatMap((h,i)=>isPartialHeader(h)&&i!==finals[0]?[i]:[]);
  const warnings=[],records=[];
  for(let row=headerIndex+1;row<lines.length;row++){
   const cells=splitDelimited(lines[row],separator);
   const address=email(cells[mails[0]]);
   if(!address&&!clean(cells[first])&&!clean(cells[id]))continue;
   if(address&&!emailRE.test(address)){warnings.push('Correo inválido en fila '+(row+1));continue}
   const gradeRaw=clean(cells[finals[0]]);
   const firstName=first>=0?clean(cells[first]):'';
   const surname=last>=0?clean(cells[last]):'';
   const name=[firstName,surname].filter(Boolean).join(' ');
   records.push({name,email:address,id:id>=0?clean(cells[id]):'',grade:validGrade(gradeRaw),
    gradeRaw,partials:partial.map(i=>validGrade(cells[i])),rawLine:row+1});
  }
  return {format:separator==='\t'?'tabla_tab':'tabla_puntoycoma',records,warnings,
   meta:{finalColumn:headers[finals[0]],partialColumns:partial.map(x=>headers[x])}};
 }
 return null;
}
function parseVertical(raw){
 const lines=String(raw||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
 const mailPositions=[];
 for(let i=0;i<lines.length;i++)if(emailRE.test(lines[i]))mailPositions.push(i);
 const records=[],warnings=[];
 for(let index=0;index<mailPositions.length;index++){
  const at=mailPositions[index],next=index+1<mailPositions.length?mailPositions[index+1]:lines.length;
  let name='';
  for(let k=at-1;k>=Math.max(0,at-5);k--){
   const candidate=lines[k].replace(/Matriculaci[oó]n de usuarios suspendida/gi,'').trim();
   if(candidate.length>=5&&!emailRE.test(candidate)&&!/^(?:OCULTAR|ESTUDIANTE|CALIFICACIONES|USUARIO|ROLES|PARTICIPANTES|TOTAL DEL CURSO|NOTA FINAL|N[ÚU]CLEO|T-?\s*N[ÚU]CLEO)/i.test(candidate)&&!/^[-+\d.,\s]+$/.test(candidate)){name=candidate;break}
  }
  const nums=[],block=lines.slice(at+1,next);
  let explicit=null;
  for(let i=0;i<block.length;i++){
   const line=block[i];
   if(/^(?:TOTAL DEL CURSO|COURSE TOTAL|NOTA FINAL|CALIFICACION FINAL|FINAL GRADE)(?:\s*[:\-]?\s*|$)/i.test(line)){
    const match=/([0-9]+(?:[.,][0-9]+)?)\s*$/.exec(line);
    const raw=match?match[1]:block[i+1];
    if(validGrade(raw)!==null)explicit=validGrade(raw);
   }
   if(/^(?:[0-9]+(?:[.,][0-9]+)?)$/.test(line))nums.push(Number(line.replace(',','.')));
  }
  let grade=null,partials=[];
  if(explicit!==null){grade=explicit;partials=nums.filter((_,i)=>i<nums.length-1).map(validGrade)}
  else if(nums.length===6&&nums.every(x=>x>=0&&x<=10)){
   grade=nums[5];partials=nums.slice(0,5);
  }else warnings.push('Correo '+lines[at]+': '+nums.length+' valores numéricos; se requiere total final inequívoco (seis valores o etiqueta explícita).');
  records.push({name,email:email(lines[at]),id:'',grade,gradeRaw:grade===null?'':String(grade),partials,rawLine:at+1});
 }
 return {format:'texto_vertical',records,warnings};
}
function parse(raw){
 if(!clean(raw))return {format:'sin_datos',records:[],warnings:['Pega el libro de calificaciones de Moodle.'],...findHeader(raw)};
 const header=findHeader(raw);
 const result=parseDelimited(raw)||parseVertical(raw);
 return {...result,...header};
}
function sameIdentity(student,row){
 const sources=[student.correo,student.correoPersonal,student.CorreoInstitucional,student.CorreoPersonal].filter(Boolean).map(email);
 if(row.id&&code(row.id)!==code(student.id))return false;
 if(row.email&&sources.length&&sources.indexOf(row.email)<0)return false;
 if(row.name&&tokens(row.name)!==tokens(student.nombre))return false;
 return true;
}
function resolveRow(row,students,context){
 const all=(students||[]),matchingID=row.id?all.filter(s=>code(s.id)===code(row.id)):[];
 const matchingMail=row.email?all.filter(s=>[s.correo,s.correoPersonal,s.CorreoInstitucional,s.CorreoPersonal].some(e=>e&&email(e)===row.email)):[];
 const matchingName=row.name?all.filter(s=>tokens(s.nombre)===tokens(row.name)):[];
 const matches=matchingID.length?matchingID:matchingMail.length?matchingMail:matchingName;
 if(!matches.length)return {status:'unmatched',reason:'Sin coincidencia exacta de cédula, correo o nombre'};
 if(matches.length!==1)return {status:'ambiguous',reason:'Identidad duplicada; requiere revisión'};
 const student=matches[0];
 if(student.modalidad!==context.mode)return {status:'wrong_mode',reason:'La identidad pertenece a otra modalidad'};
 if(career(student.carrera)!==career(context.career))return {status:'wrong_career',reason:'La identidad pertenece a otra carrera'};
 if(!sameIdentity(student,row))return {status:'identity_conflict',reason:'La cédula, el correo o el nombre contradicen la ficha'};
 return {status:'matched',student,reason:'Coincidencia exacta'};
}
function contextualize(parsed,ctx){
 const nucleus=ctx?.nucleus==='auto'||!ctx?.nucleus?parsed.nucleus:Number(ctx.nucleus);
 const selected=clean(ctx?.career&&ctx.career!=='auto'?ctx.career:parsed.career);
 const mode=ctx?.mode==='online'?'online':'presencial';
 const errors=[];
 if(!Number.isInteger(nucleus)||nucleus<1||nucleus>4)errors.push('Selecciona el núcleo del 1 al 4.');
 if(!selected)errors.push('Selecciona una carrera. No puede inferirse de las calificaciones.');
 if(parsed.nucleus&&nucleus&&nucleus!==parsed.nucleus)errors.push('El núcleo del encabezado difiere del núcleo seleccionado.');
 if(parsed.career&&selected&&career(parsed.career)!==career(selected))errors.push('La carrera del encabezado difiere de la seleccionada.');
 return {mode,nucleus,career:selected,errors};
}
function assess(parsed,context,state){
 const records=[],summary={ready:0,duplicate:0,conflict:0,unmatched:0,ambiguous:0,wrong_mode:0,wrong_career:0,identity_conflict:0,missing_grade:0,already_conflicted:0,repeat_in_paste:0};
 const seen=new Map();
 const notes=state?.notas||[],word=state?.notasBorrador||[],conflicts=new Set((state?.conflictos||[]).map(x=>String(x.id)));
 for(const row of parsed.records){
  const identity=resolveRow(row,state?.estudiantes||[],context);
  let status=identity.status,reason=identity.reason,id='';
  if(status==='matched'){
   id=String(identity.student.id)+'|'+context.nucleus;
   if(row.grade===null){status='missing_grade';reason='No se identifica una calificación final válida de 0 a 10'}
   else if(seen.has(id)){
    status='repeat_in_paste';reason='Este estudiante aparece más de una vez en el pegado';
    const prior=seen.get(id);
    if(prior.grade!==row.grade){prior.status='repeat_in_paste';prior.reason='El pegado contiene notas distintas para la misma identidad'}
   }else{
    const grade=row.grade;
    const official=notes.find(x=>String(x.studentId)+'|'+Number(x.nucleo)===id);
    const fromWord=word.find(x=>String(x.studentId)+'|'+Number(x.nucleo)===id);
    if(conflicts.has(id)){status='already_conflicted';reason='Ya existe un conflicto sin resolver'}
    else if(official&&gradeEqual(official.nota,grade)){status='duplicate';reason='Nota oficial ya registrada; sin duplicar'}
    else if(official||fromWord&&!gradeEqual(fromWord.nota,grade)){status='conflict';reason='La calificación difiere de Moodle o del Word anterior'}
    else{status='ready';reason=fromWord?'La calificación coincide con el Word y se vinculará a Moodle':'Nueva nota identificada'}
    seen.set(id,{status,grade,reason,record:null});
   }
  }
  const record={...row,status,reason,student:identity.student||null,noteId:id};
  records.push(record);
  if(id&&seen.has(id)&&seen.get(id).record===null)seen.get(id).record=record;
 }
 // Una identidad repetida con cualquier discrepancia no se procesa en absoluto.
 for(const [id,value] of seen){if(value.status==='repeat_in_paste')for(const r of records)if(r.noteId===id){r.status='repeat_in_paste';r.reason=value.reason}}
 for(const r of records){summary[r.status]=(summary[r.status]||0)+1}
 return {context,records,summary,warnings:parsed.warnings||[],errors:context.errors||[],format:parsed.format,total:records.length};
}
function plan(state,assessment,stamp){
 if(assessment.errors.length)throw Error(assessment.errors.join(' '));
 const next=M().migrate(state),stats={added:0,duplicate:0,conflict:0,unmatched:0,skipped:0};
 const conflictIds=new Set(next.conflictos.map(x=>String(x.id)));
 const unlinked=new Set(next.sinVincular.map(x=>[x.tipo,x.nucleo,x.carrera,x.registro?.email,x.registro?.name].join('|')));
 for(const r of assessment.records){
  if(r.status==='ready'){
   const student=r.student,entry={
    id:r.noteId,studentId:student.id,email:r.email,carrera:student.carrera,modalidad:student.modalidad,
    nucleo:assessment.context.nucleus,parciales:r.partials,nota:r.grade,source:'Moodle · pegado de calificaciones',
    status:'oficial_registro_moodle',fecha:stamp
   };
   next.notas.push(entry);stats.added++;
  }else if(r.status==='conflict'){
   if(!conflictIds.has(r.noteId)){
    const before=next.notas.find(x=>String(x.studentId)+'|'+Number(x.nucleo)===r.noteId)||
       next.notasBorrador.find(x=>String(x.studentId)+'|'+Number(x.nucleo)===r.noteId);
    const n={id:r.noteId,studentId:r.student.id,nucleo:assessment.context.nucleus,parciales:r.partials,nota:r.grade,
     carrera:r.student.carrera,modalidad:r.student.modalidad,email:r.email,source:'Moodle · pegado de calificaciones',status:'oficial_registro_moodle',fecha:stamp};
    next.conflictos.push({id:r.noteId,anterior:before,nuevo:n,fuente:'Moodle',fecha:stamp});
    conflictIds.add(r.noteId);stats.conflict++;
   }
  }else if(['unmatched','ambiguous','wrong_career','wrong_mode','identity_conflict'].includes(r.status)){
   const normalized=[r.name,r.email,r.id].filter(Boolean).join(' · ');
   const key=['nota_moodle',assessment.context.nucleus,assessment.context.career,r.email,r.name].join('|');
   if(!unlinked.has(key)){
    next.sinVincular.push({tipo:'nota_moodle',nucleo:assessment.context.nucleus,carrera:assessment.context.career,
     modalidad:assessment.context.mode,registro:{name:r.name,email:r.email,id:r.id,nota:r.grade},
     estado:r.status,motivo:r.reason,fecha:stamp});
    unlinked.add(key);stats.unmatched++;
   }
  }else if(r.status==='duplicate')stats.duplicate++;
  else stats.skipped++;
 }
 next.importaciones.push({nombre:'Moodle · '+assessment.context.career+' · Núcleo '+assessment.context.nucleus,
  tipo:'moodle',filas:assessment.total,fecha:stamp,incorporados:stats.added,conflictos:stats.conflict,sinVincular:stats.unmatched,formato:assessment.format});
 return {next,stats};
}
const api=Object.freeze({parse,contextualize,assess,plan,resolveRow,findHeader});
root.InformetitMoodle=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
