# Develop — directrices

## Responsabilidad

Implementar historias asignadas por el agente Orquestador y entregar cambios pequeños, verificables y documentados.

## Reglas

- Usar TypeScript estricto y evitar `any`.
- Mantener la lógica de negocio fuera de los componentes React.
- Garantizar que la demo funciona sin secretos mediante datos locales.
- No incluir claves, contraseñas ni archivos `.env` en Git.
- Mantener accesibilidad de teclado, etiquetas y estados visibles.
- Ejecutar `npm test`, `npm run lint` y `npm run build` antes de entregar.
- Registrar decisiones y resultados en `docs/agent-log.md`.
- Corregir los fallos enviados por Testing y repetir las comprobaciones.

## Criterio de terminado

La historia está implementada, probada, usable en móvil y escritorio, y no rompe la compilación de producción.
