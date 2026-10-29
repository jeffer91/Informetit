# Informetit — Cierre técnico de los bloques 01–08

**Versión:** 1.2.0 · **Período exclusivo:** Octubre 2025–marzo 2026 · **Aplicación:** Electron, base privada local · **Rama:** `main`

Esta guía corresponde al cierre de implementación de los ocho bloques. **El cierre técnico no significa que los informes estén firmados o aprobados por la institución.** Las cifras académicas se actualizan cuando se incorporan los registros y evidencias originales.

## 1. Documentos que produce la aplicación

Informetit permite visualizar y exportar **dos borradores PDF distintos**, uno de modalidad presencial y otro de modalidad online, directamente desde **Dos informes**. Cada documento contiene:

| Parte | Contenido |
|---|---|
| Portada INF | Encabezado, control documental, fecha, logotipo y responsables; firma pendiente |
| Índices | Contenidos, tablas y figuras; PDF con intento de paginación verificada |
| Resumen ejecutivo | Población, controles de requisitos y resultados calculados de cada mecanismo |
| 1. Introducción | Antecedentes, objetivos, alcance y metodología |
| 2. Marco legal | Referencias generales; versiones y artículos sujetos a validación |
| 3. Planificación | Cronograma Complexivo editable y estado de ejecución declarado |
| 4. Fase I | Nueve requisitos, incidencias por carrera, caracterización y seguimiento |
| 5. Fase II | Cuatro núcleos por carrera, notas nominales si existen, estadísticas, gráficos y faltantes |
| 6. Trabajo de Titulación | Rúbricas de los tres vocales, tutor, lector, cálculo, actas, resultados, cronograma |
| 7. Fase III | Complexivo: 40 % teoría + 60 % práctica, ordinario, supletorio, resultados y actas |
| 8. Síntesis | Consolidado de ambos mecanismos por carrera y modalidad |
| 9. Conclusiones | Indicadores comprobables y pendientes |
| 10. Recomendaciones | Medidas derivadas de las incidencias y límites |
| 11. Anexos | Fuentes, conciliación, hallazgos de calidad y límites de interpretación |
| Referencias | Inventario por completar con ediciones institucionales verificadas |

**No se mezclan las notas de los núcleos con las evaluaciones finales.** Un promedio agregado del Word no se convierte en calificación individual. El control “Titulación” o “AprobacionComplexivoProyecto” de Firebase no se convierte en nota.

## 2. Motores de la aplicación

- `data/model.js`: estructura local, migraciones, estudiantes y auditoría.
- `analysis/requirements.js`: cumplimiento de requisitos y seguimiento por carrera.
- `moodle/importer.js`: notas Moodle, vínculos y conflictos.
- `analysis/nuclei.js`: análisis de los cuatro núcleos.
- `analysis/complexivo.js` y `analysis/complexivo_import.js`: evaluaciones finales 40/60, actas y lotes.
- `analysis/trabajo.js`: tutor, lector, tres vocales, proyecto y nota final.
- `analysis/consolidado.js`: resultados integrados de ambos mecanismos.
- `analysis/quality.js`: auditoría documental y estadística, bloqueos y anexos.
- `firebase/reader.js` y `firebase/sync.js`: lectura institucional autorizada y conciliación; sin escrituras a Firestore.
- `document/institutional.js`, `report_institucional.js`, `electron-main.js`: formato INF, índices, HTML y guardado PDF.

### Ponderaciones

- **Complexivo:** ordinario = 40 % teoría + 60 % práctica. Supletorio separado y con fuente explícita.
- **Trabajo de Titulación:** oral = (práctica + defensa) / 2; final = 60 % escrito + 40 % oral, conforme al ejemplo de acta **4134** (9,00 escrito, 7,00 práctica, 8,00 defensa, 7,50 oral, **8,40 final**). **Verificar la norma institucional antes de aprobar el documento.**

## 3. Control de calidad antes de emitir

En **Dos informes → Auditoría del informe y cierre documental**, revisar:

1. Población vigente y conciliación de las diferencias entre padrón local, resumen del informe y Firebase.
2. Integridad de cédulas y carreras, separación de presencial y online.
3. Requisitos sin verificar y registros Moodle/Word en conflicto.
4. Núcleos sin nota y agregados del Word; diferenciar ausencia de una nota real de cero.
5. Ordinarios, supletorios, ausencias, registros duplicados y proyectos incompletos.
6. Número y fecha de cada acta, sus calificaciones y firmas en los documentos originales.
7. Códigos INF y fecha de elaboración; el sistema usa **POR ASIGNAR** si no hay código confirmado.
8. Marco jurídico vigente, cronogramas y evidencias reales de ejecución.
9. Integridad de la impresión PDF, saltos de página e índices.

**Una referencia introducida para un acta no acredita su autenticidad.** Los estados de aprobación calculados no constituyen por sí mismos estudiantes incorporados, graduación ni eficiencia terminal oficial.

## 4. Comprobar la aplicación en Windows

Cerrar Informetit, abrir PowerShell en la carpeta del proyecto y ejecutar:

```powershell
git pull origin main
npm install
npm run check
npm test
npm run smoke:pdf
npm start
```

- `npm run check`: comprueba sintaxis del proyecto.
- `npm test`: pruebas automatizadas de los ocho bloques y Firebase.
- `npm run smoke:pdf`: abre Electron en un **perfil temporal**, genera con datos ficticios ambos documentos, los imprime con Chromium, verifica firma PDF, contenido y la estabilidad de los números de índice; **no escribe ni utiliza datos reales**.
- `npm start`: interfaz normal para revisar y exportar los documentos reales.

Si el smoke test falla, anotar el mensaje exacto y revisar la paginación antes de emitir. Al exportar desde Informetit, **el resultado comunica si la paginación del índice fue verificada**. La app permite guardar borradores con advertencias; no los identifica como aprobados.

## 5. Fuentes necesarias para cierre institucional

Para cerrar los informes como documentos definitivos deben estar cargados y verificados: nómina de corte validada; libros de Moodle que faltan; actas ordinarias y supletorias; actas de Trabajo de Titulación; evidencia de ejecución de cronogramas; códigos y firmas; y versiones normativas vigentes.

La exportación Firebase previamente analizada contenía una población mayor que el padrón privado utilizado; **la conciliación de los registros adicionales no debe actualizar la población oficial automáticamente**. Los datos nominales se conservan en el almacenamiento privado de Electron y no se publican en GitHub.

## 6. Estado de entrega

**Bloques 01–08: implementación integrada a `main` y pruebas de lógica ejecutadas.** La impresión nativa de los PDF en **Windows** y la validación institucional con documentos reales **continúan pendientes de verificación**. El aplicativo debe permanecer en estado de borrador hasta completar esas comprobaciones.
