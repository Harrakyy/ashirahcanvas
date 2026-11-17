import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { tenants } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Akses khusus Super Admin' }, { status: 403 })
    }

    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'ID Tenant tidak valid' }, { status: 400 })
    }

    const targetTenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    })

    if (!targetTenant) {
      return NextResponse.json({ error: 'Tenant konveksi tidak ditemukan' }, { status: 404 })
    }

    await db
      .update(tenants)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))

    return NextResponse.json({
      success: true,
      message: `Tenant ${targetTenant.name} berhasil disetujui (aktif).`,
      tenantId: id,
      isActive: true,
    })
  } catch (error) {
    console.error('[Super Admin Tenant Approve API] Error:', error)
    return NextResponse.json(
      { error: 'Gagal menyetujui pendaftaran tenant' },
      { status: 500 }
    )
  }
}
