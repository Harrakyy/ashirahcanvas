import { relations } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// 1. Tenants (Garment / Konveksi Clients)
// ---------------------------------------------------------------------------
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  logoUrl: text('logo_url'),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  settings: jsonb('settings').$type<{
    platformFeePerTransaction?: number
    contactWhatsapp?: string
    description?: string
    primaryColor?: string
    moq?: number
    bankAccount?: {
      bankName: string
      accountNumber: string
      accountHolder: string
    }
  }>().default({}),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// 2. Users (Super Admin, Admin Konveksi, Customer)
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).$type<'super_admin' | 'admin' | 'customer'>().default('customer').notNull(),
  phone: varchar('phone', { length: 50 }),
  title: varchar('title', { length: 100 }),
  avatarUrl: text('avatar_url'),
  address: jsonb('address').$type<{
    street?: string
    subdistrict?: string
    city?: string
    province?: string
    postalCode?: string
    receiverName?: string
    receiverPhone?: string
  }>().default({}),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// 3. Products
// ---------------------------------------------------------------------------
export interface ColorVariantMockups {
  front: string
  back?: string
  left?: string
  right?: string
}

export interface ProductColorVariant {
  id?: string
  name: string
  hex: string
  mockups: ColorVariantMockups
}

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  basePrice: integer('base_price').notNull(),
  availableColors: jsonb('available_colors').$type<string[]>().default([]).notNull(),
  colorVariants: jsonb('color_variants').$type<ProductColorVariant[]>().default([]).notNull(),
  availableSizes: jsonb('available_sizes').$type<string[]>().default([]).notNull(),
  thumbnailUrl: text('thumbnail_url'),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// 4. Orders
// ---------------------------------------------------------------------------
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: varchar('order_number', { length: 100 }).notNull().unique(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  customerId: uuid('customer_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
  status: varchar('status', { length: 50 })
    .$type<
      | 'pending'
      | 'dp_paid'
      | 'processing'
      | 'sample_review'
      | 'sample_rejected'
      | 'ready'
      | 'shipped'
      | 'delivered'
      | 'cancelled'
    >()
    .default('pending')
    .notNull(),
  subtotal: integer('subtotal').default(0).notNull(),
  shippingCost: integer('shipping_cost').default(0).notNull(),
  platformFee: integer('platform_fee').default(5000).notNull(), // Default fixed fee per order
  totalAmount: integer('total_amount').default(0).notNull(),
  dpAmount: integer('dp_amount').default(0).notNull(), // 70% of subtotal + shipping
  finalAmount: integer('final_amount').default(0).notNull(), // 30% of subtotal
  designBlueprint: jsonb('design_blueprint').$type<Record<string, unknown>>().default({}),
  notes: text('notes'),
  internalNotes: jsonb('internal_notes')
    .$type<Array<{ note: string; createdAt: string; adminName: string }>>()
    .default([]),
  samplePhotoUrl: text('sample_photo_url'),
  sampleNote: text('sample_note'),
  sampleFeedback: text('sample_feedback'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// 5. Order Items
// ---------------------------------------------------------------------------
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: varchar('product_name', { length: 255 }).notNull(),
  color: varchar('color', { length: 50 }).notNull(),
  size: varchar('size', { length: 50 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  unitPrice: integer('unit_price').notNull(),
  discountPercent: integer('discount_percent').default(0).notNull(),
  blueprintPerZone: jsonb('blueprint_per_zone').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// 6. Payments
// ---------------------------------------------------------------------------
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 20 }).$type<'dp' | 'final'>().notNull(),
  status: varchar('status', { length: 50 })
    .$type<'pending' | 'paid' | 'expired' | 'failed'>()
    .default('pending')
    .notNull(),
  amount: integer('amount').notNull(),
  duitkuReference: varchar('duitku_reference', { length: 255 }),
  duitkuMerchantCode: varchar('duitku_merchant_code', { length: 100 }),
  paymentUrl: text('payment_url'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  expiredAt: timestamp('expired_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// 7. Shipments
// ---------------------------------------------------------------------------
export const shipments = pgTable('shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  courierCode: varchar('courier_code', { length: 50 }).notNull(),
  courierName: varchar('courier_name', { length: 100 }).notNull(),
  trackingNumber: varchar('tracking_number', { length: 100 }),
  status: varchar('status', { length: 50 })
    .$type<'pending' | 'picked_up' | 'in_transit' | 'delivered'>()
    .default('pending')
    .notNull(),
  biteshipOrderId: varchar('biteship_order_id', { length: 100 }),
  originAddress: jsonb('origin_address').$type<Record<string, unknown>>().default({}),
  destinationAddress: jsonb('destination_address').$type<{
    name: string
    phone: string
    street: string
    subdistrict?: string
    city: string
    province: string
    postalCode: string
  }>().notNull(),
  shippedAt: timestamp('shipped_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// 8. Order Status Logs
// ---------------------------------------------------------------------------
export const orderStatusLogs = pgTable('order_status_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  fromStatus: varchar('from_status', { length: 50 }),
  toStatus: varchar('to_status', { length: 50 }).notNull(),
  note: text('note'),
  changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// Drizzle Relations
// ---------------------------------------------------------------------------
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  orders: many(orders),
  products: many(products),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  orders: many(orders),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  orderItems: many(orderItems),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [orders.tenantId],
    references: [tenants.id],
  }),
  customer: one(users, {
    fields: [orders.customerId],
    references: [users.id],
  }),
  items: many(orderItems),
  payments: many(payments),
  shipment: one(shipments, {
    fields: [orders.id],
    references: [shipments.orderId],
  }),
  statusLogs: many(orderStatusLogs),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
}))

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
  tenant: one(tenants, {
    fields: [shipments.tenantId],
    references: [tenants.id],
  }),
}))

export const orderStatusLogsRelations = relations(orderStatusLogs, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusLogs.orderId],
    references: [orders.id],
  }),
  changer: one(users, {
    fields: [orderStatusLogs.changedBy],
    references: [users.id],
  }),
}))

// Types export
export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert

export type OrderItem = typeof orderItems.$inferSelect
export type NewOrderItem = typeof orderItems.$inferInsert

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert

export type Shipment = typeof shipments.$inferSelect
export type NewShipment = typeof shipments.$inferInsert

export type OrderStatusLog = typeof orderStatusLogs.$inferSelect
export type NewOrderStatusLog = typeof orderStatusLogs.$inferInsert
