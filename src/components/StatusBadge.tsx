import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  active: boolean
}

export function StatusBadge({ active }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        active
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-500'
      )}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  )
}

const ESTATUS_STYLES: Record<string, string> = {
  BORRADOR: 'bg-gray-100 text-gray-700',
  EN_REVISION: 'bg-blue-100 text-blue-700',
  APROBADO: 'bg-green-100 text-green-700',
  RECHAZADO: 'bg-red-100 text-red-700',
  PROGRAMADO: 'bg-purple-100 text-purple-700',
  PAGADO: 'bg-green-200 text-green-800',
  COMPROBADO: 'bg-emerald-100 text-emerald-800',
  CANCELADO: 'bg-gray-200 text-gray-600',
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

export function EstatusBadge({ estatus }: { estatus: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        ESTATUS_STYLES[estatus] || 'bg-gray-100 text-gray-700'
      )}
    >
      {ESTATUS_LABELS[estatus] || estatus}
    </span>
  )
}
