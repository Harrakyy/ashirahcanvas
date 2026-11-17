import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'
import { getTenantById } from '@/lib/server/tenant'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const queryTenantId = searchParams.get('tenantId')

    let targetTenantId = user.tenantId
    if (user.role === 'super_admin' && queryTenantId) {
      targetTenantId = queryTenantId
    }

    // Fallback if tenantId is not in user session
    if (!targetTenantId) {
      const firstTenant = await db.query.tenants.findFirst()
      if (firstTenant) {
        targetTenantId = firstTenant.id
      }
    }

    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })
    }

    const tenant = await getTenantById(targetTenantId)
    if (!tenant) {
      return NextResponse.json({ error: 'Data profil konveksi tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      tenant,
    })
  } catch (error) {
    console.error('[Admin Profile API] GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat profil konveksi' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await req.json()
    const { searchParams } = new URL(req.url)
    const queryTenantId = searchParams.get('tenantId')

    let targetTenantId = user.tenantId
    if (user.role === 'super_admin' && queryTenantId) {
      targetTenantId = queryTenantId
    }

    if (!targetTenantId) {
      const firstTenant = await db.query.tenants.findFirst()
      if (firstTenant) {
        targetTenantId = firstTenant.id
      }
    }

    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 404 })
    }

    // Find existing tenant
    const existingTenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, targetTenantId),
    })

    if (!existingTenant) {
      return NextResponse.json({ error: 'Data konveksi tidak ditemukan di sistem' }, { status: 404 })
    }

    const currentSettings = existingTenant.settings || {}

    const updatedSettings = {
      ...currentSettings,
      ...(body.contactWhatsapp !== undefined ? { contactWhatsapp: body.contactWhatsapp } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.bankAccount !== undefined ? { bankAccount: body.bankAccount } : {}),
    }

    const [updated] = await db
      .update(tenants)
      .set({
        name: body.name !== undefined ? body.name.trim() : existingTenant.name,
        logoUrl: body.logoUrl !== undefined ? (body.logoUrl?.trim() || null) : existingTenant.logoUrl,
        address: body.address !== undefined ? body.address.trim() : existingTenant.address,
        phone: body.phone !== undefined ? body.phone.trim() : existingTenant.phone,
        email: body.email !== undefined ? body.email.trim() : existingTenant.email,
        settings: updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, targetTenantId))
      .returning()

    return NextResponse.json({
      success: true,
      tenant: updated,
      message: 'Profil konveksi dan logo usaha berhasil diperbarui',
    })
  } catch (error) {
    console.error('[Admin Profile API] PATCH error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui profil konveksi' }, { status: 500 })
  }
}
