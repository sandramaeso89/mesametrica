# Develop — directrices

## Responsabilidad

Implementar las tareas que asigna el Orquestador en `AGENTS.md` y corregir los fallos que devuelve Testing. Entregar cambios pequeños, verificables y documentados.

## Arquitectura que hay que respetar

| Capa | Ubicación | Regla |
| --- | --- | --- |
| Tipos | `src/types` | Un único modelo compartido por todas las capas. |
| Dominio | `src/lib/seating.ts` | Funciones puras y deterministas. Sin React, sin red, sin `Date` en decisiones. |
| Validación | `src/lib/validation.ts` | Todo dato externo pasa por `parsePlan` antes de llegar al estado. |
| Persistencia | `src/lib/storage.ts` | Supabase opcional; el navegador siempre guarda una copia. |
| Estado | `src/state/planReducer.ts` | Cada cambio es una acción. Las acciones inválidas devuelven el mismo estado. El historial permite deshacer. |
| Interfaz | `src/components` | Sin lógica de negocio: lee el estado y despacha acciones. |

## Reglas

- TypeScript estricto, sin `any`.
- Ningún `window.prompt`, `alert` ni rechazo silencioso: cada error se explica junto a la acción que lo provoca.
- Toda interacción con puntero tiene alternativa con teclado o con controles visibles.
- No incluir claves, contraseñas ni archivos `.env` en Git. Nunca usar la clave `service_role` en el cliente.
- Cada corrección de un fallo incluye una prueba que lo habría detectado.
- Ejecutar `npm test`, `npm run lint` y `npm run build` antes de entregar.
- Registrar decisiones y resultados en `docs/agent-log.md`.

## Criterio de terminado

La tarea está implementada y probada, funciona en móvil, tableta y escritorio, y no rompe la compilación de producción.
