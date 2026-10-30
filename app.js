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
let firebaseConnection=null,firebaseMessage="",firebaseBackups=[],chatgptStatus=null;
let studentImportStage=null;
let smartText="",smartStage=null,smartCareer="auto",smartNucleus="auto",smartFilter="todos",smartReviewed=false;
let mechanismBatchStage=null,interpolationTarget=null;
let homeScope="";
let loadMethod="global",manualType="nucleo",manualMode="presencial",manualCareer="",manualStudentId="",manualNucleus="1";
let flowCareer="CONTABILIDAD",flowStage=null;
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
  // La base local existente manda; solo recuperar GPT si la instalación está vacía.
  if(state.estudiantes.length||state.notas.length)return {unchanged:true,students:0,grades:0};
  const file=await window.informetitDesktop.loadMasterData();
  if(!file?.data)return null;
  // La copia autoguardada ya refleja IndexedDB; solo recuperarla si la base está vacía.
  if((file.autoSaved||file.filename==="base-gpt-autosave.json")&&state.estudiantes.length)
    return {unchanged:true,students:0,grades:0};
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
/* Inicio operativo: muestra únicamente cargas por carrera. Los pendientes no son reprobaciones. */
function taskRow(item){
 return '<div class="work-task"><div class="work-task-body"><strong>'+h(item.label)+
  '</strong><span class="work-task-detail">'+h(item.detail)+'</span></div>'+
  '<span class="work-task-count">'+h(item.count)+' pendientes</span>'+
  '<button class="btn small" data-queue-id="'+h(item.id)+'">Abrir</button></div>';
}
function inicio(){
 const engine=window.InformetitWorkQueue;
 if(!engine)return head('Pendientes de carga','No se encontró el motor de seguimiento.');
 const queue=engine.build(state);
 if(!queue.hasRoster){
  return head('Qué falta cargar','Primero necesitamos la información individual de esta computadora.')+
   '<section class="panel work-onboarding"><div class="work-onboarding-icon" aria-hidden="true">↑</div>'+
   '<h2>Subir listado de estudiantes</h2>'+
   '<p>Para saber qué núcleo o evaluación falta, carga primero el Excel de estudiantes del período. Es un paso que se realiza una sola vez.</p>'+
   '<div class="actions"><button class="btn primary" data-action="student-file">Seleccionar Excel de estudiantes</button>'+
   '<button class="btn" data-page="carga">Ver otras opciones de carga</button></div></section>';
 }
 const chosen=queue.careers.find(c=>c.id===homeScope)||
  queue.careers.find(c=>queue.upload.some(t=>t.scope===c.id))||queue.careers[0];
 if(!chosen)return head('Qué falta cargar','No se encontraron carreras en el padrón local.');
 homeScope=chosen.id;
 const F=window.InformetitSequentialNuclei;
 let currentNucleus=null;
 try{currentNucleus=F?.progress(state,chosen.career)?.current??null}catch{}
 const loads=queue.upload.filter(x=>x.scope===chosen.id&&(!x.nucleus||Number(x.nucleus)===currentNucleus));
 const reviews=queue.review.filter(x=>x.scope===chosen.id||x.scope==='global');
 let out=head('Qué falta cargar','Selecciona una carrera y resuelve los pendientes uno por uno.');
 out+='<section class="panel upload-panel"><h2>Carga guiada de núcleos</h2>'+
  '<p class="hint">Se completa un núcleo por vez: descarga el Excel con la nómina local, revísalo, súbelo y valida las diferencias. Solo después aparece el siguiente.</p>'+
  '<button class="btn primary" data-page="flujo">Abrir asistente por carrera</button></section>';
 out+='<div class="work-toolbar"><label class="field" for="home-scope">Carrera y modalidad'+
  '<select id="home-scope">'+queue.careers.map(g=>'<option value="'+h(g.id)+'"'+
   (g.id===chosen.id?' selected':'')+'>'+h(g.career)+' · '+(g.mode==='online'?'Online':'Presencial')+
   '</option>').join('')+'</select></label>'+
  '<span class="work-total">'+h(chosen.total)+' estudiantes en la nómina local</span></div>';
 out+='<section class="panel work-list"><div class="work-heading"><div><h2>Información por cargar</h2>'+
   '<p class="hint">Solo datos realmente ausentes, no calificaciones reprobadas ni registros preliminares.</p></div>'+
   '<strong class="work-number">'+loads.length+'</strong></div>';
 if(loads.length)out+=loads.map(taskRow).join('');
 else if(reviews.length)out+='<div class="work-empty">No faltan archivos identificados, pero hay registros por clasificar o cotejar.</div>'+
  reviews.map(taskRow).join('');
 else out+='<div class="work-empty">No se identificaron cargas ni revisiones pendientes para esta carrera.</div>';
 out+='</section>';
 if(loads.length&&reviews.length)out+='<details class="panel work-review"><summary>Requieren revisión ('+reviews.length+
  ')</summary><p class="hint">Estos datos ya existen o necesitan una decisión; no vuelvas a cargarlos sin cotejarlos.</p>'+
  reviews.map(taskRow).join('')+'</details>';
 return out;
}
function estudiantes(){
 const Req=window.InformetitRequirements;
 if(!Req)return head("Requisitos","El motor de requisitos no está disponible.");
 const a=Req.analyze(state,tab),individual=a.source==='individual';
 const per=x=>x===null?"—":num(x)+" %";
 let out=head("Fase I · Estudiantes y requisitos",
   "Cumplimiento, verificaciones pendientes, carrera, continuidad y casos individuales.",
   switcher()+'<button data-action="student-file" class="btn primary">Importar Excel</button>');
 out+=renderStudentImportPreview();
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
  out+='<section class="panel"><h2>Nómina y mecanismo de titulación</h2><p class="hint">El mecanismo se confirma individualmente; importar requisitos no clasifica a nadie como Complexivo.</p>'
    +table(["Cédula","Estudiante","Carrera","Mecanismo","Controles"],visible.map(st=>{
      const completeReq=Req.studentStatus(st).complete;
      return '<tr>'+td(st.id)+td(st.nombre)+td(st.carrera)
      +'<td><select class="control" data-student-type="'+h(st.id)+'">'
      +'<option value="sin_definir"'+(st.tipoTitulacion==="sin_definir"?" selected":"")+'>Sin definir</option>'
      +'<option value="complexivo"'+(st.tipoTitulacion==="complexivo"?" selected":"")+'>Examen Complexivo</option>'
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
  +'<label class="field block"><input type="checkbox" id="moodle-confirm"> Confirmo que revisé esta exportación de Moodle, su núcleo, carrera e identidades, y autorizo utilizar sus notas finales verificadas.</label>'
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
     selected.nuclei.map(n=>'<tr>'+td("Núcleo "+n.number+(n.title?" — "+n.title:""))+td(n.gradeCount)
     +td(n.pendingCount)+td(n.conflictCount)+td(num(n.summary.mean))
     +td(num(n.summary.median))+td(num(n.summary.sd))+'</tr>'));
  const named=new Map();
  for(const x of selected.nuclei)for(const person of [...x.entries,...x.pending,...x.unresolved])
    named.set(person.id,person.name);
  const people=[...named].map(([id,name])=>({id,name}))
    .sort((a,b)=>a.name.localeCompare(b.name,'es')||a.id.localeCompare(b.id));
  const combined=selected.nuclei.map(n=>({
    entries:new Map(n.entries.map(x=>[x.id,x])),conflicts:new Set(n.unresolved.map(x=>x.id))
  }));
  const graphic=(title,parts,maximum)=>{
    const max=Math.max(1,Number(maximum)||0,...parts.map(x=>Number(x[1])||0));
    return '<div class="block"><h4>'+h(title)+'</h4>'+
     parts.map(([label,value])=>{
       const width=Math.max(0,Math.min(100,100*(Number(value)||0)/max));
       return '<div class="block"><div class="row between"><span>'+h(label)+'</span><b>'+h(value)+'</b></div>'+
        '<div class="progress"><div style="width:'+width.toFixed(2)+'%"></div></div></div>';
     }).join('')+'</div>';
  };
  out+='<h3>'+h(selected.name)+'</h3>'+
  (window.InformetitNucleiCatalog?.lookup(selected.name)?
   '<div class="block"><h4>Mapa de repaso de los cuatro núcleos</h4>'+
    window.InformetitNucleiMethodology.diagram(window.InformetitNucleiCatalog.lookup(selected.name))+
    '<p class="hint">Denominaciones facilitadas por coordinación; temas de repaso sujetos a validación curricular.</p></div>':'')+
  '<p class="hint">La vista se organiza en cuatro núcleos y el consolidado final de esta carrera. Se muestran estudiantes clasificados en Examen Complexivo, incluidos los que tienen calificaciones pendientes.</p>';
  if(selected.unclassified)out+='<div class="warnbox block">'+selected.unclassified+
   ' estudiantes de esta carrera no tienen un mecanismo confirmado. No se atribuyen automáticamente a Examen Complexivo.</div>';
  for(const n of selected.nuclei){
   const grades=new Map(n.entries.map(x=>[x.id,x]));
   const conflicts=new Set(n.unresolved.map(x=>x.id));
   out+='<div class="block"><h3>Núcleo '+n.number+(n.title?' — '+h(n.title):'')+' · '+h(selected.name)+'</h3>'+interpolationButton(tab,selected.name,n.number)+interpolationPanel(tab,selected.name,n.number)
    +'<p class="hint">'+h(window.InformetitNuclei.narrative(selected,n))+'</p>';
   out+=table(['N.º','Estudiante','Cédula','Nota final','Estado','Fuente'],
    people.map((person,i)=>{
      const score=grades.get(person.id);
      return '<tr>'+td(i+1)+td(person.name)+td(person.id)+
       td(score?num(score.grade):'—')+
       td(conflicts.has(person.id)?'En conflicto':score?'Verificada':'Pendiente')+
       td(score?(score.sourceDetail||score.source):conflicts.has(person.id)?'Por conciliar':'Sin fuente verificada')+
       '</tr>';
    }));
   out+='<p class="hint">Notas nominales: '+n.gradeCount+' · pendientes: '+n.pendingCount+
    ' · conflictos: '+n.conflictCount+' · media: '+num(n.summary.source==='individual'?n.summary.mean:null)+
    ' · mediana: '+num(n.summary.source==='individual'?n.summary.median:null)+
    ' · mínimo: '+num(n.summary.source==='individual'?n.summary.min:null)+
    ' · máximo: '+num(n.summary.source==='individual'?n.summary.max:null)+'.</p>';
   if(selected.eligible>0)
    out+=graphic('Gráfico de cobertura del Núcleo '+n.number,
     [['Con nota',n.gradeCount],['Pendiente',n.pendingCount],['Conflicto',n.conflictCount]],
     selected.eligible);
   if(n.summary.source==='individual'&&n.summary.bands){
    out+=table(['Rango de notas','Estudiantes','Porcentaje'],
      n.summary.bands.map(x=>'<tr>'+td(x.label)+td(x.count)+td(num(x.pct)+' %')+'</tr>'));
    out+=graphic('Gráfico de distribución del Núcleo '+n.number,
       n.summary.bands.map(x=>[x.label,x.count]),n.summary.n);
   }
   out+='</div>';
  }
  const full=[],partial=[],empty=[];
  const consolidated=people.map((person,i)=>{
    const values=combined.map(m=>m.entries.get(person.id)?.grade??null),
       conflict=combined.some(m=>m.conflicts.has(person.id)),
       complete=values.every(x=>x!==null)&&!conflict;
    const mean=complete?values.reduce((a,b)=>a+b,0)/4:null;
    if(complete)full.push(mean);
    else if(values.some(v=>v!==null))partial.push(person.id);
    else empty.push(person.id);
    return '<tr>'+td(i+1)+td(person.name)+td(person.id)+values.map((v,j)=>
      td(combined[j].conflicts.has(person.id)?'Conflicto':v===null?'Pendiente':num(v))).join('')+
      td(mean===null?'—':num(mean))+td(complete?'Completo':conflict?'En conflicto':'Incompleto')+'</tr>';
  });
  out+='<div class="block"><h3>Consolidado de '+h(selected.name)+'</h3>'
   +'<p class="hint">Las cuatro notas se reúnen por estudiante. La media simple solo aparece cuando N1, N2, N3 y N4 están completos y sin conflicto. No es la nota definitiva del Examen Complexivo.</p>'
   +table(['N.º','Estudiante','Cédula','N1','N2','N3','N4','Media simple','Estado'],consolidated)
   +'<p><b>Expedientes con cuatro notas:</b> '+full.length+' de '+(selected.eligible??0)+
     ' · <b>Parciales:</b> '+partial.length+' · <b>Sin notas:</b> '+empty.length+'.</p>';
  const means=selected.nuclei.filter(n=>n.summary.source==='individual'&&n.summary.mean!==null)
    .map(n=>['Núcleo '+n.number,n.summary.mean]);
  if(means.length)out+=graphic('Gráfico comparativo de medias por núcleo',means,10);
  if(selected.eligible>0)
    out+=graphic('Gráfico de cobertura del consolidado',
       [['Cuatro notas',full.length],['Parciales',partial.length],['Sin notas',empty.length]],
       selected.eligible);
  out+='</div>';
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
     +'</div><label class="field"><input type="checkbox" id="eval-acta-cotejada"'+(record?.actaCotejada?' checked':'')+'> Confirmo que cotejé las actas originales y sus calificaciones. Las actas cotejadas se guardan en la base local; Firebase solo respalda con botón.</label>';
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
function chatgptPanel(){
 const c=chatgptStatus||{},backup=Store.lastBackup?.(),result=backup?.bridge;
 const stateLabel=c.enabled?('Carpeta configurada: '+h(c.folder||'')+'. '+
   (c.exists?'Existe en el equipo.':'No está disponible en el equipo.')+
   (result?.enabled&&result.ok===false?' Última actualización fallida.':'')):
   'Sin carpeta conectada. La base GPT local se sigue generando en el perfil privado.';
 return '<section class="panel"><h2>Base GPT · Conexión privada con ChatGPT</h2>'+
  '<p>Informetit actualiza automáticamente una copia de los datos en código. Para consultarla en ChatGPT sin subir archivos cada vez, selecciona una sola vez una carpeta sincronizada con Google Drive, Dropbox u OneDrive y conecta ese servicio también en ChatGPT.</p>'+
  '<p class="hint">Incluye cédulas y calificaciones: utiliza exclusivamente una carpeta privada. Nunca un repositorio público de GitHub.</p>'+
  '<p class="hint">'+stateLabel+'</p>'+
  '<div class="actions"><button class="btn primary" data-action="chatgpt-choose">Vincular carpeta para ChatGPT</button>'+
  (c.enabled?'<button class="btn" data-action="chatgpt-disable">Desvincular carpeta</button>':'')+'</div>'+
  '<p class="hint">Se generan informetit-chatgpt.json y base-gpt.cjs en la carpeta elegida en cada guardado. La aplicación no verifica por sí sola si tu proveedor los subió a la nube o si ChatGPT tiene autorización para leerlos.</p></section>';
}
async function chatgptAction(code){
 const bridge=window.informetitDesktop;
 try{
  if(!bridge?.chatgptStatus)throw Error('Requiere Informetit Desktop.');
  if(code==='chatgpt-choose'){
   if(!confirm('La carpeta que elijas recibirá una copia COMPLETA con datos privados de estudiantes. Debe ser una carpeta personal sincronizada y accesible solo para ti. ¿Continuar?'))return;
   const result=await bridge.chatgptSelectFolder(state);
   if(result?.canceled)return;
   chatgptStatus=await bridge.chatgptStatus();draw();
   notify(result?.ok?'Carpeta GPT vinculada. Comprueba que se sincronice con tu proveedor.':
    'No se pudo crear la copia: '+(result?.reason||'error desconocido'));
  }
  if(code==='chatgpt-disable'){
   if(!confirm('Se detendrán las actualizaciones a la carpeta, pero los archivos existentes permanecerán allí. ¿Desvincular?'))return;
   await bridge.chatgptDisable();chatgptStatus=await bridge.chatgptStatus();draw();
   notify('Carpeta GPT desvinculada; la base local continúa sin cambios.');
  }
 }catch(e){console.error(e);notify('Base GPT: '+e.message)}
}

function data(){
const quality=Data.audit(state),p=Data.analyze(state,"presencial"),o=Data.analyze(state,"online");
const problems=quality.issues.length?quality.issues.slice(0,30).map(x=>'<tr>'+td(x.type.replace(/_/g," "))+td(x.student)+'</tr>'):['<tr><td colspan="2">No hay incidencias de integridad detectadas.</td></tr>'];
return head("Base maestra local","Bloque 01 · Persistencia, integridad y cálculos unificados.")
+'<section class="panel"><h2>Estado de la base maestra</h2>'
+'<div class="cards">'+card("Versión de estructura",state.version||Data.SCHEMA_VERSION)+card("Presencial",p.total)+card("Online",o.total)+card("Incidencias",quality.issues.length)+'</div>'
+'<p class="hint">Origen de los cálculos: datos individuales locales. Si la nómina privada no está instalada, la app conserva solo el resumen institucional agregado por separado.</p>'
+table(["Control","Registro"],problems)+'</section>'
+head("Datos y respaldo","Importación manual opcional y copia de seguridad.")+chatgptPanel()+'<div class="grid2"><section class="panel"><h2>Importar</h2><p>Importa la base maestra JSON preparada desde ChatGPT o el archivo institucional original XLS/HTML/XLSX.</p><div class="actions"><button class="btn primary" data-action="backup-file">Importar JSON maestro</button><button class="btn" data-action="student-file">Importar Excel de estudiantes</button></div><p class="hint">La importación de JSON reemplaza la base local previa. Descarga antes una copia de seguridad si ya has registrado cambios.</p></section><section class="panel"><h2>Exportar respaldo</h2><p>Descarga estudiantes, notas, resultados, cronogramas verificados, observaciones y conflictos. Podrás compartir este JSON en el chat para que prepare una versión actualizada.</p><div class="actions"><button class="btn primary" data-action="export-json">Descargar JSON</button><button class="btn danger" data-action="clear-db">Vaciar base local</button></div></section></div><section class="panel"><h2>Estado de la base</h2><div class="cards">'+card("Estudiantes",state.estudiantes.length)+card("Notas de núcleos",state.notas.length)+card("Rúbricas de proyectos",state.trabajos.length)+card("Conflictos",state.conflictos.length)+card("Sin vincular",state.sinVincular.length)+'</div><h3>Importaciones</h3>'+table(["Fuente","Tipo","Filas","Fecha"],state.importaciones.map(i=>'<tr>'+td(i.nombre)+td(i.tipo)+td(i.filas)+td(i.fecha)+'</tr>'))+'<h3>Complementarios pendientes de conciliar</h3>'+table(["Fuente","Registro","Estado"],state.complementarios.map(x=>'<tr>'+td(x.fuente)+td(x.registro?.Nombre||x.registro?.nombre||"Sin nombre")+td(x.estado||"Por conciliar")+'</tr>'))+'<h3>Notas en conflicto</h3>'+table(["Estudiante","Núcleo","Actual","Nueva","Decisión"],state.conflictos.map((c,i)=>'<tr>'+td(c.id?.split("|")[0])+td(c.nuevo?.nucleo)+td(num(c.anterior?.nota))+td(num(c.nuevo?.nota))+'<td><button class="btn small" data-use-conflict="'+i+'">Usar nueva</button> <button class="btn small" data-keep-conflict="'+i+'">Conservar actual</button></td></tr>'))+'</section><section class="panel"><h2>Privacidad y límites</h2><p class="privacy">Los datos se guardan en IndexedDB (o localStorage de respaldo) de este navegador, no en GitHub. Borrar datos del navegador puede eliminarlos. Descarga copias JSON y almacénalas en un lugar privado. ChatGPT no puede modificar directamente el contenido guardado dentro de tu navegador: para aplicar cambios realizados aquí, importa el archivo JSON actualizado.</p></section>'}

function firebaseView(){
 const connected=!!firebaseConnection?.connected;
 const options=firebaseBackups.map(b=>'<option value="'+h(b.id)+'">'+h(b.createdAt||b.id)+
  ' · '+h(b.periodo||'Sin período')+' · '+h(b.students)+' estudiantes</option>').join('');
 return head('Firebase · Respaldo manual','Copia completa privada; no hay sincronización automática.')+
  '<section class="panel"><h2>Conexión autorizada</h2>'+
  '<p>Firebase solamente almacena o recupera una copia completa cuando presionas el botón. No modifica notas, matrículas ni requisitos en las colecciones académicas existentes.</p>'+
  '<div class="cards">'+card('Conexión',connected?'Autorizada':'Desconectada')+
   card('Copias disponibles',firebaseBackups.length)+card('Estudiantes locales',state.estudiantes.length)+'</div>'+
  '<div class="actions"><button class="btn" data-action="firebase-adc">Conectar con Google</button>'+
  '<button class="btn" data-action="firebase-credential">Usar credencial local</button>'+
  '<button class="btn" data-action="firebase-list"'+(connected?'':' disabled')+'>Actualizar lista</button></div>'+
  '<p class="hint">Proyecto utet-4387a · colección informetit_backups. Sin tareas automáticas de red.</p></section>'+
  '<section class="panel"><h2>Subir respaldo completo</h2>'+
  '<p>Se comprime y cifra toda la base antes de salir de tu equipo. Necesitarás la misma clave de al menos 12 caracteres para recuperarla; no se almacena.</p>'+
  '<label class="field block">Clave privada <input id="firebase-secret" type="password" minlength="12" autocomplete="off" placeholder="Mínimo 12 caracteres"></label>'+
  '<label class="field block">Repite la clave <input id="firebase-secret-confirm" type="password" minlength="12" autocomplete="off" placeholder="Confirma la clave"></label>'+
  '<div class="actions"><button class="btn primary" data-action="firebase-upload"'+(connected?'':' disabled')+'>Subir respaldo a Firebase</button></div></section>'+
  '<section class="panel"><h2>Bajar y recuperar respaldo</h2>'+
  '<p>Se validará el respaldo antes de restaurarlo y se guardará una copia de tu base actual por seguridad.</p>'+
  '<label class="field block">Respaldo <select id="firebase-backup-id">'+(options||'<option value="">Sin copias disponibles</option>')+'</select></label>'+
  '<label class="field block">Clave del respaldo <input id="firebase-restore-secret" type="password" minlength="12" autocomplete="off" placeholder="Clave utilizada al subirlo"></label>'+
  '<div class="actions"><button class="btn danger" data-action="firebase-restore"'+(connected&&firebaseBackups.length?'':' disabled')+'>Bajar y recuperar respaldo</button></div>'+
  '<p class="hint" role="status">'+h(firebaseMessage||'Sin operaciones. Firebase no se ejecuta en segundo plano.')+'</p></section>';
}
function scheduleFirebaseSync(){/* Respaldo únicamente manual; sin tareas automáticas. */}
async function firebaseAction(code){
 const bridge=window.informetitDesktop;
 try{
  if(!bridge?.firebaseConnect||!bridge?.firebaseBackupUpload)throw Error('Usa Informetit Desktop para respaldos.');
  if(code==='firebase-adc'||code==='firebase-credential'){
   const connected=await bridge.firebaseConnect(code==='firebase-adc'?'adc':'service_account');
   if(connected?.canceled)return;
   firebaseConnection=connected;firebaseMessage='Conectado. No se ha enviado ninguna información.';
   if(connected?.connected)firebaseBackups=await bridge.firebaseBackupList();
   draw();return;
  }
  if(!firebaseConnection?.connected)throw Error('Conecta Firebase primero');
  if(code==='firebase-list'){
   firebaseBackups=await bridge.firebaseBackupList();
   firebaseMessage='Lista actualizada: '+firebaseBackups.length+' respaldos completos.';
   draw();return;
  }
  if(code==='firebase-upload'){
   const password=el('firebase-secret')?.value||'';
   if(password.length<12)throw Error('Usa una clave de al menos 12 caracteres');
   if(password!==(el('firebase-secret-confirm')?.value||''))throw Error('Las dos claves no coinciden');
   if(!confirm('Subir copia CIFRADA de toda la base ('+state.estudiantes.length+
    ' estudiantes) a Firebase, sin modificar la base local?'))return;
   firebaseMessage='Subiendo respaldo cifrado; evita cerrar la aplicación.';
   const result=await bridge.firebaseBackupUpload(state,password);
   if(!result?.confirmed)throw Error('La carga no fue confirmada');
   firebaseBackups=await bridge.firebaseBackupList();
   firebaseMessage='Respaldo confirmado: '+result.createdAt+' · '+result.students+' estudiantes.';
   draw();notify('Respaldo completo confirmado en Firebase.');return;
  }
  if(code==='firebase-restore'){
   const id=el('firebase-backup-id')?.value,password=el('firebase-restore-secret')?.value||'';
   if(!id||password.length<12)throw Error('Selecciona un respaldo e introduce su clave');
   const found=await bridge.firebaseBackupDownload(id,password);
   const restored=Data.migrate(found.data);
   const issues=Data.audit(restored).issues.filter(p=>['id_vacio','cedula_repetida'].includes(p.type));
   if(issues.length)throw Error('El respaldo tiene identificaciones duplicadas o inválidas');
   if(!confirm('Respaldo del '+found.metadata.createdAt+': '+restored.estudiantes.length+
    ' estudiantes, '+restored.notas.length+' notas. Tu base actual tiene '+
    state.estudiantes.length+' estudiantes. Se creará una copia privada previa y se REEMPLAZARÁ la base local. ¿Continuar?'))return;
   const checkpoint=await bridge.recoveryCheckpoint(state);
   if(!checkpoint?.saved)throw Error('No se creó el respaldo de recuperación previo');
   restored.firebaseSync={...restored.firebaseSync,enabled:false};
   await Store.save(restored);
   state=restored;flowStage=null;studentImportStage=null;smartStage=null;
   firebaseMessage='Restaurado; base anterior en '+checkpoint.name;
   page='inicio';draw();notify('Base recuperada; copia anterior guardada en el equipo.');
  }
 }catch(e){firebaseMessage='Firebase: '+e.message;console.error(e);if(page==='firebase')draw();notify(firebaseMessage)}
}

/* Proyección solo en pantalla: nunca forma parte de state, JSON, Firebase ni PDF. */
function interpolationKey(mode,career,nucleus){
 return mode+'|'+Data.career(career)+'|'+Number(nucleus);
}
function interpolationButton(mode,career,nucleus){
 const k=interpolationKey(mode,career,nucleus);
 return '<button type="button" class="btn small" data-interpolate="'+h(k)+'">'+
  (interpolationTarget===k?'Cerrar proyección':'Interpolar')+'</button>';
}
function interpolationPanel(mode,career,nucleus){
 const k=interpolationKey(mode,career,nucleus);
 if(interpolationTarget!==k)return '';
 const engine=window.InformetitInterpolation;
 if(!engine)return '<p class="hint">El simulador no está disponible.</p>';
 try{
  const x=engine.project(state,mode,career,nucleus);
  let html='<section class="panel"><h3>SIMULACIÓN — '+h(career)+' · Núcleo '+h(nucleus)+' · '+h(modeLabel(mode))+'</h3>'
   +'<p class="hint"><b>No es una calificación real ni se registra en la base.</b> Se calcula solo con notas identificadas y verificadas de estudiantes de Complexivo. Los proyectos no forman parte del denominador.</p>'
   +'<div class="cards">'+card('Estudiantes Complexivo',x.expected)+card('Notas verificadas',x.verified)
   +card('Sin nota',x.missing)+card('Con nota provisional',x.provisional)+card('Conflictos',x.conflicts)+'</div>';
  if(x.possible){
   html+='<div class="cards">'+card('Promedio real',num(x.realMean))
    +card('Proyección con media',num(x.projectedMean))
    +card('Valor simulado por faltante',num(x.estimatedValue))+'</div>'
    +'<p class="hint">Proyección hipotética de '+x.simulated+' notas faltantes usando la media de las '+x.verified+
    ' notas verificadas. La cobertura real permanece en '+x.verified+' de '+x.expected+'.</p>'
    +table(['Estudiante sin nota','Valor hipotético','Estado'],
      x.missingStudents.map(s=>'<tr>'+td(s.name)+td(num(x.estimatedValue))+td('SIMULADO · No registrar como nota')+'</tr>'));
  }else html+='<div class="warnbox block">La simulación requiere al menos una nota verificada y una nota realmente ausente. Las notas provisionales y los conflictos deben cotejarse; no se interpolan.</div>';
  html+='<p class="hint">Esta simulación desaparece al cerrarla o al cargar una nueva nota. Ningún valor interpolado se exporta ni sincroniza.</p>'
   +'<button class="btn" data-interpolate="'+h(k)+'">Cerrar simulación</button></section>';
  return html;
 }catch(err){return '<div class="warnbox block">'+h(err.message)+'</div>'}
}

/* Centro de Carga Inteligente: análisis primero; escritura privada solo al confirmar. */

function saveStatus(){
 const b=Store.lastBackup?.();
 let label='IndexedDB: base local de uso inmediato y sin internet. ';
 label+=b?.ok===true?'Base GPT local: actualizada. ':b?.ok===false?'Error en respaldo GPT local. ':'Base GPT: se genera al guardar. ';
 if(b?.bridge?.enabled)label+=b.bridge.ok?'Carpeta para ChatGPT: copia actualizada en el equipo. ':
  'Atención: no se pudo actualizar la carpeta para ChatGPT. ';
 label+='Firebase: solo respaldo manual, sin envío automático.';
 return '<div class="load-sync-status"><p class="hint" role="status">'+h(label)+'</p>'+
  '<button type="button" class="btn small" data-page="firebase">Respaldos Firebase</button></div>';
}

function manualView(){
 const catalogue=window.InformetitNucleiCatalog,groups=catalogue.list();
 const careers=[...new Map(state.estudiantes.filter(s=>s.modalidad===manualMode)
  .map(s=>[Data.career(s.carrera),s.carrera])).values()].sort((a,b)=>a.localeCompare(b,'es'));
 const selectedCareer=careers.find(s=>Data.career(s)===Data.career(manualCareer))||careers[0]||'';
 const available=state.estudiantes.filter(s=>s.modalidad===manualMode&&Data.career(s.carrera)===Data.career(selectedCareer));
 const selected=available.find(s=>s.id===manualStudentId)||available[0];
 const course=catalogue.list().find(x=>catalogue.canonical(x.name)===catalogue.canonical(selectedCareer));
 const set=(id,value,label)=>'<label class="field">'+label+'<select id="'+id+'">'+value+'</select></label>';
 const option=(value,label,current)=>'<option value="'+h(value)+'"'+(value===current?' selected':'')+'>'+h(label)+'</option>';
 let out='<section class="panel upload-panel"><h2>Formulario individual</h2>'+
  '<p class="hint">Completa o corrige un estudiante a la vez. Lo que ya esté registrado se conserva; cualquier nota diferente se marca para revisión.</p>'+
  '<div class="field-row">'+set('manual-type',
   [['nucleo','Nota de núcleo'],['requisito','Requisito'],['complexivo','Examen Complexivo'],['trabajo','Trabajo de Titulación']]
    .map(x=>option(x[0],x[1],manualType)).join(''),'¿Qué necesitas registrar?')+
   set('manual-mode',[['presencial','Presencial'],['online','Online']]
    .map(x=>option(x[0],x[1],manualMode)).join(''),'Modalidad')+'</div>';
 if(!state.estudiantes.length)return out+'<p>No hay estudiantes registrados. Sube primero el listado institucional de estudiantes.</p>'+
  '<div class="actions"><button class="btn primary" data-action="student-file">Subir listado Excel</button></div></section>';
 out+='<div class="field-row">'+set('manual-career',careers.map(s=>option(s,s,selectedCareer)).join(''),'Carrera')+
   set('manual-student',available.map(s=>option(s.id,s.nombre+' · '+s.id,selected?.id||'')).join(''),'Estudiante')+'</div>';
 if(!selected)return out+'<p>Sin estudiantes para esta selección.</p></section>';
 if(manualType==='complexivo'||manualType==='trabajo'){
  const expected=manualType==='complexivo'?'complexivo':'trabajo';
  if(selected.tipoTitulacion!==expected){
   out+='<p class="hint">Este estudiante figura como '+h(typeLabel(selected.tipoTitulacion))+
    '. Revisa su mecanismo en Estudiantes antes de registrar una evaluación.</p>'+
    '<button class="btn" data-page="estudiantes">Abrir Estudiantes</button>';
  }else{
   out+='<p class="hint">Se abrirá el formulario completo de '+(expected==='complexivo'?'Examen Complexivo':'Trabajo de Titulación')+
     ', con sus componentes, actas y verificación.</p>'+
    '<div class="actions"><button class="btn primary" data-action="manual-special">Abrir formulario de evaluación</button></div>';
  }
 }else if(manualType==='nucleo'){
  if(selected.tipoTitulacion!=='complexivo')out+='<p class="hint">Para registrar notas de núcleos, primero confirma que el estudiante pertenece a Examen Complexivo.</p>';
  const nuclei=course?.nuclei||[];
  const n=nuclei.some(x=>x.number===Number(manualNucleus))?String(manualNucleus):String(nuclei[0]?.number||1);
  const key=selected.id+'|'+n,
    current=[...(state.notas||[]),...(state.notasBorrador||[]),...(state.cursosNucleos||[])]
     .find(x=>String(x.studentId)+'|'+Number(x.nucleo)===key);
  out+='<div class="field-row">'+set('manual-nucleus',nuclei.map(x=>option(String(x.number),
    'Núcleo '+x.number+' · '+x.title,n)).join(''),'Núcleo')+
   '<label class="field">Nota final (0 a 10)<input id="manual-score" class="control" type="text" inputmode="decimal" placeholder="Ejemplo: 8,75"></label></div>'+
   '<p class="hint">Nota que ya consta: '+(current?num(current.nota)+(current.verificado?' · Verificada':' · Por cotejar'):'Sin nota registrada')+'</p>'+
   '<label class="field block">Fuente o referencia<input class="control" id="manual-source" type="text" placeholder="Ejemplo: Moodle, libro de calificaciones del núcleo"></label>'+
   '<label class="field block"><input type="checkbox" id="manual-reviewed"> Confirmo que comprobé esta nota con la fuente original y la identidad del estudiante.</label>'+
   '<div class="actions"><button class="btn primary" data-action="manual-save"'+(selected.tipoTitulacion!=='complexivo'?' disabled':'')+'>Guardar nota</button></div>';
 }else{
  const fields=R.map(k=>option(k,LABEL[k],R[0])).join('');
  out+='<div class="field-row">'+set('manual-requirement',fields,'Requisito')+
    set('manual-status',[['CUMPLE','Cumple'],['NO CUMPLE','No cumple'],['SIN VERIFICAR','Sin verificar'],['NO APLICA','No aplica']]
      .map(x=>option(x[0],x[1],'SIN VERIFICAR')).join(''),'Estado')+'</div>'+
   '<label class="field block">Documento o fuente<input class="control" id="manual-source" type="text" placeholder="Ejemplo: expediente institucional revisado"></label>'+
   '<div class="actions"><button class="btn primary" data-action="manual-save">Guardar requisito</button></div>';
 }
 out+=saveStatus()+'</section>';
 return out;
}
async function manualAction(code){
 if(code==='manual-special'){
  const selectedId=el('manual-student')?.value||manualStudentId;
  const student=state.estudiantes.find(s=>s.id===selectedId);
  if(!student){notify('Selecciona un estudiante.');return}
  if(student.tipoTitulacion!==manualType){notify('Confirma primero el mecanismo del estudiante.');return}
  tab=student.modalidad;
  if(manualType==='complexivo'){evaluationStudentId=student.id;page='evaluaciones'}
  else{trabajoStudentId=student.id;page='trabajo'}
  draw();return;
 }
 if(code!=='manual-save')return;
 const studentId=el('manual-student')?.value,source=el('manual-source')?.value;
 try{
  let result;
  if(manualType==='nucleo'){
   result=window.InformetitManualEntry.nucleus(state,{
    studentId,nucleus:el('manual-nucleus')?.value,score:el('manual-score')?.value,
    source,reviewed:!!el('manual-reviewed')?.checked},today());
  }else if(manualType==='requisito'){
   result=window.InformetitManualEntry.requirement(state,{
    studentId,field:el('manual-requirement')?.value,value:el('manual-status')?.value,
    source},today());
  }else return;
  if(result.kind==='already'){notify('Ya existe el mismo registro. No se ha duplicado.');return}
  if(result.kind==='conflict'&&!confirm('Se encontró una nota diferente. Se registrará para conciliación sin reemplazar la anterior. ¿Continuar?'))return;
  await Store.save(result.next);state=result.next;smartStage=null;
  if(result.kind==='verified')scheduleFirebaseSync();
  if(result.kind!=='conflict'){
   const roster=window.InformetitWorkQueue?.build(state).careers||[];
   const st=state.estudiantes.find(x=>x.id===studentId);
   homeScope=roster.find(x=>x.mode===st?.modalidad&&Data.career(x.career)===Data.career(st?.carrera))?.id||homeScope;
   page='inicio';
  }
  draw();
  const backup=Store.lastBackup?.();
  const local='Guardado en el equipo'+(backup?.ok===true?' · respaldo privado actualizado':
    backup?.ok===false?' · no se pudo actualizar el respaldo privado':'');
  notify(local+(result.kind==='conflict'?' · conflicto pendiente de revisar':'')+
   (result.kind==='verified'?' · Firebase permanece sin cambios hasta que subas respaldo':''));
 }catch(error){notify('No se guardó: '+error.message)}
}
function intelligentView(){
 const engine=window.InformetitCargaInteligente;
 let header=head('Cargar información','Elige cómo registrar información, sin preparar archivos técnicos.');
 header+='<div class="load-switch"><button type="button" class="btn '+(loadMethod==='individual'?'primary':'')+
  '" data-load-mode="individual">Formulario individual</button><button type="button" class="btn '+(loadMethod==='global'?'primary':'')+
  '" data-load-mode="global">Carga global</button></div>';
 if(loadMethod==='individual')return header+manualView();
 if(!engine)return head("Centro de Carga Inteligente","No está disponible el motor de reconocimiento académico.");
 if(!state.estudiantes.length)return header+
 '<section class="panel upload-panel"><h2>Subir listado de estudiantes</h2>'+
 '<p>Para reconocer nombres y calificaciones, comienza con el Excel institucional de estudiantes.</p>'+
 '<div class="actions"><button class="btn primary" data-action="student-file">Subir Excel de estudiantes</button></div></section>';

 const pending=engine.pending(state),rows=pending.rows.filter(x=>smartFilter==='todos'||x.mode===smartFilter);
 const careers=window.InformetitNucleiCatalog.list();
 let out=header;
 out+='<section class="panel upload-panel"><h2>Carga global de calificaciones</h2>'
  +'<p class="hint">Puedes cargar varios núcleos juntos. Identificamos los cursos por su nombre y cotejamos la nómina.</p>'
  +'<div class="actions"><button class="btn" data-action="student-file">Listado de estudiantes (Excel)</button>'+
    '<button class="btn" data-action="cursos-file">Cursos (Excel)</button>'+
    '<button class="btn" data-action="trabajo-file">Listado de Trabajo (Excel)</button>'+
    '<button class="btn" data-action="manual-global-exam">Resultados de Complexivo</button></div>'+
  '<label class="field block"><input type="checkbox" id="cursos-verificados"> Certifico que las notas del Excel de cursos fueron cotejadas con Moodle o las actas originales.</label>'
  +'<div class="actions"><button class="btn" data-action="smart-file">Elegir archivos Moodle (.txt, .csv, .tsv, Excel)</button>'
  +'<button class="btn" data-action="smart-clear">Limpiar entrada</button></div>'
  +'<label class="field block">Pegar contenido de Moodle<textarea id="smart-text" rows="8" placeholder="Pega aquí los cuatro libros de Moodle. No necesitas ordenarlos.">'+h(smartText)+'</textarea></label>'
  +'<div class="field-row"><label class="field">Carrera (si no hay encabezado)<select id="smart-career"><option value="auto">Detectar por curso y padrón</option>'
  +careers.map(x=>'<option value="'+h(x.name)+'"'+(smartCareer===x.name?' selected':'')+'>'+h(x.name)+'</option>').join('')+'</select></label>'
  +'<label class="field">Núcleo (si no hay encabezado)<select id="smart-nucleus"><option value="auto">Detectar nombre</option>'
  +[1,2,3,4].map(x=>'<option value="'+x+'"'+(smartNucleus===String(x)?' selected':'')+'>Núcleo '+x+'</option>').join('')+'</select></label></div>'
  +'<div class="actions"><button class="btn primary" data-action="smart-analyze">Analizar y cotejar</button></div>'
  +'<p class="hint">No se guardará ninguna nota al analizar. Un total ausente o ambiguo queda pendiente; nunca se convierte en cero.</p></section>';
 if(smartStage){
  const a=smartStage,all=a.courses.flatMap(course=>course.rows.map(r=>({course,r})));
  const filtered=all.filter(x=>smartFilter==='todos'||!x.r.student||x.r.student.modalidad===smartFilter);
  out+='<section class="panel"><h2>2. Revisar antes de incorporar</h2>'
   +'<div class="cards">'+card("Cursos detectados",a.counts.courses)+card("Filas Moodle",a.counts.students)
   +card("Listas para guardar",a.counts.ready)+card("Ya existentes",a.counts.already)
   +card("Para revisar",a.counts.review)+'</div>';
  out+=table(["Curso detectado","Carrera","Núcleo","Registros","Observación"],
   a.courses.map(course=>'<tr>'+td(course.title||'Sin nombre')+td(course.career||'Sin identificar')
    +td(course.nucleus||'—')+td(course.rows.length)+td(course.error||'Detectado')+'</tr>'));
  out+=table(["Nombre Moodle","Correo","Estudiante vinculado","Modalidad","Nota","Estado / motivo"],
   filtered.slice(0,180).map(({course,r})=>'<tr>'+td(r.name||'—')+td(r.email||'—')
    +td(r.student?.nombre||'Sin vincular')+td(r.student?.modalidad||'—')
    +td(num(r.grade))+td(r.status==='ready'?'LISTO · '+r.reason:r.status==='already'?'EXISTENTE':r.status.toUpperCase()+' · '+r.reason)+'</tr>'));
  if(filtered.length>180)out+='<p class="hint">Se muestran 180 de '+filtered.length+' filas. Todas se consideran en la revisión.</p>';
  out+='<label class="field block"><input type="checkbox" id="smart-verified"'+(smartReviewed?' checked':'')+'> Certifico que cotejé personalmente las notas finales contra Moodle. Solo los estudiantes clasificados en Complexivo y sin conflictos podrán quedar como verificados.</label>'
   +'<p class="hint">Si no marcas la verificación, las notas nuevas se guardarán como PROVISIONALES. Los estudiantes con mecanismo sin definir nunca serán acreditados como Complexivo automáticamente.</p>'
   +'<div class="actions"><button class="btn primary" data-action="smart-apply"'+(!a.counts.ready&&!a.counts.review?' disabled':'')+'>Guardar calificaciones cotejadas</button>'
   +'<button class="btn" data-action="smart-analyze">Volver a analizar</button></div></section>';
 }
 out+='<details class="panel subtle-details"><summary>Ver cobertura detallada por carrera y núcleo</summary><div class="details-body">'
  +'<p class="hint">La cobertura se calcula por carrera, modalidad y por los cuatro núcleos. La clasificación como Complexivo determina cuántas calificaciones son exigibles; los mecanismos sin definir se muestran aparte.</p>'
  +'<label class="field">Ver modalidad<select id="smart-filter">'
  +[['todos','Ambas modalidades'],['presencial','Presencial'],['online','Online']]
   .map(([val,label])=>'<option value="'+val+'"'+(smartFilter===val?' selected':'')+'>'+label+'</option>').join('')+'</select></label>'
  +table(["Carrera","Modalidad","Total","Complexivo","Trabajo","Sin clasificar","Núcleo 1","Núcleo 2","Núcleo 3","Núcleo 4"],
  rows.map(x=>'<tr>'+td(x.career)+td(modeLabel(x.mode))+td(x.students)+td(x.known)+td(x.projects)+td(x.unknown)
   +x.nuclei.map(n=>'<td>'+h(n.verified)+' verificadas / '+h(n.expected)+' Complexivo · '+h(n.status)
    +(n.provisional?' · '+h(n.provisional)+' provisionales':'')
    +(n.missing?' · '+h(n.missing)+' faltantes':'')
    +'<div class="actions">'+interpolationButton(x.mode,x.career,n.number)+'</div></td>').join('')+'</tr>'))
  +rows.flatMap(x=>x.nuclei.map(n=>interpolationPanel(x.mode,x.career,n.number))).join('')
  +'<h3>Próximas cargas sugeridas</h3>';
 const filteredActions=pending.actions.filter(x=>smartFilter==='todos'||x.toLowerCase().includes(smartFilter));
 out+='<div class="tablewrap"><ol>'+filteredActions.slice(0,28).map(x=>'<li>'+h(x)+'</li>').join('')+'</ol></div>';
 if(filteredActions.length>28)out+='<p class="hint">Hay '+(filteredActions.length-28)+' tareas adicionales; filtra por modalidad.</p>';
 out+='<p class="hint">Las notas provisionales y las discrepancias exigen cotejo. Las estimaciones no crean calificaciones académicas.</p></div></details>';
 out+=saveStatus();
 out+='<details class="panel subtle-details"><summary>Respaldos y exportaciones privadas</summary><div class="details-body">'
  +'<p>Los cambios se guardan en IndexedDB y en el respaldo privado automático de Electron. La base GPT se actualiza automáticamente. Puedes vincular una carpeta privada sincronizada en Configuración → Datos y respaldo para consultarla desde ChatGPT sin descargas repetidas. La exportación manual sigue disponible como opción extraordinaria.</p>'
  +'<div class="actions"><button class="btn" data-action="smart-export-gpt">Descargar base GPT privada</button>'
  +'<button class="btn" data-action="export-json">Descargar JSON</button></div>'
  +'<p class="hint">La conexión con ChatGPT exige vincular la carpeta a un servicio compatible y autorizar su acceso. No publiques datos personales en GitHub.</p></div></details>';
 return out;
}
async function smartAction(code){
 const engine=window.InformetitCargaInteligente;
 if(code==='smart-file'){el('smart-file').click();return}
 if(code==='smart-clear'){smartText='';smartStage=null;draw();return}
 if(code==='smart-export-gpt'){
  download('base-gpt.cjs','application/javascript;charset=utf-8',
   '/* INFORMETIT BASE GPT PRIVADA. NO PUBLICAR EN GITHUB. */\nmodule.exports = '+JSON.stringify(state)+';\n');
  notify('Archivo GPT privado descargado.');return;
 }
 if(code==='smart-analyze'){
  smartText=el('smart-text')?.value||'';
  if(!smartText.trim()){notify('Pega información o carga un archivo de Moodle.');return}
  try{
   smartStage=engine.assess(smartText,state,{career:smartCareer,nucleus:smartNucleus});
   draw();notify('Detectados '+smartStage.counts.courses+' cursos y '+smartStage.counts.students+' filas.');
  }catch(e){smartStage=null;notify('Análisis: '+e.message)}
  return;
 }
 if(code==='smart-apply'){
  smartText=el('smart-text')?.value||'';
  if(!smartStage||smartText!==smartStage.raw){notify('La entrada cambió; vuelve a analizar antes de guardar.');return}
  if(!confirm('Se guardarán '+smartStage.counts.ready+' notas nuevas y los registros pendientes de conciliación. '
   +(smartReviewed?'Se marcarán como verificadas solo las de Complexivo correctamente cotejadas.':'Las notas nuevas quedarán PROVISIONALES.')
   +' ¿Confirmas?'))return;
  try{
   const result=engine.apply(state,smartStage,smartReviewed,today());
   await Store.save(result.next);state=result.next;smartStage=null;smartText='';smartReviewed=false;
   scheduleFirebaseSync();page='inicio';draw();
   notify('Guardado local: '+result.stats.verified+' verificadas, '+result.stats.provisional+' provisionales, '
    +result.stats.conflicts+' conflictos, '+result.stats.quarantine+' en revisión.');
  }catch(e){console.error(e);notify('No se completó la carga: '+e.message)}
 }
}
async function smartFileChange(ev){
 const files=[...(ev.target.files||[])];if(!files.length)return;
 try{
  let pieces=[];
  const catalogue=window.InformetitNucleiCatalog.list();
  const findTitle=name=>{
   const normalized=Data.key(name);
   const found=[...new Set(catalogue.flatMap(c=>c.nuclei.map(n=>n.title))
    .filter(title=>normalized.includes(Data.key(title))))];
   return found.length===1?found[0]:null;
  };
  const titleHeader=(name,body,requireTitle)=>{
   if(/T-\s*N[ÚU]CLEO\s*-\s*[^\r\n[]+\s*\[[^\]]+\]/i.test(body))return body;
   const title=findTitle(name);
   if(title)return 'T-NUCLEO - '+title+' [Archivo importado]\n'+body;
   if(requireTitle)throw Error('No pude identificar el curso de «'+name+
    '». Renombra el archivo o la hoja con el nombre del núcleo, o pega ese curso por separado.');
   return body;
  };
  for(const file of files){
   if(file.size>12*1024*1024)throw Error('Archivo mayor a 12 MB: '+file.name);
   const ext=file.name.toLowerCase().split('.').pop();
   const multiple=files.length>1;
   if(['txt','tsv','csv'].includes(ext)){
    const body=await file.text();
    pieces.push(titleHeader(file.name,body,multiple));
   }else if(['xls','xlsx'].includes(ext)){
    if(!window.XLSX)throw Error('No está disponible la biblioteca Excel.');
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});
    for(const name of wb.SheetNames){
     const body=XLSX.utils.sheet_to_csv(wb.Sheets[name],{FS:'\t',RS:'\n'});
     pieces.push(titleHeader(name+' '+file.name,body,multiple||wb.SheetNames.length>1));
    }
   }else throw Error('Formato no admitido: '+file.name);
  }
  smartText=[smartText,...pieces].filter(Boolean).join('\n\n');
  smartStage=null;page='carga';draw();notify(files.length+' archivos añadidos. Pulsa Analizar y cotejar.');
 }catch(e){notify('Archivo Moodle: '+e.message)}
 finally{ev.target.value=''}
}


/* Asistente secuencial: los nombres se leen de IndexedDB, no se publican ni se codifican. */
function sequentialView(){
 const F=window.InformetitSequentialNuclei;
 if(!F)return head('Núcleos por carrera','El motor de plantillas no está disponible.');
 const careers=F.careers(state);
 let out=head('Núcleos por carrera','Descarga y valida un solo núcleo antes de comenzar el siguiente.');
 if(!careers.length)return out+'<section class="panel"><p>Primero importa la nómina institucional del período.</p>'+
  '<button class="btn primary" data-action="student-file">Subir nómina</button></section>';
 const chosen=careers.find(x=>x.key===flowCareer)||careers[0];
 flowCareer=chosen.key;
 const p=F.progress(state,flowCareer);
 out+='<section class="panel"><div class="field-row"><label class="field">Carrera'+
  '<select id="flow-career" class="control">'+careers.map(x=>'<option value="'+h(x.key)+'"'+
   (x.key===p.key?' selected':'')+'>'+h(x.name)+' ('+x.count+' estudiantes)</option>').join('')+
   '</select></label></div>'+
  '<p class="hint">La plantilla incluye la nómina de esta carrera en ambas modalidades y las notas locales previas como referencia. Se revisa identidad por cédula.</p>'+
  '<div class="cards">'+card('Estudiantes',p.students.length)+
   card('Presencial',p.students.filter(x=>x.modalidad==='presencial').length)+
   card('Online',p.students.filter(x=>x.modalidad==='online').length)+
   card('Núcleos completos',p.steps.filter(x=>x.complete).length+' / 4')+'</div>';
 out+='<div class="work-list">'+p.steps.map(n=>'<div class="work-task">'+
  '<div class="work-task-body"><strong>Núcleo '+n.number+' · '+h(n.title)+'</strong>'+
  '<span class="work-task-detail">'+(n.complete?'VALIDADO EN BASE LOCAL'+(n.when?' · '+h(n.when):''):
    n.number===p.current?'ACTUAL · descargar y completar plantilla':'BLOQUEADO · primero completar el anterior')+
  '</span></div><span class="work-task-count">'+
  (n.complete?'Completado':n.number===p.current?'En curso':'Pendiente')+'</span></div>').join('')+'</div></section>';
 if(p.current===null){
  out+='<section class="panel"><h2>Carrera completada</h2>'+
   '<p>Los cuatro núcleos tienen un archivo cotejado en la base local. Firebase permanece intacto hasta que subas un respaldo manual.</p></section>';
 }else{
  const title=p.catalog.nuclei[p.current-1].title;
  out+='<section class="panel upload-panel"><h2>Paso actual: Núcleo '+p.current+' · '+h(title)+'</h2>'+
   '<p class="hint">1. Descarga el Excel. 2. Revisa o completa cada nota. 3. Marca VALIDADO o NO CURSA. 4. Sube el mismo Excel para detectar errores o diferencias. Las filas pendientes impiden avanzar.</p>'+
   '<div class="actions"><button class="btn primary" data-action="flow-download">1. Descargar plantilla del Núcleo '+p.current+'</button>'+
   '<button class="btn" data-action="flow-import">2. Subir plantilla completada</button></div>';
  if(flowStage&&flowStage.plan.career===p.key&&flowStage.plan.n===p.current){
   const a=flowStage.plan;
   out+='<div class="block"><h3>3. Revisión antes de guardar</h3>'+
    '<p class="hint">Archivo: '+h(flowStage.filename)+'</p>'+
    '<div class="cards">'+card('Filas esperadas',a.stats.total)+card('Notas revisadas',a.stats.validated)+
     card('No cursan',a.stats.excluded)+card('Notas provisionales',a.stats.provisional)+
     card('Incidencias',a.stats.blocked)+'</div>';
   if(a.errors.length){
    out+='<div class="warnbox block"><strong>Hay datos pendientes o en conflicto.</strong>'+
     '<p>No se guardó nada. Corrige el Excel y vuelve a subirlo.</p>'+
     '<ul>'+a.errors.slice(0,35).map(x=>'<li>'+h(x)+'</li>').join('')+'</ul>'+
     (a.errors.length>35?'<p>Existen '+(a.errors.length-35)+' incidencias adicionales.</p>':'')+'</div>';
   }else{
    out+='<p class="hint">Las notas de estudiantes cuyo mecanismo aún no está confirmado permanecerán provisionales. Firebase solo recibirá una copia integral cifrada cuando tú la solicites.</p>'+
     '<label class="field block"><input type="checkbox" id="flow-reviewed"> Confirmo que revisé las notas finales, la identidad y el núcleo frente a Moodle; autorizo guardarlas.</label>'+
     '<div class="actions"><button class="btn primary" data-action="flow-apply">3. Guardar y habilitar siguiente núcleo</button></div>';
   }
   out+='</div>';
  }
  out+='</section>';
 }
 out+=saveStatus();
 return out;
}
async function flowFileChange(event){
 const file=event.target.files?.[0];if(!file)return;
 try{
  if(!window.XLSX)throw Error('No está disponible la biblioteca local de Excel.');
  if(file.size>12*1024*1024)throw Error('La plantilla supera 12 MB.');
  const bytes=await file.arrayBuffer();
  const wb=XLSX.read(bytes,{type:'array'});
  const assessment=window.InformetitSequentialNuclei.plan(state,flowCareer,wb,XLSX,file.name);
  flowStage={filename:file.name,bytes,plan:assessment};
  page='flujo';draw();
  notify('Plantilla revisada: '+assessment.stats.validated+' notas, '+assessment.stats.blocked+' incidencias.');
 }catch(error){flowStage=null;console.error(error);notify('Plantilla de núcleo: '+error.message)}
 finally{event.target.value=''}
}
async function flowAction(code){
 const F=window.InformetitSequentialNuclei;
 try{
  if(code==='flow-download'){
   if(!window.XLSX)throw Error('No está instalada la biblioteca Excel.');
   const out=F.template(state,flowCareer,XLSX);
   download(out.filename,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',out.bytes);
   notify('Plantilla preparada con '+out.total+' estudiantes. Solo el núcleo '+out.step+'.');
   return;
  }
  if(code==='flow-import'){el('nucleo-plantilla-file').click();return}
  if(code==='flow-apply'){
   if(!flowStage)throw Error('Sube primero el Excel revisado.');
   if(!el('flow-reviewed')?.checked)throw Error('Debes confirmar el cotejo contra Moodle.');
   const wb=XLSX.read(flowStage.bytes,{type:'array'});
   const assessment=F.plan(state,flowCareer,wb,XLSX,flowStage.filename);
   if(!assessment.complete)throw Error('El archivo tiene '+assessment.errors.length+' incidencias. Sube una versión corregida.');
   if(!confirm('Guardar '+assessment.stats.validated+' notas, '+assessment.stats.excluded+
    ' NO CURSA y '+assessment.stats.provisional+' registros provisionales en la base local? '+
    'Firebase solamente recibirá una copia completa cuando pulses «Subir respaldo».'))return;
   const result=F.apply(state,assessment,today());
   await Store.save(result.next);
   state=result.next;flowStage=null;draw();
   notify('Núcleo '+assessment.n+' completado en base local. '+result.stats.verified+
    ' notas verificadas; '+result.stats.provisional+' pendientes de clasificación. Firebase no se modificará hasta que subas un respaldo.');
   return;
  }
 }catch(error){console.error(error);notify('Núcleos por carrera: '+error.message)}
}

const views={inicio,flujo:sequentialView,estudiantes,carga:intelligentView,nucleos:grades,evaluaciones:evaluations,trabajo,cronogramas:schedule,informes:reports,identidad,firebase:firebaseView,datos:data};
function draw(){
 el("main").innerHTML=views[page]();
 document.querySelectorAll(".nav[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
 const evaluationPages=['nucleos','evaluaciones','trabajo'],configPages=['identidad','firebase','datos'];
 for(const [name,items] of [['nav-evaluaciones',evaluationPages],['nav-configuracion',configPages]]){
  const group=el(name);if(!group)continue;
  group.classList.toggle('active-group',items.includes(page));
  if(items.includes(page))group.open=true;
 }
}
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
 if(!el("moodle-confirm")?.checked){notify("Confirma el cotejo de la fuente Moodle antes de guardar como calificaciones verificadas.");return}
 if(assessed.errors.length){notify(assessed.errors.join(" "));return}
 if(!state.estudiantes.some(x=>x.modalidad===tab)){notify("No se ha cargado la nómina local de esta modalidad.");return}
 try{
  const planned=engine.plan(state,assessed,today());
  const existing=new Set((state.notas||[]).map(x=>String(x.id||x.studentId+'|'+x.nucleo)));
  for(const note of planned.next.notas||[]){
    const key=String(note.id||note.studentId+'|'+note.nucleo);
    if(!existing.has(key)&&note.status==='oficial_registro_moodle')note.verificado=true;
  }
  // Escritura transaccional; en caso de fallo no se altera el estado en pantalla.
  await Store.save(planned.next);
  state=planned.next;lastParse=null;inputText="";scheduleFirebaseSync();
  draw();
  notify("Moodle: "+planned.stats.added+" incorporadas, "+planned.stats.duplicate+
   " ya existentes, "+planned.stats.conflict+" conflictos y "+planned.stats.unmatched+" sin vincular.");
 }catch(e){console.error(e);notify("No se guardaron notas: "+e.message)}
}
function parseRows(rows){let header=rows[0]?.map(compact)||[],field=(r,...keys)=>{for(let k of keys){let j=header.indexOf(compact(k));if(j>=0)return String(r[j]??"").trim()}return ""},result=[];if(!header.includes("NUMEROIDENTIFICACION"))throw Error("Falta la columna numeroIdentificacion.");for(let r of rows.slice(1)){let id=field(r,"numeroIdentificacion");if(!id)continue;let original=field(r,"NombreCarrera"),code=field(r,"CodigoCarrera"),mode=normal(original).endsWith("ONLINE")?"online":/-L-/i.test(code)?"online":"presencial",req={};let aliases={Practicas:["PrácticasVinculacion","PracticasVinculacion","Practicas"],Seguimiento:["SeguimientoGraduados","Seguimiento"],Datos:["ActualizaciónDatos","ActualizacionDatos","Datos"],Ingles:["Ingles","Inglés"]};for(let k of R)req[k]=field(r,...(aliases[k]||[k]));result.push({id,nombre:field(r,"Nombres"),codigo:code,carrera:original.replace(/\s+ONLINE\s*$/i,"").trim(),modalidad:mode,horario:field(r,"HorarioComplexivo"),sede:field(r,"Sede"),correo:field(r,"CorreoInstitucional").toLowerCase(),correoPersonal:field(r,"CorreoPersonal"),telefono:field(r,"Celular"),requisitos:req,aprobacionTitulacion:field(r,"AprobacionTitulacion"),aprobacionComplexivoProyecto:field(r,"AprobacionComplexivoProyecto"),tipoTitulacion:"sin_definir"})}if(!result.length)throw Error("No hay filas con cédula.");return result}
function renderStudentImportPreview(){
 if(!studentImportStage)return '';
 const stage=studentImportStage,p=stage.preview,c=p.counts;
 let html='<section class="panel"><h2>Vista previa de importación: '+h(stage.fileName)+'</h2>'
  +'<p class="hint">No se ha guardado ningún cambio. Se conservan mecanismos de titulación, notas, actas, rúbricas y observaciones. Esta importación no envía nada a Firebase; los requisitos solo se incluyen si posteriormente subes un respaldo cifrado.</p>'
  +'<div class="cards">'+card('Filas del Excel',c.rows)+card('Estudiantes nuevos',c.added)
  +card('Estudiantes con cambios',c.updated)+card('Sin diferencias',c.unchanged)
  +card('Identidades bloqueadas',c.blocked)+card('Ausentes del archivo',c.missing)+'</div>'
  +'<p class="hint">Campos vacíos que se completarían: '+c.filled
  +' · cambios sobre datos existentes: '+c.revised
  +'. Los estudiantes ausentes se conservan.</p>';
 if(p.changes.length){
  html+='<h3>Cambios propuestos</h3>'
   +table(['Cédula','Estudiante','Campo','Actual','Excel'],
    p.changes.slice(0,200).map(x=>'<tr>'+td(x.id)+td(x.name)+td(x.field)+td(x.before)+td(x.after)+'</tr>'));
  if(p.changes.length>200)html+='<p class="hint">Se muestran 200 de '+p.changes.length+' diferencias.</p>';
 }
 if(p.conflicts.length)html+='<h3>Conflictos bloqueados</h3>'
  +table(['Cédula','Estudiante','Campo','Actual','Excel'],
   p.conflicts.slice(0,100).map(x=>'<tr>'+td(x.id)+td(x.name)+td(x.field)+td(x.before)+td(x.after)+'</tr>'));
 if(!p.updates.length)html+='<p><b>Sin diferencias aplicables. La base GPT ya tiene la información del archivo.</b></p>';
 html+='<div class="actions">'
  +(p.updates.length?'<button class="btn primary" data-action="apply-student-import">Aplicar actualización revisada</button>':'')
  +'<button class="btn" data-action="cancel-student-import">Cerrar vista previa</button></div></section>';
 return html;
}
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
  let duplicates=0,changes=0;
  const conflictKeys=new Set((next.conflictos||[]).map(x=>String(x.id)));
  for(const e of entries){
   const key=e.studentId+'|'+e.nucleo+'|'+Data.key(e.curso);
   const previous=records.get(key);
   if(previous){
    if(Data.grade(previous.nota)!==Data.grade(e.nota)||previous.estadoAcademico!==e.estadoAcademico){
     if(!conflictKeys.has(key)){
      next.conflictos.push({id:key,anterior:previous,nuevo:e,fecha:today(),fuente:file.name});
      conflictKeys.add(key);changes++;
     }
     continue;
    }
    // Un Excel provisional no puede degradar un registro ya verificado.
    records.set(key,previous.verificado?previous:(confirmed?{...previous,verificado:true,
     estado:'cotejado_por_coordinacion',fuenteCotejo:file.name}:previous));
    duplicates++;continue;
   }
   // Conservar también la nota nominal verificada del mismo estudiante y núcleo;
   // un contenido diferente no puede sustituirla silenciosamente.
   const master=(next.notas||[]).find(n=>String(n.studentId)===String(e.studentId)
      &&Number(n.nucleo)===Number(e.nucleo)&&n.verificado===true);
   if(master&&Data.grade(master.nota)!==Data.grade(e.nota)){
    if(!conflictKeys.has(key)){
     next.conflictos.push({id:key,anterior:master,nuevo:e,fecha:today(),fuente:file.name});
     conflictKeys.add(key);changes++;
    }
    continue;
   }
   records.set(key,e);
  }
  next.cursosNucleos=[...records.values()];
  for(const e of unmatched)next.complementarios.push({fuente:file.name,tipo:'curso_sin_conciliar',registro:e,estado:e.motivo});
  next.importaciones.push({nombre:file.name,tipo:'cursos_nucleos',filas:entries.length,noConciliados:unmatched.length,
   validado:confirmed,fecha:today()});
  next.auditoria.push({tipo:'cursos_nucleos',fecha:today(),fuente:file.name,total:entries.length,
   verificado:confirmed,duplicados:duplicates,conflictosNuevos:changes});
  await Store.save(next);state=next;scheduleFirebaseSync();draw();
  notify('Carga revisada: '+entries.length+' filas; '+duplicates+' existentes, '+
   changes+' diferencias bloqueadas, '+unmatched.length+' sin vincular.');
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
  const plan=window.InformetitMechanism.planBatch(state,matches.map(x=>({id:x.id,career:state.estudiantes.find(s=>s.id===x.id)?.carrera})),'trabajo',file.name);
  if(!confirm('Revisa: '+plan.changes.length+' cambios a Trabajo de Titulación, '+plan.unchanged.length+' ya clasificados, '+unmatched.length+' sin vincular. '+plan.changes.filter(x=>x.from==='complexivo').length+' dejarán Complexivo. Se conservarán todas las notas y actas y se registrará auditoría.'+note+' ¿Confirmas?'))return;
  const applied=window.InformetitMechanism.apply(state,plan,today());
  const next=applied.next,byId=new Map(matches.map(x=>[x.id,x]));
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
  if(ev.target.id==='student-file'){
   const rows=await readExcel(file);
   const preview=window.InformetitStudentImport.plan(state,rows,file.name);
   studentImportStage={fileName:file.name,rows,preview};page='estudiantes';draw();
   notify('Excel revisado: '+preview.counts.added+' nuevos, '+preview.counts.updated+
    ' estudiantes con cambios y '+preview.counts.blocked+' bloqueados. No se ha guardado.');
   return;
  }
  const obj=JSON.parse(await file.text());
  if(!obj||!Array.isArray(obj.estudiantes)||!Array.isArray(obj.notas))
   throw Error('El respaldo no tiene la estructura de Informetit.');
  if(state.estudiantes.length&&!confirm('¿Reemplazar toda la base local? Descarga antes un respaldo si tienes notas o correcciones.'))return;
  const candidate=Data.migrate(obj);
  const problems=Data.audit(candidate).issues.filter(p=>['id_vacio','cedula_repetida'].includes(p.type));
  if(problems.length)throw Error('Existen identificaciones vacías o duplicadas. No se importó el respaldo.');
  await Store.save(candidate);state=candidate;studentImportStage=null;draw();
  notify('Respaldo cargado: '+candidate.estudiantes.length+' estudiantes y '+candidate.notas.length+' notas.');
 }catch(e){console.error(e);notify('Error de importación: '+e.message)}
 finally{ev.target.value=''}
}

