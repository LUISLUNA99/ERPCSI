const MESES = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
]

export function getMesesOptions(): { value: string; label: string }[] {
  const now = new Date()
  const year = now.getFullYear()
  const options: { value: string; label: string }[] = []

  // 3 meses atras + mes actual + 6 meses adelante
  for (let offset = -3; offset <= 6; offset++) {
    const date = new Date(year, now.getMonth() + offset, 1)
    const y = date.getFullYear()
    const m = MESES[date.getMonth()]
    const value = `${m}-${y}`
    options.push({ value, label: value })
  }

  return options
}

export function getMesActual(): string {
  const now = new Date()
  return `${MESES[now.getMonth()]}-${now.getFullYear()}`
}
