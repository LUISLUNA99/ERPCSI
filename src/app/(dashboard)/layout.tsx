import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getNavigationForRole } from '@/lib/navigation'
import { Sidebar } from '@/components/Sidebar'
import type { Rol } from '@/types/database.types'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol, email')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')

  const navItems = getNavigationForRole(perfil.rol as Rol)

  return (
    <div className="min-h-screen bg-neutral">
      <Sidebar
        items={navItems}
        userName={perfil.nombre}
        userRole={perfil.rol}
      />
      <main className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          {children}
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  )
}
