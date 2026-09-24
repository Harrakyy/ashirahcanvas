import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/server/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    return NextResponse.json({
      authenticated: Boolean(user),
      user: user || null,
    })
  } catch (error) {
    console.error('[Auth API] Me error:', error)
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 }
    )
  }
}
