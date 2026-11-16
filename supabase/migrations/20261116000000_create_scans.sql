create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  job_description text not null check (char_length(job_description) <= 20000),
  dimensions jsonb not null default '[]'::jsonb,
  matched_keywords text[] not null default '{}',
  missing_keywords text[] not null default '{}',
  required_gaps text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists scans_user_created_at_idx
  on public.scans (user_id, created_at desc);

alter table public.scans enable row level security;
revoke all on table public.scans from anon, authenticated;
grant select, insert on table public.scans to authenticated;

create policy "Users can read their own scans"
  on public.scans for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own scans"
  on public.scans for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
