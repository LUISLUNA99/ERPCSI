# BACKLOG — ERP CSI · Grupo CSI

---

## ÉPICA 1: Autenticación y Roles

### HU-001 · Login de usuario
**Como** cualquier usuario del sistema  
**Quiero** iniciar sesión con mi correo y contraseña  
**Para** acceder al sistema según mis permisos  

**Criterios de aceptación:**
- [ ] Formulario de login con email y contraseña
- [ ] Validación de credenciales contra Supabase Auth
- [ ] Redirección al dashboard según el rol del usuario
- [ ] Mensaje de error claro si las credenciales son incorrectas
- [ ] Opción "Olvidé mi contraseña" con envío de correo
- [ ] Sesión persiste al recargar la página

---

### HU-002 · Protección de rutas por rol
**Como** sistema  
**Quiero** que cada ruta esté protegida según el rol del usuario  
**Para** que nadie acceda a funciones que no le corresponden  

**Criterios de aceptación:**
- [ ] Middleware verifica sesión en todas las rutas protegidas
- [ ] Usuario sin sesión es redirigido a `/login`
- [ ] Usuario con rol insuficiente ve pantalla de "Sin permisos"
- [ ] El sidebar solo muestra las secciones accesibles para el rol activo

---

### HU-003 · Gestión de usuarios (Admin)
**Como** administrador  
**Quiero** crear, editar y desactivar usuarios  
**Para** controlar quién accede al sistema y con qué rol  

**Criterios de aceptación:**
- [ ] Tabla de usuarios con nombre, email, rol, empresa y estatus
- [ ] Formulario para crear usuario (envía invitación por correo)
- [ ] Formulario para editar rol y empresa asignada
- [ ] Botón para activar/desactivar usuario (no eliminar)
- [ ] Usuario desactivado no puede iniciar sesión
- [ ] Filtros por rol y empresa

---

## ÉPICA 2: Catálogos (Admin)

### HU-004 · Catálogo de empresas
**Como** administrador  
**Quiero** gestionar las empresas del grupo  
**Para** que estén disponibles al crear requisiciones  

**Criterios de aceptación:**
- [ ] Listar empresas con código, nombre, RFC y estatus
- [ ] Crear empresa con: código, nombre, RFC
- [ ] Editar empresa
- [ ] Activar/desactivar empresa
- [ ] No se puede desactivar una empresa con requisiciones activas

---

### HU-005 · Catálogo de centros de costo y proyectos
**Como** administrador  
**Quiero** gestionar los centros de costo y proyectos  
**Para** que el operario pueda seleccionarlos al solicitar un gasto  

**Criterios de aceptación:**
- [ ] Listar proyectos con: CC, empresa, cliente, nombre, estatus
- [ ] Crear proyecto con todos sus campos
- [ ] Editar proyecto
- [ ] Activar/desactivar proyecto
- [ ] Filtros por empresa y por cliente
- [ ] El CC se valida formato `XX-XX-XX`
- [ ] Importación masiva desde Excel (opcional Fase 1.5)

---

### HU-006 · Catálogo de proveedores
**Como** administrador  
**Quiero** gestionar el directorio de proveedores  
**Para** que el operario pueda seleccionarlos al solicitar un gasto  

**Criterios de aceptación:**
- [ ] Listar proveedores con nombre, RFC, banco y estatus
- [ ] Crear proveedor: nombre, RFC, banco, CLABE, cuenta, contacto
- [ ] Editar proveedor
- [ ] Activar/desactivar proveedor
- [ ] Búsqueda por nombre o RFC
- [ ] El operario puede solicitar alta de nuevo proveedor (Admin lo aprueba)

---

### HU-007 · Catálogo de clasificaciones de gasto
**Como** administrador  
**Quiero** gestionar los tipos de clasificación de gasto  
**Para** que el operario categorice correctamente cada requisición  

**Criterios de aceptación:**
- [ ] Listar clasificaciones con nombre y estatus
- [ ] Crear, editar y activar/desactivar clasificaciones
- [ ] Clasificaciones iniciales precargadas:
  - Pago proveedor
  - Reembolso
  - Compra
  - Nómina
  - Finiquito
  - Gastos por comprobar
  - Comisión bancaria
  - Impuesto

---

### HU-008 · Catálogo de bancos por empresa
**Como** administrador  
**Quiero** gestionar las cuentas bancarias de cada empresa  
**Para** que Tesorería seleccione desde cuál cuenta se realiza cada pago  

