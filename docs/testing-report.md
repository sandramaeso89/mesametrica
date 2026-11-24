# Informe de Testing

**Estado:** PASS tras la Ronda 3. Las rondas 1 y 2 cubrieron la primera versión. La Ronda 3 es una auditoría completa previa a la entrega, con revisión de la base de datos publicada.

## Ronda 1

Testing detectó estos incumplimientos y los devolvió a Develop:

- faltaban edición y eliminación de invitados;
- no había gestión de afinidades y conflictos;
- no se podían crear o editar mesas y su capacidad;
- arrastrar y soltar no tenía alternativa accesible;
- faltaban pruebas de capacidad insuficiente, eventos vacíos, afinidad e invariantes de duplicados.

Develop corrigió los puntos y solicitó una nueva revisión.

## Ronda 2

Las comprobaciones automáticas pasaron, pero la revisión estática detectó dos rechazos silenciosos: relaciones inválidas o duplicadas y movimientos hacia mesas completas. También se pidió que el selector alternativo al arrastre fuese visible. Develop añadió mensajes con `role="status"` y una etiqueta visible `Mover`.

## Ronda 3 — auditoría previa a la entrega

Testing revisó el código, la base de datos publicada en Supabase y la web desplegada. Encontró diez fallos (F8, F9 y F10 aparecieron al repetir las pruebas tras las primeras correcciones). Dos de ellos (F2 y F3) contradecían requisitos marcados como superados en la Ronda 2.

| Id | Gravedad | Archivo | Pasos | Esperado | Obtenido |
| --- | --- | --- | --- | --- | --- |
| F1 | Crítica | `supabase/schema.sql` | Con la clave anónima del bundle: `insert` de una fila nueva y `update` de la fila de demo con `guestIds` inexistentes o `capacity: 1e9`. | El rol anónimo solo puede tocar la fila de demo y los datos se validan. | Políticas `using (true)`: se podían crear filas ilimitadas y sobrescribir la demo. Un id inexistente rompía la interfaz para todos (`guestById.get(id)!`) y una capacidad enorme bloqueaba el navegador. `anon` tenía además permisos `DELETE` y `TRUNCATE`. |
| F2 | Alta | `src/lib/seating.ts` | Abrir la demo sin generar. | 0 conflictos, 0 afinidades, puntuación 0. | 2 conflictos, 8 afinidades y 69/100 con nadie sentado: `undefined === undefined` contaba a dos personas sin mesa como «juntas». Con 10 de 12 personas sin mesa la puntuación era 58. |
| F3 | Alta | `SeatingWorkspace.tsx` | Generar y después añadir un invitado. | El invitado aparece y se puede sentar. | No aparecía en el plano y solo se podía colocar regenerando, lo que borraba los ajustes manuales. |
| F4 | Media | `globals.css` | Abrir la web a 1024 px. | Sin desplazamiento horizontal. | `scrollWidth` 1114 px: el botón «Generar propuesta» quedaba cortado. |
| F5 | Media | `SeatingWorkspace.tsx` | Editar invitado y pulsar «Cancelar» en el grupo. Editar mesa con capacidad 0. | Cancelar no cambia nada; el error se explica. | Cancelar borraba el grupo y las notas. La capacidad inválida se ignoraba sin mensaje. |
| F6 | Media | `src/lib/seating.ts` | Plan con conflicto de peso 1 entre a y b, ambos con afinidad 3 con c y sitio para separarlos. | a y b en mesas distintas. | Los sentaba juntos porque las afinidades sumaban más que la penalización. |
| F7 | Media | `SeatingWorkspace.tsx` | Arrastrar un invitado en una pantalla táctil. | Se puede mover. | HTML Drag and Drop no funciona con el dedo. |
| F8 | Baja | `GuestPanel.tsx`, `CommandPalette.tsx` | Buscar «lucia» con una invitada «Lucía». | La encuentra. | Sin resultados. Detectado al repetir la prueba tras el rediseño. |
| F9 | Alta | `src/lib/seating.ts` | Repetir la prueba de F6 tras añadir la fase de mejora local. | 0 conflictos. | La mejora local volvía a juntar a a y b porque su objetivo sumaba afinidades y conflictos en la misma escala. Detectado por la prueba nueva de F6 antes de integrar. |
| F10 | Media | `src/lib/seating.ts` | Generar la demo y contar afinidades. Comparar con una distribución hecha a mano. | La mejor distribución posible: 7 de 8 afinidades, 0 conflictos. | 5 de 8. La mejora local se quedaba en un óptimo local porque llegar al óptimo exige dos intercambios seguidos. |

