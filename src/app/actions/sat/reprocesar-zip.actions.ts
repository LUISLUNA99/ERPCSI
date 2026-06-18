'use server'

import { createClient } from '@/lib/supabase/server'
import { reprocesarZIP } from '@/lib/sat/procesar-paquetes'

export async function reprocesarArchivoSAT(archivoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (!perfil || !['admin', 'tesorero'].includes(perfil.rol)) {
    return { error: 'Sin permisos para reprocesar' }
  }

  return reprocesarZIP(archivoId)
}
