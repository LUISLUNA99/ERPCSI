import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-sans">
      <h1 className="text-6xl font-bold text-primary-500 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-6">Pagina no encontrada</p>
      <Link
        href="/dashboard"
        className="bg-accent-500 hover:bg-accent-600 text-white px-6 py-2 rounded-md text-sm font-medium"
      >
        Ir al inicio
      </Link>
    </div>
  )
}
