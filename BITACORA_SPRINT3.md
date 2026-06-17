# BITACORA - Sprint 3 - ERP CSI

## Fecha inicio: 2026-06-17
## Fecha fin: 2026-06-17
## Objetivo: Pagos (programar y ejecutar) + Facturas (subir y listar pendientes) + Alertas de factura
## Estado: COMPLETADO

---

## Historias de usuario cubiertas

| HU | Titulo | Estado |
|----|--------|--------|
| HU-013 | Programar pago | COMPLETADO |
| HU-014 | Ejecutar pago | COMPLETADO |
| HU-015 | Subir factura | COMPLETADO |
| HU-016 | Lista de facturas pendientes | COMPLETADO |

---

## Detalle de tareas

### 1. Pantalla de pagos - Vista general (HU-013 + HU-014)
- **Estado:** COMPLETADO
- **Archivos:**
  - `src/app/(dashboard)/pagos/page.tsx` - Server Component, carga requisiciones por pagar + bancos con `Promise.all`
  - `src/app/(dashboard)/pagos/PagosClient.tsx` - Client Component, dos secciones + dialogs
  - `src/app/actions/pagos.actions.ts` - Server actions `getRequisicionesPorPagar`, `programarPago`, `ejecutarPago`
- **Funcionalidad implementada:**
  - Pantalla dividida en dos secciones con iconos: "Por programar" (APROBADO) y "Programados - por ejecutar" (PROGRAMADO)
  - Contador de requisiciones en cada seccion en el header
  - Cards reutilizables (`ReqCard`) con: folio, estatus, badge "Sin factura", proveedor, importe, empresa que paga, mes deseado
  - Componente `ReqSummary` reutilizable para resumen en dialogs

### 2. Programar pago (HU-013)
- **Estado:** COMPLETADO
- **Archivos:**
  - `src/app/actions/pagos.actions.ts` - Server action `programarPago`
  - `src/app/(dashboard)/pagos/PagosClient.tsx` - Dialog de programacion
- **Funcionalidad implementada:**
  - Dialog con: resumen de requisicion, selector de cuenta bancaria, fecha programada, observaciones
  - Selector de banco filtra solo cuentas activas, muestra: empresa codigo - banco (numero cuenta) (moneda)
  - Validacion: cuenta bancaria y fecha programada obligatorias
  - Verifica que la requisicion este en estatus APROBADO antes de proceder
  - Crea registro en tabla `pagos` con tesorero_id, banco_empresa_id, fecha_programada
  - Transicion: APROBADO -> PROGRAMADO
  - Historial con comentario "Pago programado para [fecha]"
  - Notificacion al solicitante con fecha programada

### 3. Ejecutar pago (HU-014)
- **Estado:** COMPLETADO
- **Archivos:**
  - `src/app/actions/pagos.actions.ts` - Server action `ejecutarPago`
  - `src/app/(dashboard)/pagos/PagosClient.tsx` - Dialog de ejecucion
- **Funcionalidad implementada:**
  - Dialog con: resumen, aviso ambar si no tiene factura, fecha de pago, folio bancario, tipo de cambio real (condicional si moneda != MXN), importe real MXN, observaciones
  - Aviso preventivo: "Esta requisicion no tiene factura. Al registrar el pago se creara una alerta de factura pendiente."
  - Campos tipo de cambio real e importe real MXN solo visibles para moneda extranjera
  - Validacion: fecha de pago y folio bancario obligatorios
  - Logica de transicion inteligente:
    - Si `tiene_factura_inicial = true` -> estatus COMPROBADO (flujo completo)
    - Si `tiene_factura_inicial = false` -> estatus PAGADO + creacion de alerta
  - **Calculo de deadline de alerta** (regla de negocio critica):
    - `deadline = MIN(fecha_pago + 7 dias, ultimo_dia_del_mes_de_pago)`
    - Implementado inline en la server action
  - Creacion de registro en tabla `alertas_factura` con nivel PENDIENTE
  - Notificacion al solicitante con folio bancario + solicitud de factura si aplica
  - Revalidacion de rutas `/pagos`, `/requisiciones` y `/facturas`

