'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EstatusBadge } from '@/components/StatusBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { programarPago, ejecutarPago } from '@/app/actions/pagos.actions'
import { Calendar, CreditCard, Eye, Loader2, Banknote } from 'lucide-react'
import { toast } from 'sonner'

interface Requisicion {
  id: string
  folio: string
  concepto: string
  moneda: string
  importe_total: number
  estatus: string
  mes_pago_deseado: string
  tiene_factura_inicial: boolean
  proveedores: { nombre: string } | null
  empresas_paga: { nombre: string; codigo: string } | null
  perfiles: { nombre: string } | null
  pagos: Array<{ id: string; fecha_programada: string; banco_empresa: { banco: string; numero_cuenta: string } | null }> | null
}

interface BancoEmpresa {
  id: string
  empresa_id: string
  banco: string
  numero_cuenta: string | null
  moneda: string
  activo: boolean
  empresas: { nombre: string; codigo: string }
}

interface Props {
  requisiciones: Requisicion[]
  bancos: BancoEmpresa[]
}

export function PagosClient({ requisiciones, bancos }: Props) {
  const router = useRouter()
  const [dialogType, setDialogType] = useState<'programar' | 'ejecutar' | null>(null)
  const [selectedReq, setSelectedReq] = useState<Requisicion | null>(null)
  const [loading, setLoading] = useState(false)
  const [bancoId, setBancoId] = useState('')

  const aprobadas = requisiciones.filter((r) => r.estatus === 'APROBADO')
  const programadas = requisiciones.filter((r) => r.estatus === 'PROGRAMADO')

  function openProgramar(req: Requisicion) {
    setSelectedReq(req)
    setDialogType('programar')
    setBancoId('')
  }

  function openEjecutar(req: Requisicion) {
    setSelectedReq(req)
    setDialogType('ejecutar')
  }

  async function handleProgramar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedReq) return
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    formData.set('banco_empresa_id', bancoId)
    const result = await programarPago(selectedReq.id, formData)
    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(`Pago de ${selectedReq.folio} programado`)
    setDialogType(null)
    router.refresh()
  }

  async function handleEjecutar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedReq) return
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await ejecutarPago(selectedReq.id, formData)
    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(`Pago de ${selectedReq.folio} registrado`)
    setDialogType(null)
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        <p className="text-muted-foreground mt-1">
          {aprobadas.length} por programar | {programadas.length} por ejecutar
        </p>
      </div>

      {/* Por programar */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-accent-500" />
          <span>Por programar ({aprobadas.length})</span>
        </h2>
        {aprobadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay solicitudes de compra aprobadas pendientes de programar.</p>
        ) : (
          aprobadas.map((r) => (
            <ReqCard key={r.id} req={r} router={router}>
              <Button size="sm" onClick={() => openProgramar(r)} className="bg-accent-500 hover:bg-accent-600 text-white">
                <Calendar className="w-4 h-4 mr-1" /> Programar
              </Button>
            </ReqCard>
          ))
        )}
      </section>

      {/* Por ejecutar */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center space-x-2">
          <Banknote className="w-5 h-5 text-success" />
          <span>Programados - por ejecutar ({programadas.length})</span>
        </h2>
        {programadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay pagos programados pendientes de ejecucion.</p>
        ) : (
          programadas.map((r) => (
            <ReqCard key={r.id} req={r} router={router}>
              <div className="text-xs text-muted-foreground mr-2">
                {r.pagos?.[0]?.banco_empresa?.banco} | Prog: {r.pagos?.[0]?.fecha_programada}
              </div>
              <Button size="sm" onClick={() => openEjecutar(r)} className="bg-success hover:bg-green-700 text-white">
                <CreditCard className="w-4 h-4 mr-1" /> Registrar pago
              </Button>
            </ReqCard>
          ))
        )}
      </section>

      {/* Dialog programar */}
      <Dialog open={dialogType === 'programar'} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Programar pago</DialogTitle></DialogHeader>
          <form onSubmit={handleProgramar} className="space-y-4">
            <ReqSummary req={selectedReq} />
            <div className="space-y-2">
              <Label>Cuenta bancaria *</Label>
              <Select value={bancoId} onValueChange={setBancoId}>
                <SelectTrigger><SelectValue placeholder="Selecciona cuenta" /></SelectTrigger>
                <SelectContent>
                  {bancos.filter((b) => b.activo).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.empresas.codigo} - {b.banco} {b.numero_cuenta ? `(${b.numero_cuenta})` : ''} ({b.moneda})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_programada">Fecha programada *</Label>
              <Input id="fecha_programada" name="fecha_programada" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea id="observaciones" name="observaciones" rows={2} />
            </div>
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
              <Button type="submit" disabled={loading || !bancoId} className="bg-accent-500 hover:bg-accent-600 text-white">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Programar pago
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog ejecutar */}
      <Dialog open={dialogType === 'ejecutar'} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar pago ejecutado</DialogTitle></DialogHeader>
          <form onSubmit={handleEjecutar} className="space-y-4">
            <ReqSummary req={selectedReq} />
            {!selectedReq?.tiene_factura_inicial && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                Esta solicitud de compra no tiene factura. Al registrar el pago se creara una alerta de factura pendiente.
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_pago">Fecha del pago *</Label>
                <Input id="fecha_pago" name="fecha_pago" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="folio_bancario">Folio bancario *</Label>
                <Input id="folio_bancario" name="folio_bancario" required />
              </div>
            </div>
            {selectedReq?.moneda !== 'MXN' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_cambio_real">Tipo de cambio real</Label>
                  <Input id="tipo_cambio_real" name="tipo_cambio_real" type="number" step="0.0001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="importe_real_mxn">Importe real MXN</Label>
                  <Input id="importe_real_mxn" name="importe_real_mxn" type="number" step="0.01" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="observaciones_pago">Observaciones</Label>
              <Textarea id="observaciones_pago" name="observaciones_pago" rows={2} />
            </div>
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-success hover:bg-green-700 text-white">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Registrar pago
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ReqCard({ req, router, children }: { req: Requisicion; router: ReturnType<typeof useRouter>; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <span className="font-mono font-medium text-accent-500">{req.folio}</span>
              <EstatusBadge estatus={req.estatus} />
              {!req.tiene_factura_inicial && (
                <span className="text-xs text-amber-600 font-medium">Sin factura</span>
              )}
            </div>
            <div className="mt-1 text-sm">
              <span className="text-muted-foreground">{req.proveedores?.nombre || '—'}</span>
              <span className="mx-2 text-gray-300">|</span>
              <span className="font-bold">${req.importe_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {req.moneda}</span>
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-muted-foreground">Paga: {req.empresas_paga?.codigo}</span>
              <span className="mx-2 text-gray-300">|</span>
              <span className="text-muted-foreground">Mes deseado: {req.mes_pago_deseado}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => router.push(`/requisiciones/${req.id}`)}>
              <Eye className="w-4 h-4" />
            </Button>
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ReqSummary({ req }: { req: Requisicion | null }) {
  if (!req) return null
  return (
    <div className="p-3 rounded-lg bg-gray-50">
      <p className="font-mono font-medium">{req.folio}</p>
      <p className="text-sm text-muted-foreground">{req.proveedores?.nombre} - {req.concepto}</p>
      <p className="text-sm font-bold mt-1">${req.importe_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {req.moneda}</p>
    </div>
  )
}
