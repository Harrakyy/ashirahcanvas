'use client'

import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface SuperAdminAnalyticsChartProps {
  clientStats: any[]
}

export function SuperAdminAnalyticsChart({ clientStats }: SuperAdminAnalyticsChartProps) {
  const chartData = clientStats.map((c) => ({
    name: c.name.length > 16 ? `${c.name.substring(0, 16)}...` : c.name,
    gmv: c.gmv || 0,
    platformFee: c.platformFeeEarned || 0,
    orders: c.totalOrders || 0,
  }))

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Performa GMV & Platform Fee per Klien Konveksi</h3>
          <p className="text-xs text-slate-500">Perbandingan perputaran transaksi klien vs revenue AshiraTech</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#1A2B56]" />
            <span className="text-slate-600 font-medium">GMV Klien</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#B697BD]" />
            <span className="text-slate-600 font-medium">Fee AshiraTech</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${val / 1000}k`)}
            />
            <Tooltip
              formatter={(val: any, name: any) => [
                `Rp ${Number(val).toLocaleString('id-ID')}`,
                name === 'gmv' ? 'GMV Transaksi' : 'AshiraTech Fee',
              ]}
              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <Bar dataKey="gmv" fill="#1A2B56" radius={[6, 6, 0, 0]} maxBarSize={40} />
            <Bar dataKey="platformFee" fill="#B697BD" radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
