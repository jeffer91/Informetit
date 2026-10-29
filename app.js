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
let nucleusCareerKey="";
let evaluationStudentId="";
let trabajoStudentId="";
let examImportText="",examImportStage=null;
let firebaseComparison=null,firebaseConnection=null,firebaseMessage="";
const $=x=>document.querySelector(x), el=id=>document.getElementById(id), h=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])), normal=Data.key, compact=s=>normal(s).replace(/\s/g,""), getNum=Data.grade, num=s=>s===null||s===undefined?"—":Number(s).toLocaleString("es-EC",{minimumFractionDigits:2,maximumFractionDigits:2}), today=()=>new Date().toISOString().slice(0,10);
function notify(t){const node=el("toast");node.textContent=t;node.style.display="block";clearTimeout(notify.timer);notify.timer=setTimeout(()=>node.style.display="none",4300)}
function notifyPdfResult(result){
 if(!result||result.canceled)return;
 const status=result.indexStatus;
 notify('PDF guardado: '+(result.name||'Informe de titulación')+
   (status==='paginado_verificado'?' · índice con paginación verificada':
    status?' · índice sin validar ('+status+')':' · comprueba la paginación'));
}

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
     notifyPdfResult(result);
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
 +'<div class="goodbox block"><b>Resumen estadístico disponible desde main.</b> Puedes generar borradores con los agregados del período; verifica las fuentes antes del cierre. Las fichas individuales requieren que el repositorio sea privado; no publicamos nombres, cédulas ni notas individuales.</div>'
 +'<div class="cards">'+card("Registros de la cohorte",p.total+o.total,"Resumen agrupado")+card("Presencial",p.total,"Cumplen requisitos: "+p.completos9)+card("Online",o.total,"Cumplen requisitos: "+o.completos9)+card("Notas resumidas en Word",Object.values(window.InformetitNucleos?.datos||{}).flat().reduce((n,r)=>n+r[0],0),"19 núcleos · sin datos personales")+'</div>'
 +'<section class="panel"><h2>Descargar informes institucionales PDF</h2><p class="hint">Informes APA 7 con tablas, gráficos y análisis de los datos agregados. No incluyen expedientes individuales ni resultados pendientes de la fase final.</p><div class="actions"><button class="btn" data-action="preview-presencial">Vista previa presencial</button><button class="btn primary" data-action="draft-presencial">Exportar borrador presencial</button><button class="btn" data-action="preview-online">Vista previa online</button><button class="btn primary" data-action="draft-online">Exportar borrador online</button></div></section>'
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
function renderMoodlePreview(stage){
 if(!stage)return "";
 const a=stage.assessment;
 const labels={ready:"Lista para incorporar",duplicate:"Ya registrada",conflict:"Conflicto de notas",already_conflicted:"Conflicto pendiente",
  unmatched:"Sin vincular",ambiguous:"Identidad ambigua",wrong_mode:"Otra modalidad",
  wrong_career:"Otra carrera",identity_conflict:"Identidad contradictoria",missing_grade:"Sin nota final",
  repeat_in_paste:"Duplicado en el pegado"};
 let out='<section class="panel"><h2>Revisión previa a la importación</h2><p class="hint">La revisión no guarda ni modifica datos. Las notas de Word se consideran válidas como fuente del período; cualquier diferencia con Moodle se envía a conflictos.</p>';
 out+='<div class="cards">'+card("Registros detectados",a.total)
   +card("Listos para incorporar",a.summary.ready||0)
   +card("Conflictos nuevos",a.summary.conflict||0)
   +card("Sin vincular o con errores",a.records.filter(x=>!["ready","duplicate","conflict"].includes(x.status)).length)+'</div>';
 if(a.errors.length)out+='<div class="warnbox">'+a.errors.map(h).join("; ")+'</div>';
 if(a.warnings.length)out+='<div class="warnbox">'+a.warnings.map(h).join("; ")+'</div>';
 out+='<p class="hint"><b>Contexto:</b> '+h(a.context.career)+' · Núcleo '+h(a.context.nucleus)+' · '+h(modeLabel(a.context.mode))
   +' · Formato '+h(a.format)+'. Se importan solo notas finales válidas de 0 a 10; los parciales quedan en la base.</p>';
 out+=table(["Estudiante Moodle","Correo o identificación","Nota final","Registro vinculado","Resultado"],
   a.records.map(x=>'<tr>'+td(x.name||"—")+td(x.email||x.id||"—")+td(num(x.grade))
      +td(x.student?x.student.nombre+" · "+x.student.carrera:"—")
      +td((labels[x.status]||x.status)+" · "+x.reason)+'</tr>'));
 out+='<p class="hint">Para guardar, utiliza «Guardar resultado de la revisión». Si modificas el texto, núcleo o carrera, primero debes analizar nuevamente.</p></section>';
 return out;
}
function grades(){
 const a=aggregates(tab),engine=window.InformetitMoodle,hasPeople=a.students.length>0;
 if(!engine)return head("Notas de núcleos","No se cargó el módulo de Moodle.");
 const careers=[...new Map(a.students.map(s=>[Data.career(s.carrera),s.carrera])).values()].sort((x,y)=>x.localeCompare(y,"es"));
 const results=window.InformetitFullReport?.getData(state,tab);
 let out=head("Núcleos estructurantes","Importación de calificaciones Moodle por estudiante, carrera y núcleo.",switcher());
 out+='<section class="panel"><h2>Importar resultados por curso (informe completo)</h2><p class="hint">Excel o CSV: Cédula, Carrera, Curso, Núcleo, Nota final, Docente. Los registros se incorporan como provisionales hasta que se confirme su cotejo. El informe los conserva completos, sin convertirlos automáticamente en notas oficiales.</p><label class="field"><input id="cursos-verificados" type="checkbox"> Confirmo que el archivo fue cotejado contra Moodle o actas originales</label><div class="actions"><button class="btn primary" data-action="cursos-file">Importar desglose de cursos</button></div><p class="hint">Registros detallados guardados en el equipo: '+(state.cursosNucleos||[]).length+'.</p></section>';
 if(!hasPeople)out+='<div class="warnbox block">No hay nómina individual cargada para esta modalidad. Importa la base privada de estudiantes antes de asociar notas. Las estadísticas públicas no permiten identificar alumnos.</div>';
 out+='<section class="panel"><h2>Pegar calificaciones de Moodle</h2>'
  +'<p class="hint">Acepta texto vertical de Moodle (correo y seis valores por estudiante), tablas copiadas con tabulaciones y archivos tabulados pegados como texto. Cuando existan varias columnas, es obligatorio identificar la nota final o «Total del curso». No se asignan calificaciones por aproximación.</p>'
  +'<div class="field-row"><label class="field">Núcleo<select id="nucleo-select"><option value="auto">Detectar encabezado</option>'
  +[1,2,3,4].map(n=>'<option value="'+n+'">Núcleo '+n+'</option>').join("")+'</select></label>'
  +'<label class="field">Carrera<select id="career-select"><option value="auto">Detectar encabezado</option>'
  +careers.map(c=>'<option value="'+h(c)+'">'+h(c)+'</option>').join("")+'</select></label>'
  +'<div class="field"><span>Origen</span><div class="tag">Moodle · local</div></div></div>'
  +'<label class="field block">Libro de calificaciones<textarea id="moodle-text" placeholder="T- NUCLEO 1 ENFERMERIA&#10;APELLIDOS NOMBRES&#10;correo@institucion.edu.ec&#10;8,00&#10;...">'+h(inputText)+'</textarea></label>'
  +'<div class="actions"><button class="btn" data-action="preview-notes">1. Analizar y revisar</button>'
  +'<button class="btn primary" data-action="save-notes"'+(!hasPeople?' disabled':'')+'>2. Guardar resultado de la revisión</button></div>'
  +'<p class="hint">Cambiar el texto, el núcleo o la carrera invalida la revisión hasta volver a analizar.</p></section>';
 if(lastParse&&lastParse.mode===tab)out+=renderMoodlePreview(lastParse);
 if(!hasPeople){
  const publicStats=window.InformetitNucleos?.datos||{};
  if(tab==="presencial")out+='<section class="panel"><h2>Datos académicos agregados del Word</h2>'
    +table(["Carrera","Núcleo","Registros","Promedio"],Object.entries(publicStats).flatMap(([name,ns])=>ns.map((v,i)=>'<tr>'+td(name)+td("N"+(i+1))+td(v[0])+td(num(v[1]))+'</tr>')))+'</section>';
  return out;
 }
 const academic=window.InformetitNuclei?.build(state,tab);
 if(!academic)throw Error("Motor de análisis de núcleos no disponible");
 const defaultCareer=academic.careers.find(c=>c.key===nucleusCareerKey)||academic.careers[0];
 if(defaultCareer)nucleusCareerKey=defaultCareer.key;
 const selected=academic.careers.find(c=>c.key===nucleusCareerKey);
 out+='<div class="cards">'
  +card("Carreras",academic.careers.length)
  +card("Notas individuales",academic.individualGrades)
  +card("Casillas sin nota",academic.pendingSlots??"Sin nómina")
  +card("Casillas en conflicto",academic.unresolvedSlots??"Sin nómina")
  +'</div>';
 out+='<section class="panel"><h2>Resumen académico de núcleos</h2>'
  +'<p class="hint">En cada celda: número de notas / promedio / origen. Las estadísticas del Word se muestran por separado de las notas individuales; una nota sin cargar no se considera cero ni reprobación.</p>'
  +table(["Carrera","Complexivo","Núcleo 1","Núcleo 2","Núcleo 3","Núcleo 4"],
   academic.careers.map(c=>'<tr>'+td(c.name)+td(c.eligible??"Sin nómina")
    +c.nuclei.map(n=>td(n.summary.n?
       n.summary.n+" notas · "+num(n.summary.mean)+" · "+(n.summary.source==="individual"?"Nominal":"Word")
       :"Sin datos")).join("")+'</tr>'))+'</section>';
 if(selected){
  out+='<section class="panel"><div class="row between"><h2>Detalle por carrera</h2>'
   +'<label class="field">Seleccionar carrera<select class="control" data-nucleus-career>'
   +academic.careers.map(c=>'<option value="'+h(c.key)+'"'+(c.key===selected.key?' selected':'')+'>'+h(c.name)+'</option>').join("")
   +'</select></label></div>'
   +'<p class="hint">'+h(window.InformetitNuclei.careerNarrative(selected))+'</p>'
   +table(["Núcleo","Notas nominales","Pendientes","Conflictos","Media","Mediana","Desv. estándar"],
     selected.nuclei.map(n=>'<tr>'+td("Núcleo "+n.number)+td(n.gradeCount)
     +td(n.pendingCount)+td(n.conflictCount)+td(num(n.summary.mean))
     +td(num(n.summary.median))+td(num(n.summary.sd))+'</tr>'));
  for(const n of selected.nuclei){
   out+='<h3>Núcleo '+n.number+'</h3><p class="hint">'+h(window.InformetitNuclei.narrative(selected,n))+'</p>';
   out+=table(["Estudiante","Cédula","Nota final","Fuente"],
     n.entries.map(x=>'<tr>'+td(x.name)+td(x.id)+td(num(x.grade))+td(x.source)+'</tr>'));
   if(n.summary.bands)
     out+=table(["Rango de notas","Estudiantes","Porcentaje"],
       n.summary.bands.map(x=>'<tr>'+td(x.label)+td(x.count)+td(num(x.pct)+" %")+'</tr>'));
  }
  out+='<h3>Estudiantes sin calificación completa · '+h(selected.name)+'</h3>'
   +'<p class="hint">Esta lista es únicamente de seguimiento de los cuatro núcleos. Los estudiantes de Trabajo de Titulación están excluidos.</p>'
   +table(["Estudiante","Cédula","Núcleos sin nota","Núcleos en conflicto"],
    selected.pendingStudents.map(x=>'<tr>'+td(x.name)+td(x.id)
      +td(x.missing.length?x.missing.map(k=>"N"+k).join(", "):"—")
      +td(x.conflicts.length?x.conflicts.map(k=>"N"+k).join(", "):"—")+'</tr>'))
   +'</section>';
 }
 const pendingEntries=state.sinVincular.map((item,i)=>({item,i})).filter(({item})=>
   item.tipo==="nota_moodle"&&(item.modalidad===tab||!item.modalidad&&a.students.some(st=>Data.career(st.carrera)===Data.career(item.carrera))));
 out+='<section class="panel"><h2>Pendientes de conciliación Moodle</h2><p>'
  +h(state.conflictos.filter(x=>a.students.some(st=>x.id.startsWith(st.id+"|"))).length)+' conflictos académicos · '
  +h(pendingEntries.length)+' registros sin vincular.</p>'
  +'<p class="hint">Selecciona explícitamente un estudiante de la misma carrera y modalidad. El vínculo se guarda con auditoría y puede generar un conflicto de notas para resolver.</p>';
 if(pendingEntries.length){
  out+=table(["Nombre o correo Moodle","Núcleo","Nota","Motivo","Estudiante","Acción"],pendingEntries.map(({item,i})=>{
   const matches=a.students.filter(st=>Data.career(st.carrera)===Data.career(item.carrera)).sort((x,y)=>x.nombre.localeCompare(y.nombre,"es"));
   const options='<option value="">Seleccionar estudiante…</option>'+matches.map(st=>'<option value="'+h(st.id)+'">'+h(st.nombre)+' · '+h(st.id)+'</option>').join("");
   return '<tr>'+td(item.registro?.name||item.registro?.nombre||item.registro?.email||"—")
    +td("N"+item.nucleo)+td(num(item.registro?.nota))+td(item.motivo||item.estado||"Sin coincidencia")
    +'<td><select class="control" id="unmatched-student-'+i+'">'+options+'</select></td>'
    +'<td><button class="btn small" data-link-unmatched="'+i+'">Vincular</button></td></tr>';
  }));
 }else out+='<p class="hint">No quedan registros sin vincular en esta modalidad.</p>';
 out+='</section>';
 return out;
}
function evaluations(){
 const engine=window.InformetitComplexivo;
 if(!engine)return head("Evaluaciones finales","No se cargó el motor de Examen Complexivo.");
 const data=engine.analyze(state,tab),c=data.counts;
 const list=data.records.map(x=>x.student).sort((a,b)=>a.carrera.localeCompare(b.carrera,'es')||a.nombre.localeCompare(b.nombre,'es'));
 if(!list.some(x=>x.id===evaluationStudentId))evaluationStudentId="";
 const selected=data.records.find(x=>x.studentId===evaluationStudentId);
 const record=selected?.evaluation;
 const numberInput=(name,label,value,placeholder)=>'<label class="field">'+h(label)+
  '<input id="'+name+'" type="number" min="0" max="10" step="0.01" placeholder="'+h(placeholder||"Sin nota")+
  '" value="'+(value===null||value===undefined?"":h(value))+'"></label>';
 const selectAttendance=(id,value)=>{
   const options=[["pendiente","Pendiente / sin informar"],["presentado","Se presentó"],["no_presentado","No se presentó"]];
   return '<label class="field">Asistencia<select id="'+id+'">'+options.map(([v,label])=>'<option value="'+v+'"'+(v===value?' selected':'')+'>'+label+'</option>').join('')+'</select></label>';
 };
 const inputText=(id,label,value)=>'<label class="field">'+h(label)+'<input id="'+id+'" value="'+h(value||"")+'" placeholder="Número, fecha o referencia del acta"></label>';
 let out=head("Fase III · Examen Complexivo",
  "Resultados ordinarios, supletorios, notas ponderadas y verificación de actas, por carrera.",
  switcher());
 if(!data.records.length){
   out+='<section class="panel"><h2>Sin nómina para Examen Complexivo</h2><p>Primero carga la base privada de estudiantes. No se calculan aprobados desde los requisitos o los núcleos.</p></section>';
   return out;
 }
 out+='<div class="cards">'
   +card("Estudiantes Complexivo",c.eligible)
   +card("Ordinarios calculados",c.ordinaryComplete)
   +card("Aprobados ordinarios",c.ordinaryApproved)
   +card("Aprobados supletorio",c.recovered)
   +card("Reprobados tras supletorio",c.failed)
   +card("Pendientes",c.pending)
   +card("Con acta referenciada",c.verified)
   +'</div>';
 out+='<section class="panel"><h2>Registrar evaluación individual</h2>'
   +'<p class="hint">Ordinario = 40 % teoría + 60 % práctica. Mínimo para aprobar: 7,00/10. El supletorio se calcula con la misma ponderación cuando se dispone de ambos componentes; también puede registrarse su nota final expresa del acta.</p>'
   +'<label class="field">Estudiante de Examen Complexivo<select id="eval-id" data-eval-select><option value="">Seleccionar estudiante</option>'
   +list.map(st=>'<option value="'+h(st.id)+'"'+(evaluationStudentId===st.id?' selected':'')+'>'+h(st.nombre)+' · '+h(st.carrera)+' · '+h(st.id)+'</option>').join('')+'</select></label>';
 if(evaluationStudentId&&selected){
   out+='<h3>Examen ordinario</h3><div class="field-row">'
     +selectAttendance("eval-ord-att",record?.ordinario.asistencia||"pendiente")
     +numberInput("eval-one","Teoría · 40 %",record?.ordinario.teoria)
     +numberInput("eval-two","Práctica · 60 %",record?.ordinario.practica)
     +inputText("eval-source","Acta ordinaria",record?.actaOrdinario)
     +'</div><h3>Examen supletorio</h3><div class="field-row">'
     +selectAttendance("eval-sup-att",record?.supletorio.asistencia||"pendiente")
     +numberInput("eval-sup-one","Teoría · 40 %",record?.supletorio.teoria)
     +numberInput("eval-sup-two","Práctica · 60 %",record?.supletorio.practica)
     +numberInput("eval-rescue","Nota final expresa del acta",record?.supletorio.notaFinal)
     +inputText("eval-sup-source","Acta de supletorio",record?.actaSupletorio)
     +'</div>';
   out+='<div class="actions block"><button class="btn" data-action="preview-eval">Calcular y revisar</button>'
     +'<button class="btn primary" data-action="save-eval">Guardar evaluación</button></div>';
   out+='<p class="hint">Un ordinario insuficiente sin supletorio permanece pendiente de recuperación. Solo se declara reprobación definitiva cuando existe una nota supletoria inferior a 7,00. Las referencias de acta respaldan los resultados, pero no generan firmas electrónicas.</p>';
   if(record){
     out+='<div class="cards">'+card("Ordinario",engine.num(selected.ordinary))
       +card("Supletorio",engine.num(selected.recovery))
       +card("Definitivo",engine.num(selected.finalGrade))
       +card("Estado",engine.DESCRIPTIONS[selected.status]||selected.status)
       +'</div>';
     if(record.warnings.length)out+='<p class="hint">Revisión necesaria: '+h(record.warnings.join("; "))+'</p>';
   }
 }else out+='<p class="hint">Selecciona primero un estudiante para cargar o ingresar su evaluación.</p>';
 out+='</section>';
 out+='<section class="panel"><h2>Importación masiva desde Excel o Moodle</h2>'
   +'<p class="hint">Pega una tabla con encabezados: Cédula, Teoría y Práctica. Opcionalmente: Teoría supletorio, Práctica supletorio, Nota supletorio, Acta ordinaria y Acta supletorio. Acepta tabulaciones de Excel o punto y coma. La coincidencia es por cédula exacta. No modifica evaluaciones previamente guardadas.</p>'
   +'<label class="field">Tabla de evaluaciones<textarea id="exam-import-text" placeholder="Cédula&#9;Teoría&#9;Práctica&#9;Nota supletorio&#10;0000000001&#9;8,00&#9;9,00">'+h(examImportText)+'</textarea></label>'
   +'<div class="actions"><button class="btn" data-action="preview-eval-import">1. Analizar tabla</button>'
   +'<button class="btn primary" data-action="apply-eval-import"'+(examImportStage?'':' disabled')+'>2. Incorporar registros revisados</button></div>'
   +'<p class="hint">Sin revisión previa, no se guarda ninguna nota. Las filas con identidad dudosa, repetida, inválida o ya existente no se incorporan.</p>';
 if(examImportStage?.mode===tab){
   const preview=examImportStage.result;
   out+='<div class="cards">'+card("Filas detectadas",preview.counts.total)
     +card("Listas para guardar",preview.counts.ready)
     +card("Por revisar",preview.counts.skipped)+'</div>';
   out+=table(["Fila","Cédula","Estudiante","Teoría","Práctica","Resultado"],
     preview.rows.map(x=>'<tr>'+td(x.line)+td(x.studentId)+td(x.person?.nombre||"—")
       +td(x.ordTeoria||"—")+td(x.ordPractica||"—")
       +td(x.status==="ready"?"Lista para guardar":x.reason)+'</tr>'));
 }
 out+='</section>';
 out+='<section class="panel"><h2>Resultados por carrera</h2>'
   +table(["Carrera","Complexivo","Ordinarios","Apr. ordinarios","Apr. supletorios","Reprobados","No presentados","Pendientes","Con acta"],
     data.careers.map(c=>'<tr>'+td(c.name)+td(c.stats.eligible)+td(c.stats.ordinaryComplete)
       +td(c.stats.ordinaryApproved)+td(c.stats.recovered)+td(c.stats.failed)
       +td(c.stats.noPresentado)+td(c.stats.pending)+td(c.stats.verified)+'</tr>'))+'</section>';
 out+='<section class="panel"><h2>Evaluaciones nominales · '+modeLabel(tab)+'</h2>'
   +table(["Estudiante","Carrera","Teoría","Práctica","Ord. 40/60","Sup.","Definitiva","Estado","Acta"],
     data.records.map(x=>'<tr>'+td(x.name)+td(x.career)
       +td(x.evaluation?engine.num(engine.grade(x.evaluation.ordinario.teoria)):"—")
       +td(x.evaluation?engine.num(engine.grade(x.evaluation.ordinario.practica)):"—")
       +td(x.ordinary===null?"—":engine.num(x.ordinary))
       +td(x.recovery===null?"—":engine.num(x.recovery))
       +td(x.finalGrade===null?"—":engine.num(x.finalGrade))
       +td(x.duplicate?"Duplicado":engine.DESCRIPTIONS[x.status]||x.status)
       +td(x.verified?"Respaldada":"Por revisar")+'</tr>'))+'</section>';
 const pending=data.records.filter(x=>x.duplicate||["pendiente","supletorio_pendiente"].includes(x.status)||x.evaluation?.warnings.length);
 out+='<section class="panel"><h2>Seguimiento de pendientes y discrepancias</h2><p class="hint">Estos estudiantes requieren información, supletorio o conciliación; no son reprobados por ausencia de notas.</p>'
   +table(["Estudiante","Carrera","Situación","Observación"],
     pending.map(x=>'<tr>'+td(x.name)+td(x.career)
       +td(x.duplicate?"Duplicado":engine.DESCRIPTIONS[x.status]||x.status)
       +td(x.duplicate?"Conciliar registros":x.evaluation?.warnings.join("; ")||
          (x.status==="supletorio_pendiente"?"Falta registrar supletorio":"Falta ordinario"))+'</tr>'))+'</section>';
 return out;
}
function trabajo(){
 const engine=window.InformetitTrabajo;
 if(!engine)return head("Trabajo de Titulación","Motor de proyectos no disponible.");
 const data=engine.analyze(state,tab),c=data.counts;
 const list=data.entries;
 if(!list.some(x=>x.id===trabajoStudentId))trabajoStudentId="";
 const selected=list.find(x=>x.id===trabajoStudentId);
 const existing=selected?.record||engine.blank(trabajoStudentId);
 const input=(id,title,value,max=10)=>'<label class="field">'+h(title)+
  '<input class="control" type="number" id="'+id+'" min="0" max="'+max+'" step="0.01" placeholder="Sin calificación" value="'+
  (value===null||value===undefined?'':h(value))+'"></label>';
 const free=(id,title,value,type='text')=>'<label class="field">'+h(title)+
  '<input class="control" id="'+id+'" type="'+type+'" value="'+h(value??'')+'"></label>';
 const attendance=(id,value)=>'<label class="field">Asistencia<select class="control" id="'+id+'">'+
  [['pendiente','Por confirmar'],['presentado','Presentado'],['no_presentado','No presentado']].map(x=>
    '<option value="'+x[0]+'"'+(x[0]===value?' selected':'')+'>'+x[1]+'</option>').join('')+'</select></label>';
 let out=head("Trabajo de Titulación",
  "Actas de grado, tutor, lector, evaluación práctica y defensa por tres vocales.",switcher()+'<button class="btn primary" data-action="trabajo-file">Importar listado de proyectos</button>');
 out+='<div class="cards">'
   +card("Estudiantes de proyecto",c.eligible)
   +card("Rúbricas completas",c.complete)
   +card("Aprobados calculados",c.approved)
   +card("Pendientes",c.pending)
   +card("Con referencia de acta",c.referenced)+'</div>';
 out+='<section class="panel"><h2>Registro de proyecto y acta de grado</h2>'
   +'<p class="hint">Solo aparecen los estudiantes clasificados como Trabajo de Titulación en Estudiantes y requisitos. La fórmula del ejemplo de acta es 60 % trabajo escrito + 40 % oral; el oral promedia práctica y defensa de los tres vocales.</p>'
   +'<label class="field">Estudiante<select class="control" id="work-student" data-work-student>'
   +'<option value="">Seleccionar estudiante</option>'
   +list.map(x=>'<option value="'+h(x.id)+'"'+(trabajoStudentId===x.id?' selected':'')+'>'+h(x.name)+' · '+h(x.career)+' · '+h(x.id)+'</option>').join('')
   +'</select></label>';
 if(selected){
  out+='<div class="field-row">'+free('work-acta','Número de acta de grado',existing.numeroActa)
   +free('work-date','Fecha del acta',existing.fechaActa,'date')
   +attendance('work-att',existing.asistencia)
   +input('work-tutor','Calificación del tutor',existing.tutor)
   +input('work-lector','Calificación del lector',existing.lector)
   +'</div>';
  for(let i=0;i<3;i++){
   const vocal=existing.vocales[i]||engine.blank().vocales[i];
   out+='<h3>Vocal '+(i+1)+'</h3>'+free('work-vocal-name-'+i,'Nombre del vocal',vocal.nombre);
   const rubric=engine.PRACTICA.map(c=>({...c,group:'practica',groupLabel:'Evaluación práctica'}))
    .concat(engine.DEFENSA.map(c=>({...c,group:'defensa',groupLabel:'Evaluación de la defensa'})));
   out+=table(['Componente','Parámetro','Máximo','Puntaje del vocal'],rubric.map(c=>
    '<tr>'+td(c.groupLabel)+td(c.name)+td(engine.fmt(c.max))+
    '<td><input class="control" type="number" min="0" max="'+c.max+'" step="0.01"'+
    ' id="work-'+i+'-'+c.group+'-'+c.key+'" value="'+
    ((vocal[c.group]||{})[c.key]===null||(vocal[c.group]||{})[c.key]===undefined?'':h(vocal[c.group][c.key]))+
    '" placeholder="—" aria-label="'+h(c.name)+' vocal '+(i+1)+'"></td></tr>'));
  }
  out+='<h3>Recuperación o supletorio</h3><div class="field-row">'
    +attendance('work-sup-att',existing.supletorio.asistencia)
    +input('work-sup-grade','Nota final del supletorio',existing.supletorio.notaFinal)
    +free('work-sup-acta','Número del acta de supletorio',existing.supletorio.numeroActa)
    +free('work-sup-date','Fecha del supletorio',existing.supletorio.fechaActa,'date')
    +'</div>';
  out+='<div class="actions"><button class="btn" data-action="preview-work">Calcular proyecto</button>'
    +'<button class="btn primary" data-action="save-work">Guardar rúbrica y acta</button></div>';
  if(selected.record){
   out+='<div class="cards">'+card('Escrito',engine.fmt(selected.record.written))
    +card('Práctica',engine.fmt(selected.record.practical))
    +card('Defensa',engine.fmt(selected.record.defense))
    +card('Promedio oral',engine.fmt(selected.record.oral))
    +card('Nota final',engine.fmt(selected.grade))
    +card('Estado',engine.STATES[selected.status]||selected.status)+'</div>';
   if(selected.record.warnings.length)out+='<p class="hint">Advertencias: '+h(selected.record.warnings.join('; '))+'</p>';
  }
 }else out+='<p class="hint">Selecciona un estudiante para registrar la rúbrica de los tres vocales.</p>';
 out+='</section>';
 out+='<section class="panel"><h2>Resultados por carrera</h2>'+
  table(['Carrera','Proyectos','Rúbricas completas','Apr. ordinario','Apr. supletorio','Reprobados','Pendientes','Referencias acta'],
   data.careers.map(x=>'<tr>'+td(x.name)+td(x.counts.eligible)+td(x.counts.complete)+
    td(x.counts.approvedOrdinary)+td(x.counts.approvedRescue)+td(x.counts.failed)+
    td(x.counts.pending)+td(x.counts.referenced)+'</tr>'))+'</section>';
 out+='<section class="panel"><h2>Seguimiento de proyectos</h2>'+
  table(['Estudiante','Cédula','Carrera','Escrito','Práctica','Defensa','Oral','Nota final','Estado'],
   data.entries.map(x=>'<tr>'+td(x.name)+td(x.id)+td(x.career)+
    td(engine.fmt(x.record?.written))+td(engine.fmt(x.record?.practical))+
    td(engine.fmt(x.record?.defense))+td(engine.fmt(x.record?.oral))+
    td(engine.fmt(x.grade))+td(engine.STATES[x.status]||x.status)+'</tr>'))+'</section>';
 if(data.legacy.length)out+='<div class="warnbox">Hay '+data.legacy.length+
  ' evaluaciones antiguas de Trabajo de Titulación conservadas para conciliación, no transformadas en rúbricas.</div>';
 if(!data.entries.length)out+='<div class="warnbox">No existen estudiantes clasificados como Trabajo de Titulación en esta modalidad. Revisa las excepciones en Estudiantes y requisitos.</div>';
 return out;
}
function workInput(){
 const engine=window.InformetitTrabajo,id=el('work-student')?.value;
 if(!id)throw Error('Selecciona primero un estudiante de Trabajo de Titulación.');
 const vocales=Array.from({length:3},(_,i)=>{
  const v={nombre:el('work-vocal-name-'+i).value,practica:{},defensa:{}};
  for(const group of ['practica','defensa'])
   for(const c of (group==='practica'?engine.PRACTICA:engine.DEFENSA))
    v[group][c.key]=el('work-'+i+'-'+group+'-'+c.key).value;
  return v;
 });
 return {id,entry:{numeroActa:el('work-acta').value,fechaActa:el('work-date').value,
  asistencia:el('work-att').value,tutor:el('work-tutor').value,lector:el('work-lector').value,
  vocales,supletorio:{asistencia:el('work-sup-att').value,notaFinal:el('work-sup-grade').value,
    numeroActa:el('work-sup-acta').value,fechaActa:el('work-sup-date').value}}};
}
function schedule(){
 const iso=x=>{const s=String(x||'');const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  return m?m[3]+'-'+m[2]+'-'+m[1]:/^\d{4}-\d{2}-\d{2}$/.test(s)?s:''};
 let out=head("Cronogramas institucionales",
   "Fechas del período octubre 2025–marzo 2026. Actividades realizadas según coordinación; las actas y evidencias se revisan por separado.");
 for(const k of ['trabajo','complexivo']){
  out+='<section class="panel"><h2>'+(k==='trabajo'?'Trabajo de Titulación':'Examen Complexivo')+'</h2>'
    +'<p class="hint">La coordinación declara realizadas las actividades del cronograma. Puedes modificar sus fechas y estados; el soporte documental se valida por separado.</p>';
  out+=table(['Actividad','Fecha inicio','Fecha fin','Estado declarado'],
   DATES[k].map((row,i)=>{
    const index=k+'|'+i,custom=state.cronogramaPersonalizado?.[index]||{};
    const dateField=(type,value)=>'<td><input class="control" type="date" data-program-date="'+h(index)+'" data-program-type="'+type+
       '" value="'+h(iso(value))+'"></td>';
    const start=Object.prototype.hasOwnProperty.call(custom,'inicio')?custom.inicio:row[1];
    const finish=Object.prototype.hasOwnProperty.call(custom,'fin')?custom.fin:row[2];
    const status=['pendiente','cumple','no_cumple','no_aplica'].map((v,j)=>'<option value="'+v+'"'+
     ((state.ejecucion[index]||'cumple')===v?' selected':'')+'>'+
     ['Por revisar','Realizado (declarado)','No realizado','No aplica'][j]+'</option>').join('');
    return '<tr>'+td(row[0])+dateField('inicio',start)+dateField('fin',finish)+
     '<td><select class="control" data-schedule="'+h(index)+'">'+status+'</select></td></tr>';
   }));
  out+='</section>';
 }
 out+='<p class="hint">Cada cambio se guarda en la base local. Las fechas actualizadas se incorporan al informe, sin modificar el cronograma de Firebase.</p>';
 return out;
}
function reportBody(m,exportMode=false){let a=aggregates(m);let members=new Map(a.students.map(s=>[s.id,s]));let grades=a.grades, evals=state.evaluaciones.filter(e=>members.has(e.studentId)),nCompletes=a.completeN;let title="Informe Final del Proceso de Titulación — "+modeLabel(m)+" — "+PERIOD;
let sections='<div class="report-paper"><h1>'+h(title)+'</h1><p><b>Unidad de Titulación y Eficiencia Terminal</b> · ITSQMET</p><p>Elaborado por: '+h(state.config.elaborado)+' | Revisado por: '+h(state.config.revisado)+' | Aprobado por: '+h(state.config.aprobado)+'</p><p><b>Código:</b> '+h(window.InformetitCodigo.forMode(state,m).code)+' · <b>Versión:</b> '+h(state.config.version||"1.0")+'</p><h2>1. Caracterización y requisitos</h2><p>La modalidad '+(m==="online"?"online":"presencial")+' registra '+a.students.length+' estudiantes en el archivo institucional del período. De ellos, '+nCompletes+' cumplen los nueve requisitos registrados ('+(a.students.length?num(nCompletes/a.students.length*100):"—")+' %). Estas cifras son datos de cumplimiento y no deben interpretarse como aprobación académica del Examen Complexivo.</p>'+table(["Requisito","Aplicables","Cumplen","Pendientes","Porcentaje"],a.byReq.map(x=>"<tr>"+td(LABEL[x.k])+td(x.all)+td(x.ok)+td(x.pending)+td(num(x.pct)+" %")+"</tr>"))+'<h2>2. Núcleos estructurantes</h2>';
for(const c of a.careers){let carrGrades=grades.filter(g=>g.carrera===c);sections+='<h3>'+h(c)+'</h3>'+table(["Núcleo","Notas registradas","Promedio comprobado"],[1,2,3,4].map(n=>{let arr=carrGrades.filter(g=>g.nucleo===n);return "<tr>"+td("Núcleo "+n)+td(arr.length)+td(arr.length?num(arr.reduce((x,g)=>x+g.nota,0)/arr.length):"Pendiente")+"</tr>"}))+'<p>Resultados descriptivos calculados solamente con las '+carrGrades.length+' notas del registro disponible para esta carrera. Las notas faltantes no se reemplazan por estimaciones.</p>'}
sections+='<h2>3. Evaluación final</h2><p>Evaluaciones registradas: '+evals.length+'; aprobados: '+evals.filter(e=>e.status==="aprobado").length+'; reprobados: '+evals.filter(e=>e.status==="reprobado").length+'. Los casos pendientes no equivalen a reprobación.</p><h2>4. Validación y asuntos pendientes</h2><p>Estudiantes sin clasificación de modalidad de titulación: '+a.students.filter(s=>s.tipoTitulacion==="sin_definir").length+'. Calificaciones en conflicto: '+state.conflictos.filter(x=>members.has(x.anterior?.studentId)).length+'. Conclusiones y recomendaciones institucionales sujetas a validación y evidencias completas.</p><p><b>Informe de trabajo:</b> se genera únicamente a partir de la información actualmente incorporada. No constituye acta de aprobación.</p></div>';
return exportMode?sections:'<section class="panel">'+sections+'</section>'}

