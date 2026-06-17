# BITACORA - Sprint 2 - ERP CSI

## Fecha inicio: 2026-06-17
## Fecha fin: 2026-06-17
## Objetivo: Requisiciones completas (crear, listar, detalle, enviar) + Aprobaciones (aprobar, rechazar, cancelar)
## Estado: COMPLETADO

---

## Historias de usuario cubiertas

| HU | Titulo | Estado |
|----|--------|--------|
| HU-007 | Crear nueva requisicion | COMPLETADO |
| HU-008 | Listar requisiciones | COMPLETADO |
| HU-009 | Ver detalle de requisicion | COMPLETADO |
| HU-010 | Enviar requisicion para aprobacion | COMPLETADO |
| HU-011 | Aprobar requisicion | COMPLETADO |
| HU-012 | Rechazar requisicion | COMPLETADO |

---

## Detalle de tareas

### 1. Crear nueva requisicion (HU-007)
- **Estado:** COMPLETADO
- **Archivos:**
  - `src/app/(dashboard)/requisiciones/nueva/page.tsx` - Server Component, carga catalogos con `Promise.all` (empresas, proveedores, clasificaciones, proyectos)
  - `src/app/(dashboard)/requisiciones/nueva/NuevaRequisicionForm.tsx` - Client Component, formulario completo
  - `src/app/actions/requisiciones.actions.ts` - Server action `createRequisicion`
  - `src/lib/utils/folio.ts` - Generador de folios `REQ-YYYY-NNNN`
  - `src/lib/utils/meses.ts` - Generador de opciones de meses (3 atras + actual + 6 adelante)
- **Funcionalidad implementada:**
  - Formulario organizado en cards: Clasificacion y periodo, Empresa y proyecto, Proveedor y concepto, Importes, Factura y observaciones
  - Calculo automatico de IVA al 16% con opcion de ajuste manual
  - Soporte multi-moneda (MXN, USD, EUR) con campo de tipo de cambio condicional
  - Calculo en tiempo real del total y equivalente en MXN para moneda extranjera
  - Filtrado de proyectos por empresa generadora seleccionada
  - Auto-asignacion de empresa que paga = empresa generadora (editable)
  - Dos acciones: "Guardar borrador" (BORRADOR) y "Enviar para aprobacion" (EN_REVISION)
  - Confirmacion antes de enviar para aprobacion
  - Factura opcional al crear, con campo de motivo si no se adjunta
  - Validacion con Zod en server action
  - Registro automatico en historial_requisiciones
  - Notificacion automatica a directores y admins al enviar

### 2. Listar requisiciones (HU-008)
- **Estado:** COMPLETADO
- **Archivos:**
  - `src/app/(dashboard)/requisiciones/page.tsx` - Server Component, aplica filtro por rol
  - `src/app/(dashboard)/requisiciones/RequisicionesClient.tsx` - Client Component, tabla con filtros
  - `src/app/actions/requisiciones.actions.ts` - Server action `getRequisiciones`
- **Funcionalidad implementada:**
  - Tabla con columnas: Folio, Fecha, Solicitante (oculto para operario), Proveedor, Concepto, Importe, Estatus
  - Filtro por estatus (dropdown con todos los estados)
  - Busqueda por texto (folio, concepto, proveedor)
  - Visibilidad por rol: operario solo ve sus requisiciones, los demas ven todas (filtro `solicitante_id`)
  - Boton "Nueva requisicion" visible solo para roles con permiso de creacion
  - Click en fila navega al detalle
  - Badges de estatus con colores institucionales via `EstatusBadge`
  - Componente `PageHeader` reutilizable con titulo, descripcion y boton de accion

### 3. Ver detalle de requisicion (HU-009)
- **Estado:** COMPLETADO
- **Archivos:**
  - `src/app/(dashboard)/requisiciones/[id]/page.tsx` - Server Component, carga requisicion completa con relaciones
  - `src/app/(dashboard)/requisiciones/[id]/DetalleRequisicionClient.tsx` - Client Component
  - `src/app/actions/requisiciones.actions.ts` - Server action `getRequisicionById`
- **Funcionalidad implementada:**
  - Header con folio (font-mono), solicitante, fecha y badge de estatus
  - Aviso visible de rechazo con motivo, nombre del director y fecha
  - Dos cards: "Datos generales" (clasificacion, periodo, empresas, proyecto) y "Proveedor e importes" (desglose subtotal/IVA/total)
  - Card de observaciones (solicitante + motivo sin factura)
  - Timeline de historial de cambios ordenado cronologicamente con badges de transicion de estados
  - Query con joins a: empresas (generadora y paga), proveedores, clasificaciones, proyectos, perfiles, aprobaciones, pagos, facturas, historial
  - Boton "Volver" para regresar a la lista

### 4. Enviar requisicion para aprobacion (HU-010)
- **Estado:** COMPLETADO
- **Archivos:**
  - `src/app/actions/requisiciones.actions.ts` - Server action `enviarRequisicion`
  - `src/app/(dashboard)/requisiciones/[id]/DetalleRequisicionClient.tsx` - Boton de envio en detalle
