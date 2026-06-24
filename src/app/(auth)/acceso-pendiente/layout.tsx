import { Suspense } from 'react'

export default function AccesoPendienteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <Suspense>{children}</Suspense>
}
