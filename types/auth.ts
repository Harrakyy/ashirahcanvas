/**
 * types/auth.ts
 *
 * Definisi tipe otentikasi & role-based access control (RBAC).
 * Role: customer | admin | super_admin
 */

export type UserRole = 'customer' | 'admin' | 'super_admin'

export interface AuthUser {
  id: string
  tenantId?: string | null
  name: string
  email: string
  role: UserRole
  avatarUrl?: string
  phone?: string
  title?: string
}

export interface SessionData {
  user: AuthUser
  expiresAt: number
}

/**
 * Akun bawaan (pre-configured) untuk demonstrasi & kemudahan testing instan.
 */
export const DEMO_ACCOUNTS: Record<string, { user: AuthUser; passwordHash: string }> = {
  'customer@ashirah.com': {
    user: {
      id: 'usr_cust_01',
      tenantId: 'demo-tenant-id',
      name: 'Budi Santoso',
      email: 'customer@ashirah.com',
      role: 'customer',
      avatarUrl: '',
      phone: '+62 812-3456-7890',
      title: 'Customer Fashion Enthusiast',
    },
    // Raw demo password
    passwordHash: 'ashirah123',
  },
  'admin@ashirah.com': {
    user: {
      id: 'usr_adm_01',
      tenantId: 'demo-tenant-id',
      name: 'Siti Rahma',
      email: 'admin@ashirah.com',
      role: 'admin',
      avatarUrl: '',
      phone: '+62 813-9876-5432',
      title: 'Supervisor Produksi & QC',
    },
    passwordHash: 'ashirah123',
  },
  'superadmin@ashirah.com': {
    user: {
      id: 'usr_sadmin_01',
      tenantId: null,
      name: 'Ahmad Fauzi',
      email: 'superadmin@ashirah.com',
      role: 'super_admin',
      avatarUrl: '',
      phone: '+62 811-2233-4455',
      title: 'Head of Operations & System Admin',
    },
    passwordHash: 'ashirah123',
  },
}
