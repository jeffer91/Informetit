# BLOQUE 08 · CIERRE TÉCNICO DE INFORMETIT — versión 1.2.0 (28/10/2026)

**Integrado en `main`.** Los dos informes institucionales se generan dentro de **Electron**, para octubre 2025–marzo 2026, sin publicar registros personales en GitHub.

**[Guía de cierre y validación de los dos informes](CIERRE_INFORMETIT.md)**

### Mejoras finales

- Nuevo `analysis/quality.js`: controles por modalidad de población, cédulas, requisitos, notas, duplicados, actas, cronogramas y diferencias Firebase, diferenciando bloqueos críticos, advertencias y datos informativos.
- El capítulo **11. Anexos y trazabilidad** incluye inventario de fuentes, conciliación nominal y por mecanismo, auditoría de incidencias e instrucciones de corrección. El informe usa referencias institucionales como **fuentes por verificar**, sin inventar una edición bibliográfica aprobada.
- En **Dos informes** aparece una auditoría completa de ambas modalidades. Los PDF distinguen aprobación académica calculada de graduación y de actas firmadas.
- La impresión Electron **informa el estado real del índice** (`paginado_verificado`, marcador incompleto o error), comprueba firma PDF y repite la paginación cuando cambia el número de páginas.
- Se elimina el código documental presencial inventado por defecto; aparece **POR ASIGNAR** si aún no se ha registrado uno.
- Los cronogramas del informe incluyen fecha inicial, final y estado **declarado**, aclarando que la ejecución requiere soporte.
- Nuevo `scripts/smoke-pdf.cjs`: diagnóstico nativo de impresión presencial y online con datos ficticios, perfil temporal y verificación de páginas, contenido y marcadores, **sin acceder a la base de estudiantes**.
- Los PDF siguen siendo **BORRADORES** hasta cargar y validar actas, notas, normativa, fecha, responsables, firma y totalidad de la población.

### Actualizar y verificar (PowerShell de Windows)

```powershell
git pull origin main
npm install
npm run check
npm test
npm run smoke:pdf
npm start
```

**Verificación realizada:** las pruebas de lógica del código y los controles de informes pasan con datos ficticios, incluida una cohorte simulada de 262 presencial y 101 online. **Pendiente:** ejecutar la impresión nativa en Windows con `npm run smoke:pdf` y validar visualmente el PDF real, sus índices y los documentos institucionales originales. El diagnóstico nativo está implementado pero no pudo ejecutarse en el entorno de este chat.

---

## BLOQUE 07 · Trabajo de Titulación y consolidación (28/10/2026)

**Implementado directamente en `main`**, sin crear ramas ni publicar nóminas, cédulas o calificaciones institucionales.

### Motor de Trabajo de Titulación

- Nuevo `analysis/trabajo.js`: registra número y fecha del acta de grado, calificación del **tutor**, calificación del **lector**, asistencia, nombres de los **tres vocales**, sus puntuaciones individuales de práctica y defensa, acta y nota de supletorio.
- Rúbrica de **evaluación práctica** por vocal: Diseño (máximo 2,50), Construcción (2,50), Funcionamiento (2,50) y Aplicación (2,50). Rúbrica de **defensa** por vocal: Sustento del marco teórico (2), Sustento de la propuesta (2), Uso de recursos (2) y Solventar preguntas (4). Las ocho valoraciones de cada vocal son independientes; todas se validan contra su escala.
- Cálculo: promedio escrito = (tutor + lector) / 2; promedio práctico = promedio de los tres totales prácticos; promedio defensa = promedio de los tres totales de defensa; promedio oral = (práctica + defensa) / 2; **nota final = escrito × 0,60 + oral × 0,40**, redondeada a dos decimales. **Reproduce el ejemplo del acta 4134:** 9,00 escrito, 7,00 práctica, 8,00 defensa, 7,50 oral y **8,40 final**. Esta ponderación procede del acta de ejemplo facilitada y **debe contrastarse con la normativa institucional vigente** antes de aprobar el informe definitivo.
- No se transforma en nota un campo vacío. Un cero registrado es válido; puntajes fuera del máximo, inasistencia contradictoria o un proyecto sin ordinario completo con supletorio aislado se detienen o quedan señalados para revisión.
- Para la nota final ordinaria inferior a 7,00: **supletorio pendiente**, sin declaración automática de reprobación. La recuperación final consignada permite calcular aprobación o reprobación posterior. Una referencia de acta no equivale a documento verificado, firma o titulación formal.
- Las evaluaciones antiguas guardadas bajo `evaluaciones` con `tipo="trabajo"` **se conservan para conciliación**, pero no se convierten automáticamente en puntuaciones inexistentes de los tres vocales.
- Los proyectos y sus cambios se almacenan en la nueva colección local `trabajos`, incluida en el JSON maestro con auditoría. Nunca se registran como notas de Examen Complexivo.

### Pantalla y cronogramas

- Nuevo módulo lateral **Trabajo de Titulación** para los pocos estudiantes clasificados con ese mecanismo en **Estudiantes y requisitos**. Incluye formulario, rúbrica por vocal, cálculo, registro y listado de seguimiento por carrera.
- La pantalla **Cronogramas** permite editar fechas de inicio y fin de todas las actividades de **Complexivo** y **Trabajo de Titulación**, preservando de manera independiente su estado de ejecución y las fechas previamente propuestas. Los cambios se guardan en `cronogramaPersonalizado` y se incorporan a los PDF; no se escriben en Firebase.
- Los datos de estudiantes, notas del Word, Moodle, actas, modalidades y evaluaciones anteriores permanecen intactos en sus secciones.

