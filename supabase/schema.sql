create table if not exists public.seating_plans (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.seating_plans enable row level security;

-- La prueba usa una única fila pública de demostración. El UUID de esa fila se
-- configura también como NEXT_PUBLIC_DEMO_EVENT_ID. Para una aplicación real,
-- sustituir estas políticas por ownership con auth.uid().
create policy "read public demo plans"
on public.seating_plans for select
to anon
using (true);

create policy "insert public demo plans"
on public.seating_plans for insert
to anon
with check (true);

create policy "update public demo plans"
on public.seating_plans for update
to anon
using (true)
with check (true);
