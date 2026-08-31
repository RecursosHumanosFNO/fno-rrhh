-- Ajustes de RLS sobre fno_notifs + limpieza de políticas duplicadas.
--
-- Este archivo sale del diagnóstico corrido el 31/08: la mayoría de las tablas
-- ya estaban bien (ver la nota al final). Lo que sí hay que corregir es esto.
--
-- ⚠️ Correr con el selector de rol del SQL Editor en "postgres". Si quedó en
-- "View data as user", corre como authenticated y no tiene efecto — el editor
-- igual dice Success.

-- ── 1. fno_notifs: borrado abierto ──────────────────────────────────────────
-- La política de DELETE era `using (true)` para authenticated: cualquier
-- empleado podía borrar las notificaciones de cualquier otro, incluidas las de
-- RRHH. En el portal NADA borra notificaciones desde el navegador (el único
-- borrado es el de /api/admin/delete-user, que va con service role y no pasa
-- por RLS), así que la política se elimina sin reemplazo: lo que no se usa, no
-- se deja abierto.
drop policy if exists "notifs_delete" on public.fno_notifs;

-- ── 2. fno_notifs: las de admin las veía todo el mundo ──────────────────────
-- La política de SELECT dejaba pasar cualquier fila con empleado_id nulo o
-- vacío, y las notificaciones marcadas solo_admin son justamente así: sin
-- destinatario. O sea que "Nueva solicitud de acceso: <nombre>", "Solicitud de
-- <nombre> rechazada" o "no se pudo crear su cuenta" viajaban al navegador de
-- todos; el filtro que las escondía vivía sólo en la pantalla (Header.tsx).
drop policy if exists "notifs_select" on public.fno_notifs;

create policy "notifs_select" on public.fno_notifs
  for select to authenticated
  using (
    fno_is_admin()
    or empleado_id = fno_empleado_id()
    or ((empleado_id is null or empleado_id = '') and coalesce(solo_admin, false) = false)
  );

-- Nota sobre el INSERT de fno_notifs, que queda como está (`with check true`):
-- es intencional y no se puede cerrar sin romper el portal. Cuando un empleado
-- carga una solicitud, es SU navegador el que inserta la notificación dirigida
-- a RRHH. Cerrarlo requiere mover addNotification a una ruta de servidor, que
-- es un cambio de arquitectura, no una policy.

-- ── 3. fno_pending: sacar las políticas viejas que quedaron duplicadas ──────
-- La migración del 31/08 agregó las _gestion (admin + rrhh) pero las anteriores
-- siguen ahí. Las políticas se combinan con OR, así que no había un agujero;
-- es limpieza para que el día de mañana se lea una sola regla por operación.
drop policy if exists "pending_select" on public.fno_pending;
drop policy if exists "pending_delete" on public.fno_pending;
drop policy if exists "pending_insert" on public.fno_pending;

-- ── 4. fno_empleados: sacarle a anon lo que ya no debería poder leer ────────
-- El ACL crudo mostró que authenticated quedó como corresponde (sin SELECT de
-- tabla, y por columna sólo las once del directorio), pero anon sigue con
-- `arwdDxtm`: SELECT sobre TODAS las columnas, DNI y CBU incluidos.
--
-- Hoy eso no se puede explotar, porque ninguna política de RLS le da filas a
-- anon: se queda en cero. Pero es la única cosa que lo frena, y alcanza con que
-- algún día alguien agregue una policy `to anon` —o la escriba sin cláusula
-- `to`, que es lo mismo— para que el DNI de todos quede al aire. Ninguna
-- pantalla sin sesión lee empleados, así que esto no rompe nada.
--
-- Se le hace lo mismo que a authenticated en vez de un `revoke all`: el sync del
-- portal SÍ consulta esta tabla con la anon key mientras estás en /login (corre
-- antes de autenticar). Hoy le vuelve una lista vacía por RLS; con un revoke
-- total le volvería un error de permisos en la consola en cada visita al login.
-- Mismo resultado, menos ruido.
revoke select on public.fno_empleados from anon;
grant select (
  id, nombre, apellido, email, fecha_nacimiento,
  sector, cargo, cargos_extra, estado, foto, foto_cover
) on public.fno_empleados to anon;

-- Para verificar después:
--   select policyname, cmd, roles, qual from pg_policies
--   where tablename in ('fno_notifs', 'fno_pending') order by tablename, cmd;
--
-- fno_notifs tiene que quedar con tres: select (la de arriba), insert y update.
-- fno_pending, con tres: pending_insert_publico, pending_select_gestion y
-- pending_delete_gestion.

-- ── Lo que el diagnóstico mostró que YA estaba bien ─────────────────────────
-- No se toca nada de esto, queda anotado para no volver a revisarlo de cero:
--
--   fno_solicitudes  select/insert/delete: propio o admin · update: sólo admin
--                    (o sea: nadie puede auto-aprobarse una licencia)
--   fno_tickets      select/insert: propio o admin · update: sólo admin
--   fno_recibos      select: propio o admin · insert/delete: sólo admin
--   fno_recibo_firmas insert: sólo con el propio empleado_id · select: propio o admin
--   fno_registros_novedad  todo sólo admin
--   fno_users        select: la propia fila o admin · sin insert/update/delete
--   fno_logins       insert: authenticated · select: sólo admin
--   fno_password_resets  RLS activo y CERO políticas = sólo service role
--   fno_push_subscriptions  política `using (false)` = sólo service role
--   fno_empleados    select true, pero los permisos POR COLUMNA de authenticated
--                    sólo alcanzan al directorio: dni, cuil, cbu, direccion,
--                    telefono, contacto_emergencia, desvinculación y demás no
--                    están. La migración del 24/08 quedó bien aplicada.
