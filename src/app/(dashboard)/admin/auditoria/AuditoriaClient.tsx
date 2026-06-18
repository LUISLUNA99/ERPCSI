'use client'

import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Pagination, usePagination } from '@/components/Pagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Search, Download, Activity, AlertTriangle, User, BarChart3 } from 'lucide-react'
import { getBitacora } from '@/app/actions/auditoria.actions'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { useSort } from '@/hooks/useSort'
import { SortableHeader } from '@/components/SortableHeader'

interface BitacoraEntry {
  id: string
  usuario_id: string | null
  usuario_nombre: string
  usuario_email: string
  usuario_rol: string
  accion: string
  modulo: string
  descripcion: string
  entidad_tipo: string | null
  entidad_id: string | null
  entidad_descripcion: string | null
  datos_anteriores: Record<string, unknown> | null
  datos_nuevos: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  resultado: string
  metadata: Record<string, unknown> | null
  created_at: string
}

interface Usuario {
  id: string
  nombre: string
  email: string
}

interface Props {
  bitacora: BitacoraEntry[]
  usuarios: Usuario[]
}

const MODULOS = [
  { value: 'requisiciones', label: 'Solicitudes de compra' },
  { value: 'aprobaciones', label: 'Aprobaciones' },
  { value: 'pagos', label: 'Pagos' },
  { value: 'facturas', label: 'Facturas' },
  { value: 'catalogos', label: 'Catalogos' },
  { value: 'usuarios', label: 'Usuarios' },
  { value: 'auth', label: 'Autenticacion' },
  { value: 'notificaciones', label: 'Notificaciones' },
]

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const d = date.getDate()
  const m = months[date.getMonth()]
  const y = date.getFullYear()
  const h = date.getHours().toString().padStart(2, '0')
  const min = date.getMinutes().toString().padStart(2, '0')
  const s = date.getSeconds().toString().padStart(2, '0')
  return `${d} ${m} ${y}, ${h}:${min}:${s}`
}

function ResultadoBadge({ resultado }: { resultado: string }) {
  if (resultado === 'exitoso') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Exitoso</Badge>
  if (resultado === 'fallido') return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Fallido</Badge>
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Parcial</Badge>
}

function rowBgColor(resultado: string): string {
  if (resultado === 'fallido') return 'bg-red-50'
  if (resultado === 'parcial') return 'bg-amber-50'
  return ''
}

