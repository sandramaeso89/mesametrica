# Testing — directrices de aceptación

Testing revisa el trabajo de Develop de forma independiente. Un requisito solo se marca como superado cuando existe evidencia reproducible.

## Flujo de revisión

1. Instalar las dependencias con el gestor indicado por el lockfile.
2. Ejecutar comprobación de tipos, pruebas, lint y build, cuando existan esos scripts.
3. Revisar el flujo principal en navegador, en una anchura móvil de 390 px y en escritorio.
4. Registrar comandos, resultados y fallos en `docs/testing-report.md`.
5. Devolver a Develop cualquier fallo. Repetir la revisión después de la corrección.

## Requisitos funcionales

- La aplicación abre sin credenciales ni protección de Vercel.
- Hay un evento de demostración útil al primer acceso.
- Se pueden crear, editar y eliminar invitados sin recargar la página.
- Cada invitado admite nombre, grupo y necesidades o notas.
- Se pueden definir afinidades y conflictos sin relaciones consigo mismo ni duplicados incoherentes.
- Se pueden crear mesas y modificar su nombre y capacidad. La capacidad debe ser un entero positivo.
- La generación automática asigna a cada invitado como máximo una vez y nunca supera la capacidad total disponible.
- Si no hay plazas suficientes, la interfaz lo explica y no presenta una distribución falsa como válida.
- La misma entrada produce el mismo resultado.
- La distribución muestra puntuación y explicaciones comprensibles.
- Una edición manual no puede duplicar invitados ni exceder una mesa sin un aviso claro.
- La persistencia con Supabase es opcional. Sin variables de entorno, la demo sigue funcionando y lo comunica sin mostrar errores técnicos.

## Algoritmo

Las pruebas unitarias deben cubrir, como mínimo:

- asignación básica dentro de la capacidad;
- determinismo;
- afinidad favorecida;
- conflicto penalizado o separado cuando sea posible;
- capacidad insuficiente;
- cero invitados y cero mesas;
- ningún invitado duplicado o perdido cuando existe capacidad suficiente.

## Validación y errores

- Los formularios impiden nombres vacíos y capacidades inválidas.
- Los errores aparecen junto a la acción que los provoca.
- No se exponen claves, tokens, trazas ni variables de entorno en la interfaz o el repositorio.
- La consola del navegador no contiene errores durante el flujo principal.

## Accesibilidad y diseño adaptable

- Todo campo tiene una etiqueta asociada.
- La navegación y las acciones principales son utilizables con teclado y muestran foco visible.
- Los botones de icono tienen nombre accesible.
- Los estados importantes no dependen solo del color.
- El contraste del texto es legible.
- A 390 px no hay desplazamiento horizontal, campos cortados ni acciones inaccesibles.
- En escritorio se aprovecha el espacio sin líneas de texto excesivamente largas.
- Arrastrar y soltar tiene una alternativa operable con teclado o mediante controles.

## Criterio de entrega

La revisión es `PASS` cuando el build y las pruebas terminan correctamente, el flujo principal funciona en móvil y escritorio y no quedan fallos críticos o altos. Las mejoras estéticas pueden constar como observaciones sin bloquear.
