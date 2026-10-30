# Informetit · UTET / ITSQMET

Aplicación **Electron Desktop** para la cohorte **octubre 2025–marzo 2026**. Dos modalidades independientes (**presencial** y **online**) y dos mecanismos académicos (**Examen Complexivo** y **Trabajo de Titulación**). El código fuente es público; **los datos personales de los estudiantes no se publican en GitHub**.

## Instalar y actualizar (Windows)

Requiere **Node.js 24** y Git instalados. En la carpeta del repositorio:

```powershell
git pull origin main
npm install
npm run check
npm test
npm start
```

La aplicación se abre en Electron. `npm run web` es solo un servidor diagnóstico local con **lista blanca** de archivos públicos, no para gestionar información confidencial. La biblioteca de Excel se prepara en `vendor/` durante `npm install`. El informe PDF utiliza **Chromium/Electron**, no pdfMake.

Para comprobar el PDF sin datos reales, ejecutar `npm run smoke:pdf` en un entorno con escritorio compatible. La automatización de GitHub Actions ejecuta las pruebas JavaScript y la impresión PDF con datos ficticios en Linux.

## Dos modalidades de carga · versión 1.2.3

Desde **Cargar información** puedes seleccionar **Formulario individual** o **Carga global**, sin trabajar con JSON o código. Si aún no hay nómina, Informetit solicita primero el Excel institucional de estudiantes.

- **Formulario individual:** elige carrera, modalidad y estudiante; registra una nota de núcleo con su fuente, o actualiza el estado de un requisito. Para un examen Complexivo o un Trabajo de Titulación abre su formulario especializado con el estudiante preseleccionado. Una nota distinta de la registrada no se reemplaza: se archiva como conflicto para cotejo. Tras guardar, el Inicio presenta la siguiente tarea.
- **Carga global:** importa el Excel de estudiantes, listados de Trabajo, cursos y libros Moodle (o pega Moodle). El motor reconoce núcleo, carrera y estudiante, revisa diferencias y permite marcar como cotejada la información cuando existe evidencia. Una segunda carga nunca debe reemplazar silenciosamente calificaciones distintas. Al confirmar, vuelve a los pendientes.

**Persistencia y sincronización reales:** cada cambio confirmado se guarda primero en IndexedDB y en la copia automática privada `base-gpt.cjs` del perfil Electron. La interfaz muestra si esa copia se guardó o dio error; no se asume éxito si falla. Esto **no actualiza automáticamente la Biblioteca de ChatGPT**. Firebase `utet-4387a` es una base externa independiente: solamente se envían, cuando la sincronización está habilitada y autorizada, notas de núcleos **verificadas y sin conflictos** o resultados de Examen Complexivo con acta cotejada, exclusivamente a `nucleos` y `complexivos`. Requisitos, trabajos, notas provisionales y estimaciones permanecen locales. Sin credenciales, red o permisos, el envío queda pendiente; no se anuncia como completado. Ninguna prueba CI utiliza datos académicos reales ni credenciales productivas.

## Interfaz operativa minimalista · versión 1.2.2

El **Inicio** deja de ser un panel estadístico y muestra **solo las tareas de carga pendientes** de la carrera y modalidad elegidas. Con una instalación nueva sin base privada muestra únicamente la solicitud de importación: las cifras agregadas de GitHub no se hacen pasar por expedientes nominales. Con nómina local agrupa por carrera los requisitos sin información, libros de núcleos, registros de Examen Complexivo y de Trabajo de Titulación realmente ausentes.

Las notas provisionales y los conflictos se muestran en una sección aparte de **revisión**, no como calificaciones faltantes. Los estudiantes de Trabajo de Titulación no generan pendientes de núcleos; los no clasificados se muestran para clasificación sin inferir su mecanismo. La presencia de un registro no garantiza aprobación: siempre se requiere la comprobación académica correspondiente.

El menú agrupa **Evaluaciones** (núcleos, complexivo y trabajo) y **Configuración** (logo/códigos, Firebase, respaldos), conservando todas las funciones anteriores. Desde cada tarea del Inicio se abre su pantalla; en cargas Moodle se preseleccionan carrera, modalidad y núcleo. **Cargar información** prioriza pegar o subir libros y muestra la cobertura detallada y respaldos como opciones desplegables. No modifica el motor académico ni los PDF.

## Módulos y fuentes

