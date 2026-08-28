-- Credencial digital de la ART por empleado.
--
-- Se guarda el PATH dentro del bucket privado fno-recibos (no una URL): el PDF
-- trae DNI y CUIL, así que sólo se accede por URL firmada de 10 minutos que
-- emite /api/credencial-art, y sólo al dueño o a Gestión de Personal.
--
-- Correr en el SQL Editor de Supabase con el selector de rol en "postgres"
-- (si quedó en "View data as user", el DDL corre como authenticated y falla).

alter table public.fno_empleados
  add column if not exists credencial_art text,
  add column if not exists credencial_art_nombre text,
  add column if not exists credencial_art_subida_en timestamptz;

-- La columna es parte de los datos sensibles: no entra en el SELECT que tiene
-- authenticated sobre la tabla (el directorio), se sirve por API.
