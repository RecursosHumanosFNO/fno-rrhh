-- DIAGNÓSTICO 2 — SOLO LECTURA, no modifica nada.
--
-- Las políticas nuevas van a reusar estas funciones en vez de inventar otras
-- (menos superficie para equivocarse). Hace falta ver qué devuelve cada una:
-- si fno_can_manage_novedades() fuera admin-only, reusarla en fno_eventos
-- dejaría al rol 'comunicaciones' sin poder cargar eventos en el calendario.

select
  p.proname as funcion,
  pg_get_functiondef(p.oid) as definicion
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'fno_is_admin',
    'fno_empleado_id',
    'fno_can_manage_novedades'
  )
order by p.proname;
