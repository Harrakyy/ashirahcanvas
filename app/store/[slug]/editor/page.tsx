import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/server/tenant'
import TenantEditorClient from './tenant-editor-client'

interface TenantEditorPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ category?: string; product?: string }>
}

export default async function TenantEditorPage({
  params,
  searchParams,
}: TenantEditorPageProps) {
  const { slug } = await params
  const { category, product } = await searchParams

  const tenant = await getTenantBySlug(slug)

  if (!tenant) {
    notFound()
  }

  return (
    <TenantEditorClient
      tenant={tenant}
      initialCategory={category}
      initialProduct={product}
    />
  )
}
