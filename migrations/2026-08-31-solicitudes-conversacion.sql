-- 1) Conversación dentro de una solicitud + el estado "en revisión".
-- 2) Cerrarle a anon la escritura sobre el bucket fno-media.
--
-- ⚠️ Correr con el selector de rol del SQL Editor en "postgres".

-- ── Conversación ────────────────────────────────────────────────────────────
-- Antes una solicitud sólo tenía comentario_admin: un texto, una vez. Si el
-- pedido no se resolvía en un mensaje, no había a dónde seguir. Ahora se guarda
-- el ida y vuelta completo, y el estado 'en_revision' es el que tiene mientras
-- esa conversación sigue abierta.
alter table public.fno_solicitudes
  add column if not exists conversacion jsonb not null default '[]'::jsonb;

-- Si la columna estado tiene un CHECK que enumera los estados viejos, hay que
-- rehacerlo o los updates a 'en_revision' fallan. Este bloque lo detecta y lo
-- reemplaza; si no existe ningún CHECK, no hace nada.
do $$
declare
  nombre_constraint text;
begin
  select con.conname into nombre_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'fno_solicitudes'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%estado%'
  limit 1;

  if nombre_constraint is not null then
    execute format('alter table public.fno_solicitudes drop constraint %I', nombre_constraint);
    alter table public.fno_solicitudes
      add constraint fno_solicitudes_estado_check
      check (estado in ('pendiente', 'en_revision', 'aprobado', 'rechazado'));
    raise notice 'CHECK de estado reemplazado (era %)', nombre_constraint;
  else
    raise notice 'No había CHECK sobre estado: no hay nada que cambiar';
  end if;
end $$;

-- ── Bucket fno-media: sacarle la escritura a anon ───────────────────────────
-- Las políticas de Storage dejaban SUBIR y BORRAR en fno-media a {anon,
-- authenticated}, sin más condición que el bucket. anon es cualquiera que abra
-- el portal sin iniciar sesión: con la anon key, que viaja en el JavaScript,
-- podía borrar las fotos de perfil de todos y las imágenes de las novedades.
--
-- La lectura se deja pública a propósito: es el bucket de las fotos que se
-- muestran en el portal y en los mails.
--
-- Verificado en el código que TODAS las subidas y borrados de fno-media salen de
-- pantallas con sesión (perfil, ficha de empleado, comunicaciones, eventos). El
-- alta de una foto en el registro va por /api/registro-foto, que usa service
-- role y otro bucket, así que esto no rompe el registro.
drop policy if exists "Allow uploads fno-media" on storage.objects;
drop policy if exists "Allow deletes fno-media" on storage.objects;

create policy "Allow uploads fno-media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fno-media');

create policy "Allow deletes fno-media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fno-media');

-- Para verificar después:
--   select policyname, cmd, roles from pg_policies
--   where schemaname = 'storage' and tablename = 'objects' order by policyname;
--
-- Las dos de fno-media tienen que decir {authenticated}, y la de lectura
-- ("Allow reads fno-media") queda como está, en {public}.