### 4. Subir factura (HU-015)
- **Estado:** COMPLETADO
- **Archivos:**
  - `src/app/actions/facturas.actions.ts` - Server actions `getRequisicionesSinFactura`, `subirFactura`
  - `src/app/(dashboard)/facturas/FacturasClient.tsx` - Dialog de registro de factura
- **Funcionalidad implementada:**
  - Dialog con: resumen de requisicion, numero de factura (obligatorio), fecha de factura (opcional)
  - Al subir factura:
    - Crea registro en tabla `facturas` con numero, referencia de URL pendiente
    - Actualiza requisicion: estatus PAGADO -> COMPROBADO, `tiene_factura_inicial = true`, `numero_factura_inicial`
    - Resuelve alertas: marca `resuelta = true` en `alertas_factura`
    - Registra en historial con comentario "Factura [numero] registrada"
  - Validacion: solo permite subir factura a requisiciones en estatus PAGADO
  - **NOTA:** La subida de archivo fisico queda pendiente (Supabase Storage). Actualmente registra metadata con `factura_url: 'pendiente'`

### 5. Lista de facturas pendientes (HU-016)
- **Estado:** COMPLETADO
- **Archivos:**
  - `src/app/(dashboard)/facturas/page.tsx` - Server Component
  - `src/app/(dashboard)/facturas/FacturasClient.tsx` - Client Component
  - `src/app/actions/facturas.actions.ts` - Server action `getRequisicionesSinFactura`
- **Funcionalidad implementada:**
  - Lista de requisiciones PAGADAS sin factura, con join a alertas_factura
  - Badges de nivel de alerta con colores diferenciados:
    - PENDIENTE: amarillo (`bg-yellow-100 text-yellow-700`)
    - POR_VENCER: naranja (`bg-orange-100 text-orange-700`)
    - VENCIDA: rojo (`bg-red-100 text-red-700`)
  - Cards con borde de color segun nivel de alerta (rojo para VENCIDA, naranja para POR_VENCER)
  - Cada card muestra: folio, nivel de alerta con deadline, proveedor, importe, fecha de pago
  - Boton "Subir factura" en cada card
  - Estado vacio con icono de receipt y mensaje "Todo comprobado"
  - Filtrado por rol: operario solo ve sus requisiciones pendientes de factura

---

## Decisiones de diseno

1. **Dos secciones en pagos**: Se separaron visualmente las requisiciones "por programar" y "por ejecutar" para que el tesorero tenga claro su pipeline de trabajo.

2. **Calculo de deadline inline**: El calculo `MIN(fecha_pago + 7, fin_de_mes)` se implemento directamente en la server action de `ejecutarPago` en lugar de un trigger de base de datos, manteniendo la logica en la capa de aplicacion.

3. **Transicion inteligente PAGADO vs COMPROBADO**: Si la requisicion ya tenia factura al momento del pago, salta directamente a COMPROBADO. Esto evita un paso innecesario para el tesorero.

4. **Factura sin archivo fisico (temporal)**: Se registra la metadata de la factura sin subir archivo a Supabase Storage. Esto permite avanzar con el flujo funcional completo y agregar el upload de archivos como mejora posterior.

5. **Alertas de factura como entidad separada**: Las alertas tienen su propia tabla con deadline y nivel, permitiendo consultas eficientes para el dashboard y las notificaciones futuras.

---

## Flujo de estados cubierto hasta Sprint 3

```
BORRADOR -> EN_REVISION -> APROBADO -> PROGRAMADO -> PAGADO -> COMPROBADO
                        \-> RECHAZADO (-> EN_REVISION reenvio)
                                                        \-> alerta_factura si no hay factura
```

---

## Pendientes identificados

- [ ] Subida de archivos fisicos a Supabase Storage (facturas, comprobantes bancarios)
- [ ] Upload de comprobante bancario al ejecutar pago
- [ ] Actualizacion automatica de nivel de alerta (cron job: PENDIENTE -> POR_VENCER -> VENCIDA)
- [ ] Notificaciones por email via Resend al vencer facturas

---

## Siguiente: Sprint 4

- HU-019: Centro de notificaciones
- HU-020: Alertas de factura vencida (cron)
- HU-022: Notificaciones por email
- HU-023: Dashboard CxP mejorado
