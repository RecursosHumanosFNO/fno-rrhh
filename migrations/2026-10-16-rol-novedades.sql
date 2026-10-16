-- Rol 'novedades': acceso a la bitácora interna y a nada más.
--
-- La pantalla la ven admin, rrhh y ahora 'novedades', pero la pantalla no es
-- la que protege: el navegador lee y escribe fno_registros_novedad directo con
-- la anon key, así que quien decide de verdad es RLS. Sin esta migración, a
-- Milagros le aparecería la sección vacía y no podría guardar nada.
--
-- OJO, de paso: según el relevamiento del 31/08 esta tabla quedó "todo sólo
-- admin", mientras que la pantalla ya aceptaba a rrhh. Si eso sigue así, hoy
-- Gestión de Personal está viendo la lista vacía sin que nadie lo haya
-- notado. Esta migración también lo arregla.

-- Quién puede trabajar con la bitácora interna.
--
-- Va aparte de fno_es_gestion_personal() a propósito: 'novedades' NO es gestión
-- de personal. Si se lo agregara a esa función, con una línea se le abrirían
-- también los accesos pendientes y todo lo que cuelgue de ella mañana.
create or replace function public.fno_puede_novedades_internas()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.fno_users
    where auth_id = auth.uid() and role in ('admin', 'rrhh', 'novedades')
  )
$$;

-- Se borran TODAS las políticas de la tabla antes de crear las nuevas.
-- Postgres combina las políticas permisivas con OR: dejar una vieja de "sólo
-- admin" conviviendo con estas no rompería nada, pero deja la tabla con reglas
-- duplicadas que después nadie sabe si puede tocar. Mejor una sola verdad.
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'fno_registros_novedad'
  loop
    execute format('drop policy %I on public.fno_registros_novedad', p.policyname);
  end loop;
end $$;

alter table public.fno_registros_novedad enable row level security;

create policy "registros_select_novedades" on public.fno_registros_novedad
  for select to authenticated
  using (public.fno_puede_novedades_internas());

create policy "registros_insert_novedades" on public.fno_registros_novedad
  for insert to authenticated
  with check (public.fno_puede_novedades_internas());

create policy "registros_update_novedades" on public.fno_registros_novedad
  for update to authenticated
  using (public.fno_puede_novedades_internas())
  with check (public.fno_puede_novedades_internas());

create policy "registros_delete_novedades" on public.fno_registros_novedad
  for delete to authenticated
  using (public.fno_puede_novedades_internas());

-- Para verificar después (tienen que salir estas cuatro y ninguna más):
--   select policyname, cmd from pg_policies
--   where tablename = 'fno_registros_novedad' order by cmd;
