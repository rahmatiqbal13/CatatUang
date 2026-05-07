'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { formatRupiah, formatTanggal, hitungPersen, getStatusColor } from '@/lib/formatters'
import { usePagination, PaginationControls } from '@/hooks/use-pagination'
import { ExcelExportDropdown } from '@/components/excel-export-button'
import type { DanaMasuk, Pengeluaran } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { 
  FileText, 
  Wallet, 
  TrendingDown, 
  PiggyBank, 
  BarChart3,
  FileBarChart,
  TrendingUp,
  Calendar,
  Filter,
  Download,
  Trophy
} from 'lucide-react'

const PDFExportButton = dynamic(() => import('./PDFExportButton'), { ssr: false })

type Props = {
  danaList: DanaMasuk[]
  pengeluaranList: Pengeluaran[]
  settingsMap: Record<string, string>
  initialDanaFilter: string
}

const statusConfig = {
  pending: { label: 'Menunggu', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved: { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700 border-red-200' },
}

export function LaporanClient({ danaList, pengeluaranList, settingsMap, initialDanaFilter }: Props) {
  const [filterDana, setFilterDana] = useState(initialDanaFilter)
  const [filterDari, setFilterDari] = useState('')
  const [filterSampai, setFilterSampai] = useState('')
  const [filterStatus, setFilterStatus] = useState('approved')

  const selectedDana = filterDana !== 'all' 
    ? danaList.find(d => String(d.id) === filterDana) 
    : null

  const filteredPengeluaran = pengeluaranList.filter(p => {
    const matchDana = filterDana === 'all' || String(p.dana_id) === filterDana
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    const matchDari = !filterDari || p.tanggal >= filterDari
    const matchSampai = !filterSampai || p.tanggal <= filterSampai
    return matchDana && matchStatus && matchDari && matchSampai
  })

  const {
    currentPage,
    totalPages,
    paginatedData,
    itemsPerPage,
    goToPage,
    setItemsPerPage,
    totalItems,
  } = usePagination({
    data: filteredPengeluaran,
    itemsPerPage: 10,
  })

  const approved = filteredPengeluaran.filter(p => p.status === 'approved')
  const pending = filteredPengeluaran.filter(p => p.status === 'pending')

  const danaScope = filterDana === 'all' ? danaList : danaList.filter(d => String(d.id) === filterDana)
  const totalDana = danaScope.reduce((s, d) => s + Number(d.jumlah), 0)
  const totalKeluar = approved.reduce((s, p) => s + Number(p.jumlah), 0)
  const totalPending = pending.reduce((s, p) => s + Number(p.jumlah), 0)
  const sisaSaldo = totalDana - totalKeluar

  const perKategori = Array.from(
    filteredPengeluaran
      .filter(p => p.status === 'approved')
      .reduce((map, p) => {
        map.set(p.kategori, (map.get(p.kategori) || 0) + Number(p.jumlah))
        return map
      }, new Map<string, number>())
  )
    .map(([kategori, total]) => ({ kategori, total, persen: hitungPersen(total, totalKeluar) }))
    .sort((a, b) => b.total - a.total)

  const perDana = danaList.map(dana => {
    const danaApproved = pengeluaranList.filter(p => p.dana_id === dana.id && p.status === 'approved')
    const danaPending = pengeluaranList.filter(p => p.dana_id === dana.id && p.status === 'pending')
    const keluar = danaApproved.reduce((s, p) => s + Number(p.jumlah), 0)
    const pend = danaPending.reduce((s, p) => s + Number(p.jumlah), 0)
    return {
      ...dana,
      keluar,
      pending: pend,
      sisa: Number(dana.jumlah) - keluar,
      persen: hitungPersen(keluar, Number(dana.jumlah))
    }
  })

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <FileBarChart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Laporan Keuangan
            </h1>
            <p className="text-sm text-slate-500">{settingsMap.nama_direktorat || 'Direktorat'}</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <ExcelExportDropdown
            danaList={danaList}
            pengeluaranList={filteredPengeluaran}
            filename="laporan_keuangan"
          />
          <PDFExportButton
            danaList={danaList}
            pengeluaranList={filteredPengeluaran}
            perKategori={perKategori}
            perDana={perDana}
            selectedDana={selectedDana || null}
            settingsMap={settingsMap}
            totalDana={totalDana}
            totalKeluar={totalKeluar}
            totalPending={totalPending}
            sisaSaldo={sisaSaldo}
          />
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Filter Laporan</CardTitle>
              <p className="text-sm text-slate-500">Sesuaikan data yang ditampilkan</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <Select value={filterDana} onValueChange={v => setFilterDana(v ?? 'all')}>
              <SelectTrigger className="w-60 h-12 bg-slate-50 border-slate-200 rounded-xl">
                <Wallet className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue placeholder="Semua Dana">
                  {(value: any) => value && value !== 'all' 
                    ? (danaList.find(d => String(d.id) === value)?.nama_dana ?? value) 
                    : 'Semua Dana'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Dana</SelectItem>
                {danaList.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.nama_dana}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? 'approved')}>
              <SelectTrigger className="w-44 h-12 bg-slate-50 border-slate-200 rounded-xl">
                <FileText className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  className="w-40 h-12 pl-10 bg-slate-50 border-slate-200 rounded-xl"
                  placeholder="Dari"
                  value={filterDari}
                  onChange={e => setFilterDari(e.target.value)}
                />
              </div>
              <span className="text-slate-400 font-medium">–</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="date"
                  className="w-40 h-12 pl-10 bg-slate-50 border-slate-200 rounded-xl"
                  placeholder="Sampai"
                  value={filterSampai}
                  onChange={e => setFilterSampai(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { 
            label: 'Total Dana', 
            value: formatRupiah(totalDana), 
            icon: Wallet, 
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-700'
          },
          { 
            label: 'Total Pengeluaran', 
            value: formatRupiah(totalKeluar), 
            icon: TrendingDown, 
            color: 'from-orange-500 to-orange-600',
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-700'
          },
          { 
            label: 'Sisa Saldo', 
            value: formatRupiah(sisaSaldo), 
            icon: PiggyBank, 
            color: 'from-emerald-500 to-emerald-600',
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-700'
          },
          { 
            label: 'Total Pending', 
            value: formatRupiah(totalPending), 
            icon: BarChart3, 
            color: 'from-amber-500 to-amber-600',
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-700'
          },
        ].map(s => (
          <Card key={s.label} className="border-0 shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
            <div className={`h-1 w-full bg-gradient-to-r ${s.color}`} />
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                  <p className={`text-2xl font-bold font-mono ${s.textColor}`}>{s.value}</p>
                </div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <s.icon className="w-7 h-7 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ringkasan per Dana */}
      {filterDana === 'all' && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">Ringkasan Per Dana</CardTitle>
                <p className="text-sm text-slate-500">Penggunaan dana per sumber</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b-2 border-slate-200">
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Nama Dana</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Sumber</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Total Dana</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Terpakai</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Sisa</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Penggunaan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perDana.map(d => (
                  <TableRow key={d.id} className="hover:bg-blue-50/30 transition-colors">
                    <TableCell className="font-semibold text-slate-900">{d.nama_dana}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-semibold bg-slate-50 text-slate-600">
                        {d.sumber}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-slate-700">{formatRupiah(Number(d.jumlah))}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-orange-600">{formatRupiah(d.keluar)}</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${d.sisa >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatRupiah(d.sisa)}
                    </TableCell>
                    <TableCell className="w-44">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              d.persen > 80 
                                ? 'bg-gradient-to-r from-orange-500 to-red-500' 
                                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            }`}
                            style={{ width: `${Math.min(d.persen, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-600 w-12 text-right">{d.persen.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <TableCell colSpan={2} className="text-slate-900">TOTAL</TableCell>
                  <TableCell className="text-right font-mono text-slate-900">{formatRupiah(totalDana)}</TableCell>
                  <TableCell className="text-right font-mono text-orange-700">{formatRupiah(totalKeluar)}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-700">{formatRupiah(sisaSaldo)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tabel Pengeluaran */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Detail Pengeluaran ({totalItems})</CardTitle>
              <p className="text-sm text-slate-500">Daftar transaksi pengeluaran</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {paginatedData.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <p className="text-slate-600 font-semibold text-lg">Tidak ada data pengeluaran</p>
              <p className="text-slate-400 mt-2">Coba ubah filter yang diterapkan</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 border-b-2 border-slate-200">
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Tanggal</TableHead>
                    {filterDana === 'all' && <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Dana</TableHead>}
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Uraian</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">Kategori</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Jumlah</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map(p => {
                    const status = statusConfig[p.status]
                    return (
                      <TableRow key={p.id} className="hover:bg-blue-50/30 transition-colors">
                        <TableCell className="text-sm text-slate-500 whitespace-nowrap font-medium">
                          {formatTanggal(p.tanggal)}
                        </TableCell>
                        {filterDana === 'all' && (
                          <TableCell className="text-sm font-semibold text-slate-700 max-w-[150px] truncate">{p.nama_dana}</TableCell>
                        )}
                        <TableCell className="text-sm max-w-[250px]">
                          <p className="truncate font-medium text-slate-700">{p.uraian}</p>
                          {p.keterangan && <p className="text-xs text-slate-400 truncate">{p.keterangan}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-semibold bg-slate-50 text-slate-600 border-slate-200">
                            {p.kategori}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-slate-700">
                          {formatRupiah(Number(p.jumlah))}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${status.color}`}>
                            {status.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  <TableRow className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <TableCell colSpan={filterDana === 'all' ? 4 : 3} className="text-slate-900">TOTAL</TableCell>
                    <TableCell className="text-right font-mono text-slate-900">{formatRupiah(totalKeluar)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="px-6 border-t border-slate-100">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  itemsPerPage={itemsPerPage}
                  onItemsPerPageChange={setItemsPerPage}
                  totalItems={totalItems}
                  showItemsPerPage
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Breakdown per Kategori */}
      {perKategori.length > 0 && (
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900">Breakdown per Kategori</CardTitle>
                <p className="text-sm text-slate-500">Distribusi pengeluaran berdasarkan kategori</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {perKategori.map((k, index) => (
              <div key={k.kategori} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-bold text-slate-600">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-slate-700">{k.kategori}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900">{formatRupiah(k.total)}</span>
                    <span className="text-sm text-slate-400 ml-2">({k.persen.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${k.persen}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
