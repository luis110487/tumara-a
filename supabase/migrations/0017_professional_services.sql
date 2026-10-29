-- Additive catalog migration. Apply BEFORE deploying the catalog API/APK.
begin;
create table if not exists public.professional_services (
 id bigint generated always as identity primary key,
 professional_id bigint not null references public.professionals(id) on delete restrict,
 client_id uuid not null default gen_random_uuid(),
 title varchar(200) not null check(length(trim(title)) between 1 and 200),
 description text not null check(length(trim(description)) between 1 and 5000),
 photo_url text check(photo_url is null or (length(photo_url)<=1000 and photo_url ~ '^https://')),
 price_type text not null default 'quote' check(price_type in ('from','quote')),
 price_cop numeric(12,2),
 duration text check(length(duration)<=100),
 warranty text check(length(warranty)<=250),
 materials text check(length(materials)<=250),
 includes jsonb not null default '[]'::jsonb check(jsonb_typeof(includes)='array' and jsonb_array_length(includes)<=20),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(professional_id,client_id),
 check((price_type='quote' and price_cop is null) or (price_type='from' and price_cop is not null and price_cop>=0 and price_cop<=9999999999.99))
);
create or replace function public.valid_catalog_includes(items jsonb) returns boolean
language sql immutable set search_path=public as $$
 select case when jsonb_typeof(items)='array' then jsonb_array_length(items)<=20 and not exists(
 select 1 from jsonb_array_elements(items) item where jsonb_typeof(item)<>'string' or length(trim(item #>> '{}')) not between 1 and 180) else false end;
$$;
revoke all on function public.valid_catalog_includes(jsonb) from public;
grant execute on function public.valid_catalog_includes(jsonb) to authenticated,service_role;
alter table public.professional_services drop constraint if exists catalog_includes_valid;
alter table public.professional_services add constraint catalog_includes_valid check(public.valid_catalog_includes(includes));
create or replace function public.catalog_identity_immutable() returns trigger
language plpgsql set search_path=public as $$
begin
 if new.id is distinct from old.id or new.professional_id is distinct from old.professional_id
 or new.client_id is distinct from old.client_id or new.created_at is distinct from old.created_at then
 raise exception 'La identidad del servicio no se puede modificar' using errcode='23514'; end if;
 return new;
end;$$;
revoke all on function public.catalog_identity_immutable() from public,anon,authenticated;
drop trigger if exists catalog_identity_immutable on public.professional_services;
create trigger catalog_identity_immutable before update on public.professional_services for each row execute function public.catalog_identity_immutable();
create index if not exists professional_services_public_idx on public.professional_services(professional_id,created_at desc) where is_active;
alter table public.professional_services enable row level security;

-- Boolean helpers avoid exposing profile rows and avoid RLS recursion.
create or replace function public.catalog_professional_visible(pro_id bigint) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.professionals p join public.profiles a on a.id=p.user_id
 where p.id=pro_id and p.status='approved' and a.is_active);
$$;
create or replace function public.catalog_professional_owned(pro_id bigint) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.professionals p join public.profiles a on a.id=p.user_id
 where p.id=pro_id and p.user_id=auth.uid() and a.is_active and p.status<>'suspended');
$$;
revoke all on function public.catalog_professional_visible(bigint),public.catalog_professional_owned(bigint) from public;
grant execute on function public.catalog_professional_visible(bigint),public.catalog_professional_owned(bigint) to anon,authenticated,service_role;
revoke all on public.professional_services from anon,authenticated;
grant select on public.professional_services to anon;
grant select,insert,update on public.professional_services to authenticated;
grant all on public.professional_services to service_role;
grant usage,select on sequence public.professional_services_id_seq to authenticated,service_role;
drop policy if exists services_read on public.professional_services;
create policy services_read on public.professional_services for select using(
 (is_active and public.catalog_professional_visible(professional_id)) or public.catalog_professional_owned(professional_id));
drop policy if exists services_create on public.professional_services;
create policy services_create on public.professional_services for insert to authenticated with check(public.catalog_professional_owned(professional_id));
drop policy if exists services_edit on public.professional_services;
create policy services_edit on public.professional_services for update to authenticated
 using(public.catalog_professional_owned(professional_id)) with check(public.catalog_professional_owned(professional_id));
drop trigger if exists services_updated_at on public.professional_services;
create trigger services_updated_at before update on public.professional_services for each row execute function public.set_updated_at();

alter table public.service_requests add column if not exists service_id bigint references public.professional_services(id) on delete restrict;
alter table public.service_requests add column if not exists service_snapshot jsonb;
-- The database, never the client, chooses and freezes the service conditions.
create or replace function public.capture_requested_service() returns trigger
language plpgsql security definer set search_path=public as $$
declare selected public.professional_services%rowtype;
begin
 if TG_OP='UPDATE' then
  if new.service_id is distinct from old.service_id or new.service_snapshot is distinct from old.service_snapshot
   or (old.service_id is not null and new.service_title is distinct from old.service_title) then
   raise exception 'Las condiciones originales del servicio no se pueden modificar' using errcode='23514';
  end if;
  return new;
 end if;
 if new.service_id is null then new.service_snapshot:=null; return new; end if;
 select * into selected from public.professional_services where id=new.service_id for share;
 if not found or not selected.is_active or selected.professional_id<>new.professional_id
  or not public.catalog_professional_visible(selected.professional_id) then
  raise exception 'Servicio no disponible para este profesional' using errcode='23514';
 end if;
 new.service_title:=selected.title;
 new.service_snapshot:=jsonb_build_object('id',selected.id,'title',selected.title,'description',selected.description,
  'photo_url',selected.photo_url,'price_type',selected.price_type,'price_cop',selected.price_cop,'currency','COP',
  'duration',selected.duration,'warranty',selected.warranty,'materials',selected.materials,'includes',selected.includes);
 return new;
end;$$;
revoke all on function public.capture_requested_service() from public,anon,authenticated;
drop trigger if exists capture_requested_service on public.service_requests;
create trigger capture_requested_service before insert or update on public.service_requests for each row execute function public.capture_requested_service();

-- Isolated uploads: each account may write only inside its own folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('service-photos','service-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists service_photos_read on storage.objects;
create policy service_photos_read on storage.objects for select using(bucket_id='service-photos');
drop policy if exists service_photos_insert on storage.objects;
create policy service_photos_insert on storage.objects for insert to authenticated with check(
 bucket_id='service-photos' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.professionals p where p.user_id=auth.uid() and public.catalog_professional_owned(p.id)));
drop policy if exists service_photos_update on storage.objects;
create policy service_photos_update on storage.objects for update to authenticated
 using(bucket_id='service-photos' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.professionals p where p.user_id=auth.uid() and public.catalog_professional_owned(p.id)))
 with check(bucket_id='service-photos' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.professionals p where p.user_id=auth.uid() and public.catalog_professional_owned(p.id)));
drop policy if exists service_photos_delete on storage.objects;
create policy service_photos_delete on storage.objects for delete to authenticated using(bucket_id='service-photos' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.professionals p where p.user_id=auth.uid() and public.catalog_professional_owned(p.id)));
commit;
