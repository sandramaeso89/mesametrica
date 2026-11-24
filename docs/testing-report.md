# Informe de Testing

**Estado:** PASS. Testing completó la revisión de código y las comprobaciones automáticas. El Orquestador completó después la comprobación visual en navegador.

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

## Resultado final

| Comprobación | Estado | Evidencia |
| --- | --- | --- |
| Pruebas del algoritmo | PASS | `npm test`: 1 archivo, 9 pruebas superadas |
| Lint | PASS | `npm run lint`: sin errores |
| Build de producción | PASS | `npm run build`: compilación y TypeScript correctos; ruta `/` prerenderizada |
| Asignación y capacidad | PASS | pruebas de capacidad suficiente, insuficiente y mesa completa |
| Determinismo | PASS | dos ejecuciones con la misma entrada producen las mismas mesas |
| Afinidades y conflictos | PASS | casos específicos cubiertos y gestión disponible en la interfaz |
| Integridad de invitados | PASS | prueba sin invitados duplicados o perdidos cuando hay capacidad |
| CRUD principal | PASS | alta, edición y eliminación de invitados; alta y edición de mesas |
| Alternativa al arrastre | PASS | selector visible y etiquetado para mover a otra mesa |
| Persistencia sin secretos | PASS | Supabase es opcional y existe fallback en `localStorage` |
| Revisión visual móvil/escritorio | PASS | Orquestador: 1440 × 1000 y 390 × 844, sin desbordamiento horizontal ni errores de consola |

## QA visual del Orquestador

- La página abrió con datos de demostración y controles accesibles.
- `Generar propuesta` asignó 12 de 12 invitados, dejó 0 conflictos y produjo una puntuación de 88/100.
- Las tres mesas respetaron su capacidad de 4 personas.
- La interfaz mostró explicaciones de afinidad y un selector visible como alternativa al arrastre.
- A 390 px, `scrollWidth` no superó el ancho útil del documento.
- La consola no registró errores ni avisos durante el flujo principal.

## Comandos ejecutados

```text
npm test
npm run lint
npm run build
npm run dev
```

El último comando no pudo escuchar en el puerto 3000 por una restricción del entorno. No es un fallo de compilación de la aplicación.

## Casos unitarios cubiertos

- todos los invitados quedan sentados cuando hay capacidad;
- ninguna mesa supera su capacidad;
- resultado determinista;
- separación de un conflicto fuerte;
- rechazo de movimientos hacia una mesa completa;
- conservación de una afinidad fuerte;
- invitados sin asiento cuando no hay plazas suficientes;
- evento sin invitados y evento sin mesas;
- ausencia de invitados duplicados o perdidos.
