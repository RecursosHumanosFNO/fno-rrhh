-- Cerrar la escritura anónima sobre el calendario.
--
-- Se puede correr en cualquier momento: no depende del deploy. No cambia nada
-- de lo que la aplicación hace hoy, sólo deja de permitir lo que nunca debió
-- estar permitido.
--
-- El problema
-- -----------
-- Las cuatro políticas de fno_eventos estaban abiertas a {anon, authenticated}
-- con la condición `true`. `anon` es el visitante SIN sesión: cualquiera con la
-- clave pública del proyecto —que por definición viaja en el navegador— podía
-- insertar, editar y BORRAR eventos del calendario institucional sin siquiera
-- tener cuenta en el portal.
--
-- La solución
-- -----------
-- Leer el calendario: cualquier persona logueada (es lo que hace el portal).
-- Escribirlo: sólo quien ya puede publicar comunicaciones. Se reusa
-- fno_can_manage_novedades() —admin y comunicaciones— en vez de escribir una
-- función nueva: es exactamente el mismo permiso que la pantalla de eventos
-- exige para mostrar los botones de crear, editar y eliminar.

begin;

drop policy if exists fno_eventos_select on public.fno_eventos;
create policy fno_eventos_select on public.fno_eventos
  for select to authenticated
  using (true);

drop policy if exists fno_eventos_insert on public.fno_eventos;
create policy fno_eventos_insert on public.fno_eventos
  for insert to authenticated
  with check (fno_can_manage_novedades());

drop policy if exists fno_eventos_update on public.fno_eventos;
create policy fno_eventos_update on public.fno_eventos
  for update to authenticated
  using (fno_can_manage_novedades())
  with check (fno_can_manage_novedades());

drop policy if exists fno_eventos_delete on public.fno_eventos;
create policy fno_eventos_delete on public.fno_eventos
  for delete to authenticated
  using (fno_can_manage_novedades());

commit;

-- ── Verificación ────────────────────────────────────────────────────────────
-- En el portal: con un admin o con comunicaciones, crear / editar / borrar un
-- evento del calendario tiene que seguir funcionando igual. Con un empleado
-- común, el calendario se ve pero no aparecen los botones (y si alguien los
-- forzara, ahora la base lo rechaza).

select policyname as politica, cmd as operacion, roles::text as roles,
       coalesce(qual, '—') as lectura, coalesce(with_check, '—') as escritura
from pg_policies
where schemaname = 'public' and tablename = 'fno_eventos'
order by cmd;