**Criterios de aceptación:**
- [ ] Listar cuentas: empresa, banco, número de cuenta, CLABE, moneda
- [ ] Crear, editar y activar/desactivar cuentas
- [ ] Bancos disponibles: Santander, BBVA, HSBC, Banregio
- [ ] Una empresa puede tener múltiples cuentas en distintos bancos

---

## ÉPICA 3: Requisiciones (Operario)

### HU-009 · Crear nueva requisición
**Como** operario  
**Quiero** registrar una solicitud de pago en una sola pantalla  
**Para** que el director pueda revisarla y autorizarla  

**Criterios de aceptación:**
- [ ] Folio generado automáticamente (REQ-2026-XXXX)
- [ ] Fecha y solicitante tomados del sistema (no editables)
- [ ] Selector de tipo de clasificación (catálogo)
- [ ] Selector de mes del servicio (formato MES-AÑO)
- [ ] Selector de mes deseado de pago
- [ ] Selector de empresa generadora del gasto
- [ ] Selector de empresa que paga
- [ ] Selector de proyecto/CC (filtrado por empresa generadora)
- [ ] Buscador de proveedor (catálogo)
- [ ] Campo "solicitar nuevo proveedor" si no está en catálogo
- [ ] Campo concepto del pago (texto libre, máx 500 caracteres)
- [ ] Selector de moneda (MXN/USD/EUR)
- [ ] Campo importe total con IVA incluido
- [ ] Cálculo automático de IVA (16%) con opción de ajuste manual
- [ ] Adjuntar factura (PDF o XML, opcional)
- [ ] Si no adjunta factura: campo "motivo" obligatorio
- [ ] Observaciones (texto libre, opcional)
- [ ] Botón "Guardar borrador" — no envía, guarda
- [ ] Botón "Enviar para aprobación" — cambia estatus a EN_REVISION
- [ ] Confirmación antes de enviar

---

### HU-010 · Ver mis requisiciones
**Como** operario  
**Quiero** ver el listado de todas mis requisiciones con su estatus actual  
**Para** hacer seguimiento de mis solicitudes  

**Criterios de aceptación:**
- [ ] Tabla con: folio, fecha, proveedor, concepto, importe, estatus
- [ ] Badge de color por estatus
- [ ] Filtros por estatus, mes, empresa
- [ ] Al hacer clic en una fila, ver detalle completo
- [ ] Indicador visual cuando una requisición fue rechazada (con motivo)
- [ ] Las rechazadas pueden ser reenviadas desde el detalle

---

### HU-011 · Re-enviar requisición rechazada
**Como** operario  
**Quiero** corregir y reenviar una requisición rechazada  
**Para** que el director la pueda aprobar en una segunda revisión  

**Criterios de aceptación:**
- [ ] Ver el comentario de rechazo del director
- [ ] Poder editar los campos de la requisición
- [ ] Botón "Reenviar para aprobación"
- [ ] El historial muestra el rechazo anterior y el reenvío

---

### HU-012 · Subir factura a requisición pagada
**Como** operario  
**Quiero** subir la factura del proveedor cuando la reciba  
**Para** completar la comprobación del gasto  

**Criterios de aceptación:**
- [ ] Ver lista de mis requisiciones en estatus PAGADO sin factura
- [ ] Adjuntar PDF y/o XML del CFDI
- [ ] Capturar número de factura y fecha
- [ ] Al subir factura correctamente → estatus cambia a COMPROBADO
- [ ] Notificación al Tesorero de que se subió la factura

---

## ÉPICA 4: Aprobaciones (Director de Operaciones)

### HU-013 · Ver cola de aprobaciones
**Como** director de operaciones  
**Quiero** ver todas las requisiciones pendientes de mi aprobación  
**Para** procesarlas en orden de prioridad  

**Criterios de aceptación:**
- [ ] Lista de requisiciones en estatus EN_REVISION
- [ ] Ordenadas por fecha de solicitud (más antigua primero)
- [ ] Muestra: folio, solicitante, proveedor, concepto, importe, empresa, fecha
- [ ] Badge de alerta si llevan más de 48h sin revisar
- [ ] Filtros por empresa y por mes
- [ ] Contador de pendientes en el ícono del menú

---

