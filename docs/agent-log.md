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
