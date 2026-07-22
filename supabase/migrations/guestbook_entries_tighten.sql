-- Tightens guestbook_entries RLS to genuinely owner-only, closing the gap
-- described in guestbook_entries.sql: three older policies from
-- admin_moderation.sql grant SELECT/UPDATE/DELETE to `authenticated using
-- (true)` — i.e. any real Supabase Auth session, not just the site owner.
-- Because Postgres OR-combines multiple permissive policies for the same
-- command, these three make the owner-email-scoped policies in
-- guestbook_entries.sql redundant today: any authenticated session already
-- has full read/update/delete access to every entry (approved or not).
--
-- In practice this is low-risk right now (there's no public sign-up path,
-- so only the owner can ever hold an authenticated session) — but it means
-- the real enforcement boundary is "Supabase Auth sign-ups stay disabled"
-- rather than anything RLS actually checks. Dropping these makes the
-- owner-email policies the real (and only) gate, matching the documented
-- intent.
--
-- NOT applied automatically — run this by hand in the Supabase SQL editor
-- once you're ready, same as every other migration in this folder.

drop policy if exists "authenticated can read all entries" on public.guestbook_entries;
drop policy if exists "authenticated can update entries" on public.guestbook_entries;
drop policy if exists "authenticated can delete entries" on public.guestbook_entries;
