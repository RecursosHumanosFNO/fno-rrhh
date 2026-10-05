-- Días de la semana en los que cae un evento semanal.
--
-- Hasta ahora una serie semanal caía siempre el mismo día que su fecha, así que
-- "los martes y jueves" obligaba a cargar dos eventos distintos: dos títulos que
-- mantener, dos para editar y dos para borrar.
--
-- Guarda 0=domingo … 6=sábado. NULL o vacío = el mismo día que la fecha, que es
-- el comportamiento de todas las series que ya existen; por eso no hace falta
-- tocar ninguna fila.
--
-- Sólo aplica a repeticion = 'semanal'; en mensual y anual se guarda NULL.

ALTER TABLE fno_eventos
  ADD COLUMN IF NOT EXISTS repeticion_dias smallint[];

COMMENT ON COLUMN fno_eventos.repeticion_dias IS
  'Días de la semana de una serie semanal (0=domingo … 6=sábado). NULL = el mismo día que la fecha.';
