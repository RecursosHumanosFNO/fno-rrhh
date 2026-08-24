-- Cerrar la lectura de datos personales en fno_empleados.
--
-- ⚠️ CORRER RECIÉN DESPUÉS DE QUE EL CÓDIGO NUEVO ESTÉ DESPLEGADO Y PROBADO.
--    El deploy anterior pide estas columnas en el sync del navegador; si se
--    revocan antes, ese sync empieza a fallar y nadie puede listar empleados.
--
-- El problema
-- -----------
-- La política de lectura de fno_empleados es `using (true)`: cualquier usuario
-- logueado podía leer todas las filas y todas las columnas. Verificado en el
-- dashboard con "View data as user" sobre un empleado común: veía el CBU, el
-- DNI, el domicilio y las desvinculaciones de todos sus compañeros. La
-- separación por rol existía únicamente en la pantalla.
--
-- Por qué permisos por columna y no una política
-- ----------------------------------------------
-- RLS filtra FILAS, no columnas. Acá hace falta lo contrario: todos pueden ver
-- todas las filas (el directorio: quién trabaja acá, en qué sector, cuándo
-- cumple años), pero nadie puede ver ciertas COLUMNAS de las filas ajenas. Eso
-- en Postgres se hace con permisos por columna, que es lo que hace esto.
--
-- Los datos que se cierran acá pasan a servirse por /api/empleados-detalle, que
-- corre en el servidor con service role y decide según el rol real del JWT:
-- Gestión de Personal ve todos los legajos, y cualquier otro empleado sólo el
-- propio.
--
-- Nota sobre `email`: queda entre las columnas visibles a propósito. Es un
-- directorio de trabajo y el flujo de avisos por mail lo usa desde el cliente;
-- moverlo obligaba a rehacer ese flujo y agrandaba un cambio que ya toca
-- permisos en producción. Queda anotado como mejora aparte.

-- ⚠️ ANTES DE CORRER: salir del modo "View data as user" del dashboard.
--
-- Esa impersonacion no afecta solo al Table Editor: tambien hace SET ROLE
-- authenticated en el SQL Editor. Y en PostgreSQL un REVOKE solo quita los
-- permisos que otorgo el rol que ejecuta la sentencia — el ACL dice
-- authenticated=arwdDxtm/postgres, o sea que los otorgo postgres—, asi que
-- corriendo como authenticated la sentencia NO HACE NADA y reporta Success
-- igual (Postgres emite un WARNING, no un error).
--
-- Nos costo cuatro diagnosticos darnos cuenta. Para comprobarlo:
--   select current_user, session_user;
-- Tienen que decir postgres las dos. Si current_user dice authenticated,
-- la impersonacion sigue activa.

-- Sin begin/commit a proposito: el editor de Supabase ya envuelve lo que se
-- ejecuta, y un bloque explicito se presta a que un error pase inadvertido y
-- quede todo revertido sin que se note. El primer intento no aplico nada
-- —quedo verificado con pg_attribute.attacl, que no mostraba ninguna columna—
-- asi que conviene ver el resultado de cada sentencia.

-- El permiso de tabla se reemplaza por permisos columna por columna. Sin el
-- revoke previo, el grant de abajo no quita nada: los permisos se suman.
revoke select on public.fno_empleados from authenticated;

grant select (
  -- Directorio: lo que cualquier compañero legítimamente necesita para el
  -- listado, los cumpleaños y las pantallas de comunicaciones.
  id,
  nombre,
  apellido,
  email,
  fecha_nacimiento,
  sector,
  cargo,
  cargos_extra,
  estado,
  foto,
  foto_cover
) on public.fno_empleados to authenticated;

-- A `anon` no se le toca nada. Tiene permiso de tabla completo, pero la
-- politica de RLS de fno_empleados aplica solo a `authenticated`, asi que un
-- visitante sin sesion no obtiene ninguna fila igual. Revocarselo ademas haria
-- que el sync que corre antes de autenticar devuelva error en vez de vacio.

-- Quedan fuera, y sólo se pueden leer vía /api/empleados-detalle:
--   dni, cuil, direccion, telefono, contacto_emergencia,
--   cbu, banco, desvinculacion, historial_desvinculaciones,
--   fecha_ingreso, tipo_contrato, jornada, supervisor,
--   dias_vacaciones, dias_vacaciones_usados
--
-- (las dos últimas no las usa la aplicación hoy, pero se cierran igual: son
--  datos del legajo y no hay motivo para dejarlas abiertas)

-- ── Verificación ────────────────────────────────────────────────────────────
-- Después de correr esto, volver al dashboard → Authentication → Users →
-- "View data as user" con un empleado común y abrir fno_empleados. Tiene que
-- fallar o mostrar sólo las columnas del directorio.
--
-- Y en el portal, con ese mismo empleado: que el listado de cumpleaños siga
-- andando y que en "Mi Perfil" siga viendo SU propio CBU y DNI.

select
  column_name as columna,
  case when privilege_type is null then 'CERRADA' else 'visible' end as estado
from information_schema.columns c
left join information_schema.column_privileges p
  on p.table_schema = c.table_schema
 and p.table_name = c.table_name
 and p.column_name = c.column_name
 and p.grantee = 'authenticated'
 and p.privilege_type = 'SELECT'
where c.table_schema = 'public' and c.table_name = 'fno_empleados'
order by estado, column_name;
