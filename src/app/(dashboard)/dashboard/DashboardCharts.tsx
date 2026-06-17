'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface ChartProps {
  gastosPorEmpresa: Array<{ nombre: string; total: number }>
  gastosPorClasificacion: Array<{ nombre: string; total: number }>
}

const COLORS = ['#1B3A6B', '#2563EB', '#60A5FA', '#16A34A', '#D97706', '#DC2626', '#8B5CF6', '#EC4899']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTooltip(value: any) {
  return [`$${Number(value).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Total']
}

export function DashboardCharts({ gastosPorEmpresa, gastosPorClasificacion }: ChartProps) {
  if (gastosPorEmpresa.length === 0 && gastosPorClasificacion.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {gastosPorEmpresa.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gastos por empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={gastosPorEmpresa}>
                <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={formatTooltip} labelStyle={{ fontWeight: 'bold' }} />
                <Bar dataKey="total" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {gastosPorClasificacion.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribucion por tipo de gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={gastosPorClasificacion}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="total"
                  nameKey="nombre"
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {gastosPorClasificacion.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={formatTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
