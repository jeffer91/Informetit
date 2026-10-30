# Auditoría integral de Informetit

**Fecha:** 30 de octubre de 2026  
**Rama auditada:** `main` (sin ramas adicionales)  
**Versión:** 1.2.1  
**Alcance:** código público, lógica de integración, base privada local, importaciones, mecanismo de titulación, informes, privacidad, CI y documentación.  
**Limitación:** no se utilizó una instalación Windows ni se consultaron datos personales del perfil de Electron, registros reales de Firebase o actas firmadas. Los PDF de la prueba automática utilizan estudiantes ficticios.

## Resumen ejecutivo

La revisión del árbol de GitHub identificó inicialmente **72 entradas entre archivos y carpetas**. Se cotejaron módulos, rutas de carga, dependencias, pruebas y pipeline. Se comprobaron los dos mecanismos de titulación y las dos modalidades, las fuentes de notas, las condiciones de verificación, el índice PDF y las copias de respaldo.

La revisión reveló varios defectos corregidos en `main`. El generador `report_pdf.js` era una ruta histórica de PDF paralela al informe institucional, por lo que se retiró con sus scripts y su dependencia `pdfmake`. El único generador vigente para los informes finales es `report_institucional.js`, apoyado en `document/institutional.js` y Chromium/Electron.

## Hallazgos, riesgo y corrección

| Nivel | Hallazgo | Corrección aplicada |
| --- | --- | --- |
| Alto | El servidor HTTP de diagnóstico servía rutas de archivos existentes en el repositorio y podía exponer bases privadas o credenciales copiadas accidentalmente | Lista blanca de recursos públicos y validación `realpath` para bloquear rutas privadas y enlaces simbólicos externos; pruebas HTTP |
| Alto | La vista previa del importador Moodle validaba solo cantidades y no detectaba una modificación de nota, identidad o mecanismo sin cambiar el número de registros | Firma de contenido de identidades, notas, cursos, conflictos y registros sin vincular; reanálisis obligatorio |
| Medio | Una nota provisional igual a la de Moodle se marcaba como «ya existente» y no podía pasar a verificada después del cotejo | Nuevo estado de cotejo de borradores y promoción explícita al registro verificado, con procedencia y auditoría conservadas |
| Medio | La selección de base GPT podía priorizar el autoguardado del perfil sobre una base externa nueva | Archivos privados externos con prioridad de lectura; el autoguardado queda como recuperación |
| Medio | Existía un segundo generador de informes PDF con estilos y cálculos antiguos | Retirado `report_pdf.js`; eliminadas sus cargas, dependencias y enlaces de interfaz |
| Medio | La validación CI usaba Node 20, a pesar del mínimo declarado en `package.json` | Los trabajos de lógica usan Node 24 |
| Medio | El panel describía como obligatoria la privatización del repositorio para cargar una nómina local | Mensajes actualizados para reflejar que la base privada se importa localmente |
| Medio | Guías históricas mezclaban pasos de `pdfmake`, generadores antiguos y procedimientos de carga no vigentes | Reescritos `README.md` y `CIERRE_INFORMETIT.md` |
| Preventivo | Las reglas `.gitignore` no cubrían todas las variantes de copias anteriores `base-gpt.previous.cjs` y respaldo automático | Patrones ampliados para `base-gpt*.cjs/json`, respaldos y material de credenciales |

## Integraciones verificadas

| Subsistema | Resultado en código/pruebas |
| --- | --- |
| Electron, scripts de arranque y navegación | Un único `index.html` carga los motores en orden y un solo generador institucional PDF |
| IndexedDB y GPT privado | Persistencia local, respaldo JSON y CJS en perfil; lectura CJS sin ejecución de JavaScript |
| Carga inteligente | Detecta curso/núcleo, coteja identidad, evita duplicados, separa provisionales y registra conflictos |
| Mecanismos | Cambios auditados entre Complexivo, Trabajo y Sin definir, conservando antecedentes |
| Núcleos | Cobertura de Complexivo por carrera y modalidad; notas reales no se reemplazan por simulaciones |
| Interpolar | Proyección solo en memoria; no se escribe en notas oficiales, GPT, Firebase o informes |
| Evaluaciones | Complexivo 40/60 y Trabajo de Titulación con rúbrica separada, resultados sujetos a actas |
| Informes APA 7 | Narrativa previa/posterior por tabla, índices automáticos y cuerpo académico adaptado a INF |
| Servidor de diagnóstico | GET permitido solo para código y recursos de interfaz; HTTP 404 para documentos privados |
| Firebase | Integración limitada a `nucleos` y `complexivos`, consentimiento para sincronización de escritura, conflictos antes de conciliación |

## Evidencia de pruebas

- Pipeline de GitHub Actions: sintaxis y batería `npm test`, más prueba **PDF nativo Electron/Chromium**.
- Ejecución **287** de GitHub Actions: **214 pruebas aprobadas / 0 fallidas**.
- Humo PDF de la misma ejecución: **presencial 75 páginas**, **online 75 páginas**, **148 marcadores** de índice por modalidad y paginación estabilizada, solo con datos ficticios.
- Se agregaron pruebas de HTTP de diagnóstico, incompatibilidades con generadores antiguos, protección de patrones `.gitignore`, control de base Moodle obsoleta, y promoción verificada de un borrador coincidente.
- Revisar el resultado de la **última ejecución** de Actions tras cada actualización de este informe. El éxito de una ejecución anterior no garantiza el resultado de los commits posteriores.

## Condiciones que siguen pendientes de verificación externa

1. **Windows:** ejecutar `npm run check`, `npm test`, `npm run smoke:pdf` y revisar visualmente ambos PDF desde la instalación real.
2. **Base privada:** comparar los totales de estudiantes, requisitos y notas almacenados en IndexedDB con la base GPT más reciente; verificar respaldos sin sobrescribir cambios.
3. **Moodle:** completar núcleos por carrera; revisar calificaciones faltantes, seis valores ambiguos, correos duplicados y estudiantes de mecanismo sin definir.
4. **Firebase:** ensayar conexión y permisos reales con una cuenta autorizada, revisar la cola, y confirmar las discrepancias por cambios de mecanismo antes de escribir.
5. **Cierre institucional:** cotejar actas ordinarias, supletorios, proyectos y rúbricas, documentación, firmas, cronogramas y normativa vigente. Una aprobación calculada no constituye inscripción del título.

**Dictamen técnico:** se corrigieron las interferencias y defectos identificados en esta revisión del código y se añadieron controles de regresión. La aplicación permanece **lista para verificación operativa con datos reales**, no certificada como informe académico definitivo.
