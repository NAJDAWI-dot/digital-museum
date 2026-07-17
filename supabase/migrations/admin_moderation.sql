-- Admin moderation rights for the Health tab and Guestbook tab.
-- Run in the Supabase SQL editor (same flow as previous migrations).
-- Idempotent: safe to re-run.
--
-- Security model: "authenticated" here means a real Supabase Auth session —
-- only the owner has one (there is no public sign-up path; the admin login
-- is signInWithPassword against the owner's account). The anon key that
-- ships in the public bundle matches none of these policies.

-- Health tab: let the owner clear recorded visitor errors.
drop policy if exists "authenticated can clear errors" on public.site_errors;
create policy "authenticated can clear errors"
  on public.site_errors for delete
  to authenticated
  using (true);

-- Guestbook tab: full moderation — read every row (including unapproved),
-- approve, and remove signs even after they are published. Some of these
-- may duplicate policies from the original guestbook migration; policies
-- are permissive (OR'd), so re-stating them is harmless.
drop policy if exists "authenticated can read all entries" on public.guestbook_entries;
create policy "authenticated can read all entries"
  on public.guestbook_entries for select
  to authenticated
  using (true);

drop policy if exists "authenticated can update entries" on public.guestbook_entries;
create policy "authenticated can update entries"
  on public.guestbook_entries for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated can delete entries" on public.guestbook_entries;
create policy "authenticated can delete entries"
  on public.guestbook_entries for delete
  to authenticated
  using (true);
