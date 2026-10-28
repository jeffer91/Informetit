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
