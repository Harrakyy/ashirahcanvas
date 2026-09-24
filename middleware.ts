import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/server/session-token'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminRoute = pathname.startsWith('/admin')
  const isSuperAdminRoute = pathname.startsWith('/super-admin')
  const isCustomerOrdersRoute = pathname.startsWith('/orders')
  const isStoreRoute = pathname.startsWith('/store/')

  // Injeksi header tenant jika request ke /store/[slug]
  const requestHeaders = new Headers(request.headers)
  if (isStoreRoute) {
    const segments = pathname.split('/')
    // /store/[slug] -> segments[2]
    const slug = segments[2]
    if (slug) {
      requestHeaders.set('x-tenant-slug', slug)
    }
  }

  // Jika rute publik dan bukan terproteksi, lanjut
  if (!isAdminRoute && !isSuperAdminRoute && !isCustomerOrdersRoute) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const session = token ? await verifySessionToken(token) : null
  const user = session?.user

  // 1. Belum login sama sekali
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 2. Akses ke /super-admin hanya untuk role super_admin
  if (isSuperAdminRoute && user.role !== 'super_admin') {
    if (user.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    const forbiddenUrl = new URL('/login', request.url)
    forbiddenUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(forbiddenUrl)
  }

  // 3. Akses ke /admin hanya untuk role admin atau super_admin
  if (isAdminRoute && user.role !== 'admin' && user.role !== 'super_admin') {
    const forbiddenUrl = new URL('/login', request.url)
    forbiddenUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(forbiddenUrl)
  }

  // 4. Akses ke /orders (customer order history) - semua user yang terotentikasi bisa akses
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/super-admin/:path*',
    '/orders/:path*',
    '/store/:path*',
  ],
}
