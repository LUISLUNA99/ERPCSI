# DISEÑO UI/UX — ERP CSI · Grupo CSI

---

## Herramienta recomendada: v0.dev

**v0.dev** (de Vercel) es la herramienta ideal para este proyecto porque:
- Genera componentes React + Tailwind + shadcn/ui listos para copiar a Next.js
- El output es exactamente el stack que usamos
- Puedes describir en español lo que necesitas
- Itera rápido: describe → genera → ajusta → copia al proyecto

**URL:** https://v0.dev

### Cómo usarla para este proyecto

Usa prompts como este en v0.dev para cada pantalla:

```
Diseña [nombre de la pantalla] para un sistema financiero empresarial 
en México llamado "ERP CSI". 

Contexto: [describe brevemente la pantalla]

El usuario es [rol] y necesita [acción principal].

Elementos que debe mostrar:
- [elemento 1]
- [elemento 2]

Colores institucionales:
- Azul marino: #1B3A6B (sidebar, headers)
- Azul acción: #2563EB (botones primarios)
- Fondo: #F8FAFC

Requisitos de diseño:
- En español, lenguaje simple para usuarios no técnicos
- Una sola acción principal destacada
- shadcn/ui components
- Totalmente responsive
- Sin jerga técnica
```

---

## Sistema de diseño

### Paleta de colores

```css
/* Colores institucionales */
--color-primary:    #1B3A6B;  /* Azul marino — sidebar, headers */
--color-action:     #2563EB;  /* Azul acción — botones primarios, links */
--color-bg:         #F8FAFC;  /* Fondo general */
--color-surface:    #FFFFFF;  /* Cards, modales */
--color-border:     #E2E8F0;  /* Bordes sutiles */
--color-text:       #0F172A;  /* Texto principal */
--color-text-muted: #64748B;  /* Texto secundario */

/* Estatus */
--color-success:    #16A34A;  /* Verde — aprobado, comprobado */
--color-warning:    #D97706;  /* Naranja — por vencer, programado */
--color-danger:     #DC2626;  /* Rojo — rechazado, vencido, cancelado */
--color-info:       #0284C7;  /* Azul claro — en revisión */
--color-neutral:    #64748B;  /* Gris — borrador */
```

### Badges de estatus (usar consistentemente en todo el sistema)

| Estatus | Clases Tailwind |
|---------|----------------|
| BORRADOR | `bg-slate-100 text-slate-600 border border-slate-200` |
| EN_REVISION | `bg-blue-100 text-blue-700 border border-blue-200` |
| APROBADO | `bg-green-100 text-green-700 border border-green-200` |
| RECHAZADO | `bg-red-100 text-red-700 border border-red-200` |
| PROGRAMADO | `bg-purple-100 text-purple-700 border border-purple-200` |
| PAGADO | `bg-green-200 text-green-800 border border-green-300` |
| COMPROBADO | `bg-emerald-100 text-emerald-800 border border-emerald-200` |
| CANCELADO | `bg-gray-200 text-gray-600 border border-gray-300` |

### Badges de alerta de factura

| Nivel | Clases Tailwind | Ícono |
|-------|----------------|-------|
| PENDIENTE | `bg-yellow-100 text-yellow-700` | ⏳ |
| POR_VENCER | `bg-orange-100 text-orange-700` | ⚠️ |
| VENCIDA | `bg-red-100 text-red-700` | 🔴 |

### Tipografía

- **Display/Títulos:** Inter, 700 weight
- **Cuerpo:** Inter, 400 weight
- **Números/Montos:** Inter, tabular-nums (para alinear decimales)
- **Código/Folios:** Mono: `font-mono`

```css
/* Escala tipográfica */
h1: text-2xl font-bold text-slate-900
h2: text-xl font-semibold text-slate-800
h3: text-lg font-semibold text-slate-700
label: text-sm font-medium text-slate-700
monto: text-xl font-bold tabular-nums
folio: font-mono text-sm text-slate-500
```

---

## Layout general

### Estructura de pantalla

