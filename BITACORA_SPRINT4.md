# BITACORA - Sprint 4 - ERP CSI

## Fecha inicio: 2026-06-17
## Fecha fin: EN CURSO
## Objetivo: Notificaciones in-app, alertas de factura, dashboard mejorado, componentes reutilizables, exportacion
## Estado: EN PROGRESO

---

## Historias de usuario cubiertas

| HU | Titulo | Estado |
|----|--------|--------|
| HU-019 | Centro de notificaciones in-app | COMPLETADO |
| HU-020 | Alertas de factura vencida (cron job) | PENDIENTE |
| HU-022 | Notificaciones por email (Resend) | PENDIENTE |
| HU-023 | Dashboard CxP mejorado | PARCIAL |
| HU-024 | Vista global de requisiciones | COMPLETADO |
| HU-025 | Exportar Excel | EN PROGRESO |

---

## Detalle de tareas

### 1. Centro de notificaciones in-app (HU-019)
- **Estado:** COMPLETADO
- **Archivos:**
  - `src/app/(dashboard)/notificaciones/page.tsx` - Server Component, carga notificaciones del usuario
  - `src/app/(dashboard)/notificaciones/NotificacionesClient.tsx` - Client Component
  - `src/app/actions/notificaciones.actions.ts` - Server actions `getNotificaciones`, `marcarLeida`, `marcarTodasLeidas`
- **Funcionalidad implementada:**
  - Lista de notificaciones de los ultimos 30 dias ordenadas por fecha descendente
  - Filtrado automatico: solo muestra notificaciones del usuario autenticado (`usuario_id = auth.uid()`)
  - Contador de notificaciones no leidas en el header
  - Boton "Marcar todas como leidas" (visible solo si hay no leidas)
  - Cada notificacion muestra: icono por tipo, titulo, mensaje, fecha
  - Iconos diferenciados por tipo de notificacion:
    - `nueva_requisicion`: FileText
    - `aprobacion`: CheckCircle
    - `rechazo`: XCircle
    - `pago`: CreditCard
    - `alerta_factura`: AlertTriangle
  - Estilo diferenciado para no leidas: borde izquierdo azul acento, fondo suave, punto indicador azul
  - Click en notificacion: marca como leida + navega al detalle de la requisicion asociada
  - Estado vacio con icono de campana y mensaje "Las notificaciones de los ultimos 30 dias apareceran aqui"
  - Server action `marcarTodasLeidas` actualiza en batch todas las notificaciones no leidas del usuario

### 2. Alertas de factura vencida - Motor automatico (HU-020)
- **Estado:** PENDIENTE
- **Descripcion:** Falta implementar el cron job (Vercel Cron o Supabase Edge Function) que:
  - Recalcule diariamente el nivel de alerta: PENDIENTE -> POR_VENCER (2 dias antes) -> VENCIDA (pasado deadline)
  - Envie notificacion in-app dia 3 post-pago sin factura -> recordatorio a Tesorero
  - Envie alerta diaria cuando quedan 2 dias -> Tesorero + Admin
  - Envie alerta inmediata al vencer -> Director + correo
- **Lo que ya existe:**
  - Tabla `alertas_factura` con campos `deadline`, `nivel`, `resuelta`
  - Calculo de deadline en `ejecutarPago` (Sprint 3): `MIN(fecha_pago + 7, fin_de_mes)`
  - Creacion automatica de alerta al ejecutar pago sin factura
  - Resolucion automatica de alerta al subir factura
  - Badges de nivel en pantalla de facturas pendientes
- **Pendiente:**
  - Ruta API `/api/cron/alertas` o Supabase Edge Function
  - Logica de `calcularNivelAlerta()` como se describe en CLAUDE.md seccion 16
  - Integracion con notificaciones existentes

### 3. Notificaciones por email (HU-022)
- **Estado:** PENDIENTE
- **Descripcion:** Falta integrar Resend para envio de emails
- **Prerrequisito:** Obtener API key de Resend y configurar `RESEND_API_KEY` en `.env.local`
- **Emails por implementar:**
  - Requisicion enviada para aprobacion -> Director
  - Requisicion aprobada/rechazada -> Solicitante
  - Pago programado/ejecutado -> Solicitante
  - Alerta de factura por vencer -> Tesorero + Admin
  - Factura vencida -> Director
- **Infraestructura lista:**
  - Dependencia `resend` ya instalada
  - Variable de entorno `RESEND_API_KEY` definida en esquema
  - Directorio `src/lib/email/` previsto en la arquitectura

### 4. Dashboard CxP mejorado (HU-023)
- **Estado:** PARCIAL
- **Archivos:**
  - `src/app/(dashboard)/dashboard/page.tsx` - Server Component con KPIs y acciones rapidas