### Informes y motor de consolidación

- El capítulo **6. Trabajo de Titulación** ahora presenta matriz de ponderaciones, parámetros de rúbrica, indicadores, resultados por carrera, resultados por estudiante, el detalle completo de cada acta (tutor, lector, tres vocales, parámetros y resultados) y los casos pendientes por separado.
- Se mantienen las fases del cronograma de Trabajo de Titulación, con las fechas personalizadas registradas por el usuario. La programación **no** se presenta como prueba de ejecución.
- Nuevo `analysis/consolidado.js`: integra ambos mecanismos dentro de cada modalidad, por carrera, con aprobaciones calculadas, supletorios, reprobaciones, ausencias, pendientes, referencias de actas y duplicados. Concilia que la suma de estudiantes de Complexivo y Trabajo de Titulación corresponda a la nómina local de la modalidad.
- La sección **8. Síntesis general** de cada PDF y las conclusiones utilizan esta consolidación. **No confunden aprobación académica calculada con graduación, emisión de título o eficiencia terminal oficial.**
- La pantalla **Dos informes** muestra controles adicionales de ambos mecanismos y sus pendientes de validación.

### Archivos del bloque

Nuevos: `analysis/trabajo.js`, `analysis/consolidado.js`, `tests/block07.test.js`.

Actualizados: `data/model.js`, `app.js`, `index.html`, `report_institucional.js`, `analysis/nuclei.js`, `package.json`, las pruebas de regresión anteriores y este README.

### Instalación y comprobación en Windows

```powershell
git pull origin main
npm run check
npm test
npm start
```

Las pruebas de código de los bloques 01–07 y Firebase pasaron en la comprobación simulada disponible; la ejecución nativa de Electron y la exportación/inspección visual de PDF siguen requiriendo verificación en Windows con la base privada. El siguiente **Bloque 08** cerrará formato institucional, referencias y normativa, integridad estadística, índice/paginación, anexos, errores de impresión y la validación exhaustiva de los dos informes.

## BLOQUE 06 · Examen Complexivo — ordinario, supletorio y resultados (28/10/2026)

**Implementado directamente en `main`.** Esta es la primera de tres entregas finales acordadas (Bloques 06, 07 y 08). No se genera un PDF externo desde ChatGPT: las tablas y análisis alimentan el generador de los dos informes en Electron.

### Motor de Examen Complexivo

- `analysis/complexivo.js`: **nota ordinaria = teoría × 0,40 + práctica × 0,60**, con dos decimales, escala 0–10 y umbral de 7,00. Las notas vacías no equivalen a cero; un cero registrado es válido.
- Si el ordinario es 7,00 o superior, el resultado calculado es **aprobado ordinario**. Si es inferior a 7,00, queda **supletorio pendiente**, no reprobado definitivo.
- El supletorio se registra de manera independiente: con teoría/práctica ponderadas 40/60 o con **nota final explícita del acta**, cuando esa sea la información disponible. Si existe una contradicción entre el total escrito y el calculado, se bloquea el guardado hasta revisarla.
- Un supletorio registrado de 7,00 o más produce **aprobado por supletorio**. Si está por debajo de 7,00 y existe ordinario previo insuficiente, produce **reprobado definitivo calculado**. Las ausencias explícitas se muestran separadas de notas faltantes.
- Los respaldos se consignan mediante **referencias a actas de ordinario y supletorio**. Una referencia escrita por sí sola no verifica la autenticidad de un acta: el PDF diferencia notas calculadas, referencias registradas y evidencias pendientes de validación.
- El motor tolera los registros antiguos `one`, `two`, `rescue`, `status`, `source` sin descartarlos ni asumir que una decisión manual equivale a una nota. Si falta un componente o el estado antiguo contradice el cálculo, genera una advertencia.
- Se excluye a todos los estudiantes con `tipoTitulacion="trabajo"` de la población y los cálculos del Examen Complexivo.
- Se detectan y aíslan evaluaciones duplicadas por cédula, resultados con información incompleta y falta de actas. Los cambios manuales se añaden a la **auditoría privada** de la base de datos.

### Interfaz dentro de la app

En **Evaluaciones finales** hay un selector de estudiante, controles separados del ordinario y supletorio, referencias de las dos actas, botón **Calcular y revisar** y botón **Guardar evaluación**. El estado se calcula, no se elige manualmente.

En esa misma pantalla, el motor **`analysis/complexivo_import.js`** permite pegar desde Excel o Moodle una tabla CSV/TSV con las columnas obligatorias `Cédula`, `Teoría` y `Práctica`; opcionalmente `Nota supletorio`, `Teoría supletorio`, `Práctica supletorio`, `Acta ordinaria` y `Acta supletorio`. Se aplica **Analizar tabla → Incorporar registros revisados**. Se exige coincidencia exacta de cédula y modalidad; el lote nunca reemplaza evaluaciones ya guardadas y bloquea duplicados, estudiantes no encontrados o proyectos de titulación.

### Fase III del informe institucional

