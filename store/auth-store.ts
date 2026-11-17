import { create } from 'zustand'
import type { AuthUser, UserRole } from '@/types/auth'

interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  fetchUser: () => Promise<AuthUser | null>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,

  setUser: (user) => set({ user, isLoading: false, isInitialized: true }),
  setLoading: (isLoading) => set({ isLoading }),

  fetchUser: async () => {
    try {
      set({ isLoading: true })
      const res = await fetch('/api/auth/me')
      if (!res.ok) throw new Error('Failed to fetch user')
      const data = await res.json()
      const user: AuthUser | null = data.user || null
      set({ user, isLoading: false, isInitialized: true })
      return user
    } catch {
      set({ user: null, isLoading: false, isInitialized: true })
      return null
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true })
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      set({ user: null, isLoading: false, isInitialized: true })
    }
  },
}))
