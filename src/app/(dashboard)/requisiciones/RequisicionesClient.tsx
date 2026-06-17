'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { EstatusBadge } from '@/components/StatusBadge'
import { Pagination, usePagination } from '@/components/Pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface Requisicion {
  id: string
  folio: string
  fecha_solicitud: string
  concepto: string
  moneda: string
  importe_total: number
  estatus: string
  proveedores: { nombre: string } | null
  empresas_generadora: { nombre: string; codigo: string } | null
  clasificaciones_gasto: { nombre: string } | null
  perfiles: { nombre: string } | null
}

interface Props {
  requisiciones: Requisicion[]
  rol: string
  canCreate: boolean
}

export function RequisicionesClient({ requisiciones, rol, canCreate }: Props) {
  const router = useRouter()
  const [filterEstatus, setFilterEstatus] = useState('todos')
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = requisiciones.filter((r) => {
    const matchEstatus = filterEstatus === 'todos' || r.estatus === filterEstatus
    const matchSearch = !search ||
      r.folio.toLowerCase().includes(search.toLowerCase()) ||
      r.concepto.toLowerCase().includes(search.toLowerCase()) ||
      r.proveedores?.nombre.toLowerCase().includes(search.toLowerCase())
    return matchEstatus && matchSearch
  })

  const { totalItems, getPageItems } = usePagination(filtered, 25)
  const pageItems = getPageItems(currentPage)

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value)
    setCurrentPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Solicitudes de compra"
        description={rol === 'operario' ? 'Mis solicitudes de compra' : 'Todas las solicitudes de compra'}
        actionLabel={canCreate ? 'Nueva solicitud de compra' : undefined}
        onAction={canCreate ? () => router.push('/requisiciones/nueva') : undefined}
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar folio, concepto o proveedor..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
            className="pl-9"
          />
        </div>
        <Select value={filterEstatus} onValueChange={handleFilterChange(setFilterEstatus)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar estatus" /></SelectTrigger>
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
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Fecha</TableHead>
              {rol !== 'operario' && <TableHead>Solicitante</TableHead>}
              <TableHead>Proveedor</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Estatus</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={rol !== 'operario' ? 7 : 6} className="text-center py-8 text-muted-foreground">
                  {search || filterEstatus !== 'todos' ? 'Sin resultados para los filtros aplicados' : 'No hay solicitudes de compra'}
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/requisiciones/${r.id}`)}>
                  <TableCell className="font-mono font-medium text-accent-500">{r.folio}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(r.fecha_solicitud).toLocaleDateString('es-MX')}
                  </TableCell>
                  {rol !== 'operario' && (
                    <TableCell className="text-sm">{r.perfiles?.nombre || '—'}</TableCell>
                  )}
                  <TableCell className="text-sm">{r.proveedores?.nombre || '—'}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{r.concepto}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${r.importe_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {r.moneda}
                  </TableCell>
                  <TableCell><EstatusBadge estatus={r.estatus} /></TableCell>
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
