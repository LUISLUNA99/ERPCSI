'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import {
  FileText, DollarSign, AlertTriangle, XCircle, Download, RefreshCw,
  Send, Loader2, Info, CheckCircle2, Clock, RotateCcw, Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { solicitarDescargaSAT, verificarDuplicado } from '@/app/actions/sat/solicitar-descarga.actions'
import { solicitarDescargaHistorica } from '@/app/actions/sat/solicitar-historico.actions'
import { obtenerSolicitudes, reintentarSolicitud } from '@/app/actions/sat/obtener-solicitudes.actions'
import { obtenerCFDIs, obtenerKPIsCFDI } from '@/app/actions/sat/obtener-cfdi.actions'
import { verificarYProcesarSolicitud } from '@/app/actions/sat/verificar-y-procesar.actions'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { useSort } from '@/hooks/useSort'
import { SortableHeader } from '@/components/SortableHeader'
import { obtenerAnaliticaSAT, type AnaliticaSAT } from '@/app/actions/sat/obtener-analitica.actions'
import { BarChart3 } from 'lucide-react'

interface Empresa {
  id: string
  codigo: string
  nombre: string
  sat_configurado: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SolicitudRow = Record<string, any>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CFDIRow = Record<string, any>

interface KPIs {
  totalEmitidos: number
  totalRecibidos: number
  sumaEmitidos: number
  sumaRecibidos: number
  pendientesConciliar: number
  cancelados: number
}

const MESES_NOMBRES: Record<string, string> = {
  ENE: 'Enero', FEB: 'Febrero', MAR: 'Marzo', ABR: 'Abril',
  MAY: 'Mayo', JUN: 'Junio', JUL: 'Julio', AGO: 'Agosto',
  SEP: 'Septiembre', OCT: 'Octubre', NOV: 'Noviembre', DIC: 'Diciembre',
}

const MESES_KEYS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']

const ESTATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pendiente: { label: 'Pendiente', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' },
  verificando: { label: 'Verificando...', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  lista: { label: 'Lista', className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' },
  descargando: { label: 'Descargando', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  completada: { label: 'Completada', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
}

const TIPO_COMPROBANTE_LABELS: Record<string, string> = {
  I: 'Ingreso',
  E: 'Egreso',
  T: 'Traslado',
  N: 'Nomina',
  P: 'Pago',
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)

function formatFecha(fecha: string | null): string {
  if (!fecha) return '-'
  const d = new Date(fecha)
  const dia = d.getDate()
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const m = meses[d.getMonth()]
  const y = d.getFullYear()
  const h = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${dia} ${m} ${y}, ${h}:${min}`
}

function formatDuracion(segundos: number | null): string {
  if (!segundos) return '-'
  if (segundos < 60) return `${segundos} seg`
  const mins = Math.floor(segundos / 60)
  const secs = segundos % 60
  return `${mins} min ${secs} seg`
}

export function SATClient({ empresas }: { empresas: Empresa[] }) {
  const empresasSAT = useMemo(() => empresas.filter((e) => e.sat_configurado), [empresas])

  const [selectedEmpresa, setSelectedEmpresa] = useState('')
  const [selectedPeriodo, setSelectedPeriodo] = useState('')
  const [tipo, setTipo] = useState<'emitidas' | 'recibidas'>('recibidas')
  const [formato, setFormato] = useState<'xml' | 'metadata'>('xml')
  const [submitting, setSubmitting] = useState(false)

  const [dupDialog, setDupDialog] = useState<{ open: boolean; fecha?: string }>({ open: false })

  const [historicoRunning, setHistoricoRunning] = useState(false)
  const [historicoProgress, setHistoricoProgress] = useState({ total: 0, enviadas: 0 })

  const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([])
  const [cfdis, setCfdis] = useState<CFDIRow[]>([])
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [cfdiTotal, setCfdiTotal] = useState(0)
  const [cfdiPage, setCfdiPage] = useState(1)
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false)
  const [loadingCfdis, setLoadingCfdis] = useState(false)

  const [cfdiTipo, setCfdiTipo] = useState('')
  const [cfdiRfcEmisor, setCfdiRfcEmisor] = useState('')
  const [cfdiRfcReceptor, setCfdiRfcReceptor] = useState('')
  const [cfdiEstatus, setCfdiEstatus] = useState('')
  const [cfdiConciliado, setCfdiConciliado] = useState('')

  const [verificandoId, setVerificandoId] = useState<string | null>(null)
  const [analitica, setAnalitica] = useState<AnaliticaSAT | null>(null)
  const [loadingAnalitica, setLoadingAnalitica] = useState(false)

  const { sorted: sortedSolicitudes, sortConfig: sortConfigSol, handleSort: handleSortSol } = useSort(solicitudes)
  const { sorted: sortedCfdis, sortConfig: sortConfigCfdi, handleSort: handleSortCfdi } = useSort(cfdis)

  const cfdisSection = useRef<HTMLDivElement>(null)

  const periodos = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    return MESES_KEYS.slice(0, month + 1).map((m) => ({
      value: `${m}-${year}`,
      label: `${MESES_NOMBRES[m]} ${year}`,
      esMesActual: MESES_KEYS.indexOf(m) === month,
    }))
  }, [])

  const cargarSolicitudes = useCallback(async () => {
    if (!selectedEmpresa) return
    setLoadingSolicitudes(true)
    try {
      const data = await obtenerSolicitudes({ empresaId: selectedEmpresa })
      setSolicitudes(data)
    } finally {
      setLoadingSolicitudes(false)
    }
  }, [selectedEmpresa])

  const cargarKPIs = useCallback(async () => {
    if (!selectedEmpresa || !selectedPeriodo) return
    const data = await obtenerKPIsCFDI(selectedEmpresa, selectedPeriodo)
    setKpis(data)
  }, [selectedEmpresa, selectedPeriodo])

  const cargarCFDIs = useCallback(async (page = 1) => {
    if (!selectedEmpresa) return
    setLoadingCfdis(true)
    try {
      const result = await obtenerCFDIs({
        empresaId: selectedEmpresa,
        mesPeriodo: selectedPeriodo || undefined,
        tipo: (cfdiTipo as 'EMITIDA' | 'RECIBIDA') || undefined,
        rfcEmisor: cfdiRfcEmisor || undefined,
        rfcReceptor: cfdiRfcReceptor || undefined,
        estatusSat: cfdiEstatus || undefined,
        conciliado: cfdiConciliado === 'si' ? true : cfdiConciliado === 'no' ? false : undefined,
        page,
      })
      setCfdis(result.data as CFDIRow[])
      setCfdiTotal(result.total)
      setCfdiPage(page)
    } finally {
      setLoadingCfdis(false)
    }
  }, [selectedEmpresa, selectedPeriodo, cfdiTipo, cfdiRfcEmisor, cfdiRfcReceptor, cfdiEstatus, cfdiConciliado])

  useEffect(() => {
    if (selectedEmpresa) {
      cargarSolicitudes()
      cargarCFDIs(1)
    }
  }, [selectedEmpresa, cargarSolicitudes, cargarCFDIs])

  useEffect(() => {
    if (selectedEmpresa && selectedPeriodo) {
      cargarKPIs()
      setLoadingAnalitica(true)
      obtenerAnaliticaSAT(selectedEmpresa, selectedPeriodo)
        .then(setAnalitica)
        .finally(() => setLoadingAnalitica(false))
    } else {
      setAnalitica(null)
    }
  }, [selectedEmpresa, selectedPeriodo, cargarKPIs])

  // Auto-refresh for active solicitudes
  useEffect(() => {
    const hasActive = solicitudes.some((s) =>
      ['pendiente', 'verificando', 'lista', 'descargando'].includes(s.estatus)
    )
    if (!hasActive) return
    const interval = setInterval(() => {
      cargarSolicitudes()
      if (selectedPeriodo) cargarKPIs()
    }, 30000)
    return () => clearInterval(interval)
  }, [solicitudes, cargarSolicitudes, cargarKPIs, selectedPeriodo])

  const tieneHistorico = solicitudes.length > 0

  async function handleSolicitar(skipDupCheck = false) {
    if (!selectedEmpresa || !selectedPeriodo) {
      toast.error('Selecciona una empresa y un periodo')
      return
    }
    if (!skipDupCheck) {
      const dup = await verificarDuplicado(selectedEmpresa, selectedPeriodo, tipo)
      if (dup.existe) {
        setDupDialog({ open: true, fecha: dup.fecha })
        return
      }
    }
    setSubmitting(true)
    try {
      const result = await solicitarDescargaSAT({ empresaId: selectedEmpresa, tipo, mesPeriodo: selectedPeriodo, formato, forzar: skipDupCheck })
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Solicitud enviada al SAT. Te notificaremos cuando los CFDIs esten listos.')
        cargarSolicitudes()
      }
    } catch {
      toast.error('Error al enviar la solicitud')
    } finally {
      setSubmitting(false)
      setDupDialog({ open: false })
    }
  }

  async function handleHistorico() {
    if (!selectedEmpresa) return
    setHistoricoRunning(true)
    try {
      const result = await solicitarDescargaHistorica(selectedEmpresa, formato)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        setHistoricoProgress({ total: result.total, enviadas: result.enviadas })
        toast.success(`${result.enviadas} solicitudes enviadas al SAT`)
        if (result.errores.length > 0) toast.warning(`${result.errores.length} solicitudes con error`)
        cargarSolicitudes()
      }
    } catch {
      toast.error('Error al solicitar descarga historica')
    } finally {
      setHistoricoRunning(false)
    }
  }

  async function handleReintentar(solicitudId: string) {
    const result = await reintentarSolicitud(solicitudId)
    if ('error' in result) toast.error(result.error)
    else { toast.success('Solicitud reenviada'); cargarSolicitudes() }
  }

  async function handleVerificar(solicitudId: string) {
    setVerificandoId(solicitudId)
    try {
      const result = await verificarYProcesarSolicitud(solicitudId)
      if (result.estatus === 'completada') {
        toast.success(`Descarga completada: ${result.cfdisProcesados ?? result.totalCfdi ?? 0} CFDIs procesados`)
        cargarCFDIs(1)
        if (selectedPeriodo) cargarKPIs()
      } else if (result.estatus === 'verificando') {
        toast.info('El SAT aun esta preparando los paquetes. Tiempo estimado: 1-24 horas.')
      } else if (result.estatus === 'error') {
        toast.error(result.error || 'Error al verificar la solicitud')
      } else if (result.estatus === 'lista') {
        toast.success('Paquetes listos. Iniciando descarga...')
      } else {
        toast.info('Solicitud actualizada')
      }
      cargarSolicitudes()
    } catch {
      toast.error('Error al consultar el SAT')
    } finally {
      setVerificandoId(null)
    }
  }

  function handleVerCFDIs(sol: SolicitudRow) {
    if (sol.mes_periodo && sol.anio_periodo) setSelectedPeriodo(`${sol.mes_periodo}-${sol.anio_periodo}`)
    if (sol.tipo === 'emitidas') setCfdiTipo('EMITIDA')
    else if (sol.tipo === 'recibidas') setCfdiTipo('RECIBIDA')
    cfdisSection.current?.scrollIntoView({ behavior: 'smooth' })
  }

  function handleExportar() {
    if (cfdis.length === 0) return
    const headers = ['UUID', 'Tipo', 'RFC Emisor', 'Nombre Emisor', 'RFC Receptor', 'Nombre Receptor', 'Fecha', 'Subtotal', 'IVA', 'Total', 'Estatus SAT', 'Conciliado']
    const rows = cfdis.map((c) => [
      c.uuid, c.tipo, c.rfc_emisor || '', c.nombre_emisor || '', c.rfc_receptor || '',
      c.nombre_receptor || '', c.fecha_emision || '', String(c.subtotal || 0),
      String(c.iva || 0), String(c.total || 0), c.estatus_sat || '', c.conciliado ? 'Si' : 'No',
    ])
    downloadCSV(`cfdis_sat_${selectedPeriodo || 'todos'}.csv`, generateCSV(headers, rows))
  }

  const empresaActual = empresas.find((e) => e.id === selectedEmpresa)
  const totalCfdiPages = Math.ceil(cfdiTotal / 50)

  return (
    <div className="space-y-6">
      <PageHeader title="Conciliacion SAT" description="Descarga y gestion de CFDIs desde el portal del SAT" />

      {/* Alert if no empresas configured */}
      {empresasSAT.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Ninguna empresa tiene la e.firma configurada</p>
                <p className="text-sm text-amber-700 mt-1">
                  Ve a Administracion &gt; Empresas para configurar la e.firma (certificado .cer, clave .key y contrasena).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 1: Nueva solicitud */}
      {empresasSAT.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg" style={{ color: '#1B3A6B' }}>Nueva solicitud de descarga</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Empresa</label>
                <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar empresa" /></SelectTrigger>
                  <SelectContent>
                    {empresasSAT.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.codigo} - {emp.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Tipo</label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as 'emitidas' | 'recibidas')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recibidas">Facturas recibidas</SelectItem>
                    <SelectItem value="emitidas">Facturas emitidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Periodo</label>
                <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar mes" /></SelectTrigger>
                  <SelectContent>
                    {periodos.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          {p.label}
                          {p.esMesActual && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Mes en curso</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Formato</label>
                <Select value={formato} onValueChange={(v) => setFormato(v as 'xml' | 'metadata')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xml">XML completo</SelectItem>
                    <SelectItem value="metadata">Solo metadata</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => handleSolicitar()} disabled={submitting || !selectedEmpresa || !selectedPeriodo} className="text-white" style={{ backgroundColor: '#2563EB' }}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Solicitar descarga
              </Button>
            </div>
            <div className="mt-3 flex items-start gap-2 text-sm text-gray-500 bg-amber-50 border border-amber-200 p-3 rounded-lg">
              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>Las facturas recibidas solo incluyen comprobantes vigentes (limitacion del SAT). Para consultar canceladas usa el portal del SAT directamente.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 2: Carga historica */}
      {selectedEmpresa && !tieneHistorico && !loadingSolicitudes && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg" style={{ color: '#1B3A6B' }}>Primera configuracion — Descarga historica</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Para iniciar la conciliacion, descarga las facturas de los meses anteriores del anio en curso.</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead>Emitidas</TableHead>
                  <TableHead>Recibidas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodos.map((p) => {
                  const [mes] = p.value.split('-')
                  const solEmit = solicitudes.find((s: SolicitudRow) => s.mes_periodo === mes && s.tipo === 'emitidas')
                  const solRecib = solicitudes.find((s: SolicitudRow) => s.mes_periodo === mes && s.tipo === 'recibidas')
                  return (
                    <TableRow key={p.value}>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell><HistoricoCell sol={solEmit} verificandoId={verificandoId} onVerificar={handleVerificar} /></TableCell>
                      <TableCell><HistoricoCell sol={solRecib} verificandoId={verificandoId} onVerificar={handleVerificar} /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <div className="mt-4 flex items-center gap-4">
              <Button onClick={handleHistorico} disabled={historicoRunning} className="text-white" style={{ backgroundColor: '#2563EB' }}>
                {historicoRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Solicitar todas las descargas pendientes
              </Button>
              {historicoRunning && historicoProgress.total > 0 && (
                <span className="text-sm text-gray-600">{historicoProgress.enviadas} de {historicoProgress.total} solicitudes enviadas</span>
              )}
            </div>
            <div className="mt-3 flex items-start gap-2 text-sm text-gray-500 bg-blue-50 p-3 rounded-lg">
              <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <span>El SAT puede tardar entre 1 y 24 horas en preparar los paquetes. El sistema los descargara automaticamente y recibiras una notificacion.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: KPIs */}
      {kpis && selectedEmpresa && selectedPeriodo && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard title="CFDIs emitidos" value={String(kpis.totalEmitidos)} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
          <KPICard title="CFDIs recibidos" value={String(kpis.totalRecibidos)} icon={<FileText className="h-4 w-4 text-muted-foreground" />} />
          <KPICard title="Total emitido" value={formatMoney(kpis.sumaEmitidos)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} small />
          <KPICard title="Total recibido" value={formatMoney(kpis.sumaRecibidos)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} small />
          <KPICard title="Pendientes conciliar" value={String(kpis.pendientesConciliar)} icon={<AlertTriangle className={`h-4 w-4 ${kpis.pendientesConciliar > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />} color={kpis.pendientesConciliar > 0 ? 'text-amber-600' : undefined} />
          <KPICard title="Cancelados" value={String(kpis.cancelados)} icon={<XCircle className={`h-4 w-4 ${kpis.cancelados > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />} color={kpis.cancelados > 0 ? 'text-red-600' : undefined} />
        </div>
      )}

      {/* Section 4: Seguimiento de solicitudes */}
      {selectedEmpresa && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg" style={{ color: '#1B3A6B' }}>Seguimiento de solicitudes</CardTitle>
            <Button variant="outline" size="sm" onClick={cargarSolicitudes} disabled={loadingSolicitudes}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingSolicitudes ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </CardHeader>
          <CardContent>
            {solicitudes.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No hay solicitudes para esta empresa</p>
                <p className="text-sm text-gray-400 mt-1">Usa el formulario para solicitar una descarga</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader label="Periodo" sortKey="anio_periodo" sortConfig={sortConfigSol} onSort={handleSortSol} />
                      <SortableHeader label="Tipo" sortKey="tipo" sortConfig={sortConfigSol} onSort={handleSortSol} />
                      <SortableHeader label="Formato" sortKey="formato" sortConfig={sortConfigSol} onSort={handleSortSol} />
                      <SortableHeader label="CFDIs" sortKey="total_cfdi" sortConfig={sortConfigSol} onSort={handleSortSol} className="text-right" />
                      <SortableHeader label="Paquetes" sortKey="total_paquetes" sortConfig={sortConfigSol} onSort={handleSortSol} className="text-right" />
                      <SortableHeader label="Estatus" sortKey="estatus" sortConfig={sortConfigSol} onSort={handleSortSol} />
                      <SortableHeader label="Solicitado por" sortKey="perfiles.nombre" sortConfig={sortConfigSol} onSort={handleSortSol} />
                      <SortableHeader label="Fecha" sortKey="created_at" sortConfig={sortConfigSol} onSort={handleSortSol} />
                      <TableHead>Duracion</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSolicitudes.map((sol: SolicitudRow) => {
                      const cfg = ESTATUS_CONFIG[sol.estatus] || ESTATUS_CONFIG.pendiente
                      return (
                        <TableRow key={sol.id}>
                          <TableCell className="font-medium">
                            {sol.mes_periodo && sol.anio_periodo ? `${sol.mes_periodo}-${sol.anio_periodo}` : '-'}
                          </TableCell>
                          <TableCell className="capitalize">{sol.tipo}</TableCell>
                          <TableCell className="uppercase text-xs">{sol.formato || '-'}</TableCell>
                          <TableCell className="text-right">{sol.total_cfdi ?? '-'}</TableCell>
                          <TableCell className="text-right">
                            {sol.estatus === 'descargando' && sol.total_paquetes ? `${sol.paquetes_descargados || 0}/${sol.total_paquetes}` : sol.total_paquetes ?? '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={cfg.className}>
                              {sol.estatus === 'verificando' && <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />}
                              {cfg.label}
                            </Badge>
                            {sol.estatus === 'error' && sol.mensaje_error && (
                              <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={sol.mensaje_error}>{sol.mensaje_error}</p>
                            )}
                          </TableCell>
                          <TableCell>{sol.perfiles?.nombre || '-'}</TableCell>
                          <TableCell className="text-sm">{formatFecha(sol.created_at)}</TableCell>
                          <TableCell>{formatDuracion(sol.duracion_segundos)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(sol.estatus === 'pendiente' || sol.estatus === 'verificando') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerificar(sol.id)}
                                  disabled={verificandoId === sol.id}
                                  className={sol.estatus === 'verificando' ? 'border-blue-300 text-blue-700' : ''}
                                >
                                  {verificandoId === sol.id ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Consultando...</> : <><RefreshCw className="h-3 w-3 mr-1" />Verificar</>}
                                </Button>
                              )}
                              {sol.estatus === 'lista' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerificar(sol.id)}
                                  disabled={verificandoId === sol.id}
                                  className="border-green-300 text-green-700"
                                >
                                  {verificandoId === sol.id ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Descargando...</> : <><Download className="h-3 w-3 mr-1" />Descargar ahora</>}
                                </Button>
                              )}
                              {sol.estatus === 'descargando' && (
                                <span className="inline-flex items-center text-xs text-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />En proceso</span>
                              )}
                              {sol.estatus === 'completada' && (
                                <Button variant="ghost" size="sm" onClick={() => handleVerCFDIs(sol)} title="Ver CFDIs"><Eye className="h-4 w-4" /></Button>
                              )}
                              {sol.estatus === 'error' && (
                                <Button variant="ghost" size="sm" onClick={() => handleReintentar(sol.id)} title="Reintentar" className="text-red-600"><RotateCcw className="h-4 w-4" /></Button>
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
      )}

      {/* Section 5: CFDIs descargados */}
      {selectedEmpresa && (
        <div ref={cfdisSection}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg" style={{ color: '#1B3A6B' }}>CFDIs descargados</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportar} disabled={cfdis.length === 0}>
                <Download className="h-4 w-4 mr-1" />Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap items-end gap-3 mb-4">
                <div className="w-36">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</label>
                  <Select value={cfdiTipo} onValueChange={(v) => { setCfdiTipo(v); setCfdiPage(1) }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMITIDA">Emitida</SelectItem>
                      <SelectItem value="RECIBIDA">Recibida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-36">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">RFC Emisor</label>
                  <Input className="h-9" placeholder="Buscar..." value={cfdiRfcEmisor} onChange={(e) => setCfdiRfcEmisor(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && cargarCFDIs(1)} />
                </div>
                <div className="w-36">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">RFC Receptor</label>
                  <Input className="h-9" placeholder="Buscar..." value={cfdiRfcReceptor} onChange={(e) => setCfdiRfcReceptor(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && cargarCFDIs(1)} />
                </div>
                <div className="w-32">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Estatus SAT</label>
                  <Select value={cfdiEstatus} onValueChange={(v) => { setCfdiEstatus(v); setCfdiPage(1) }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vigente">Vigente</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Conciliado</label>
                  <Select value={cfdiConciliado} onValueChange={(v) => { setCfdiConciliado(v); setCfdiPage(1) }}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Si</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" className="h-9" onClick={() => cargarCFDIs(1)}>Buscar</Button>
                <Button variant="ghost" size="sm" className="h-9" onClick={() => { setCfdiTipo(''); setCfdiRfcEmisor(''); setCfdiRfcReceptor(''); setCfdiEstatus(''); setCfdiConciliado(''); setCfdiPage(1) }}>Limpiar</Button>
              </div>

              {loadingCfdis ? (
                <div className="text-center py-8"><Loader2 className="h-8 w-8 mx-auto text-gray-300 animate-spin" /></div>
              ) : cfdis.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No se encontraron CFDIs</p>
                  <p className="text-sm text-gray-400 mt-1">{selectedPeriodo ? 'Solicita una descarga para este periodo' : 'Selecciona un periodo para ver los CFDIs'}</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableHeader label="UUID" sortKey="uuid" sortConfig={sortConfigCfdi} onSort={handleSortCfdi} />
                          <SortableHeader label="Tipo" sortKey="tipo" sortConfig={sortConfigCfdi} onSort={handleSortCfdi} />
                          <SortableHeader label="Emisor" sortKey="rfc_emisor" sortConfig={sortConfigCfdi} onSort={handleSortCfdi} />
                          <SortableHeader label="Receptor" sortKey="rfc_receptor" sortConfig={sortConfigCfdi} onSort={handleSortCfdi} />
                          <SortableHeader label="Fecha" sortKey="fecha_emision" sortConfig={sortConfigCfdi} onSort={handleSortCfdi} />
                          <SortableHeader label="Subtotal" sortKey="subtotal" sortConfig={sortConfigCfdi} onSort={handleSortCfdi} className="text-right" />
                          <SortableHeader label="IVA" sortKey="iva" sortConfig={sortConfigCfdi} onSort={handleSortCfdi} className="text-right" />
                          <SortableHeader label="Total" sortKey="total" sortConfig={sortConfigCfdi} onSort={handleSortCfdi} className="text-right" />
                          <SortableHeader label="Estatus" sortKey="estatus_sat" sortConfig={sortConfigCfdi} onSort={handleSortCfdi} />
                          <SortableHeader label="Conciliado" sortKey="conciliado" sortConfig={sortConfigCfdi} onSort={handleSortCfdi} />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedCfdis.map((cfdi: CFDIRow) => (
                          <TableRow key={cfdi.id} className={cfdi.estatus_sat === 'Cancelado' ? 'bg-red-50' : ''}>
                            <TableCell>
                              <span className="font-mono text-xs" title={cfdi.uuid}>{cfdi.uuid?.substring(0, 8)}...</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cfdi.tipo === 'EMITIDA' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}>
                                {cfdi.tipo === 'EMITIDA' ? 'Emitida' : 'Recibida'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-mono text-xs">{cfdi.rfc_emisor || '-'}</span>
                                {cfdi.nombre_emisor && <p className="text-xs text-gray-500 truncate max-w-[150px]" title={cfdi.nombre_emisor}>{cfdi.nombre_emisor}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <span className="font-mono text-xs">{cfdi.rfc_receptor || '-'}</span>
                                {cfdi.nombre_receptor && <p className="text-xs text-gray-500 truncate max-w-[150px]" title={cfdi.nombre_receptor}>{cfdi.nombre_receptor}</p>}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{cfdi.fecha_emision ? formatFecha(cfdi.fecha_emision) : '-'}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatMoney(cfdi.subtotal || 0)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{formatMoney(cfdi.iva || 0)}</TableCell>
                            <TableCell className="text-right font-mono text-sm font-medium">{formatMoney(cfdi.total || 0)}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cfdi.estatus_sat === 'Cancelado' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                                {cfdi.estatus_sat || 'Vigente'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {cfdi.conciliado ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <span className="text-gray-300">—</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalCfdiPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-gray-500">Mostrando {(cfdiPage - 1) * 50 + 1}-{Math.min(cfdiPage * 50, cfdiTotal)} de {cfdiTotal} CFDIs</p>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled={cfdiPage <= 1} onClick={() => cargarCFDIs(cfdiPage - 1)}>Anterior</Button>
                        <span className="text-sm text-gray-600">Pagina {cfdiPage} de {totalCfdiPages}</span>
                        <Button variant="outline" size="sm" disabled={cfdiPage >= totalCfdiPages} onClick={() => cargarCFDIs(cfdiPage + 1)}>Siguiente</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section 6: Analitica */}
      {selectedEmpresa && selectedPeriodo && analitica && !loadingAnalitica && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#1B3A6B' }}>
              <BarChart3 className="h-5 w-5" />
              Analitica — {selectedPeriodo}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analitica.porFormaPago.length === 0 && analitica.porTipoComprobante.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay datos de analitica para este periodo. Los campos enriquecidos se llenan con nuevas descargas.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Por forma de pago */}
                {analitica.porFormaPago.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Por forma de pago</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Forma de pago</TableHead>
                          <TableHead className="text-right"># CFDIs</TableHead>
                          <TableHead className="text-right">Total MXN</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analitica.porFormaPago.map((row) => (
                          <TableRow key={row.forma_pago}>
                            <TableCell className="text-sm">{row.forma_pago}</TableCell>
                            <TableCell className="text-right text-sm">{row.count}</TableCell>
                            <TableCell className="text-right text-sm font-mono">{formatMoney(row.total_mxn)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Por tipo de comprobante */}
                {analitica.porTipoComprobante.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Por tipo de comprobante</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right"># CFDIs</TableHead>
                          <TableHead className="text-right">Total MXN</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analitica.porTipoComprobante.map((row) => (
                          <TableRow key={row.tipo_comprobante}>
                            <TableCell className="text-sm">{TIPO_COMPROBANTE_LABELS[row.tipo_comprobante] || row.tipo_comprobante}</TableCell>
                            <TableCell className="text-right text-sm">{row.count}</TableCell>
                            <TableCell className="text-right text-sm font-mono">{formatMoney(row.total_mxn)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Top proveedores */}
                {analitica.topProveedores.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Top 10 proveedores (recibidas)</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>RFC</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead className="text-right"># CFDIs</TableHead>
                          <TableHead className="text-right">Total MXN</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analitica.topProveedores.map((row) => (
                          <TableRow key={row.rfc}>
                            <TableCell className="text-xs font-mono">{row.rfc}</TableCell>
                            <TableCell className="text-sm truncate max-w-[180px]" title={row.nombre}>{row.nombre || '—'}</TableCell>
                            <TableCell className="text-right text-sm">{row.count}</TableCell>
                            <TableCell className="text-right text-sm font-mono">{formatMoney(row.total_mxn)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Top clientes */}
                {analitica.topClientes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Top 10 clientes (emitidas)</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>RFC</TableHead>
                          <TableHead>Nombre</TableHead>
                          <TableHead className="text-right"># CFDIs</TableHead>
                          <TableHead className="text-right">Total MXN</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analitica.topClientes.map((row) => (
                          <TableRow key={row.rfc}>
                            <TableCell className="text-xs font-mono">{row.rfc}</TableCell>
                            <TableCell className="text-sm truncate max-w-[180px]" title={row.nombre}>{row.nombre || '—'}</TableCell>
                            <TableCell className="text-right text-sm">{row.count}</TableCell>
                            <TableCell className="text-right text-sm font-mono">{formatMoney(row.total_mxn)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Duplicate dialog */}
      <Dialog open={dupDialog.open} onOpenChange={(open) => setDupDialog({ ...dupDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descarga duplicada</DialogTitle>
            <DialogDescription>
              Ya descargaste las facturas {tipo} de {selectedPeriodo} para {empresaActual?.nombre || ''} el {dupDialog.fecha}. Deseas volver a descargarlas?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupDialog({ open: false })}>Cancelar</Button>
            <Button onClick={() => handleSolicitar(true)} className="text-white" style={{ backgroundColor: '#2563EB' }}>Si, descargar de nuevo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KPICard({ title, value, icon, small, color }: { title: string; value: string; icon: React.ReactNode; small?: boolean; color?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`${small ? 'text-xl' : 'text-2xl'} font-bold ${color || ''}`} style={color ? undefined : { color: '#1B3A6B' }}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

function EstatusBadgeMini({ estatus }: { estatus?: string }) {
  if (!estatus) return <Badge variant="secondary" className="bg-gray-100 text-gray-500 hover:bg-gray-100 text-xs">Pendiente</Badge>
  const cfg = ESTATUS_CONFIG[estatus] || ESTATUS_CONFIG.pendiente
  return (
    <Badge variant="secondary" className={`${cfg.className} text-xs`}>
      {estatus === 'verificando' && <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />}
      {cfg.label}
    </Badge>
  )
}

function HistoricoCell({ sol, verificandoId, onVerificar }: { sol?: SolicitudRow; verificandoId: string | null; onVerificar: (id: string) => void }) {
  if (!sol) return <Badge variant="secondary" className="bg-gray-100 text-gray-500 hover:bg-gray-100 text-xs">Sin solicitar</Badge>

  const isVerificando = verificandoId === sol.id
  const cfg = ESTATUS_CONFIG[sol.estatus] || ESTATUS_CONFIG.pendiente

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className={`${cfg.className} text-xs`}>
        {(sol.estatus === 'verificando' || sol.estatus === 'descargando') && <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />}
        {cfg.label}
      </Badge>
      {(sol.estatus === 'pendiente' || sol.estatus === 'verificando' || sol.estatus === 'lista') && (
        <button
          onClick={() => onVerificar(sol.id)}
          disabled={isVerificando}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
        >
          {isVerificando ? 'Consultando...' : sol.estatus === 'lista' ? 'Descargar' : 'Verificar'}
        </button>
      )}
    </div>
  )
}
