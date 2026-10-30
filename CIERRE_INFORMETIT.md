# Informetit — Cierre técnico y controles de entrega

**Versión auditada:** 1.2.1 · **Rama:** `main` · **Cohorte:** octubre 2025–marzo 2026.

Este archivo sustituye el cierre técnico histórico de 1.2.0. La versión de 1.2.1 elimina el generador PDF paralelo y refuerza privacidad, persistencia y cotejo. **El cierre técnico no implica titulación institucional ni aprobación de actas.**

## Arquitectura vigente

- `app.js`, `index.html` y `styles.css`: interfaz Electron de escritorio.
- `data/model.js` y `data/storage.js`: contrato de datos, migración, IndexedDB y respaldo privado.
- `data/student-import.js`: carga de nómina sin inferir el mecanismo.
- `moodle/importer.js` y `moodle/intelligent.js`: importación, reconocimiento, cotejo de identidad, conflictos y verificación de borradores.
- `analysis/mechanism.js`: cambios manuales y masivos de mecanismo con auditoría y conservación de historia.
- `analysis/interpolation.js`: simulación estadística **no persistida**, separada de calificaciones oficiales.
- `analysis/requirements.js`, `analysis/nuclei.js`, `analysis/complexivo.js`, `analysis/trabajo.js`, `analysis/consolidado.js`: indicadores por modalidad y mecanismo.
- `analysis/table-commentary.js`, `document/institutional.js`, `report_institucional.js`: único motor PDF HTML/Chromium con narrativa de tablas y adaptación a APA 7.
- `firebase/reader.js` y `firebase/sync.js`: lectura/conciliación, y escrituras **solo mediante habilitación explícita**, acotadas a `nucleos` y `complexivos`.
- `server.js`: diagnóstico HTTP localhost con lista blanca de recursos públicos. **No expone archivos GPT, credenciales o respaldos**.

El generador `report_pdf.js` fue eliminado: sus estilos y cálculos antiguos ya no se cargan ni pueden competir con el informe institucional vigente. También se retiró `pdfmake` de las dependencias.

## Fuente de verdad y seguridad

La base académica operativa es IndexedDB. La copia automática `base-gpt.cjs` es un respaldo privado en el perfil Electron, y no sustituye una conexión remota a ChatGPT. Si existe una base GPT nueva en Descargas o la carpeta privada, se prioriza para lectura; el cargador no ejecuta código del archivo `.cjs`.

Las notas provenientes de Word, fuentes agregadas o textos ambiguos permanecen provisionales hasta cotejo. Un valor estimado no acredita a nadie. La reclasificación entre Examen Complexivo y Trabajo conserva las calificaciones antiguas y recalcula la población de cada modalidad. Firebase no borra automáticamente los antecedentes históricos externos al reclasificar: las discrepancias se revisan.

## Fórmulas e indicadores

- Núcleos: cuatro por carrera; solo estudiantes confirmados en Complexivo, sin mezclar agregados Word ni imputaciones.
- Examen Complexivo: 40 % teoría y 60 % práctica en ordinario; recuperación documentada aparte.
- Trabajo de Titulación: ponderaciones definidas por la rúbrica implementada, sujetas a la norma/actas oficiales.
- Requisitos: nueve controles; cumplimiento administrativo no equivale a aprobar el examen ni a obtener el título.
- Informes: presencial y online calculados por separado, encabezado INF, índices, introducción e interpretación de cada tabla, interlineado doble, sangrías y referencias APA 7 adaptadas.

## Comprobaciones y limitaciones

En Windows:

```powershell
git pull origin main
npm install
npm run check
npm test
npm run smoke:pdf
npm start
```

GitHub Actions comprueba sintaxis, pruebas y humo PDF con **personas ficticias**. Para una entrega institucional debe comprobarse también la impresión **en Windows**, integridad de los índices y firmas, actas de ordinarios/supletorios, defensa de proyectos, requisitos, evidencias de cronograma, normativa vigente y padrón de corte. No afirmar cierre académico definitivo antes de resolver esos puntos.

El historial anterior de implementación está disponible en Git. Este documento refleja la arquitectura actual.
