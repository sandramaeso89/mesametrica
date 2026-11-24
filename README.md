# MesaMétrica

Aplicación Next.js para crear distribuciones de mesas explicables según afinidades, conflictos y capacidad.

## Desarrollo

```bash
npm install
npm run dev
```

La demo funciona con `localStorage`. Para usar Supabase, copia `.env.example` a `.env.local`, crea la tabla con `supabase/schema.sql` y configura las variables indicadas.

## Comprobaciones

```bash
npm test
npm run lint
npm run build
```

## Agentes

- `AGENTS.md`: orquestación general.
- `agents/DEVELOP.md`: implementación.
- `agents/TESTING.md`: revisión y criterios de aceptación.
- `docs/agent-log.md`: registro de trabajo.
- `docs/testing-report.md`: dos rondas de revisión, correcciones y evidencias finales.

## Datos de demostración

La aplicación funciona de inmediato con datos locales. Para la entrega publicada se puede conectar una fila de demostración de Supabase usando un UUID dedicado. La clave anónima es pública por diseño, pero nunca debe usarse la clave `service_role` en el navegador ni en Vercel.