`report_institucional.js` incorpora la nueva sección 7:
- **7.1** Cobertura y población de Examen Complexivo.
- **7.2** Ordinarios, supletorios y resultados definitivos calculados.
- **7.3** Resultados, porcentajes y figura por carrera.
- **7.4** Tablas nominales por carrera de notas disponibles y seguimiento **separado** de registros pendientes o contradictorios.
- **7.5** Conciliación y controles de referencias de actas.
- **7.6** Interpretación y límites de los resultados.

El resumen ejecutivo, la síntesis y las conclusiones se actualizan desde el motor de Complexivo. No se mezclan los resultados con los nueve requisitos, las notas de núcleos ni los estados de aprobación de Firebase.

### Pruebas y actualización

- `tests/block06.test.js` prueba ponderación, límites, recuperación, ausencia, compatibilidad, duplicados, actas, modalidades y generación del PDF.
- `tests/block06-import.test.js` verifica TSV, CSV, identificación, conservación de ceros, filas conflictivas y no sobrescritura.
- Se agregaron nuevas pruebas a los archivos de regresión de los bloques anteriores.

En Windows, cerrar Informetit y ejecutar:

```powershell
git pull origin main
npm run check
npm test
npm start
```

Los datos individuales y actas permanecen en el almacenamiento local privado. **Pendiente de validar en Windows:** impresión completa del PDF y el comportamiento con las nóminas y actas reales. El Bloque 07 implementará Trabajo de Titulación y consolidación institucional; el Bloque 08 cerrará la maquetación y validación total de los dos informes.

## INTEGRACIÓN FIREBASE UTET · octubre 2026

**Conexión implementada en Electron, solo lectura.** La app utiliza el proyecto Google **`utet-4387a`** y la base Firestore **`(default)`**. Los datos no se descargan ni se publican en GitHub.

### Lo que confirma la exportación recibida

El archivo de respaldo UTET del 28/10/2026 tiene **1.387** fichas en `Estudiante` (singular), **1.396** matrículas y **1.396** registros de requisitos para varios períodos. La cohorte `2025-10__2026-03` contiene **371 matrículas**, repartidas en **266 presencial y 105 online**. Al cotejar la nómina privada anterior, **los 363 estudiantes originales aparecen en Firebase** y quedan **8 adicionales**. Los nueve requisitos existentes de esos 363 estudiantes no presentan diferencias en ese respaldo.

Los campos `AprobacionComplexivoProyecto` y `AprobacionTitulacion` contienen **CUMPLE / NO CUMPLE**, no notas numéricas. La exportación no contiene la colección `nucleos`. La conexión en vivo también consulta `nucleos` y `cronogramas` para descubrir sus campos, sin imputar notas.

### Seguridad y acceso

- La conexión Google se implementa en `firebase/reader.js` y se ejecuta **solo en el proceso principal Electron**, mediante Firestore REST API y solicitudes **GET** a una lista cerrada de colecciones: `Estudiante`, `matriculas`, `requisitos`, `periodos`, `nucleos` y `cronogramas`. No hay métodos para modificar documentos remotos.
- Se autentica con credenciales locales **Application Default Credentials (ADC)** o con un archivo JSON de **cuenta de servicio de solo lectura** seleccionado desde una ventana nativa en el equipo. La clave privada **nunca se copia al renderer, al JSON de la app ni a GitHub**.
- **Recomendado:** utilizar `gcloud auth application-default login` en el mismo Windows con una identidad que tenga permiso de visualización de Firestore. Si la institución usa cuenta de servicio, asignarle **solo `roles/datastore.viewer`** (o permisos equivalentes mínimos), guardar su clave JSON fuera del repositorio y seleccionarla desde la app. No enviar esa clave a ChatGPT ni adjuntarla a correos.
- La configuración web Firebase (`apiKey`, `appId`, `projectId`) identifica el proyecto, pero **no permite eludir reglas ni permisos** para leer datos privados.
- La app no cambia reglas de seguridad ni habilita lectura pública.

### Flujo operativo

1. Cerrar Informetit; actualizar con `git pull origin main`, `npm install`, `npm run check`, `npm test` y abrir con `npm start`.
2. Entrar en **Firebase UTET** del menú lateral.
3. Para conectarse en vivo, elegir **Conectar con Google (credenciales locales)** después de `gcloud auth application-default login`, o **Elegir credencial de lectura** con una cuenta de servicio específica. Luego pulsar **Consultar Firestore ahora**.
4. Alternativamente, pulsar **Analizar respaldo JSON/TXT** para usar la exportación proporcionada sin conexión en vivo.
5. Revisar estudiantes coincidentes, adicionales, faltantes y discrepancias de requisitos.
6. Pulsar **Incorporar datos faltantes de coincidentes** para completar solamente los campos vacíos. Los 8 adicionales **no se agregan** en esta operación.
7. Si la coordinación confirma que los adicionales pertenecen a la cohorte del informe, puede pulsar **Incorporar también los adicionales**. El aumento de la población requiere confirmación explícita.
8. La importación nunca modifica notas Moodle, Word, exámenes, actas, tipos de titulación previamente elegidos ni datos de Firebase. Las contradicciones de requisitos se almacenan en `firebaseDiferencias` para revisión, sin sobrescribir los valores locales.

