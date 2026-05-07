import { createClient } from '@/lib/supabase/server'
import { formatRupiah, hitungPersen } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Wallet, 
  TrendingDown, 
  PiggyBank, 
  Clock, 
  ArrowRight,
  Trophy,
  TrendingUp,
  Target,
  Zap,
  Activity,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'
import type { DanaMasuk, Pengeluaran } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: danaList }, { data: pengeluaranList }] = await Promise.all([
    supabase.from('dana_masuk').select('*').order('created_at', { ascending: false }),
    supabase.from('pengeluaran').select('*'),
  ])

  const danas = (danaList || []) as DanaMasuk[]
  const pengeluarans = (pengeluaranList || []) as Pengeluaran[]

  const approved = pengeluarans.filter(p => p.status === 'approved')
  const pending  = pengeluarans.filter(p => p.status === 'pending')

  const totalDana    = danas.reduce((s, d) => s + Number(d.jumlah), 0)
  const totalKeluar  = approved.reduce((s, p) => s + Number(p.jumlah), 0)
  const totalPending = pending.reduce((s, p) => s + Number(p.jumlah), 0)
  const sisaSaldo    = totalDana - totalKeluar

  const stats = [
    { 
      label: 'Total Dana Masuk', 
      value: formatRupiah(totalDana), 
      icon: Wallet, 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      shadowColor: 'shadow-blue-500/30'
    },
    { 
      label: 'Total Pengeluaran', 
      value: formatRupiah(totalKeluar), 
      icon: TrendingDown, 
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      shadowColor: 'shadow-orange-500/30'
    },
    { 
      label: 'Sisa Saldo', 
      value: formatRupiah(sisaSaldo), 
      icon: PiggyBank, 
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      shadowColor: 'shadow-emerald-500/30'
    },
    { 
      label: 'Menunggu Approval', 
      value: formatRupiah(totalPending), 
      icon: Clock, 
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      shadowColor: 'shadow-amber-500/30'
    },
  ]

  // Calculate performance metrics
  const utilizationRate = totalDana > 0 ? (totalKeluar / totalDana) * 100 : 0
  const performanceLevel = utilizationRate < 30 ? 'Optimal' : utilizationRate < 70 ? 'Baik' : 'Perlu Perhatian'
  const performanceColor = utilizationRate < 30 ? 'emerald' : utilizationRate < 70 ? 'blue' : 'orange'

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-sm text-slate-500">Ringkasan keuangan seluruh dana</p>
            </div>
          </div>
        </div>
        
        {/* Performance Badge */}
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl bg-${performanceColor}-50 border border-${performanceColor}-200 flex items-center gap-2`}>
            <Activity className={`w-4 h-4 text-${performanceColor}-600`} />
            <span className={`text-sm font-semibold text-${performanceColor}-700`}>
              Performa: {performanceLevel}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid - Modern Sports Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={stat.label} 
            className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          >
            {/* Gradient background on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {stat.label}
                  </p>
                  <p className={`text-2xl font-bold font-mono ${stat.textColor}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg ${stat.shadowColor} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Ringkasan per Dana - Takes 2 columns */}
        <Card className="xl:col-span-2 border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Ringkasan Per Dana</CardTitle>
                  <p className="text-sm text-slate-500">Monitoring penggunaan dana real-time</p>
                </div>
              </div>
              <Link 
                href="/dana" 
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors"
              >
                Lihat semua <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {danas.length === 0 ? (
              <div className="px-8 py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">Belum ada data dana masuk</p>
                <p className="text-sm text-slate-400 mt-1">Tambahkan dana untuk memulai</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {danas.slice(0, 5).map((dana, index) => {
                  const keluarDana  = approved.filter(p => p.dana_id === dana.id).reduce((s, p) => s + Number(p.jumlah), 0)
                  const pendingDana = pending.filter(p => p.dana_id === dana.id).reduce((s, p) => s + Number(p.jumlah), 0)
                  const sisa        = Number(dana.jumlah) - keluarDana
                  const persen      = hitungPersen(keluarDana, Number(dana.jumlah))
                  const isHighUsage = persen > 80

                  return (
                    <Link 
                      key={dana.id} 
                      href={`/dana/${dana.id}`} 
                      className="flex items-center gap-4 px-8 py-5 hover:bg-blue-50/50 transition-all group"
                    >
                      {/* Rank Number */}
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-slate-600">{index + 1}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-base font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {dana.nama_dana}
                          </p>
                          <Badge variant="secondary" className="text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
                            {dana.sumber}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm mb-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Dana:</span>
                            <span className="font-mono font-semibold text-slate-700">{formatRupiah(Number(dana.jumlah))}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">Keluar:</span>
                            <span className="font-mono font-semibold text-orange-600">{formatRupiah(keluarDana)}</span>
                          </div>
                          {pendingDana > 0 && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">Pending:</span>
                              <span className="font-mono font-semibold text-amber-600">{formatRupiah(pendingDana)}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isHighUsage 
                                  ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                                  : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                              }`}
                              style={{ width: `${Math.min(persen, 100)}%` }}
                            />
                          </div>
                          <span className={`text-sm font-mono font-bold w-14 text-right ${
                            isHighUsage ? 'text-orange-600' : 'text-slate-600'
                          }`}>
                            {persen.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400 mb-1">Sisa</p>
                        <p className={`text-lg font-bold font-mono ${sisa >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatRupiah(sisa)}
                        </p>
                      </div>

                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Stats & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-slate-900">Target Performa</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tingkat Penggunaan</span>
                  <span className="font-bold text-slate-900">{utilizationRate.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      utilizationRate > 80 
                        ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                        : utilizationRate > 50 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    }`}
                    style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{danas.length}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">Total Dana</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{pengeluarans.length}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">Transaksi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          {pending.length > 0 && (
            <Card className="border-0 shadow-lg border-l-4 border-l-amber-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">Menunggu Approval</CardTitle>
                      <p className="text-xs text-slate-500">{pending.length} pengeluaran perlu ditinjau</p>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-bold text-sm px-3 py-1">
                    {pending.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {pending.slice(0, 3).map(p => (
                    <div key={p.id} className="flex items-center justify-between px-6 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{p.uraian}</p>
                        <p className="text-xs text-slate-500">{p.nama_dana} · {p.kategori}</p>
                      </div>
                      <p className="text-sm font-bold font-mono text-amber-600 shrink-0">
                        {formatRupiah(Number(p.jumlah))}
                      </p>
                    </div>
                  ))}
                  {pending.length > 3 && (
                    <div className="px-6 py-3 text-center">
                      <Link 
                        href="/pengeluaran?status=pending" 
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        +{pending.length - 3} pengeluaran lainnya
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
