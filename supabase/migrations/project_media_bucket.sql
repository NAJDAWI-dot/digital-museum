-- project-media: storage for 3D models (.glb) and audio-guide clips (.mp3),
-- uploaded straight from the Museum Editor (AdminPanel Media tab).
-- Run this in the Supabase SQL editor (same flow as the other migrations).
--
-- Security model: files are publicly readable (visitors need to load the
-- model/audio on the live site — same as project images), but only an
-- authenticated session (the owner, via the editor's Supabase login) may
-- upload, replace, or delete.

insert into storage.buckets (id, name, public, file_size_limit)
values ('project-media', 'project-media', true, 52428800) -- 50MB
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "project media public read" on storage.objects;
create policy "project media public read"
  on storage.objects for select
  using (bucket_id = 'project-media');

drop policy if exists "authenticated can upload project media" on storage.objects;
create policy "authenticated can upload project media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-media');

drop policy if exists "authenticated can replace project media" on storage.objects;
create policy "authenticated can replace project media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-media');

drop policy if exists "authenticated can delete project media" on storage.objects;
create policy "authenticated can delete project media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-media');
