'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1B3A6B', marginBottom: '1rem' }}>
            Algo salio mal
          </h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            {error.message || 'Ocurrio un error inesperado'}
          </p>
          <button
            onClick={() => reset()}
            style={{
              backgroundColor: '#2563EB',
              color: 'white',
              padding: '0.5rem 1.5rem',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  )
}
