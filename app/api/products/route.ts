import { NextResponse } from 'next/server'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { products, tenants } from '@/lib/db/schema'
import { getCurrentUser } from '@/lib/server/auth'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    let queryTenantId = user?.tenantId

    if (user?.role === 'super_admin') {
      const paramTenant = searchParams.get('tenantId')
      if (paramTenant) queryTenantId = paramTenant
    }

    const whereConditions = []
    if (queryTenantId) {
      whereConditions.push(eq(products.tenantId, queryTenantId))
    }
    if (category && category !== 'all') {
      whereConditions.push(eq(products.category, category))
    }

    const productList = await db.query.products.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      orderBy: [desc(products.createdAt)],
    })

    return NextResponse.json({ success: true, products: productList })
  } catch (error: any) {
    console.error('[Products API] GET error:', error)
    return NextResponse.json({ error: 'Gagal memuat produk' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await req.json()
    const {
      name,
      category = 'tshirts',
      basePrice,
      colorVariants = [],
      availableColors = ['#ffffff', '#000000', '#1e3a8a', '#dc2626'],
      availableSizes = ['S', 'M', 'L', 'XL', '2XL'],
      thumbnailUrl,
      description,
    } = body

    if (!name || !basePrice) {
      return NextResponse.json(
        { error: 'Nama produk dan harga dasar wajib diisi' },
        { status: 400 }
      )
    }

    let targetTenantId = user.tenantId
    if (!targetTenantId) {
      const firstTenant = await db.query.tenants.findFirst()
      targetTenantId = firstTenant?.id
    }

    if (!targetTenantId) {
      return NextResponse.json({ error: 'Tenant tidak ditemukan' }, { status: 400 })
    }

    const resolvedColorVariants = Array.isArray(colorVariants) ? colorVariants : []
    const resolvedColors = resolvedColorVariants.length > 0
      ? resolvedColorVariants.map((v: any) => v.hex)
      : (Array.isArray(availableColors) ? availableColors : [])

    const [newProduct] = await db
      .insert(products)
      .values({
        tenantId: targetTenantId,
        name,
        category,
        basePrice: Number(basePrice),
        availableColors: resolvedColors,
        colorVariants: resolvedColorVariants,
        availableSizes: Array.isArray(availableSizes) ? availableSizes : [],
        thumbnailUrl: thumbnailUrl || (resolvedColorVariants[0]?.mockups?.front) || '/tshirts model/Premium Cotton T-Shirt.png',
        description: description || '',
        isActive: true,
      })
      .returning()

    return NextResponse.json({ success: true, product: newProduct })
  } catch (error: any) {
    console.error('[Products API] POST error:', error)
    return NextResponse.json({ error: 'Gagal menambahkan produk' }, { status: 500 })
  }
}
