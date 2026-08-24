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

begin;

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

-- Quedan fuera, y sólo se pueden leer vía /api/empleados-detalle:
--   dni, cuil, direccion, telefono, contacto_emergencia,
--   cbu, banco, desvinculacion, historial_desvinculaciones,
--   fecha_ingreso, tipo_contrato, jornada, supervisor,
--   dias_vacaciones, dias_vacaciones_usados
--
-- (las dos últimas no las usa la aplicación hoy, pero se cierran igual: son
--  datos del legajo y no hay motivo para dejarlas abiertas)

commit;

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
