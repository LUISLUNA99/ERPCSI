# BITACORA - Sprint 1 - ERP CSI

## Fecha inicio: 2026-06-16
## Fecha fin: 2026-06-17
## Objetivo: Setup inicial, autenticacion, proteccion de rutas, catalogos y gestion de usuarios
## Estado: COMPLETADO

---

## Historias de usuario cubiertas

| HU | Titulo | Estado |
|----|--------|--------|
| HU-001 | Login de usuario | COMPLETADO |
| HU-002 | Proteccion de rutas por rol | COMPLETADO |
| HU-003 | Gestion de usuarios (Admin) | COMPLETADO |
| HU-004 | Catalogo de empresas | COMPLETADO |
| HU-005 | Catalogo de centros de costo/proyectos | COMPLETADO |
| HU-006 | Catalogo de proveedores | COMPLETADO |
| HU-007 | Catalogo de clasificaciones de gasto | COMPLETADO |
| HU-008 | Catalogo de bancos por empresa | COMPLETADO |

---

## Detalle de tareas

### 1. Setup del proyecto Next.js 14
- **Estado:** COMPLETADO
- Proyecto creado con App Router, TypeScript estricto, Tailwind CSS
- Estructura de carpetas segun CLAUDE.md
- Tailwind configurado con paleta institucional (#1B3A6B, #2563EB)
- shadcn/ui con CSS variables + colores institucionales

### 2. Dependencias instaladas
- **Estado:** COMPLETADO
- `@supabase/supabase-js` + `@supabase/ssr`, `zod`, `resend`, `lucide-react`
- shadcn/ui: button, input, label, card, toast, sonner, separator, dropdown-menu, badge, dialog, select, textarea, table, sheet, avatar, tooltip

### 3. Base de datos Supabase
- **Estado:** COMPLETADO
- Schema SQL ejecutado exitosamente (schema.sql)
- Todas las tablas creadas: empresas, clientes, proyectos, proveedores, clasificaciones_gasto, bancos_empresa, perfiles, requisiciones, aprobaciones, pagos, facturas, alertas_factura, notificaciones, historial_requisiciones, estados_cuenta, movimientos_bancarios, cfdi_sat
- ENUMs creados: estatus_requisicion, rol_usuario, nivel_alerta, tipo_cfdi, moneda
- Indices, triggers (updated_at), RLS policies
- Datos seed: 3 empresas (Buzzword, INOVITZ, DCM) + 8 clasificaciones de gasto
- Usuario admin creado: admin@grupocsi.com / AdminCSI2026!

### 4. Configuracion de Supabase
- **Estado:** COMPLETADO
- `src/lib/supabase/client.ts` - Cliente browser
- `src/lib/supabase/server.ts` - Cliente server + service client
- `src/lib/supabase/middleware.ts` - Cliente middleware
- `src/app/auth/callback/route.ts` - Callback OAuth

### 5. Middleware de proteccion de rutas por rol
- **Estado:** COMPLETADO
- `src/middleware.ts` - Verifica sesion + perfil activo + permisos por rol
- Mapa de rutas: dashboard(todos), requisiciones(todos/operario+crear), aprobaciones(admin,director), pagos(admin,tesorero), facturas(admin,tesorero,operario), admin(admin), reportes(admin,director,tesorero,visualizador)

### 6. Pagina de Login
- **Estado:** COMPLETADO
- Diseno institucional con fondo degradado azul marino
- Formulario con validacion, toggle contrasena, loader, errores en espanol

### 7. Layout Dashboard con Sidebar
- **Estado:** COMPLETADO
- `src/app/(dashboard)/layout.tsx` - Layout con sidebar + toaster
- `src/components/Sidebar.tsx` - Navegacion por rol, responsive (mobile hamburger + desktop fijo)
- `src/lib/navigation.ts` - Definicion de menu por rol con submenu para Admin
- Submenu admin: Empresas, Proyectos, Proveedores, Clasificaciones, Bancos, Usuarios
- Footer con nombre/rol del usuario + boton cerrar sesion

### 8. Dashboard KPIs
- **Estado:** COMPLETADO
- Server Component con conteos de requisiciones por estatus
- 4 tarjetas KPI: total, por aprobar, por pagar, alertas activas

### 9. CRUD Empresas (HU-004)
- **Estado:** COMPLETADO
- Server action: `src/app/actions/empresas.actions.ts`
- Pagina: `src/app/(dashboard)/admin/catalogos/empresas/`
- Funcionalidad: listar, crear, editar, activar/desactivar
- Validacion con Zod, manejo de duplicados

### 10. CRUD Proveedores (HU-006)
- **Estado:** COMPLETADO
- Server action: `src/app/actions/proveedores.actions.ts`
- Pagina: `src/app/(dashboard)/admin/catalogos/proveedores/`
- Funcionalidad: listar, crear, editar, activar/desactivar, busqueda por nombre/RFC

### 11. CRUD Clasificaciones de gasto (HU-007)
- **Estado:** COMPLETADO
- Server action: `src/app/actions/clasificaciones.actions.ts`
- Pagina: `src/app/(dashboard)/admin/catalogos/clasificaciones/`
- Funcionalidad: listar, crear, editar, activar/desactivar

### 12. CRUD Bancos por empresa (HU-008)
- **Estado:** COMPLETADO
- Server action: `src/app/actions/bancos.actions.ts`
- Pagina: `src/app/(dashboard)/admin/catalogos/bancos/`
- Funcionalidad: listar, crear, editar, activar/desactivar
- Select de empresa, banco (Santander, BBVA, HSBC, Banregio, etc), moneda (MXN/USD/EUR)

### 13. CRUD Proyectos y Centros de Costo (HU-005)
- **Estado:** COMPLETADO
- Server action: `src/app/actions/proyectos.actions.ts`
- Pagina: `src/app/(dashboard)/admin/catalogos/proyectos/`
- Funcionalidad: listar, crear, editar, activar/desactivar, busqueda
- Creacion de clientes inline desde el dialogo de proyecto
- Validacion de formato CC: XX-XX-XX

### 14. Gestion de Usuarios (HU-003)
- **Estado:** COMPLETADO
- Server action: `src/app/actions/usuarios.actions.ts`
- Pagina: `src/app/(dashboard)/admin/usuarios/`
- Funcionalidad: listar, crear (con auth), editar rol/empresa, activar/desactivar
- Filtro por rol
- Creacion usa service_role para crear usuario en auth + perfil

---

## Resultado del build final

```
Build: EXITOSO (2026-06-17)

Rutas:
  / (estatica, redirige a /login)
  /login (estatica, 5.15 kB)
  /sin-permisos (estatica, 2.7 kB)
  /dashboard (dinamica, KPIs)
  /auth/callback (API route)
  /admin/catalogos/empresas (dinamica, 3.44 kB)
  /admin/catalogos/clasificaciones (dinamica, 3.44 kB)
  /admin/catalogos/proveedores (dinamica, 3.84 kB)
  /admin/catalogos/proyectos (dinamica, 5.05 kB)
  /admin/catalogos/bancos (dinamica, 4.44 kB)
  /admin/usuarios (dinamica, 4.68 kB)

Middleware: 83.3 kB
```

---

## Componentes reutilizables creados

| Componente | Archivo | Uso |
|-----------|---------|-----|
| Sidebar | `src/components/Sidebar.tsx` | Navegacion principal por rol |
| PageHeader | `src/components/PageHeader.tsx` | Titulo + boton de accion |
| StatusBadge | `src/components/StatusBadge.tsx` | Badge activo/inactivo |
| EstatusBadge | `src/components/StatusBadge.tsx` | Badge de estatus de requisicion |

---

## Credenciales de prueba

- **Admin**: admin@grupocsi.com / AdminCSI2026!
- **Supabase**: ehonqmjvmqdesuqpjyoe (ver .env.local)

---

## Problemas encontrados y resueltos

1. **Keys de Supabase en formato no-JWT**: Las API keys proporcionadas (sb_publishable_... y sb_secret_...) no son JWT estandar. La API REST de Supabase las rechaza. Se pudo crear el usuario admin via SQL directo. **PENDIENTE: obtener las keys JWT correctas del dashboard de Supabase (Settings > API > Project API keys).**

2. **Tailwind border-border error**: El CSS de shadcn usa `@apply border-border` que requiere la variable CSS correspondiente en tailwind.config. Se resolvio agregando los colores CSS variables de shadcn al theme.

---

## NOTA PRE-PRODUCCION

- [ ] CAMBIAR TODAS LAS CONTRASEÑAS antes de produccion (DB password, API keys, service role key)
- [ ] Obtener las JWT API keys correctas de Supabase (Settings > API)
- [ ] Rotar credenciales de Supabase
- [ ] Verificar que .env.local NO este en el repositorio
- [ ] Cambiar contrasena del usuario admin

---

## Siguiente: Sprint 2

Segun BACKLOG.md:
- HU-009: Crear nueva requisicion (pantalla operario)
- HU-010: Ver mis requisiciones
- HU-013: Ver cola de aprobaciones (director)
- HU-014: Aprobar requisicion
- HU-015: Rechazar requisicion
