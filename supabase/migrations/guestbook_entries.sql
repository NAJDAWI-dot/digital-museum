-- guestbook_entries: the public visitor guestbook (src/components/Guestbook.jsx).
-- Run this in the Supabase SQL editor (same flow as the other migrations in
-- this folder — this repo doesn't use `supabase db push`).
--
-- This file was reconstructed on 2026-07-22 from `supabase db dump -s public`
-- against the live project (tqmbdnodqcheivrzdhkc) — the table and its
-- policies had previously only ever been applied by hand in the SQL editor
-- and were never committed anywhere. This is now the source of truth; if you
-- change the live policies again, update this file to match.
--
-- Security model: anon may INSERT a pending entry (approved forced to false
-- by the CHECK constraint below — an insert attempting approved=true is
-- rejected outright, not silently overridden) and SELECT only approved rows.
-- A real Supabase Auth session (the site owner — see admin_moderation.sql
-- and MuseumContext.jsx for why "authenticated" in practice only ever means
-- the owner, since there is no public sign-up path) can read/update/delete
-- all entries for moderation.

create table if not exists public.guestbook_entries (
  id           bigint generated always as identity primary key,
  display_name text not null,
  message      text not null check (char_length(message) >= 1 and char_length(message) <= 500),
  created_at   timestamptz not null default now(),
  approved     boolean not null default false
);

alter table public.guestbook_entries enable row level security;

drop policy if exists "anyone can submit pending" on public.guestbook_entries;
create policy "anyone can submit pending"
  on public.guestbook_entries for insert
  with check (approved = false);

drop policy if exists "public read approved" on public.guestbook_entries;
create policy "public read approved"
  on public.guestbook_entries for select
  using (approved = true);

drop policy if exists "owner reads all entries" on public.guestbook_entries;
create policy "owner reads all entries"
  on public.guestbook_entries for select
  using ((auth.jwt() ->> 'email') = 'najdawihashem01@gmail.com');

drop policy if exists "owner moderates entries" on public.guestbook_entries;
create policy "owner moderates entries"
  on public.guestbook_entries for update
  using ((auth.jwt() ->> 'email') = 'najdawihashem01@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'najdawihashem01@gmail.com');

drop policy if exists "owner deletes entries" on public.guestbook_entries;
create policy "owner deletes entries"
  on public.guestbook_entries for delete
  using ((auth.jwt() ->> 'email') = 'najdawihashem01@gmail.com');

-- NOTE — known gap, intentionally NOT fixed by this file (see chat/PR
-- discussion before applying): the live project ALSO still has three older,
-- broader policies from admin_moderation.sql —
--   "authenticated can read all entries"   for select to authenticated using (true)
--   "authenticated can update entries"     for update to authenticated using (true) with check (true)
--   "authenticated can delete entries"     for delete to authenticated using (true)
-- Postgres OR-combines multiple permissive policies for the same command, so
-- as long as those three exist, the owner-email checks above are dead
-- weight: ANY authenticated session (not just the owner) can already read,
-- update, or delete every entry via the broader policies. This file
-- reconstructs the live state as-is (including that redundancy) rather than
-- silently dropping the older policies — see the accompanying
-- guestbook_entries_tighten.sql for the actual fix, applied separately once
-- confirmed.
