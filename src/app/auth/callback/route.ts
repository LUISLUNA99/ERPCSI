import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { registrarAccion } from '@/lib/auditoria'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }

  // Obtener sesion y datos del usuario
  const { data: { user: microsoftUser } } = await supabase.auth.getUser()

  if (!microsoftUser?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth_error`)
  }

  const email = microsoftUser.email
  const provider = microsoftUser.app_metadata?.provider

  // Solo aplicar flujo hibrido para usuarios de Microsoft/Azure
  if (provider !== 'azure') {
    return NextResponse.redirect(`${origin}${next}`)
  }

  const nombre = microsoftUser.user_metadata?.full_name
    || microsoftUser.user_metadata?.name
    || email
  const fotoUrl = microsoftUser.user_metadata?.avatar_url
    || microsoftUser.user_metadata?.picture
    || null

  // Verificar dominio permitido
  const dominiosPermitidos = (process.env.ALLOWED_DOMAINS || '').split(',').map(d => d.trim()).filter(Boolean)
  const dominioEmail = email.split('@')[1]

  if (dominiosPermitidos.length > 0 && !dominiosPermitidos.includes(dominioEmail)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/sin-permisos?razon=dominio`)
  }

  // Buscar perfil existente
  const { data: perfilExistente } = await supabase
    .from('perfiles')
    .select('*')
    .eq('email', email)
    .single()

  if (perfilExistente) {
    // Usuario conocido — verificar que este activo
    if (!perfilExistente.activo) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/sin-permisos?razon=inactivo`)
    }

    // Actualizar proveedor_auth y foto si vino por Microsoft
    await supabase
      .from('perfiles')
      .update({
        proveedor_auth: 'microsoft',
        ...(fotoUrl ? { foto_url: fotoUrl } : {}),
      })
      .eq('id', perfilExistente.id)

    if (perfilExistente.rol === 'pendiente') {
      return NextResponse.redirect(`${origin}/acceso-pendiente`)
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  // Usuario nuevo del dominio — crear perfil pendiente
  // Usar service client para bypass de RLS (el usuario nuevo aún no tiene perfil)
  const supabaseAdmin = await createServiceClient()

  await supabaseAdmin.from('perfiles').insert({
    id: microsoftUser.id,
    nombre,
    email,
    rol: 'pendiente',
    activo: true,
    proveedor_auth: 'microsoft',
    foto_url: fotoUrl,
  })

  // Notificar a todos los admins
  const { data: admins } = await supabaseAdmin
    .from('perfiles')
    .select('id')
    .eq('rol', 'admin')
    .eq('activo', true)

  for (const admin of admins || []) {
    await supabaseAdmin.from('notificaciones').insert({
      usuario_id: admin.id,
      tipo: 'nuevo_usuario',
      titulo: 'Nuevo usuario pendiente de aprobacion',
      mensaje: `${nombre} (${email}) ingreso con Microsoft y esta esperando que le asignes un rol.`,
    })
  }

  // Registrar en bitacora
  await registrarAccion({
    usuarioId: microsoftUser.id,
    accion: 'REGISTRO_MICROSOFT',
    modulo: 'auth',
    descripcion: `Nuevo usuario registrado via Microsoft: ${email}`,
    resultado: 'exitoso',
  })

  return NextResponse.redirect(`${origin}/acceso-pendiente`)
}
