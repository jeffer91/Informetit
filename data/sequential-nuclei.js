/* Informetit · Carga secuencial de un núcleo por carrera, sin datos privados en el código. */
(function(root){
'use strict';
const M=()=>root.InformetitDataModel;
const C=()=>root.InformetitNucleiCatalog;
const trim=v=>String(v??'').trim();
const norm=v=>M().key(v);
const grade=v=>{
 const raw=trim(v);
 if(!/^\d{1,2}(?:[.,]\d{1,2})?$/.test(raw))return null;
 return M().grade(raw);
};
const noteKey=(id,n)=>trim(id)+'|'+Number(n);
function scope(state,career){
 const cat=C().lookup(career);
 if(!cat)throw Error('La carrera no consta en el catálogo de cuatro núcleos.');
 const students=(state.estudiantes||[]).filter(s=>C().canonical(s.carrera)===cat.key)
  .sort((a,b)=>(a.modalidad==='presencial'?0:1)-(b.modalidad==='presencial'?0:1)||a.nombre.localeCompare(b.nombre,'es')||a.id.localeCompare(b.id));
 if(!students.length)throw Error('No hay estudiantes de esta carrera en la nómina privada.');
 const ids=new Set();
 for(const s of students){
  if(!/^\d{10}$/.test(trim(s.id))||ids.has(s.id))throw Error('La nómina presenta cédulas inválidas o repetidas.');
  ids.add(s.id);
 }
 return {catalog:cat,students,key:cat.key,
  fingerprint:students.map(s=>s.id+'|'+s.modalidad+'|'+norm(s.nombre)).join(';')};
}
function careers(state){
 const catalogue=C().list(),present=new Set((state.estudiantes||[]).map(s=>C().canonical(s.carrera)));
 return catalogue.filter(x=>present.has(x.key)).map(x=>({key:x.key,name:x.name,
  count:(state.estudiantes||[]).filter(s=>C().canonical(s.carrera)===x.key).length}))
  .sort((a,b)=>a.name.localeCompare(b.name,'es'));
}
function progress(state,career){
 const x=scope(state,career),saved=state.flujoNucleos?.[x.key]||{};
 const steps=x.catalog.nuclei.map(n=>{
  const entry=saved[String(n.number)];
  const complete=!!entry?.completado&&entry.fingerprint===x.fingerprint;
  return {number:n.number,title:n.title,complete,when:entry?.fecha||'',count:entry?.validados||0};
 });
 return {...x,steps,current:steps.find(n=>!n.complete)?.number||null};
}
function existing(state,id,n){
 const entries=['notas','notasBorrador','cursosNucleos'].flatMap(key=>
  (state[key]||[]).filter(x=>noteKey(x.studentId,x.nucleo)===noteKey(id,n)));
 const values=[...new Set(entries.map(x=>M().grade(x.nota)).filter(x=>x!==null))];
 return {entries,values,grade:values.length===1?values[0]:null,
  conflicting:values.length>1};
}
function template(state,career,workbook){
 if(!workbook?.utils||typeof workbook.write!=='function')
  throw Error('La biblioteca Excel no está disponible.');
 const p=progress(state,career);
 if(p.current===null)throw Error('Los cuatro núcleos ya están completos.');
 const n=p.current,subject=p.catalog.nuclei[n-1].title;
 const cols=['Cédula','Estudiante','Carrera','Modalidad','Núcleo','Asignatura','Nota final','Estado','Nota existente'];
 const rows=p.students.map(s=>{
  const prior=existing(state,s.id,n);
  return {'Cédula':s.id,'Estudiante':s.nombre,'Carrera':s.carrera,'Modalidad':s.modalidad,
   'Núcleo':n,'Asignatura':subject,'Nota final':prior.grade??'',
   'Estado':'PENDIENTE','Nota existente':prior.grade??''};
 });
 const wb=workbook.utils.book_new();
 const sheet=workbook.utils.json_to_sheet(rows,{header:cols});
 sheet['!cols']=[{wch:16},{wch:45},{wch:36},{wch:15},{wch:10},{wch:43},{wch:14},{wch:18},{wch:18}];
 for(let i=2;i<=rows.length+1;i++){
  const cell=sheet['A'+i];if(cell){cell.t='s';cell.v=rows[i-2]['Cédula'];}
 }
 workbook.utils.book_append_sheet(wb,sheet,'CALIFICACIONES');
 const control=workbook.utils.aoa_to_sheet([
  ['CAMPO','VALOR'],['Periodo',M().PERIOD||'Octubre 2025 - Marzo 2026'],
  ['Carrera',p.key],['Nucleo',n],['Nómina',p.fingerprint],
  ['Estudiantes',p.students.length]]);
 workbook.utils.book_append_sheet(wb,control,'CONTROL');
 workbook.utils.book_append_sheet(wb,workbook.utils.aoa_to_sheet([
  ['INSTRUCCIONES',''],
  ['1','Completa solo Nota final y Estado. No cambies cédulas, nombres, carrera ni núcleo.'],
  ['2','Estado VALIDADO: nota final real entre 0 y 10, cotejada con Moodle.'],
  ['3','Estado NO CURSA: el estudiante no cursó este núcleo y la nota debe quedar vacía.'],
  ['4','Estado PENDIENTE o SIN NOTA: impide avanzar al siguiente núcleo.'],
  ['5','Las notas precargadas son referencias, no se consideran validadas automáticamente.'],
  ['6','Importa este mismo archivo en Informetit para revisar las diferencias antes de guardar.'],
  ['7','Firebase solo acepta notas verificadas de estudiantes clasificados en Complexivo.']
 ]),'INSTRUCCIONES');
 const bytes=workbook.write(wb,{bookType:'xlsx',type:'array'});
 return {bytes,filename:'Informetit_'+p.key.replace(/\s+/g,'_')+'_Nucleo_'+n+'.xlsx',step:n,total:rows.length};
}
function val(row,label){
 const key=Object.keys(row).find(k=>norm(k)===norm(label));
 return key===undefined?'':trim(row[key]);
}
function parseRows(workbook,library){
 if(!library?.utils||!workbook?.Sheets?.CONTROL||!workbook?.Sheets?.CALIFICACIONES)
  throw Error('Archivo inválido: faltan CALIFICACIONES o CONTROL de la plantilla de Informetit.');
 const meta=library.utils.sheet_to_json(workbook.Sheets.CONTROL,{header:1,defval:'',raw:false});
 const control=Object.fromEntries(meta.slice(1).map(x=>[norm(x[0]),trim(x[1])]));
 const rows=library.utils.sheet_to_json(workbook.Sheets.CALIFICACIONES,{defval:'',raw:false});
 return {control,rows};
}
function plan(state,career,workbook,library,filename){
 const p=progress(state,career);
 if(p.current===null)throw Error('La carrera ya tiene completos sus cuatro núcleos.');
 const {control,rows}=parseRows(workbook,library),n=p.current;
 if(control.PERIODO!==(M().PERIOD||'Octubre 2025 - Marzo 2026')||
  control.CARRERA!==p.key||Number(control.NUCLEO)!==n||
  control.NOMINA!==p.fingerprint||Number(control.ESTUDIANTES)!==p.students.length)
  throw Error('La plantilla no corresponde al período, carrera, nómina o núcleo actual. Descarga una nueva.');
 const byId=new Map(p.students.map(s=>[s.id,s])),seen=new Set();
 const errors=[],items=[];let validated=0,excluded=0,provisional=0,unchanged=0;
 if(rows.length!==p.students.length)errors.push('La plantilla debe contener exactamente '+p.students.length+' filas.');
 for(const row of rows){
  let id=val(row,'Cédula').replace(/\.0$/,'');
  if(/^\d{9}$/.test(id))id='0'+id;
  if(seen.has(id)){errors.push('Cédula duplicada: '+id);continue}
  seen.add(id);const st=byId.get(id);
  if(!st){errors.push('Cédula ajena a la nómina: '+id);continue}
  if(norm(val(row,'Estudiante'))!==norm(st.nombre)||
    C().canonical(val(row,'Carrera'))!==p.key||
    val(row,'Modalidad')!==st.modalidad||
    Number(val(row,'Núcleo'))!==n||
    norm(val(row,'Asignatura'))!==norm(p.catalog.nuclei[n-1].title)){
   errors.push('Identidad o asignatura modificada: '+id);continue;
  }
  const status=norm(val(row,'Estado')),raw=val(row,'Nota final');
  if(status==='PENDIENTE'||status==='SIN NOTA'||!status){
   errors.push('Registro sin cerrar: '+st.nombre);continue;
  }
  if(status==='NO CURSA'){
   if(raw){errors.push('NO CURSA requiere nota vacía: '+st.nombre);continue}
   if(existing(state,id,n).entries.length){errors.push('NO CURSA tiene una nota anterior: '+st.nombre);continue}
   items.push({studentId:id,status:'NO CURSA'});excluded++;continue;
  }
  if(status!=='VALIDADO'){errors.push('Estado no reconocido: '+st.nombre);continue}
  const score=grade(raw);
  if(score===null){errors.push('Nota inválida o ausente: '+st.nombre);continue}
  if(st.tipoTitulacion==='trabajo'){errors.push('Estudiante clasificado en Trabajo: '+st.nombre);continue}
  const prior=existing(state,id,n);
  if(prior.conflicting||prior.values.some(x=>x!==score)){
   errors.push('Diferencia de calificación por conciliar: '+st.nombre);continue;
  }
  if((state.conflictos||[]).some(c=>trim(c.id)===noteKey(id,n))){
   errors.push('Conflicto existente sin resolver: '+st.nombre);continue;
  }
  items.push({studentId:id,status:'VALIDADO',score,verified:st.tipoTitulacion==='complexivo'});
  validated++;
  if(st.tipoTitulacion!=='complexivo')provisional++;
  if(prior.entries.some(x=>x.verificado===true&&M().grade(x.nota)===score))unchanged++;
 }
 for(const s of p.students)if(!seen.has(s.id))errors.push('Falta el estudiante: '+s.nombre);
 return {career:p.key,n,filename:trim(filename),fingerprint:p.fingerprint,items,errors,
  stats:{total:p.students.length,validated,excluded,provisional,unchanged,
    blocked:errors.length},complete:errors.length===0&&items.length===p.students.length};
}
function apply(state,assessment,stamp){
 const p=progress(state,assessment.career);
 if(p.current!==assessment.n||p.fingerprint!==assessment.fingerprint)
  throw Error('El núcleo o la nómina cambió: vuelve a analizar el archivo.');
 if(!assessment.complete||assessment.errors.length)
  throw Error('Primero resuelve todos los pendientes y conflictos.');
 const next=M().migrate(state),n=p.current,subject=p.catalog.nuclei[n-1].title;
 let newRecords=0,verified=0,provisional=0,already=0;
 for(const item of assessment.items){
  if(item.status==='NO CURSA')continue;
  const st=p.students.find(x=>x.id===item.studentId);
  const k=noteKey(st.id,n),prior=existing(next,st.id,n);
  if(prior.conflicting||prior.values.some(x=>x!==item.score)||
    (next.conflictos||[]).some(x=>trim(x.id)===k))
   throw Error('Los datos cambiaron antes de guardar: '+st.nombre);
  const record={id:k,studentId:st.id,nucleo:n,curso:subject,carrera:st.carrera,
   modalidad:st.modalidad,nota:item.score,source:assessment.filename,
   fecha:stamp,verificado:item.verified,
   status:item.verified?'cotejado_en_plantilla':'provisional_por_conciliar'};
  const destination=item.verified?'notas':'notasBorrador';
  const current=next[destination].findIndex(x=>noteKey(x.studentId,x.nucleo)===k);
  if(current>=0){
   next[destination][current]={...next[destination][current],...record};
   already++;
  }else{
   next[destination].push(record);newRecords++;
  }
  if(item.verified){
   verified++;
   next.notasBorrador=next.notasBorrador.filter(x=>noteKey(x.studentId,x.nucleo)!==k);
  }else provisional++;
 }
 next.flujoNucleos=next.flujoNucleos||{};
 next.flujoNucleos[p.key]={...(next.flujoNucleos[p.key]||{}),
  [String(n)]:{completado:true,fingerprint:p.fingerprint,fecha:stamp,
   fuente:assessment.filename,validados:assessment.stats.validated,
   noCursa:assessment.stats.excluded,pendientesFirebase:provisional}};
 next.importaciones.push({nombre:assessment.filename,tipo:'plantilla_nucleo_secuencial',
  carrera:p.key,nucleo:n,filas:assessment.items.length,fecha:stamp});
 next.auditoria.push({tipo:'plantilla_nucleo_secuencial',fecha:stamp,
  carrera:p.key,nucleo:n,fuente:assessment.filename,total:assessment.items.length,
  cotejadas:verified,provisionales:provisional,noCursa:assessment.stats.excluded});
 return {next,stats:{newRecords,already,verified,provisional}};
}
const api=Object.freeze({careers,scope,progress,existing,template,parseRows,plan,apply});
root.InformetitSequentialNuclei=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
