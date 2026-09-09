-- Eventos que se repiten (día del maestro, del alumno, actos, etc.).
--
-- Se guarda UNA fila con la fecha original y cómo se repite; las repeticiones se
-- calculan al mostrar el calendario (src/lib/recurrencia.ts). Así el día del
-- maestro es una fila y no cuarenta, y cambiarle el título lo cambia en todos
-- los años.
--
-- ⚠️ Correr con el selector de rol del SQL Editor en "postgres".

alter table public.fno_eventos
  add column if not exists repeticion text,        -- 'semanal' | 'mensual' | 'anual' | null
  add column if not exists repeticion_cada integer, -- 1 = todas; 2 = una sí y una no
  add column if not exists repeticion_hasta date;   -- null = sin fin

-- Si la columna tipo tiene un CHECK con la lista vieja de tipos, hay que
-- rehacerlo o no se van a poder guardar los nuevos (conmemoración, efeméride,
-- boletines, etc.). Este bloque lo detecta y lo saca; el tipo se valida en la
-- app, que es donde está la lista.
do $$
declare
  nombre_constraint text;
begin
  select con.conname into nombre_constraint
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'fno_eventos'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%tipo%'
  limit 1;

  if nombre_constraint is not null then
    execute format('alter table public.fno_eventos drop constraint %I', nombre_constraint);
    raise notice 'CHECK de tipo eliminado (era %)', nombre_constraint;
  else
    raise notice 'No había CHECK sobre tipo: no hay nada que cambiar';
  end if;
end $$;

-- Para verificar:
--   select column_name, data_type from information_schema.columns
--   where table_name = 'fno_eventos' and column_name like 'repeticion%';