/* Identidad institucional: logotipo compartido, prefijos verificables y mes automático. */
function identityPanel(compactView=false){
 const C=window.InformetitCodigo,D=window.InformetitDocument;
 if(!C||!D)throw Error('Configuración de códigos INF no disponible');
 const month=C.issuance(state.periodo),pres=D.fields(state,'presencial'),online=D.fields(state,'online');
 const active=tab==='online'?online:pres;
 const logo=pres.logo?'<img class="identity-logo" src="'+h(pres.logo)+'" alt="Vista previa del logotipo institucional">':
   '<div class="identity-logo-empty">Sin logotipo cargado</div>';
 let out='<section class="panel identity-panel"><div class="identity-panel-heading"><div><h2>Identidad institucional y códigos INF</h2>'+
  '<p class="hint">Para este período, finalizado en '+h(month.periodEnd)+', el informe corresponde a <b>'+h(month.label)+
  '</b> (dos meses después). El año y mes del código se calculan automáticamente.</p></div></div>';
 out+='<div class="identity-layout"><div class="identity-logo-card">'+logo+
  '<div class="actions"><button class="btn primary" data-action="logo-file">'+(pres.logo?'Cambiar logo':'Subir logo institucional')+
  '</button>'+(state.config.logoDataUrl?'<button class="btn" data-action="remove-logo">Restaurar logo institucional</button>':'')+'</div>'+
  '<p class="hint">PNG, JPG o WebP · máximo 2 MB. Se guarda solamente en tu equipo y se muestra únicamente en la cabecera de ambos PDF.</p>'+
  '</div><div class="identity-code-card">'+
  '<div class="identity-code-row"><span>Presencial</span><strong>'+h(pres.code)+'</strong></div>'+
  '<div class="identity-code-row"><span>Online</span><strong>'+h(online.code)+'</strong></div>'+
  '<p class="hint">Sufijo automático y fijo para este período: <b>'+h(month.stamp)+'</b>.'+
  ' Los consecutivos y el proceso no se asignan sin confirmación institucional.</p>';
 if(compactView)out+='<div class="actions"><button class="btn" data-page="identidad">Configurar códigos y fecha</button></div>';
 else{
  const configs=[
   ['codigoPresencial','Prefijo y consecutivo presencial',C.prefix(state.config.codigoPresencial),'Ej.: UTET-INF-01-PRO-95'],
   ['codigoOnline','Prefijo y consecutivo online',C.prefix(state.config.codigoOnline),'Prefijo autorizado de online']
  ];
  out+='<div class="identity-fields">'+configs.map(([id,label,value,placeholder])=>
   '<label class="field">'+h(label)+'<input class="control" data-code-prefix="'+h(id)+'" value="'+h(value)+
   '" placeholder="'+h(placeholder)+'" disabled aria-readonly="true"></label>').join('')+
   '<label class="field">Fecha real de elaboración (día del mes previsto)<input type="date" class="control" data-config="fechaElaboracion" value="'+h(state.config.fechaElaboracion||D.lastWorkdayOfMonth(month.stamp))+'"></label>'+
   '<label class="field">Versión del documento<input class="control" data-config="version" value="'+h(state.config.version||'1.0')+'"></label></div>'+
   '<p class="hint">Escribe solo el prefijo del código; Informetit añadirá <b>-'+h(month.stamp)+
   '</b>. También acepta códigos antiguos completos y corrige automáticamente el año-mes al período del informe.</p>';
 }
 out+='</div></div>';
 if(!compactView)out+='<div class="field-row identity-validation"><label class="field"><input type="checkbox" data-config="marcoLegalValidado" '+
   (state.config.marcoLegalValidado?'checked':'')+'> He revisado la normativa institucional vigente.</label>'+
   '<label class="field"><input type="checkbox" data-config="firmasValidadas" '+
   (state.config.firmasValidadas?'checked':'')+'> He revisado responsables y firmas pendientes de aprobación.</label>'+
   '</div><p class="hint">El logotipo se muestra solo en la cabecera de los informes. Las firmas no se generan automáticamente.</p>';
 out+='</section>';
 return out;
}
function identidad(){
 return head('Logo y códigos INF','Configuración del encabezado institucional de ambos informes.')+
  identityPanel(false);
}
function reports(){
 const d=window.InformetitFullReport?.getData(state,tab),hasPrivate=state.estudiantes.some(s=>s.modalidad===tab);
 const quality=window.InformetitQuality.analyze(state,tab);
 const req=window.InformetitRequirements?.analyze(state,tab);
 const documentPending=window.InformetitDocument?.pending(state,tab)||[];
 if(!d)return head("Informe institucional","No se encontró la cohorte.");
 const academic=window.InformetitNuclei.build(state,tab);
 const validNuclei=academic.careers.flatMap(c=>c.nuclei);
 const wordOnlyCount=validNuclei.filter(g=>g.summary.source==="word_aggregate").length;
 const officialCount=validNuclei.filter(g=>g.summary.source==="individual").length;
 const pendingCount=validNuclei.filter(g=>g.summary.n===0).length;
 const inconsistent=(state.conflictos||[]).length+(state.sinVincular||[]).length;
 const qaRows=[
  ["Base nominal de estudiantes",req?.source==='aggregate'?"Solo resumen agregado; casos individuales no disponibles":d.fullRoster?"Nómina local completa: cálculos individuales":"Nómina local parcial: falta conciliar la cobertura"], 
  ["Fase I · requisitos",req?req.complete8+" cumplen 8 requisitos · "+req.complete9+" cumplen 9 controles · "+(req.source==='individual'?req.checks.fail+" incumplimientos confirmados y "+req.checks.unknown+" sin verificar":req.checks.unclassified+" verificaciones no clasificadas"):"Sin información"],
  ["Calificaciones de núcleos",officialCount+" con notas individuales · "+wordOnlyCount+" solo con agregado Word · "+pendingCount+" sin información"],
  ["Conflictos y registros sin vincular",inconsistent+" incidencias por revisar antes de aprobación"],
  ["Examen Complexivo",(()=>{const x=window.InformetitComplexivo.analyze(state,tab).counts;
   return x.eligible+" estudiantes · "+x.approved+" aprobaciones calculadas · "+x.pending+" pendientes · "+x.duplicate+" duplicados";})()],
  ["Trabajo de Titulación",(()=>{const x=window.InformetitTrabajo.analyze(state,tab).counts;
   return x.eligible+" proyectos · "+x.complete+" rúbricas completas · "+x.approved+" aprobaciones calculadas · "+x.pending+" pendientes";})()],
  ["Conciliación de mecanismos",(()=>{const x=window.InformetitConsolidado.analyze(state,tab).counts;
   return x.total+" estudiantes · "+x.approved+" aprobaciones calculadas · "+x.referenced+" referencias de acta";})()],
  ["Control documental INF",documentPending.length?documentPending.join("; "):"Campos documentales marcados como verificados"],
  ["Estado de emisión","BORRADOR · No apto para cierre institucional sin validar evidencias"]
 ];
 const coverage=academic.nucleiWithResults;
 const notes=academic.individualGrades;
 let out=head("Informe institucional · "+modeLabel(tab),"Borrador por fases y carreras, con tablas y gráficos APA 7.",switcher()+'<button class="btn" data-action="preview-current">Vista previa</button><button class="btn primary" data-action="print">Exportar borrador PDF</button>');
 out+='<div class="cards">'+card("Estudiantes",d.total)+card("Requisitos completos",d.completos9,num(100*d.completos9/d.total)+" %")+card("Núcleos con datos",coverage+" / "+academic.nucleiExpected,"Solo agregado Word: "+academic.wordOnlyNuclei+" núcleos")+card("Aprobaciones calculadas",window.InformetitConsolidado.analyze(state,tab).counts.approved,"Ambos mecanismos · verificar actas")+'</div>';
 out+=identityPanel(true);
 out+='<section class="panel"><h2>Auditoría del informe y cierre documental</h2>'
  +'<p><b>'+h(quality.state)+'</b>. '+quality.critical.length+' bloqueos críticos y '+
   quality.warnings.length+' advertencias. La app registra aprobaciones calculadas, no acredita graduaciones.</p>'
  +'<div class="cards">'+card('Complexivo',quality.counters.complexivo)
   +card('Trabajo de Titulación',quality.counters.trabajo)
   +card('Aprobaciones calculadas',quality.counters.approvedCalculated)
   +card('Pendientes',quality.counters.pending)
   +card('Con referencia de acta',quality.counters.actaReferences)+'</div>'
  +table(['Nivel','Control','Resultado','Acción de cierre'],
    quality.issues.map(x=>'<tr>'+td(x.severity==='critical'?'Crítico':x.severity==='warning'?'Advertencia':'Informativo')
      +td(x.label)+td(x.value)+td(x.remedy)+'</tr>'))
  +'<p class="hint">Las incidencias aparecen desarrolladas en el Anexo C del informe. La referencia de un acta no certifica su firma ni su autenticidad.</p>'
  +'</section>'; 
 out+='<section class="panel"><h2>Control de calidad antes de emitir el PDF</h2>'+table(["Control","Resultado"],qaRows.map(row=>'<tr>'+row.map(td).join("")+'</tr>'))+'<p class="hint">Las notas del Word están aceptadas como fuente del período. Las discrepancias con Moodle, los registros sin vincular y las actas faltantes continúan pendientes; el PDF será borrador hasta validar la documentación.</p></section>';
 out+='<section class="panel"><h2>Avance del informe</h2><div class="goodbox">Se incluyen introducción, metodología, objetivos, referencia normativa por validar, cronogramas, Fase I desarrollada con controles de verificación, estructura de núcleos por carrera, ruta de Trabajo de Titulación, fase evaluativa, recomendaciones y referencias.</div><p class="hint">Las notas ausentes y los resultados sin actas no se rellenan con estimaciones.</p><div class="actions"><button class="btn" data-action="preview-current">Vista previa del informe</button><button class="btn primary" data-action="print">Exportar PDF de esta modalidad</button><button class="btn" data-action="draft-presencial">PDF presencial</button><button class="btn" data-action="draft-online">PDF online</button></div></section>';
 out+='<section class="panel"><h2>Control de notas por carrera y núcleo</h2><p class="hint">Se conservan por separado las calificaciones oficiales y las extraídas del Word de trabajo. Las del Word se conservan como fuente aceptada para la cohorte; cualquier discrepancia con Moodle se identifica para revisión.</p>'+table(["Carrera","Núcleo 1","Núcleo 2","Núcleo 3","Núcleo 4"],academic.careers.map(c=>'<tr>'+td(c.name)+c.nuclei.map(k=>{const g=k.summary;return '<td><span class="tag '+(g.n?"ok":"warn")+'">'+(g.n?g.n+" registros · "+num(g.mean)+" · "+(g.source==="individual"?"Nominal":"Word"):"Pendiente")+'</span></td>'}).join("")+'</tr>'))+'<p class="hint">'+notes+' calificaciones registradas como datos individuales o resúmenes agregados. Los núcleos sin datos quedan pendientes, no reprobados.</p></section>';
 out+='<section class="panel"><h2>Control documental · estándar INF</h2>'+
   '<p class="hint">El logo, los prefijos, el código con mes automático y la fecha real se configuran en <b>Logo y códigos INF</b>. Las actas y firmas se validan por separado.</p>'+
   '<p class="hint">Pendientes: '+(documentPending.length?documentPending.map(h).join("; "):"Ninguno declarado")+'</p>'+
   '<button class="btn" data-page="identidad">Abrir configuración de identidad</button></section>';
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
+head("Datos y respaldo","Importación manual opcional y copia de seguridad.")+'<div class="grid2"><section class="panel"><h2>Importar</h2><p>Importa la base maestra JSON preparada desde ChatGPT o el archivo institucional original XLS/HTML/XLSX.</p><div class="actions"><button class="btn primary" data-action="backup-file">Importar JSON maestro</button><button class="btn" data-action="student-file">Importar Excel de estudiantes</button></div><p class="hint">La importación de JSON reemplaza la base local previa. Descarga antes una copia de seguridad si ya has registrado cambios.</p></section><section class="panel"><h2>Exportar respaldo</h2><p>Descarga estudiantes, notas, resultados, cronogramas verificados, observaciones y conflictos. Podrás compartir este JSON en el chat para que prepare una versión actualizada.</p><div class="actions"><button class="btn primary" data-action="export-json">Descargar JSON</button><button class="btn danger" data-action="clear-db">Vaciar base local</button></div></section></div><section class="panel"><h2>Estado de la base</h2><div class="cards">'+card("Estudiantes",state.estudiantes.length)+card("Notas de núcleos",state.notas.length)+card("Rúbricas de proyectos",state.trabajos.length)+card("Conflictos",state.conflictos.length)+card("Sin vincular",state.sinVincular.length)+'</div><h3>Importaciones</h3>'+table(["Fuente","Tipo","Filas","Fecha"],state.importaciones.map(i=>'<tr>'+td(i.nombre)+td(i.tipo)+td(i.filas)+td(i.fecha)+'</tr>'))+'<h3>Complementarios pendientes de conciliar</h3>'+table(["Fuente","Registro","Estado"],state.complementarios.map(x=>'<tr>'+td(x.fuente)+td(x.registro?.Nombre||x.registro?.nombre||"Sin nombre")+td(x.estado||"Por conciliar")+'</tr>'))+'<h3>Notas en conflicto</h3>'+table(["Estudiante","Núcleo","Actual","Nueva","Decisión"],state.conflictos.map((c,i)=>'<tr>'+td(c.id?.split("|")[0])+td(c.nuevo?.nucleo)+td(num(c.anterior?.nota))+td(num(c.nuevo?.nota))+'<td><button class="btn small" data-use-conflict="'+i+'">Usar nueva</button> <button class="btn small" data-keep-conflict="'+i+'">Conservar actual</button></td></tr>'))+'</section><section class="panel"><h2>Privacidad y límites</h2><p class="privacy">Los datos se guardan en IndexedDB (o localStorage de respaldo) de este navegador, no en GitHub. Borrar datos del navegador puede eliminarlos. Descarga copias JSON y almacénalas en un lugar privado. ChatGPT no puede modificar directamente el contenido guardado dentro de tu navegador: para aplicar cambios realizados aquí, importa el archivo JSON actualizado.</p></section>'}

