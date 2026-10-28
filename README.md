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

## Base GPT privada: carga automática al iniciar Electron

**No se publica la nómina en GitHub.** El código de `main` lee automáticamente el archivo privado `private/base-gpt.json` al iniciar Electron. La primera carga se importa a IndexedDB; después solo se incorporan estudiantes y notas nuevos sin sobrescribir modificaciones locales. Si aparece una nota oficial distinta a una ya existente, queda en la lista de conflictos para revisión.

### Instalar la base privada (una sola vez)

1. Descarga el archivo privado `Instalar_Base_GPT_Informetit.ps1` proporcionado en el chat de ChatGPT.
2. Abre VS Code en `Informetit`, ejecuta `git pull origin main` y después, en PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Instalar_Base_GPT_Informetit.ps1"
npm start
```

El instalador crea `private/base-gpt.json` y verifica la integridad de los datos. Si ya había una versión, crea un respaldo. Si Windows descarga en otra carpeta, reemplaza la ruta del comando por la ubicación real del archivo.

**Alternativa:** extrae `Paquete_Privado_Base_GPT_Informetit.zip` en la carpeta del proyecto; verifica que exista `Informetit/private/base-gpt.json`.

Para actualizaciones futuras, el asistente prepara un nuevo archivo privado con los datos aportados por el usuario. Al instalar el archivo actualizado y reiniciar Electron, la aplicación incorpora las novedades. **No existe sincronización automática directa entre ChatGPT y Electron** y no debe afirmarse lo contrario.

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
