# MesaMétrica · Orquestación

## Objetivo

Construir y publicar una aplicación Next.js que proponga distribuciones de mesas para eventos a partir de afinidades, conflictos y capacidad, con un algoritmo determinista que explique cada decisión.

## Agentes

| Agente | Instrucciones | Responsabilidad |
| --- | --- | --- |
| **Orquestador** | este archivo | Define alcance y criterios de aceptación, reparte tareas, integra, valida en navegador y autoriza la publicación. |
| **Develop** | [`agents/DEVELOP.md`](agents/DEVELOP.md) | Implementa cada tarea y corrige los fallos que devuelve Testing. |
| **Testing** | [`agents/TESTING.md`](agents/TESTING.md) | Revisa sin asumir que lo implementado es correcto, documenta evidencias y devuelve fallos reproducibles. |

## Flujo obligatorio

1. El Orquestador define el alcance y los criterios de aceptación de la tarea.
2. Develop implementa una versión verificable y la registra en [`docs/agent-log.md`](docs/agent-log.md).
3. Testing revisa y anota cada fallo con pasos, resultado esperado, resultado obtenido y archivo en [`docs/testing-report.md`](docs/testing-report.md).
4. Develop corrige todos los fallos reproducibles. Cada corrección añade una prueba que habría detectado el fallo.
5. Testing repite las comprobaciones hasta que no queden fallos críticos ni altos.
6. El Orquestador valida móvil (390 px), tableta (1024 px), escritorio (1440 px), build y despliegue público.

## Reglas comunes

- No incluir claves, tokens ni contraseñas en Git. La clave anónima de Supabase es pública por diseño; la seguridad la dan las políticas RLS.
- La aplicación debe funcionar en modo demostración sin configuración privada.
- Supabase se activa mediante variables de entorno y se degrada al modo local si faltan o fallan.
- Todo dato externo (Supabase, `localStorage`) se valida antes de llegar a la interfaz.
- El algoritmo debe ser determinista con la misma entrada.
- Cada decisión automática debe poder explicarse en la interfaz.
- No publicar hasta que lint, pruebas y build pasen.

## Tablero de tareas

| Id | Tarea | Agente | Estado | Evidencia |
| --- | --- | --- | --- | --- |
| T1 | Modelo de datos, datos de demo y algoritmo voraz | Develop | Hecha | Ronda 1 |
| T2 | CRUD de invitados, relaciones y mesas; alternativa al arrastre | Develop | Hecha | Rondas 1 y 2 |
| T3 | Mensajes de error junto a la acción | Develop | Hecha | Ronda 2 |
| T4 | Auditoría completa previa a la entrega | Testing | Hecha | Ronda 3, hallazgos F1–F9 |
| T5 | Restringir RLS a la fila de demo y validar datos externos (F1) | Develop | Hecha | `supabase/schema.sql`, `src/lib/validation.ts` |
| T6 | Corregir puntuación con invitados sin mesa y conflictos evitables (F2, F6) | Develop | Hecha | `src/lib/seating.ts`, 20 pruebas |
| T7 | Zona «Sin mesa», formularios con validación y estado con deshacer (F3, F5) | Develop | Hecha | `src/state/planReducer.ts`, componentes |
| T8 | Rediseño de la interfaz como plano interactivo con arrastre por puntero (F4, F7) | Develop | Hecha | `src/components/` |
| T9 | Verificación final en 390 / 1024 / 1440 px y despliegue | Orquestador | Hecha | Ronda 3, cierre |

## Decisiones del Orquestador

- **Un solo documento JSONB por evento.** El plan se lee y se guarda entero, sin consultas cruzadas, y la validación de estructura vive en un único punto (`parsePlan`). Para una versión con usuarios y edición simultánea se normalizaría en tablas `events`, `guests`, `tables` y `relations`.
- **Sin login en la demo.** Lo exige la entrega. A cambio, el rol anónimo solo puede leer y actualizar una fila concreta, con forma y tamaño acotados por `CHECK`.
- **Arrastre con eventos de puntero, no con HTML Drag and Drop**, para que funcione igual con ratón, lápiz y dedo.

## Nota sobre el bloque siguiente

Lo escribe automáticamente `next dev` y se conserva sin cambios: avisa a cualquier agente de que esta versión de Next.js tiene APIs distintas y de que debe consultar la documentación incluida en `node_modules/next/dist/docs/` antes de escribir código.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
