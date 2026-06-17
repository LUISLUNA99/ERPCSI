export function calcularDeadlineFactura(fechaPago: Date): Date {
  const mas7dias = new Date(fechaPago)
  mas7dias.setDate(mas7dias.getDate() + 7)

  const finDeMes = new Date(fechaPago.getFullYear(), fechaPago.getMonth() + 1, 0)

  return mas7dias < finDeMes ? mas7dias : finDeMes
}

export function calcularNivelAlerta(deadline: Date): 'PENDIENTE' | 'POR_VENCER' | 'VENCIDA' {
  const hoy = new Date()
  const diasRestantes = Math.floor((deadline.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))

  if (diasRestantes < 0) return 'VENCIDA'
  if (diasRestantes <= 2) return 'POR_VENCER'
  return 'PENDIENTE'
}