### Correcciones de Develop y nueva verificación

| Id | Corrección | Prueba que lo cubre | Estado |
| --- | --- | --- | --- |
| F1 | Políticas limitadas al UUID de la demo, sin `INSERT` ni `DELETE`, permisos mínimos (`SELECT` y `UPDATE` de dos columnas), `CHECK` de forma y de 64 KB. El cliente usa `update` y valida todo con `parsePlan`. | `validation.test.ts`: datos corruptos se corrigen; comprobación SQL en la base publicada. | PASS |
| F2 | Solo cuentan las relaciones con las dos personas sentadas; la puntuación se multiplica por la proporción de sentados y se avisa de las plazas que faltan. | «no cuenta como juntos a dos invitados sin mesa», «penaliza la puntuación cuando falta gente por sentar». | PASS |
| F3 | Zona «Sin mesa» siempre visible, que admite arrastrar en ambos sentidos. | Navegador: alta de invitado → aparece en «Sin mesa» → arrastre a una mesa. | PASS |
| F4 | Columnas con `minmax(0, 1fr)` y barra de herramientas que se pliega. | Navegador a 1024 px: `scrollWidth` 1009 ≤ 1024. | PASS |
| F5 | Formularios en `<dialog>` con validación y errores junto al campo; el reducer rechaza capacidades inválidas. | `planReducer.test.ts`: «no permite reducir una mesa por debajo de las personas sentadas». | PASS |
| F6 | El conflicto es una restricción fuerte siempre que exista alternativa; si no la hay, el registro lo marca como «conflicto inevitable». | «separa un conflicto aunque las afinidades empujen a juntarlos», «acepta un conflicto solo cuando no hay ninguna alternativa». | PASS |
| F7 | Arrastre con eventos de puntero (ratón, lápiz y dedo) y botones «Mover a» como alternativa. | Navegador: arrastre, intercambio y arrastre a «Sin mesa». | PASS |
| F8 | Búsqueda sin tildes ni mayúsculas. | Navegador: «lucia» encuentra «Lucía». | PASS |
| F9 | Objetivo lexicográfico: primero minimizar conflictos, después maximizar afinidades. | Misma prueba de F6. | PASS |
| F10 | Búsqueda local iterada: evaluación incremental y perturbaciones con semilla fija; el esfuerzo se acota por tamaño, no por tiempo, para seguir siendo determinista. | «encuentra el óptimo de la demo», «resuelve 300 invitados sin conflictos» (≈0,3 s). | PASS |

## Resultado final

| Comprobación | Estado | Evidencia |
| --- | --- | --- |
| Pruebas | PASS | `npm test`: 3 archivos, 32 pruebas (algoritmo, validación y estado) |
| Lint | PASS | `npm run lint` sin errores ni avisos |
| Escala | PASS | 300 invitados y 30 mesas en ≈0,3 s, sin conflictos |
| Tipos | PASS | `npx tsc --noEmit` |
| Build de producción | PASS | `npm run build`: ruta `/` prerenderizada |
| Dependencias | PASS | `npm audit --omit=dev`: 0 vulnerabilidades |
| Determinismo | PASS | dos ejecuciones con la misma entrada producen las mismas mesas |
| Distribución de la demo | PASS | 12/12 sentados, 0 conflictos, 7 de 8 afinidades (la octava es incompatible con un conflicto), 96/100 |
| RLS y permisos | PASS | `pg_policies` y `role_table_grants` revisados en el proyecto publicado |
| Arrastre e intercambio | PASS | ratón y eventos de puntero simulados; vista previa de puntos antes de soltar |
| Deshacer / rehacer | PASS | `⌘Z` y `⇧⌘Z`, prueba de reducer |
| Responsive | PASS | 375 px, 1024 px y 1440 px sin desplazamiento horizontal |
| Consola | PASS | sin errores durante el flujo principal |

## Comandos ejecutados

```text
npm test
npm run lint
npx tsc --noEmit
npm run build
npm audit --omit=dev
```