**Importante:** esta implementación está integrada al repositorio, pero la conexión real requiere iniciar sesión o seleccionar las credenciales **en tu propio equipo**; la clave web suministrada no autoriza el acceso a datos protegidos. El proyecto `main` no contiene ninguna clave privada ni datos nominales de Firestore.

Archivos del cambio: `firebase/reader.js` (lectura de nube), `firebase/sync.js` (conciliación), `tests/firebase-sync.test.js` (pruebas), `electron-main.js`, `electron-preload.js`, `app.js`, `data/model.js`, `index.html` y `package.json`.

## BLOQUE 05 · Fase II — Motor de análisis académico de núcleos (octubre 2026)

**Implementado directamente en `main`.** El capítulo **5. Fase II. Resultados de núcleos estructurantes** se genera dentro de Electron, junto con el informe presencial u online; no se entregan PDF por separado desde ChatGPT.

### Motor académico independiente

- Nuevo archivo `analysis/nuclei.js`: calcula **media, mediana, mínima, máxima, desviación estándar poblacional y cuatro rangos de nota (0–6,99; 7–7,99; 8–8,99; 9–10)** exclusivamente sobre notas finales individuales disponibles. Una nota cero real se incorpora; una nota vacía no es cero.
- Para cada carrera se distinguen los estudiantes de **Examen Complexivo**, excluyendo a los clasificados como **Trabajo de Titulación** del denominador y los listados de núcleos.
- Cada uno de los cuatro núcleos incluye tabla de estudiantes **con calificación individual**, estadísticos, distribución de frecuencias, gráfico e interpretación. **Las notas que faltan aparecen en una tabla de seguimiento separada**, por estudiante y núcleo, diferenciadas de las notas en conflicto; nunca se atribuyen como reprobaciones.
- Los **19 resúmenes agregados del Word** se aceptan como fuente del período y se conservan incluso sin nómina local. Cuando no existe nota individual para un núcleo, la app puede presentar la cantidad, promedio, mínimo y máximo del Word, señalando su fuente. Un agregado **no permite** inventar nombres, medianas, desviaciones ni distribuciones individuales.
- Si existen notas individuales de un núcleo, **solo ellas** se utilizan para calcular sus estadísticos; el resumen agregado del Word permanece como referencia independiente, jamás se promedian conjuntamente.
- El análisis distingue la cobertura nominal, las muestras incompletas, las diferencias de tamaño y los posibles conflictos. Las calificaciones del núcleo **no equivalen** a la aprobación final del Examen Complexivo.
- Se conserva el cronograma previsto de los cuatro núcleos (30 de marzo a 18 de abril de 2026) como **planificación**, no como prueba de ejecución.

### Integración

- `report_institucional.js`: reemplaza el antiguo capítulo breve de promedios por el análisis completo por carrera y núcleo, con tablas, gráficos, interpretaciones, pendientes y control de fuentes.
- `app.js`: incorpora la pantalla de análisis por carrera y detalle de cuatro núcleos dentro de **Notas de núcleos**; los controles de calidad de **Dos informes** se calculan con el mismo motor.
- `index.html`: carga `analysis/nuclei.js` antes del generador y la interfaz.
- `nucleos_agregados.js`: identifica la procedencia del Word como fuente aceptada, con las limitaciones de un agregado.
- `tests/block05.test.js`: validaciones de estadísticos, límites de rangos, carreras, modalidades, pendientes, conflictos, fuente Word y generación institucional.
- `package.json`: añade los tests y las comprobaciones del Bloque 05.

### Actualizar en Windows

```powershell
git pull origin main
npm run check
npm test
npm start
```

El código se puede actualizar desde GitHub; los datos identificables de estudiantes y calificaciones permanecen en IndexedDB y en respaldos privados de la instalación local. **El siguiente bloque (06)** abordará teoría 40 %, práctica 60 %, examen ordinario, supletorio y resultados finales de Examen Complexivo.

## BLOQUE 04 · Importación inteligente de calificaciones Moodle (octubre 2026)

**Implementado directamente en `main`.** La carga y conciliación se realizan dentro de **Notas de núcleos** en Electron; los informes siguen generándose exclusivamente desde la app.

### Motor independiente

- `moodle/importer.js` reconoce tres formatos de texto copiado: **Moodle vertical** con correo y seis notas, **tabla tabulada** y **tabla separada por punto y coma** con columna de nota final o Total del curso. Conserva los parciales cuando existen; solo la nota final se utiliza en las estadísticas y el informe académico.
- Detecta núcleo y carrera en el encabezado cuando están disponibles. Permite seleccionarlos manualmente, pero **bloquea la importación** si la selección contradice la cabecera. No asigna valores por orden de filas ni por coincidencias aproximadas.
- Concilia estudiantes por **cédula, correo institucional/personal o nombre completo exacto** y comprueba carrera, modalidad y mecanismo de titulación. Los estudiantes de Trabajo de Titulación **no** se contabilizan en los núcleos de Complexivo.
- Preserva el cero cuando es una calificación real y rechaza notas vacías, fuera de 0 a 10 o ambiguas. Cuando no existe una columna inequívoca de total del curso, no inventa el resultado.
- Usa un flujo seguro: **Analizar y revisar → Guardar resultado de la revisión**. Si cambia el texto, el núcleo, la carrera o la modalidad, debe volver a analizarse. Una importación nueva solo reemplaza el estado de la app **después** de que el guardado transaccional haya terminado correctamente.
- Una nota Moodle igual a otra existente no se duplica. Una nota diferente genera un conflicto trazable. Las notas provenientes del **Word son aceptadas como fuente del período** conforme a la decisión de la Coordinación, pero las divergencias se conservan para revisión.
- En **Datos y respaldo → Notas en conflicto** permite seleccionar **Usar nueva** o **Conservar actual**. La elección resuelve efectivamente la contradicción entre Word y Moodle y deja el antecedente en la auditoría privada.
- Los registros Moodle sin vincular aparecen en **Notas de núcleos → Pendientes de conciliación Moodle**, donde se puede elegir explícitamente un estudiante de la misma carrera y modalidad. Las notas parciales también se conservan cuando la asociación se realiza manualmente.
- Los datos personales y calificaciones **no** se publican en GitHub; están en IndexedDB de Electron, en archivos privados importados o en respaldos que guarda el usuario.

