-- Publicación programada de novedades y eventos.
--
-- Se carga hoy con "publicar el 15/09 a las 8:00": hasta ese momento no se ve ni
-- avisa nada, y a esa hora se publica solo y recién ahí salen la campanita, la
-- push y el mail. La publicación la dispara /api/cron/publicar-programados.
--
-- ⚠️ Correr con el selector de rol del SQL Editor en "postgres".

alter table public.fno_novedades
  add column if not exists publicar_en timestamptz,   -- null = ya publicada
  add column if not exists aviso_canales text[];      -- {app,email} pendientes de enviar

alter table public.fno_eventos
  add column if not exists publicar_en timestamptz,
  add column if not exists aviso_canales text[];

-- ── Visibilidad ─────────────────────────────────────────────────────────────
-- Que la pantalla las esconda no alcanza: el sync baja las filas con la anon
-- key y cualquiera podría leer una novedad programada antes de tiempo abriendo
-- la consola. La regla tiene que estar acá.
--
-- Quien publica (admin + comunicaciones, o sea fno_can_manage_novedades) sí las
-- ve: necesita revisarlas y editarlas antes de que salgan.

drop policy if exists "novedades_select" on public.fno_novedades;
create policy "novedades_select" on public.fno_novedades
  for select to authenticated
  using (
    publicar_en is null
    or publicar_en <= now()
    or fno_can_manage_novedades()
  );

drop policy if exists "fno_eventos_select" on public.fno_eventos;
create policy "fno_eventos_select" on public.fno_eventos
  for select to authenticated
  using (
    publicar_en is null
    or publicar_en <= now()
    or fno_can_manage_novedades()
  );

-- Para verificar:
--   select policyname, cmd, qual from pg_policies
--   where tablename in ('fno_novedades', 'fno_eventos') and cmd = 'SELECT';
--
-- Y que las columnas estén:
--   select table_name, column_name from information_schema.columns
--   where table_name in ('fno_novedades','fno_eventos')
--     and column_name in ('publicar_en','aviso_canales')
--   order by table_name, column_name;
