-- 0003_admin_panel.sql
-- Run in Supabase SQL Editor after 0001 and 0002.

-- Los admins ya pueden LEER profiles/professionals/service_requests gracias a
-- public.is_admin() en las policies de schema.sql. Solo falta permitir que
-- los admins creen/editen categorias (no se permite delete: usar is_active=false).
drop policy if exists categories_admin_insert on public.categories;
create policy categories_admin_insert on public.categories
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists categories_admin_update on public.categories;
create policy categories_admin_update on public.categories
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Promover un usuario a admin por email. security definer para poder leer
-- auth.users (PostgREST nunca expone ese esquema). La UNICA verificacion de
-- autorizacion real vive aqui adentro via auth.uid() -- nunca confiar en un
-- flag mandado desde el cliente.
create or replace function public.promote_to_admin(p_email text)
returns public.profiles
language plpgsql security definer set search_path=public as $$
declare
  target_id uuid;
  result public.profiles;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select id into target_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if target_id is null then
    raise exception 'user not found';
  end if;

  update public.profiles set role = 'admin' where id = target_id
  returning * into result;

  if result.id is null then
    raise exception 'profile not found for user';
  end if;

  return result;
end $$;

revoke all on function public.promote_to_admin(text) from public;
grant execute on function public.promote_to_admin(text) to authenticated;