### HU-014 · Aprobar requisición
**Como** director de operaciones  
**Quiero** aprobar una requisición después de revisarla  
**Para** que Tesorería proceda con el pago  

**Criterios de aceptación:**
- [ ] Ver detalle completo de la requisición (solo lectura)
- [ ] Ver factura adjunta si la hay (visor de PDF)
- [ ] Campo opcional de observaciones para el tesorero
- [ ] Botón "Aprobar" con confirmación
- [ ] Al aprobar: estatus → APROBADO, notificación al Tesorero y al Operario
- [ ] El historial registra quién aprobó y cuándo

---

### HU-015 · Rechazar requisición
**Como** director de operaciones  
**Quiero** rechazar una requisición con motivo claro  
**Para** que el operario pueda corregirla  

**Criterios de aceptación:**
- [ ] Campo de motivo de rechazo obligatorio
- [ ] Botón "Rechazar" con confirmación
- [ ] Al rechazar: estatus → RECHAZADO, notificación al Operario con el motivo
- [ ] El historial registra quién rechazó, cuándo y por qué

---

## ÉPICA 5: Pagos (Tesorero)

### HU-016 · Ver cola de pagos pendientes
**Como** tesorero  
**Quiero** ver todas las requisiciones aprobadas pendientes de pago  
**Para** programarlas y ejecutarlas  

**Criterios de aceptación:**
- [ ] Lista de requisiciones en estatus APROBADO y PROGRAMADO
- [ ] Muestra: folio, proveedor, concepto, importe, empresa que paga, mes deseado de pago
- [ ] Indicador si ya tiene factura o no
- [ ] Filtros por empresa, banco, mes
- [ ] Ordenadas por mes deseado de pago

---

### HU-017 · Programar pago
**Como** tesorero  
**Quiero** indicar desde qué cuenta y cuándo se realizará el pago  
**Para** tener visibilidad de la agenda de pagos  

**Criterios de aceptación:**
- [ ] Seleccionar banco/cuenta de la empresa que paga
- [ ] Indicar fecha programada
- [ ] Observaciones opcionales
- [ ] Al programar: estatus → PROGRAMADO, notificación al Operario

---

### HU-018 · Registrar pago ejecutado
**Como** tesorero  
**Quiero** registrar que el pago fue realizado con su comprobante  
**Para** cerrar el ciclo de pago y activar el seguimiento de factura  

**Criterios de aceptación:**
- [ ] Ingresar folio de aprobación bancaria (referencia de transferencia)
- [ ] Ingresar fecha real del pago
- [ ] Si fue en USD/EUR: confirmar tipo de cambio real
- [ ] Adjuntar comprobante bancario (PDF) — OBLIGATORIO
- [ ] Si ya tiene factura: puede marcar como COMPROBADO directamente
- [ ] Si no tiene factura: estatus → PAGADO, se crea alerta de factura
- [ ] Notificación al Operario: "Tu pago fue realizado, sube la factura"
- [ ] El deadline de factura se calcula automáticamente al registrar el pago

---

### HU-019 · Subir factura desde Tesorería
**Como** tesorero  
**Quiero** subir la factura del proveedor cuando la recibo directamente  
**Para** completar la comprobación sin esperar al operario  

**Criterios de aceptación:**
- [ ] Misma funcionalidad que HU-012 pero accesible desde la pantalla de Tesorero
- [ ] Al subir factura → alerta de factura se marca como resuelta
- [ ] Estatus → COMPROBADO

---

## ÉPICA 6: Alertas y Notificaciones

### HU-020 · Alertas de factura vencida
**Como** sistema  
**Quiero** generar alertas automáticas cuando una factura está por vencer o ya venció  
**Para** que el equipo tome acción antes de que cierre el mes  

**Criterios de aceptación:**
- [ ] Al ejecutar pago sin factura → se crea registro en `alertas_factura`
- [ ] Deadline = MIN(fecha_pago + 7 días, último día del mes de pago)
- [ ] Cron diario actualiza nivel: PENDIENTE → POR_VENCER → VENCIDA
- [ ] Día 3 post-pago sin factura → notificación interna + correo al Tesorero
- [ ] Con ≤2 días para deadline → notificación diaria a Tesorero y Admin
- [ ] Al vencer → notificación inmediata + correo a Director y Admin
- [ ] Dashboard muestra contador de alertas activas por nivel

---

