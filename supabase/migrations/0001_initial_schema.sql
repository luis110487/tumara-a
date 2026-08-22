-- TuMaraña.com / Supabase PostgreSQL
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

do $$ begin create type public.user_role as enum ('customer','professional','admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.professional_status as enum ('pending','approved','rejected','suspended'); exception when duplicate_object then null; end $$;
do $$ begin create type public.request_status as enum ('requested','in_conversation','quoted','accepted','in_progress','completed','cancelled'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name varchar(150) not null,
  phone varchar(30),
  avatar_url text,
  role public.user_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name varchar(100) not null unique,
  slug varchar(120) not null unique,
  icon varchar(100),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.professionals (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name varchar(150) not null,
  category_id bigint not null references public.categories(id) on delete restrict,
  city varchar(100) not null,
  neighborhood varchar(100),
  description text not null,
  experience_years integer not null default 0 check (experience_years between 0 and 80),
  rating numeric(3,2) not null default 0 check (rating between 0 and 5),
  total_reviews integer not null default 0 check (total_reviews >= 0),
  verified boolean not null default false,
  status public.professional_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  professional_id bigint not null references public.professionals(id) on delete restrict,
  service_title varchar(200) not null,
  description text not null,
  city varchar(100),
  address varchar(250),
  preferred_date timestamptz,
  status public.request_status not null default 'requested',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.service_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body varchar(3000) not null check (char_length(body) between 1 and 3000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_prof_cat on public.professionals(category_id);
create index if not exists idx_prof_city on public.professionals(city);
create index if not exists idx_prof_status on public.professionals(status);
create index if not exists idx_req_customer on public.service_requests(customer_id);
create index if not exists idx_req_professional on public.service_requests(professional_id);
create index if not exists idx_msg_request on public.messages(request_id);

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists professionals_updated_at on public.professionals;
create trigger professionals_updated_at before update on public.professionals for each row execute function public.set_updated_at();
drop trigger if exists requests_updated_at on public.service_requests;
create trigger requests_updated_at before update on public.service_requests for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Usuario'),150))
  on conflict(id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and is_active=true);
$$;

create or replace function public.create_professional_profile(
  p_display_name text,
  p_category_id bigint,
  p_city text,
  p_neighborhood text,
  p_description text,
  p_experience_years integer
) returns public.professionals
language plpgsql security definer set search_path=public as $$
declare result public.professionals;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if exists(select 1 from public.professionals where user_id=auth.uid()) then raise exception 'professional profile already exists'; end if;
  if not exists(select 1 from public.categories where id=p_category_id and is_active=true) then raise exception 'invalid category'; end if;
  update public.profiles set role='professional' where id=auth.uid() and role='customer';
  insert into public.professionals(user_id,display_name,category_id,city,neighborhood,description,experience_years)
  values(auth.uid(),left(trim(p_display_name),150),p_category_id,left(trim(p_city),100),left(trim(coalesce(p_neighborhood,'')),100),left(trim(p_description),3000),greatest(0,least(coalesce(p_experience_years,0),80)))
  returning * into result;
  return result;
end $$;
grant execute on function public.create_professional_profile(text,bigint,text,text,text,integer) to authenticated;

insert into public.categories(name,slug,icon,description) values
('Electricistas','electricistas','⚡','Instalaciones y reparaciones eléctricas'),
('Plomeros','plomeros','🔧','Reparación de tuberías, fugas e instalaciones'),
('Albañiles','albaniles','🧱','Construcción y remodelación'),
('Pintores','pintores','🎨','Pintura residencial y comercial'),
('Aire acondicionado','aire-acondicionado','❄️','Instalación y mantenimiento'),
('Carpinteros','carpinteros','🪚','Fabricación y reparación de muebles'),
('Cerrajeros','cerrajeros','🔑','Cerrajería'),
('Limpieza','limpieza','🧹','Limpieza residencial y comercial'),
('Mecánicos','mecanicos','🚗','Mantenimiento y reparación de vehículos'),
('Técnicos informáticos','tecnicos-informaticos','💻','Soporte técnico')
on conflict(slug) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.professionals enable row level security;
alter table public.service_requests enable row level security;
alter table public.messages enable row level security;

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories for select using(is_active=true);

drop policy if exists professional_public_read on public.professionals;
create policy professional_public_read on public.professionals for select using(status='approved' or user_id=auth.uid() or public.is_admin());
drop policy if exists professional_insert_self on public.professionals;
create policy professional_insert_self on public.professionals for insert to authenticated with check(user_id=auth.uid());
drop policy if exists professional_update_self on public.professionals;
create policy professional_update_self on public.professionals for update to authenticated using(user_id=auth.uid() or public.is_admin()) with check(user_id=auth.uid() or public.is_admin());

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());

drop policy if exists requests_participant_read on public.service_requests;
create policy requests_participant_read on public.service_requests for select to authenticated using(customer_id=auth.uid() or exists(select 1 from public.professionals p where p.id=professional_id and p.user_id=auth.uid()) or public.is_admin());
drop policy if exists requests_customer_insert on public.service_requests;
create policy requests_customer_insert on public.service_requests for insert to authenticated with check(customer_id=auth.uid());
drop policy if exists requests_participant_update on public.service_requests;
create policy requests_participant_update on public.service_requests for update to authenticated using(customer_id=auth.uid() or exists(select 1 from public.professionals p where p.id=professional_id and p.user_id=auth.uid()) or public.is_admin()) with check(customer_id=auth.uid() or exists(select 1 from public.professionals p where p.id=professional_id and p.user_id=auth.uid()) or public.is_admin());

drop policy if exists messages_participant_read on public.messages;
create policy messages_participant_read on public.messages for select to authenticated using(exists(select 1 from public.service_requests r join public.professionals p on p.id=r.professional_id where r.id=request_id and (r.customer_id=auth.uid() or p.user_id=auth.uid() or public.is_admin())));
drop policy if exists messages_participant_insert on public.messages;
create policy messages_participant_insert on public.messages for insert to authenticated with check(sender_id=auth.uid() and exists(select 1 from public.service_requests r join public.professionals p on p.id=r.professional_id where r.id=request_id and (r.customer_id=auth.uid() or p.user_id=auth.uid() or public.is_admin())));

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
exception when undefined_object then null;
end $$;

-- After creating your first account, promote it to admin manually when needed:
-- update public.profiles set role='admin' where id='YOUR_AUTH_USER_UUID';
