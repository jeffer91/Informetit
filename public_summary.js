/* Resumen institucional de acceso público: sin cédulas, nombres ni calificaciones individuales. */
(() => {
  'use strict';
  const PERIOD = 'Octubre 2025 – Marzo 2026';
  const DATA = {
    presencial: {
      total: 262, completos8: 255, completos9: 254,
      carreras: [
        ['Administración',16],['Contabilidad',22],['Desarrollo de Software',19],
        ['Educación Inicial',39],['Educación Básica',22],['Enfermería',45],
        ['Estética Integral',17],['Gestión del Talento Humano',16],
        ['Marketing Digital y Comercio Electrónico',39],['Redes y Telecomunicaciones',27]
      ],
      sedes: [['Campus Sur',107],['Matriz',143],['Sede Manta',12]],
      horarios: [['Intensivo',58],['Matutino',94],['Vespertino',110]],
      requisitos: [
        ['Académico',260,2],['Documentación',258,4],['Financiero',257,5],
        ['Prácticas',257,5],['Vinculación',262,0],['Seguimiento',261,1],
        ['Inglés',260,2],['Actualización de datos',258,4],
        ['Titulación (preparación)',255,7]
      ],
      notas: [['Núcleo 1 · Enfermería',11,8.87]]
    },
    online: {
      total: 101, completos8: 97, completos9: 96,
      carreras: [
        ['Administración',10],['Contabilidad',11],['Desarrollo de Software',1],
        ['Educación Inicial',18],['Educación Básica',13],
        ['Gestión del Talento Humano',17],
        ['Marketing Digital y Comercio Electrónico',13],
        ['Redes y Telecomunicaciones',8],
        ['Seguridad Ciudadana y Orden Público',10]
      ],
      sedes: [['Matriz',101]],
      horarios: [['Intensivo',1],['Matutino',1],['Vespertino',99]],
      requisitos: [
        ['Académico',100,1],['Documentación',100,1],['Financiero',98,3],
        ['Prácticas',98,3],['Vinculación',101,0],['Seguimiento',101,0],
        ['Inglés',101,0],['Actualización de datos',100,1],
        ['Titulación (preparación)',96,5]
      ],
      notas: []
    }
  };
  const safe = s => String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
  const fmt = (n,d=2) => Number(n).toLocaleString('es-EC',{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct = (n,d) => d ? n/d*100 : 0;
  const blocks = (rows, max=0, labelWidth=230, percent=false) => {
    const width=675,left=labelWidth+8,right=55,barWidth=width-left-right,top=23,gap=28;
    const h=top+Math.max(rows.length,1)*gap+27, scale=max||Math.max(1,...rows.map(x=>x[1]));
    const label = s => s.length>42?s.slice(0,39)+'…':s;
    let svg='<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 '+width+' '+h+'" width="'+width+'" height="'+h+'"><rect width="'+width+'" height="'+h+'" fill="#fff"/>';
    rows.forEach((r,i)=>{
      const y=top+i*gap,bw=Math.max(0,Math.min(barWidth,barWidth*r[1]/scale));
      svg+='<text x="'+(left-9)+'" y="'+(y+15)+'" text-anchor="end" font-size="12" font-family="Arial" fill="#223247">'+safe(label(String(r[0])))+'</text>';
      svg+='<rect x="'+left+'" y="'+y+'" rx="2" width="'+barWidth+'" height="19" fill="#e5edf3"/>';
      if(bw>0)svg+='<rect x="'+left+'" y="'+y+'" rx="2" width="'+bw+'" height="19" fill="#245f91"/>';
      svg+='<text x="'+(left+barWidth+7)+'" y="'+(y+15)+'" font-size="12" font-family="Arial" fill="#1b3552">'+safe(percent?fmt(r[1],2)+' %':fmt(r[1],0))+'</text>';
    });
    return svg+'</svg>';
  };
  function figures(mode) {
    const d=DATA[mode];
    return [
      ['Distribución de estudiantes por carrera',blocks(d.carreras,0,260)],
      ['Distribución por sede declarada',blocks(d.sedes)],
      ['Distribución por horario académico',blocks(d.horarios)],
      ['Cumplimiento porcentual de requisitos previos',blocks(d.requisitos.slice(0,8).map(r=>[r[0],pct(r[1],d.total)]),100,250,true)],
      ['Cantidad de verificaciones pendientes por requisito',blocks(d.requisitos.map(r=>[r[0],r[2]]),0,250)],
      ['Cumplimiento conjunto de ocho requisitos previos',blocks([['Cumplen ocho requisitos',d.completos8],['Tienen pendientes',d.total-d.completos8]])],
      ['Cumplimiento integral de nueve requisitos',blocks([['Cumplen nueve requisitos',d.completos9],['Tienen pendientes',d.total-d.completos9]])],
      ...(d.notas.length?[['Promedio observado en las notas disponibles',blocks(d.notas.map(r=>[r[0],r[2]]),10,260)]]:[])
    ];
  }
  const table = (columns,rows) => '<table><thead><tr>'+columns.map(c=>'<th>'+safe(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(cell=>'<td>'+safe(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  function preview(mode) {
    const d=DATA[mode],name=mode==='online'?'online':'presencial';
    let html='<section class="public-summary"><h2>Resumen estadístico · '+name+'</h2>';
    html+='<p><strong>'+d.total+'</strong> estudiantes registrados. Ocho requisitos previos completos: <strong>'+d.completos8+'</strong> ('+fmt(pct(d.completos8,d.total))+' %). Nueve requisitos completos: <strong>'+d.completos9+'</strong> ('+fmt(pct(d.completos9,d.total))+' %).</p>';
    html+='<p><strong>Fuente:</strong> matriz de aprobación de titulación octubre 2025 – marzo 2026. Solo cifras agregadas, sin fichas individuales.</p>';
    for (const [i,[title,svg]] of figures(mode).entries()) {
      html+='<div class="summary-figure"><strong>Figura '+(i+1)+'.</strong> '+safe(title)+'<div class="figure-graph">'+svg+'</div><small>Nota. Elaboración estadística propia a partir de registros disponibles.</small></div>';
    }
    html+='<p>Las calificaciones aún no incorporadas y los resultados finales permanecen pendientes. Este documento es un borrador estadístico y no certifica aprobación del Examen Complexivo.</p></section>';
    return html;
  }
  function report(mode) {
    if (!(mode in DATA)) throw new Error('Modalidad desconocida');
    const d=DATA[mode],modeLabel=mode==='online'?'online':'presencial';
    const date=new Date().toLocaleDateString('es-EC',{day:'2-digit',month:'long',year:'numeric'});
    const reqRows=d.requisitos.map(r=>[r[0],r[1],r[2],fmt(pct(r[1],d.total))+' %']);
    let body='<h2>Resumen</h2><p>Se presenta el análisis descriptivo de la cohorte '+PERIOD+', modalidad '+modeLabel+'. El universo contiene '+d.total+' estudiantes. Los datos proceden de la matriz institucional; los resultados académicos no registrados permanecen pendientes.</p>';
    body+='<h2>1. Caracterización de la cohorte</h2><p>La distribución por carrera se detalla en la siguiente tabla. Los porcentajes se calculan con el total de esta modalidad.</p>';
    body+='<strong>Tabla 1</strong><em> Distribución por carrera</em>'+table(['Carrera','Estudiantes','Porcentaje'],d.carreras.map(r=>[r[0],r[1],fmt(pct(r[1],d.total))+' %']));
    body+='<h2>2. Fase I. Requisitos</h2><p>Los ocho requisitos previos deben distinguirse de la categoría Titulación (preparación académica), que no representa aprobación definitiva del examen.</p>';
    body+='<strong>Tabla 2</strong><em> Cumplimiento por requisito</em>'+table(['Requisito','Cumplen','Pendientes','Porcentaje'],reqRows);
    body+='<p>En esta modalidad, '+d.completos8+' estudiantes cumplen conjuntamente los ocho requisitos previos, equivalentes al '+fmt(pct(d.completos8,d.total))+' %. En nueve categorías el cumplimiento integral corresponde a '+d.completos9+' estudiantes ('+fmt(pct(d.completos9,d.total))+' %).</p>';
    body+='<h2>3. Fase II. Núcleos estructurantes</h2>';
    body+=d.notas.length?'<p>Se dispone de '+d.notas[0][1]+' calificaciones finales del '+d.notas[0][0]+', con promedio '+fmt(d.notas[0][2])+' puntos. No se extrapola este promedio a estudiantes que no constan en el registro cargado.</p>':'<p>No se han incorporado aún calificaciones verificadas de los núcleos para esta modalidad.</p>';
    body+='<h2>4. Fase III. Evaluación final</h2><p>Los resultados de exámenes ordinarios, defensas y supletorios permanecen pendientes de incorporación y validación.</p>';
    body+='<h2>5. Figuras estadísticas</h2>';
    const foot='Fuente: resumen agregado de la matriz institucional de requisitos. Nota. Se excluyen los resultados no disponibles.';
    figures(mode).forEach(([title,svg],i)=>{body+='<div class="apa-figure"><strong>Figura '+(i+1)+'</strong><br><em>'+safe(title)+'</em><div class="chart">'+svg+'</div><div class="fn">'+foot+'</div></div>'});
    body+='<h2>6. Limitaciones y recomendaciones</h2><p>Los registros contenidos en esta versión son agregados y no permiten identificar estudiantes individuales, conciliar calificaciones con cédulas ni determinar aprobaciones definitivas. Para completar el informe es necesario incorporar en un repositorio privado la base nominal, actas y calificaciones verificadas.</p>';
    body+='<h2>Referencias</h2><p>Instituto Superior Tecnológico Quito Metropolitano. (2026). <em>Reporte de aprobación de titulación, octubre 2025–marzo 2026</em> [Registro administrativo interno].</p>';
    return '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Borrador de titulación '+modeLabel+'</title><style>@page{size:A4;margin:2.54cm}@page:first{margin:1.5cm}body{font:12pt/2 "Times New Roman",serif;color:#131b27;margin:0}h1,h2{font-size:12pt;line-height:1.4;text-align:center;margin:15pt 0 7pt}h2{break-after:avoid}p{text-align:justify;margin:0 0 10pt}table{border-collapse:collapse;width:100%;font:9pt/1.3 "Times New Roman",serif;margin:8pt 0 15pt}th,td{padding:5pt 4pt;text-align:left;border-bottom:.5pt solid #444}th{border-top:1pt solid #111;border-bottom:1pt solid #111}strong,em{break-after:avoid}svg{width:100%;height:auto;max-height:390px}.apa-figure{break-inside:avoid;margin:20pt 0}.chart{line-height:1}.fn{font:8.5pt/1.2 Arial,sans-serif;margin-top:5pt}.cover{height:23.5cm;break-after:page;page-break-after:always;display:flex;flex-direction:column;justify-content:center;text-align:center}.cover h1{font:bold 18pt Arial}.cover p{text-align:center}.stamp{font:9pt Arial;margin-top:2cm}.note{font:9pt Arial;color:#555}</style></head><body><section class="cover"><p>Instituto Superior Tecnológico Quito Metropolitano</p><p>Unidad de Titulación y Eficiencia Terminal</p><h1>Informe Final del Proceso de Titulación</h1><p>Modalidad '+modeLabel+'<br>'+safe(PERIOD)+'</p><p>Borrador estadístico · Información agregada sin datos personales</p><div class="stamp">Fecha de elaboración: '+safe(date)+'<br>Control documental y firma: pendientes de validación</div></section>'+body+'</body></html>';
  }
  async function download(mode) {
    const html=report(mode);
    if (window.informetitDesktop?.saveAPAHTML) {
      try {
        const res=await window.informetitDesktop.saveAPAHTML(html,'Borrador_Estadistico_Titulacion_'+mode+'_Oct2025_Mar2026.pdf');
        return res;
      } catch(err) { window.alert('No se pudo guardar el PDF: '+err.message); return null; }
    }
    const win=window.open('','_blank');
    if(!win){window.alert('El navegador bloqueó la impresión.');return null;}
    win.document.write(html);win.document.close();win.addEventListener('load',()=>win.print());
    return null;
  }
  window.InformetitPublicSummary={DATA,preview,download,report};
})();
