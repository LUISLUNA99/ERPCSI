'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { BulkUpload } from '@/components/BulkUpload'
import { SortableHeader } from '@/components/SortableHeader'
import { BancoDialog } from './BancoDialog'
import { toggleBanco } from '@/app/actions/bancos.actions'
import { bulkImportBancos } from '@/app/actions/bulk.actions'
import { useSort } from '@/hooks/useSort'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Pencil, Power } from 'lucide-react'
import { toast } from 'sonner'

interface BancoEmpresa {
  id: string
  empresa_id: string
  banco: string
  numero_cuenta: string | null
  clabe: string | null
  moneda: string
  activo: boolean
  empresas: { nombre: string; codigo: string }
}

interface Empresa {
  id: string
  codigo: string
  nombre: string
}

export function BancosClient({ bancos, empresas }: { bancos: BancoEmpresa[]; empresas: Empresa[] }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BancoEmpresa | null>(null)

  const { sorted, sortConfig, handleSort } = useSort(bancos)

  async function handleToggle(b: BancoEmpresa) {
    const result = await toggleBanco(b.id, !b.activo)
    if (result.error) toast.error(result.error)
    else toast.success(b.activo ? 'Cuenta desactivada' : 'Cuenta activada')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas bancarias"
        description="Cuentas bancarias de las empresas del grupo"
        actionLabel="Nueva cuenta"
        onAction={() => { setEditing(null); setDialogOpen(true) }}
      />
      <BulkUpload
        config={{
          templateName: 'bancos-empresa',
          headers: ['empresa_codigo', 'banco', 'numero_cuenta', 'clabe', 'moneda'],
          sampleRows: [['50', 'Santander', '65501234567', '014180655012345678', 'MXN'], ['70', 'BBVA', '01234567890', '012180012345678901', 'USD']],
          requiredFields: ['empresa_codigo', 'banco'],
          onUpload: bulkImportBancos,
        }}
      />

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader label="Empresa" sortKey="empresas.nombre" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Banco" sortKey="banco" sortConfig={sortConfig} onSort={handleSort} />
              <TableHead>No. Cuenta</TableHead>
              <TableHead>CLABE</TableHead>
              <SortableHeader label="Moneda" sortKey="moneda" sortConfig={sortConfig} onSort={handleSort} />
              <SortableHeader label="Estatus" sortKey="activo" sortConfig={sortConfig} onSort={handleSort} />
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay cuentas bancarias registradas
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.empresas?.codigo} - {b.empresas?.nombre}</TableCell>
                  <TableCell>{b.banco}</TableCell>
                  <TableCell className="text-muted-foreground">{b.numero_cuenta || '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{b.clabe || '—'}</TableCell>
                  <TableCell>{b.moneda}</TableCell>
                  <TableCell><StatusBadge active={b.activo} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(b); setDialogOpen(true) }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggle(b)}>
                        <Power className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <BancoDialog open={dialogOpen} onOpenChange={setDialogOpen} banco={editing} empresas={empresas} />
    </div>
  )
}