### HU-021 · Centro de notificaciones in-app
**Como** cualquier usuario  
**Quiero** ver mis notificaciones dentro del sistema  
**Para** enterarme de cambios en las requisiciones que me conciernen  

**Criterios de aceptación:**
- [ ] Ícono de campana en el header con contador de no leídas
- [ ] Panel lateral con lista de notificaciones ordenadas por fecha
- [ ] Cada notificación muestra: tipo, título, mensaje, fecha
- [ ] Click en notificación → navega al detalle de la requisición
- [ ] Marcar como leída individual o "Marcar todas como leídas"
- [ ] Notificaciones de los últimos 30 días

---

### HU-022 · Notificaciones por correo electrónico
**Como** sistema  
**Quiero** enviar correos automáticos en cada transición de estatus  
**Para** que los usuarios actúen sin tener que entrar al sistema constantemente  

**Criterios de aceptación:**
- [ ] Plantillas de correo para cada evento:
  - Nueva requisición enviada → Director
  - Requisición aprobada → Operario + Tesorero
  - Requisición rechazada → Operario (con motivo)
  - Pago ejecutado → Operario (con folio bancario)
  - Recordatorio factura (día 3) → Tesorero
  - Alerta factura por vencer → Tesorero + Admin
  - Factura vencida → Director + Admin
- [ ] Correos en español con diseño institucional (logo Grupo CSI)
- [ ] Enlace directo a la requisición en el correo

---

## ÉPICA 7: Vista Global y Reportes

### HU-023 · Dashboard de CxP (Admin/Director/Tesorero)
**Como** usuario con rol avanzado  
**Quiero** ver un resumen ejecutivo del estado de todas las cuentas por pagar  
**Para** tomar decisiones informadas  

**Criterios de aceptación:**
- [ ] Tarjetas KPI: total por aprobar, por pagar, pagado del mes, alertas activas
- [ ] Gráfica de gastos por empresa del mes actual
- [ ] Gráfica de gastos por clasificación
- [ ] Tabla de últimas 10 requisiciones con estatus
- [ ] Filtro por empresa y por período

---

### HU-024 · Vista global de requisiciones
**Como** usuario con rol avanzado  
**Quiero** ver todas las requisiciones con filtros avanzados  
**Para** consultar cualquier gasto del historial  

**Criterios de aceptación:**
- [ ] Tabla con todas las requisiciones
- [ ] Filtros: empresa, proyecto/CC, proveedor, clasificación, estatus, período, solicitante
- [ ] Búsqueda por folio, concepto o proveedor
- [ ] Paginación (25 por página)
- [ ] Al hacer clic → detalle completo con historial de cambios
- [ ] Exportar a Excel el resultado filtrado

---

### HU-025 · Exportación a Excel
**Como** contador o director  
**Quiero** exportar los datos de CxP a Excel  
**Para** análisis externo o envío a auditoría  

**Criterios de aceptación:**
- [ ] Exporta el resultado de los filtros activos
- [ ] Columnas: folio, fecha, solicitante, empresa generadora, empresa paga, proveedor, CC, proyecto, concepto, clasificación, moneda, importe sin IVA, IVA, total, estatus, folio bancario, fecha pago, tiene factura
- [ ] Formato compatible con el Excel de PAGOS_GENERALES actual
- [ ] Nombre del archivo: `CxP_[empresa]_[periodo]_[fecha].xlsx`

---

## ÉPICA 8: Conciliación Bancaria (Fase 2)

### HU-026 · Carga de estado de cuenta bancario
**Como** tesorero  
**Quiero** subir el estado de cuenta de cada banco  
**Para** conciliarlo contra los pagos registrados en el sistema  

**Criterios de aceptación:**
- [ ] Soporte para archivos Excel/CSV de: Santander, BBVA, HSBC, Banregio
- [ ] Parser específico por banco (cada banco tiene diferente formato)
- [ ] Vista previa de los movimientos antes de confirmar la carga
- [ ] Detección de duplicados (mismo banco + fecha + monto + referencia)
- [ ] Al confirmar → movimientos se guardan en `movimientos_bancarios`

---

### HU-027 · Conciliación automática CxP vs Banco
**Como** contador  
**Quiero** que el sistema cruce automáticamente los pagos contra los movimientos bancarios  
**Para** identificar qué está conciliado y qué no  

