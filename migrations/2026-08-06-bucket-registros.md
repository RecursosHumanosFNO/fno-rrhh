# Bucket privado para las fotos de los registros internos

Hay que crearlo a mano en el dashboard de Supabase (Storage → New bucket):

- **Nombre:** `fno-registros`
- **Public bucket:** **NO** (tiene que quedar privado)

No hacen falta policies de RLS: el bucket lo escribe y lo lee `/api/registro-foto`
con la service role key, que las saltea. El navegador nunca lo toca directamente,
justamente para no tener que abrirle permisos de escritura a la anon key.

## Por qué

Las fotos de `fno_registros_novedad` documentan sanciones, accidentes y
conflictos. Iban a `fno-media`, que es **público**, con el nombre
`registros-novedad/{Date.now()}.jpg` — adivinable barriendo las horas laborales
del día que figura en el propio registro, sin cuenta y sin dejar rastro. Además
la URL viajaba por email.

Ahora funcionan como los recibos: bucket privado, URL firmada a diez minutos, y
sólo para quien maneja RRHH (`esGestionPersonal`).

## Las fotos viejas

Los registros anteriores guardaron la URL pública completa y el código las
sigue mostrando tal cual, así que **no se rompe nada**. Pero siguen siendo
públicas: si querés cerrarlas del todo hay que moverlas a mano de `fno-media` a
`fno-registros` y reemplazar el `foto_url` de esas filas por el path nuevo.
Mientras tanto, cualquier registro nuevo ya nace privado.
