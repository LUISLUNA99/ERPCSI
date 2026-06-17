'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EstatusBadge } from '@/components/StatusBadge'
import { enviarRequisicion } from '@/app/actions/requisiciones.actions'
import { ArrowLeft, Send } from 'lucide-react'
import { toast } from 'sonner'

interface RelatedRecord {
  nombre?: string
  codigo?: string
  centro_de_costo?: string
  [key: string]: string | undefined
}

interface HistorialItem {
  id: string
  estatus_anterior: string | null
  estatus_nuevo: string | null
  comentario: string | null
  created_at: string
  perfiles: { nombre: string } | null
}

interface AprobacionItem {
  id: string
  decision: string
  observaciones: string | null
  fecha: string
  director: { nombre: string } | null
}

interface RequisicionDetalle {
  id: string
  folio: string
  estatus: string
  fecha_solicitud: string
  concepto: string
  moneda: string
  importe_sin_iva: number
  iva: number
  importe_total: number
  mes_servicio: string
  mes_pago_deseado: string
  observaciones_solicitante: string | null
  motivo_sin_factura: string | null
  perfiles: RelatedRecord | null
  empresas_generadora: RelatedRecord | null
  empresas_paga: RelatedRecord | null
  proveedores: RelatedRecord | null
  clasificaciones_gasto: RelatedRecord | null
  proyectos: RelatedRecord | null
  historial_requisiciones: HistorialItem[]
  aprobaciones: AprobacionItem[]
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  requisicion: any
  rol: string
  isOwner: boolean
  userId: string
}

export function DetalleRequisicionClient({ requisicion, rol, isOwner }: Props) {
  const router = useRouter()
  const r = requisicion as RequisicionDetalle
  const historial = r.historial_requisiciones || []
  const aprobaciones = r.aprobaciones || []
  const canReenviar = isOwner && (r.estatus === 'BORRADOR' || r.estatus === 'RECHAZADO')

  async function handleEnviar() {
    if (!confirm('Enviar esta solicitud de compra para aprobacion?')) return
    const result = await enviarRequisicion(r.id)
    if (result.error) { toast.error(result.error); return }
    toast.success('Solicitud de compra enviada para aprobacion')
    router.refresh()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/requisiciones')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{r.folio}</h1>
            <p className="text-sm text-muted-foreground">
              Solicitado por {r.perfiles?.nombre} el {new Date(r.fecha_solicitud).toLocaleDateString('es-MX')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <EstatusBadge estatus={r.estatus} />
          {canReenviar && (
            <Button onClick={handleEnviar} className="bg-accent-500 hover:bg-accent-600 text-white">
              <Send className="w-4 h-4 mr-2" /> Enviar para aprobacion
            </Button>
          )}
        </div>
      </div>

      {/* Rechazo visible */}
      {r.estatus === 'RECHAZADO' && aprobaciones.length > 0 && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="font-medium text-red-800">Solicitud de compra rechazada</p>
          <p className="text-sm text-red-700 mt-1">
            Motivo: {aprobaciones[aprobaciones.length - 1].observaciones}
          </p>
          <p className="text-xs text-red-500 mt-1">
            Por {aprobaciones[aprobaciones.length - 1].director?.nombre} el{' '}
            {new Date(aprobaciones[aprobaciones.length - 1].fecha).toLocaleDateString('es-MX')}
          </p>
        </div>
      )}

      {/* Datos generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Datos generales</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="Clasificacion" value={r.clasificaciones_gasto?.nombre} />
            <Row label="Mes del servicio" value={r.mes_servicio} />
            <Row label="Mes de pago deseado" value={r.mes_pago_deseado} />
            <Row label="Empresa generadora" value={r.empresas_generadora ? `${r.empresas_generadora.codigo} - ${r.empresas_generadora.nombre}` : '—'} />
            <Row label="Empresa que paga" value={r.empresas_paga ? `${r.empresas_paga.codigo} - ${r.empresas_paga.nombre}` : '—'} />
            <Row label="Proyecto / CC" value={r.proyectos ? `${r.proyectos.centro_de_costo} - ${r.proyectos.nombre}` : '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Proveedor e importes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="Proveedor" value={r.proveedores?.nombre || '—'} />
            <Row label="Concepto" value={r.concepto} />
            <Row label="Moneda" value={r.moneda} />
            <Row label="Subtotal" value={`$${Number(r.importe_sin_iva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} />
            <Row label="IVA" value={`$${Number(r.iva).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} />
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">Total</span>
              <span className="font-bold text-lg text-primary-500">
                ${Number(r.importe_total).toLocaleString('es-MX', { minimumFractionDigits: 2 })} {r.moneda}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Observaciones */}
      {(r.observaciones_solicitante || r.motivo_sin_factura) && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Observaciones</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {r.observaciones_solicitante && <Row label="Del solicitante" value={r.observaciones_solicitante} />}
            {r.motivo_sin_factura && <Row label="Motivo sin factura" value={r.motivo_sin_factura} />}
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Historial de cambios</CardTitle></CardHeader>
        <CardContent>
          {historial.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin movimientos registrados</p>
          ) : (
            <div className="space-y-3">
              {historial.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((h) => (
                <div key={h.id} className="flex items-start space-x-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-accent-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p>
                      <span className="font-medium">{h.perfiles?.nombre}</span>
                      {' '}
                      {h.estatus_anterior && <><EstatusBadge estatus={h.estatus_anterior} /> {' → '}</>}
                      {h.estatus_nuevo && <EstatusBadge estatus={h.estatus_nuevo} />}
                    </p>
                    {h.comentario && <p className="text-muted-foreground mt-0.5">{h.comentario}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(h.created_at).toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}