async function action(code){
 if(code.startsWith('chatgpt-'))return chatgptAction(code);
 if(code.startsWith('flow-'))return flowAction(code);
 if(code.startsWith('manual-'))return manualAction(code);
 if(code.startsWith("smart-"))return smartAction(code);
 if(code==='manual-global-exam'){page='evaluaciones';draw();return}
 switch(code){case"apply-student-import":{
 if(!studentImportStage){notify('Primero selecciona y revisa un Excel.');break}
 try{
  const stage=studentImportStage,preview=window.InformetitStudentImport.plan(state,stage.rows,stage.fileName);
  if(preview.baseline!==stage.preview.baseline)
   throw Error('La nómina cambió; vuelve a analizar el Excel.');
  if(!preview.updates.length){studentImportStage=null;draw();notify('Sin cambios: la base GPT ya está actualizada.');break}
  if(!confirm('¿Aplicar '+preview.counts.added+' estudiantes nuevos y actualizar '+
    preview.counts.updated+' existentes? '+preview.counts.blocked+
    ' casos bloqueados permanecerán intactos. Esta importación no escribe en Firebase.'))break;
  const result=window.InformetitStudentImport.apply(state,preview,today());
  await Store.save(result.next);state=result.next;studentImportStage=null;page='inicio';draw();
  notify('Base GPT actualizada: '+result.stats.added+' nuevos, '+
   result.stats.updated+' modificados y '+result.stats.blocked+' bloqueados para revisión.');
 }catch(error){console.error(error);notify('No se aplicó la importación: '+error.message)}
}break;case"cancel-student-import":studentImportStage=null;draw();break;case"student-file":el("student-file").click();break;case"trabajo-file":el("trabajo-file").click();break;case"cursos-file":el("cursos-file").click();break;case"logo-file":el("logo-file").click();break;case"remove-logo":{
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
   actaOrdinario:el("eval-source")?.value,actaSupletorio:el("eval-sup-source")?.value,
   actaCotejada:!!el("eval-acta-cotejada")?.checked};
 try{
   const planned=window.InformetitComplexivo.upsert(state,id,i,today());
   if(code==="preview-eval"){
     const result=planned.result;
     notify("Ordinario "+window.InformetitComplexivo.num(result.ordinary)+
       " · Supletorio "+window.InformetitComplexivo.num(result.recovery)+
       " · Definitiva "+window.InformetitComplexivo.num(result.finalGrade)+
       " · "+(window.InformetitComplexivo.DESCRIPTIONS[result.status]||result.status));
   }else{
     await Store.save(planned.next);state=planned.next;evaluationStudentId=id;scheduleFirebaseSync();draw();
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
  await Store.save(results.next);state=results.next;scheduleFirebaseSync();
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
}break;case"doc":if(!window.InformetitFullReport){notify("Generador institucional no disponible");break}download("Informe_"+tab+"_"+today()+".doc","application/msword;charset=utf-8",window.InformetitFullReport.makeReport(state,tab));break;case"pdf":if(window.InformetitFullReport){try{notifyPdfResult(await window.InformetitFullReport.download(state,tab))}catch(e){notify("No se pudo generar PDF: "+e.message)}}else notify("Informe institucional no disponible.");break;case"preview-current":case"preview-presencial":case"preview-online":{const m=code==="preview-current"?tab:code==="preview-online"?"online":"presencial";try{showReportPreview(m)}catch(e){notify("No se pudo abrir la vista previa: "+e.message)}break}case"draft-presencial":case"draft-online":{const mode=code==="draft-online"?"online":"presencial";if(window.InformetitFullReport){try{const result=await window.InformetitFullReport.download(state,mode);notifyPdfResult(result);}catch(err){notify("Error al generar el informe: "+err.message);console.error(err)}}else notify("Generador institucional no disponible.");break}case"print":if(window.InformetitFullReport){try{notifyPdfResult(await window.InformetitFullReport.download(state,tab))}catch(e){notify("No se pudo generar PDF: "+e.message)}}else notify("Informe institucional no disponible.");break;}}
document.addEventListener("click",async ev=>{
 let modeButton=ev.target.closest("[data-load-mode]");
 if(modeButton){loadMethod=modeButton.dataset.loadMode;draw();return}
 let taskButton=ev.target.closest("[data-queue-id]");
 if(taskButton){
  const queue=window.InformetitWorkQueue?.build(state);
  const task=[...(queue?.upload||[]),...(queue?.review||[])].find(x=>x.id===taskButton.dataset.queueId);
  if(!task)return;
  if(task.action==='backup-file'){el('backup-file').click();return}
  if(task.mode)tab=task.mode;
  if(task.page==='carga'){
    smartCareer=task.career||'auto';
    smartNucleus=task.nucleus?String(task.nucleus):'auto';
    smartFilter=task.mode||'todos';smartStage=null;
  }
  if(task.page==='estudiantes'){query=task.career||'';reqFilter='todos';reqStatus='todos'}
  page=task.page||'inicio';draw();return;
 }
 let nav=ev.target.closest("[data-page]");if(nav){page=nav.dataset.page;query="";lastParse=null;draw();return}let m=ev.target.closest("[data-mode]");if(m){tab=m.dataset.mode;lastParse=null;examImportStage=null;evaluationStudentId="";trabajoStudentId="";draw();return}let cmd=ev.target.closest("[data-action]");if(cmd){if(cmd.dataset.action.startsWith("firebase-"))await firebaseAction(cmd.dataset.action);else await action(cmd.dataset.action);return}let pending=ev.target.closest("[data-link-unmatched]");if(pending){
 const idx=Number(pending.dataset.linkUnmatched),record=state.sinVincular[idx];
 if(!record)return;
 const studentId=el("unmatched-student-"+idx)?.value;
 if(!studentId){notify("Selecciona primero un estudiante de la nómina.");return}
 const chosen=state.estudiantes.find(x=>String(x.id)===String(studentId));
 if(!chosen)return;
 if(!confirm("¿Vincular esta nota de Moodle a "+chosen.nombre+" ("+chosen.id+")? Comprueba su identidad antes de continuar."))return;
 try{
  const result=window.InformetitMoodle.linkPending(state,idx,studentId,today());
  await Store.save(result.next);state=result.next;scheduleFirebaseSync();draw();
  notify(result.status==="conflict"?"Vínculo registrado; existe una discrepancia para resolver en Datos y respaldo.":"Registro vinculado y archivado en auditoría.");
 }catch(error){console.error(error);notify("No se pudo vincular: "+error.message)}
 return;
}
let sim=ev.target.closest("[data-interpolate]");if(sim){
 interpolationTarget=interpolationTarget===sim.dataset.interpolate?null:sim.dataset.interpolate;
 draw();return;
}
let conflict=ev.target.closest("[data-use-conflict], [data-keep-conflict]");if(conflict){
 const useNew=conflict.hasAttribute("data-use-conflict"),i=Number(useNew?conflict.dataset.useConflict:conflict.dataset.keepConflict);
 const c=state.conflictos[i];if(!c)return;
 const description=useNew?"¿Utilizar la nueva calificación y conservar la anterior solo en auditoría?":"¿Conservar la calificación anterior y archivar la nueva solo en auditoría?";
 if(!confirm(description))return;
 try{
  const candidate=window.InformetitMoodle.resolveConflict(state,i,useNew?"new":"current",today());
  await Store.save(candidate);state=candidate;scheduleFirebaseSync();draw();notify("Conflicto resuelto y registrado en la auditoría.");
 }catch(e){console.error(e);notify("No se resolvió el conflicto: "+e.message)}
}});
document.addEventListener("input",ev=>{if(ev.target.id==="student-search"){query=ev.target.value;let pos=ev.target.selectionStart;draw();let search=el("student-search");search.focus();search.setSelectionRange(pos,pos)}if(ev.target.id==="moodle-text"){inputText=ev.target.value;lastParse=null}if(ev.target.id==="exam-import-text"){examImportText=ev.target.value;examImportStage=null}if(ev.target.id==="smart-text"){smartText=ev.target.value;smartStage=null}});
document.addEventListener("change",async ev=>{let field=ev.target;
if(field.id==='home-scope'){homeScope=field.value;draw();return}
if(field.id==='flow-career'){flowCareer=field.value;flowStage=null;draw();return}
if(field.id==='manual-type'){manualType=field.value;draw();return}
if(field.id==='manual-mode'){manualMode=field.value;manualCareer='';manualStudentId='';draw();return}
if(field.id==='manual-career'){manualCareer=field.value;manualStudentId='';draw();return}
if(field.id==='manual-student'){manualStudentId=field.value;draw();return}
if(field.id==='manual-nucleus'){manualNucleus=field.value;draw();return}

if(field.id==='smart-filter'){smartFilter=field.value;draw();return}
if(field.id==='smart-verified'){smartReviewed=field.checked;return}
if(field.id==='smart-career'){smartCareer=field.value;smartStage=null;draw();return}
if(field.id==='smart-nucleus'){smartNucleus=field.value;smartStage=null;draw();return}
if(field.dataset.studentType){
 const s=state.estudiantes.find(x=>x.id===field.dataset.studentType);
 if(!s){draw();return}
 try{
  const planned=window.InformetitMechanism.planOne(state,s.id,field.value);
  if(!planned.changes.length){draw();return}
  const change=planned.changes[0],e=change.evidence;
  const evidence='Notas Moodle: '+e.notas+', provisionales: '+e.provisionales+
   ', cursos: '+e.cursos+', evaluaciones: '+e.examenes+', proyectos: '+e.proyectos+'.';
  if(!confirm('¿Cambiar el mecanismo de '+s.nombre+' de '+change.from+' a '+change.to+'?\n'+
    'Se mantendrá toda la evidencia anterior, pero solo se calcularán resultados del mecanismo elegido.\n'+
    evidence+'\nEl cambio quedará registrado en auditoría.')){draw();return}
  const result=window.InformetitMechanism.apply(state,planned,today());
  await Store.save(result.next);state=result.next;studentImportStage=null;smartStage=null;
  mechanismBatchStage=null;interpolationTarget=null;draw();
  notify('Mecanismo actualizado; calificaciones y antecedentes conservados en la base privada.');
 }catch(err){console.error(err);draw();notify('No se cambió el mecanismo: '+err.message)}
}else if(field.hasAttribute("data-work-student")){trabajoStudentId=field.value;draw()}else if(field.hasAttribute("data-eval-select")){evaluationStudentId=field.value;draw()}else if(field.hasAttribute("data-nucleus-career")){nucleusCareerKey=field.value;draw()}else if(field.hasAttribute("data-requirement-filter")){reqFilter=field.value;draw()}else if(field.hasAttribute("data-status-filter")){reqStatus=field.value;draw()}else if(field.hasAttribute('data-program-date')){
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
el("student-file").addEventListener("change",handleFiles);
el("smart-file").addEventListener("change",smartFileChange);el("backup-file").addEventListener("change",handleFiles);
el("nucleo-plantilla-file").addEventListener("change",flowFileChange);
el("trabajo-file").addEventListener("change",handleTrabajoFile);
el("cursos-file").addEventListener("change",handleCursosFile);

el("logo-file").addEventListener("change",async ev=>{const file=ev.target.files?.[0];if(!file)return;try{if(!["image/png","image/jpeg","image/webp"].includes(file.type))throw Error("Solo se admiten archivos PNG, JPG o WebP.");if(file.size>2000000)throw Error("La imagen debe tener menos de 2 MB.");const dataURL=await new Promise((res,rej)=>{let fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(new Error("No se pudo leer imagen."));fr.readAsDataURL(file)});if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(dataURL))throw Error("Imagen no reconocida; utiliza PNG, JPG o WebP.");const next=Data.migrate(state);next.config.logoDataUrl=dataURL;await Store.save(next);state=next;draw();notify("Logotipo guardado para la portada y encabezado de ambos PDF.");}catch(e){notify(e.message)}finally{ev.target.value=""}});
(async()=>{
 state=await load();
 if(state.firebaseSync)state.firebaseSync.enabled=false;
 ready=true;draw();
 if(window.informetitDesktop?.chatgptStatus){
  try{chatgptStatus=await window.informetitDesktop.chatgptStatus();if(page==='datos')draw()}
  catch(err){console.warn('Estado de carpeta GPT:',err.message)}
 }
 try{
  const imported=await loadPrivateGPT();
  if(imported&&!imported.unchanged){draw();console.info('Base GPT local recuperada:',imported.students,'estudiantes')}
 }catch(err){console.warn('Copia GPT externa no incorporada:',err.message)}
})().catch(e=>{el("main").textContent="No fue posible iniciar Informetit: "+e.message});
})();
