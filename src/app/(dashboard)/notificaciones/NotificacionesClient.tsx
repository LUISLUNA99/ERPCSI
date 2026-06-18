'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { marcarLeida, marcarTodasLeidas } from '@/app/actions/notificaciones.actions'
import { Bell, CheckCheck, FileText, CheckCircle, XCircle, CreditCard, AlertTriangle, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSort, type SortDirection } from '@/hooks/useSort'

interface Notificacion {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  requisicion_id: string | null
  leida: boolean
  created_at: string
}

const TIPO_ICONS: Record<string, typeof Bell> = {
  nueva_requisicion: FileText,
  aprobacion: CheckCircle,
  rechazo: XCircle,
  pago: CreditCard,
  alerta_factura: AlertTriangle,
}

export function NotificacionesClient({ notificaciones }: { notificaciones: Notificacion[] }) {
  const router = useRouter()
  const noLeidas = notificaciones.filter((n) => !n.leida).length
  const { sorted, sortConfig, handleSort } = useSort(notificaciones, 'created_at', 'desc')

  async function handleClick(n: Notificacion) {
    if (!n.leida) await marcarLeida(n.id)
    if (n.requisicion_id) router.push(`/requisiciones/${n.requisicion_id}`)
  }

  async function handleMarcarTodas() {
    await marcarTodasLeidas()
    router.refresh()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-muted-foreground mt-1">
            {noLeidas > 0 ? `${noLeidas} sin leer` : 'Todo al dia'}
          </p>
        </div>
        {noLeidas > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarcarTodas}>
            <CheckCheck className="w-4 h-4 mr-2" /> Marcar todas como leidas
          </Button>
        )}
      </div>

      {/* Ordenar */}
      {notificaciones.length > 0 && (
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Ordenar por:</span>
          <Select
            value={sortConfig?.key || 'created_at'}
            onValueChange={(key) => handleSort(key)}
          >
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Fecha</SelectItem>
              <SelectItem value="tipo">Tipo</SelectItem>
              <SelectItem value="titulo">Titulo</SelectItem>
              <SelectItem value="leida">Estado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {notificaciones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Sin notificaciones</p>
            <p className="text-muted-foreground">Las notificaciones de los ultimos 30 dias apareceran aqui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((n) => {
            const Icon = TIPO_ICONS[n.tipo] || Bell
            return (
              <Card
                key={n.id}
                className={cn(
                  'cursor-pointer transition-colors hover:bg-gray-50',
                  !n.leida && 'border-l-4 border-l-accent-500 bg-accent-50/30'
                )}
                onClick={() => handleClick(n)}
              >
                <CardContent className="py-3">
                  <div className="flex items-start space-x-3">
                    <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', !n.leida ? 'text-accent-500' : 'text-muted-foreground')} />
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm', !n.leida && 'font-medium')}>{n.titulo}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.mensaje}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString('es-MX')}
                      </p>
                    </div>
                    {!n.leida && <div className="w-2 h-2 rounded-full bg-accent-500 mt-2 flex-shrink-0" />}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
