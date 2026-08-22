-- 0002_add_professional_whatsapp.sql
-- Run in Supabase SQL Editor after schema.sql.

alter table public.professionals
  add column if not exists whatsapp varchar(20);

comment on column public.professionals.whatsapp is 'Número de WhatsApp en formato E.164 sin espacios, ej. 573001234567';

drop function if exists public.create_professional_profile(text, bigint, text, text, text, integer);

create or replace function public.create_professional_profile(
  p_display_name text,
  p_category_id bigint,
  p_city text,
  p_neighborhood text,
  p_description text,
  p_experience_years integer,
  p_whatsapp text default null
) returns public.professionals
language plpgsql security definer set search_path=public as $$
declare result public.professionals;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if exists(select 1 from public.professionals where user_id=auth.uid()) then raise exception 'professional profile already exists'; end if;
  if not exists(select 1 from public.categories where id=p_category_id and is_active=true) then raise exception 'invalid category'; end if;
  update public.profiles set role='professional' where id=auth.uid() and role='customer';
  insert into public.professionals(user_id,display_name,category_id,city,neighborhood,description,experience_years,whatsapp)
  values(auth.uid(),left(trim(p_display_name),150),p_category_id,left(trim(p_city),100),left(trim(coalesce(p_neighborhood,'')),100),left(trim(p_description),3000),greatest(0,least(coalesce(p_experience_years,0),80)),nullif(trim(p_whatsapp),''))
  returning * into result;
  return result;
end $$;
grant execute on function public.create_professional_profile(text,bigint,text,text,text,integer,text) to authenticated;
