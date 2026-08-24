-- DIAGNÓSTICO 4 — SOLO LECTURA, no modifica nada.
--
-- Los diagnósticos anteriores usaban information_schema, que FILTRA las filas
-- según los roles de los que el usuario que consulta es miembro. Por eso no
-- mostró el permiso otorgado a PUBLIC, que es el que explica que `anon` pueda
-- leer el CBU sin tener ningún permiso propio.
--
-- pg_class.relacl y pg_attribute.attacl son el dato crudo, sin filtrar.
--
-- Cómo leer la columna `acl`:
--   "authenticated=r/postgres"  → authenticated puede leer (r = SELECT)
--   "=r/postgres"               → PUBLIC puede leer  ← el grantee vacío es PUBLIC
--   "service_role=arwdDxt/..."  → service_role tiene todo
--
-- Interesa sobre todo si aparece una entrada con el grantee vacío (PUBLIC): un
-- revoke dirigido sólo a `authenticated` no la toca, y mientras esté, todos los
-- roles siguen leyendo la columna.

-- 1. Permisos a nivel de TABLA (crudo)
select
  'tabla' as nivel,
  c.relname as objeto,
  coalesce(a.acl, '(sin ACL explícita)') as acl
from pg_class c
left join lateral unnest(c.relacl::text[]) as a(acl) on true
where c.oid = 'public.fno_empleados'::regclass

union all

-- 2. Permisos a nivel de COLUMNA (crudo). Si la migración se aplicó, acá
--    tendrían que aparecer las columnas del directorio y ninguna sensible.
select
  'columna: ' || att.attname,
  'fno_empleados',
  coalesce(a.acl, '(sin ACL explícita)')
from pg_attribute att
left join lateral unnest(att.attacl::text[]) as a(acl) on true
where att.attrelid = 'public.fno_empleados'::regclass
  and att.attnum > 0
  and not att.attisdropped
  and att.attacl is not null

order by nivel, acl;
