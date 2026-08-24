-- DIAGNÓSTICO 5 — SOLO LECTURA.
--
-- El revoke y el grant por columna se aplicaron (los dos dieron Success), pero
-- has_column_privilege('authenticated', ..., 'cbu', 'SELECT') sigue dando true.
--
-- has_column_privilege no responde "¿tiene un GRANT directo?" sino "¿puede
-- leerla?", y eso incluye lo que le llega por PERTENECER A OTRO ROL. Si
-- `authenticated` es miembro de un rol que puede leer la tabla entera —por
-- ejemplo pg_read_all_data—, el permiso le llega igual por esa vía y revocarle
-- el suyo no cambia nada.
--
-- Esto separa las tres posibilidades: que el revoke no haya quedado, que las
-- columnas no se hayan otorgado, o que haya herencia.

-- 1. ACL cruda de la tabla: ¿quedó la `r` de authenticated?
select 'ACL tabla' as que, coalesce(a.acl, '(vacía)') as detalle
from pg_class c
left join lateral unnest(c.relacl::text[]) as a(acl) on true
where c.oid = 'public.fno_empleados'::regclass

union all

-- 2. ¿Se crearon los permisos por columna? Tendrían que ser once filas.
select 'ACL columna ' || att.attname, coalesce(a.acl, '(vacía)')
from pg_attribute att
left join lateral unnest(att.attacl::text[]) as a(acl) on true
where att.attrelid = 'public.fno_empleados'::regclass
  and att.attnum > 0 and not att.attisdropped and att.attacl is not null

union all

-- 3. ¿De qué roles es miembro `authenticated`? Acá aparecería la herencia.
select 'authenticated es miembro de', r.rolname || (case when m.admin_option then ' (admin)' else '' end)
from pg_auth_members m
join pg_roles r on r.oid = m.roleid
join pg_roles g on g.oid = m.member
where g.rolname = 'authenticated'

union all

-- 4. ¿Es `authenticated` superusuario o tiene bypass de RLS? Cualquiera de las
--    dos haría irrelevantes todos los permisos.
select 'atributos de authenticated',
  'superuser=' || rolsuper || ' bypassrls=' || rolbypassrls || ' inherit=' || rolinherit
from pg_roles where rolname = 'authenticated';