### Pantalla y pruebas

- `app.js`: importa con revisión, muestra cobertura por carrera × núcleo y calificaciones individuales, distingue notas disponibles y pendientes, y ofrece conciliación manual.
- `data/model.js`: excluye los estudiantes de Trabajo de Titulación de los promedios de núcleos correspondientes a Complexivo.
- `tests/block04.test.js`: prueba formatos, notas cero/vacías, identificación, importación repetida, contradicción Word–Moodle, resolución, vinculación manual y separación de mecanismos.
- `index.html` carga `moodle/importer.js` antes de `app.js`; `package.json` incluye el bloque en `npm run check` y `npm test`.

### Actualizar en Windows

```powershell
git pull origin main
npm run check
npm test
npm start
```

No se requiere ninguna dependencia adicional para este bloque. La instalación local de Electron continúa utilizando los módulos y dependencias instalados en los bloques anteriores.

**Pendientes del siguiente Bloque 05:** desarrollar las tablas individuales de los cuatro núcleos por carrera dentro del PDF, las estadísticas de distribución, el análisis académico de cada núcleo y el listado de estudiantes que aún no tienen nota, sin equipararlos a reprobados.

## BLOQUE 03 · Fase I — Análisis de requisitos (octubre 2026)

**Implementado directamente en main**. La pantalla **Estudiantes y requisitos** y el capítulo **4. Fase I. Verificación de requisitos** de ambos informes utilizan el mismo motor `analysis/requirements.js`.

### Motor de análisis

- Clasifica cada control en **Cumple**, **No cumple**, **Sin verificar** y **No aplica**. Reconoce NO, NC, NO CUMPLE, No cumple – mora y No alcanza 70 como incumplimientos. Una celda vacía o PENDIENTE queda **sin verificar**, no se declara NO CUMPLE.
- Separa **ocho requisitos previos** y **noveno control Titulación** (no es aprobación de Complexivo). Calcula porcentajes sobre requisitos aplicables y reporta los no aplicables por separado.
- Calcula verificaciones y **personas únicas afectadas**, sin equiparar dos requisitos incumplidos a dos estudiantes.
- Genera distribución por carrera, sede y horario según datos efectivamente disponibles; matriz carrera × requisito (incumplimiento / sin verificar), priorización y lista nominal de casos, solamente en la instalación privada.
- Mantiene como referencia documental las cifras del Word de la cohorte presencial: **267 iniciales, 262 activos, 5 retirados, 255 en fase final y 12 fuera de fase final**. No afirma que llegar a fase final equivale a cumplir los nueve requisitos.
- Para online no inventa matrícula inicial, retiros ni resultados individuales. Cuando la base no está cargada, los resúmenes agregados se señalan como tales, sin desglosar incumplimiento de estados sin verificar.
- Si solo hay una parte de la nómina local, no mezcla sus porcentajes con los totales agregados de 262/101.
- Identifica las cédulas repetidas o vacías como una **advertencia que impide validar el informe como definitivo**.

### Pantalla de seguimiento

La sección **Estudiantes y requisitos** ahora incluye indicadores generales, nueve controles, cumplimiento por carrera, matriz de incidencias, filtros por requisito y estado, búsqueda por nombre o cédula, lista de seguimiento y clasificación editable de **Complexivo / Trabajo de Titulación**. La edición conserva la base local y los datos académicos anteriores.

### Capítulo 4 del PDF institucional

Contiene ocho apartados: caracterización de cohorte; requisitos; incidencias y prioridades; incidencias por carrera; cumplimiento integral; seguimiento nominal de casos; continuidad; y análisis académico-administrativo. Las tablas, figuras e interpretaciones surgen del mismo motor que la pantalla de la app. El índice automático del Bloque 02 incorpora estas nuevas secciones.

### Archivos

- Nuevo: `analysis/requirements.js`, `tests/block03.test.js`.
- Actualizados: `index.html`, `report_institucional.js`, `app.js`, `tests/block01.test.js`, `tests/block02.test.js`, `package.json`.
- La batería de pruebas `npm test` ahora incluye los bloques 01, 02 y 03. La interfaz y la exportación deben terminar de verificarse en Electron en Windows.

```powershell
git pull origin main
npm run check
npm test
npm start
```

No se publican cédulas, nombres ni notas de estudiantes en GitHub. Los documentos PDF y los listados nominales se generan en la instalación local, con la base privada del usuario.

