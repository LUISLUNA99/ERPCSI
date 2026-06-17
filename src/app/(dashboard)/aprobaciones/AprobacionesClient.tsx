'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { EstatusBadge } from '@/components/StatusBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { aprobarRequisicion, rechazarRequisicion } from '@/app/actions/aprobaciones.actions'
import { CheckCircle, XCircle, Eye, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Requisicion {
  id: string
  folio: string
  fecha_solicitud: string
  concepto: string
  moneda: string
  importe_total: number
  estatus: string
  mes_servicio: string
  proveedores: { nombre: string } | null
  empresas_generadora: { nombre: string; codigo: string } | null
  clasificaciones_gasto: { nombre: string } | null
  perfiles: { nombre: string } | null
}

export function AprobacionesClient({ requisiciones }: { requisiciones: Requisicion[] }) {
  const router = useRouter()
  const [selectedReq, setSelectedReq] = useState<Requisicion | null>(null)
  const [dialogType, setDialogType] = useState<'aprobar' | 'rechazar' | null>(null)
  const [loading, setLoading] = useState(false)
  const [observaciones, setObservaciones] = useState('')

  const pendientes = requisiciones.filter((r) => r.estatus === 'EN_REVISION')

  function openDialog(req: Requisicion, type: 'aprobar' | 'rechazar') {
    setSelectedReq(req)
    setDialogType(type)
    setObservaciones('')
  }

  async function handleAprobar() {
    if (!selectedReq) return
    setLoading(true)
    const result = await aprobarRequisicion(selectedReq.id, observaciones || undefined)
    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(`Solicitud de compra ${selectedReq.folio} aprobada`)
    setDialogType(null)
    router.refresh()
  }

  async function handleRechazar() {
    if (!selectedReq) return
    if (!observaciones.trim()) { toast.error('El motivo de rechazo es obligatorio'); return }
    setLoading(true)
    const result = await rechazarRequisicion(selectedReq.id, observaciones)
    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(`Solicitud de compra ${selectedReq.folio} rechazada`)
    setDialogType(null)
    router.refresh()
  }

  // Calcular si llevan mas de 48h sin revisar
  function horasPendiente(fecha: string): number {
    return (Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Aprobaciones</h1>
        <p className="text-muted-foreground mt-1">
          {pendientes.length} solicitud{pendientes.length !== 1 ? 'es' : ''} de compra pendiente{pendientes.length !== 1 ? 's' : ''} de aprobacion
        </p>
      </div>

      {pendientes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <p className="text-lg font-medium">Todo al dia</p>
            <p className="text-muted-foreground">No hay solicitudes de compra pendientes de aprobacion</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendientes.map((r) => {
            const horas = horasPendiente(r.fecha_solicitud)
            const urgente = horas > 48

            return (
              <Card key={r.id} className={urgente ? 'border-warning' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-medium text-accent-500">{r.folio}</span>
                        <EstatusBadge estatus={r.estatus} />
                        {urgente && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            +48h sin revisar
                          </span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Solicitante: </span>
                          <span className="font-medium">{r.perfiles?.nombre}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Proveedor: </span>
                          <span className="font-medium">{r.proveedores?.nombre || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Empresa: </span>
                          <span className="font-medium">{r.empresas_generadora?.codigo}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Importe: </span>
                          <span className="font-bold">${r.importe_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {r.moneda}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">{r.concepto}</p>
                    </div>

                    <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                      <Button variant="outline" size="sm" onClick={() => router.push(`/requisiciones/${r.id}`)}>
                        <Eye className="w-4 h-4 mr-1" /> Ver
                      </Button>
                      <Button size="sm" variant="outline" className="text-danger border-danger hover:bg-red-50" onClick={() => openDialog(r, 'rechazar')}>
                        <XCircle className="w-4 h-4 mr-1" /> Rechazar
                      </Button>
                      <Button size="sm" className="bg-success hover:bg-green-700 text-white" onClick={() => openDialog(r, 'aprobar')}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog aprobar/rechazar */}
      <Dialog open={!!dialogType} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'aprobar' ? 'Aprobar solicitud de compra' : 'Rechazar solicitud de compra'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="font-mono font-medium">{selectedReq?.folio}</p>
              <p className="text-sm text-muted-foreground">{selectedReq?.concepto}</p>
              <p className="text-sm font-bold mt-1">
                ${selectedReq?.importe_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {selectedReq?.moneda}
              </p>
            </div>
            <div className="space-y-2">
              <Label>
                {dialogType === 'aprobar' ? 'Observaciones para el tesorero (opcional)' : 'Motivo del rechazo *'}
              </Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder={dialogType === 'aprobar' ? 'Notas adicionales...' : 'Explica el motivo del rechazo...'}
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setDialogType(null)}>Cancelar</Button>
              {dialogType === 'aprobar' ? (
                <Button onClick={handleAprobar} disabled={loading} className="bg-success hover:bg-green-700 text-white">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirmar aprobacion
                </Button>
              ) : (
                <Button onClick={handleRechazar} disabled={loading} variant="destructive">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirmar rechazo
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
