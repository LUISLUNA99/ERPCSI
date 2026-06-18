import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import type { Rol } from '@/types/database.types'

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/auth/callback']

// Mapa de rutas protegidas y qué roles pueden acceder
const ROUTE_PERMISSIONS: Record<string, Rol[]> = {
  '/dashboard': ['admin', 'director', 'tesorero', 'operario', 'visualizador'],
  '/requisiciones': ['admin', 'director', 'tesorero', 'operario', 'visualizador'],
  '/requisiciones/nueva': ['admin', 'director', 'tesorero', 'operario'],
  '/aprobaciones': ['admin', 'director'],
  '/pagos': ['admin', 'tesorero'],
  '/facturas': ['admin', 'tesorero', 'operario'],
  '/conciliacion': ['admin', 'tesorero'],
  '/admin': ['admin'],
  '/reportes': ['admin', 'director', 'tesorero', 'visualizador'],
  '/notificaciones': ['admin', 'director', 'tesorero', 'operario', 'visualizador'],
}

function getRolesForPath(pathname: string): Rol[] | null {
  // Buscar coincidencia exacta primero, luego por prefijo (más específico primero)
  const sortedRoutes = Object.keys(ROUTE_PERMISSIONS).sort(
    (a, b) => b.length - a.length
  )

  for (const route of sortedRoutes) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return ROUTE_PERMISSIONS[route]
    }
  }

  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas públicas
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    const { supabaseResponse } = await updateSession(request)
    return supabaseResponse
  }

  // Actualizar sesión y obtener usuario
  const { supabase, user, supabaseResponse } = await updateSession(request)

  // Sin sesión → redirigir a login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Obtener perfil del usuario para verificar rol
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, activo')
    .eq('id', user.id)
    .single()

  // Sin perfil o inactivo → redirigir a login
  if (!perfil || !perfil.activo) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'sin_acceso')
    return NextResponse.redirect(url)
  }

  // Verificar permisos de ruta
  const allowedRoles = getRolesForPath(pathname)
  if (allowedRoles && !allowedRoles.includes(perfil.rol as Rol)) {
    const url = request.nextUrl.clone()
    url.pathname = '/sin-permisos'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplicar a todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico
     * - Archivos públicos (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
