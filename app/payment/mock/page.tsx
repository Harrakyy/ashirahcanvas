import { notFound } from 'next/navigation'
import { DuitkuMockClient } from './mock-client'

export const dynamic = 'force-dynamic'

export default function DuitkuMockPage() {
  // If in production or mock is not explicitly enabled, return 404
  const isProduction = process.env.DUITKU_ENV === 'production' || process.env.NODE_ENV === 'production'
  const isMockEnabled = process.env.DUITKU_MOCK === 'true'

  if (isProduction && !isMockEnabled) {
    notFound()
  }

  return <DuitkuMockClient />
}