function firebaseView(){
 const F=window.InformetitFirebase,preview=firebaseComparison,connected=!!firebaseConnection?.connected;
 let out=head("Firebase UTET · solo lectura",
   "Vinculación con Firestore y conciliación del período octubre 2025–marzo 2026.");
 out+='<section class="panel"><h2>Proyecto UTET · utet-4387a</h2>'
  +'<p>La aplicación nunca escribe en Firestore. El acceso en vivo requiere permisos Google autorizados. Las credenciales permanecen en tu equipo y no se guardan en GitHub ni en el archivo maestro de estudiantes.</p>'
  +'<div class="actions"><button class="btn" data-action="firebase-adc">Conectar con Google (credenciales locales)</button>'
  +'<button class="btn" data-action="firebase-credential">Elegir credencial de lectura</button>'
  +'<button class="btn primary" data-action="firebase-read"'+(connected?'':' disabled')+'>Consultar Firestore ahora</button>'
  +'<button class="btn" data-action="firebase-backup">Analizar respaldo JSON/TXT</button></div>'
  +'<p class="hint">Método recomendado: credenciales de Google configuradas localmente (ADC). Si utilizas una cuenta de servicio, debe tener acceso de solo lectura; nunca compartas su clave privada en un chat ni la publiques.</p>'
  +'<p class="hint">Estado: '+h(connected?"Identidad autorizada para consultar":'Sin autorización en vivo')
  +(firebaseMessage?' · '+h(firebaseMessage):'')+'</p></section>';
 if(!preview){
  out+='<section class="panel"><h2>Conciliación pendiente</h2><p>Carga el respaldo UTET o consulta Firestore para comparar la nómina con la base local. Ningún estudiante se añadirá automáticamente.</p></section>';
  return out;
 }
 const q=preview.stats,snapshot=preview.remote;
 out+='<section class="panel"><h2>Resultado de conciliación</h2>'
  +'<p class="hint">Fuente: '+h(snapshot.source)+' · Período '+h(snapshot.period)+'. Las diferencias se guardan como incidencias, sin sobrescribir decisiones académicas.</p>'
  +'<div class="cards">'+card("Registros de Firebase",q.source)+card("Coincidentes",q.matched)
  +card("Adicionales",q.additional)+card("No encontrados",q.onlyLocal)
  +card("Diferencias de requisitos",q.differences)+'</div>'
  +'<p class="hint">Distribución Firebase: '+snapshot.counts.presencial+' presencial, '+snapshot.counts.online+' online. Esta población no sustituye automáticamente los totales aprobados para el informe.</p>'
  +'<p><b>Calificaciones numéricas:</b> '+(snapshot.gradeDiscovery.found.length?
   h("Posibles campos en "+snapshot.gradeDiscovery.found.length+" registros. Deben verificarse estructura y correspondencia antes de importarlos."):
   "No encontradas en las colecciones consultadas. Los estados de aprobación CUMPLE/NO CUMPLE no son notas.")+'</p>';
 if(snapshot.gradeDiscovery.collections.length)
  out+='<p class="hint">Colecciones académicas examinadas: '+h(snapshot.gradeDiscovery.collections.join(", "))+'</p>';
 if(snapshot.issues.length)out+='<p class="hint">Incidencias de origen: '+snapshot.issues.length+'. No se incorporan registros sin ficha o requisitos.</p>';
 if(preview.added.length)
  out+='<h3>Registros adicionales para revisar</h3>'
   +table(["Cédula","Nombre","Carrera","Modalidad"],
    preview.added.map(x=>'<tr>'+td(x.id)+td(x.nombre)+td(x.carrera)+td(x.modalidad)+'</tr>'));
 if(preview.onlyLocal.length)
  out+='<h3>Registros de Informetit no encontrados en Firebase</h3>'
   +table(["Cédula","Nombre","Carrera"],
    preview.onlyLocal.map(x=>'<tr>'+td(x.id)+td(x.nombre)+td(x.carrera)+'</tr>'));
 if(preview.differences.length)
  out+='<h3>Diferencias por verificar</h3>'
   +table(["Cédula","Campo","Informetit","Firebase"],
    preview.differences.slice(0,150).map(x=>'<tr>'+td(x.id)+td(x.field)+td(x.local)+td(x.remote)+'</tr>'))
   +'<p class="hint">Se muestran hasta 150 discrepancias; todas se conservarán en el registro privado de conciliación.</p>';
 out+='<div class="actions block"><button class="btn primary" data-action="firebase-apply">Incorporar datos faltantes de coincidentes</button>'
  +'<button class="btn" data-action="firebase-add">Incorporar también los '+q.additional+' adicionales</button></div>'
  +'<p class="hint">Ambas opciones preservan notas Moodle, Word, exámenes, actas, tipo de titulación y valores locales ya completados. La incorporación de registros adicionales modifica la población, por lo que requiere una confirmación explícita.</p></section>';
 return out;
}
async function firebaseAction(code){
 const F=window.InformetitFirebase;
 try{
  if(!F)throw Error("Módulo de Firebase no disponible");
  if(code==="firebase-backup"){el("firebase-file").click();return}
  if(code==="firebase-adc"||code==="firebase-credential"){
   if(!window.informetitDesktop?.firebaseConnect)throw Error("La conexión autorizada requiere ejecutar Informetit en Electron.");
   const result=await window.informetitDesktop.firebaseConnect(code==="firebase-adc"?"adc":"service_account");
   if(result?.canceled)return;
   firebaseConnection=result;
   firebaseMessage="Conexión autorizada · consulta pendiente";draw();notify("Conectado a Firebase UTET en modo lectura.");
   return;
  }
  if(code==="firebase-read"){
   if(!window.informetitDesktop?.firebaseRead)throw Error("Solo disponible en Electron.");
   firebaseMessage="Consultando colecciones autorizadas";draw();
   const raw=await window.informetitDesktop.firebaseRead();
   firebaseComparison=F.compare(state,F.snapshot(raw));firebaseMessage="Consulta recibida · conciliación preparada";
   draw();notify("Firebase consultado: "+firebaseComparison.stats.matched+" coincidentes.");
   return;
  }
  if(code==="firebase-apply"||code==="firebase-add"){
   if(!firebaseComparison)throw Error("Primero compara los datos de Firebase con la base.");
   const extra=code==="firebase-add";
   const msg=extra?"Se incorporarán también los "+firebaseComparison.added.length+" estudiantes adicionales. ¿Confirmas que pertenecen al informe?":
    "¿Completar datos vacíos de estudiantes coincidentes, conservando toda la información local existente?";
   if(!confirm(msg))return;
   // Recalcular en el instante de aplicar, por si cambió la base desde la vista previa.
   const comparison=F.compare(state,firebaseComparison.remote);
   const operation=F.apply(state,comparison,{includeAdditional:extra});
   await Store.save(operation.next);
   state=operation.next;
   firebaseComparison=F.compare(state,comparison.remote);
   firebaseMessage=operation.stats.filled+" campos completados · "+operation.stats.added+" estudiantes añadidos · "+
     operation.stats.conflicts+" discrepancias nuevas";
   draw();notify("Conciliación guardada localmente. No se modificó Firestore.");
   return;
  }
 }catch(error){firebaseMessage=error.message;console.error("Firebase UTET:",error.message);draw();notify("Firebase: "+error.message)}
}
async function firebaseLoadFile(event){
 const file=event.target.files?.[0];
 if(!file)return;
 try{
  if(file.size>35*1024*1024)throw Error("El respaldo es demasiado grande (límite 35 MB).");
  const raw=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
  firebaseComparison=window.InformetitFirebase.compare(state,window.InformetitFirebase.snapshot(raw));
  firebaseMessage="Respaldo leído en este equipo · no se ha escrito en Firestore";
  page="firebase";draw();notify("Respaldo UTET analizado. Revisa las diferencias antes de aplicar.");
 }catch(error){notify("No se pudo analizar el respaldo: "+error.message)}
 finally{event.target.value=""}
}

