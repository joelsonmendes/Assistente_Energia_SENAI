
-- Assistente Energia SENAI V2
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'coordenador',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_file_id text not null,
  source_modified_time timestamptz,
  source_size bigint,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running','success','error')),
  rows_total int not null default 0,
  rows_energy int not null default 0,
  changes_count int not null default 0,
  message text
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null,
  source_sheet text,
  source_row int,
  area text,
  module text,
  uc text,
  course_name text,
  class_name text,
  sge_code text,
  period_text text,
  start_date date,
  end_date date,
  shift text,
  teacher text,
  workload_hours numeric,
  days_count numeric,
  status text,
  sge_status text,
  contract text,
  contract_type text,
  notes text,
  raw_data jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, fingerprint)
);

create index if not exists idx_courses_owner_start on public.courses(owner_id, start_date);
create index if not exists idx_courses_owner_end on public.courses(owner_id, end_date);
create index if not exists idx_courses_owner_teacher on public.courses(owner_id, teacher);
create index if not exists idx_courses_owner_active on public.courses(owner_id, active);

create table if not exists public.course_changes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sync_run_id uuid references public.sync_runs(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  fingerprint text not null,
  change_type text not null check (change_type in ('created','updated','missing')),
  changed_fields jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

alter table public.profiles enable row level security;
alter table public.sync_runs enable row level security;
alter table public.courses enable row level security;
alter table public.course_changes enable row level security;
alter table public.notes enable row level security;

drop policy if exists "profiles own" on public.profiles;
create policy "profiles own" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "sync own" on public.sync_runs;
create policy "sync own" on public.sync_runs for select using (auth.uid() = user_id);

drop policy if exists "courses own" on public.courses;
create policy "courses own" on public.courses for select using (auth.uid() = owner_id);

drop policy if exists "changes own" on public.course_changes;
create policy "changes own" on public.course_changes for select using (auth.uid() = owner_id);

drop policy if exists "notes own" on public.notes;
create policy "notes own" on public.notes for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
