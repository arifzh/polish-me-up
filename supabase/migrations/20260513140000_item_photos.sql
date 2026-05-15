-- Migration: 20260513140000 - Multi-photo support for items + storage bucket.
--
-- Adds:
--   1. items.photo_urls text[] (up to 3 images per item)
--   2. service-images storage bucket (public read)
--   3. Storage RLS policies - anyone reads, only manicurists write/delete

-- 1. New column on items
alter table public.items
  add column if not exists photo_urls text[] not null default '{}';

-- Backfill from the legacy single-URL column so existing rows still show their photo
update public.items
   set photo_urls = array[photo_url]
 where photo_url is not null
   and photo_url <> ''
   and (photo_urls is null or array_length(photo_urls, 1) is null);

-- 2. Storage bucket
insert into storage.buckets (id, name, public)
values ('service-images', 'service-images', true)
on conflict (id) do update set public = excluded.public;

-- 3. Storage policies
drop policy if exists "service-images public read" on storage.objects;
create policy "service-images public read"
  on storage.objects
  for select
  using (bucket_id = 'service-images');

drop policy if exists "service-images manicurist upload" on storage.objects;
create policy "service-images manicurist upload"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'service-images' and public.is_manicurist());

drop policy if exists "service-images manicurist update" on storage.objects;
create policy "service-images manicurist update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'service-images' and public.is_manicurist())
  with check (bucket_id = 'service-images' and public.is_manicurist());

drop policy if exists "service-images manicurist delete" on storage.objects;
create policy "service-images manicurist delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'service-images' and public.is_manicurist());
