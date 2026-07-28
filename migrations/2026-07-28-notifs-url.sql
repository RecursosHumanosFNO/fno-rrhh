-- Link opcional de una notificación de la campanita.
--
-- Sin esta columna el portal sigue funcionando: el insert de fno_notifs
-- reintenta sin las columnas nuevas, así que las notificaciones se guardan
-- igual pero sin destino propio y la campanita las manda al listado genérico
-- según su tipo.
--
-- Correr en el SQL Editor de Supabase.

alter table fno_notifs
  add column if not exists url text;
