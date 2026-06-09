'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  BookOpen, Printer, LogIn, UserPlus, KeyRound, FileText, ClipboardList,
  Megaphone, Calendar, HeadphonesIcon, User, Mail, Bell, AlertCircle,
  CheckCircle2, Sparkles, Pin, Paperclip, Image as ImageIcon, Upload,
  Users, Shield, BarChart2, UserMinus, UserCheck, ChevronRight, Info,
  Settings, Eye, Edit2, Trash2, Lock, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type GuideTab = 'empleados' | 'comunicaciones' | 'admin'

function Section({ icon: Icon, number, title, color = 'brand', children }: {
  icon: React.ElementType; number?: string | number; title: string; color?: string; children: React.ReactNode
}) {
  const colorMap: Record<string, string> = {
    brand: 'text-brand-600 dark:text-brand-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
    sky: 'text-sky-600 dark:text-sky-400',
  }
  return (
    <section>
      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
        <Icon className={cn('w-5 h-5', colorMap[color] ?? colorMap.brand)} />
        {number && `${number}. `}{title}
      </h2>
      <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
        {children}
      </div>
    </section>
  )
}

function Note({ type = 'info', children }: { type?: 'info' | 'warn' | 'tip' | 'danger'; children: React.ReactNode }) {
  const styles = {
    info:   'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300',
    warn:   'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    tip:    'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
    danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  }
  const icons = { info: Info, warn: AlertCircle, tip: CheckCircle2, danger: AlertCircle }
  const Icon = icons[type]
  return (
    <div className={cn('border rounded-xl p-3 flex gap-2 text-sm', styles[type])}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────── */
/* GUÍA EMPLEADOS                                          */
/* ─────────────────────────────────────────────────────── */
function GuiaEmpleados() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">👋 Bienvenido/a al Portal</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Este es el portal interno de la <strong>Fundación Neuquén Oeste</strong>. Desde acá podés
          consultar tus recibos, gestionar solicitudes, ver el calendario institucional, comunicarte con RRHH,
          hablar con el asistente de IA y mantenerte al día con las novedades.
        </p>
      </section>

      <Section icon={UserPlus} number={1} title="Primer ingreso y registro">
        <p>Si todavía no tenés cuenta:</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Entrá a <strong>portalfno.com</strong> desde cualquier dispositivo.</li>
          <li>Hacé clic en <strong>"Crear cuenta"</strong> debajo del formulario de login.</li>
          <li>Completá tus datos personales y laborales.</li>
          <li>Elegí una contraseña que recuerdes.</li>
          <li>Tu solicitud queda <strong>pendiente de aprobación</strong> por RRHH.</li>
          <li>Cuando RRHH apruebe tu acceso recibirás un email de confirmación.</li>
        </ol>
        <Note type="warn">
          El <strong>email</strong> que uses al registrarte es tu usuario para siempre. Usá uno que tengas acceso permanente.
        </Note>
      </Section>

      <Section icon={LogIn} number={2} title="Iniciar sesión">
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Ingresá tu <strong>email</strong> y <strong>contraseña</strong> en la pantalla de inicio.</li>
          <li>Hacé clic en <strong>"Ingresar al Portal"</strong>.</li>
          <li>Si olvidaste la contraseña, usá <strong>"¿Olvidaste tu contraseña?"</strong> — te llegará un email con un enlace para crear una nueva.</li>
        </ol>
      </Section>

      <Section icon={KeyRound} number={3} title="Cambiar tu contraseña">
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Entrá a <strong>Mi Perfil</strong> desde el menú lateral.</li>
          <li>Bajá hasta la sección <strong>"Cambiar Contraseña"</strong> y hacé clic en <strong>"Cambiar"</strong>.</li>
          <li>Escribí la nueva contraseña dos veces y guardá.</li>
          <li>El sistema cerrará la sesión automáticamente — ingresá con la nueva contraseña.</li>
        </ol>
      </Section>

      <Section icon={FileText} number={4} title="Mis Recibos de Sueldo">
        <p>Encontrás todos tus recibos publicados por RRHH:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Filtrá por <strong>mes</strong> o <strong>año</strong> para encontrar uno puntual.</li>
          <li>Hacé clic en <strong>"Ver PDF"</strong> para descargarlo o abrirlo.</li>
          <li>Cada recibo indica si es <strong>recibo mensual</strong>, <strong>aguinaldo (SAC)</strong> u otro concepto.</li>
          <li>Podés <strong>firmar digitalmente</strong> un recibo desde el portal — buscá el botón "Firmar" en el recibo correspondiente.</li>
          <li>Cuando RRHH sube un recibo nuevo, recibís un aviso en la campana 🔔 y por email.</li>
        </ul>
      </Section>

      <Section icon={ClipboardList} number={5} title="Mis Solicitudes">
        <p>Para pedir un permiso, licencia, capacitación u otra gestión:</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Entrá a <strong>Solicitudes y Pedidos</strong>.</li>
          <li>Tocá <strong>"Nueva solicitud"</strong>.</li>
          <li>Elegí el tipo: ausencia, vacaciones, licencia médica, horas extra, etc.</li>
          <li>Indicá fecha de inicio, fecha de fin si corresponde, y horario si es por horas.</li>
          <li>Escribí una descripción breve del motivo y enviá.</li>
        </ol>
        <p>Vas a poder ver el estado en todo momento (<strong>pendiente / aprobada / rechazada</strong>) con una línea de tiempo del recorrido del pedido. Mientras esté pendiente podés cancelarla.</p>
        <Note type="info">Los tipos disponibles incluyen: ausencia, llegada tarde, salida anticipada, vacaciones, licencia médica, licencia por duelo, maternidad/paternidad, horas extra, cambio de turno, capacitación, certificado laboral y más.</Note>
      </Section>

      <Section icon={Megaphone} number={6} title="Comunicaciones">
        <p>Espacio donde RRHH publica novedades, comunicados, alertas y avisos importantes:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Usá los <strong>filtros de categoría</strong> (comunicado, novedad, alerta, feriado, jornada, etc.) para ver solo lo que te interesa.</li>
          <li>Hacé clic en una novedad para ver el contenido completo, imágenes y archivos adjuntos.</li>
          <li>Las novedades marcadas con 📌 <strong>Importante</strong> están destacadas en rojo.</li>
          <li>Cuando filtrás por <strong>Jornada Institucional</strong> o <strong>Feriado</strong>, también aparecen los eventos del calendario — todo sincronizado.</li>
        </ul>
      </Section>

      <Section icon={Calendar} number={7} title="Eventos y Cumpleaños">
        <p>El calendario institucional con feriados nacionales, jornadas, actos escolares, capacitaciones, recesos y proyectos:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Los <strong>cumpleaños del equipo</strong> aparecen marcados en rosa 🎂.</li>
          <li>El panel lateral muestra los próximos eventos de los siguientes 30 días.</li>
          <li>Tocá un día del calendario para ver el detalle de los eventos de esa fecha.</li>
          <li>Podés navegar entre meses con las flechas &lt; &gt;.</li>
        </ul>
      </Section>

      <Section icon={HeadphonesIcon} number={8} title="Soporte RRHH (tickets)">
        <p>Si necesitás un certificado laboral, hacer una consulta, actualizar tus datos o presentar un reclamo:</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Entrá a la sección <strong>Solicitudes y Pedidos</strong> o buscá la opción de <strong>soporte / ticket</strong>.</li>
          <li>Describí tu consulta o pedido.</li>
          <li>RRHH responde directamente en el portal — vas a recibir un aviso cuando haya respuesta.</li>
        </ol>
      </Section>

      <Section icon={User} number={9} title="Mi Perfil">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Podés editar tus <strong>datos personales</strong>: dirección, teléfono, fecha de nacimiento, contacto de emergencia.</li>
          <li>Podés subir o cambiar tu <strong>foto de perfil</strong> y foto de portada.</li>
          <li>Podés cargar tus <strong>datos bancarios</strong> (CBU, banco) para que RRHH los tenga disponibles.</li>
          <li>El <strong>email</strong> no se puede cambiar desde el portal — si necesitás actualizarlo, comunicate con RRHH.</li>
        </ul>
        <Note type="warn">Si en el menú lateral aparece un triángulo ⚠️ naranja al lado de "Mi Perfil", significa que faltan datos por completar.</Note>
      </Section>

      <Section icon={Sparkles} number={10} title="Asistente de IA ✨" color="purple">
        <p>El portal tiene un asistente virtual inteligente que podés usar para consultas rápidas. Lo encontrás en el <strong>botón brillante</strong> ✨ abajo a la derecha de la pantalla.</p>
        <p className="font-medium mt-1">¿Qué puede hacer?</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Responderte dudas sobre <strong>vacaciones, licencias, contratos, políticas de RRHH</strong>.</li>
          <li>Decirte <strong>qué hay en el calendario</strong>: feriados, jornadas, eventos del mes.</li>
          <li>Decirte <strong>cuándo cumple años</strong> alguien del equipo 🎂.</li>
          <li>Explicarte <strong>cómo usar el portal</strong> paso a paso.</li>
          <li>Generar <strong>botones de navegación</strong> directa a cualquier sección.</li>
        </ul>
        <p className="font-medium mt-1">Lo que <em>no</em> hace:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>No accede a tus recibos, solicitudes ni datos de otros empleados — solo cumpleaños y eventos del calendario.</li>
          <li>No puede realizar acciones: solo informa y orienta.</li>
        </ul>
        <Note type="tip">Podés usar los botones de sugerencia rápida o escribir cualquier pregunta en el chat. La IA conoce el contexto del portal y responde en español.</Note>
      </Section>

      <Section icon={Bell} number={11} title="Notificaciones">
        <p>La campana 🔔 arriba a la derecha muestra avisos en tiempo real:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Nueva novedad o comunicado publicado.</li>
          <li>Solicitud aprobada o rechazada.</li>
          <li>Recibo de sueldo nuevo.</li>
          <li>Respuesta a un ticket de soporte.</li>
        </ul>
        <p>Tocá una notificación para ir directo a la sección correspondiente. Podés marcar todas como leídas con un clic.</p>
      </Section>

      <section className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-5 border border-emerald-100 dark:border-emerald-800">
        <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Consejos útiles
        </h2>
        <ul className="list-disc pl-6 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
          <li><strong>Modo claro / oscuro:</strong> el ☀️/🌙 arriba a la derecha cambia el tema.</li>
          <li><strong>Mobile:</strong> el portal funciona en el celular — tocá el ícono ☰ para el menú.</li>
          <li><strong>Privacidad:</strong> cada empleado ve solo sus propios datos. Recibos y solicitudes son privados.</li>
          <li><strong>Sesión activa:</strong> si vas a usar una PC compartida, cerrá sesión cuando termines.</li>
        </ul>
      </section>

      <Section icon={Mail} title="¿Necesitás ayuda?">
        <p>Comunicate con el área de Recursos Humanos:</p>
        <div className="mt-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
          <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> rrhhfundacionnqnoeste@gmail.com</p>
        </div>
      </Section>
    </div>
  )
}

