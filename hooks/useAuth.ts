'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import type { UserRole, AuthUser } from '@/types/auth'

export function useAuth() {
  const router = useRouter()
  const { user, isLoading, isInitialized, fetchUser, logout, setUser } = useAuthStore()

  useEffect(() => {
    if (!isInitialized) {
      fetchUser()
    }
  }, [isInitialized, fetchUser])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const role: UserRole | null = user?.role ?? null
  const isAuthenticated = Boolean(user)

  return {
    user,
    role,
    isAuthenticated,
    isLoading,
    isInitialized,
    logout: handleLogout,
    refetchUser: fetchUser,
    setUser,
  }
}