- **Funcionalidad implementada (Sprint 1 + mejoras):**
  - 4 tarjetas KPI clickeables con navegacion: Total requisiciones, Por aprobar, Por pagar (aprobadas + programadas), Alertas activas
  - Iconos y colores diferenciados por KPI (azul, ambar, verde, rojo)
  - Seccion "Requisiciones recientes" (ultimas 5) con folio, badge de estatus, proveedor, concepto, importe
  - Seccion "Acciones rapidas" personalizadas por rol:
    - Operario: Nueva requisicion, Mis requisiciones
    - Director: Aprobaciones pendientes, Reportes
    - Tesorero: Pagos pendientes, Facturas pendientes
    - Admin: Aprobaciones, Pagos, Reportes
    - Visualizador: Reportes
  - Layout responsive: KPIs en grid 1-2-4 columnas, recientes + acciones en grid 2/3 + 1/3
- **Pendiente:**
  - Graficas de tendencia (requisiciones por mes, montos por empresa)
  - KPIs adicionales: monto total pagado del mes, promedio de tiempo de aprobacion
  - Graficas de distribucion por clasificacion de gasto

### 5. Vista global de requisiciones (HU-024)
- **Estado:** COMPLETADO
- **Descripcion:** Cubierta a traves de la pantalla de requisiciones (`/requisiciones`) con visibilidad por rol
- **Lo que existe:**
  - Director, Tesorero, Admin y Visualizador ven TODAS las requisiciones
  - Filtros por estatus y busqueda por texto
  - Columna "Solicitante" visible para roles con acceso global
  - Navegacion al detalle con toda la informacion (historial, aprobaciones, pagos)

### 6. Exportar Excel (HU-025)
- **Estado:** EN PROGRESO
- **Pendiente:**
  - Implementar server action de exportacion con libreria (xlsx o similar)
  - Boton "Exportar" en la pantalla de requisiciones
  - Filtros aplicados deben reflejarse en la exportacion
  - Columnas: folio, fecha, solicitante, empresa, proveedor, concepto, importe, moneda, estatus

---

## Componentes reutilizables consolidados

| Componente | Archivo | Descripcion |
|-----------|---------|-------------|
| StatusBadge | `src/components/StatusBadge.tsx` | Badge activo/inactivo para catalogos |
| EstatusBadge | `src/components/StatusBadge.tsx` | Badge de estatus de requisicion con 8 colores segun CLAUDE.md |
| PageHeader | `src/components/PageHeader.tsx` | Header de pagina con titulo, descripcion y boton de accion opcional |

### StatusBadge
- Dos variantes en el mismo archivo:
  - `StatusBadge({ active })` - Para catalogos, muestra "Activo" (verde) o "Inactivo" (gris)
  - `EstatusBadge({ estatus })` - Para requisiciones, mapea los 8 estatus a colores y labels en espanol
- Colores segun paleta institucional definida en CLAUDE.md seccion 11
- Usado en: RequisicionesClient, DetalleRequisicionClient, AprobacionesClient, PagosClient, Dashboard

### PageHeader
- Props: `title`, `description?`, `actionLabel?`, `onAction?`
- Boton de accion con icono Plus en color acento
- Client Component (`'use client'`)
- Usado en: RequisicionesClient (y disponible para todas las pantallas de listado)

---

## Resumen de notificaciones implementadas (todo el sistema)

| Evento | Tipo | Destinatarios |
|--------|------|--------------|
| Requisicion enviada | `nueva_requisicion` | Directores + Admins |
| Requisicion aprobada | `aprobacion` | Solicitante + Tesoreros + Admins |
| Requisicion rechazada | `rechazo` | Solicitante |
| Pago programado | `pago` | Solicitante |
| Pago ejecutado | `pago` | Solicitante |

---

## Deuda tecnica identificada

1. **Subida de archivos**: Facturas y comprobantes solo registran metadata, no se suben a Supabase Storage
2. **Cron de alertas**: No hay job automatico para actualizar niveles de alerta de factura
3. **Email**: No se envian emails reales por falta de API key de Resend
4. **Exportacion Excel**: Falta implementar la generacion y descarga del archivo
5. **Graficas en dashboard**: Solo KPIs numericos, sin visualizaciones de tendencia
6. **Paginacion**: Las tablas no tienen paginacion para volumenes grandes de datos
7. **Busqueda de proveedor**: El select de proveedores en el formulario no soporta busqueda incremental (combobox)

---

## Siguiente: Sprint 5 (propuesto)

- Completar subida de archivos a Supabase Storage (facturas + comprobantes)
- Implementar cron job de alertas de factura (`/api/cron/alertas`)
- Configurar Resend y envio de emails transaccionales
- Exportacion a Excel con filtros
- Reportes con graficas (recharts o similar)
- Inicio de Fase 2: Conciliacion bancaria (parsers, carga de estados de cuenta)
