'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Shield, User, Lock, ArrowRight, CheckCircle2, Sparkles, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/store/auth-store'
import type { UserRole } from '@/types/auth'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')
  const errorParam = searchParams.get('error')

  const { setUser } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(
    errorParam === 'unauthorized'
      ? 'Akses ditolak. Anda tidak memiliki izin untuk halaman tersebut.'
      : ''
  )
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (loginEmail: string, loginPass: string) => {
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPass }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login gagal')
      }

      setUser(data.user)

      // Arahkan ke redirect target atau default role redirect
      const destination = redirectParam || data.redirectUrl || '/'
      router.push(destination)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat masuk')
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickLogin = (role: UserRole) => {
    if (role === 'customer') {
      setEmail('customer@ashirah.com')
      setPassword('ashirah123')
      handleLogin('customer@ashirah.com', 'ashirah123')
    } else if (role === 'admin') {
      setEmail('admin@ashirah.com')
      setPassword('ashirah123')
      handleLogin('admin@ashirah.com', 'ashirah123')
    } else if (role === 'super_admin') {
      setEmail('superadmin@ashirah.com')
      setPassword('ashirah123')
      handleLogin('superadmin@ashirah.com', 'ashirah123')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-950 to-blue-950 flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Background Glow Decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              A
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">Ashirah</span>
            <span className="px-2 py-0.5 bg-white/10 text-neutral-300 text-xs font-medium rounded-full border border-white/10">
              Studio
            </span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Selamat Datang Kembali
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Masuk untuk melanjutkan desain dan kelola pesanan sablon Anda
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Login Biasa */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleLogin(email, password)
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#1A2B56] hover:bg-[#243B6B] active:scale-[0.99] text-white font-bold rounded-full text-sm transition-all shadow-lg shadow-black/30 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Memverifikasi Akun...
                </>
              ) : (
                <>
                  Masuk ke Akun
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-neutral-900 px-3 text-[11px] uppercase tracking-wider text-neutral-400 font-medium absolute">
              Atau Uji Instan Peran (Demo)
            </span>
          </div>

          {/* 1-Click Role Login Cards */}
          <div className="space-y-2.5">
            <p className="text-xs text-neutral-400 text-center font-medium">
              Pilih peran di bawah untuk login instan tanpa mengetik:
            </p>

            {/* Role 1: Customer */}
            <button
              type="button"
              onClick={() => handleQuickLogin('customer')}
              disabled={isLoading}
              className="w-full group text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/50 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-semibold text-xs border border-blue-500/30">
                  CS
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Budi Santoso</span>
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px] px-1.5 py-0">
                      Customer
                    </Badge>
                  </div>
                  <span className="text-[11px] text-neutral-400">customer@ashirah.com • Akses Editor & Checkout</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Role 2: Admin */}
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              disabled={isLoading}
              className="w-full group text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-500/50 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-semibold text-xs border border-indigo-500/30">
                  AD
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Siti Rahma</span>
                    <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] px-1.5 py-0">
                      Admin
                    </Badge>
                  </div>
                  <span className="text-[11px] text-neutral-400">admin@ashirah.com • Akses Portal Admin Produksi</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Role 3: Super Admin */}
            <button
              type="button"
              onClick={() => handleQuickLogin('super_admin')}
              disabled={isLoading}
              className="w-full group text-left p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[#B697BD]/50 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#B697BD]/20 text-[#C7A9D0] flex items-center justify-center font-semibold text-xs border border-[#B697BD]/30">
                  SA
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Ahmad Fauzi</span>
                    <Badge className="bg-[#B697BD]/20 text-[#C7A9D0] border-[#B697BD]/30 text-[10px] px-1.5 py-0">
                      Super Admin
                    </Badge>
                  </div>
                  <span className="text-[11px] text-neutral-400">superadmin@ashirah.com • Akses Penuh Sistem & Portal</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#C7A9D0] group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-neutral-400 flex flex-col gap-2">
          <p>
            Belum punya akun?{' '}
            <Link href="/register" className="text-blue-400 font-semibold hover:text-blue-300 underline underline-offset-4">
              Daftar akun baru
            </Link>
          </p>
          <Link href="/" className="hover:text-neutral-300 transition underline underline-offset-4 text-neutral-500">
            Kembali ke Beranda Desain
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">Memuat Halaman Masuk...</div>}>
      <LoginForm />
    </Suspense>
  )
}