## BLOQUE 02 · Documento INF institucional y estructura APA 7 (28/10/2026)

**Implementado directamente en `main`.** No se entregan PDF desde ChatGPT: se generan dentro de Informetit desde **Dos informes → Vista previa → Guardar PDF** o con los botones de descarga.

### Cambios
- `document/institutional.js`: módulo separado de presentación documental. Portada INF A4 según la *Guía de estandarización de portadas institucionales RGI e INF* (septiembre 2026), incluyendo encabezado de 18 cm y columnas de 4,80 / 9,50 / 3,70 cm, tres filas, logotipo, código, versión y fecha. Mantiene una zona para el título y bloque inferior de firmas de tres columnas de 6 cm.
- `report_institucional.js`: sustituye la portada y los párrafos introductorios antiguos; genera automáticamente el resumen ejecutivo, la introducción, los objetivos, el alcance, la metodología y los referentes normativos, distinguiendo dos modalidades. Construye índice de contenidos, índice de tablas e índice de figuras en función de los títulos existentes; no arrastra números de páginas del Word anterior.
- `electron-preload.js` y `electron-main.js`: imprimen encabezado INF en todas las páginas con **Página X de Y** automática mediante `printToPDF`. El motor intenta una segunda pasada de PDF para completar las páginas reales de los tres índices con `pdfjs-dist`. Si no puede analizar la paginación, deja un guion y lo comunica, **nunca inventa números**.
- `app.js`: sección **Dos informes** incorpora campos INF y controles de normativa y firmas; estos controles **no equivalen a firmas electrónicas** ni validan por sí solos las actas académicas.
- `tests/block02.test.js`: regresión de encabezados, portada, capítulos iniciales e índices. `tests/block01.test.js` se conserva y adapta.
- El contenido de los informes se limita a **octubre 2025–marzo 2026**, sin comparaciones con períodos anteriores.

### Instalación y comprobación en Windows

```powershell
git pull origin main
npm install
npm run check
npm test
npm start
```

`npm install` es necesario al actualizar por primera vez este bloque porque se añadió `pdfjs-dist` para obtener los números reales de los índices. La base nominal privada permanece **fuera del repositorio público**; el almacenamiento local no se borra con `git pull`.

### Lo que sigue pendiente

Las citas legales específicas requieren verificación de vigencia y los nombres, notas, actas, supletorios y defensas se completan desde los motores de evaluación de los siguientes bloques. Las áreas de firma se reservan, sin generar firmas falsas. La revisión final de paginación y saltos de tabla/figuras continuará en el Bloque 11.

## BLOQUE 01 · Base maestra y motor único de datos (octubre 2026)

**Implementado en main**. Este bloque no cambia el mecanismo de ejecución: sigue siendo una app de escritorio Electron y abre con `npm start`.

### Archivos nuevos
- `data/model.js`: esquema de datos versión 2, migración de bases anteriores, normalización de carreras/cédulas/modalidad, regla **Complexivo por defecto**, indicadores de requisitos, conciliación Moodle–Word y detección de notas contradictorias.
- `data/storage.js`: persistencia de la misma base local `informetit-v1` / `data/master` (IndexedDB), escritura transaccional y copia de respaldo interno cuando migra desde esquema 1.
- `tests/block01.test.js`: pruebas de integridad, migración, modalidades, requisitos, notas, discrepancias y generador.

### Archivos actualizados
- `app.js`: carga y guardado con los módulos nuevos; importación Excel/JSON validada antes de sustituir registros; conserva notas y las excepciones de Trabajo de Titulación; añade indicadores de integridad en Datos y respaldo.
- `report_institucional.js`: consulta el mismo motor de análisis nominal de la app. Si se cargó una cohorte parcial, no mezcla sus indicadores con los 262/101 fijos; si no hay registros nominales, identifica el resumen público agregado como fuente distinta.
- `index.html`: carga modelo y persistencia antes del resto de la interfaz.
- `package.json`: agrega `npm test` y amplía `npm run check`.

### Reglas de calidad
1. **Sin datos personales en el repositorio público**. La matriz nominal reside en la instalación privada de Electron. `git pull` actualiza el código; no sincroniza automáticamente datos privados.
2. Las cédulas permanecen como texto para conservar ceros iniciales.
3. Todos los estudiantes se clasifican inicialmente como Examen Complexivo; `trabajo` se conserva cuando fue asignado expresamente.
4. Una nota vacía no equivale a cero. Cero es válido si fue registrado como nota.
5. Una nota de Word igual a la de Moodle no se duplica. Una contradicción se excluye del promedio hasta revisarla. Se conserva la procedencia.
6. Una base parcial jamás debe presentarse como matrícula completa. El motor identifica sus fuentes.
7. No se declara como aprobado un examen a partir de una matriz de requisitos.

### Verificación local

```powershell
git pull origin main
npm run check
npm test
npm start
```

No se borran los datos actuales al actualizar el código. Se recomienda descargar un respaldo JSON privado antes de importar un reemplazo de la base.

**Siguientes bloques:** estructura documental institucional (02), análisis de requisitos (03), importación robusta Moodle (04), núcleos (05), Complexivo (06), Trabajo de Titulación (07) y los motores restantes.

## Generación de informes dentro de Electron

