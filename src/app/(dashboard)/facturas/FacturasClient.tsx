'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { subirFactura } from '@/app/actions/facturas.actions'
import { Receipt, Loader2, AlertTriangle, FileUp } from 'lucide-react'
import { toast } from 'sonner'

interface Requisicion {
  id: string
  folio: string
  concepto: string
  moneda: string
  importe_total: number
  proveedores: { nombre: string } | null
  perfiles: { nombre: string } | null
  pagos: Array<{ fecha_pago: string; folio_bancario: string }> | null
  alertas_factura: Array<{ deadline: string; nivel: string; resuelta: boolean }> | null
}

const NIVEL_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-700',
  POR_VENCER: 'bg-orange-100 text-orange-700',
  VENCIDA: 'bg-red-100 text-red-700',
}

export function FacturasClient({ requisiciones }: { requisiciones: Requisicion[] }) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedReq, setSelectedReq] = useState<Requisicion | null>(null)
  const [loading, setLoading] = useState(false)
  const [pdfName, setPdfName] = useState<string | null>(null)
  const [xmlName, setXmlName] = useState<string | null>(null)

  function openDialog(req: Requisicion) {
    setSelectedReq(req)
    setPdfName(null)
    setXmlName(null)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedReq) return
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await subirFactura(selectedReq.id, formData)
    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    toast.success(`Factura registrada para ${selectedReq.folio}`)
    setDialogOpen(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturas pendientes</h1>
        <p className="text-muted-foreground mt-1">
          Solicitudes de compra pagadas que requieren factura del proveedor
        </p>
      </div>

      {requisiciones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="w-12 h-12 text-success mx-auto mb-4" />
            <p className="text-lg font-medium">Todo comprobado</p>
            <p className="text-muted-foreground">No hay facturas pendientes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requisiciones.map((r) => {
            const alerta = r.alertas_factura?.find((a) => !a.resuelta)
            return (
              <Card key={r.id} className={alerta?.nivel === 'VENCIDA' ? 'border-danger' : alerta?.nivel === 'POR_VENCER' ? 'border-warning' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-medium text-accent-500">{r.folio}</span>
                        {alerta && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${NIVEL_COLORS[alerta.nivel]}`}>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {alerta.nivel === 'VENCIDA' ? 'Factura vencida' : alerta.nivel === 'POR_VENCER' ? 'Por vencer' : 'Pendiente'}
                            {' - Limite: '}{alerta.deadline}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm">
                        <span className="text-muted-foreground">{r.proveedores?.nombre}</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="font-bold">${r.importe_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="text-muted-foreground">Pagado: {r.pagos?.[0]?.fecha_pago}</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => openDialog(r)} className="bg-accent-500 hover:bg-accent-600 text-white">
                      <Receipt className="w-4 h-4 mr-1" /> Subir factura
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar factura</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="font-mono font-medium">{selectedReq?.folio}</p>
              <p className="text-sm text-muted-foreground">{selectedReq?.proveedores?.nombre}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero_factura">Numero de factura *</Label>
              <Input id="numero_factura" name="numero_factura" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_factura">Fecha de factura</Label>
              <Input id="fecha_factura" name="fecha_factura" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="factura_file">Archivo PDF de la factura</Label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                  <FileUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate text-muted-foreground">
                    {pdfName || 'Seleccionar archivo PDF...'}
                  </span>
                  <input
                    type="file"
                    id="factura_file"
                    name="factura_file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => setPdfName(e.target.files?.[0]?.name || null)}
                  />
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="xml_file">Archivo XML CFDI</Label>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                  <FileUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate text-muted-foreground">
                    {xmlName || 'Seleccionar archivo XML...'}
                  </span>
                  <input
                    type="file"
                    id="xml_file"
                    name="xml_file"
                    accept=".xml"
                    className="hidden"
                    onChange={(e) => setXmlName(e.target.files?.[0]?.name || null)}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Si adjuntas el XML, se extraera automaticamente el UUID, RFC y montos del CFDI
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-accent-500 hover:bg-accent-600 text-white">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Registrar factura
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
