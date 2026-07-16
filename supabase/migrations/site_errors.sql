-- site_errors: uncaught-error reports from the live site (src/lib/beacon.js).
-- Run this in the Supabase SQL editor (same flow as the guestbook migration).
--
-- Security model: the anon key ships in the public bundle, so anon may only
-- INSERT — it can never read the table back. Reading happens in the admin
-- app / dashboard with an authenticated role.

create table if not exists public.site_errors (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind       text not null check (kind in ('error', 'rejection')),
  message    text not null check (char_length(message) <= 500),
  source     text check (char_length(source) <= 300),
  url        text check (char_length(url) <= 300),
  ua         text check (char_length(ua) <= 200),
  viewport   text check (char_length(viewport) <= 20)
);

alter table public.site_errors enable row level security;

drop policy if exists "anon can report errors" on public.site_errors;
create policy "anon can report errors"
  on public.site_errors for insert
  to anon
  with check (true);

drop policy if exists "authenticated can read errors" on public.site_errors;
create policy "authenticated can read errors"
  on public.site_errors for select
  to authenticated
  using (true);

-- Keep the table from growing unbounded on the free tier: the beacon already
-- caps at 5 reports/session, but you can prune old rows periodically with:
--   delete from public.site_errors where created_at < now() - interval '90 days';