const views={inicio,estudiantes,nucleos:grades,evaluaciones:evaluations,trabajo,cronogramas:schedule,informes:reports,identidad,firebase:firebaseView,datos:data};
function draw(){el("main").innerHTML=views[page]();document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));}
function download(name,type,content){let blob=new Blob([content],{type}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),2000)}
async function parseGradeAndSave(save){
 const engine=window.InformetitMoodle;
 if(!engine){notify("Motor Moodle no disponible.");return}
 const raw=el("moodle-text").value;
 const selectedN=el("nucleo-select").value,selectedC=el("career-select").value;
 inputText=raw;
 const options={nucleus:selectedN,career:selectedC,mode:tab};
 if(!save){
  const parsed=engine.parse(raw),ctx=engine.contextualize(parsed,options);
  const assessed=engine.assess(parsed,ctx,state);
  if(!assessed.total){notify(assessed.warnings.join("; ")||"No se identificaron estudiantes. Revisa el formato.");lastParse=null;return}
  lastParse={assessment:assessed,raw,mode:tab,nucleus:selectedN,career:selectedC};
  draw();
  el("nucleo-select").value=selectedN;
  el("career-select").value=selectedC;
  notify("Analizados "+assessed.total+" registros. Revisa los resultados antes de guardar.");
  return;
 }
 if(!lastParse||lastParse.raw!==raw||lastParse.mode!==tab||lastParse.nucleus!==selectedN||lastParse.career!==selectedC){
  notify("El texto o contexto cambió. Pulsa «Analizar y revisar» antes de guardar.");
  return;
 }
 const assessed=lastParse.assessment;
 if(assessed.errors.length){notify(assessed.errors.join(" "));return}
 if(!state.estudiantes.some(x=>x.modalidad===tab)){notify("No se ha cargado la nómina local de esta modalidad.");return}
 try{
  const planned=engine.plan(state,assessed,today());
  // Escritura transaccional; en caso de fallo no se altera el estado en pantalla.
  await Store.save(planned.next);
  state=planned.next;lastParse=null;inputText="";
  draw();
  notify("Moodle: "+planned.stats.added+" incorporadas, "+planned.stats.duplicate+
   " ya existentes, "+planned.stats.conflict+" conflictos y "+planned.stats.unmatched+" sin vincular.");
 }catch(e){console.error(e);notify("No se guardaron notas: "+e.message)}
}
function parseRows(rows){let header=rows[0]?.map(compact)||[],field=(r,...keys)=>{for(let k of keys){let j=header.indexOf(compact(k));if(j>=0)return String(r[j]??"").trim()}return ""},result=[];if(!header.includes("NUMEROIDENTIFICACION"))throw Error("Falta la columna numeroIdentificacion.");for(let r of rows.slice(1)){let id=field(r,"numeroIdentificacion");if(!id)continue;let original=field(r,"NombreCarrera"),code=field(r,"CodigoCarrera"),mode=normal(original).endsWith("ONLINE")?"online":/-L-/i.test(code)?"online":"presencial",req={};let aliases={Practicas:["PrácticasVinculacion","PracticasVinculacion","Practicas"],Seguimiento:["SeguimientoGraduados","Seguimiento"],Datos:["ActualizaciónDatos","ActualizacionDatos","Datos"],Ingles:["Ingles","Inglés"]};for(let k of R)req[k]=field(r,...(aliases[k]||[k]));result.push({id,nombre:field(r,"Nombres"),codigo:code,carrera:original.replace(/\s+ONLINE\s*$/i,"").trim(),modalidad:mode,horario:field(r,"HorarioComplexivo"),sede:field(r,"Sede"),correo:field(r,"CorreoInstitucional").toLowerCase(),correoPersonal:field(r,"CorreoPersonal"),telefono:field(r,"Celular"),requisitos:req,aprobacionTitulacion:field(r,"AprobacionTitulacion"),aprobacionComplexivoProyecto:field(r,"AprobacionComplexivoProyecto"),tipoTitulacion:"sin_definir"})}if(!result.length)throw Error("No hay filas con cédula.");return result}
function parseHTML(txt){let doc=new DOMParser().parseFromString(txt,"text/html"),table=doc.querySelector("table");if(!table)throw Error("El archivo HTML no tiene tablas.");return [...table.querySelectorAll("tr")].map(tr=>[...tr.querySelectorAll("td,th")].map(td=>td.textContent.trim()))}
async function readExcel(file){let bytes=await file.arrayBuffer(),prefix=new TextDecoder("latin1").decode(bytes.slice(0,400));if(/<table|<!doctype|<html|<style/i.test(prefix)){let html=new TextDecoder("windows-1252").decode(bytes);return parseRows(parseHTML(html))}if(file.name.toLowerCase().endsWith(".csv")){if(!window.XLSX)throw Error("Conecta Internet para importar CSV o pega directamente un JSON.");let x=XLSX.read(bytes,{type:"array"});return parseRows(XLSX.utils.sheet_to_json(x.Sheets[x.SheetNames[0]],{header:1,defval:"",raw:false}))}if(!window.XLSX)throw Error("No se ha cargado la biblioteca de Excel; comprueba la conexión.");let wb=XLSX.read(bytes,{type:"array"});for(let sh of wb.SheetNames){let rows=XLSX.utils.sheet_to_json(wb.Sheets[sh],{header:1,defval:"",raw:false});if(rows[0]&&rows[0].some(x=>compact(x)==="NUMEROIDENTIFICACION"))return parseRows(rows)}throw Error("No se encontró una hoja con numeroIdentificacion.")}
async function handleCursosFile(ev){
 const file=ev.target.files?.[0];if(!file)return;
 try{
  if(!window.XLSX)throw Error('La biblioteca local de Excel no está disponible.');
  if(!state.estudiantes.length)throw Error('Primero importa la nómina privada de estudiantes.');
  const confirmed=!!el('cursos-verificados')?.checked;
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
  const val=(row,...keys)=>{const field=Object.keys(row).find(k=>keys.some(x=>compact(k)===compact(x)));return field===undefined?'':String(row[field]??'').trim()};
  const roster=new Map(state.estudiantes.map(s=>[String(s.id),s])),entries=[],unmatched=[],seen=new Set();
  for(const sheet of wb.SheetNames){
   const rows=XLSX.utils.sheet_to_json(wb.Sheets[sheet],{defval:'',raw:false});
   for(const row of rows){
    let id=val(row,'Cédula','Cedula','numeroIdentificacion','Identificación').replace(/\.0$/,'');
    if(/^\d{9}$/.test(id))id='0'+id;
    const st=roster.get(id),career=val(row,'Carrera','NombreCarrera'),n=Number(val(row,'Núcleo','Nucleo','Número de núcleo'));
    const course=val(row,'Curso','Materia','Nombre del curso','Asignatura');
    const grade=Data.grade(val(row,'Nota final','Calificación final','Nota','Calificacion'));
    if(!id&&!course)continue;
    if(!st||career&&Data.career(career)!==Data.career(st.carrera)||
       !course||!Number.isInteger(n)||n<0||n>4||(grade===null&&!/no evaluad/i.test(val(row,'Estado académico','Estado')))){
     unmatched.push({id,curso:course,nucleo:n,motivo:'Identidad, carrera, curso, núcleo o nota no verificables'});continue;
    }
    const key=id+'|'+n+'|'+Data.key(course),duplicate=seen.has(key);
    if(duplicate){unmatched.push({id,curso:course,nucleo:n,motivo:'Duplicado en archivo'});continue}
    seen.add(key);
    entries.push({studentId:id,modalidad:st.modalidad,carrera:st.carrera,curso:course,
      nucleo:n,nota:grade,docente:val(row,'Docente','Profesor'),
      estadoAcademico:val(row,'Estado académico','Estado'),
      source:file.name,verificado:confirmed,estado:confirmed?'cotejado_por_coordinacion':'provisional_por_conciliar',
      fechaImportacion:today()});
   }
  }
  if(!entries.length)throw Error('No se localizaron filas válidas con identificación, carrera, curso y una nota o estado no evaluado.');
  if(!confirm('Importar '+entries.length+' registros individuales de cursos, '+unmatched.length+
   ' observaciones por conciliar. Estado: '+(confirmed?'COTEJADO expresamente':'PROVISIONAL')+
   '. Los registros se guardan solo en este equipo. ¿Confirmas?'))return;
  const next=Data.migrate(state),records=new Map((next.cursosNucleos||[]).map(x=>[x.studentId+'|'+x.nucleo+'|'+Data.key(x.curso),x]));
  for(const e of entries)records.set(e.studentId+'|'+e.nucleo+'|'+Data.key(e.curso),e);
  next.cursosNucleos=[...records.values()];
  for(const e of unmatched)next.complementarios.push({fuente:file.name,tipo:'curso_sin_conciliar',registro:e,estado:e.motivo});
  next.importaciones.push({nombre:file.name,tipo:'cursos_nucleos',filas:entries.length,noConciliados:unmatched.length,
   validado:confirmed,fecha:today()});
  next.auditoria.push({tipo:'cursos_nucleos',fecha:today(),fuente:file.name,total:entries.length,verificado:confirmed});
  await Store.save(next);state=next;draw();notify(entries.length+' registros de cursos importados; '+unmatched.length+' requieren revisión.');
 }catch(e){console.error(e);notify('Importación de cursos: '+e.message)}
 finally{ev.target.value=''}
}

