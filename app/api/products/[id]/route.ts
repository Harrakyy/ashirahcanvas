import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    })

    if (!product) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ success: true, product })
  } catch (error: any) {
    console.error('[Product Detail API] GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat produk' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const user = await getCurrentUser()
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await req.json()
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    }

    if (body.name !== undefined) updateData.name = body.name
    if (body.basePrice !== undefined) updateData.basePrice = Number(body.basePrice)
    if (body.category !== undefined) updateData.category = body.category
    if (body.description !== undefined) updateData.description = body.description
    if (body.thumbnailUrl !== undefined) updateData.thumbnailUrl = body.thumbnailUrl
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)
    if (body.availableColors !== undefined) updateData.availableColors = body.availableColors
    if (body.colorVariants !== undefined) {
      updateData.colorVariants = body.colorVariants
      if (Array.isArray(body.colorVariants) && body.colorVariants.length > 0) {
        updateData.availableColors = body.colorVariants.map((v: any) => v.hex)
      }
    }
    if (body.availableSizes !== undefined) updateData.availableSizes = body.availableSizes

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ success: true, product: updated })
  } catch (error: any) {
    console.error('[Product Detail API] PATCH error:', error)
    return NextResponse.json({ error: 'Gagal memperbarui produk' }, { status: 500 })
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const user = await getCurrentUser()
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    await db.delete(products).where(eq(products.id, id))

    return NextResponse.json({ success: true, message: 'Produk berhasil dihapus' })
  } catch (error: any) {
    console.error('[Product Detail API] DELETE error:', error)
    return NextResponse.json({ error: 'Gagal menghapus produk' }, { status: 500 })
  }
}
