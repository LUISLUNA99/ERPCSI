'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { obtenerHistorial } from '@/app/actions/sat/obtener-historial.actions'
import { verificarYProcesarSolicitud } from '@/app/actions/sat/verificar-y-procesar.actions'
import { reintentarSolicitud } from '@/app/actions/sat/obtener-solicitudes.actions'
import { FileCheck, Clock, Building2, Calendar, Download, FileText, RefreshCw, AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import { useSort } from '@/hooks/useSort'
import { SortableHeader } from '@/components/SortableHeader'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Empresa {
  id: string
  codigo: string
  nombre: string
  sat_configurado?: boolean
}

interface SolicitudHistorial {
  id: string
  empresa_id: string
  tipo: string
  mes_periodo: string
  anio_periodo: number
  estatus: string
  total_cfdi: number | null
  total_paquetes: number | null
  formato: string | null
  solicitado_por_id: string
  fecha_verificacion: string | null
  fecha_lista: string | null
  fecha_descarga_inicio: string | null
  fecha_completada: string | null
  mensaje_error: string | null
  created_at: string
  updated_at: string
  empresas: { codigo: string; nombre: string } | null
  perfiles: { nombre: string } | null
}

interface KPIs {
  totalSolicitudes: number
  totalCFDIs: number
  ultimaDescarga: { empresa: string; fecha: string } | null
  empresas: Empresa[]
}

const MESES = [
  { value: 'ENE', label: 'Enero' },
  { value: 'FEB', label: 'Febrero' },
  { value: 'MAR', label: 'Marzo' },
  { value: 'ABR', label: 'Abril' },
  { value: 'MAY', label: 'Mayo' },
  { value: 'JUN', label: 'Junio' },
  { value: 'JUL', label: 'Julio' },
  { value: 'AGO', label: 'Agosto' },
  { value: 'SEP', label: 'Septiembre' },
  { value: 'OCT', label: 'Octubre' },
  { value: 'NOV', label: 'Noviembre' },
  { value: 'DIC', label: 'Diciembre' },
]

const ESTATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-gray-100 text-gray-700' },
  verificando: { label: 'Verificando', className: 'bg-blue-100 text-blue-700' },
  lista: { label: 'Lista', className: 'bg-yellow-100 text-yellow-700' },
  descargando: { label: 'Descargando', className: 'bg-blue-100 text-blue-700' },
  completada: { label: 'Completada', className: 'bg-green-100 text-green-700' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700' },
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return '-'
  const d = new Date(fecha)
  const dia = d.getDate()
  const mesCorto = d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')
  const año = d.getFullYear()
  const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  return `${dia} ${mesCorto} ${año}, ${hora}`
}

function formatFechaCorta(fecha: string | null): string {
  if (!fecha) return '-'
  const d = new Date(fecha)
  const dia = d.getDate()
  const mesCorto = d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')
  const año = d.getFullYear()
  return `${dia} ${mesCorto} ${año}`
}

function calcularDuracion(inicio: string | null, fin: string | null): string {
  if (!inicio || !fin) return '-'
  const diff = new Date(fin).getTime() - new Date(inicio).getTime()
  const minutos = Math.floor(diff / 60000)
  const segundos = Math.floor((diff % 60000) / 1000)
  if (minutos === 0) return `${segundos} seg`
  return `${minutos} min ${segundos} seg`
}

function obtenerProximaDescarga(): string {
  const hoy = new Date()
  const mesActualIdx = hoy.getMonth()
  const añoActual = hoy.getFullYear()

  const siguienteMesIdx = (mesActualIdx + 1) % 12
  const añoSiguiente = mesActualIdx === 11 ? añoActual + 1 : añoActual

  const nombreMesSiguiente = MESES[siguienteMesIdx].label.toLowerCase()
  const nombreMesActual = MESES[mesActualIdx].label.toLowerCase()

  return `1 de ${nombreMesSiguiente} ${añoSiguiente} — facturas de ${nombreMesActual}`
}

function generarAños(): number[] {
  const actual = new Date().getFullYear()
  const años: number[] = []
  for (let i = actual; i >= actual - 5; i--) {
    años.push(i)
  }
  return años
}

export function HistorialSATClient({
  historial: historialInicial,
  kpis,
}: {
  historial: SolicitudHistorial[]
  kpis: KPIs
}) {
  const [historial, setHistorial] = useState<SolicitudHistorial[]>(historialInicial)
  const [loading, setLoading] = useState(false)
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudHistorial | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [verificandoId, setVerificandoId] = useState<string | null>(null)

  const { sorted, sortConfig, handleSort } = useSort(historial)

  // Filtros
  const [empresaId, setEmpresaId] = useState<string>('')
  const [año, setAño] = useState<string>('')
  const [mesPeriodo, setMesPeriodo] = useState<string>('')
  const [tipo, setTipo] = useState<string>('')
  const [estatus, setEstatus] = useState<string>('')

  async function aplicarFiltros() {
    setLoading(true)
    try {
      const filtros: {
        empresaId?: string
        año?: number
        mesPeriodo?: string
        tipo?: string
        estatus?: string
      } = {}
      if (empresaId) filtros.empresaId = empresaId
      if (año) filtros.año = parseInt(año)
      if (mesPeriodo) filtros.mesPeriodo = mesPeriodo
      if (tipo) filtros.tipo = tipo
      if (estatus) filtros.estatus = estatus

      const data = await obtenerHistorial(Object.keys(filtros).length > 0 ? filtros : undefined)
      setHistorial(data as SolicitudHistorial[])
    } finally {
      setLoading(false)
    }
  }

  function limpiarFiltros() {
    setEmpresaId('')
    setAño('')
    setMesPeriodo('')
    setTipo('')
    setEstatus('')
    setLoading(true)
    obtenerHistorial().then((data) => {
      setHistorial(data as SolicitudHistorial[])
      setLoading(false)
    })
  }

  function abrirDetalle(solicitud: SolicitudHistorial) {
    setSelectedSolicitud(solicitud)
    setSheetOpen(true)
  }

  async function handleVerificar(e: React.MouseEvent, solicitudId: string) {
    e.stopPropagation()
    setVerificandoId(solicitudId)
    try {
      const result = await verificarYProcesarSolicitud(solicitudId)
      if (result.estatus === 'completada') {
        toast.success(`Descarga completada: ${result.cfdisProcesados ?? result.totalCfdi ?? 0} CFDIs procesados`)
      } else if (result.estatus === 'verificando') {
        toast.info('El SAT aun esta preparando los paquetes. Tiempo estimado: 1-24 horas.')
      } else if (result.estatus === 'error') {
        toast.error(result.error || 'Error al verificar la solicitud')
      } else if (result.estatus === 'lista') {
        toast.success('Paquetes listos. Iniciando descarga...')
      } else {
        toast.info('Solicitud actualizada')
      }
      aplicarFiltros()
    } catch {
      toast.error('Error al consultar el SAT')
    } finally {
      setVerificandoId(null)
    }
  }

  async function handleReintentar(e: React.MouseEvent, solicitudId: string) {
    e.stopPropagation()
    const result = await reintentarSolicitud(solicitudId)
    if ('error' in result) toast.error(result.error)
    else { toast.success('Solicitud reenviada'); aplicarFiltros() }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de descargas SAT"
        description="Registro de todas las solicitudes de descarga de CFDIs del SAT"
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Solicitudes del anio
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#1B3A6B' }}>
              {kpis.totalSolicitudes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Anio {new Date().getFullYear()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total CFDIs descargados
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#1B3A6B' }}>
              {new Intl.NumberFormat('es-MX').format(kpis.totalCFDIs)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Acumulado historico</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ultima descarga
            </CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#1B3A6B' }}>
              {kpis.ultimaDescarga ? kpis.ultimaDescarga.empresa : 'Sin descargas'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.ultimaDescarga ? formatFechaCorta(kpis.ultimaDescarga.fecha) : '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Proxima descarga recomendada
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold" style={{ color: '#2563EB' }}>
              {obtenerProximaDescarga()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-48">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Empresa</label>
              <Select value={empresaId} onValueChange={setEmpresaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  {kpis.empresas.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.codigo} - {emp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-32">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Anio</label>
              <Select value={año} onValueChange={setAño}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {generarAños().map((a) => (
                    <SelectItem key={a} value={a.toString()}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Mes</label>
              <Select value={mesPeriodo} onValueChange={setMesPeriodo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo</label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emitidas">Emitidas</SelectItem>
                  <SelectItem value="recibidas">Recibidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Estatus</label>
              <Select value={estatus} onValueChange={setEstatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ESTATUS_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={aplicarFiltros}
              disabled={loading}
              className="text-white"
              style={{ backgroundColor: '#2563EB' }}
            >
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
              Buscar
            </Button>

            <Button variant="outline" onClick={limpiarFiltros} disabled={loading}>
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-6">
          {historial.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No se encontraron solicitudes</p>
              <p className="text-gray-400 text-sm mt-1">
                Ajusta los filtros o realiza una nueva descarga desde la pagina principal
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader label="Empresa" sortKey="empresas.nombre" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Periodo" sortKey="anio_periodo" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Tipo" sortKey="tipo" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="CFDIs" sortKey="total_cfdi" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                    <SortableHeader label="Paquetes" sortKey="total_paquetes" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
                    <SortableHeader label="Estatus" sortKey="estatus" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Solicitado por" sortKey="perfiles.nombre" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Fecha solicitud" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} />
                    <SortableHeader label="Fecha completada" sortKey="fecha_completada" sortConfig={sortConfig} onSort={handleSort} />
                    <TableHead>Duracion</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((solicitud) => {
                    const estatusCfg = ESTATUS_CONFIG[solicitud.estatus] || {
                      label: solicitud.estatus,
                      className: 'bg-gray-100 text-gray-700',
                    }
                    return (
                      <TableRow
                        key={solicitud.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => abrirDetalle(solicitud)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            {solicitud.empresas?.codigo || '-'} - {solicitud.empresas?.nombre || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {solicitud.mes_periodo}-{solicitud.anio_periodo}
                        </TableCell>
                        <TableCell className="capitalize">{solicitud.tipo}</TableCell>
                        <TableCell className="text-right">
                          {solicitud.total_cfdi != null
                            ? new Intl.NumberFormat('es-MX').format(solicitud.total_cfdi)
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {solicitud.total_paquetes ?? '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={estatusCfg.className}>
                            {estatusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{solicitud.perfiles?.nombre || '-'}</TableCell>
                        <TableCell>{formatFecha(solicitud.created_at)}</TableCell>
                        <TableCell>{formatFecha(solicitud.fecha_completada)}</TableCell>
                        <TableCell>
                          {calcularDuracion(solicitud.created_at, solicitud.fecha_completada)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {(solicitud.estatus === 'pendiente' || solicitud.estatus === 'verificando') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => handleVerificar(e, solicitud.id)}
                                disabled={verificandoId === solicitud.id}
                                className={solicitud.estatus === 'verificando' ? 'border-blue-300 text-blue-700' : ''}
                              >
                                {verificandoId === solicitud.id ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Consultando...</> : <><RefreshCw className="h-3 w-3 mr-1" />Verificar</>}
                              </Button>
                            )}
                            {solicitud.estatus === 'lista' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => handleVerificar(e, solicitud.id)}
                                disabled={verificandoId === solicitud.id}
                                className="border-green-300 text-green-700"
                              >
                                {verificandoId === solicitud.id ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Descargando...</> : <><Download className="h-3 w-3 mr-1" />Descargar</>}
                              </Button>
                            )}
                            {solicitud.estatus === 'descargando' && (
                              <span className="inline-flex items-center text-xs text-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />En proceso</span>
                            )}
                            {solicitud.estatus === 'error' && (
                              <Button variant="ghost" size="sm" onClick={(e) => handleReintentar(e, solicitud.id)} className="text-red-600">
                                <RotateCcw className="h-3 w-3 mr-1" />Reintentar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheet de detalle */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedSolicitud && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg" style={{ color: '#1B3A6B' }}>
                  Detalle de solicitud
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Info general */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Informacion general
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Empresa</p>
                      <p className="text-sm font-medium">
                        {selectedSolicitud.empresas?.codigo} - {selectedSolicitud.empresas?.nombre}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tipo</p>
                      <p className="text-sm font-medium capitalize">{selectedSolicitud.tipo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Periodo</p>
                      <p className="text-sm font-medium">
                        {selectedSolicitud.mes_periodo}-{selectedSolicitud.anio_periodo}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Formato</p>
                      <p className="text-sm font-medium uppercase">
                        {selectedSolicitud.formato || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total CFDIs</p>
                      <p className="text-sm font-medium">
                        {selectedSolicitud.total_cfdi != null
                          ? new Intl.NumberFormat('es-MX').format(selectedSolicitud.total_cfdi)
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total paquetes</p>
                      <p className="text-sm font-medium">
                        {selectedSolicitud.total_paquetes ?? '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Solicitado por</p>
                      <p className="text-sm font-medium">
                        {selectedSolicitud.perfiles?.nombre || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Estatus</p>
                      <Badge
                        variant="secondary"
                        className={
                          (ESTATUS_CONFIG[selectedSolicitud.estatus] || ESTATUS_CONFIG.pendiente)
                            .className
                        }
                      >
                        {(ESTATUS_CONFIG[selectedSolicitud.estatus] || { label: selectedSolicitud.estatus }).label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Error message if any */}
                {selectedSolicitud.estatus === 'error' && selectedSolicitud.mensaje_error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Error en la solicitud</p>
                        <p className="text-sm text-red-700 mt-1">{selectedSolicitud.mensaje_error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Linea de tiempo
                  </h3>
                  <div className="relative space-y-0">
                    {/* Solicitado */}
                    <TimelineStep
                      label="Solicitado"
                      fecha={selectedSolicitud.created_at}
                      completed={true}
                      color="blue"
                      isLast={false}
                    />

                    {/* Verificando */}
                    <TimelineStep
                      label="Verificando"
                      fecha={selectedSolicitud.fecha_verificacion}
                      completed={!!selectedSolicitud.fecha_verificacion}
                      color="blue"
                      isLast={false}
                      active={selectedSolicitud.estatus === 'verificando'}
                    />

                    {/* Lista para descargar */}
                    <TimelineStep
                      label="Lista para descargar"
                      fecha={selectedSolicitud.fecha_lista}
                      completed={!!selectedSolicitud.fecha_lista}
                      color="yellow"
                      isLast={false}
                      active={selectedSolicitud.estatus === 'lista'}
                    />

                    {/* Descargando */}
                    <TimelineStep
                      label="Descargando"
                      fecha={selectedSolicitud.fecha_descarga_inicio}
                      completed={!!selectedSolicitud.fecha_descarga_inicio}
                      color="blue"
                      isLast={false}
                      active={selectedSolicitud.estatus === 'descargando'}
                    />

                    {/* Completada o Error */}
                    {selectedSolicitud.estatus === 'error' ? (
                      <TimelineStep
                        label="Error"
                        fecha={selectedSolicitud.updated_at}
                        completed={true}
                        color="red"
                        isLast={true}
                      />
                    ) : (
                      <TimelineStep
                        label="Completada"
                        fecha={selectedSolicitud.fecha_completada}
                        completed={!!selectedSolicitud.fecha_completada}
                        color="green"
                        isLast={true}
                        extra={
                          selectedSolicitud.fecha_completada
                            ? `Duracion: ${calcularDuracion(selectedSolicitud.created_at, selectedSolicitud.fecha_completada)}`
                            : undefined
                        }
                      />
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function TimelineStep({
  label,
  fecha,
  completed,
  color,
  isLast,
  active,
  extra,
}: {
  label: string
  fecha: string | null
  completed: boolean
  color: 'blue' | 'green' | 'yellow' | 'red'
  isLast: boolean
  active?: boolean
  extra?: string
}) {
  const dotColors: Record<string, string> = {
    blue: completed ? 'bg-blue-500' : 'bg-gray-300',
    green: completed ? 'bg-green-500' : 'bg-gray-300',
    yellow: completed ? 'bg-yellow-500' : 'bg-gray-300',
    red: completed ? 'bg-red-500' : 'bg-gray-300',
  }

  const dotClass = active
    ? `${dotColors[color].replace('bg-gray-300', `bg-${color}-500`)} animate-pulse`
    : dotColors[color]

  return (
    <div className="flex gap-3">
      {/* Dot and line */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full shrink-0 ${dotClass}`} />
        {!isLast && (
          <div className={`w-0.5 h-full min-h-[32px] ${completed ? 'bg-gray-300' : 'bg-gray-200'}`} />
        )}
      </div>

      {/* Content */}
      <div className="pb-4">
        <p className={`text-sm font-medium ${completed ? 'text-gray-900' : 'text-gray-400'}`}>
          {label}
          {active && (
            <span className="ml-2 text-xs text-blue-600 font-normal">En proceso...</span>
          )}
        </p>
        {fecha && (
          <p className="text-xs text-gray-500 mt-0.5">{formatFecha(fecha)}</p>
        )}
        {extra && (
          <p className="text-xs font-medium mt-0.5" style={{ color: '#2563EB' }}>
            {extra}
          </p>
        )}
      </div>
    </div>
  )
}
