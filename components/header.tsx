'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Save,
  ShoppingCart,
  LogIn,
  LogOut,
  User,
  Shield,
  Crown,
  ChevronDown,
  LayoutDashboard,
  ExternalLink,
  Building2,
  Package,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'

interface HeaderProps {
  onAddToCart?: () => void
  tenantName?: string
}

export default function Header({ onAddToCart, tenantName }: HeaderProps) {
  const pathname = usePathname()
  const showCartActions = pathname === '/editor' || pathname.endsWith('/editor')

  const { user, isAuthenticated, role, logout } = useAuth()
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [activeOrdersCount, setActiveOrdersCount] = useState<number>(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/orders')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.orders) {
            const active = data.orders.filter(
              (o: any) => o.status !== 'delivered' && o.status !== 'cancelled'
            ).length
            setActiveOrdersCount(active)
          }
        })
        .catch(() => {})
    }
  }, [isAuthenticated])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getRoleBadge = () => {
    if (role === 'super_admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F5F0F8] text-[#1A2B56] border border-[#B697BD]/60">
          <Crown className="w-2.5 h-2.5 text-[#B697BD]" />
          Super Admin
        </span>
      )
    }
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
          <Shield className="w-2.5 h-2.5" />
          Admin
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
        <User className="w-2.5 h-2.5" />
        Customer
      </span>
    )
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <header className="h-16 glass-header flex items-center justify-between px-4 md:px-6 fixed top-0 left-0 right-0 z-50">
      {/* Logo & macOS accent */}
      <div className="flex items-center gap-3">
        {/* macOS Traffic Lights */}
        <div className="hidden sm:flex items-center gap-1.5 mr-1" aria-hidden="true">
          <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-black/10 inline-block shadow-xs" />
          <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-black/10 inline-block shadow-xs" />
          <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-black/10 inline-block shadow-xs" />
        </div>
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-lg md:text-xl font-semibold tracking-tight text-neutral-900 group-hover:text-blue-950 transition-colors">
            {tenantName || 'Ashirah'}
          </span>
          <span className="hidden md:inline px-2.5 py-0.5 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-full border border-neutral-200/60">
            {tenantName ? 'Studio Partner' : 'Studio'}
          </span>
        </Link>
      </div>

      {/* Right Action Cluster */}
      <div className="flex items-center gap-2.5">
        {/* Desktop Buttons in Editor */}
        {showCartActions && (
          <div className="hidden md:flex items-center gap-2.5">
            <Button
              variant="outline"
              className="gap-2 bg-white hover:bg-neutral-50 text-[#1A2B56] border-[#C4C8D8] rounded-full text-xs font-bold h-9 px-4 cursor-pointer"
              disabled
              title="Fitur ini segera hadir"
            >
              <Save className="w-3.5 h-3.5 text-[#4C567A]" />
              Simpan Template
              <span className="ml-0.5 rounded-full bg-[#F0F2F6] text-[#4C567A] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider">
                Soon
              </span>
            </Button>
            <Button
              className="gap-2 bg-[#1A2B56] hover:bg-[#243B6B] active:scale-[0.98] text-white rounded-full px-5 text-xs font-bold h-9 shadow-xs transition-all cursor-pointer"
              onClick={onAddToCart}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-white" />
              Masukkan ke Keranjang
            </Button>
          </div>
        )}

        {/* Mobile Cart Button in Editor */}
        {showCartActions && (
          <div className="md:hidden flex items-center gap-1.5">
            <button
              className="p-2 hover:bg-neutral-100 rounded-lg transition text-neutral-900"
              title="Masukkan ke Keranjang"
              onClick={onAddToCart}
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Auth Section: User Profile or Login Button */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            {/* Quick Link: Pesanan Saya */}
            <Link
              href="/orders"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200/90 hover:border-[#1A2B56]/50 bg-white hover:bg-neutral-50/80 shadow-xs text-xs font-medium text-[#0F152E] transition-all"
              title="Lihat Progres & Status Pesanan Saya"
            >
              <Package className="w-3.5 h-3.5 text-[#1A2B56]" />
              <span className="hidden sm:inline">Pesanan Saya</span>
              {activeOrdersCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#1A2B56] text-white text-[10px] font-semibold">
                  {activeOrdersCount}
                </span>
              )}
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-full border border-neutral-200/80 hover:border-neutral-300 bg-white/80 hover:bg-white shadow-xs transition-all text-left"
                title="Menu Profil"
              >
                <div className="w-7 h-7 rounded-full bg-[#1A2B56] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  {getInitials(user.name)}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className="text-xs font-semibold text-neutral-800 line-clamp-1 max-w-[110px]">
                    {user.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-neutral-500 capitalize">
                    {role?.replace('_', ' ')}
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-md rounded-2xl border border-neutral-200/80 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Header */}
                  <div className="px-4 py-2.5 border-b border-neutral-100">
                    <p className="text-sm font-semibold text-neutral-900 line-clamp-1">
                      {user.name}
                    </p>
                    <p className="text-xs text-neutral-500 line-clamp-1 mb-2">
                      {user.email}
                    </p>
                    <div>{getRoleBadge()}</div>
                  </div>

                  {/* Navigation Links */}
                  <div className="py-1">
                    <Link
                      href="/"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-neutral-400" />
                      Katalog & Desain Customer
                    </Link>

                    <Link
                      href="/orders"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center justify-between px-4 py-2 text-xs text-neutral-800 hover:bg-neutral-50 hover:text-[#1A2B56] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Package className="w-4 h-4 text-[#1A2B56]" />
                        <span>Pesanan & Pelacakan Saya</span>
                      </div>
                      {activeOrdersCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#1A2B56] text-white text-[10px] font-bold">
                          {activeOrdersCount}
                        </span>
                      )}
                    </Link>

                  {(role === 'admin' || role === 'super_admin') && (
                    <>
                      <Link
                        href="/admin"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-neutral-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <Shield className="w-4 h-4 text-[#1A2B56]" />
                        Portal Admin Produksi
                      </Link>
                      <Link
                        href="/admin/profile"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-neutral-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      >
                        <Building2 className="w-4 h-4 text-[#1A2B56]" />
                        Profil Usaha & Logo Invoice
                      </Link>
                    </>
                  )}

                  {role === 'super_admin' && (
                    <Link
                      href="/super-admin"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs text-neutral-700 hover:bg-[#F5F0F8] hover:text-[#1A2B56] transition-colors"
                    >
                      <Crown className="w-4 h-4 text-[#B697BD]" />
                      Portal Super Admin
                    </Link>
                  )}
                </div>

                {/* Logout Button */}
                <div className="pt-1 border-t border-neutral-100">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      logout()
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar (Logout)
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/register">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 px-4 rounded-full border-neutral-300 hover:border-[#1A2B56] hover:bg-neutral-50 text-[#1A2B56] text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#1A2B56]" />
                Daftar Akun
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="sm"
                className="gap-1.5 h-9 px-5 rounded-full bg-[#1A2B56] hover:bg-[#243B6B] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-white" />
                Masuk
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