**Criterios de aceptación:**
- [ ] Matching por: monto exacto + fecha ±3 días + referencia bancaria
- [ ] Matching alternativo: monto + folio bancario
- [ ] Resultado por movimiento: ✅ Conciliado / ⚠️ Parcial / ❌ Sin conciliar
- [ ] Conciliación manual para casos que el automático no resuelve
- [ ] Dashboard con totales: conciliado, pendiente, diferencia

---

## ÉPICA 9: Conciliación SAT (Fase 3)

### HU-028 · Carga de CFDIs del SAT
**Como** contador  
**Quiero** cargar las facturas emitidas y recibidas del SAT  
**Para** validar que todos los gastos tienen soporte fiscal  

**Criterios de aceptación:**
- [ ] Carga de XMLs de CFDI (masiva en ZIP o individual)
- [ ] Carga de reporte CSV/Excel del portal SAT
- [ ] Extracción automática de: UUID, RFC emisor/receptor, monto, fecha
- [ ] Validación de estatus SAT (Vigente/Cancelado)

---

### HU-029 · Conciliación triple CxP + Banco + SAT
**Como** contador  
**Quiero** ver la conciliación de los tres orígenes en un solo dashboard  
**Para** tener la visión completa del cierre contable del mes  

**Criterios de aceptación:**
- [ ] Dashboard por empresa y período
- [ ] Semáforo por requisición: verde (3/3 conciliado), amarillo (2/3), rojo (1/3 o menos)
- [ ] Reporte de partidas abiertas con descripción del motivo
- [ ] Exportación del reporte de conciliación a Excel

---

## Prioridad del backlog (Fase 1)

| Prioridad | Historia | Sprint | Estado |
|-----------|----------|--------|--------|
| 🔴 Must | HU-001, HU-002 | Sprint 1 | COMPLETADO |
| 🔴 Must | HU-003, HU-004, HU-005, HU-006, HU-007, HU-008 | Sprint 1 | COMPLETADO |
| 🔴 Must | HU-009, HU-010 | Sprint 2 | COMPLETADO |
| 🔴 Must | HU-013, HU-014, HU-015 | Sprint 2 | COMPLETADO |
| 🔴 Must | HU-016, HU-017, HU-018 | Sprint 3 | COMPLETADO |
| 🟡 Should | HU-011, HU-012, HU-019 | Sprint 3 | COMPLETADO |
| 🟡 Should | HU-020, HU-021, HU-022 | Sprint 4 | COMPLETADO |
| 🟡 Should | HU-023, HU-024 | Sprint 4 | COMPLETADO |
| 🟢 Could | HU-025 | Sprint 4 | COMPLETADO |
| 🔴 Must | HU-030, HU-031, HU-032, HU-033, HU-034, HU-035 | Sprint 5 | EN PROGRESO |
| 🔴 Must | HU-036 | Sprint 6 | COMPLETADO |
| 🔴 Must | HU-037 | Sprint 6 | COMPLETADO |
| ⬜ Fase 2 | HU-026, HU-027 | Fase 2 | PENDIENTE |
| ⬜ Fase 3 | HU-028, HU-029 | Fase 3 | PENDIENTE |

---

## SPRINT 5 — Integraciones, Storage y Mejoras

### HU-030 · Subida de archivos a Supabase Storage
**Como** operario o tesorero
**Quiero** adjuntar archivos reales (facturas PDF/XML, comprobantes bancarios)
**Para** que queden almacenados en el sistema y disponibles para consulta

**Criterios de aceptacion:**
- [ ] Bucket `facturas` y `comprobantes` en Supabase Storage
- [ ] En formulario de nueva requisicion: input file para adjuntar factura (PDF/XML)
- [ ] En pantalla de facturas: subida real de archivo a Storage
- [ ] En pantalla de pagos (ejecutar): subida real de comprobante bancario
- [ ] Visualizacion/descarga de archivos adjuntos en detalle de requisicion
- [ ] Validacion de tipo de archivo (solo PDF, XML) y tamano max 10MB

---

### HU-031 · Notificaciones por email con Resend
**Como** sistema
**Quiero** enviar correos automaticos en cada transicion de estatus
**Para** que los usuarios actuen sin tener que entrar al sistema constantemente

