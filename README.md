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

Los documentos son borradores hasta incorporar y verificar todos los resultados. Las estadísticas de notas de Word mantienen estado provisional; las notas oficiales de Moodle permanecen en su registro distinto. Los datos nominales nunca se publican en la rama pública.

## Informe institucional ampliado (28 de octubre de 2026)

A partir del PDF de 6 páginas y del Word de 131 páginas de referencia, se implementó `report_institucional.js` con las siguientes secciones: resumen ejecutivo, introducción, objetivos, metodología, marco normativo referencial, cronogramas, Fase I, cumplimiento y continuidad por carrera, Fase II con cuatro núcleos para cada carrera, Trabajo de Titulación, Fase III, conclusiones, recomendaciones y referencias. Los botones de descarga PDF se dirigen a este generador.

El módulo `nucleos_agregados.js` contiene solo estadísticas anónimas extraídas de las tablas del Word de trabajo: **19 núcleos de 5 carreras y 647 registros de calificaciones**, con cantidad, promedio, mínimo y máximo. **Son datos provisionales** que requieren conciliación contra Moodle; no se incorporan nombres ni notas individuales al repositorio público. En el informe presencial se muestran los núcleos disponibles y los ausentes quedan pendientes. El informe online mantiene las notas pendientes.

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