/* ─────────────────────────────────────────────────────── */
/* GUÍA COMUNICACIONES                                     */
/* ─────────────────────────────────────────────────────── */
function GuiaComunicaciones() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">📣 Rol de Comunicaciones</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Como integrante del equipo de Comunicaciones tenés acceso para <strong>publicar y gestionar novedades</strong>
          {' '}y <strong>administrar el calendario de eventos</strong>. Todo lo que publiques es visible para todos los empleados del portal.
        </p>
      </section>

      <Section icon={Megaphone} number={1} title="Publicar una novedad" color="purple">
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Entrá a <strong>Comunicaciones</strong> → botón <strong>"Publicar novedad"</strong> (arriba a la derecha).</li>
          <li>Completá el <strong>título</strong> (requerido).</li>
          <li>Elegí la <strong>categoría</strong> según el tipo de contenido (ver tabla abajo).</li>
          <li>Escribí el <strong>contenido</strong> completo del comunicado.</li>
          <li>Opcionalmente subí una <strong>imagen o GIF</strong> (hasta 15 MB).</li>
          <li>Opcionalmente adjuntá un <strong>archivo</strong> (PDF, Word, Excel, hasta 15 MB).</li>
          <li>Si es urgente o crítico, tildá <strong>"Marcar como importante"</strong> — aparecerá con 📌 rojo destacado.</li>
          <li>Si querés notificar al equipo de RRHH por email, tildá <strong>"Notificar por email"</strong>.</li>
          <li>Hacé clic en <strong>"Publicar"</strong>.</li>
        </ol>
        <Note type="tip">Las imágenes y archivos se suben a Supabase Storage — no se guardan en el servidor local.</Note>
      </Section>

      <Section icon={Pin} number={2} title="Categorías de novedades" color="purple">
        <p>Elegí la categoría que mejor describe el contenido:</p>
        <div className="mt-2 space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {[
            ['📣 Comunicado', 'Avisos formales e institucionales de RRHH.'],
            ['📰 Novedad', 'Noticias generales del equipo o la fundación.'],
            ['🚨 Alerta', 'Urgente o requiere acción inmediata.'],
            ['📅 Evento', 'Evento puntual sin fecha fija en el calendario.'],
            ['🎂 Cumpleaños', 'Saludos y festejos del equipo.'],
            ['🇦🇷 Feriado', 'Feriado nacional — aparece en Eventos y en el filtro.'],
            ['🏫 Jornada Institucional', 'Jornadas obligatorias de la fundación.'],
            ['🎭 Acto Escolar', 'Actos patrióticos y conmemorativos.'],
            ['📚 Capacitación', 'Formación y cursos del personal.'],
            ['📆 Reunión', 'Reuniones de equipo o departamento.'],
          ].map(([cat, desc]) => (
            <div key={cat} className="flex gap-3 px-4 py-2 text-sm odd:bg-slate-50/50 dark:odd:bg-slate-800/30">
              <span className="font-medium w-44 shrink-0">{cat}</span>
              <span className="text-slate-500 dark:text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
        <Note type="info">
          Las categorías de tipo evento (Feriado, Jornada, Acto, etc.) también aparecen en el filtro de Comunicaciones y <strong>muestran automáticamente los eventos del calendario</strong> que coincidan con ese tipo.
        </Note>
      </Section>

      <Section icon={Edit2} number={3} title="Editar y eliminar novedades" color="purple">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>En la lista de Comunicaciones, cada novedad tiene botones <strong>✏️ Editar</strong> y <strong>🗑️ Eliminar</strong> (solo visibles para admins y comunicaciones).</li>
          <li>Al editar, podés cambiar el título, contenido, categoría, imagen y adjunto.</li>
          <li>Al eliminar, la novedad desaparece para todos — no hay papelera ni recuperación.</li>
        </ul>
        <Note type="danger">La eliminación es permanente. Si borraste algo por error, hay que volver a publicarlo.</Note>
      </Section>

      <Section icon={Calendar} number={4} title="Gestionar el calendario de eventos" color="purple">
        <p>Accedé a <strong>Eventos y Cumpleaños</strong> para crear, editar y eliminar eventos:</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Hacé clic en el botón <strong>"+ Nuevo evento"</strong> o directamente en un <strong>día del calendario</strong>.</li>
          <li>Completá el <strong>título</strong>, elegí el <strong>tipo</strong> (feriado, jornada, acto, etc.) y la <strong>fecha</strong>.</li>
          <li>Opcionalmente agregá una descripción, imagen o archivo adjunto.</li>
          <li>Guardá — el evento aparece en el calendario y también en Comunicaciones cuando se filtra por ese tipo.</li>
        </ol>
        <p>Para <strong>editar o eliminar</strong> un evento: hacé clic en el evento en el calendario → botones Editar / Eliminar en el detalle.</p>
        <Note type="tip">
          Los feriados y jornadas ya cargados (2026) están precargados en el sistema. Podés editarlos o agregar nuevos.
        </Note>
      </Section>

      <Section icon={Calendar} number={5} title="Sincronización Comunicaciones ↔ Eventos" color="purple">
        <p>El portal sincroniza automáticamente los eventos del calendario con la sección Comunicaciones:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Cuando un empleado filtra por <strong>"Jornada Institucional"</strong> en Comunicaciones, ve las jornadas que cargaste en el calendario.</li>
          <li>Lo mismo para Feriados, Actos, Capacitaciones, Reuniones, etc.</li>
          <li>Los eventos del calendario aparecen con un badge <strong>"Del calendario"</strong> y borde lila para distinguirlos de las novedades escritas.</li>
          <li>No necesitás duplicar: si cargaste una jornada en Eventos, <strong>ya aparece</strong> en Comunicaciones automáticamente.</li>
        </ul>
      </Section>

      <Section icon={Sparkles} number={6} title="La IA conoce tus eventos" color="purple">
        <p>El asistente de IA del portal lee en tiempo real los eventos del calendario. Esto significa que:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Si cargás una jornada nueva, la IA ya puede responder sobre ella en el chat.</li>
          <li>Si un empleado pregunta "¿qué pasa este mes?", la IA responde con los eventos reales que vos cargaste.</li>
          <li>La IA también sabe los cumpleaños del equipo (solo día y mes, sin año).</li>
        </ul>
      </Section>
    </div>
  )
}

