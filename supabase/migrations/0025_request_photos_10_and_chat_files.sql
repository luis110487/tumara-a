-- Hasta 10 fotos de evidencia por solicitud y archivos adjuntos (imágenes y documentos) en el chat.
begin;
create or replace function public.valid_request_photos(items jsonb) returns boolean
language sql immutable set search_path=public as $$
 select case when jsonb_typeof(items)='array' then jsonb_array_length(items)<=10 and not exists(
  select 1 from jsonb_array_elements(items) item where jsonb_typeof(item)<>'string'
  or length(item #>> '{}') not between 1 and 1000) else false end;
$$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('chat-files','chat-files',true,10485760,array[
 'image/jpeg','image/png','image/webp','application/pdf','text/plain',
 'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists chat_files_read on storage.objects;
create policy chat_files_read on storage.objects for select using(bucket_id='chat-files');
drop policy if exists chat_files_insert on storage.objects;
create policy chat_files_insert on storage.objects for insert to authenticated with check(
 bucket_id='chat-files' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists chat_files_delete on storage.objects;
create policy chat_files_delete on storage.objects for delete to authenticated using(
 bucket_id='chat-files' and (storage.foldername(name))[1]=auth.uid()::text
);
commit;