- **Funcionalidad implementada:**
  - Boton "Enviar para aprobacion" visible solo si el usuario es dueno y el estatus es BORRADOR o RECHAZADO
  - Transiciones validas: BORRADOR -> EN_REVISION, RECHAZADO -> EN_REVISION (reenvio)
  - Confirmacion con dialog nativo antes de enviar
  - Registro en historial con comentario diferenciado (nuevo envio vs reenvio)
  - Notificacion automatica a todos los directores y admins activos
  - Revalidacion de rutas `/requisiciones` y `/aprobaciones`

### 5. Aprobar requisicion (HU-011)
- **Estado:** COMPLETADO
- **Archivos:**
  - `src/app/(dashboard)/aprobaciones/page.tsx` - Server Component, filtra requisiciones EN_REVISION
  - `src/app/(dashboard)/aprobaciones/AprobacionesClient.tsx` - Client Component
  - `src/app/actions/aprobaciones.actions.ts` - Server actions `aprobarRequisicion`, `cancelarRequisicion`
- **Funcionalidad implementada:**
  - Vista en cards (no tabla) para mejor visualizacion de cada requisicion
  - Cada card muestra: folio, estatus, solicitante, proveedor, empresa, importe, concepto
  - Badge de urgencia "+48h sin revisar" en color ambar para requisiciones con mas de 48 horas pendientes
  - Borde de warning en cards urgentes
  - Botones: Ver detalle, Rechazar (rojo), Aprobar (verde)
  - Dialog de confirmacion con resumen de la requisicion (folio, concepto, importe)
  - Campo de observaciones opcional al aprobar (para el tesorero)
  - Estado vacio con icono de check y mensaje "Todo al dia"
  - Al aprobar: registro en tabla aprobaciones, cambio a APROBADO, historial, notificacion al solicitante + tesoreros

### 6. Rechazar requisicion (HU-012)
- **Estado:** COMPLETADO
- **Archivos:**
  - `src/app/actions/aprobaciones.actions.ts` - Server action `rechazarRequisicion`
  - `src/app/(dashboard)/aprobaciones/AprobacionesClient.tsx` - Dialog de rechazo
- **Funcionalidad implementada:**
  - Motivo de rechazo OBLIGATORIO (validacion en cliente y servidor)
  - Dialog de confirmacion con campo de texto para el motivo
  - Toast de error si el motivo esta vacio
  - Al rechazar: registro en tabla aprobaciones con decision RECHAZADO, cambio de estatus, historial con motivo, notificacion al solicitante con motivo incluido
  - El solicitante puede reenviar la requisicion (RECHAZADO -> EN_REVISION)

---

## Utilidades creadas

| Archivo | Funcion | Descripcion |
|---------|---------|-------------|
| `src/lib/utils/folio.ts` | `generarFolio()` | Genera folio secuencial `REQ-YYYY-NNNN` basado en count de requisiciones del anio |
| `src/lib/utils/meses.ts` | `getMesesOptions()` | Genera opciones de meses en formato `MES-YYYY` (3 atras a 6 adelante) |
| `src/lib/utils/meses.ts` | `getMesActual()` | Retorna el mes actual en formato `MES-YYYY` |

---

## Decisiones de diseno

1. **Formulario en cards separadas**: Se dividio el formulario de nueva requisicion en 5 secciones logicas para reducir la sobrecarga cognitiva del usuario operativo.

2. **IVA auto-calculado con override manual**: Por defecto calcula el 16%, pero permite ajuste manual para casos exentos, tasa 0% o montos con IVA diferente.

3. **Filtrado de proyectos reactivo**: Los proyectos se filtran dinamicamente al seleccionar empresa generadora, evitando mostrar proyectos irrelevantes.

4. **Empresa que paga independiente**: Siempre se capturan ambas empresas (generadora y pagadora) porque pueden diferir, impactando la conciliacion bancaria posterior.

5. **Aprobaciones en cards vs tabla**: Se eligio layout de cards en aprobaciones para darle al director toda la informacion necesaria para decidir sin necesidad de navegar al detalle.

6. **Badge de urgencia +48h**: Implementado como calculo en tiempo real (no cron) comparando fecha_solicitud contra `Date.now()`.

7. **Cancelacion de requisiciones**: Implementada en `aprobaciones.actions.ts` para director/admin. Permite cancelar en cualquier estado excepto CANCELADO y COMPROBADO.

---

## Patron de notificaciones establecido

Cada cambio de estado genera notificaciones automaticas:
- **BORRADOR/RECHAZADO -> EN_REVISION**: Notifica a directores + admins
- **EN_REVISION -> APROBADO**: Notifica al solicitante + tesoreros + admins
- **EN_REVISION -> RECHAZADO**: Notifica al solicitante con motivo

---

## Siguiente: Sprint 3

- HU-013: Programar pago (tesorero)
- HU-014: Ejecutar pago (tesorero)
- HU-015: Subir factura
- HU-016: Lista de facturas pendientes