```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR (240px fijo)    │  CONTENT AREA               │
│  ┌──────────────────┐    │  ┌─────────────────────────┐ │
│  │ Logo CSI         │    │  │ PAGE HEADER             │ │
│  │ Concilia         │    │  │ Título + breadcrumb     │ │
│  ├──────────────────┤    │  ├─────────────────────────┤ │
│  │ 🏠 Dashboard     │    │  │                         │ │
│  │ 📋 Requisiciones │    │  │  CONTENIDO PRINCIPAL    │ │
│  │ ✅ Aprobaciones  │    │  │                         │ │
│  │ 💳 Pagos         │    │  │                         │ │
│  │ 🧾 Facturas      │    │  └─────────────────────────┘ │
│  │ 🔔 Notificaciones│    │                               │
│  │ 📊 Reportes      │    │                               │
│  │ ⚙️  Admin        │    │                               │
│  ├──────────────────┤    │                               │
│  │ Avatar + nombre  │    │                               │
│  │ Rol del usuario  │    │                               │
│  └──────────────────┘    │                               │
└─────────────────────────────────────────────────────────┘
```

### Header de página

```
┌─────────────────────────────────────────────────────────┐
│  Nueva Requisición                    🔔 3  [ Avatar ]  │
│  Inicio > Requisiciones > Nueva                         │
└─────────────────────────────────────────────────────────┘
```

---

## Pantallas detalladas

### PANTALLA 1: Dashboard por rol

**Componentes:**
- 4 tarjetas KPI en la parte superior
- 1 gráfica de gastos del mes por empresa
- 1 tabla de "Mis últimas requisiciones" (operario) o "Pendientes de acción" (director/tesorero)
- Panel lateral de alertas activas (si hay)

**KPIs por rol:**

*Operario:*
- Mis requisiciones del mes
- Pendientes de aprobación
- Pendientes de factura
- Monto total solicitado

*Director:*
- Por autorizar (con contador urgente)
- Autorizadas hoy
- Rechazadas esta semana
- Monto autorizado del mes

*Tesorero:*
- Por pagar
- Pagados hoy
- Alertas de factura activas
- Monto pagado del mes

---

### PANTALLA 2: Nueva Requisición (Operario)

**Principio de diseño:** Una pantalla limpia, sin pestañas. Progresión visual de arriba hacia abajo. El botón principal "Enviar para aprobación" siempre visible al final.

```
┌─────────────────────────────────────────────────────────┐
│  Nueva Requisición                                      │
│  Folio: REQ-2026-0001   Fecha: 16 jun 2026   Tú: Ana R. │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ¿Qué tipo de gasto es este?                           │
│  [Pago proveedor ▼]                                    │
│                                                         │
│  ¿A qué período corresponde?                           │
│  Mes del servicio: [JUN-2026 ▼]                        │
│  ¿Cuándo deseas que se pague?: [JUN-2026 ▼]            │
│                                                         │
│  ¿Qué empresa genera el gasto?                         │
│  [Buzzword ▼]          ¿Quién paga?: [Buzzword ▼]      │
│                                                         │
│  Proyecto / Centro de costo                            │
│  [🔍 Buscar proyecto...                    ▼]          │
│                                                         │
│  Proveedor                                             │
│  [🔍 Buscar proveedor...                   ▼]          │
│  + Solicitar alta de nuevo proveedor                   │
│                                                         │
│  Concepto del pago                                     │
│  [                                                   ] │
│  [                                                   ] │
│                                                         │
│  Monto                                                 │
│  Moneda: [MXN ▼]  Tipo cambio: [1.0000]               │
│  Total con IVA: [___________]                          │
│  IVA (16%): $___   Sin IVA: $___  (calculado auto)    │
│                                                         │
│  Factura                                               │
│  ○ Adjunto la factura ahora  ● La factura es posterior │
│  [Si no adjunta → campo: ¿Por qué no tienes factura?] │
│  [📎 Adjuntar PDF o XML]                               │
│                                                         │
│  Observaciones (opcional)                              │
│  [                                                   ] │
│                                                         │
│  [  Guardar borrador  ]   [ Enviar para aprobación → ] │
└─────────────────────────────────────────────────────────┘
```

