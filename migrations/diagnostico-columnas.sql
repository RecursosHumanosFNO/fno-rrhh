-- DIAGNÓSTICO 3 — SOLO LECTURA, no modifica nada.
--
-- Después de correr 2026-08-24-rls-empleados.sql, el "View data as user" del
-- Table Editor seguía mostrando el CBU. Hay dos explicaciones posibles y esto
-- las separa:
--
--   a) El permiso NO se aplicó → hay que ver por qué (ver la parte 2: si el
--      SELECT también está otorgado a PUBLIC, revocárselo sólo a
--      `authenticated` no alcanza, porque PUBLIC alcanza a todos los roles).
--
--   b) El permiso SÍ se aplicó y el visor del dashboard no lo respeta: ese
--      panel consulta con permisos de dueño de la tabla, y el dueño ignora los
--      GRANT. En ese caso la base está bien y el visor no sirve como prueba.
--
-- has_column_privilege es la respuesta autoritativa: pregunta directamente al
-- motor si ese rol puede leer esa columna.

-- 1. ¿Puede el rol del navegador leer cada columna?
select
  'authenticated' as rol,
  'cbu (sensible)' as columna,
  has_column_privilege('authenticated', 'public.fno_empleados', 'cbu', 'SELECT') as puede_leer
union all
select 'authenticated', 'dni (sensible)',
  has_column_privilege('authenticated', 'public.fno_empleados', 'dni', 'SELECT')
union all
select 'authenticated', 'desvinculacion (sensible)',
  has_column_privilege('authenticated', 'public.fno_empleados', 'desvinculacion', 'SELECT')
union all
select 'authenticated', 'nombre (directorio, debe ser true)',
  has_column_privilege('authenticated', 'public.fno_empleados', 'nombre', 'SELECT')
union all
select 'anon', 'cbu (sensible)',
  has_column_privilege('anon', 'public.fno_empleados', 'cbu', 'SELECT')

union all

-- 2. ¿Quién más tiene permisos sobre la tabla? Sin filtrar por rol, para que
--    aparezca PUBLIC si estuviera: un GRANT a PUBLIC le da el permiso a todos
--    los roles y sobrevive a un revoke dirigido sólo a `authenticated`.
select
  'GRANT sobre la tabla' as rol,
  grantee || ' → ' || privilege_type as columna,
  null::boolean as puede_leer
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'fno_empleados'
  and privilege_type = 'SELECT';
