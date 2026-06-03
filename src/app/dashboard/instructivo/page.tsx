'use client'

import { useAuth } from '@/contexts/AuthContext'
import {
  BookOpen, Printer, LogIn, UserPlus, KeyRound, FileText, ClipboardList,
  Megaphone, Calendar, HeadphonesIcon, User, Mail, Lock, Bell,
  Smartphone, Info, AlertCircle, CheckCircle2,
} from 'lucide-react'

export default function InstructivoPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  return (
    <div className="page-container max-w-4xl mx-auto">
      {/* Header (oculto al imprimir) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            Instructivo de Uso
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Guía rápida para usar el Portal RRHH de la Fundación
          </p>
        </div>
        <button onClick={() => window.print()} className="btn-primary">
          <Printer className="w-4 h-4" /> Imprimir o Guardar como PDF
        </button>
      </div>

      {/* Encabezado de impresión (solo visible al imprimir) */}
      <div className="hidden print:block">
        <h1 className="text-3xl font-bold mb-1">Portal RRHH — Fundación Neuquén Oeste</h1>
        <p className="text-lg text-slate-600">Instructivo de uso para el personal</p>
        <hr className="my-4 border-slate-300" />
      </div>

      {/* Contenido */}
      <div className="card p-6 sm:p-8 space-y-8 print:p-0 print:shadow-none print:border-0">

        {/* Bienvenida */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">👋 Bienvenido/a al Portal</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Este es el portal interno de la <strong>Fundación Neuquén Oeste</strong>. Desde acá vas a
            poder consultar tus recibos de sueldo, gestionar solicitudes y permisos, ver el calendario
            institucional, comunicarte con RRHH y mantenerte al día con las novedades.
          </p>
        </section>

        {/* 1. Primer ingreso */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            1. Primer ingreso
          </h2>
          <div className="space-y-3 text-slate-600 dark:text-slate-300">
            <p>Si todavía no tenés cuenta:</p>
            <ol className="list-decimal pl-6 space-y-1.5 text-sm">
              <li>Entrá a <strong>portalfundacion.vercel.app</strong> desde cualquier dispositivo.</li>
              <li>Hacé clic en <strong>"Crear cuenta"</strong> debajo del formulario.</li>
              <li>Completá tus datos personales y laborales.</li>
              <li>Elegí una contraseña que recuerdes bien.</li>
              <li>Tu solicitud queda pendiente de aprobación por RRHH.</li>
              <li>Cuando RRHH apruebe tu acceso, vas a recibir un email de confirmación.</li>
            </ol>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>El <strong>email</strong> que uses al registrarte es importante: lo necesitás para iniciar sesión y para recuperar tu contraseña.</span>
            </div>
          </div>
        </section>

        {/* 2. Iniciar sesión */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            2. Iniciar sesión
          </h2>
          <ol className="list-decimal pl-6 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li>Entrá a la dirección del portal.</li>
            <li>Ingresá tu <strong>email</strong> y <strong>contraseña</strong>.</li>
            <li>Hacé clic en <strong>"Ingresar al Portal"</strong>.</li>
            <li>Si olvidaste tu contraseña, usá el link <strong>"¿Olvidaste tu contraseña?"</strong> y te llegará un email con un enlace para crear una nueva.</li>
          </ol>
        </section>

        {/* 3. Cambiar contraseña */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            3. Cambiar tu contraseña
          </h2>
          <ol className="list-decimal pl-6 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
            <li>Entrá a <strong>"Mi Perfil"</strong> desde el menú lateral.</li>
            <li>Bajá hasta la sección <strong>"Cambiar Contraseña"</strong>.</li>
            <li>Hacé clic en <strong>"Cambiar"</strong>.</li>
            <li>Escribí la nueva contraseña dos veces y guardá.</li>
            <li>Por seguridad, el sistema te cierra la sesión y tenés que volver a entrar con la nueva.</li>
          </ol>
        </section>

        {/* 4. Mis Recibos */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            4. Mis Recibos de Sueldo
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p>Acá vas a encontrar todos tus recibos publicados por RRHH:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Filtrá por <strong>mes</strong> o <strong>año</strong> para encontrar uno puntual.</li>
              <li>Hacé clic en <strong>"Ver PDF"</strong> para descargarlo.</li>
              <li>Cada recibo indica si es <strong>recibo mensual</strong> o <strong>aguinaldo</strong> (SAC).</li>
              <li>Cuando RRHH publica un recibo nuevo, vas a recibir un aviso por email y en las notificaciones del portal.</li>
            </ul>
          </div>
        </section>

        {/* 5. Mis Solicitudes */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            5. Mis Solicitudes
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p>Para pedir un permiso, licencia, capacitación, etc.:</p>
            <ol className="list-decimal pl-6 space-y-1">
              <li>Entrá a <strong>"Mis Solicitudes"</strong>.</li>
              <li>Tocá <strong>"Nueva solicitud"</strong>.</li>
              <li>Elegí el tipo (ausencia, vacaciones, licencia médica, etc.).</li>
              <li>Indicá fecha de inicio y, si corresponde, fecha de fin y horario.</li>
              <li>Escribí una descripción breve del motivo.</li>
              <li>Enviá la solicitud.</li>
            </ol>
            <p>Vas a poder ver el estado en todo momento (pendiente, aprobada, rechazada) con una línea de tiempo que muestra el recorrido del pedido. Mientras esté pendiente, podés cancelarla.</p>
          </div>
        </section>

        {/* 6. Comunicaciones */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            6. Comunicaciones
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Es el espacio donde RRHH publica novedades, comunicados, alertas y avisos importantes.
            Podés filtrar por categoría y hacer clic en cada novedad para ver el contenido completo,
            incluidas imágenes y archivos adjuntos.
          </p>
        </section>

        {/* 7. Eventos */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            7. Eventos y Cumpleaños
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            El calendario institucional con feriados, jornadas, actos escolares, capacitaciones,
            recesos, semanas de proyectos y más. Los cumpleaños del equipo aparecen marcados en rosa.
            Tocá un día para ver el detalle de los eventos.
          </p>
        </section>

        {/* 8. Portal RRHH */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <HeadphonesIcon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            8. Portal RRHH (consultas y tickets)
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Si necesitás un certificado laboral, hacer una consulta, actualizar tus datos o presentar
            un reclamo, abrí un ticket desde esta sección. Vas a ver el estado del pedido y la
            respuesta de RRHH directamente acá.
          </p>
        </section>

        {/* 9. Mi Perfil */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            9. Mi Perfil
          </h2>
          <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p>Podés editar tus datos personales, datos bancarios, contacto de emergencia y subir
            una foto de perfil o portada. <strong>El email</strong> no se puede cambiar — si necesitás
            actualizarlo, comunicate con RRHH.</p>
            <p>Si en el menú aparece un <strong>triángulo naranja ⚠️</strong> al lado de "Mi Perfil",
            significa que faltan datos por completar.</p>
          </div>
        </section>

        {/* 10. Notificaciones */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            10. Notificaciones
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            La campana arriba a la derecha muestra avisos en tiempo real: cuando se publica una novedad,
            cuando se resuelve una solicitud tuya, cuando hay un recibo nuevo, etc. Tocá una
            notificación para ir directo a la sección correspondiente.
          </p>
        </section>

        {/* Sección admin (solo visible si es admin y al imprimir siempre) */}
        {isAdmin && (
          <section className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-5 border border-brand-100 dark:border-brand-800">
            <h2 className="text-xl font-bold text-brand-800 dark:text-brand-200 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5" />
              Sección para administradores
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
              Como administrador, además tenés acceso a: gestión de empleados, aprobación de
              accesos pendientes, publicación de comunicaciones, carga de recibos (individual y
              masiva por DNI), gestión de eventos, estadísticas exportables y configuración de roles.
            </p>
          </section>
        )}

        {/* Consejos */}
        <section className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-5 border border-emerald-100 dark:border-emerald-800">
          <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Consejos útiles
          </h2>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            <li><strong>Modo claro / oscuro:</strong> el ☀️ / 🌙 arriba a la derecha cambia el tema según tu preferencia.</li>
            <li><strong>Buscador:</strong> en la barra superior podés buscar eventos, cumpleaños y novedades rápidamente.</li>
            <li><strong>Mobile:</strong> el portal funciona perfecto en el celular. Tocá el ícono de menú ☰ para ver las secciones.</li>
            <li><strong>Privacidad:</strong> cada empleado ve solo sus propios datos. Tus recibos y solicitudes son privados.</li>
          </ul>
        </section>

        {/* Contacto */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            ¿Necesitás ayuda?
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Comunicate con el área de Recursos Humanos:
          </p>
          <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 text-sm">
            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> rrhhfundacionnqnoeste@gmail.com</p>
          </div>
        </section>

        {/* Pie de página */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 text-xs text-slate-400 text-center print:text-slate-500">
          Portal RRHH · Fundación Neuquén Oeste · v1.0
        </div>
      </div>
    </div>
  )
}
