-- Optional photos attached by the customer while creating a service request.
begin;
alter table public.service_requests add column if not exists photo_urls jsonb not null default '[]'::jsonb;
create or replace function public.valid_request_photos(items jsonb) returns boolean
language sql immutable set search_path=public as $$
 select case when jsonb_typeof(items)='array' then jsonb_array_length(items)<=3 and not exists(
  select 1 from jsonb_array_elements(items) item where jsonb_typeof(item)<>'string'
  or length(item #>> '{}') not between 1 and 1000) else false end;
$$;
revoke all on function public.valid_request_photos(jsonb) from public;
grant execute on function public.valid_request_photos(jsonb) to authenticated,service_role;
alter table public.service_requests drop constraint if exists service_requests_photo_urls_valid;
alter table public.service_requests add constraint service_requests_photo_urls_valid check(public.valid_request_photos(photo_urls));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('request-photos','request-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists request_photos_read on storage.objects;
create policy request_photos_read on storage.objects for select using(bucket_id='request-photos');
drop policy if exists request_photos_insert on storage.objects;
create policy request_photos_insert on storage.objects for insert to authenticated with check(
 bucket_id='request-photos' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists request_photos_update on storage.objects;
create policy request_photos_update on storage.objects for update to authenticated
 using(bucket_id='request-photos' and (storage.foldername(name))[1]=auth.uid()::text)
 with check(bucket_id='request-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists request_photos_delete on storage.objects;
create policy request_photos_delete on storage.objects for delete to authenticated using(
 bucket_id='request-photos' and (storage.foldername(name))[1]=auth.uid()::text
);
commit;