/* ─────────────────────────────────────────────────────── */
/* GUÍA ADMINISTRADOR                                      */
/* ─────────────────────────────────────────────────────── */
function GuiaAdmin() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">🔐 Rol de Administrador</h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Como administrador tenés acceso completo al portal: gestión de empleados, recibos, solicitudes,
          estadísticas, roles y configuración. Esta guía está pensada para que cualquier persona pueda
          administrar el portal sin necesitar asistencia externa.
        </p>
        <Note type="danger">
          Manejás datos personales y laborales sensibles. Nunca compartás información de empleados fuera del portal. Cerrá siempre la sesión en PC compartidas.
        </Note>
      </section>

      <Section icon={Users} number={1} title="Gestión de empleados" color="orange">
        <p className="font-medium">Agregar un empleado nuevo:</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Entrá a <strong>Empleados</strong> → botón <strong>"+ Nuevo empleado"</strong>.</li>
          <li>Completá los campos requeridos: nombre, apellido, DNI, email, sector, cargo, tipo de contrato, jornada y fecha de ingreso.</li>
          <li>Opcionales: foto, foto de portada, teléfono, dirección, fecha de nacimiento, CBU/banco, contacto de emergencia, cargos adicionales, supervisor.</li>
          <li>Guardá — el empleado queda registrado en el sistema.</li>
        </ol>
        <Note type="info">El email que cargues aquí es el que el empleado usará para registrarse en el portal. Si no coincide, no podrá ser aprobado.</Note>

        <p className="font-medium mt-3">Editar datos de un empleado:</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>En la lista de <strong>Empleados</strong>, hacé clic en la tarjeta del empleado.</li>
          <li>Usá el botón <strong>"Editar"</strong> (ícono de lápiz) para modificar cualquier campo.</li>
          <li>Guardá los cambios.</li>
        </ol>

        <p className="font-medium mt-3">Cambiar estado:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>Activo</strong> → trabajando normalmente.</li>
          <li><strong>Licencia</strong> → de licencia médica u otra.</li>
          <li><strong>Vacaciones</strong> → de vacaciones.</li>
          <li><strong>Inactivo</strong> → desvinculado (se gestiona con el proceso de desvinculación).</li>
        </ul>
      </Section>

      <Section icon={UserCheck} number={2} title="Aprobar registros pendientes" color="orange">
        <p>Cuando un empleado se registra en el portal, la solicitud queda en cola para tu aprobación:</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Buscá el aviso en la <strong>campana 🔔</strong> o en el panel de <strong>Empleados</strong> (sección "Accesos pendientes").</li>
          <li>Verificá que el <strong>email y los datos coincidan</strong> con el empleado real en el sistema.</li>
          <li>Hacé clic en <strong>"Aprobar"</strong> para darle acceso o <strong>"Rechazar"</strong> si los datos no coinciden.</li>
          <li>El empleado recibirá un email automático con el resultado.</li>
        </ol>
        <Note type="warn">Verificá siempre que el email registrado coincida con el del empleado en el sistema antes de aprobar. Si no coincide, rechazá y pedile que se vuelva a registrar con el email correcto.</Note>
      </Section>

      <Section icon={Shield} number={3} title="Gestión de roles y permisos" color="orange">
        <p>Existen tres roles en el portal:</p>
        <div className="space-y-2 mt-1">
          {[
            ['👤 Empleado', 'Acceso básico: ver sus propios recibos, solicitudes, calendario y comunicaciones.'],
            ['📣 Comunicaciones', 'Todo lo del empleado + publicar/editar novedades y gestionar eventos.'],
            ['🔐 Administrador', 'Acceso completo: empleados, recibos, solicitudes, estadísticas, roles y todo lo de comunicaciones.'],
          ].map(([rol, desc]) => (
            <div key={rol} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-2.5 text-sm">
              <span className="font-semibold">{rol}:</span> <span className="text-slate-500 dark:text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-2">Para cambiar el rol de un empleado:</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Entrá a <strong>Empleados</strong> → clic en el empleado.</li>
          <li>Buscá la sección de <strong>Rol / Acceso</strong> y seleccioná el nuevo rol.</li>
          <li>El cambio es inmediato — el empleado verá el nuevo contenido en su próximo ingreso.</li>
        </ol>
        <Note type="warn">Asigná el rol de administrador solo a personas de confianza. Un admin puede ver y modificar todos los datos del portal.</Note>
      </Section>

      <Section icon={Upload} number={4} title="Cargar recibos de sueldo" color="orange">
        <p className="font-medium">Carga individual:</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Entrá a <strong>Recibos de Sueldo</strong>.</li>
          <li>Seleccioná el empleado, el mes, el año y el tipo de recibo (mensual / SAC / otro).</li>
          <li>Subí el archivo PDF del recibo.</li>
          <li>Opcionalmente indicá el monto.</li>
          <li>Guardá — el empleado recibe una notificación automática.</li>
        </ol>
        <p className="font-medium mt-3">Carga masiva:</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Preparar los PDFs con el nombre en formato <strong>DNI.pdf</strong> (ej: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">12345678.pdf</code>).</li>
          <li>Usá la opción de <strong>carga masiva</strong> en la sección Recibos.</li>
          <li>El sistema asocia cada PDF al empleado por DNI automáticamente.</li>
        </ol>
        <Note type="tip">Cuando subís un recibo, el empleado recibe un aviso en el portal y por email. Si el empleado tiene configurada la firma digital, puede firmar desde el portal.</Note>
      </Section>

      <Section icon={ClipboardList} number={5} title="Gestionar solicitudes" color="orange">
        <p>Todas las solicitudes de todos los empleados llegan a tu bandeja:</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Entrá a <strong>Solicitudes y Pedidos</strong>.</li>
          <li>Ves el listado completo con filtros por estado (pendiente, aprobada, rechazada) y por tipo.</li>
          <li>Hacé clic en una solicitud para ver el detalle.</li>
          <li>Usá <strong>"Aprobar"</strong> o <strong>"Rechazar"</strong> — podés agregar un comentario con la resolución.</li>
          <li>El empleado recibe una notificación automática con el resultado y el comentario.</li>
        </ol>
        <Note type="info">Los tickets de soporte (certificados, consultas, reclamos) se gestionan desde la misma sección — respondé con el resultado y cambiá el estado a "resuelto".</Note>
      </Section>

      <Section icon={UserMinus} number={6} title="Desvinculación de un empleado" color="red">
        <p>Cuando un empleado deja la fundación:</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>Entrá a <strong>Empleados</strong> → clic en el empleado.</li>
          <li>Usá el botón <strong>"Desvincular"</strong>.</li>
          <li>Completá el formulario de desvinculación:
            <ul className="list-disc pl-6 mt-1 space-y-1">
              <li><strong>Fecha efectiva</strong> de desvinculación.</li>
              <li><strong>Motivo</strong>: renuncia voluntaria, despido sin causa, despido con causa, jubilación, vencimiento de contrato, acuerdo mutuo, fallecimiento u otro.</li>
              <li><strong>Telegrama entregado</strong>: sí/no y fecha si corresponde.</li>
              <li><strong>Preaviso</strong>: cumplido / no cumplido / no aplica.</li>
              <li><strong>Liquidación final</strong>: pendiente o entregada.</li>
              <li>Observaciones adicionales.</li>
            </ul>
          </li>
          <li>Confirmá — el empleado pasa a estado <strong>"Inactivo"</strong>.</li>
        </ol>
        <Note type="info">Los datos del empleado se preservan aunque esté inactivo. Podés consultar el historial de desvinculaciones en cualquier momento.</Note>

        <p className="font-medium mt-3">Reactivar un empleado (si vuelve a trabajar):</p>
        <ol className="list-decimal pl-6 space-y-1.5">
          <li>En la lista de Empleados, filtrá por <strong>estado: Inactivo</strong>.</li>
          <li>Hacé clic en el empleado y usá <strong>"Reactivar"</strong>.</li>
          <li>El historial de desvinculaciones previas queda guardado pero el empleado vuelve a estar activo.</li>
        </ol>
      </Section>

      <Section icon={BarChart2} number={7} title="Estadísticas" color="orange">
        <p>La sección de Estadísticas muestra gráficos y datos del personal en tiempo real:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Distribución por <strong>sector, cargo y tipo de contrato</strong>.</li>
          <li>Empleados <strong>activos vs inactivos</strong>.</li>
          <li>Tendencia de <strong>ingresos y egresos</strong>.</li>
          <li>Solicitudes por tipo y estado.</li>
        </ul>
        <p>Podés <strong>exportar</strong> los datos desde los botones de descarga en cada sección.</p>
      </Section>

      <Section icon={Lock} number={8} title="Privacidad y seguridad" color="red">
        <ul className="list-disc pl-6 space-y-2">
          <li>Nunca compartas con empleados información de otros: salarios, recibos, estado contractual, datos personales.</li>
          <li>El asistente de IA está configurado para <strong>no revelar datos privados</strong> — pero si alguien te pregunta por datos sensibles, es tu responsabilidad no compartirlos.</li>
          <li>Si necesitás revocar el acceso de alguien urgente, cambiá su rol a <strong>"Empleado"</strong> o desvinculalo desde el portal.</li>
          <li>Las contraseñas son hasheadas en Supabase — nunca se almacenan en texto plano.</li>
          <li>Ante cualquier sospecha de acceso no autorizado, comunicate con el responsable técnico del portal.</li>
        </ul>
      </Section>

      <Section icon={Settings} number={9} title="Referencia rápida: ¿dónde está cada cosa?" color="orange">
        <div className="space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-sm">
          {[
            ['Agregar empleado nuevo', 'Empleados → + Nuevo empleado'],
            ['Aprobar registro de usuario', 'Campana 🔔 → Accesos pendientes'],
            ['Cambiar rol', 'Empleados → clic en empleado → Rol/Acceso'],
            ['Cargar recibo individual', 'Recibos → Cargar recibo'],
            ['Aprobar/rechazar solicitud', 'Solicitudes y Pedidos → filtrar Pendientes'],
            ['Desvincular empleado', 'Empleados → clic en empleado → Desvincular'],
            ['Reactivar empleado', 'Empleados → filtrar Inactivos → Reactivar'],
            ['Ver estadísticas', 'Estadísticas (menú lateral)'],
            ['Publicar novedad', 'Comunicaciones → Publicar novedad'],
            ['Crear evento en calendario', 'Eventos y Cumpleaños → + Nuevo evento'],
            ['Responder ticket de soporte', 'Solicitudes y Pedidos → tickets'],
          ].map(([accion, donde]) => (
            <div key={accion} className="flex gap-3 px-4 py-2.5 odd:bg-slate-50/50 dark:odd:bg-slate-800/30">
              <span className="font-medium w-52 shrink-0 text-slate-700 dark:text-slate-200">{accion}</span>
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />{donde}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}

/* ─────────────────────────────────────────────────────── */
/* PÁGINA PRINCIPAL                                        */
/* ─────────────────────────────────────────────────────── */
export default function InstructivoPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isComms = user?.role === 'comunicaciones' || user?.role === 'admin'

  const [activeTab, setActiveTab] = useState<GuideTab>('empleados')

  const tabs: { id: GuideTab; label: string; icon: React.ElementType; color: string }[] = ([
    { id: 'empleados'      as GuideTab, label: 'Para Empleados',       icon: User,      color: 'brand'  },
    { id: 'comunicaciones' as GuideTab, label: 'Para Comunicaciones',  icon: Megaphone, color: 'purple' },
    { id: 'admin'          as GuideTab, label: 'Para Administradores', icon: Shield,    color: 'orange' },
  ] as const).filter(t =>
    t.id === 'empleados' ? true :
    t.id === 'comunicaciones' ? isComms :
    isAdmin
  )

  const tabColorActive: Record<GuideTab, string> = {
    empleados:      'bg-brand-600 text-white',
    comunicaciones: 'bg-purple-600 text-white',
    admin:          'bg-orange-600 text-white',
  }
  const tabColorInactive = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'

  const tabTitles: Record<GuideTab, string> = {
    empleados:      'Instructivo de Uso — Empleados',
    comunicaciones: 'Instructivo de Uso — Comunicaciones',
    admin:          'Instructivo de Uso — Administradores',
  }

  return (
    <div className="page-container max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            Instructivo de Uso
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Guía para usar el Portal RRHH — Fundación Neuquén Oeste
          </p>
        </div>
        <button onClick={() => window.print()} className="btn-primary">
          <Printer className="w-4 h-4" /> Imprimir / Guardar PDF
        </button>
      </div>

      {/* Encabezado de impresión */}
      <div className="hidden print:block">
        <h1 className="text-3xl font-bold mb-1">Portal RRHH — Fundación Neuquén Oeste</h1>
        <p className="text-lg text-slate-600">{tabTitles[activeTab]}</p>
        <hr className="my-4 border-slate-300" />
      </div>

      {/* Tabs de rol (solo si hay más de una pestaña disponible) */}
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2 print:hidden">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                  isActive ? tabColorActive[tab.id] : tabColorInactive
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Contenido */}
      <div className="card p-6 sm:p-8 print:p-0 print:shadow-none print:border-0">
        {activeTab === 'empleados'      && <GuiaEmpleados />}
        {activeTab === 'comunicaciones' && <GuiaComunicaciones />}
        {activeTab === 'admin'          && <GuiaAdmin />}

        <div className="border-t border-slate-200 dark:border-slate-700 mt-8 pt-4 text-xs text-slate-400 text-center print:text-slate-500">
          Portal RRHH · Fundación Neuquén Oeste · {tabTitles[activeTab]}
        </div>
      </div>
    </div>
  )
}
