-- MesaMétrica · esquema de la demo pública
--
-- La demo no tiene login: todos los visitantes comparten un único plan cuyo
-- UUID es público (NEXT_PUBLIC_DEMO_EVENT_ID). Por eso el acceso anónimo se
-- limita a ESA fila y a leerla o actualizarla con un tamaño acotado. No se
-- pueden crear filas nuevas ni borrar. En una aplicación con usuarios, estas
-- políticas se sustituirían por propiedad del registro con auth.uid().
--
-- El script es idempotente: se puede ejecutar varias veces.

create table if not exists public.seating_plans (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Límites de integridad: el payload debe tener la forma esperada y no superar
-- 64 KB (suficiente para varios cientos de invitados).
alter table public.seating_plans drop constraint if exists seating_plans_payload_shape;
alter table public.seating_plans add constraint seating_plans_payload_shape check (
  jsonb_typeof(payload) = 'object'
  and jsonb_typeof(payload -> 'guests') = 'array'
  and jsonb_typeof(payload -> 'tables') = 'array'
  and jsonb_typeof(payload -> 'relations') = 'array'
);
alter table public.seating_plans drop constraint if exists seating_plans_payload_size;
alter table public.seating_plans add constraint seating_plans_payload_size check (
  pg_column_size(payload) <= 65536
);

alter table public.seating_plans enable row level security;

-- Permisos mínimos: el rol anónimo solo puede leer y actualizar.
revoke all on public.seating_plans from anon, authenticated;
grant select, update (payload, updated_at) on public.seating_plans to anon;

drop policy if exists "read public demo plans" on public.seating_plans;
drop policy if exists "insert public demo plans" on public.seating_plans;
drop policy if exists "update public demo plans" on public.seating_plans;
drop policy if exists "anon reads demo plan" on public.seating_plans;
drop policy if exists "anon updates demo plan" on public.seating_plans;

create policy "anon reads demo plan"
on public.seating_plans for select
to anon
using (id = '11111111-1111-4111-8111-111111111111'::uuid);

create policy "anon updates demo plan"
on public.seating_plans for update
to anon
using (id = '11111111-1111-4111-8111-111111111111'::uuid)
with check (id = '11111111-1111-4111-8111-111111111111'::uuid);

-- Fila de demostración. La crea el propietario del proyecto (no el rol anónimo).
insert into public.seating_plans (id, payload)
values (
  '11111111-1111-4111-8111-111111111111',
  '{"eventName":"Evento de demostración","guests":[],"relations":[],"tables":[],"updatedAt":"2026-11-24T00:00:00.000Z"}'::jsonb
)
on conflict (id) do nothing;
