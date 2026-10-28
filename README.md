# Informetit · UTET

Aplicación web local para elaborar dos borradores independientes del **Informe Final del Proceso de Titulación** del período octubre 2025 – marzo 2026: presencial y online.

## Estado
Primera versión funcional de captura, validación, análisis preliminar y exportación de borradores. **No sustituye actas, notas oficiales ni la revisión institucional.** La portada INF definitiva y la maquetación completa de Word/PDF todavía están pendientes de desarrollo.

## Cómo usar
1. Abre `index.html` en un navegador moderno (o activa GitHub Pages desde Settings > Pages, branch main, raíz /).
2. En **Datos y respaldo**, pulsa **Importar JSON maestro** y selecciona el archivo privado `Informetit_base_local_2025-2026.json` preparado por ChatGPT. Este JSON contiene la nómina institucional y las 11 notas de ejemplo recibidas; **no se encuentra publicado en este repositorio**.
3. También puedes **Subir Excel institucional** para incorporar registros; acepta .xls HTML exportado por el sistema, .xlsx real y .csv con el encabezado `numeroIdentificacion`.
4. En **Estudiantes**, confirma si cada estudiante cursó Examen Complexivo o Trabajo de Titulación.
5. En **Notas de núcleos**, pega directamente los textos del libro de calificaciones de Moodle, incluidos sus encabezados, nombres, correos y 6 valores numéricos. El sistema intenta reconocer automáticamente el núcleo y la carrera; los vincula por correo y, si es necesario, por nombre exacto. Revisa la vista previa y pulsa guardar.
6. En **Evaluación final**, ingresa los resultados oficiales y referencias de actas. Las ponderaciones de evaluación requieren validación institucional.
7. En **Informes**, previsualiza el borrador presencial u online. Exporta en Word compatible (.doc), o usa Imprimir > Guardar como PDF.
8. En **Datos y respaldo**, descarga una copia JSON antes de cerrar sesión, cambiar navegador o limpiar datos. Puedes compartir ese JSON **en privado** con ChatGPT para conciliar nuevas notas y obtener un archivo maestro actualizado.

## Datos y privacidad
- La aplicación no tiene un servidor de datos ni cuentas. Guarda todo en el almacenamiento **IndexedDB del navegador**, con alternativa a localStorage.
- GitHub Pages publica los archivos de código, **no** almacena de forma privada las cédulas ni notas.
- **No** subas el JSON maestro, Excel con estudiantes o archivos con calificaciones a este repositorio público.
- Para que ChatGPT edite una base que existe solo en tu navegador, **debes exportar y adjuntar el JSON**. No existe sincronización automática con el navegador.
- Los datos nuevos que se pegan en el formulario permanecen en el navegador; las notas duplicadas idénticas no se agregan y las diferentes se guardan como conflictos pendientes.
- Las notas ausentes permanecen como **pendientes**. Nunca se inventan o interpolan calificaciones oficiales. Si se necesita un escenario estimativo, debe separarse claramente y excluirse del informe oficial.

## Organización
```
index.html   - interfaz y entradas
styles.css   - estilos compactos adaptables
app.js       - almacenamiento, importaciones, cálculos, cronogramas y borradores
README.md    - instrucciones y limitaciones
```

## Configuración institucional
- Dos informes: presencial y online, con sus propias tablas.
- Cronogramas 2025–2026 precargados de Trabajo de Titulación (20 actividades) y Examen Complexivo (6 actividades).
- Requisitos de titulación: Académico, Documentación, Financiero, Prácticas, Vinculación, Seguimiento, Inglés, Actualización de datos y Titulación.
- No equiparar cumplimiento de requisitos con aprobación final ni modalidad de estudios con mecanismo de titulación.


## Informes PDF y graficos (actualizacion octubre 2026)
- **Descargar PDF con graficos:** genera PDF separado por modalidad a partir de las tablas de requisitos, carreras, sedes, horarios y, si existen, notas por nucleo y estados de evaluacion. Los graficos se crean solo con valores existentes, nunca con notas interpoladas.
- **PDF APA 7 / Times 12:** abre una vista de impresion en Times New Roman de 12 puntos, interlineado doble y margenes de 2,54 cm para el cuerpo del informe. Usa el dialogo del navegador para seleccionar **Guardar como PDF**. La portada usa el estandar institucional INF en A4 y margenes de 1,50 cm.
- **Portada institucional:** incorpora el logotipo mediante el boton **Subir/cambiar logotipo** en Informes, ademas de los campos de codigo, version, fecha y firmas.
- **Figuras relevantes:** distribucion por carrera, sede, horario; cumplimiento de ocho requisitos previos; incidencias por requisito; cumplimiento integral; volumen y promedios por nucleo; histograma de calificaciones; promedios por carrera y resultados finales cuando existan.
- **Diferencia de fuentes:** el requisito Titulacion no equivale a la aprobacion del Examen Complexivo. Los datos pendientes se excluyen de los promedios, y los borradores no se presentan como informes aprobados.
- **Para Windows:** ejecuta `clonar_windows.bat` para descargar el codigo a tu escritorio (sin sobrescribir una carpeta existente); dentro de la carpeta usa `iniciar_windows.bat`. Para trabajar sin conexion primero ejecuta `preparar_offline.bat` una vez con Internet.
- El PDF de descarga directa usa tipografia PDF incorporada, mientras que el boton **PDF APA 7 / Times 12** emplea Times New Roman real al imprimir desde el navegador.

Enlace al ZIP del codigo: https://github.com/jeffer91/Informetit/archive/refs/heads/main.zip
