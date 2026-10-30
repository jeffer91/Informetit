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

## Arquitectura de las tres bases · versión 1.3.0

1. **Base operativa local (IndexedDB):** se lee inmediatamente al abrir Informetit, sin depender de Firebase ni de ChatGPT. Todas las cargas y cambios se guardan aquí primero.
2. **Base GPT en código (base-gpt.cjs):** cada guardado genera una representación completa en el perfil privado del equipo. Para no intercambiar archivos manualmente, en **Datos y respaldo → Vincular carpeta para ChatGPT** se puede elegir UNA VEZ una carpeta local sincronizada con **Dropbox, Google Drive u OneDrive**. Informetit actualiza allí base-gpt.cjs e informetit-chatgpt.json tras cada guardado. Para leerlos desde ChatGPT debe funcionar el cliente de sincronización en el equipo y el mismo servicio debe estar conectado a ChatGPT. La aplicación no puede acceder a ChatGPT ni certificar la subida del proveedor por sí sola.
3. **Firebase utet-4387a:** funciona **exclusivamente como respaldo manual completo**, no como sincronización permanente. En **Firebase UTET** se conecta una identidad Google autorizada y se pulsa **Subir respaldo a Firebase** o **Bajar y recuperar respaldo**. Los respaldos se guardan en la colección informetit_backups, comprimidos, cifrados con AES-256-GCM y protegidos por una clave privada de al menos 12 caracteres. No se guardan contraseñas ni claves de cifrado en la nube; la clave es imprescindible para recuperar la copia. Al restaurar, Informetit valida el contenido, requiere confirmación y guarda primero una copia íntegra previa en el perfil privado.

**Privacidad:** una carpeta sincronizada puede subir a la nube identificaciones y calificaciones reales. Configurarla es opcional y exige consentimiento; elige una carpeta privada, nunca un repositorio GitHub o un enlace público. Desvincularla detiene las escrituras futuras pero no borra las copias que ya se hayan sincronizado. Firebase nunca se consulta ni se actualiza en segundo plano y no toca otras colecciones académicas.

## Núcleos por carrera · carga guiada secuencial

Desde **Núcleos por carrera**, la aplicación presenta una carrera cada vez y habilita solamente su primer núcleo pendiente. El botón **Descargar plantilla** genera un XLSX en el equipo con la nómina privada presencial y online de esa carrera, las notas anteriores como referencia y el nombre del núcleo vigente. La pestaña CONTROL permite detectar plantillas de otro período, carrera, núcleo o nómina.

El usuario introduce la nota final real y marca cada registro como **VALIDADO** o **NO CURSA**. Si faltan registros, existe **SIN NOTA**, una nota distinta de la base local o se alteró la identidad, el núcleo queda bloqueado. Tras volver a subir el Excel, Informetit muestra incidencias **antes de guardar**. Una confirmación expresa actualiza IndexedDB y su respaldo privado, conserva auditoría y desbloquea solamente el siguiente núcleo. Las cuatro etapas quedan registradas en la base local por carrera y se invalidan si cambia la nómina.

Las notas de estudiantes sin mecanismo definido permanecen provisionales. **El Excel y los núcleos se guardan únicamente en la base local y la base GPT; Firebase no recibe nada hasta que el usuario pulse «Subir respaldo».** Ninguna nómina ni archivo privado se publica en GitHub.

## Dos modalidades de carga · versión 1.3.0

Desde **Cargar información** puedes seleccionar **Formulario individual** o **Carga global**, sin trabajar con JSON o código. Si aún no hay nómina, Informetit solicita primero el Excel institucional de estudiantes.

- **Formulario individual:** elige carrera, modalidad y estudiante; registra una nota de núcleo con su fuente, o actualiza el estado de un requisito. Para un examen Complexivo o un Trabajo de Titulación abre su formulario especializado con el estudiante preseleccionado. Una nota distinta de la registrada no se reemplaza: se archiva como conflicto para cotejo. Tras guardar, el Inicio presenta la siguiente tarea.
- **Carga global:** importa el Excel de estudiantes, listados de Trabajo, cursos y libros Moodle (o pega Moodle). El motor reconoce núcleo, carrera y estudiante, revisa diferencias y permite marcar como cotejada la información cuando existe evidencia. Una segunda carga nunca debe reemplazar silenciosamente calificaciones distintas. Al confirmar, vuelve a los pendientes.

**Persistencia real:** los cambios confirmados se guardan en IndexedDB y automáticamente en el respaldo GPT local. Cuando hay una carpeta privada vinculada a ChatGPT, también se actualizan allí los archivos de código y JSON. **Firebase es solo respaldo completo manual cifrado**, no se activa por la importación de calificaciones. Ningún dato nominal se escribe en GitHub.


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
| Firebase UTET | Subida y recuperación MANUAL de respaldos completos cifrados (informetit_backups) |
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
- El perfil local **no es accesible directamente desde ChatGPT**. Para consulta sin archivos manuales, configura la carpeta sincronizada y el conector de Dropbox/Google Drive/OneDrive correspondiente en ChatGPT; esa integración requiere autorización.
- **Jamás** subir `base-gpt.cjs`, respaldos nominales, actas, cédulas o notas individuales a un repositorio público.

Firebase es independiente y nunca sincroniza en segundo plano: requiere credenciales autorizadas y un clic explícito para crear o recuperar un **respaldo integral cifrado**. La colección histórica académica nucleos/complexivos queda sin cambios automáticos. Se conserva una copia previa antes de restaurar.

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
