import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'No disponible en producción' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    AZURE_TENANT_ID: process.env.AZURE_TENANT_ID ? '✅ presente' : '❌ falta',
    AZURE_CLIENT_ID: process.env.AZURE_CLIENT_ID ? '✅ presente' : '❌ falta',
    AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET ? '✅ presente' : '❌ falta',
    ALLOWED_DOMAINS: process.env.ALLOWED_DOMAINS || '❌ falta',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '❌ falta',
  })
}