**Reglas UX:**
- El proveedor filtra según la empresa generadora seleccionada
- Al seleccionar empresa → el selector de proyecto/CC se filtra automáticamente
- Al cambiar moneda a USD/EUR → aparece campo de tipo de cambio
- El IVA se recalcula automáticamente al cambiar el total
- Si selecciona "La factura es posterior" → campo motivo se vuelve obligatorio
- Validación en tiempo real con mensajes debajo de cada campo
- Al "Enviar" → modal de confirmación con resumen antes de proceder

---

### PANTALLA 3: Cola de Aprobaciones (Director)

```
┌─────────────────────────────────────────────────────────┐
│  Por Autorizar (12)                                     │
│  [ Empresa ▼ ] [ Mes ▼ ] [ Buscar folio o proveedor ]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ REQ-2026-0045                        ⏰ 2 días  │   │
│  │ Buzzword · Pago proveedor                        │   │
│  │ Proveedor: Alestra S.A.                          │   │
│  │ Concepto: Internet dedicado Diciembre            │   │
│  │ Centro de costo: 50-02-29                        │   │
│  │ Solicitó: Nayeli Ortega · hace 2 días            │   │
│  │ Monto: $21,823.54 MXN            [Ver y decidir →]│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ REQ-2026-0044                        🆕 1 hora  │   │
│  │ ...                                              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Vista de detalle al hacer click:**
```
┌─────────────────────────────────────────────────────────┐
│  ← Volver    REQ-2026-0045    [EN REVISIÓN]             │
├────────────────────────┬────────────────────────────────┤
│  RESUMEN DEL GASTO     │  FACTURA ADJUNTA               │
│                        │                                │
│  Tipo: Pago proveedor  │  [Vista previa PDF]            │
│  Período: DIC-2024     │                                │
│  Empresa: Buzzword     │                                │
│  Paga: Buzzword        │                                │
│  Proyecto: 50-02-29    │                                │
│  Proveedor: Alestra    │                                │
│  Concepto: Internet... │                                │
│  Monto: $21,823.54     │                                │
│  IVA: $3,010.14        │                                │
│  Sin IVA: $18,813.40   │                                │
│                        │                                │
│  Solicitó: Nayeli O.   │                                │
│  Fecha: 14 jun 2026    │                                │
│  Obs: [texto]          │                                │
├────────────────────────┴────────────────────────────────┤
│  Tu decisión                                            │
│  Observaciones para Tesorería (opcional):               │
│  [                                                    ] │
│                                                         │
│  [ ✗ Rechazar ]                   [ ✓ Aprobar pago → ] │
└─────────────────────────────────────────────────────────┘
```

---

### PANTALLA 4: Cola de Pagos (Tesorero)

Tabla con columnas: Folio | Proveedor | Empresa paga | Monto | Mes deseado | Factura | Acción

Al abrir una requisición aprobada, el tesorero ve el detalle + su formulario:

```
┌─────────────────────────────────────────────────────────┐
│  Registrar Pago · REQ-2026-0045                         │
├─────────────────────────────────────────────────────────┤
│  [Resumen de la requisición — solo lectura]             │
│  Proveedor: Alestra   Monto: $21,823.54 MXN             │
│  Aprobó: Dir. Rodríguez · 15 jun 2026                   │
├─────────────────────────────────────────────────────────┤
│  Datos del pago                                         │
│                                                         │
│  Cuenta de pago: [Buzzword · Santander ·xxxx4521 ▼]    │
│  Fecha del pago: [15/06/2026         📅]                │
│  Folio bancario: [________________]                     │
│  Tipo de cambio: [1.0000] (si aplica)                   │
│                                                         │
│  Comprobante bancario (obligatorio):                    │
│  [📎 Adjuntar comprobante PDF]                          │
│                                                         │
│  ¿Ya tienes la factura?                                │
│  ○ Sí, la adjunto ahora  ● No, se subirá después       │
│  [📎 Adjuntar factura]                                  │
│                                                         │
│  Observaciones:                                         │
│  [                                                    ] │
│                                                         │
│  [ Cancelar ]                    [ ✓ Registrar pago → ] │
└─────────────────────────────────────────────────────────┘
```

---

### PANTALLA 5: Centro de Notificaciones

Panel lateral deslizable (drawer) al hacer click en la campana:

```
┌──────────────────────────────┐
│  Notificaciones (3 nuevas) ✕ │
│  [Marcar todas como leídas]  │
├──────────────────────────────┤
│  🔴 hace 5 min               │
│  Factura VENCIDA             │
│  REQ-2026-0031 · Alerta:     │
│  La factura de TotalPlay     │
│  venció ayer sin subirse.    │
│  [Ver requisición →]         │
├──────────────────────────────┤
│  🟠 hace 2 horas             │
│  Por autorizar               │
│  Nueva solicitud de Nayeli   │
│  Ortega · $21,823 · Alestra  │
│  [Revisar →]                 │
├──────────────────────────────┤
│  ✅ ayer                     │
│  Pago registrado             │
│  Tu requisición REQ-2026-    │
│  0041 fue pagada por         │
│  Tesorería. Folio: 38426.   │
│  [Ver detalle →]             │
└──────────────────────────────┘
```

---

## Principios UX para usuarios no técnicos

### 1. Lenguaje simple
❌ "Submit requisition" → ✅ "Enviar para aprobación"  
❌ "Error 422" → ✅ "El monto no puede estar vacío"  
❌ "Entity not found" → ✅ "No encontramos ese proveedor"  

### 2. Siempre decir en qué paso está el usuario
Usa una barra de progreso o un resumen del estatus en la parte superior de cada pantalla de detalle.

### 3. Confirmaciones en acciones importantes
Antes de Aprobar, Rechazar, Cancelar o Registrar pago → mostrar un modal resumen:
> "¿Confirmas que deseas aprobar REQ-2026-0045 de $21,823 MXN para Alestra?"

### 4. Empty states útiles
Cuando no hay datos, no mostrar tabla vacía. Mostrar un mensaje de acción:
> "No tienes requisiciones pendientes por el momento. 🎉"  
> "Cuando el operario envíe una solicitud, aparecerá aquí."

### 5. Feedback inmediato
Después de cada acción exitosa → toast verde en esquina superior derecha:
> "✅ Requisición enviada para aprobación"  
> "✅ Pago registrado correctamente"

Después de error → toast rojo con qué salió mal y qué hacer.

### 6. Montos siempre con formato MX
Usar siempre: `$21,823.54` nunca `21823.54`

### 7. Fechas siempre en español
Usar: `15 de junio de 2026` o `15/jun/2026`, nunca `2026-06-15`

---

## Componentes reutilizables a construir

| Componente | Descripción |
|-----------|-------------|
| `<Estatusbadge>` | Badge de color por estatus de requisición |
| `<AlertaBadge>` | Badge de nivel de alerta de factura |
| `<MontoDisplay>` | Muestra monto con moneda y formato MX |
| `<RequisicionCard>` | Tarjeta resumida de una requisición |
| `<RequisicionDetalle>` | Vista completa de detalle |
| `<ProveedorSelector>` | Buscador + selector de proveedor |
| `<ProyectoSelector>` | Selector de CC/Proyecto con filtro por empresa |
| `<FileUpload>` | Área de drag & drop para PDF/XML |
| `<PdfViewer>` | Visor inline de PDF |
| `<NotificacionPanel>` | Drawer de notificaciones |
| `<KpiCard>` | Tarjeta de métrica del dashboard |
| `<ConfirmModal>` | Modal de confirmación genérico |
| `<HistorialTimeline>` | Timeline del historial de una requisición |

---

## Accesibilidad

- Contraste mínimo AA en todos los textos
- Focus visible en todos los elementos interactivos
- Labels explícitos en todos los inputs
- Mensajes de error asociados al campo con `aria-describedby`
- Loading states con skeleton screens (no spinners ocultos)
- Soporte para teclado en todos los formularios
