'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { EstatusBadge } from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pagination, usePagination } from '@/components/Pagination'
import { SortableHeader } from '@/components/SortableHeader'
import { useSort } from '@/hooks/useSort'
import { Search, Download, FileText, DollarSign, Clock, CheckCircle } from 'lucide-react'

interface Requisicion {
  id: string
  folio: string
  fecha_solicitud: string
  concepto: string
  moneda: string
  importe_total: number
  estatus: string
  mes_servicio: string
  mes_pago_deseado: string
  empresas_generadora: { id: string; nombre: string; codigo: string } | null
  proveedores: { nombre: string } | null
  clasificaciones_gasto: { nombre: string } | null
  perfiles: { nombre: string } | null
}

interface Empresa {
  id: string
  nombre: string
  codigo: string
}

interface Props {
  requisiciones: Requisicion[]
  empresas: Empresa[]
  rol: string
  canExport: boolean
}

const ESTATUS_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revision',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  PROGRAMADO: 'Programado',
  PAGADO: 'Pagado',
  COMPROBADO: 'Comprobado',
  CANCELADO: 'Cancelado',
}

function formatCurrency(amount: number, currency: string = 'MXN'): string {
  return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} ${currency}`
}

function exportToCSV(data: Requisicion[], filename: string) {
  const headers = [
    'Folio',
    'Fecha',
    'Solicitante',
    'Proveedor',
    'Empresa',
    'Concepto',
    'Moneda',
    'Importe Total',
    'Estatus',
  ]

  const rows = data.map((r) => [
    r.folio,
    new Date(r.fecha_solicitud).toLocaleDateString('es-MX'),
    r.perfiles?.nombre || '',
    r.proveedores?.nombre || '',
    r.empresas_generadora?.nombre || '',
    `"${r.concepto.replace(/"/g, '""')}"`,
    r.moneda,
    r.importe_total.toFixed(2),
    ESTATUS_LABELS[r.estatus] || r.estatus,
  ])

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function ReportesClient({ requisiciones, empresas, rol, canExport }: Props) {
  const router = useRouter()
  const [filterEstatus, setFilterEstatus] = useState('todos')
  const [filterEmpresa, setFilterEmpresa] = useState('todas')
  const [filterMes, setFilterMes] = useState('todos')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Generar lista de meses disponibles a partir de los datos
  const mesesDisponibles = useMemo(() => {
    const meses = new Set<string>()
    requisiciones.forEach((r) => {
      if (r.mes_servicio) meses.add(r.mes_servicio)
    })
    return Array.from(meses).sort()
  }, [requisiciones])

  // Filtrar requisiciones
  const filtered = useMemo(() => {
    return requisiciones.filter((r) => {
      const matchEstatus = filterEstatus === 'todos' || r.estatus === filterEstatus
      const matchEmpresa = filterEmpresa === 'todas' || r.empresas_generadora?.id === filterEmpresa
      const matchMes = filterMes === 'todos' || r.mes_servicio === filterMes
      const matchSearch =
        !search ||
        r.folio.toLowerCase().includes(search.toLowerCase()) ||
        r.concepto.toLowerCase().includes(search.toLowerCase()) ||
        r.proveedores?.nombre.toLowerCase().includes(search.toLowerCase()) ||
        r.perfiles?.nombre.toLowerCase().includes(search.toLowerCase())
      return matchEstatus && matchEmpresa && matchMes && matchSearch
    })
  }, [requisiciones, filterEstatus, filterEmpresa, filterMes, search])

  const { sorted, sortConfig, handleSort } = useSort(filtered)
  const { totalItems, getPageItems } = usePagination(sorted, 25)
  const pageItems = getPageItems(currentPage)

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length
    const montoTotal = filtered.reduce((acc, r) => acc + (r.importe_total || 0), 0)
    const enRevision = filtered.filter((r) => r.estatus === 'EN_REVISION').length
    const aprobadas = filtered.filter((r) => r.estatus === 'APROBADO').length
    const pagadas = filtered.filter((r) => r.estatus === 'PAGADO' || r.estatus === 'COMPROBADO').length
    const pendientesPago = filtered.filter((r) => r.estatus === 'PROGRAMADO').length

    return { total, montoTotal, enRevision, aprobadas, pagadas, pendientesPago }
  }, [filtered])

  const handleExport = () => {
    const today = new Date().toISOString().slice(0, 10)
    exportToCSV(filtered, `reporte-requisiciones-${today}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes"
        description="Vista general de solicitudes de compra y montos"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total solicitudes de compra
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1B3A6B]">{kpis.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monto total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1B3A6B]">
              {formatCurrency(kpis.montoTotal)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En revision
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpis.enRevision}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.pendientesPago > 0 && `${kpis.pendientesPago} programadas para pago`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagadas / Comprobadas
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.pagadas}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.aprobadas > 0 && `${kpis.aprobadas} aprobadas pendientes de pago`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar folio, concepto, proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterEstatus} onValueChange={setFilterEstatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar estatus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estatus</SelectItem>
            <SelectItem value="BORRADOR">Borrador</SelectItem>
            <SelectItem value="EN_REVISION">En revision</SelectItem>
            <SelectItem value="APROBADO">Aprobado</SelectItem>
            <SelectItem value="RECHAZADO">Rechazado</SelectItem>
            <SelectItem value="PROGRAMADO">Programado</SelectItem>
            <SelectItem value="PAGADO">Pagado</SelectItem>
            <SelectItem value="COMPROBADO">Comprobado</SelectItem>
            <SelectItem value="CANCELADO">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las empresas</SelectItem>
            {empresas.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.codigo} - {e.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterMes} onValueChange={setFilterMes}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar mes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los meses</SelectItem>
            {mesesDisponibles.map((mes) => (
              <SelectItem key={mes} value={mes}>
                {mes}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canExport && (
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-[#1B3A6B] text-[#1B3A6B] hover:bg-[#1B3A6B] hover:text-white"
            disabled={filtered.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
        )}
      </div>

      {/* Contador de resultados */}
      <p className="text-sm text-muted-foreground">
        Mostrando {filtered.length} de {requisiciones.length} solicitudes de compra
      </p>

      {/* Tabla */}
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="Folio" sortKey="folio" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Fecha" sortKey="fecha_solicitud" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Proveedor" sortKey="proveedores.nombre" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Empresa" sortKey="empresas_generadora.nombre" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Concepto" sortKey="concepto" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Importe Total" sortKey="importe_total" sortConfig={sortConfig} onSort={handleSort} className="text-right" />
              <SortableHeader label="Estatus" sortKey="estatus" sortConfig={sortConfig} onSort={handleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {search || filterEstatus !== 'todos' || filterEmpresa !== 'todas' || filterMes !== 'todos'
                    ? 'Sin resultados para los filtros aplicados'
                    : 'No hay solicitudes de compra registradas'}
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/requisiciones/${r.id}`)}
                >
                  <TableCell className="font-mono font-medium text-accent-500">
                    {r.folio}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.fecha_solicitud).toLocaleDateString('es-MX')}
                  </TableCell>
                  <TableCell className="text-sm">{r.proveedores?.nombre || '—'}</TableCell>
                  <TableCell className="text-sm">
                    {r.empresas_generadora
                      ? `${r.empresas_generadora.codigo} - ${r.empresas_generadora.nombre}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{r.concepto}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(r.importe_total, r.moneda)}
                  </TableCell>
                  <TableCell>
                    <EstatusBadge estatus={r.estatus} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="px-4 pb-4">
          <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={25}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  )
}
