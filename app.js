/* Informetit · Datos en el equipo del usuario. Ninguna nómina se almacena en GitHub. */
(()=>{"use strict";
const KEY="informetit-v1", PERIOD="Octubre 2025 – Marzo 2026";
const R=["Academico","Documentacion","Financiero","Practicas","Vinculacion","Seguimiento","Ingles","Datos","Titulacion"], LABEL={Academico:"Académico",Documentacion:"Documentación",Financiero:"Financiero",Practicas:"Prácticas",Vinculacion:"Vinculación",Seguimiento:"Seguimiento",Ingles:"Inglés",Datos:"Actualización de datos",Titulacion:"Titulación"};
const DATES={complexivo:[["Núcleo 1","30/03/2026","02/04/2026"],["Núcleo 2","06/04/2026","09/04/2026"],["Núcleo 3","10/04/2026","14/04/2026"],["Núcleo 4","15/04/2026","18/04/2026"],["Examen Complexivo","20/04/2026","24/04/2026"],["Supletorio","04/05/2026","04/05/2026"]],trabajo:[["Inducción","16/12/2025","16/12/2025"],["Clase Redacción eficiente de tesis","28/01/2026","28/01/2026"],["Elaboración de propuesta de temas","01/02/2026","01/02/2026"],["Aprobación del tema","02/02/2026","04/02/2026"],["Elaboración del plan de titulación","08/02/2026","08/02/2026"],["Aprobación del plan","09/02/2026","11/02/2026"],["Desarrollo del trabajo (redacción)","11/02/2026","28/02/2026"],["Borrador 1","01/03/2026","01/03/2026"],["Revisión del borrador 1","02/03/2026","05/03/2026"],["Borrador 2","08/03/2026","08/03/2026"],["Revisión del borrador 2","09/03/2026","13/03/2026"],["Ajustes finales del trabajo","14/03/2026","19/03/2026"],["Entrega de trabajo de titulación","22/03/2026","22/03/2026"],["Aprobación del tutor e informe antiplagio","23/03/2026","25/03/2026"],["Fin de clases","27/03/2026","27/03/2026"],["Preparación de defensa","25/03/2026","08/04/2026"],["Defensa de tesis","14/04/2026","15/04/2026"],["Tutoría extra de supletorio","14/04/2026","15/04/2026"],["Supletorio defensa","16/04/2026","18/04/2026"],["Cierre del proceso","20/04/2026","20/04/2026"]]};
const Data=window.InformetitDataModel,Store=window.InformetitStore;
if(!Data||!Store)throw new Error("Faltan los módulos data/model.js y data/storage.js");
const initial=()=>Data.empty();
let state=initial(), page="inicio", tab="presencial", query="", inputText="", draft="", ready=false, lastParse=null;
let reqFilter="todos",reqStatus="todos";
const $=x=>document.querySelector(x), el=id=>document.getElementById(id), h=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])), normal=Data.key, compact=s=>normal(s).replace(/\s/g,""), getNum=Data.grade, num=s=>s===null||s===undefined?"—":Number(s).toLocaleString("es-EC",{minimumFractionDigits:2,maximumFractionDigits:2}), today=()=>new Date().toISOString().slice(0,10);
function notify(t){const node=el("toast");node.textContent=t;node.style.display="block";clearTimeout(notify.timer);notify.timer=setTimeout(()=>node.style.display="none",4300)}
const sanitize=d=>Data.migrate(d);
async function load(){return Store.load()}
async function persist(){await Store.save(state)}
/*
 * Importación automática de la base GPT privada al abrir Electron.
 * Conserva todas las modificaciones que el usuario ya hizo en este equipo.
 * Las diferencias de notas pasan a conflictos; ninguna calificación se inventa.
 */
