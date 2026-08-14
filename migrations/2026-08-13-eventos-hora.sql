-- Hora opcional para los eventos del calendario.
--
-- La mayoría de los eventos (feriados, recesos, jornadas) no tienen un horario
-- puntual, pero actos, reuniones y capacitaciones sí. Antes no había dónde
-- guardarlo.

alter table fno_eventos add column if not exists hora text;