| Módulo | Función |
| --- | --- |
| Resumen | Población y controles generales por modalidad |
| Estudiantes y requisitos | Nueve requisitos, nómina, estado y mecanismo editable con confirmación y auditoría |
| Centro de Carga Inteligente | Pegar varios libros Moodle o cargar TXT, TSV, CSV, XLS/XLSX; detectar cursos y cotejar identidad |
| Notas de núcleos | Cuatro núcleos por carrera; notas verificadas, provisionales, faltantes y conflictos |
| Examen Complexivo | Ordinario 40 % teoría / 60 % práctica, supletorio y actas |
| Trabajo de Titulación | Proyectos, tutor, lector, vocales, rúbricas y defensa |
| Cronogramas | Fechas y ejecución declarada; documentación por comprobar |
| Dos informes | Borradores PDF separados de presencial y online |
| Logo y códigos INF | Encabezado institucional, versión, fecha y firmas pendientes |
| Firebase UTET | Conciliación autorizada de `nucleos` y `complexivos` exclusivamente |
| Datos y respaldo | Exportación JSON, base privada y seguimiento de incidencias |

### Carga de estudiantes y calificaciones

La población inicial del reporte agregado contiene **363 estudiantes: 262 presencial y 101 online**. Las identidades y notas individuales proceden **solo** del archivo privado de cada instalación.

El Centro de Carga Inteligente lee el título del curso (no interpreta «Mod 13» como número de núcleo), lo cruza con el catálogo, coteja estudiantes por cédula/correo/nombre y muestra una **vista previa sin escritura**. Si se modifican las notas o el mecanismo antes de confirmar, exige analizar nuevamente. Los registros ambiguos se separan para conciliación.

Las notas nuevas se guardan inicialmente como **provisionales**, salvo verificación expresa de Moodle para un estudiante confirmado en Complexivo. Cuando una nota de Moodle coincide con un borrador, se puede verificar y conservar su origen en auditoría, sin duplicarla. Una celda vacía no se interpreta como cero.

Los estudiantes se clasifican en `complexivo`, `trabajo` o `sin_definir`. Un cambio individual o masivo requiere confirmación y **no elimina notas, actas ni antecedentes**. Las estadísticas de núcleos incluyen solo los estudiantes asignados a Complexivo. El botón **Interpolar** realiza una proyección estadística en memoria; **no crea una calificación, no modifica el promedio oficial y no se exporta a PDF ni Firebase**.

## Persistencia y privacidad

- Base operativa: **IndexedDB** en el perfil privado de Electron.
- En cada guardado: respaldo local `base-gpt-autosave.json` y `base-gpt.cjs` en el perfil de Electron; existe una copia anterior `base-gpt.previous.cjs`.
- Importación externa: colocar `base-gpt.cjs` o un respaldo JSON compatible en **Descargas**, **Escritorio** o la carpeta privada de Informetit. Estas fuentes tienen prioridad sobre la copia automática del perfil. Los archivos `.cjs` se interpretan como datos JSON, **sin ejecutar código**.
- El perfil local **no se sincroniza automáticamente con la Biblioteca de ChatGPT**. Usar la exportación de la base GPT privada para compartirla deliberadamente en este chat.
- **Jamás** subir `base-gpt.cjs`, respaldos nominales, actas, cédulas o notas individuales a un repositorio público.

Firebase es independiente: necesita credenciales y consentimiento para habilitar sincronización. Solo envía registros académicos verificados a las colecciones permitidas; nunca escribe estimaciones ni convierte requisitos en notas. Una reclasificación de mecanismo no elimina automáticamente los registros académicos históricos de la nube: corresponde conciliar cualquier discrepancia.

## Informe institucional: APA 7 adaptada a INF

Los dos PDF utilizan **un único generador**, `report_institucional.js`, con `document/institutional.js`. Cada tabla presenta **un párrafo introductorio**, número y título, datos y nota, y **una interpretación breve sin etiqueta «Análisis»**. Mantiene índices de contenidos, tablas y figuras.

Formato del cuerpo: **Times New Roman 12**, interlineado doble, texto alineado a la izquierda, sangría de primera línea de **1,27 cm**, referencias con **sangría francesa** de 1,27 cm, jerarquía de títulos y tablas APA con líneas horizontales. La portada, encabezado INF, firmas y reserva de margen superior son **excepciones institucionales**; no es un manuscrito APA puro.

Las notas provisionales y agregadas nunca se convierten en notas oficiales por interpolación. La calificación final de Complexivo y la de Trabajo son evaluaciones distintas. Los informes permanecen en **borrador hasta cotejar actas, requisitos, fuentes y firmas**.

## Auditoría y pruebas

```powershell
npm run check
npm test
npm run smoke:pdf
```

El pipeline `.github/workflows/verificar.yml` utiliza Node 24 para pruebas de sintaxis/lógica y Electron en Linux para humo PDF real. Se incluyen verificaciones del servidor local (bloqueo de datos privados), migración/cotejo de Moodle, cambio de mecanismo, proyección sin persistencia, requisitos, actas, integridad, índices y APA 7. La ejecución de CI no sustituye una revisión visual en Windows con datos oficiales.

**Límites del cierre institucional:** falta cotejar las fuentes oficiales, verificar las firmas, revisar versiones normativas y validar en Windows el PDF definitivo. Una aprobación calculada no certifica emisión del título.

Repositorio: https://github.com/jeffer91/Informetit
