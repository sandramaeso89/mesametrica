# MesaMétrica · Orquestación

## Objetivo

Construir y publicar una aplicación Next.js que proponga distribuciones de mesas para eventos a partir de afinidades, conflictos y capacidad.

## Agentes

- **Orquestador**: divide el trabajo, protege el alcance, revisa las decisiones, integra los cambios y autoriza la publicación.
- **Develop**: implementa según `agents/DEVELOP.md` y corrige los fallos concretos comunicados por Testing.
- **Testing**: aplica `agents/TESTING.md`, ejecuta las comprobaciones y documenta evidencias en `docs/testing-report.md`.

## Flujo obligatorio

1. El Orquestador define el alcance y los criterios de aceptación.
2. Develop implementa una versión verificable y registra su trabajo.
3. Testing revisa sin asumir que la implementación es correcta.
4. Develop corrige todos los fallos reproducibles.
5. Testing repite las comprobaciones hasta que no queden fallos bloqueantes.
6. El Orquestador valida móvil, escritorio, compilación y despliegue público.

## Reglas comunes

- No incluir claves, tokens ni contraseñas en Git.
- La aplicación debe funcionar en modo demostración sin configuración privada.
- Supabase debe activarse mediante variables de entorno y degradarse de forma segura al modo local si faltan.
- El algoritmo debe ser determinista con la misma entrada.
- Cada decisión automática debe poder explicarse en la interfaz.
- No publicar hasta que build y pruebas pasen.


<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