function mergePrivateGPT(seed,fingerprint) {
  if (!seed||!Array.isArray(seed.estudiantes)||!Array.isArray(seed.notas)) return null;
  if (state.gptSeedFingerprint===fingerprint) return {unchanged:true,students:0,grades:0};
  const imported=sanitize(seed),empty=!state.estudiantes.length&&!state.notas.length;
  if(empty){
    const existingConfig=state.config||{};
    state=imported;
    state.config={...state.config,...Object.fromEntries(Object.entries(existingConfig).filter(([,v])=>v&&v!=="1.0"))};
    state.gptSeedFingerprint=fingerprint;
    state.importaciones.push({nombre:"Base GPT privada (automática)",tipo:"base_gpt",filas:state.estudiantes.length,fecha:today()});
    return {initial:true,students:state.estudiantes.length,grades:state.notas.length};
  }
  const existingStudents=new Set(state.estudiantes.map(x=>String(x.id)));
  let students=0,grades=0,conflicts=0;
  for(const entry of imported.estudiantes) {
    const id=String(entry.id||"").trim();
    if(!id||existingStudents.has(id))continue;
    state.estudiantes.push(entry);existingStudents.add(id);students++;
  }
  const noteID=x=>String(x.id||((x.studentId||"")+"|"+(x.nucleo||"")));
  const existingNotes=new Map(state.notas.map(x=>[noteID(x),x]));
  const conflictKeys=new Set(state.conflictos.map(x=>String(x.id)));
  for(const note of imported.notas){
    const id=noteID(note);
    if(!note.studentId||!existingStudents.has(String(note.studentId))||!note.nucleo)continue;
    const old=existingNotes.get(id);
    if(!old){state.notas.push(note);existingNotes.set(id,note);grades++;continue}
    if(old.nota!==note.nota||JSON.stringify(old.parciales||[])!==JSON.stringify(note.parciales||[])){
      if(!conflictKeys.has(id)){
        state.conflictos.push({id,anterior:old,nuevo:note,fecha:today(),fuente:"Base GPT privada"});
        conflictKeys.add(id);conflicts++;
      }
    }
  }
  const existingEvals=new Set(state.evaluaciones.map(x=>String(x.studentId)));
  for(const e of imported.evaluaciones){if(!existingEvals.has(String(e.studentId))){state.evaluaciones.push(e);existingEvals.add(String(e.studentId))}}
  const pendingKeys=new Set((state.notasBorrador||[]).map(x=>String(x.id)));
  for(const proposed of imported.notasBorrador||[]){if(!pendingKeys.has(String(proposed.id))){state.notasBorrador.push(proposed);pendingKeys.add(String(proposed.id))}}
  const complementKeys=new Set(state.complementarios.map(x=>JSON.stringify(x.registro)));
  for(const x of imported.complementarios){const key=JSON.stringify(x.registro);if(!complementKeys.has(key)){state.complementarios.push(x);complementKeys.add(key)}}
  state.gptSeedFingerprint=fingerprint;
  state.importaciones.push({nombre:"Base GPT privada (actualizada)",tipo:"base_gpt",filas:imported.estudiantes.length,fecha:today(),incorporados:students,notasNuevas:grades,conflictosNuevos:conflicts});
  return {students,grades,conflicts};
}
async function loadPrivateGPT(){
  if(!window.informetitDesktop?.loadMasterData)return null;
  const file=await window.informetitDesktop.loadMasterData();
  if(!file?.data)return null;
  const result=mergePrivateGPT(file.data,file.fingerprint||"");
  if(result&&!result.unchanged)await persist();
  return result;
}
const typeLabel=t=>({complexivo:"Examen Complexivo",trabajo:"Trabajo de Titulación",sin_definir:"Por clasificar"})[t]||"Por clasificar";
const modeLabel=t=>t==="online"?"Online":"Presencial";
const studentSet=mode=>state.estudiantes.filter(s=>s.modalidad===mode);
const reqOk=(s,k)=>normal(s.requisitos?.[k])==="CUMPLE";
const complete=s=>R.every(k=>reqOk(s,k));
function aggregates(mode){
 const m=Data.analyze(state,mode),r=window.InformetitRequirements?.analyze(state,mode);
 const own=r?.source==='individual';
 return {students:m.students,grades:m.notes,completeN:own?r.complete9:m.complete9,
  byReq:own?r.requirements.map(x=>({k:x.key,all:x.applicable,ok:x.ok,pending:x.fail+x.unknown,pct:x.pct??0})):
   m.byReq.map(x=>({k:x.field,all:x.total,ok:x.compliant,pending:x.pending,pct:x.percent??0})),
  careers:m.careers.map(x=>x.name)};
}
function head(title,desc,tools=""){return '<div class="hero"><div><span class="eyebrow">UTET · '+h(PERIOD)+'</span><h1 class="title">'+h(title)+'</h1><p class="sub">'+h(desc)+'</p></div><div class="actions">'+tools+"</div></div>"}
const card=(title,value,foot="")=>'<div class="card"><span class="k">'+h(title)+'</span><strong class="v">'+h(value)+'</strong><span class="foot">'+h(foot)+'</span></div>';
const switcher=()=>'<div class="seg" role="group" aria-label="Modalidad"><button data-mode="presencial" class="'+(tab==="presencial"?"active":"")+'">Presencial</button><button data-mode="online" class="'+(tab==="online"?"active":"")+'">Online</button></div>';
const table=(headers,rows)=>'<div class="tablewrap"><table><thead><tr>'+headers.map(x=>"<th>"+h(x)+"</th>").join("")+'</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>';
const td=(a)=>"<td>"+h(a)+"</td>";
function statsPublic(mode){const result=window.InformetitPublicSummary?.DATA?.[mode];return result||null}
function publicStatsTable(mode){
  const d=statsPublic(mode);if(!d)return '<p class="hint">No se ha cargado ningún resumen de cohorte.</p>';
  return table(["Carrera","Estudiantes","Porcentaje"],d.carreras.map(([name,count])=>'<tr>'+td(name)+td(count)+td(num(100*count/d.total)+' %')+'</tr>'));
}
function showReportPreview(mode){
 if(!window.InformetitFullReport)throw Error("Generador del informe institucional no disponible");
 if(mode!=="presencial"&&mode!=="online")throw Error("Modalidad inválida");
 const previous=document.getElementById("report-preview-overlay");
 if(previous)previous.remove();
 const overlay=document.createElement("div");
 overlay.id="report-preview-overlay";
 overlay.className="report-preview-overlay";
 overlay.setAttribute("role","dialog");
 overlay.setAttribute("aria-modal","true");
 overlay.setAttribute("aria-label","Vista previa del informe "+mode);
 const panel=document.createElement("div");panel.className="report-preview-dialog";
 const header=document.createElement("div");header.className="report-preview-header";
 const heading=document.createElement("div");
 const title=document.createElement("strong");title.textContent="Informe de titulación · "+(mode==="online"?"Online":"Presencial");
 const note=document.createElement("small");note.textContent="Vista previa del borrador · Octubre 2025 – Marzo 2026";
 heading.append(title,note);
 const controls=document.createElement("div");controls.className="actions";
 const save=document.createElement("button");save.className="btn primary";save.type="button";save.textContent="Guardar informe en PDF";
 save.addEventListener("click",async()=>{
   save.disabled=true;
   const label=save.textContent;save.textContent="Generando PDF…";
   try{
     const result=await window.InformetitFullReport.download(state,mode);
     if(result&&!result.canceled)notify("PDF guardado: "+(result.name||"Informe de titulación")+(result.indexStatus==="paginado"?" · índice paginado":result.indexStatus==="sin_paginacion"?" · revisar números del índice":""));
   }catch(e){console.error(e);notify("No se pudo guardar el PDF: "+e.message)}
   finally{save.disabled=false;save.textContent=label}
 });
 const close=document.createElement("button");close.className="btn";close.type="button";close.textContent="Cerrar";
 close.addEventListener("click",()=>overlay.remove());
 controls.append(save,close);header.append(heading,controls);
 const frame=document.createElement("iframe");frame.className="report-preview-frame";
 frame.setAttribute("title","Documento institucional en vista previa");
 frame.setAttribute("sandbox","");
 frame.srcdoc=window.InformetitFullReport.makeReport(state,mode);
 panel.append(header,frame);overlay.append(panel);
 overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});
 document.body.append(overlay);
 close.focus();
 return true;
}
function publicDashboard(){
 const p=statsPublic('presencial'),o=statsPublic('online');
 if(!p||!o)return head("Panel general","Sin base disponible");
 return head("Panel general","Cohorte institucional desde GitHub · resumen agregado de libre consulta.")
 +'<div class="goodbox block"><b>Resumen estadístico disponible desde main.</b> Ya puedes descargar borradores con cifras verificadas. Las fichas individuales requieren que el repositorio sea privado; no publicamos nombres, cédulas ni notas individuales.</div>'
 +'<div class="cards">'+card("Registros de la cohorte",p.total+o.total,"Resumen agrupado")+card("Presencial",p.total,"Cumplen requisitos: "+p.completos9)+card("Online",o.total,"Cumplen requisitos: "+o.completos9)+card("Notas resumidas en Word",Object.values(window.InformetitNucleos?.datos||{}).flat().reduce((n,r)=>n+r[0],0),"19 núcleos · sin datos personales")+'</div>'
 +'<section class="panel"><h2>Descargar informes institucionales PDF</h2><p class="hint">Informes APA 7 con tablas, gráficos y análisis de los datos agregados. No incluyen expedientes individuales ni resultados pendientes de la fase final.</p><div class="actions"><button class="btn" data-action="preview-presencial">Vista previa presencial</button><button class="btn primary" data-action="draft-presencial">Descargar PDF presencial</button><button class="btn" data-action="preview-online">Vista previa online</button><button class="btn primary" data-action="draft-online">Descargar PDF online</button></div></section>'
 +'<div class="grid2"><section class="panel"><h2>Presencial</h2><p><b>'+p.completos8+'</b> cumplen ocho requisitos previos; <b>'+p.completos9+'</b> cumplen los nueve.</p>'+publicStatsTable('presencial')+'</section>'
 +'<section class="panel"><h2>Online</h2><p><b>'+o.completos8+'</b> cumplen ocho requisitos previos; <b>'+o.completos9+'</b> cumplen los nueve.</p>'+publicStatsTable('online')+'</section></div>'
 +'<p class="hint">Si necesitas editar las notas de cada estudiante, la matriz individual podrá añadirse al repositorio una vez que cambie a privado. Los cambios posteriores se recibirán con git pull.</p>';
}
function inicio(){if(!state.estudiantes.length&&window.InformetitPublicSummary)return publicDashboard();let p=aggregates("presencial"),o=aggregates("online");return head("Panel general","Una sola base local y dos informes institucionales.",'<button class="btn primary" data-action="backup-file">Importar respaldo privado (opcional)</button>')+(state.estudiantes.length?'':'<div class="warnbox block"><b>Base de Electron vacía.</b> Descarga el archivo privado de código base-gpt.cjs en la carpeta Descargas y reinicia Electron. La app encontrará automáticamente los 363 estudiantes y las notas. Los estudiantes y las notas no se suben al código público.</div>')+'<div class="cards">'+card("Registros totales",state.estudiantes.length,"Presencial + online")+card("Presencial",p.students.length,"Requisitos: "+p.completeN+" completos")+card("Online",o.students.length,"Requisitos: "+o.completeN+" completos")+card("Calificaciones oficiales",state.notas.length,"Estudiante × núcleo")+'</div><section class="panel"><div class="row between"><div><h2>Descargar borrador del informe</h2><p class="hint">PDF APA 7 con gráficos y datos actualmente registrados. No incluye notas faltantes ni valores estimados.</p></div><div class="actions"><button class="btn" data-action="preview-presencial">Vista previa presencial</button><button class="btn primary" data-action="draft-presencial">Descargar PDF presencial</button><button class="btn" data-action="preview-online">Vista previa online</button><button class="btn primary" data-action="draft-online">Descargar PDF online</button></div></div></section><div class="grid2"><section class="panel"><h2>Avance por modalidad</h2>'+["presencial","online"].map(m=>{let a=aggregates(m);return '<div class="block"><div class="row between"><strong>'+modeLabel(m)+'</strong><span class="tiny muted">'+a.completeN+' de '+a.students.length+' cumplen nueve requisitos</span></div><div class="progress"><div style="width:'+(a.students.length?a.completeN/a.students.length*100:0)+'%"></div></div></div>'}).join("")+'</section><section class="panel"><h2>Estado de cargas</h2><p><b>'+state.notas.length+'</b> notas de núcleos registradas · <b>'+state.evaluaciones.length+'</b> resultados de evaluación final.</p><p><b>'+state.conflictos.length+'</b> notas en conflicto · <b>'+state.sinVincular.length+'</b> notas sin identificar.</p><p class="hint">Las notas que falten seguirán pendientes. Las estimaciones nunca se presentan como resultados oficiales.</p></section></div>'+(window.InformetitPDF?window.InformetitPDF.dashboardHTML(state):'')+'<section class="panel"><h2>Información ya configurada</h2><div class="grid2"><div><p>• Cronogramas institucionales de Complexivo y Trabajo de Titulación.</p><p>• Dos informes separados por modalidad.</p></div><div><p>• Portada INF según guía institucional.</p><p>• Almacenamiento privado en el navegador con exportación a JSON.</p></div></div></section>'}
function estudiantes(){
 const Req=window.InformetitRequirements;
 if(!Req)return head("Requisitos","El motor de requisitos no está disponible.");
 const a=Req.analyze(state,tab),individual=a.source==='individual';
 const per=x=>x===null?"—":num(x)+" %";
 let out=head("Fase I · Estudiantes y requisitos",
   "Cumplimiento, verificaciones pendientes, carrera, continuidad y casos individuales.",
   switcher()+'<button data-action="student-file" class="btn primary">Importar Excel</button>');
 out+='<div class="cards">'
  +card("Estudiantes",a.total,individual?"Nómina local":"Resumen agregado")
  +card("8 requisitos completos",a.complete8,per(Req.pct(a.complete8,a.total)))
  +card("9 controles completos",a.complete9,per(Req.pct(a.complete9,a.total)))
  +card("Con requisitos por revisar",individual?a.cases.length:"Sin desglose",individual?"Personas únicas":"Se necesita la base nominal")
  +'</div>';
 out+='<section class="panel"><h2>Estado de los nueve controles</h2>'
  +'<p class="hint">Cumple, No cumple, Sin verificar y No aplica son estados distintos. Los porcentajes toman únicamente los controles aplicables. El control Titulación no es aprobación del examen.</p>'
  +table(["Requisito","Aplicables","Cumplen","No cumplen","Sin verificar","No aplica","Cumplimiento"],
    a.requirements.map(r=>'<tr>'+td(r.label)+td(r.applicable)+td(r.ok)
      +td(individual?r.fail:"—")+td(individual?r.unknown:"—")+td(individual?r.na:"—")
      +td(per(r.pct))+'</tr>'))+'</section>';
 out+='<section class="panel"><h2>Cumplimiento integral por carrera</h2>'
  +table(["Carrera","Estudiantes","8 completos","9 completos","Con incidencias previas","Sin verificar"],
    a.careers.map(c=>'<tr>'+td(c.name)+td(c.total)+td(c.complete8??"Por conciliar")
      +td(c.complete9??"Por conciliar")+td(c.affected8??"Por conciliar")
      +td(c.unverified8??"Por conciliar")+'</tr>'))+'</section>';
 if(individual){
  const heads=["Carrera","n",...Req.REQUIREMENTS.slice(0,8).map(q=>q.short)];
  out+='<section class="panel"><h2>Matriz de incidencias por carrera</h2><p class="hint">En cada casilla: incumplimientos confirmados / estados sin verificar.</p>'
    +table(heads,a.careers.map(c=>'<tr>'+td(c.name)+td(c.total)
      +c.requirementCounts.slice(0,8).map(x=>td(x.fail+" / "+x.unknown)).join("")+'</tr>'))+'</section>';
  const issues=a.cases.filter(c=>!reqFilter||reqFilter==="todos"||c.fail9.includes(reqFilter)||c.unknown9.includes(reqFilter))
    .filter(c=>reqStatus==="todos"||(reqStatus==="no_cumple"&&c.fail9.length)||(reqStatus==="sin_verificar"&&c.unknown9.length))
    .filter(c=>!query||[c.name,c.id,c.career,c.fail9.join(" "),c.unknown9.join(" ")].some(x=>normal(x).includes(normal(query))));
  const reqOptions='<option value="todos">Todos los requisitos</option>'
    +Req.REQUIREMENTS.map(x=>'<option value="'+h(x.label)+'"'+(reqFilter===x.label?' selected':'')+'>'+h(x.label)+'</option>').join("");
  const statusOptions=[["todos","Todos los estados"],["no_cumple","No cumple"],["sin_verificar","Sin verificar"]]
    .map(x=>'<option value="'+x[0]+'"'+(reqStatus===x[0]?' selected':'')+'>'+x[1]+'</option>').join("");
  out+='<section class="panel"><div class="row between"><h2>Lista de seguimiento individual</h2>'
    +'<input id="student-search" class="control" style="max-width:260px" placeholder="Nombre o cédula" value="'+h(query)+'"></div>'
    +'<div class="field-row"><label class="field">Requisito<select class="control" data-requirement-filter>'+reqOptions+'</select></label>'
    +'<label class="field">Estado<select class="control" data-status-filter>'+statusOptions+'</select></label></div>'
    +'<p class="hint">'+issues.length+' registros coinciden con los filtros. No se consideran reprobados por tener un requisito pendiente.</p>'
    +table(["Cédula","Estudiante","Carrera","No cumple","Sin verificar"],
      issues.map(c=>'<tr>'+td(c.id)+td(c.name)+td(c.career)+td(c.fail9.join("; ")||"—")
       +td(c.unknown9.join("; ")||"—")+'</tr>'))
    +'</section>';
  const visible=a.students.filter(st=>!query||[st.nombre,st.id,st.carrera].some(x=>normal(x).includes(normal(query))));
  out+='<section class="panel"><h2>Nómina y mecanismo de titulación</h2><p class="hint">Examen Complexivo por defecto. Las excepciones de Trabajo de Titulación se conservan cuando se actualiza el Excel.</p>'
    +table(["Cédula","Estudiante","Carrera","Mecanismo","Controles"],visible.map(st=>{
      const completeReq=Req.studentStatus(st).complete;
      return '<tr>'+td(st.id)+td(st.nombre)+td(st.carrera)
      +'<td><select class="control" data-student-type="'+h(st.id)+'">'
      +'<option value="complexivo"'+(st.tipoTitulacion!=="trabajo"?" selected":"")+'>Examen Complexivo</option>'
      +'<option value="trabajo"'+(st.tipoTitulacion==="trabajo"?" selected":"")+'>Trabajo de Titulación</option></select></td>'
      +'<td><span class="tag '+(completeReq?"ok":"warn")+'">'+(completeReq?"Completo":"Por revisar")+'</span></td></tr>';
    }))+'</section>';
 }else{
  out+='<section class="panel"><h2>Desglose individual pendiente</h2>'
    +'<p>La estadística agregada registra verificaciones pendientes, pero no identifica cuáles están confirmadas como NO CUMPLE o cuáles carecen de verificación. Para obtener la matriz por carrera y la lista de seguimiento se necesita la base privada local.</p></section>';
 }
 return out;
}
function grades(){if(!state.estudiantes.length&&window.InformetitPublicSummary){const d=statsPublic(tab);const agg=tab==="presencial"?window.InformetitNucleos?.datos||{}:{};const entries=Object.entries(agg).flatMap(([c,ns])=>ns.map((x,i)=>[c,"Núcleo "+(i+1),x[0],num(x[1]),num(x[2]),num(x[3])]));return head("Núcleos estructurantes","Resultados agregados transcritos del Word de trabajo. La conciliación con Moodle está pendiente.",switcher())+'<section class="panel"><h2>Calificaciones disponibles del documento de referencia</h2>'+(entries.length?table(["Carrera","Núcleo","Registros","Promedio","Mínima","Máxima"],entries.map(x=>'<tr>'+x.map(td).join("")+'</tr>')):'<p class="hint">No hay notas de núcleos disponibles para esta modalidad.</p>')+'<p class="hint">Estos promedios provienen del Word de trabajo y no reemplazan las actas ni los registros de Moodle.</p></section>'}let a=aggregates(tab),g=a.grades;let rows=a.careers.flatMap(c=>[1,2,3,4].map(n=>{let gg=g.filter(x=>x.carrera===c&&x.nucleo===n);let avg=gg.length?gg.reduce((s,x)=>s+x.nota,0)/gg.length:null;return '<tr>'+td(c)+td("Núcleo "+n)+td(gg.length)+td(num(avg))+'</tr>'}));return head("Núcleos estructurantes","Pega directamente el texto del libro de calificaciones de Moodle.",switcher())+'<section class="panel"><h2>Importación mediante copiar y pegar</h2><p class="hint">Pega el libro de calificaciones completo, incluida la cabecera «T- NUCLEO 1 ENFERMERIA». Los estudiantes se identifican primero por correo institucional y luego por coincidencia exacta de nombre. Se conserva cada componente y la nota final.</p><div class="field-row"><label class="field">Núcleo<select id="nucleo-select"><option value="auto">Detectar de la cabecera</option>'+[1,2,3,4].map(n=>'<option value="'+n+'">Núcleo '+n+'</option>').join("")+'</select></label><label class="field">Carrera<select id="career-select"><option value="auto">Detectar de cabecera</option>'+[...new Set(state.estudiantes.map(s=>s.carrera))].sort().map(c=>'<option value="'+h(c)+'">'+h(c)+'</option>').join("")+'</select></label><div class="field"><span>Origen</span><div class="tag">Moodle · pegado de notas</div></div></div><label class="field block">Texto del libro de calificaciones<textarea id="moodle-text" placeholder="Pega aquí los nombres, correos, parciales, taller y total del curso...">'+h(inputText)+'</textarea></label><div class="actions"><button class="btn" data-action="preview-notes">Analizar pegado</button><button class="btn primary" data-action="save-notes">Guardar notas verificadas</button></div><div id="notes-feedback" class="block">'+(lastParse?previewParsed(lastParse):"")+'</div></section><section class="panel"><h2>Resultados por carrera · '+modeLabel(tab)+'</h2>'+table(["Carrera","Núcleo","Registros","Promedio observado"],rows)+'</section><section class="panel"><h2>Calificaciones registradas</h2>'+table(["Estudiante","Carrera","Núcleo","Parciales / taller","Nota final","Fuente"],g.slice().sort((x,y)=>x.carrera.localeCompare(y.carrera)||x.nucleo-y.nucleo).map(x=>'<tr>'+td((state.estudiantes.find(s=>s.id===x.studentId)||{}).nombre||x.studentId)+td(x.carrera)+td("N"+x.nucleo)+td((x.parciales||[]).map(num).join(" / "))+td(num(x.nota))+td(x.source||"Moodle")+'</tr>'))+'</section>'}
function parseMoodle(raw){let head=raw.match(/N[ÚU]CLEO\s*([1-4])\s+([^\[\r\n]+)/i),nucleo=head?Number(head[1]):null,career=head?head[2].trim():"";let lines=raw.replace(/\r/g,"").split("\n").map(x=>x.trim()).filter(Boolean),emails=[],regex=/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;for(let i=0;i<lines.length;i++)if(regex.test(lines[i]))emails.push(i);let records=[],warnings=[];for(let x=0;x<emails.length;x++){let i=emails[x],name="";for(let j=i-1;j>=Math.max(0,i-4);j--){let candidate=lines[j].replace(/Matriculaci[oó]n de usuarios suspendida/gi,"").trim();if(candidate.length>8&&!regex.test(candidate)&&candidate!=="Ocultar"){name=candidate;break}}let stop=x+1<emails.length?emails[x+1]-1:lines.length,numbers=[];for(let k=i+1;k<stop;k++){if(/^Promedio general/i.test(lines[k]))break;let z=getNum(lines[k]);if(z!==null)numbers.push(z)}if(numbers.length<6){warnings.push("Registro incompleto: "+lines[i]);continue}if(numbers.length>6)warnings.push("Más de seis números en "+lines[i]+"; verifica la estructura.");records.push({nombre:name,email:lines[i].toLowerCase(),parciales:numbers.slice(0,5),nota:numbers[5]})}return {nucleo,career,records,warnings}}
function resolveParsed(parsed){let options=state.estudiantes;let resolved=parsed.records.map(r=>{let matches=options.filter(s=>s.correo&&s.correo.toLowerCase()===r.email);if(!matches.length){let candidate=normal(r.nombre).split(" ").sort().join(" ");matches=options.filter(s=>normal(s.nombre).split(" ").sort().join(" ")===candidate)}return {...r,matched:matches.length===1?matches[0]:null,ambiguous:matches.length>1}});return resolved}
function previewParsed(parsed){let resolved=resolveParsed(parsed),ok=resolved.filter(r=>r.matched);return '<div class="kpis"><span class="tag ok">Detectados '+parsed.records.length+'</span><span class="tag ok">Vinculados '+ok.length+'</span><span class="tag warn">No vinculados '+(resolved.length-ok.length)+'</span></div>'+(parsed.warnings.length?'<div class="warnbox">'+parsed.warnings.map(h).join("; ")+'</div>':"")+table(["Estudiante Moodle","Correo","Nota final","Modalidad encontrada"],resolved.map(r=>'<tr>'+td(r.nombre)+td(r.email)+td(num(r.nota))+td(r.matched?modeLabel(r.matched.modalidad)+" · "+r.matched.carrera:"Pendiente de conciliar")+'</tr>'))}
function evaluations(){let a=aggregates(tab),exam=a.students.filter(s=>s.tipoTitulacion!=="sin_definir"),records=state.evaluaciones.filter(e=>a.students.some(s=>s.id===e.studentId));return head("Evaluaciones finales","Registra resultados respaldados, sin inventar calificaciones.",switcher())+'<section class="panel"><h2>Registrar o actualizar evaluación</h2><div class="field-row"><label class="field">Estudiante<select id="eval-id"><option value="">Selecciona estudiante</option>'+exam.map(s=>'<option value="'+h(s.id)+'">'+h(s.nombre)+' · '+h(typeLabel(s.tipoTitulacion))+'</option>').join("")+'</select></label><label class="field">Calificación del componente 1<input id="eval-one" type="number" min="0" max="10" step="0.01" placeholder="Teoría / escrito"></label><label class="field">Calificación del componente 2<input id="eval-two" type="number" min="0" max="10" step="0.01" placeholder="Práctica / defensa"></label><label class="field">Supletorio<input id="eval-rescue" type="number" min="0" max="10" step="0.01" placeholder="Si aplica"></label><label class="field">Resultado oficial<select id="eval-status"><option value="pendiente">Pendiente</option><option value="aprobado">Aprobado</option><option value="reprobado">Reprobado</option><option value="no_presentado">No presentado</option></select></label><label class="field">Referencia del acta<input id="eval-source" placeholder="Acta / evidencia"></label></div><div class="actions block"><button class="btn primary" data-action="save-eval">Guardar evaluación</button></div><p class="hint">No se calcula la nota final automáticamente hasta confirmar las ponderaciones normativas. El estado se registra desde el acta oficial.</p></section><section class="panel"><h2>Evaluaciones guardadas · '+modeLabel(tab)+'</h2>'+table(["Estudiante","Componente 1","Componente 2","Supletorio","Estado","Evidencia"],records.map(e=>'<tr>'+td((state.estudiantes.find(s=>s.id===e.studentId)||{}).nombre)+td(num(e.one))+td(num(e.two))+td(num(e.rescue))+td(e.status)+td(e.source)+'</tr>'))+'</section>'}
function schedule(){return head("Cronogramas institucionales","Fechas planificadas cargadas una sola vez para el período.")+['trabajo','complexivo'].map(k=>'<section class="panel"><h2>'+(k==="trabajo"?"Trabajo de Titulación":"Examen Complexivo")+'</h2>'+table(["Actividad","Inicio","Fin","Ejecución verificada"],DATES[k].map((r,i)=>'<tr>'+td(r[0])+td(r[1])+td(r[2])+'<td><select class="control" data-schedule="'+h(k+"|"+i)+'">'+[['pendiente','Pendiente de evidencias'],['cumple','Cumplida'],['no_cumple','No cumplida'],['no_aplica','No aplica']].map(([v,l])=>'<option value="'+v+'"'+((state.ejecucion[k+"|"+i]||"pendiente")===v?" selected":"")+'>'+l+'</option>').join("")+'</select></td></tr>'))+'</section>').join("")+'<p class="hint">Las fechas programadas no constituyen evidencia de actividades realizadas; registra el estado real por separado.</p>'}
function reportBody(m,exportMode=false){let a=aggregates(m);let members=new Map(a.students.map(s=>[s.id,s]));let grades=a.grades, evals=state.evaluaciones.filter(e=>members.has(e.studentId)),nCompletes=a.completeN;let title="Informe Final del Proceso de Titulación — "+modeLabel(m)+" — "+PERIOD;
let sections='<div class="report-paper"><h1>'+h(title)+'</h1><p><b>Unidad de Titulación y Eficiencia Terminal</b> · ITSQMET</p><p>Elaborado por: '+h(state.config.elaborado)+' | Revisado por: '+h(state.config.revisado)+' | Aprobado por: '+h(state.config.aprobado)+'</p><p><b>Código:</b> '+h(m==="online"?state.config.codigoOnline:state.config.codigoPresencial||"Pendiente de asignación")+' · <b>Versión:</b> '+h(state.config.version||"1.0")+'</p><h2>1. Caracterización y requisitos</h2><p>La modalidad '+(m==="online"?"online":"presencial")+' registra '+a.students.length+' estudiantes en el archivo institucional del período. De ellos, '+nCompletes+' cumplen los nueve requisitos registrados ('+(a.students.length?num(nCompletes/a.students.length*100):"—")+' %). Estas cifras son datos de cumplimiento y no deben interpretarse como aprobación académica del Examen Complexivo.</p>'+table(["Requisito","Aplicables","Cumplen","Pendientes","Porcentaje"],a.byReq.map(x=>"<tr>"+td(LABEL[x.k])+td(x.all)+td(x.ok)+td(x.pending)+td(num(x.pct)+" %")+"</tr>"))+'<h2>2. Núcleos estructurantes</h2>';
for(const c of a.careers){let carrGrades=grades.filter(g=>g.carrera===c);sections+='<h3>'+h(c)+'</h3>'+table(["Núcleo","Notas registradas","Promedio comprobado"],[1,2,3,4].map(n=>{let arr=carrGrades.filter(g=>g.nucleo===n);return "<tr>"+td("Núcleo "+n)+td(arr.length)+td(arr.length?num(arr.reduce((x,g)=>x+g.nota,0)/arr.length):"Pendiente")+"</tr>"}))+'<p>Resultados descriptivos calculados solamente con las '+carrGrades.length+' notas del registro disponible para esta carrera. Las notas faltantes no se reemplazan por estimaciones.</p>'}
sections+='<h2>3. Evaluación final</h2><p>Evaluaciones registradas: '+evals.length+'; aprobados: '+evals.filter(e=>e.status==="aprobado").length+'; reprobados: '+evals.filter(e=>e.status==="reprobado").length+'. Los casos pendientes no equivalen a reprobación.</p><h2>4. Validación y asuntos pendientes</h2><p>Estudiantes sin clasificación de modalidad de titulación: '+a.students.filter(s=>s.tipoTitulacion==="sin_definir").length+'. Calificaciones en conflicto: '+state.conflictos.filter(x=>members.has(x.anterior?.studentId)).length+'. Conclusiones y recomendaciones institucionales sujetas a validación y evidencias completas.</p><p><b>Informe de trabajo:</b> se genera únicamente a partir de la información actualmente incorporada. No constituye acta de aprobación.</p></div>';
return exportMode?sections:'<section class="panel">'+sections+'</section>'}
function reports(){
 const d=window.InformetitFullReport?.getData(state,tab),hasPrivate=state.estudiantes.some(s=>s.modalidad===tab);
 const req=window.InformetitRequirements?.analyze(state,tab);
 const documentPending=window.InformetitDocument?.pending(state,tab)||[];
 if(!d)return head("Informe institucional","No se encontró la cohorte.");
 const validNuclei=d.careers.flatMap(c=>[1,2,3,4].map(k=>d.N(c.name,k)));
 const provisionalCount=validNuclei.filter(g=>g.n>0&&g.provisional).length;
 const officialCount=validNuclei.filter(g=>g.n>0&&!g.provisional).length;
 const pendingCount=validNuclei.filter(g=>!g.n).length;
 const inconsistent=(state.conflictos||[]).length+(state.sinVincular||[]).length;
 const qaRows=[
  ["Base nominal de estudiantes",req?.source==='aggregate'?"Solo resumen agregado; casos individuales no disponibles":d.fullRoster?"Nómina local completa: cálculos individuales":"Nómina local parcial: falta conciliar la cobertura"], 
  ["Fase I · requisitos",req?req.complete8+" cumplen 8 requisitos · "+req.complete9+" cumplen 9 controles · "+(req.source==='individual'?req.checks.fail+" incumplimientos confirmados y "+req.checks.unknown+" sin verificar":req.checks.unclassified+" verificaciones no clasificadas"):"Sin información"],
  ["Calificaciones de núcleos",officialCount+" núcleos sin transcripción provisional · "+provisionalCount+" provisionales · "+pendingCount+" sin notas"],
  ["Conflictos y registros sin vincular",inconsistent+" incidencias por revisar antes de aprobación"],
  ["Evaluaciones y defensas",d.finals.length+" resultados ingresados; verificar actas y universo de convocados"],
  ["Control documental INF",documentPending.length?documentPending.join("; "):"Campos documentales marcados como verificados"],
  ["Estado de emisión","BORRADOR · No apto para cierre institucional sin validar evidencias"]
 ];
 const coverage=d.careers.reduce((v,c)=>v+[1,2,3,4].filter(k=>d.N(c.name,k).n>0).length,0);
 const notes=d.careers.reduce((v,c)=>v+[1,2,3,4].reduce((x,k)=>x+d.N(c.name,k).n,0),0);
 let out=head("Informe institucional · "+modeLabel(tab),"Borrador por fases y carreras, con tablas y gráficos APA 7.",switcher()+'<button class="btn" data-action="preview-current">Vista previa</button><button class="btn primary" data-action="print">Descargar PDF completo</button>');
 out+='<div class="cards">'+card("Estudiantes",d.total)+card("Requisitos completos",d.completos9,num(100*d.completos9/d.total)+" %")+card("Núcleos con datos",coverage+" / "+(d.careers.length*4),"Registros provenientes del Word: "+state.notasBorrador.length)+card("Resultados finales",d.finals.length,"Actas registradas")+'</div>';
 out+='<section class="panel"><h2>Control de calidad antes de emitir el PDF</h2>'+table(["Control","Resultado"],qaRows.map(row=>'<tr>'+row.map(td).join("")+'</tr>'))+'<p class="hint">Los conflictos, las notas provisionales y las actas faltantes se muestran como pendientes. La descarga es un borrador hasta validar esas fuentes.</p></section>';
 out+='<section class="panel"><h2>Avance del informe</h2><div class="goodbox">Se incluyen introducción, metodología, objetivos, referencia normativa por validar, cronogramas, Fase I desarrollada con controles de verificación, estructura de núcleos por carrera, ruta de Trabajo de Titulación, fase evaluativa, recomendaciones y referencias.</div><p class="hint">Las notas ausentes y los resultados sin actas no se rellenan con estimaciones.</p><div class="actions"><button class="btn" data-action="preview-current">Vista previa del informe</button><button class="btn primary" data-action="print">Descargar PDF de esta modalidad</button><button class="btn" data-action="draft-presencial">PDF presencial</button><button class="btn" data-action="draft-online">PDF online</button></div></section>';
 out+='<section class="panel"><h2>Control de notas por carrera y núcleo</h2><p class="hint">Se conservan por separado las calificaciones oficiales y las extraídas del Word de trabajo. Las del Word se conservan como fuente aceptada para la cohorte; cualquier discrepancia con Moodle se identifica para revisión.</p>'+table(["Carrera","Núcleo 1","Núcleo 2","Núcleo 3","Núcleo 4"],d.careers.map(c=>'<tr>'+td(c.name)+[1,2,3,4].map(k=>{const g=d.N(c.name,k);return '<td><span class="tag '+(g.n?"ok":"warn")+'">'+(g.n?g.n+" notas · "+num(g.mean):"Pendiente")+'</span></td>'}).join("")+'</tr>'))+'<p class="hint">'+notes+' calificaciones registradas como datos individuales o resúmenes agregados. Los núcleos sin datos quedan pendientes, no reprobados.</p></section>';
 out+='<section class="panel"><h2>Control documental · estándar INF</h2><p class="hint">Portada A4 1,5 cm; encabezado INF, bloque de firmas, numeración automática y cuerpo APA 7.</p><div class="field-row"><label class="field">Código presencial<input data-config="codigoPresencial" value="'+h(state.config.codigoPresencial)+'"></label><label class="field">Código online<input data-config="codigoOnline" value="'+h(state.config.codigoOnline)+'"></label><label class="field">Versión<input data-config="version" value="'+h(state.config.version)+'"></label><label class="field">Fecha<input type="date" data-config="fechaElaboracion" value="'+h(state.config.fechaElaboracion)+'"></label></div><div class="actions block"><button class="btn" data-action="logo-file">Cargar logotipo para portada</button></div><div class="field-row"><label class="field"><input type="checkbox" data-config="marcoLegalValidado" '+(state.config.marcoLegalValidado?"checked":"")+'> He verificado el marco normativo vigente.</label><label class="field"><input type="checkbox" data-config="firmasValidadas" '+(state.config.firmasValidadas?"checked":"")+'> He revisado responsables y espacio de firmas; esto no firma el PDF.</label></div><p class="hint">Pendientes: '+(documentPending.length?documentPending.map(h).join("; "):"Ninguno declarado")+'. Las actas se validan por separado.</p></section>';
 out+='<section class="panel"><h2>Fuentes que faltan para cerrar el informe</h2><p>Calificaciones de Moodle por carrera y núcleo; actas de examen y defensa; resultados de supletorio; evidencia de cumplimiento del cronograma y, cuando corresponda, estudiantes retirados online.</p></section>';
 if(!hasPrivate)out+='<div class="warnbox block">La rama pública contiene estadísticas agregadas, no expedientes individuales. Las notas personales deben manejarse en una base privada.</div>';
 return out;
}
function data(){
const quality=Data.audit(state),p=Data.analyze(state,"presencial"),o=Data.analyze(state,"online");
const problems=quality.issues.length?quality.issues.slice(0,30).map(x=>'<tr>'+td(x.type.replace(/_/g," "))+td(x.student)+'</tr>'):['<tr><td colspan="2">No hay incidencias de integridad detectadas.</td></tr>'];
return head("Base maestra local","Bloque 01 · Persistencia, integridad y cálculos unificados.")
+'<section class="panel"><h2>Estado de la base maestra</h2>'
+'<div class="cards">'+card("Versión de estructura",state.version||Data.SCHEMA_VERSION)+card("Presencial",p.total)+card("Online",o.total)+card("Incidencias",quality.issues.length)+'</div>'
+'<p class="hint">Origen de los cálculos: datos individuales locales. Si la nómina privada no está instalada, la app conserva solo el resumen institucional agregado por separado.</p>'
+table(["Control","Registro"],problems)+'</section>'
+head("Datos y respaldo","Importación manual opcional y copia de seguridad.")+'<div class="grid2"><section class="panel"><h2>Importar</h2><p>Importa la base maestra JSON preparada desde ChatGPT o el archivo institucional original XLS/HTML/XLSX.</p><div class="actions"><button class="btn primary" data-action="backup-file">Importar JSON maestro</button><button class="btn" data-action="student-file">Importar Excel de estudiantes</button></div><p class="hint">La importación de JSON reemplaza la base local previa. Descarga antes una copia de seguridad si ya has registrado cambios.</p></section><section class="panel"><h2>Exportar respaldo</h2><p>Descarga estudiantes, notas, resultados, cronogramas verificados, observaciones y conflictos. Podrás compartir este JSON en el chat para que prepare una versión actualizada.</p><div class="actions"><button class="btn primary" data-action="export-json">Descargar JSON</button><button class="btn danger" data-action="clear-db">Vaciar base local</button></div></section></div><section class="panel"><h2>Estado de la base</h2><div class="cards">'+card("Estudiantes",state.estudiantes.length)+card("Notas de núcleos",state.notas.length)+card("Conflictos",state.conflictos.length)+card("Sin vincular",state.sinVincular.length)+'</div><h3>Importaciones</h3>'+table(["Fuente","Tipo","Filas","Fecha"],state.importaciones.map(i=>'<tr>'+td(i.nombre)+td(i.tipo)+td(i.filas)+td(i.fecha)+'</tr>'))+'<h3>Complementarios pendientes de conciliar</h3>'+table(["Fuente","Registro","Estado"],state.complementarios.map(x=>'<tr>'+td(x.fuente)+td(x.registro?.Nombre||x.registro?.nombre||"Sin nombre")+td(x.estado||"Por conciliar")+'</tr>'))+'<h3>Notas en conflicto</h3>'+table(["Estudiante","Núcleo","Actual","Nueva"],state.conflictos.map((c,i)=>'<tr>'+td(c.id?.split("|")[0])+td(c.nuevo?.nucleo)+td(num(c.anterior?.nota))+td(num(c.nuevo?.nota))+'<td><button class="btn small" data-use-conflict="'+i+'">Usar nueva</button></td></tr>'))+'</section><section class="panel"><h2>Privacidad y límites</h2><p class="privacy">Los datos se guardan en IndexedDB (o localStorage de respaldo) de este navegador, no en GitHub. Borrar datos del navegador puede eliminarlos. Descarga copias JSON y almacénalas en un lugar privado. ChatGPT no puede modificar directamente el contenido guardado dentro de tu navegador: para aplicar cambios realizados aquí, importa el archivo JSON actualizado.</p></section>'}
const views={inicio,estudiantes,nucleos:grades,evaluaciones:evaluations,cronogramas:schedule,informes:reports,datos:data};
function draw(){el("main").innerHTML=views[page]();document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));}
function download(name,type,content){let blob=new Blob([content],{type}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
function joinGrade(p,n,c){let linked=resolveParsed(p);let additions=0,duplicate=0,conflict=0,unmatched=0;for(let r of linked){if(!r.matched){state.sinVincular.push({tipo:"nota_moodle",nucleo:n,carrera:c,registro:r,fecha:today()});unmatched++;continue}let g={id:r.matched.id+"|"+n,studentId:r.matched.id,email:r.email,carrera:r.matched.carrera,modalidad:r.matched.modalidad,nucleo:n,parciales:r.parciales,nota:r.nota,source:p.career||c||"Texto Moodle",status:"oficial_registro_moodle",fecha:today()};let old=state.notas.find(x=>x.id===g.id);if(old){if(old.nota===g.nota&&JSON.stringify(old.parciales)===JSON.stringify(g.parciales)){duplicate++}else{state.conflictos.push({id:g.id,anterior:old,nuevo:g,fecha:today()});conflict++}}else{state.notas.push(g);additions++}}return {additions,duplicate,conflict,unmatched}}
function parseGradeAndSave(save){inputText=el("moodle-text").value;let parsed=parseMoodle(inputText),n=el("nucleo-select").value==="auto"?parsed.nucleo:Number(el("nucleo-select").value),c=el("career-select").value==="auto"?parsed.career:el("career-select").value;if(!n){notify("Selecciona el núcleo o incluye el nombre NUCLEO 1 en el encabezado.");return}if(!parsed.records.length){notify("No encontré bloques con correo y seis notas; revisa el texto pegado.");return}lastParse=parsed;if(save){let result=joinGrade(parsed,n,c);state.importaciones.push({nombre:c+" – Núcleo "+n,tipo:"moodle",filas:parsed.records.length,fecha:today()});persist();inputText="";lastParse=null;draw();notify("Guardadas "+result.additions+" notas; duplicadas "+result.duplicate+", conflictos "+result.conflict+", sin vincular "+result.unmatched)}else{el("notes-feedback").innerHTML=previewParsed(parsed);notify(parsed.records.length+" registros detectados, aún sin guardar.")}}
function parseRows(rows){let header=rows[0]?.map(compact)||[],field=(r,...keys)=>{for(let k of keys){let j=header.indexOf(compact(k));if(j>=0)return String(r[j]??"").trim()}return ""},result=[];if(!header.includes("NUMEROIDENTIFICACION"))throw Error("Falta la columna numeroIdentificacion.");for(let r of rows.slice(1)){let id=field(r,"numeroIdentificacion");if(!id)continue;let original=field(r,"NombreCarrera"),code=field(r,"CodigoCarrera"),mode=normal(original).endsWith("ONLINE")?"online":/-L-/i.test(code)?"online":"presencial",req={};let aliases={Practicas:["PrácticasVinculacion","PracticasVinculacion","Practicas"],Seguimiento:["SeguimientoGraduados","Seguimiento"],Datos:["ActualizaciónDatos","ActualizacionDatos","Datos"],Ingles:["Ingles","Inglés"]};for(let k of R)req[k]=field(r,...(aliases[k]||[k]));result.push({id,nombre:field(r,"Nombres"),codigo:code,carrera:original.replace(/\s+ONLINE\s*$/i,"").trim(),modalidad:mode,horario:field(r,"HorarioComplexivo"),sede:field(r,"Sede"),correo:field(r,"CorreoInstitucional").toLowerCase(),correoPersonal:field(r,"CorreoPersonal"),telefono:field(r,"Celular"),requisitos:req,aprobacionTitulacion:field(r,"AprobacionTitulacion"),aprobacionComplexivoProyecto:field(r,"AprobacionComplexivoProyecto"),tipoTitulacion:"complexivo"})}if(!result.length)throw Error("No hay filas con cédula.");return result}
function parseHTML(txt){let doc=new DOMParser().parseFromString(txt,"text/html"),table=doc.querySelector("table");if(!table)throw Error("El archivo HTML no tiene tablas.");return [...table.querySelectorAll("tr")].map(tr=>[...tr.querySelectorAll("td,th")].map(td=>td.textContent.trim()))}
async function readExcel(file){let bytes=await file.arrayBuffer(),prefix=new TextDecoder("latin1").decode(bytes.slice(0,400));if(/<table|<!doctype|<html|<style/i.test(prefix)){let html=new TextDecoder("windows-1252").decode(bytes);return parseRows(parseHTML(html))}if(file.name.toLowerCase().endsWith(".csv")){if(!window.XLSX)throw Error("Conecta Internet para importar CSV o pega directamente un JSON.");let x=XLSX.read(bytes,{type:"array"});return parseRows(XLSX.utils.sheet_to_json(x.Sheets[x.SheetNames[0]],{header:1,defval:"",raw:false}))}if(!window.XLSX)throw Error("No se ha cargado la biblioteca de Excel; comprueba la conexión.");let wb=XLSX.read(bytes,{type:"array"});for(let sh of wb.SheetNames){let rows=XLSX.utils.sheet_to_json(wb.Sheets[sh],{header:1,defval:"",raw:false});if(rows[0]&&rows[0].some(x=>compact(x)==="NUMEROIDENTIFICACION"))return parseRows(rows)}throw Error("No se encontró una hoja con numeroIdentificacion.")}
async function handleFiles(ev){
 const file=ev.target.files?.[0];if(!file)return;
 try{
  let candidate,caption;
  if(ev.target.id==="backup-file"){
   const obj=JSON.parse(await file.text());
   if(!obj||!Array.isArray(obj.estudiantes)||!Array.isArray(obj.notas))
     throw Error("Este respaldo JSON no tiene la estructura de Informetit.");
   if(state.estudiantes.length&&!confirm("¿Reemplazar toda la base local? Descarga antes un respaldo si ya tienes notas o correcciones."))return;
   candidate=Data.migrate(obj);
   caption="Respaldo cargado: "+candidate.estudiantes.length+" estudiantes y "+candidate.notas.length+" notas.";
  }else{
   const rows=await readExcel(file),seen=new Set();
   for(const x of rows){
    if(seen.has(x.id))throw Error("El archivo contiene cédulas repetidas. Corrige la nómina antes de importarla.");
    seen.add(x.id);
   }
   const previous=new Map(state.estudiantes.map(s=>[s.id,s]));
   for(const x of rows){
    const old=previous.get(x.id);
    if(old) {
     // Conservar decisiones manuales de titulación y campos de seguimiento.
     previous.set(x.id,{...old,...x,
       tipoTitulacion:old.tipoTitulacion==="trabajo"?"trabajo":"complexivo",
       observaciones:old.observaciones??x.observaciones});
    }else previous.set(x.id,Data.normalizeStudent(x));
   }
   candidate=Data.migrate({...state,estudiantes:[...previous.values()],
      importaciones:[...state.importaciones,{nombre:file.name,tipo:"estudiantes",filas:rows.length,fecha:today()}]});
   caption="Excel incorporado: "+rows.length+" estudiantes. Se conservaron notas y clasificaciones anteriores.";
  }
  const problems=Data.audit(candidate).issues.filter(p=>["id_vacio","cedula_repetida"].includes(p.type));
  if(problems.length)throw Error("Se detectaron "+problems.length+" identificaciones vacías o duplicadas. No se modificó la base.");
  // Primero se confirma el guardado; luego se cambia el estado visible.
  await Store.save(candidate);
  state=candidate;draw();notify(caption);
 }catch(e){console.error(e);notify("Error de importación: "+e.message)}
 finally{ev.target.value=""}
}
async function action(code){switch(code){case"student-file":el("student-file").click();break;case"logo-file":el("logo-file").click();break;case"backup-file":el("backup-file").click();break;case"preview-notes":parseGradeAndSave(false);break;case"save-notes":parseGradeAndSave(true);break;case"export-json":download("Informetit_base_local_"+today()+".json","application/json;charset=utf-8",JSON.stringify(state,null,2));break;case"clear-db":if(confirm("¿Eliminar todas las notas, estudiantes y demás datos almacenados en ESTE navegador? Asegúrate de haber exportado un respaldo.")){state=initial();await persist();draw();notify("Base local vaciada")}break;case"save-eval":{let id=el("eval-id").value;if(!id){notify("Selecciona primero un estudiante clasificado.");break}let student=state.estudiantes.find(s=>s.id===id);let e={studentId:id,tipo:student.tipoTitulacion,one:getNum(el("eval-one").value),two:getNum(el("eval-two").value),rescue:getNum(el("eval-rescue").value),status:el("eval-status").value,source:el("eval-source").value,updated:today()};let i=state.evaluaciones.findIndex(x=>x.studentId===id);if(i<0)state.evaluaciones.push(e);else state.evaluaciones[i]=e;await persist();draw();notify("Resultado registrado.")}break;case"doc":download("Informe_"+tab+"_"+today()+".doc","application/msword;charset=utf-8",'<html><head><meta charset="utf-8"><style>body{font-family:Arial}table{border-collapse:collapse;width:100%}td,th{border:1px solid #777;padding:6px}h1{text-align:center;font-size:18pt}h2{font-size:14pt}</style></head><body>'+reportBody(tab,true)+'</body></html>');break;case"pdf":if(window.InformetitFullReport){try{await window.InformetitFullReport.download(state,tab)}catch(e){notify("No se pudo generar PDF: "+e.message)}}else notify("Informe institucional no disponible.");break;case"preview-current":case"preview-presencial":case"preview-online":{const m=code==="preview-current"?tab:code==="preview-online"?"online":"presencial";try{showReportPreview(m)}catch(e){notify("No se pudo abrir la vista previa: "+e.message)}break}case"draft-presencial":case"draft-online":{const mode=code==="draft-online"?"online":"presencial";if(window.InformetitFullReport){try{const result=await window.InformetitFullReport.download(state,mode);if(result&&!result.canceled)notify("Borrador institucional guardado en PDF.");}catch(err){notify("Error al generar el informe: "+err.message);console.error(err)}}else notify("Generador institucional no disponible.");break}case"print":if(window.InformetitFullReport){try{await window.InformetitFullReport.download(state,tab)}catch(e){notify("No se pudo generar PDF: "+e.message)}}else notify("Informe institucional no disponible.");break;}}
document.addEventListener("click",async ev=>{let nav=ev.target.closest("[data-page]");if(nav){page=nav.dataset.page;query="";lastParse=null;draw();return}let m=ev.target.closest("[data-mode]");if(m){tab=m.dataset.mode;draw();return}let cmd=ev.target.closest("[data-action]");if(cmd){await action(cmd.dataset.action);return}let conflict=ev.target.closest("[data-use-conflict]");if(conflict){let i=+conflict.dataset.useConflict,c=state.conflictos[i];if(!c)return;if(confirm("¿Reemplazar la nota existente por la nueva versión? Comprueba antes la fuente.")){state.notas=state.notas.filter(x=>x.id!==c.id);state.notas.push(c.nuevo);state.conflictos.splice(i,1);await persist();draw();notify("Conflicto resuelto.")}}});
document.addEventListener("input",ev=>{if(ev.target.id==="student-search"){query=ev.target.value;let pos=ev.target.selectionStart;draw();let search=el("student-search");search.focus();search.setSelectionRange(pos,pos)}if(ev.target.id==="moodle-text")inputText=ev.target.value});
document.addEventListener("change",async ev=>{let field=ev.target;if(field.dataset.studentType){let s=state.estudiantes.find(x=>x.id===field.dataset.studentType);if(s){s.tipoTitulacion=field.value;await persist();notify("Modalidad de titulación actualizada.")}}else if(field.hasAttribute("data-requirement-filter")){reqFilter=field.value;draw()}else if(field.hasAttribute("data-status-filter")){reqStatus=field.value;draw()}else if(field.dataset.schedule){state.ejecucion[field.dataset.schedule]=field.value;await persist();notify("Ejecución registrada.")}else if(field.dataset.config){state.config[field.dataset.config]=field.type==="checkbox"?field.checked:field.value;await persist();draw()}});
el("student-file").addEventListener("change",handleFiles);el("backup-file").addEventListener("change",handleFiles);
el("logo-file").addEventListener("change",async ev=>{const file=ev.target.files?.[0];if(!file)return;try{if(!file.type.startsWith("image/"))throw Error("Solo se aceptan imágenes.");if(file.size>2000000)throw Error("La imagen debe tener menos de 2 MB.");const dataURL=await new Promise((res,rej)=>{let fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(new Error("No se pudo leer imagen."));fr.readAsDataURL(file)});state.config.logoDataUrl=dataURL;await persist();notify("Logotipo incorporado a los PDF.");}catch(e){notify(e.message)}finally{ev.target.value=""}});
(async()=>{state=await load();try{const imported=await loadPrivateGPT();if(imported&&!imported.unchanged){console.info("Base GPT privada disponible:",imported.students,"estudiantes nuevos,",imported.grades,"notas nuevas.")}}catch(e){console.error("No se pudo cargar la base GPT privada:",e);notify("No se pudo cargar la base GPT local: "+e.message)}ready=true;draw()})().catch(e=>{el("main").textContent="No fue posible iniciar Informetit: "+e.message});
})();
