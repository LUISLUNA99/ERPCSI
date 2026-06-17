import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle, CreditCard, AlertTriangle, Clock, DollarSign } from 'lucide-react'
import { EstatusBadge } from '@/components/StatusBadge'
import { DashboardCharts } from './DashboardCharts'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const [reqTotal, reqRevision, reqAprobadas, reqProgramadas, alertasActivas, reqRecientes] = await Promise.all([
    supabase.from('requisiciones').select('*', { count: 'exact', head: true }),
    supabase.from('requisiciones').select('*', { count: 'exact', head: true }).eq('estatus', 'EN_REVISION'),
    supabase.from('requisiciones').select('*', { count: 'exact', head: true }).eq('estatus', 'APROBADO'),
    supabase.from('requisiciones').select('*', { count: 'exact', head: true }).eq('estatus', 'PROGRAMADO'),
    supabase.from('alertas_factura').select('*', { count: 'exact', head: true }).eq('resuelta', false),
    supabase.from('requisiciones')
      .select('id, folio, concepto, importe_total, moneda, estatus, fecha_solicitud, proveedores(nombre)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const kpis = [
    {
      title: 'Total solicitudes',
      value: reqTotal.count || 0,
      icon: FileText,
      color: 'text-accent-500',
      bg: 'bg-blue-50',
      href: '/requisiciones',
    },
    {
      title: 'Por aprobar',
      value: reqRevision.count || 0,
      icon: CheckCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      href: '/aprobaciones',
    },
    {
      title: 'Por pagar',
      value: (reqAprobadas.count || 0) + (reqProgramadas.count || 0),
      icon: CreditCard,
      color: 'text-green-600',
      bg: 'bg-green-50',
      href: '/pagos',
    },
    {
      title: 'Alertas activas',
      value: alertasActivas.count || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      href: '/facturas',
    },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recientes = (reqRecientes.data || []) as any[]

  const quickLinks: Record<string, Array<{ label: string; href: string; icon: typeof FileText }>> = {
    operario: [
      { label: 'Nueva solicitud de compra', href: '/requisiciones/nueva', icon: FileText },
      { label: 'Mis solicitudes de compra', href: '/requisiciones', icon: Clock },
    ],
    director: [
      { label: 'Aprobaciones pendientes', href: '/aprobaciones', icon: CheckCircle },
      { label: 'Reportes', href: '/reportes', icon: DollarSign },
    ],
    tesorero: [
      { label: 'Pagos pendientes', href: '/pagos', icon: CreditCard },
      { label: 'Facturas pendientes', href: '/facturas', icon: AlertTriangle },
    ],
    admin: [
      { label: 'Aprobaciones', href: '/aprobaciones', icon: CheckCircle },
      { label: 'Pagos', href: '/pagos', icon: CreditCard },
      { label: 'Reportes', href: '/reportes', icon: DollarSign },
    ],
    visualizador: [
      { label: 'Reportes', href: '/reportes', icon: DollarSign },
    ],
  }

  const links = quickLinks[perfil.rol] || []

  // Chart data — gastos por empresa y clasificacion
  const { data: reqParaCharts } = await supabase
    .from('requisiciones')
    .select('importe_total, empresa_generadora_id, clasificacion_id, empresas!requisiciones_empresa_generadora_id_fkey(codigo), clasificaciones_gasto(nombre)')
    .in('estatus', ['APROBADO', 'PROGRAMADO', 'PAGADO', 'COMPROBADO'])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartData = reqParaCharts as any[] || []

  const empresaMap = new Map<string, { nombre: string; total: number }>()
  const clasificacionMap = new Map<string, { nombre: string; total: number }>()

  for (const r of chartData) {
    const empNombre = r.empresas?.codigo || 'Sin empresa'
    const emp = empresaMap.get(empNombre) || { nombre: empNombre, total: 0 }
    emp.total += Number(r.importe_total) || 0
    empresaMap.set(empNombre, emp)

    const clasNombre = r.clasificaciones_gasto?.nombre || 'Sin clasificacion'
    const clas = clasificacionMap.get(clasNombre) || { nombre: clasNombre, total: 0 }
    clas.total += Number(r.importe_total) || 0
    clasificacionMap.set(clasNombre, clas)
  }

  const gastosPorEmpresa = Array.from(empresaMap.values()).sort((a, b) => b.total - a.total)
  const gastosPorClasificacion = Array.from(clasificacionMap.values()).sort((a, b) => b.total - a.total).slice(0, 8)

  return (
    <div className="space-y-8">
      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {perfil.nombre}
        </h1>
        <p className="text-muted-foreground mt-1">
          Resumen del sistema de Cuentas por Pagar
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Link key={kpi.title} href={kpi.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </CardTitle>
                  <div className={`${kpi.bg} p-2 rounded-lg`}>
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{kpi.value}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Charts */}
      {['admin', 'director', 'tesorero'].includes(perfil.rol) && (
        <DashboardCharts gastosPorEmpresa={gastosPorEmpresa} gastosPorClasificacion={gastosPorClasificacion} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Requisiciones recientes */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Solicitudes recientes</CardTitle>
            </CardHeader>
            <CardContent>
              {recientes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin solicitudes de compra</p>
              ) : (
                <div className="space-y-3">
                  {recientes.map((r) => (
                    <Link key={r.id} href={`/requisiciones/${r.id}`} className="block">
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm font-medium text-primary-500">{r.folio}</span>
                            <EstatusBadge estatus={r.estatus} />
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">
                            {r.proveedores?.nombre || ''} — {r.concepto}
                          </p>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <p className="font-medium">
                            ${Number(r.importe_total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">{r.moneda}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Acciones rapidas */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones rapidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {links.map((link) => {
                  const Icon = link.icon
                  return (
                    <Link key={link.href} href={link.href}>
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <Icon className="w-5 h-5 text-accent-500" />
                        <span className="text-sm font-medium">{link.label}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
