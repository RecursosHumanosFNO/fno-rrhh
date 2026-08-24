-- DIAGNÓSTICO DE RLS — SOLO LECTURA, no modifica nada.
--
-- Correr entero en Supabase → SQL Editor y pasar el resultado.
--
-- Va como una sola consulta a propósito: el editor de Supabase muestra sólo el
-- último resultado cuando se mandan varias sentencias juntas, y acá hace falta
-- ver las cuatro cosas a la vez.
--
-- Sirve para escribir las políticas nuevas sabiendo qué hay hoy, en vez de
-- adivinar: una policy mal escrita sobre fno_empleados deja a todo el portal
-- sin poder listar empleados.

with rls as (
  select
    1 as orden,
    'RLS activado' as seccion,
    c.relname as tabla,
    case when c.relrowsecurity then 'SÍ' else 'NO ⚠️' end as detalle,
    '' as extra
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname like 'fno_%'
),
politicas as (
  select
    2 as orden,
    'Política' as seccion,
    tablename as tabla,
    policyname || ' [' || cmd || '] roles=' || roles::text as detalle,
    'lectura: ' || coalesce(qual, '(sin filtro)')
      || ' | escritura: ' || coalesce(with_check, '—') as extra
  from pg_policies
  where schemaname = 'public' and tablename like 'fno_%'
),
permisos as (
  select
    3 as orden,
    'Permiso de tabla' as seccion,
    table_name as tabla,
    grantee || ': ' || string_agg(distinct privilege_type, ', ' order by privilege_type) as detalle,
    '' as extra
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name like 'fno_%'
    and grantee in ('anon', 'authenticated')
  group by table_name, grantee
),
por_columna as (
  select
    4 as orden,
    'Permiso por columna' as seccion,
    table_name as tabla,
    grantee || ': ' || column_name || ' (' || privilege_type || ')' as detalle,
    '' as extra
  from information_schema.column_privileges
  where table_schema = 'public'
    and table_name like 'fno_%'
    and grantee in ('anon', 'authenticated')
)
select seccion, tabla, detalle, extra
from (
  select * from rls
  union all select * from politicas
  union all select * from permisos
  union all select * from por_columna
) t
order by orden, tabla, detalle;
