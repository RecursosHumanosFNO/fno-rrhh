# Manual de Supervivencia — Portal RRHH FNO

> Este documento es para cualquier persona que deba mantener o entender el Portal de Recursos Humanos de la Fundación Neuquén Oeste, aunque no tenga conocimientos técnicos.

---

## ¿Qué es este sistema?

El Portal RRHH es una aplicación web accesible desde **portalfno.com**. Permite a los empleados de la Fundación Neuquén Oeste gestionar recibos de sueldo, solicitudes de licencia, novedades institucionales, tickets y más. Los administradores pueden gestionar empleados, aprobar solicitudes y ver estadísticas.

El sistema **corre solo en internet** — no hay ningún servidor físico en la fundación que mantener.

---

## Accesos críticos — guardar en lugar seguro

| Servicio | Para qué sirve | Quién tiene acceso |
|---|---|---|
| **Vercel** — vercel.com | Aloja la aplicación web (portalfno.com) | Cuenta RecursosHumanosFNO |
| **Supabase** — supabase.com | Base de datos, archivos (recibos, fotos), autenticación de usuarios | Cuenta RecursosHumanosFNO |
| **GitHub** — github.com/RecursosHumanosFNO | Código fuente del sistema | Cuenta RecursosHumanosFNO |
| **Sentry** — fundacion-neuquen-oeste.sentry.io | Alertas de errores en producción | Cuenta vinculada al email admin |
| **Gmail RRHH** — rrhhfundacionnqnoeste@gmail.com | Envío de emails automáticos del sistema | Contraseña + app password |
| **Dominio** — portalfno.com | Dirección web del portal | Registrador de dominio (verificar quién) |

> ⚠️ **Acción recomendada:** Guardar todas las contraseñas en un gestor de contraseñas institucional (ej: Bitwarden gratuito) al que tenga acceso más de una persona de confianza.

---

## Qué hacer si algo no funciona

### "Los empleados no pueden entrar al portal"

1. Verificar que **portalfno.com** carga desde un navegador normal
2. Si no carga → ir a **vercel.com** → proyecto fno-rrhh → ver si el deployment dice "Ready" (verde) o hay un error
3. Si hay error de deployment → contactar a alguien técnico con acceso a GitHub
4. Si carga pero no pueden iniciar sesión → ir a **supabase.com** → proyecto → Authentication → Users → verificar que el usuario existe y está activo

### "Los recibos no aparecen o no se pueden descargar"

1. Ir a **supabase.com** → proyecto → Storage → bucket `fno-recibos`
2. Verificar que los archivos PDF están ahí
3. Si están pero no se pueden descargar → puede ser un problema de permisos → contactar soporte técnico

### "Los emails automáticos no llegan (aprobaciones, notificaciones)"

1. Verificar que la cuenta **rrhhfundacionnqnoeste@gmail.com** está activa y no tiene problemas
2. Ir a **vercel.com** → proyecto → Settings → Environment Variables → verificar que `GMAIL_USER` y `GMAIL_PASS` están configuradas
3. El "app password" de Gmail vence si se cambia la contraseña principal — en ese caso hay que generar uno nuevo en Google Account → Security → App Passwords

### "Aparece un error en pantalla"

1. Ir a **fundacion-neuquen-oeste.sentry.io** → ver los errores recientes
2. El error tiene un mensaje y un stack trace — mandarlo a quien pueda resolverlo
3. Si es urgente, usar el botón "Instant Rollback" en Vercel para volver a la versión anterior

### "Necesito agregar o dar de baja un empleado"

- Esto se hace desde el portal mismo: Dashboard → Empleados
- No requiere acceso a ningún sistema externo
- Para dar de baja: marcar como "inactivo" (nunca borrar — se pierde el historial)

---

## Renovaciones que no hay que olvidar

| Qué | Cuándo | Dónde |
|---|---|---|
| **Dominio portalfno.com** | Anualmente | Registrador de dominio |
| **Plan de Vercel** | Mensual/anual según plan | vercel.com → Billing |
| **Plan de Supabase** | Mensual según plan | supabase.com → Billing |
| **App Password de Gmail** | Solo si cambia la contraseña principal | Google Account |
| **Plan de Sentry** | Mensual según plan (hay plan gratuito) | sentry.io → Billing |

> ⚠️ Si Supabase o Vercel vencen sin renovar, **el portal deja de funcionar**. Configurar alertas de facturación en ambos.

---

## Estructura del sistema (para quien deba hacer cambios)

```
portalfno.com  ←→  Vercel (hosting)  ←→  GitHub (código)
                              ↕
                   Supabase (base de datos + archivos + auth)
                              ↕
                   Gmail (envío de emails automáticos)
```

**El código** vive en github.com/RecursosHumanosFNO/fno-rrhh  
**Los cambios** se hacen al código → se suben a GitHub → Vercel los despliega automáticamente  
**Los datos** (empleados, recibos, solicitudes) viven en Supabase y nunca se tocan directamente salvo casos especiales  

---

## Variables de entorno críticas (Vercel → Settings → Environment Variables)

Estas configuraciones son el "sistema nervioso" del portal. Si alguna falta o es incorrecta, parte del sistema deja de funcionar.

| Variable | Para qué sirve |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Dirección de la base de datos |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada de Supabase (nunca compartir) |
| `GMAIL_USER` | Email desde el que se envían notificaciones |
| `GMAIL_PASS` | App password de Gmail |
| `NEXT_PUBLIC_PORTAL_URL` | URL del portal (https://portalfno.com) |
| `NEXT_PUBLIC_SENTRY_DSN` | Conexión con sistema de alertas de errores |
| `CRON_SECRET` | Clave de seguridad para tareas automáticas (cumpleaños, reportes) |

---

## Tareas automáticas del sistema

El sistema ejecuta automáticamente:

- **Todos los días a las 7am (Argentina):** Envía emails de felicitación de cumpleaños a empleados
- **Todos los días a las 8am (Argentina):** Envía reporte diario al email administrador

Estas tareas las gestiona Vercel Cron. Si dejan de funcionar, verificar en Vercel → proyecto → Settings → Cron Jobs.

---

## Contactos de soporte

| Situación | A quién contactar |
|---|---|
| Error técnico en el código | Desarrollador con acceso a GitHub |
| Problema con Vercel | soporte en vercel.com/support |
| Problema con Supabase | soporte en supabase.com/support |
| Problema con el dominio | Registrador del dominio |

---

## Glosario mínimo

- **Deployment:** El proceso de publicar una nueva versión del portal en internet
- **Base de datos:** Donde se guardan todos los datos (empleados, recibos, solicitudes, etc.)
- **Storage:** Donde se guardan los archivos (PDFs de recibos, fotos de perfil, imágenes)
- **Variable de entorno:** Configuración secreta que el sistema necesita para funcionar (contraseñas, URLs)
- **RLS (Row Level Security):** Sistema de seguridad de Supabase que impide que usuarios vean datos de otros
- **Branch / Rama:** Versión del código en desarrollo antes de publicarse

---

*Última actualización: junio 2026*  
*Generado con Claude Code — Portal RRHH FNO*
