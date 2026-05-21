# Portal RRHH — Fundación Neuquén Oeste

Sistema de Gestión de Recursos Humanos desarrollado con Next.js 14, TypeScript y TailwindCSS.

## Credenciales de acceso (demo)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador RRHH | admin@fno.org.ar | admin123 |
| Empleada (Dir. Escuela) | mgonzalez@fno.org.ar | empleado123 |
| Empleado (T. Social) | jperez@fno.org.ar | empleado123 |
| Empleada (Contadora) | arodriguez@fno.org.ar | empleado123 |

## Módulos incluidos

- **Dashboard** — Panel principal adaptado por rol (admin/empleado)
- **Empleados** — Gestión completa: lista, filtros, detalle, historial
- **Recibos de Sueldo** — Subir (admin) y descargar (empleado) PDFs
- **Solicitudes** — Permisos, vacaciones, licencias con aprobación/rechazo
- **Comunicaciones** — Novedades institucionales, calendario de eventos
- **Estadísticas** — Gráficos y métricas RRHH (solo admin)
- **Portal RRHH** — Sistema de tickets y pedidos
- **Mi Perfil** — Datos personales, cambio de contraseña, notificaciones

## Tecnologías

- **Frontend:** Next.js 14 (App Router), TypeScript, TailwindCSS
- **Gráficos:** Recharts
- **Iconos:** Lucide React
- **Auth:** React Context + localStorage (demo)
- **Modo oscuro:** Tailwind `dark:` + toggle manual

## Inicio rápido

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Deploy en Vercel

```bash
npm install -g vercel
vercel --prod
```

## Estructura de carpetas

```
src/
├── app/
│   ├── login/          — Página de login
│   └── dashboard/      — Todas las rutas autenticadas
│       ├── page.tsx    — Dashboard principal
│       ├── empleados/  — Gestión de empleados
│       ├── recibos/    — Recibos de sueldo
│       ├── solicitudes/— Sistema de solicitudes
│       ├── comunicaciones/ — Novedades y calendario
│       ├── estadisticas/   — Métricas (admin)
│       ├── perfil/     — Perfil del usuario
│       └── portal-rrhh/— Sistema de tickets
├── components/
│   ├── layout/         — Sidebar y Header
│   └── ThemeProvider   — Manejo dark/light mode
├── contexts/
│   └── AuthContext     — Autenticación con roles
├── lib/
│   ├── mockData.ts     — Datos de ejemplo
│   └── utils.ts        — Helpers y formatos
└── types/
    └── index.ts        — Interfaces TypeScript
```

## Para producción

Para conectar a una base de datos real (PostgreSQL), reemplazar `src/lib/mockData.ts` por llamadas a la API con Prisma ORM o similar. El esquema relacional ya está implícito en los tipos de `src/types/index.ts`.