La generación y descarga se realiza **dentro de la app**, nunca se requiere recibir PDF por ChatGPT.

1. En **Resumen**, usa **Vista previa presencial** o **Vista previa online** para inspeccionar en la misma ventana el documento con su portada, capítulos, tablas y figuras.
2. En la vista previa, pulsa **Guardar informe en PDF**, o usa directamente **Descargar PDF presencial / online**.
3. Electron genera el documento mediante impresión nativa y abre el diálogo de Windows para elegir la carpeta y el nombre del archivo.
4. En **Dos informes**, selecciona la modalidad, comprueba la cobertura de núcleos y usa **Vista previa** o **Descargar PDF completo**.

Los documentos son borradores hasta incorporar y verificar todos los resultados. Las notas del Word están aceptadas como fuente del período; las discrepancias con Moodle se muestran para revisión, manteniendo el origen de cada registro. Los datos nominales nunca se publican en la rama pública.

## Informe institucional ampliado (28 de octubre de 2026)

A partir del PDF de 6 páginas y del Word de 131 páginas de referencia, se implementó `report_institucional.js` con las siguientes secciones: resumen ejecutivo, introducción, objetivos, metodología, marco normativo referencial, cronogramas, Fase I, cumplimiento y continuidad por carrera, Fase II con cuatro núcleos para cada carrera, Trabajo de Titulación, Fase III, conclusiones, recomendaciones y referencias. Los botones de descarga PDF se dirigen a este generador.

El módulo `nucleos_agregados.js` contiene solo estadísticas anónimas extraídas de las tablas del Word de trabajo: **19 núcleos de 5 carreras y 647 registros de calificaciones**, con cantidad, promedio, mínimo y máximo. **Son datos agregados procedentes del Word**, aceptados para este período; las discrepancias con Moodle se someten a revisión y no se incorporan nombres ni notas individuales al repositorio público. En el informe presencial se muestran los núcleos disponibles y los ausentes quedan pendientes. El informe online mantiene las notas pendientes.

La base privada conservada en ChatGPT incluye `notasBorrador`, con **647 notas extraídas** y vinculadas sin ambigüedad a sus registros originales, mientras que `notas` mantiene por separado las 11 notas previamente recibidas de Moodle. El código de Electron preserva estas listas cuando se importe una versión privada. No se suben datos nominales al repositorio mientras sea público.

Al descargar el PDF se obtiene un **borrador académico**, no el documento final de 131 páginas: el propio Word está incompleto, el marco jurídico necesita revisión de vigencia y faltan los resultados de Examen Complexivo, supletorios, defensas, ejecución documentada de cronogramas y algunos núcleos. No se interpolan notas.

Ejecutar las actualizaciones:

```powershell
git pull origin main
npm start
```

# Informetit · Electron Desktop · UTET

Informetit es una **aplicación de escritorio Electron** para registrar estudiantes, requisitos, núcleos estructurantes, evaluaciones y elaborar **dos informes de titulación**, presencial y online, para octubre 2025 – marzo 2026.

## Inicio desde Visual Studio Code (Windows / PowerShell)

Abre la terminal en la carpeta `Informetit` y ejecuta:

```powershell
git pull origin main
npm install
npm start
```

`npm start` abre una ventana **Electron**, no un servidor web ni una pestaña del navegador. La primera instalación requiere Internet para descargar Electron y las bibliotecas. Después puedes ejecutar `npm start` sin conexión.

- `npm start`: aplicación Electron de escritorio.
- `npm run dev`: alias de desarrollo que también abre Electron.
- `npm run check`: comprueba sintaxis del código JavaScript.
- `npm run web`: servidor opcional para diagnóstico, **no es el modo normal de trabajo**.

También puedes ejecutar `iniciar_windows.bat` desde la carpeta.

## Estructura

```text
package.json                   Dependencias y comando npm start
electron-main.js              Ventana de escritorio, seguridad, guardar PDF
electron-preload.js           Puente limitado para guardar PDF en Windows
scripts/preparar-bibliotecas.js  Copia XLSX y pdfMake a vendor al instalar
index.html                    Interfaz principal
app.js                        Base local, validaciones, notas y módulos
report_pdf.js                 Informes separados, tablas y gráficos
styles.css                    Estilos
vendor/                       Bibliotecas locales, generadas con npm install
server.js                     Solo modo diagnóstico npm run web
iniciar_windows.bat           Lanzador Electron
preparar_offline.bat          Instala dependencias una sola vez
clonar_windows.bat            Descarga código e instala Electron
```

## Descarga con git pull y protección de datos

**Uso actual con el repositorio público:** `git pull origin main` descarga el código Electron y el archivo `public_summary.js` con resultados institucionales **agregados, sin nombres, cédulas, correos ni notas individuales**. Al ejecutar `npm start`, el panel muestra 363 estudiantes (262 presencial, 101 online) como totales agregados. Se pueden generar borradores PDF APA 7 con gráficos de carrera, sede, horario y requisitos. Los datos individuales no están disponibles en la rama pública; no se crea ningún estudiante ficticio.

