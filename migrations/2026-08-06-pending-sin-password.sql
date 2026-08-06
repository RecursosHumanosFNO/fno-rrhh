-- Saca la contraseña en claro de fno_pending.
--
-- La elegía la persona al registrarse y quedaba sin hashear en esta tabla,
-- insertada desde el navegador con la anon key y bajada de vuelta por el sync
-- del cliente —que corre antes de autenticar—, así que su confidencialidad
-- dependía por completo de la policy de RLS. Y como esa misma contraseña
-- terminaba en Supabase Auth, leerla equivalía a tomar la cuenta.
--
-- Ahora la cuenta se crea con una contraseña temporal generada en el server y
-- la persona define la suya con "Olvidé mi contraseña" (tokens de un solo uso,
-- 30 minutos de validez).
--
-- Correr DESPUÉS de desplegar el código: el deploy anterior todavía inserta la
-- columna, y si la columna es NOT NULL el insert empezaría a fallar.

alter table fno_pending drop column if exists password;
