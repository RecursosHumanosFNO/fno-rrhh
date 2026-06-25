# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Portal de Recursos Humanos de la Fundación Neuquén Oeste (FNO). Sistema interno para gestión de empleados, solicitudes, recibos de sueldo, comunicaciones, tickets y eventos institucionales.

## Commands

```bash
npm run dev       # Development server at http://localhost:3000
npm run build     # Production build (runs TypeScript check + Next.js build)
npm run lint      # ESLint check
```

No test suite configured. Verify changes via `npm run build` (catches TypeScript errors).

## Architecture

### Provider Hierarchy

Root layout wraps children in this order:
```
ThemeProvider → DataProvider → AuthProvider → children
```
Order matters: DataContext must exist before AuthContext (auth reads/writes employee data).

### Auth Flow

1. `supabase.auth.signInWithPassword()` authenticates user
2. `AuthContext` loads profile from `fno_users` (role) + `fno_empleados` (employee data)
3. `onAuthStateChange` watches for session changes and keeps state in sync
4. Inactive employees (`estado === 'inactivo'`) are signed out immediately after login check

Three roles: `'admin' | 'employee' | 'comunicaciones'`

### State Management

`DataContext` holds all entity arrays (empleados, solicitudes, recibos, novedades, eventos, tickets, etc.) and exposes CRUD methods.

**Sync strategy:**
- Full sync on mount, tab focus, and every 10 minutes
- Supabase Realtime subscriptions for incremental updates (postgres_changes per table)
- Optimistic updates: local state is updated immediately, Supabase syncs async

**Mappers**: All DB ↔ TypeScript conversions handle snake_case ↔ camelCase. Look for `mapEmpleadoFromSupabase` / `mapEmpleadoToSupabase` patterns in `DataContext.tsx`. Always go through these mappers when adding new fields.

### API Routes (`/src/app/api/`)

All routes use Node.js runtime and the Supabase **service role key** (never expose to client).

| Route | Purpose |
|---|---|
| `POST /api/admin/create-auth-user` | Creates Supabase Auth user + fno_users record |
| `POST /api/admin/set-role` | Updates user role |
| `POST /api/admin/set-email` | Updates email in Auth + DB |
| `POST /api/admin/delete-user` | Deletes from Auth + DB |
| `POST/PUT/GET /api/reset-password` | Token-based password reset flow |
| `POST /api/notify` | Email dispatch via Gmail/nodemailer (13+ email types) |
| `POST /api/chat` | AI assistant (Google Gemini) |
| `GET /api/recibo-url` | Supabase Storage signed URL for receipt downloads |
| `GET /api/keepalive` | Pings Supabase to prevent idle timeout |
| `GET /api/cron/cumpleanos` | Vercel cron — birthday notifications |

Admin routes verify the requester's role by looking up `fno_users` with their `auth_id` before acting.

### Database Tables (Supabase/PostgreSQL)

RLS is enabled on all tables. Service role key bypasses RLS (server-side only).

| Table | Purpose |
|---|---|
| `fno_users` | Auth link (auth_id → empleado_id, role) |
| `fno_empleados` | Employee profiles |
| `fno_solicitudes` | Requests (vacation, medical leave, etc.) |
| `fno_recibos` | Payroll receipt metadata + storage URLs |
| `fno_recibo_firmas` | Receipt signature audit trail |
| `fno_novedades` | News/communications |
| `fno_eventos` | Calendar events (DB = custom; code = fixed holidays in `mockData.ts`) |
| `fno_tickets` | RRHH portal requests |
| `fno_notifs` | In-app notifications |
| `fno_pending` | Pending registration queue |
| `fno_registros_novedad` | Internal event log (admin-only) |
| `fno_password_resets` | Temporary reset tokens (30-min expiry) |

### Email System

All emails go through `POST /api/notify`. Email failures are non-fatal — the API returns 200 and the operation continues. Gmail credentials: `GMAIL_USER` + `GMAIL_PASS` (app password).

### Key Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server-side API routes only
NEXT_PUBLIC_PORTAL_URL=             # Used in email templates
GMAIL_USER=
GMAIL_PASS=
NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY=
```

`NEXT_PUBLIC_` prefix = safe for client bundle. Never add `SUPABASE_SERVICE_ROLE_KEY` or `GMAIL_PASS` to client code.

### Fixed vs Dynamic Data

- **Fixed events** (holidays, school calendar): hardcoded in `src/lib/mockData.ts`
- **Custom events**: stored in `fno_eventos`
- Both are merged in the UI calendar view

### Soft Delete Pattern

Employees are never hard-deleted. They are marked `estado: 'inactivo'` (desactivar) or `estado: 'activo'` (reactivar). Hard delete is only available for incomplete registrations (`fno_pending`) or full account removal by admin.

### Adding New Fields to fno_empleados

1. Add TypeScript type in `src/types/index.ts`
2. Add mapper in both directions in `DataContext.tsx` (`mapEmpleadoFromSupabase` + `mapEmpleadoToSupabase`)
3. Add API backwards-compat fallback if the Supabase column may not exist yet (pattern already used in `create-auth-user`)
4. Run migration in Supabase dashboard

### Dark Mode

Implemented via `ThemeProvider` + Tailwind `dark:` utilities. No CSS variables — use `dark:` class variants directly.