export function AuditoriaClient({ bitacora: initialBitacora, usuarios }: Props) {
  const [entries, setEntries] = useState<BitacoraEntry[]>(initialBitacora)
  const [filterModulo, setFilterModulo] = useState('todos')
  const [filterUsuario, setFilterUsuario] = useState('todos')
  const [filterResultado, setFilterResultado] = useState('todos')
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedEntry, setSelectedEntry] = useState<BitacoraEntry | null>(null)
  const [loading, setLoading] = useState(false)

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchModulo = filterModulo === 'todos' || e.modulo === filterModulo
      const matchUsuario = filterUsuario === 'todos' || e.usuario_id === filterUsuario
      const matchResultado = filterResultado === 'todos' || e.resultado === filterResultado
      const matchSearch = !search ||
        e.descripcion.toLowerCase().includes(search.toLowerCase()) ||
        e.entidad_descripcion?.toLowerCase().includes(search.toLowerCase()) ||
        e.usuario_nombre?.toLowerCase().includes(search.toLowerCase()) ||
        e.accion.toLowerCase().includes(search.toLowerCase())
      return matchModulo && matchUsuario && matchResultado && matchSearch
    })
  }, [entries, filterModulo, filterUsuario, filterResultado, search])

  const { sorted, sortConfig, handleSort } = useSort(filtered)

  const { totalItems, getPageItems } = usePagination(sorted, 50)
  const pageItems = getPageItems(currentPage)

  // KPIs
  const kpis = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0]
    const hoyEntries = entries.filter((e) => e.created_at.startsWith(hoy))
    const totalHoy = hoyEntries.length
    const fallidasHoy = hoyEntries.filter((e) => e.resultado === 'fallido').length

    // Usuario mas activo
    const userCount = new Map<string, { nombre: string; count: number }>()
    hoyEntries.forEach((e) => {
      if (!e.usuario_nombre) return
      const existing = userCount.get(e.usuario_nombre)
      if (existing) existing.count++
      else userCount.set(e.usuario_nombre, { nombre: e.usuario_nombre, count: 1 })
    })
    const topUser = Array.from(userCount.values()).sort((a, b) => b.count - a.count)[0]

    // Modulo con mas actividad
    const modCount = new Map<string, number>()
    hoyEntries.forEach((e) => {
      modCount.set(e.modulo, (modCount.get(e.modulo) || 0) + 1)
    })
    const topMod = Array.from(modCount.entries()).sort((a, b) => b[1] - a[1])[0]

    return {
      totalHoy,
      fallidasHoy,
      topUser: topUser ? `${topUser.nombre} (${topUser.count})` : '—',
      topModulo: topMod ? `${topMod[0]} (${topMod[1]})` : '—',
    }
  }, [entries])

  async function handleApplyFilters() {
    setLoading(true)
    try {
      const data = await getBitacora({
        fechaDesde: filterFechaDesde || undefined,
        fechaHasta: filterFechaHasta || undefined,
        usuarioId: filterUsuario !== 'todos' ? filterUsuario : undefined,
        modulo: filterModulo !== 'todos' ? filterModulo : undefined,
        resultado: filterResultado !== 'todos' ? filterResultado : undefined,
        busqueda: search || undefined,
      })
      setEntries(data as BitacoraEntry[])
      setCurrentPage(1)
    } finally {
      setLoading(false)
    }
  }

  function handleExport() {
    const headers = ['Fecha', 'Usuario', 'Email', 'Rol', 'Modulo', 'Accion', 'Descripcion', 'Entidad', 'Resultado']
    const rows = filtered.map((e) => [
      formatTimestamp(e.created_at),
      e.usuario_nombre,
      e.usuario_email,
      e.usuario_rol,
      e.modulo,
      e.accion,
      e.descripcion,
      e.entidad_descripcion || '',
      e.resultado,
    ])
    const csv = generateCSV(headers, rows)
    const today = new Date().toISOString().slice(0, 10)
    downloadCSV(`bitacora-auditoria-${today}`, csv)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Bitacora de auditoria" description="Registro de todas las acciones realizadas en el sistema" />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acciones hoy</CardTitle>
            <Activity className="h-4 w-4 text-[#2563EB]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1B3A6B]">{kpis.totalHoy}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fallidas hoy</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${kpis.fallidasHoy > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${kpis.fallidasHoy > 0 ? 'text-red-600' : 'text-[#1B3A6B]'}`}>{kpis.fallidasHoy}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuario mas activo</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-[#1B3A6B] truncate">{kpis.topUser}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Modulo mas activo</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-[#1B3A6B] capitalize">{kpis.topModulo}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar descripcion, entidad, usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" value={filterFechaDesde} onChange={(e) => setFilterFechaDesde(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" value={filterFechaHasta} onChange={(e) => setFilterFechaHasta(e.target.value)} className="w-40" />
          </div>
        </div>
        <Select value={filterModulo} onValueChange={setFilterModulo}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Modulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los modulos</SelectItem>
            {MODULOS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterUsuario} onValueChange={setFilterUsuario}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Usuario" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los usuarios</SelectItem>
            {usuarios.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterResultado} onValueChange={setFilterResultado}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Resultado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="exitoso">Exitoso</SelectItem>
            <SelectItem value="fallido">Fallido</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleApplyFilters} disabled={loading} className="bg-accent-500 hover:bg-accent-600 text-white">
          {loading ? 'Buscando...' : 'Aplicar filtros'}
        </Button>
        <Button onClick={handleExport} variant="outline" className="border-[#1B3A6B] text-[#1B3A6B]" disabled={filtered.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Mostrando {filtered.length} registros
      </p>

      {/* Tabla */}
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="Fecha/hora" sortKey="created_at" sortConfig={sortConfig} onSort={handleSort} className="w-[160px]" />
              <SortableHeader label="Usuario" sortKey="usuario_nombre" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Rol" sortKey="usuario_rol" sortConfig={sortConfig} onSort={handleSort} className="w-[90px]" />
              <SortableHeader label="Modulo" sortKey="modulo" sortConfig={sortConfig} onSort={handleSort} className="w-[120px]" />
              <SortableHeader label="Accion" sortKey="accion" sortConfig={sortConfig} onSort={handleSort} className="w-[120px]" />
              <SortableHeader label="Descripcion" sortKey="descripcion" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Resultado" sortKey="resultado" sortConfig={sortConfig} onSort={handleSort} className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay registros en la bitacora
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((entry) => (
                <TableRow
                  key={entry.id}
                  className={`cursor-pointer hover:bg-gray-50 ${rowBgColor(entry.resultado)}`}
                  onClick={() => setSelectedEntry(entry)}
                >
                  <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                    {formatTimestamp(entry.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">{entry.usuario_nombre || '—'}</TableCell>
                  <TableCell>
                    <span className="text-xs capitalize bg-gray-100 px-2 py-0.5 rounded">{entry.usuario_rol || '—'}</span>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{entry.modulo}</TableCell>
                  <TableCell className="text-sm">{entry.accion.replace(/_/g, ' ')}</TableCell>
                  <TableCell className="text-sm max-w-[300px] truncate">{entry.descripcion}</TableCell>
                  <TableCell><ResultadoBadge resultado={entry.resultado} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="px-4 pb-4">
          <Pagination currentPage={currentPage} totalItems={totalItems} pageSize={50} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* Drawer de detalle */}
      <Sheet open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalle de la accion</SheetTitle>
          </SheetHeader>
          {selectedEntry && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <DetailField label="Fecha/hora" value={formatTimestamp(selectedEntry.created_at)} />
                <DetailField label="Resultado" value={<ResultadoBadge resultado={selectedEntry.resultado} />} />
                <DetailField label="Usuario" value={selectedEntry.usuario_nombre || '—'} />
                <DetailField label="Email" value={selectedEntry.usuario_email || '—'} />
                <DetailField label="Rol" value={selectedEntry.usuario_rol || '—'} />
                <DetailField label="IP" value={selectedEntry.ip_address || '—'} />
                <DetailField label="Modulo" value={selectedEntry.modulo} />
                <DetailField label="Accion" value={selectedEntry.accion.replace(/_/g, ' ')} />
              </div>

              <DetailField label="Descripcion" value={selectedEntry.descripcion} fullWidth />

              {selectedEntry.entidad_tipo && (
                <div className="grid grid-cols-2 gap-3">
                  <DetailField label="Tipo de entidad" value={selectedEntry.entidad_tipo} />
                  <DetailField label="ID entidad" value={selectedEntry.entidad_id || '—'} />
                  {selectedEntry.entidad_descripcion && (
                    <DetailField label="Entidad" value={selectedEntry.entidad_descripcion} />
                  )}
                </div>
              )}

              {selectedEntry.datos_anteriores && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Datos anteriores</p>
                  <pre className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs overflow-x-auto text-red-800">
                    {JSON.stringify(selectedEntry.datos_anteriores, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.datos_nuevos && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Datos nuevos</p>
                  <pre className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs overflow-x-auto text-green-800">
                    {JSON.stringify(selectedEntry.datos_nuevos, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.metadata && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Metadata</p>
                  <pre className="bg-gray-50 border rounded-lg p-3 text-xs overflow-x-auto">
                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEntry.user_agent && (
                <DetailField label="User Agent" value={selectedEntry.user_agent} fullWidth />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DetailField({ label, value, fullWidth }: { label: string; value: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm mt-0.5">{value}</div>
    </div>
  )
}
