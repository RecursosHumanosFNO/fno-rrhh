-- fno_pending: solicitudes de acceso sin aprobar (nombre, apellido, DNI, email,
-- teléfono, sector, cargo).
--
-- Problema: la tabla se leía desde el navegador con la anon key, y el sync que
-- la traía corre en /login y /registro, o sea SIN sesión. Con la anon key —que
-- es pública por definición: viaja en el bundle de JavaScript— cualquiera podía
-- listar el DNI y el teléfono de todos los que se habían registrado.
--
-- La app ya no la lee así: ahora pasa por /api/pendientes, que mira el rol en el
-- JWT. Esto cierra la puerta del otro lado, que es la que importa.
--
-- ⚠️ Correr con el selector de rol del SQL Editor en "postgres". Si quedó en
-- "View data as user", el DDL corre como authenticated y no tiene efecto (el
-- editor igual dice Success).

-- El alta la sigue haciendo cualquiera desde /registro, sin sesión: esa es la
-- función del formulario. Lo que se cierra es leer y borrar.
drop policy if exists "pending_select_gestion" on public.fno_pending;
drop policy if exists "pending_delete_gestion" on public.fno_pending;
drop policy if exists "pending_insert_publico" on public.fno_pending;

-- Quien maneja RRHH: admin y rrhh. No se usa fno_is_admin() porque esa función
-- es sólo admin, y la pantalla de Accesos Pendientes también la ve rrhh.
create or replace function public.fno_es_gestion_personal()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.fno_users
    where auth_id = auth.uid() and role in ('admin', 'rrhh')
  )
$$;

create policy "pending_insert_publico" on public.fno_pending
  for insert to anon, authenticated
  with check (true);

create policy "pending_select_gestion" on public.fno_pending
  for select to authenticated
  using (public.fno_es_gestion_personal());

create policy "pending_delete_gestion" on public.fno_pending
  for delete to authenticated
  using (public.fno_es_gestion_personal());

-- Para verificar después (tiene que devolver sólo estas tres):
--   select policyname, cmd, roles from pg_policies
--   where tablename = 'fno_pending';