async function handleTrabajoFile(ev){
 const file=ev.target.files?.[0];if(!file)return;
 try{
  if(!window.XLSX)throw Error('No se cargó la biblioteca de Excel.');
  if(!state.estudiantes.length)throw Error('Primero importa la nómina institucional de estudiantes.');
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
  const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:'',raw:false});
  if(!rows.length)throw Error('El archivo no contiene estudiantes.');
  const val=(row,...keys)=>{const k=Object.keys(row).find(x=>keys.some(n=>compact(x)===compact(n)));return k?String(row[k]??'').trim():''};
  const index=new Map(state.estudiantes.map(s=>[s.id,s])),matches=[],unmatched=[],seen=new Set();
  for(const row of rows){
   let id=val(row,'Cédula','Cedula','numeroIdentificacion').replace(/\.0$/,'');
   if(/^\d{9}$/.test(id))id='0'+id;
   if(!/^\d{10}$/.test(id)||seen.has(id))throw Error('Identificación vacía, inválida o repetida: '+id);
   seen.add(id);
   const st=index.get(id),career=val(row,'Carrera');
   if(!st||(career&&Data.career(st.carrera)!==Data.career(career)))
    unmatched.push({id,nombre:val(row,'Nombre'),carrera:career,motivo:st?'Carrera diferente':'No pertenece a la nómina'});
   else matches.push({id,tutor:val(row,'Tutor'),sede:val(row,'Sede'),fecha:val(row,'Fecha de vinculación')});
  }
  if(!matches.length)throw Error('No hay cédulas con carrera coincidente en la base local.');
  const outside=matches.filter(x=>/2026/.test(x.fecha)&&/\/0?[4-9]\/2026|\/1[0-2]\/2026/.test(x.fecha));
  const note=outside.length?' ATENCIÓN: existen fechas de vinculación posteriores al cierre de marzo de 2026; verifica la pertenencia a la cohorte.':'';
  if(!confirm('Se conciliarán '+matches.length+' estudiantes por cédula y carrera; '+unmatched.length+' quedarán sin vincular.'+note+' ¿Confirmas la clasificación como Trabajo de Titulación?'))return;
  const next=Data.migrate(state),byId=new Map(matches.map(x=>[x.id,x]));
  for(const st of next.estudiantes){const x=byId.get(st.id);if(!x)continue;st.tipoTitulacion='trabajo';
   if(x.tutor)st.tutorTrabajo=x.tutor;if(x.fecha)st.fechaVinculacionTrabajo=x.fecha;
   if(x.sede&&!st.sede)st.sede=x.sede;st.origenTrabajo=file.name;}
  for(const row of unmatched)next.complementarios.push({fuente:file.name,tipo:'trabajo_sin_conciliar',registro:row,estado:row.motivo});
  next.importaciones.push({nombre:file.name,tipo:'listado_trabajo',filas:rows.length,coincidentes:matches.length,noConciliados:unmatched.length,fecha:today()});
  next.auditoria.push({tipo:'clasificacion_trabajo',fecha:today(),fuente:file.name,estudiantes:matches.map(x=>x.id)});
  await Store.save(next);state=next;draw();notify('Trabajo de Titulación: '+matches.length+' clasificados; '+unmatched.length+' sin conciliar.');
 }catch(e){console.error(e);notify('Listado de Trabajo de Titulación: '+e.message)}
 finally{ev.target.value=''}
}

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
async function action(code){switch(code){case"student-file":el("student-file").click();break;case"trabajo-file":el("trabajo-file").click();break;case"cursos-file":el("cursos-file").click();break;case"logo-file":el("logo-file").click();break;case"remove-logo":{
 if(state.config.logoDataUrl&&confirm("¿Quitar el logotipo institucional de ambos informes?")){
  const next=Data.migrate(state);delete next.config.logoDataUrl;
  await Store.save(next);state=next;draw();notify("Logotipo quitado de ambos informes.");
 }
}break;case"backup-file":el("backup-file").click();break;case"preview-notes":await parseGradeAndSave(false);break;case"save-notes":await parseGradeAndSave(true);break;case"export-json":download("Informetit_base_local_"+today()+".json","application/json;charset=utf-8",JSON.stringify(state,null,2));break;case"clear-db":if(confirm("¿Eliminar todas las notas, estudiantes y demás datos almacenados en ESTE navegador? Asegúrate de haber exportado un respaldo.")){state=initial();await persist();draw();notify("Base local vaciada")}break;case"preview-eval":case"save-eval":{
 const id=el("eval-id")?.value;
 if(!id){notify("Selecciona un estudiante de Examen Complexivo.");break}
 const i={ordTeoria:el("eval-one")?.value,ordPractica:el("eval-two")?.value,
   ordAsistencia:el("eval-ord-att")?.value||"pendiente",supTeoria:el("eval-sup-one")?.value,
   supPractica:el("eval-sup-two")?.value,supFinal:el("eval-rescue")?.value,
   supAsistencia:el("eval-sup-att")?.value||"pendiente",
   actaOrdinario:el("eval-source")?.value,actaSupletorio:el("eval-sup-source")?.value};
 try{
   const planned=window.InformetitComplexivo.upsert(state,id,i,today());
   if(code==="preview-eval"){
     const result=planned.result;
     notify("Ordinario "+window.InformetitComplexivo.num(result.ordinary)+
       " · Supletorio "+window.InformetitComplexivo.num(result.recovery)+
       " · Definitiva "+window.InformetitComplexivo.num(result.finalGrade)+
       " · "+(window.InformetitComplexivo.DESCRIPTIONS[result.status]||result.status));
   }else{
     await Store.save(planned.next);state=planned.next;evaluationStudentId=id;draw();
     notify("Examen Complexivo guardado. Resultado y antecedentes registrados en auditoría.");
   }
 }catch(error){notify("Evaluación: "+error.message)}
}break;case"preview-eval-import":{
 try{
  const raw=el("exam-import-text")?.value||"";
  const result=window.InformetitExamImport.assess(raw,state,tab);
  examImportText=raw;examImportStage={text:raw,mode:tab,result};
  draw();
  notify("Tabla revisada: "+result.counts.ready+" registros listos y "+result.counts.skipped+" por revisar.");
 }catch(error){examImportStage=null;notify("Importación de exámenes: "+error.message)}
}break;
case"apply-eval-import":{
 if(!examImportStage||examImportStage.mode!==tab||examImportStage.text!==(el("exam-import-text")?.value||"")){
  notify("La tabla o modalidad cambió. Analiza de nuevo antes de guardar.");break;
 }
 try{
  const latest=window.InformetitExamImport.assess(examImportStage.text,state,tab);
  const results=window.InformetitExamImport.apply(state,latest,today());
  await Store.save(results.next);state=results.next;
  examImportStage=null;examImportText="";draw();
  notify("Complexivo: "+results.stats.added+" evaluaciones incorporadas; "+results.stats.skipped+" filas sin modificar.");
 }catch(error){console.error(error);notify("No se guardó el lote: "+error.message)}
}break;case"preview-work":case"save-work":{
 try{
  const form=workInput(),planned=window.InformetitTrabajo.upsert(state,form.id,form.entry,today());
  if(code==="preview-work"){
   const r=planned.result;
   notify("Escrito "+window.InformetitTrabajo.fmt(r.written)+" · Práctica "+window.InformetitTrabajo.fmt(r.practical)+
   " · Defensa "+window.InformetitTrabajo.fmt(r.defense)+" · Oral "+window.InformetitTrabajo.fmt(r.oral)+
   " · Final "+window.InformetitTrabajo.fmt(r.definitive)+" · "+
   (window.InformetitTrabajo.STATES[r.status]||r.status));
  }else{
   await Store.save(planned.next);state=planned.next;trabajoStudentId=form.id;draw();
   notify("Rúbrica de Trabajo de Titulación guardada con auditoría local.");
  }
 }catch(error){notify("Trabajo de Titulación: "+error.message)}
}break;case"doc":download("Informe_"+tab+"_"+today()+".doc","application/msword;charset=utf-8",'<html><head><meta charset="utf-8"><style>body{font-family:Arial}table{border-collapse:collapse;width:100%}td,th{border:1px solid #777;padding:6px}h1{text-align:center;font-size:18pt}h2{font-size:14pt}</style></head><body>'+reportBody(tab,true)+'</body></html>');break;case"pdf":if(window.InformetitFullReport){try{notifyPdfResult(await window.InformetitFullReport.download(state,tab))}catch(e){notify("No se pudo generar PDF: "+e.message)}}else notify("Informe institucional no disponible.");break;case"preview-current":case"preview-presencial":case"preview-online":{const m=code==="preview-current"?tab:code==="preview-online"?"online":"presencial";try{showReportPreview(m)}catch(e){notify("No se pudo abrir la vista previa: "+e.message)}break}case"draft-presencial":case"draft-online":{const mode=code==="draft-online"?"online":"presencial";if(window.InformetitFullReport){try{const result=await window.InformetitFullReport.download(state,mode);notifyPdfResult(result);}catch(err){notify("Error al generar el informe: "+err.message);console.error(err)}}else notify("Generador institucional no disponible.");break}case"print":if(window.InformetitFullReport){try{notifyPdfResult(await window.InformetitFullReport.download(state,tab))}catch(e){notify("No se pudo generar PDF: "+e.message)}}else notify("Informe institucional no disponible.");break;}}
document.addEventListener("click",async ev=>{let nav=ev.target.closest("[data-page]");if(nav){page=nav.dataset.page;query="";lastParse=null;draw();return}let m=ev.target.closest("[data-mode]");if(m){tab=m.dataset.mode;lastParse=null;examImportStage=null;evaluationStudentId="";trabajoStudentId="";draw();return}let cmd=ev.target.closest("[data-action]");if(cmd){if(cmd.dataset.action.startsWith("firebase-"))await firebaseAction(cmd.dataset.action);else await action(cmd.dataset.action);return}let pending=ev.target.closest("[data-link-unmatched]");if(pending){
 const idx=Number(pending.dataset.linkUnmatched),record=state.sinVincular[idx];
 if(!record)return;
 const studentId=el("unmatched-student-"+idx)?.value;
 if(!studentId){notify("Selecciona primero un estudiante de la nómina.");return}
 const chosen=state.estudiantes.find(x=>String(x.id)===String(studentId));
 if(!chosen)return;
 if(!confirm("¿Vincular esta nota de Moodle a "+chosen.nombre+" ("+chosen.id+")? Comprueba su identidad antes de continuar."))return;
 try{
  const result=window.InformetitMoodle.linkPending(state,idx,studentId,today());
  await Store.save(result.next);state=result.next;draw();
  notify(result.status==="conflict"?"Vínculo registrado; existe una discrepancia para resolver en Datos y respaldo.":"Registro vinculado y archivado en auditoría.");
 }catch(error){console.error(error);notify("No se pudo vincular: "+error.message)}
 return;
}
let conflict=ev.target.closest("[data-use-conflict], [data-keep-conflict]");if(conflict){
 const useNew=conflict.hasAttribute("data-use-conflict"),i=Number(useNew?conflict.dataset.useConflict:conflict.dataset.keepConflict);
 const c=state.conflictos[i];if(!c)return;
 const description=useNew?"¿Utilizar la nueva calificación y conservar la anterior solo en auditoría?":"¿Conservar la calificación anterior y archivar la nueva solo en auditoría?";
 if(!confirm(description))return;
 try{
  const candidate=window.InformetitMoodle.resolveConflict(state,i,useNew?"new":"current",today());
  await Store.save(candidate);state=candidate;draw();notify("Conflicto resuelto y registrado en la auditoría.");
 }catch(e){console.error(e);notify("No se resolvió el conflicto: "+e.message)}
}});
document.addEventListener("input",ev=>{if(ev.target.id==="student-search"){query=ev.target.value;let pos=ev.target.selectionStart;draw();let search=el("student-search");search.focus();search.setSelectionRange(pos,pos)}if(ev.target.id==="moodle-text"){inputText=ev.target.value;lastParse=null}if(ev.target.id==="exam-import-text"){examImportText=ev.target.value;examImportStage=null}});
document.addEventListener("change",async ev=>{let field=ev.target;if(field.dataset.studentType){let s=state.estudiantes.find(x=>x.id===field.dataset.studentType);if(s){s.tipoTitulacion=field.value;await persist();notify("Modalidad de titulación actualizada.")}}else if(field.hasAttribute("data-work-student")){trabajoStudentId=field.value;draw()}else if(field.hasAttribute("data-eval-select")){evaluationStudentId=field.value;draw()}else if(field.hasAttribute("data-nucleus-career")){nucleusCareerKey=field.value;draw()}else if(field.hasAttribute("data-requirement-filter")){reqFilter=field.value;draw()}else if(field.hasAttribute("data-status-filter")){reqStatus=field.value;draw()}else if(field.hasAttribute('data-program-date')){
 const index=field.dataset.programDate,fieldName=field.dataset.programType;
 if(!['inicio','fin'].includes(fieldName)||!index)return;
 if(!state.cronogramaPersonalizado)state.cronogramaPersonalizado={};
 const current={...(state.cronogramaPersonalizado[index]||{})};
 current[fieldName]=field.value;
 state.cronogramaPersonalizado[index]=current;
 await persist();notify('Cronograma actualizado para el informe.');
}else if(field.dataset.schedule){state.ejecucion[field.dataset.schedule]=field.value;await persist();notify("Ejecución registrada.")}else if(field.hasAttribute('data-code-prefix')){
 const key=field.dataset.codePrefix;
 if(!['codigoPresencial','codigoOnline'].includes(key))return;
 const candidate=window.InformetitCodigo.prefix(field.value);
 const check=window.InformetitCodigo.validity(candidate);
 if(candidate&&!check.valid){notify(check.reason);draw();return}
 state.config[key]=candidate;
 await persist();draw();notify("Código de "+(key==='codigoOnline'?'online':'presencial')+" actualizado con el mes automático.");
}else if(field.dataset.config){state.config[field.dataset.config]=field.type==="checkbox"?field.checked:field.value;await persist();draw()}});
el("student-file").addEventListener("change",handleFiles);el("backup-file").addEventListener("change",handleFiles);
el("trabajo-file").addEventListener("change",handleTrabajoFile);
el("cursos-file").addEventListener("change",handleCursosFile);
el("firebase-file").addEventListener("change",firebaseLoadFile);
el("logo-file").addEventListener("change",async ev=>{const file=ev.target.files?.[0];if(!file)return;try{if(!["image/png","image/jpeg","image/webp"].includes(file.type))throw Error("Solo se admiten archivos PNG, JPG o WebP.");if(file.size>2000000)throw Error("La imagen debe tener menos de 2 MB.");const dataURL=await new Promise((res,rej)=>{let fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(new Error("No se pudo leer imagen."));fr.readAsDataURL(file)});if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(dataURL))throw Error("Imagen no reconocida; utiliza PNG, JPG o WebP.");const next=Data.migrate(state);next.config.logoDataUrl=dataURL;await Store.save(next);state=next;draw();notify("Logotipo guardado para la portada y encabezado de ambos PDF.");}catch(e){notify(e.message)}finally{ev.target.value=""}});
(async()=>{state=await load();try{const imported=await loadPrivateGPT();if(imported&&!imported.unchanged){console.info("Base GPT privada disponible:",imported.students,"estudiantes nuevos,",imported.grades,"notas nuevas.")}}catch(e){console.error("No se pudo cargar la base GPT privada:",e);notify("No se pudo cargar la base GPT local: "+e.message)}ready=true;draw()})().catch(e=>{el("main").textContent="No fue posible iniciar Informetit: "+e.message});
})();
