-- Horario de las solicitudes por hora (permisos, salidas particulares).
--
-- El tipo Solicitud ya declaraba horarioDesde/horarioHasta, el formulario los
-- pedía, el mail al admin los mostraba y el PDF de constancia los imprimía —
-- pero no estaban en los mappers ni existían las columnas. El dato vivía sólo
-- en el estado local: se veía bien hasta el siguiente sync (diez minutos, o al
-- volver a la pestaña) y ahí desaparecía para siempre.
--
-- Correr ANTES de desplegar el código, o junto con el deploy: el mapper nuevo
-- manda estas dos columnas en cada insert.
--
-- Son text y no time a propósito: el formulario usa <input type="time"> y manda
-- 'HH:MM'; guardar el string evita conversiones de zona horaria sobre un dato
-- que no tiene fecha.

alter table fno_solicitudes add column if not exists horario_desde text;
alter table fno_solicitudes add column if not exists horario_hasta text;
