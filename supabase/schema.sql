-- Execute no SQL Editor do Supabase.
create table if not exists public.app_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_states enable row level security;

create policy "Usuário acessa apenas seu estado"
  on public.app_states for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
