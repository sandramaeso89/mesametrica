# MesaMétrica

Distribución de invitados entre mesas para bodas y eventos, con un algoritmo determinista que explica cada decisión.

**Demo pública:** https://mesametrica.vercel.app · no requiere registro.

## Qué hace

- Dibuja el evento como un **plano**: mesas redondas, cada invitado en un asiento y las relaciones como líneas (afinidad continua, conflicto discontinuo).
- **Genera una propuesta** que nunca sienta juntas a dos personas en conflicto si existe alternativa, maximiza las afinidades y explica cada paso en un registro.
- **Ajuste manual** arrastrando asientos (ratón, lápiz o dedo). Al soltar sobre otra persona se intercambian; antes de soltar se ven los puntos que se ganan o pierden.
- Puntuación 0–100 con su fórmula visible, avisos de capacidad insuficiente y zona «Sin mesa» para quien queda fuera.
- Deshacer y rehacer (`⌘Z`, `⇧⌘Z`), paleta de comandos (`⌘K`) y atajos (`G` generar, `N` invitado, `T` mesa).
- Tema claro y oscuro. Adaptada a móvil con navegación por pestañas.

## Arquitectura

```
src/
  types/            modelo compartido
  lib/seating.ts    algoritmo y puntuación (funciones puras)
  lib/validation.ts saneado de datos externos
  lib/storage.ts    Supabase opcional + copia en el navegador
  state/            reducer con historial (deshacer/rehacer)
  components/       interfaz: plano, invitados, inspector, formularios
supabase/schema.sql tabla, restricciones y políticas RLS
```

La interfaz no contiene lógica de negocio: lee el estado y despacha acciones. Todo lo que llega de fuera pasa por `parsePlan`.

## Algoritmo

1. **Colocación voraz.** Primero quien tiene más relaciones. Cada persona va a la mesa con plaza que más suma (afinidad `+3 × peso`, conflicto `−7 × peso`), descartando las mesas donde tendría un conflicto si hay alternativa.
2. **Búsqueda local iterada.** Movimientos e intercambios entre mesas con evaluación incremental. El objetivo es lexicográfico: primero minimizar conflictos, después maximizar afinidades. Para salir de óptimos locales se reinicia desde perturbaciones con **semilla fija**, así que la misma entrada siempre da el mismo resultado.

En la demo alcanza el óptimo (7 de 8 afinidades: la octava es incompatible con un conflicto). Con 300 invitados y 30 mesas tarda ≈0,3 s.

**Puntuación:** afinidades cumplidas y conflictos separados suman `3 × peso`, conflictos en la misma mesa restan `7 × peso`. Se normaliza a 0–100 y se multiplica por la proporción de invitados sentados.

## Datos y seguridad

La demo no tiene login, así que todos los visitantes comparten un único plan en Supabase. El rol anónimo:

- solo puede leer y actualizar **esa fila** (las políticas comprueban su UUID);
- no puede crear ni borrar filas;
- está limitado por `CHECK` de forma y de tamaño (64 KB).

La clave anónima es pública por diseño. Nunca se usa la clave `service_role` en el cliente ni en Vercel. Para una versión con usuarios se sustituirían las políticas por propiedad con `auth.uid()` y se normalizaría el modelo en tablas.

## Trabajo con agentes

| Archivo | Contenido |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | Orquestador: flujo, reglas, tablero de tareas y decisiones |
| [`agents/DEVELOP.md`](agents/DEVELOP.md) | Instrucciones de Develop y arquitectura que debe respetar |
| [`agents/TESTING.md`](agents/TESTING.md) | Criterios de aceptación, gravedad y método de Testing |
| [`docs/agent-log.md`](docs/agent-log.md) | Registro de las tres rondas Develop ↔ Testing |
| [`docs/testing-report.md`](docs/testing-report.md) | Fallos con pasos y evidencias, correcciones y resultado final |

## Desarrollo

```bash
npm install
npm run dev
```

Sin variables de entorno la app funciona en modo local (`localStorage`). Para Supabase, copia `.env.example` a `.env.local`, ejecuta `supabase/schema.sql` y rellena las tres variables.

```bash
npm test        # 32 pruebas: algoritmo, validación y estado
npm run lint
npm run build
```