**Criterios de aceptacion:**
- [ ] Configurar Resend con API key
- [ ] Plantilla base HTML con diseno institucional
- [ ] Email: requisicion enviada para aprobacion -> Director
- [ ] Email: requisicion aprobada -> Operario + Tesorero
- [ ] Email: requisicion rechazada -> Operario (con motivo)
- [ ] Email: pago ejecutado -> Operario
- [ ] Email: alerta factura por vencer -> Tesorero + Admin
- [ ] Email: factura vencida -> Director + Admin
- [ ] Enlace directo a la requisicion en cada correo

---

### HU-032 · Proteccion del cron de alertas
**Como** sistema
**Quiero** que el endpoint /api/cron/alertas este protegido con un secret
**Para** que solo Vercel Cron pueda ejecutarlo

**Criterios de aceptacion:**
- [ ] Variable CRON_SECRET en .env.local
- [ ] Validacion de Authorization header en el endpoint
- [ ] Documentacion de configuracion en Vercel

---

### HU-033 · Paginacion en tablas
**Como** usuario
**Quiero** que las tablas con muchos registros tengan paginacion
**Para** que la navegacion sea fluida incluso con cientos de requisiciones

**Criterios de aceptacion:**
- [ ] Componente reutilizable de paginacion
- [ ] Paginacion en: requisiciones, reportes, notificaciones
- [ ] 25 registros por pagina
- [ ] Indicador "Mostrando X-Y de Z"

---

### HU-034 · Graficas en dashboard
**Como** director o admin
**Quiero** ver graficas de tendencia en el dashboard
**Para** tomar decisiones basadas en datos visuales

**Criterios de aceptacion:**
- [ ] Grafica de barras: gastos por empresa del mes actual
- [ ] Grafica de linea: requisiciones por mes (ultimos 6 meses)
- [ ] Grafica de dona: distribucion por clasificacion de gasto
- [ ] Filtro por periodo

---

### HU-036 · Bitacora de auditoria (Admin)
**Como** administrador
**Quiero** ver un registro completo de todas las acciones realizadas en el sistema
**Para** tener trazabilidad y control sobre la operacion

**Criterios de aceptacion:**
- [x] Tabla `bitacora` en base de datos con indices y RLS
- [x] Servicio reutilizable `registrarAccion()` en `src/lib/auditoria.ts`
- [x] Registro de acciones en todas las server actions: requisiciones, aprobaciones, pagos, facturas, catalogos, usuarios, cargas masivas
- [x] Pantalla `/admin/auditoria` con tabla, filtros, paginacion y exportacion
- [x] KPIs: acciones hoy, fallidas, usuario mas activo, modulo mas activo
- [x] Drawer lateral con detalle completo incluyendo datos anteriores vs nuevos
- [x] Filtros: rango de fechas, usuario, modulo, accion, resultado
- [x] Busqueda por descripcion o entidad
- [x] Exportar a CSV
- [x] Solo accesible para rol admin

---

### HU-037 · Configuracion SAT en catalogo de empresas
**Como** administrador
**Quiero** configurar la e.firma (certificado y clave privada SAT) de cada empresa
**Para** preparar la integracion con el SAT en fases futuras

**Criterios de aceptacion:**
- [x] Columnas SAT en tabla empresas (sat_cert_url, sat_key_url, sat_password_encrypted, sat_configurado)
- [x] Bucket privado 'sat-certs' en Supabase Storage con RLS solo admin
- [x] Campo RFC con validacion de formato mexicano
- [x] Upload de archivo .cer y .key al bucket privado
- [x] Contrasena encriptada con AES-256-GCM antes de guardar
- [x] Badge "SAT Configurado" / "SAT Pendiente" en tabla de empresas
- [x] Dialog separado para configuracion SAT con icono Shield
- [x] Archivos no descargables, solo reemplazables
- [x] Toggle mostrar/ocultar contrasena
- [x] Aviso de confidencialidad
- [x] Registro en bitacora de auditoria
- [x] Solo accesible para rol admin

---

### HU-035 · Cambio de contrasenas pre-produccion
**Como** administrador del sistema
**Quiero** cambiar todas las contrasenas y keys antes de salir a produccion
**Para** garantizar la seguridad del sistema

**Criterios de aceptacion:**
- [ ] Cambiar contrasena de usuario admin
- [ ] Rotar Supabase API keys si es necesario
- [ ] Configurar RESEND_API_KEY de produccion
- [ ] Configurar CRON_SECRET de produccion
- [ ] Verificar que .env.local no se suba al repositorio
