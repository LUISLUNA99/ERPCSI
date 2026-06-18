# Testing — Modulo SAT (HU-036, HU-037, HU-038, HU-038b)

## Pre-requisitos
- [ ] Variables de entorno configuradas en Vercel:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`
  - `SAT_ENCRYPTION_KEY`
  - `CRON_SECRET`
- [ ] Al menos una empresa con e.firma configurada (sat_configurado = true)
- [ ] Usuario admin logueado

---

## HU-036 — Bitacora de Auditoria

### Verificar acceso
- [ ] Admin puede acceder a /admin/auditoria
- [ ] Otros roles NO pueden acceder (redirige a /sin-permisos)

### Verificar registro
- [ ] Crear una requisicion -> verificar que aparece en bitacora
- [ ] Aprobar/rechazar -> verificar registro
- [ ] CRUD de catalogos -> verificar registro
- [ ] Carga masiva CSV -> verificar registro

### Verificar UI
- [ ] KPIs muestran totales correctos
- [ ] Filtros por modulo, usuario, fecha funcionan
- [ ] Click en fila abre Sheet con detalle (datos anteriores vs nuevos)
- [ ] Exportar CSV descarga archivo correcto
- [ ] Paginacion funciona (50 por pagina)

---

## HU-037 — Configuracion SAT

### Verificar acceso
- [ ] Solo admin ve el boton Shield en tabla de empresas
- [ ] Dialog de configuracion SAT abre correctamente

### Verificar configuracion
- [ ] Subir archivo .cer -> se guarda en bucket sat-certs
- [ ] Subir archivo .key -> se guarda en bucket sat-certs
- [ ] Ingresar contrasena -> se encripta (no visible en DB)
- [ ] RFC valida formato mexicano (3-4 letras + 6 digitos + 3 alfanum)
- [ ] Badge cambia de "SAT Pendiente" a "SAT Configurado"
- [ ] Toggle mostrar/ocultar contrasena funciona
- [ ] Re-configurar reemplaza archivos anteriores

### Verificar seguridad
- [ ] Bucket sat-certs NO es accesible publicamente
- [ ] Password en DB esta encriptada (formato iv:authTag:encrypted)
- [ ] Accion registrada en bitacora

---

## HU-038 — SAT Descarga Masiva (Backend)

### Verificar servicio de solicitud
- [ ] solicitarDescarga crea registro en sat_solicitudes con estatus 'pendiente'
- [ ] id_solicitud_sat se guarda correctamente
- [ ] mes_periodo y anio_periodo se guardan

### Verificar servicio de verificacion
- [ ] verificarSolicitud consulta al SAT y actualiza estatus
- [ ] Reintento (3 veces con delay) funciona en caso de timeout
- [ ] Mapeo de estatus SAT: Finished -> 'lista', InProgress -> 'verificando', Failure -> 'error'

### Verificar procesamiento
- [ ] procesarPaquetes descarga ZIPs y extrae XMLs
- [ ] CFDIs se insertan en cfdi_sat con UUID unico (upsert)
- [ ] Datos parseados correctamente: UUID, RFC, montos, IVA
- [ ] fecha_completada y duracion_segundos se guardan al terminar
- [ ] Notificacion creada para solicitante al completar
- [ ] Notificacion creada para admins al fallar

### Verificar cron
- [ ] GET /api/cron/sat sin auth -> 401
- [ ] GET /api/cron/sat con Bearer CRON_SECRET -> procesa solicitudes
- [ ] Solicitudes pendiente/verificando -> se verifican
- [ ] Solicitudes lista -> se procesan

---

## HU-038b — Interfaz SAT

### Verificar acceso
- [ ] Admin puede acceder a /conciliacion/sat
- [ ] Tesorero puede acceder a /conciliacion/sat
- [ ] Otros roles NO pueden acceder

### Seccion 1 — Nueva solicitud
- [ ] Si ninguna empresa tiene SAT -> muestra alerta amarilla
- [ ] Selector empresa solo muestra las que tienen sat_configurado = true
- [ ] Selector periodo muestra meses del anio actual hasta el mes en curso
- [ ] Mes actual tiene badge "Mes en curso"
- [ ] Al solicitar sin duplicado -> toast de exito
- [ ] Al solicitar con duplicado -> dialog de confirmacion
- [ ] "Si, descargar de nuevo" envia solicitud correctamente

### Seccion 2 — Carga historica
- [ ] Aparece SOLO cuando empresa no tiene solicitudes
- [ ] Tabla muestra meses ENE hasta mes actual
- [ ] Badges se actualizan segun estatus de solicitudes
- [ ] "Solicitar todas" encola solicitudes secuencialmente
- [ ] Nota informativa visible sobre tiempos del SAT
- [ ] Seccion desaparece cuando hay solicitudes

### Seccion 3 — KPIs
- [ ] Aparecen al seleccionar empresa + periodo
- [ ] Cuentas correctas de emitidos y recibidos
- [ ] Montos formateados como $XXX,XXX.XX MXN
- [ ] Pendientes de conciliar resaltado en ambar si > 0
- [ ] Cancelados resaltado en rojo si > 0

### Seccion 4 — Seguimiento
- [ ] Tabla muestra solicitudes de la empresa seleccionada
- [ ] Badge "Verificando..." tiene spinner animado
- [ ] Descargando muestra progreso X/Y paquetes
- [ ] Error muestra mensaje truncado con tooltip
- [ ] Boton "Ver CFDIs" filtra y scrollea a seccion 5
- [ ] Boton "Reintentar" cambia estatus de error a pendiente
- [ ] Auto-refresh cada 30s cuando hay solicitudes activas
- [ ] Boton "Actualizar" funciona manualmente

### Seccion 5 — CFDIs
- [ ] Tabla paginada a 50 por pagina
- [ ] Filtros: tipo, RFC emisor, RFC receptor, estatus SAT, conciliado
- [ ] Buscar por RFC funciona (busqueda parcial)
- [ ] Filas con Cancelado tienen fondo rojo claro
- [ ] UUID truncado con tooltip del completo
- [ ] Exportar Excel descarga CSV con todos los datos
- [ ] Paginacion anterior/siguiente funciona

### Historial SAT (/conciliacion/sat/historial)
- [ ] KPIs: solicitudes del anio, total CFDIs, ultima descarga, proxima recomendada
- [ ] Proxima descarga calcula correctamente el mes siguiente
- [ ] Filtros: empresa, anio, mes, tipo, estatus
- [ ] Buscar y limpiar filtros funcionan
- [ ] Click en fila abre Sheet drawer
- [ ] Drawer muestra info general en grid
- [ ] Drawer muestra timeline con dots de colores y fechas
- [ ] Error muestra panel rojo con mensaje
- [ ] Duracion calculada correctamente

### Sidebar
- [ ] Seccion "Conciliacion" visible para admin y tesorero
- [ ] Sub-items: SAT, Historial SAT, Bancaria
- [ ] Iconos correctos (GitCompareArrows, FileCheck, History, Landmark)
- [ ] Links navegan a las rutas correctas

---

## Notas para QA
- El SAT puede tardar horas en responder; para testing rapido, verificar que las solicitudes se crean y el cron las procesa
- La descarga real requiere una e.firma valida (.cer, .key, password)
- Para probar sin SAT real: crear registros manuales en sat_solicitudes con estatus 'completada' y datos en cfdi_sat
- El auto-refresh de la tabla de solicitudes es cada 30 segundos
- Los emails requieren que SMTP este configurado en Vercel
