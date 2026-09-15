-- KMT CLASS persistent MP3/MP4 media storage.
-- Public playback is intentional; upload/list/delete remain admin-only via RLS.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'class-media',
  'class-media',
  true,
  104857600,
  array['audio/mpeg','video/mp4']::text[]
)
on conflict (id) do nothing;

drop policy if exists class_media_admin_insert on storage.objects;
create policy class_media_admin_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'class-media' and public.kmt_is_admin());

drop policy if exists class_media_admin_select on storage.objects;
create policy class_media_admin_select on storage.objects
for select to authenticated
using (bucket_id = 'class-media' and public.kmt_is_admin());

drop policy if exists class_media_admin_delete on storage.objects;
create policy class_media_admin_delete on storage.objects
for delete to authenticated
using (bucket_id = 'class-media' and public.kmt_is_admin());
