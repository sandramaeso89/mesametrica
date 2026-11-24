# Registro de agentes

## Develop — 24 de noviembre de 2026

### Encargo

Crear la primera versión de MesaMétrica con Next.js, TypeScript, persistencia opcional en Supabase y un algoritmo explicable de distribución.

### Trabajo realizado

- Separación de modelos, datos de demostración, algoritmo, persistencia e interfaz.
- Algoritmo determinista que prioriza relaciones con mayor peso, penaliza conflictos y equilibra ocupación.
- Análisis con puntuación, conflictos, afinidades cumplidas y explicación por invitado.
- Movimiento manual entre mesas con HTML Drag and Drop y bloqueo de mesas completas.
- Gestión básica de invitados y persistencia local inmediata.
- Adaptador opcional de Supabase mediante variables públicas de entorno.
- Interfaz responsive con estados de carga, guardado y avisos.
- Pruebas unitarias del algoritmo.

### Pendiente de Testing

Testing debe ejecutar pruebas, lint y build; revisar accesibilidad, responsive y los casos límite del algoritmo. Los defectos encontrados se devolverán a Develop.

## Testing — 24 de noviembre de 2026

### Primera devolución

Testing señaló que faltaban edición y eliminación de invitados, relaciones, gestión de mesas, alternativa accesible al arrastre y pruebas de casos límite. Develop implementó los puntos y solicitó otra revisión.

### Segunda devolución

Testing encontró rechazos sin mensaje al crear relaciones inválidas o mover personas a mesas completas. Develop añadió mensajes con `role="status"` y una etiqueta visible para mover invitados.

### Cierre

Testing aprobó 9 pruebas unitarias, lint y build. El Orquestador comprobó después el flujo principal en navegador a 390 px y 1440 px, sin desbordamiento horizontal ni errores de consola.

## Ronda 3 — auditoría previa a la entrega · 24 de noviembre de 2026

### Orquestador → Testing

Encargo: auditoría completa antes de entregar. Además del código, revisar la base de datos publicada, la web desplegada a 390, 1024 y 1440 px, y la coherencia entre `testing-report.md` y el comportamiento real.

### Testing → Develop

Testing devolvió siete fallos (F1–F7, detalle en `docs/testing-report.md`). Los más graves:

- **F1 (crítica):** cualquier visitante podía crear filas sin límite o sobrescribir la demo con datos que rompían la interfaz para todos.
- **F2 (alta):** la puntuación contaba como «juntas» a dos personas sin mesa. La demo sin generar mostraba 2 conflictos y 69/100. El informe de la Ronda 2 daba este requisito por superado.
- **F3 (alta):** un invitado añadido tras generar desaparecía del plano.

### Develop

- Base de datos: políticas limitadas a la fila de la demo, sin `INSERT` ni `DELETE`, permisos mínimos y `CHECK` de forma y tamaño. El cliente actualiza en vez de hacer `upsert`.
- Validación: `parsePlan` corrige cualquier dato externo antes de que llegue a la interfaz.
- Algoritmo: el conflicto pasa a ser restricción fuerte; la puntuación ignora a quien no tiene mesa y se multiplica por la proporción de sentados; se añade una fase de mejora local.
- Estado: reducer con historial, de modo que todo se puede deshacer.
- Interfaz rehecha como plano interactivo: arrastre con eventos de puntero (también táctil), intercambio al soltar sobre otra persona, vista previa de puntos antes de soltar, zona «Sin mesa», inspector con relaciones editables, registro del algoritmo paso a paso, paleta de comandos y atajos de teclado.

### Testing → Develop (repetición)

Al repetir las pruebas aparecieron tres fallos nuevos:

- **F9 (alta):** la mejora local volvía a juntar a dos personas en conflicto. La prueba nueva de F6 lo detectó antes de integrar.
- **F10 (media):** la demo quedaba en 5 de 8 afinidades cuando existe una solución con 7.
- **F8 (baja):** la búsqueda no ignoraba las tildes.

Develop los corrigió: objetivo lexicográfico (conflictos antes que afinidades), búsqueda local iterada con semilla fija y búsqueda normalizada. Cada corrección tiene su prueba.

### Cierre

Testing aprobó 32 pruebas, lint, tipos, build, `npm audit` y la revisión en navegador a 375, 1024 y 1440 px en tema claro y oscuro, sin errores de consola. El Orquestador desplegó la versión nueva y aplicó después la migración de políticas, para que la web publicada no perdiera el guardado en ningún momento. Al atacar la API publicada con la clave anónima, Testing encontró **F11**: la restricción de forma aceptaba un payload sin claves porque un `CHECK` que da `NULL` no falla. Develop lo corrigió con `coalesce` y restauró la fila de la demo. Las siete pruebas de la API pasan.
