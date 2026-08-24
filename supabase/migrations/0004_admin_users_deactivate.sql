-- 0004_admin_users_deactivate.sql
-- Run in Supabase SQL Editor after 0001, 0002 and 0003.

-- Permite que un admin actualice profiles de otros usuarios (hoy
-- profiles_self_update solo permite id=auth.uid()). El backend solo expone
-- esto a traves de PATCH /api/admin/users/<id>/active (require_admin() +
-- solo el campo is_active), pero se documenta que a nivel de base la policy
-- permite cualquier columna -- el control real de que solo is_active se
-- pueda tocar vive en el endpoint Flask, igual que en professionals/service_requests.
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
