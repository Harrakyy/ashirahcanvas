/**
 * lib/server/tenant.ts
 *
 * Tenant resolution and catalog loading helpers.
 */

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tenants, products } from '@/lib/db/schema'
import type { Tenant, Product } from '@/lib/db/schema'

// Default fallback tenant for demo or offline dev
export const FALLBACK_TENANT: Tenant = {
  id: 'demo-tenant-id',
  name: 'Ashira Garment & Konveksi',
  slug: 'ashira-garment',
  logoUrl: null,
  address: 'Kawasan Industri Tekstil No. 42, Bandung, Jawa Barat',
  phone: '+62 812-9988-7766',
  email: 'info@ashiragarment.com',
  settings: {
    platformFeePerTransaction: 5000,
    contactWhatsapp: '+62 812-9988-7766',
    description: 'Pusat konveksi & sablon custom berkualitas premium untuk kebutuhan seragam, komunitas, dan apparel brand.',
    primaryColor: '#1e3a8a',
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    })
    if (tenant) return tenant
  } catch (error) {
    console.warn('[Tenant] DB query failed, using fallback tenant if slug matches:', error)
  }

  if (slug === 'ashira-garment' || slug === 'demo') {
    return FALLBACK_TENANT
  }

  return null
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    })
    if (tenant) return tenant
  } catch (error) {
    console.warn('[Tenant] DB query failed:', error)
  }

  if (id === 'demo-tenant-id') {
    return FALLBACK_TENANT
  }

  return null
}

export async function getTenantProducts(tenantId: string): Promise<Product[]> {
  try {
    const prods = await db.query.products.findMany({
      where: eq(products.tenantId, tenantId),
    })
    return prods
  } catch (error) {
    console.warn('[Tenant] Failed to load tenant products from DB:', error)
    return []
  }
}

export async function getTenantMOQ(tenantId: string): Promise<number> {
  try {
    const tenant = await getTenantById(tenantId)
    if (tenant?.settings && typeof tenant.settings.moq === 'number' && tenant.settings.moq > 0) {
      return tenant.settings.moq
    }
  } catch (error) {
    console.warn('[Tenant] Error getting tenant MOQ:', error)
  }
  return 12 // Default konveksi MOQ
}
