-- fno_notifs: cerrar el INSERT desde el navegador.
--
-- Era la última cosa abierta de la auditoría, y no se podía cerrar con una
-- policy sola: la regla tenía que ser `with check (true)` porque cuando un
-- empleado carga una solicitud es SU navegador el que crea el aviso dirigido a
-- RRHH. Con eso, cualquiera podía inventarle una notificación a otro ("Tu
-- solicitud fue aprobada") o llenar la tabla.
--
-- Ahora las inserta el servidor (/api/notificacion, con service role, que no
-- pasa por RLS) y ahí está la regla de verdad: Gestión de Personal puede crear
-- cualquiera; un empleado, sólo avisos para RRHH o para sí mismo.
--
-- ⚠️ Correr DESPUÉS de que el deploy esté arriba: si se corre antes, el portal
-- todavía inserta desde el navegador y las notificaciones dejarían de guardarse
-- hasta que salga la versión nueva.
--
-- ⚠️ Y con el selector de rol del SQL Editor en "postgres".

drop policy if exists "notifs_insert" on public.fno_notifs;

-- El UPDATE se queda: es el que marca como leída, lo sigue haciendo el
-- navegador y ya está acotado a la propia notificación o a un admin.

-- Para verificar (tienen que quedar sólo dos: select y update):
--   select policyname, cmd, roles from pg_policies
--   where tablename = 'fno_notifs' order by cmd;
