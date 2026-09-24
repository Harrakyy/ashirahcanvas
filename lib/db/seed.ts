import bcrypt from 'bcryptjs'
import { db } from './index'
import { tenants, users, products } from './schema'
import { eq } from 'drizzle-orm'
import { productsByCategory } from '../config/products'

export async function runSeed() {
  console.log('🌱 Starting AshiraTech database seed...')

  const defaultPasswordHash = await bcrypt.hash('ashirah123', 10)

  // 1. Seed or find Super Admin
  const existingSuperAdmin = await db.query.users.findFirst({
    where: eq(users.email, 'superadmin@ashirah.com'),
  })

  if (!existingSuperAdmin) {
    await db.insert(users).values({
      name: 'Ahmad Fauzi',
      email: 'superadmin@ashirah.com',
      passwordHash: defaultPasswordHash,
      role: 'super_admin',
      phone: '+62 811-2233-4455',
      title: 'Head of Operations & System Admin',
      isActive: true,
    })
    console.log('✅ Super Admin created: superadmin@ashirah.com')
  } else {
    console.log('ℹ️  Super Admin already exists')
  }

  // 2. Seed or find Demo Tenant
  let demoTenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, 'ashira-garment'),
  })

  if (!demoTenant) {
    const [inserted] = await db
      .insert(tenants)
      .values({
        name: 'Ashira Garment & Konveksi',
        slug: 'ashira-garment',
        address: 'Kawasan Industri Tekstil No. 42, Bandung, Jawa Barat',
        phone: '+62 812-9988-7766',
        email: 'info@ashiragarment.com',
        settings: {
          platformFeePerTransaction: 5000,
          contactWhatsapp: '+62 812-9988-7766',
          description: 'Pusat konveksi & sablon custom berkualitas premium untuk kebutuhan seragam, komunitas, dan apparel brand.',
          primaryColor: '#6366f1',
          bankAccount: {
            bankName: 'BCA',
            accountNumber: '8830129841',
            accountHolder: 'PT Ashira Garment Indonesia',
          },
        },
        isActive: true,
      })
      .returning()
    demoTenant = inserted
    console.log('✅ Demo Tenant created: Ashira Garment & Konveksi (slug: ashira-garment)')
  } else {
    console.log('ℹ️  Demo Tenant already exists')
  }

  // 3. Seed or find Tenant Admin
  const existingAdmin = await db.query.users.findFirst({
    where: eq(users.email, 'admin@ashirah.com'),
  })

  if (!existingAdmin) {
    await db.insert(users).values({
      tenantId: demoTenant.id,
      name: 'Siti Rahma',
      email: 'admin@ashirah.com',
      passwordHash: defaultPasswordHash,
      role: 'admin',
      phone: '+62 813-9876-5432',
      title: 'Supervisor Produksi & QC',
      isActive: true,
    })
    console.log('✅ Tenant Admin created: admin@ashirah.com')
  } else {
    console.log('ℹ️  Tenant Admin already exists')
  }

  // 4. Seed or find Customer
  const existingCustomer = await db.query.users.findFirst({
    where: eq(users.email, 'customer@ashirah.com'),
  })

  if (!existingCustomer) {
    await db.insert(users).values({
      tenantId: demoTenant.id,
      name: 'Budi Santoso',
      email: 'customer@ashirah.com',
      passwordHash: defaultPasswordHash,
      role: 'customer',
      phone: '+62 812-3456-7890',
      title: 'Fashion Enthusiast',
      address: {
        receiverName: 'Budi Santoso',
        receiverPhone: '+62 812-3456-7890',
        street: 'Jl. Dipatiukur No. 102',
        subdistrict: 'Coblong',
        city: 'Bandung',
        province: 'Jawa Barat',
        postalCode: '40132',
      },
      isActive: true,
    })
    console.log('✅ Demo Customer created: customer@ashirah.com')
  } else {
    console.log('ℹ️  Demo Customer already exists')
  }

  // 5. Seed initial products for tenant
  const existingProducts = await db.query.products.findMany({
    where: eq(products.tenantId, demoTenant.id),
  })

  if (existingProducts.length === 0) {
    const productsToInsert = []
    for (const [category, items] of Object.entries(productsByCategory)) {
      for (const item of items) {
        productsToInsert.push({
          tenantId: demoTenant.id,
          name: item.name,
          category: category,
          basePrice: item.basePrice || 85000,
          availableColors: ['#ffffff', '#000000', '#1e3a8a', '#dc2626', '#16a34a', '#ca8a04'],
          availableSizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
          thumbnailUrl: item.image || item.thumbnailImage,
          description: item.description,
          isActive: true,
        })
      }
    }
    if (productsToInsert.length > 0) {
      await db.insert(products).values(productsToInsert)
      console.log(`✅ Seeded ${productsToInsert.length} products for ${demoTenant.name}`)
    }
  } else {
    console.log(`ℹ️  Tenant already has ${existingProducts.length} products`)
  }

  console.log('🎉 Seed completed successfully!')
}

// Allow direct execution: ts-node / node
if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed failed:', err)
      process.exit(1)
    })
}
