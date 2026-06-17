/**
 * Simple CSV parser and generator for bulk uploads.
 * No external dependencies needed since templates are controlled.
 */

export function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  return lines.map((line) => {
    const row: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"'
          i++
        } else if (char === '"') {
          inQuotes = false
        } else {
          current += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === ',') {
          row.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
    }
    row.push(current.trim())
    return row
  })
}

export function generateCSV(headers: string[], sampleRows?: string[][]): string {
  const BOM = '\uFEFF'
  const headerLine = headers.join(',')
  const lines = [headerLine]
  if (sampleRows) {
    for (const row of sampleRows) {
      lines.push(row.map((cell) => {
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`
        }
        return cell
      }).join(','))
    }
  }
  return BOM + lines.join('\n')
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
