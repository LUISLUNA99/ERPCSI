import type { SupabaseClient } from '@supabase/supabase-js'

export async function generarFolio(supabase: SupabaseClient): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('requisiciones')
    .select('*', { count: 'exact', head: true })
    .like('folio', `REQ-${year}-%`)

  const numero = String((count || 0) + 1).padStart(4, '0')
  return `REQ-${year}-${numero}`
}
