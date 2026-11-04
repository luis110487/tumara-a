alter table public.professionals
  add column if not exists profile_color text;

do $$
begin
  alter table public.professionals
    add constraint professionals_profile_color_check
    check (profile_color in ('blue','green','orange','purple'));
exception
  when duplicate_object then null;
end $$;

comment on column public.professionals.profile_color is
  'Paleta visual del perfil público elegida por un administrador.';