**Para que absolutamente todos los registros individuales se descarguen con `git pull`:** el propietario debe hacer PRIVADO el repositorio en GitHub (Settings → General → Danger Zone → Change repository visibility → Make private). Una vez privado y verificado, se podrá incorporar `data/base-gpt.json` directamente a `main`, retirando la excepción de seguridad correspondiente de `.gitignore`. Electron ya tiene programada la búsqueda de esa carpeta, y el mismo comando `git pull origin main && npm start` podrá actualizar tanto el código como la base.

**Nunca subir la nómina completa mientras el repositorio siga siendo público:** la visibilidad pública y el historial de commits permitirían descargar los datos de terceros, incluso si se borran en un commit posterior.

## Base GPT incluida en código privado: sin importar archivos

Para la cohorte octubre 2025 – marzo 2026, ChatGPT ha preparado un archivo privado de **código JavaScript** llamado `base-gpt.cjs`, que incluye 363 estudiantes y 11 notas verificadas del Núcleo 1 de Enfermería. Se distribuye como archivo descargable privado de ChatGPT (no por GitHub).

**Pasos mínimos:** descarga `base-gpt.cjs` desde el chat y déjalo en **Descargas**, ejecuta `git pull origin main` y `npm start`. Electron lo descubre, lee el objeto como JSON sin ejecutar código, lo registra en su base local y muestra los datos en el panel. No hay botón de importación, ni instalador PowerShell, ni servidor ni configuración de base de datos. También puedes colocarlo en `Informetit/private/base-gpt.cjs` para mantenerlo junto al proyecto.

La aplicación también reconoce automáticamente respaldos JSON de Informetit descargados anteriormente. Si el perfil ya tiene modificaciones, conserva las notas anteriores, agrega nuevas y registra diferencias como conflictos sin sobrescribir calificaciones originales.

**Privacidad:** `private/` está excluida del control de versiones. No uses `git add -f` ni publiques el archivo de código con cédulas y calificaciones. El archivo privado contiene datos reales de estudiantes. Para futuras actualizaciones, ChatGPT debe proporcionarte el archivo de código actualizado y tú descargarlo a tu equipo: no hay sincronización remota automática.

## Base de datos privada

La aplicación conserva la información en **IndexedDB dentro del perfil local de Electron**. Ni estudiantes ni notas se publican en GitHub. El repositorio solo contiene código. Para cargar la nómina y las primeras notas, abre **Datos y respaldo → Importar JSON maestro** y selecciona tu archivo privado `Informetit_base_local_2025-2026.json`.

Se puede importar Excel institucional `.xls` (también cuando el sistema exporta HTML con esa extensión), `.xlsx`, CSV y textos copiados de los libros de notas de Moodle. Al pegar notas, se concilian estudiantes, se detectan duplicados y se conservan las diferencias como conflictos.

**Importante:** los datos de tu navegador anterior (por ejemplo `localhost`) no se trasladan automáticamente a Electron. Exporta JSON en la versión anterior e impórtalo aquí si deseas conservarlos. Haz periódicamente **Datos y respaldo → Descargar JSON** para crear copias privadas.

## Descargar borradores desde el panel principal

El panel **Resumen** incluye dos botones independientes: **Descargar borrador presencial (PDF)** y **Descargar borrador online (PDF)**. Ambos usan la impresión nativa de Electron para exportar el PDF APA 7, respetando las fuentes disponibles y sin sustituir notas faltantes por estimaciones. En **Informes** sigue disponible **Descargar borrador APA 7 (PDF)** para la modalidad seleccionada.

Si el panel muestra 0 estudiantes, pulsa **Importar base GPT (JSON)** y selecciona el respaldo privado actualizado; el código GitHub **no contiene** la base de estudiantes ni sincroniza automáticamente con ChatGPT.

## Informes y PDF

Los informes presencial y online calculan sus propios indicadores: requisitos, carreras, sedes, calificaciones observadas, núcleos y evaluación final si está registrada. No se rellenan notas ausentes con valores inventados.

En **Informes** hay dos exportaciones:
- **Descargar PDF con gráficos:** PDF directamente desde pdfMake con el diálogo nativo de guardado de Electron.
- **PDF APA 7 · Times 12:** PDF generado con la impresión nativa de Chromium/Electron, fuente Times New Roman 12, cuerpo a doble espacio, márgenes académicos y portada institucional INF. También abre un diálogo de guardado nativo.

Los informes siguen siendo **borradores hasta disponer de todas las evidencias, calificaciones y validaciones**. La portada puede llevar el logo institucional y el código documental de cada modalidad.

## Privacidad y GitHub

No publiques cédulas, calificaciones, respaldos JSON o informes privados en un repositorio público. El archivo `.gitignore` excluye bibliotecas locales, `node_modules`, y extensiones de archivos sensibles frecuentes.

La aplicación no sincroniza datos automáticamente con ChatGPT. Para trabajar con una base actualizada desde un chat, importa un respaldo JSON privado.

## Solución de problemas

Si `npm start` informa que `electron` no existe, ejecuta `npm install` y revisa posibles errores de red.
Si `npm install` falla, comprueba tu versión de Node con `node -v` y de npm con `npm -v`. Se recomienda Node.js 20 o superior.
Si el PDF no se descarga, comprueba que `vendor/pdfmake.min.js` y `vendor/vfs_fonts.js` se hayan generado con `npm install`.
Si necesitas actualizar los archivos sin perder el respaldo local, ejecuta `git pull origin main` antes de `npm start`.

Código fuente: https://github.com/jeffer91/Informetit
