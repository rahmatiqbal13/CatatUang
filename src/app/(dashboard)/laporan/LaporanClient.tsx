'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { formatRupiah, formatTanggal, hitungPersen } from '@/lib/formatters'
import { usePagination, PaginationControls } from '@/hooks/use-pagination'
import { ExcelExportDropdown } from '@/components/excel-export-button'
import type { DanaMasuk, Pengeluaran } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PDFExportButton = dynamic(() => import('./PDFExportButton'), { ssr: false })

type Props = {
  danaList: DanaMasuk[]
  pengeluaranList: Pengeluaran[]
  settingsMap: Record<string, string>
  initialDanaFilter: string
}

function fmtCompact(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)} M`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)} jt`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)} rb`
  return String(n)
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: 'cu-badge cu-badge-success cu-badge-dot',
    pending:  'cu-badge cu-badge-warning cu-badge-dot',
    rejected: 'cu-badge cu-badge-danger cu-badge-dot',
  }
  const labels: Record<string, string> = { approved: 'Disetujui', pending: 'Menunggu', rejected: 'Ditolak' }
  return <span className={map[status] || 'cu-badge'}>{labels[status] || status}</span>
}

export function LaporanClient({ danaList, pengeluaranList, settingsMap, initialDanaFilter }: Props) {
  const [filterDana, setFilterDana]     = useState(initialDanaFilter)
  const [filterDari, setFilterDari]     = useState('')
  const [filterSampai, setFilterSampai] = useState('')
  const [filterStatus, setFilterStatus] = useState('approved')

  const selectedDana = filterDana !== 'all'
    ? danaList.find(d => String(d.id) === filterDana)
    : null

  const filteredPengeluaran = pengeluaranList.filter(p => {
    const matchDana    = filterDana === 'all' || String(p.dana_id) === filterDana
    const matchStatus  = filterStatus === 'all' || p.status === filterStatus
    const matchDari    = !filterDari || p.tanggal >= filterDari
    const matchSampai  = !filterSampai || p.tanggal <= filterSampai
    return matchDana && matchStatus && matchDari && matchSampai
  })

  const {
    currentPage, totalPages, paginatedData,
    itemsPerPage, goToPage, setItemsPerPage, totalItems,
  } = usePagination({ data: filteredPengeluaran, itemsPerPage: 15 })

  const approved = filteredPengeluaran.filter(p => p.status === 'approved')
  const pending  = filteredPengeluaran.filter(p => p.status === 'pending')

  const danaScope  = filterDana === 'all' ? danaList : danaList.filter(d => String(d.id) === filterDana)
  const totalDana  = danaScope.reduce((s, d) => s + Number(d.jumlah), 0)
  const totalKeluar  = approved.reduce((s, p) => s + Number(p.jumlah), 0)
  const totalPending = pending.reduce((s, p) => s + Number(p.jumlah), 0)
  const sisaSaldo    = totalDana - totalKeluar

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
    const danaPending  = pengeluaranList.filter(p => p.dana_id === dana.id && p.status === 'pending')
    const keluar = danaApproved.reduce((s, p) => s + Number(p.jumlah), 0)
    const pend   = danaPending.reduce((s, p) => s + Number(p.jumlah), 0)
    return {
      ...dana,
      keluar,
      pending: pend,
      sisa:   Number(dana.jumlah) - keluar,
      persen: hitungPersen(keluar, Number(dana.jumlah)),
    }
  })

  return (
    <div className="animate-fade-in">
      {/* Topbar */}
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>
            Laporan Keuangan
          </h1>
          <div className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>
            {settingsMap.nama_direktorat || 'Direktorat'} · Tahun Anggaran 2026
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="cu-page">
        {/* Filter bar */}
        <div className="cu-card overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-[12px] font-medium" style={{ color: 'var(--cu-text-muted)' }}>Filter</span>
          </div>
          <div className="px-4 py-3 flex flex-wrap items-center gap-3">
            {/* Dana select */}
            <Select
              value={filterDana}
              onValueChange={v => setFilterDana(v ?? 'all')}
              items={{ all: 'Semua Dana', ...Object.fromEntries(danaList.map(d => [String(d.id), d.nama_dana])) }}
            >
              <SelectTrigger
                className="h-[30px] text-[12.5px] rounded-[5px] w-52"
                style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <SelectValue placeholder="Semua Dana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Dana</SelectItem>
                {danaList.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.nama_dana}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status select */}
            <Select
              value={filterStatus}
              onValueChange={v => setFilterStatus(v ?? 'approved')}
              items={{ all: 'Semua Status', approved: 'Disetujui', pending: 'Menunggu', rejected: 'Ditolak' }}
            >
              <SelectTrigger
                className="h-[30px] text-[12.5px] rounded-[5px] w-40"
                style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterDari}
                onChange={e => setFilterDari(e.target.value)}
                className="h-[30px] px-2.5 text-[12.5px] rounded-[5px] outline-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
              <span className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>—</span>
              <input
                type="date"
                value={filterSampai}
                onChange={e => setFilterSampai(e.target.value)}
                className="h-[30px] px-2.5 text-[12.5px] rounded-[5px] outline-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
            </div>

            {(filterDari || filterSampai || filterDana !== 'all' || filterStatus !== 'approved') && (
              <button
                onClick={() => { setFilterDari(''); setFilterSampai(''); setFilterDana('all'); setFilterStatus('approved') }}
                className="h-[30px] px-3 rounded-[5px] text-[12px]"
                style={{ border: '1px solid var(--border)', color: 'var(--cu-text-muted)' }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="cu-card overflow-hidden grid grid-cols-2 md:grid-cols-4 cu-stats-strip">
          {[
            { label: 'Total Dana', value: fmtCompact(totalDana), full: formatRupiah(totalDana), accent: 'var(--cu-primary)' },
            { label: 'Realisasi', value: fmtCompact(totalKeluar), full: formatRupiah(totalKeluar), accent: 'var(--cu-warning)' },
            { label: 'Sisa Saldo', value: fmtCompact(sisaSaldo), full: formatRupiah(sisaSaldo), accent: 'var(--cu-success)' },
            { label: 'Pending', value: fmtCompact(totalPending), full: formatRupiah(totalPending), accent: 'var(--cu-danger)' },
          ].map((kpi, i) => (
            <div
              key={kpi.label}
              className="px-4 py-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium uppercase tracking-[0.03em]" style={{ color: 'var(--cu-text-muted)' }}>
                  {kpi.label}
                </span>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: kpi.accent }} />
              </div>
              <div className="cu-mono text-[18px] font-semibold tracking-[-0.02em]" style={{ color: 'var(--cu-text)' }}>
                {kpi.value}
              </div>
              <div className="text-[10.5px] mt-0.5 cu-mono" style={{ color: 'var(--cu-text-dim)' }}>
                {kpi.full}
              </div>
            </div>
          ))}
        </div>

        {/* Ringkasan per Dana (shown when all dana) */}
        {filterDana === 'all' && (
          <div className="cu-card overflow-hidden">
            <div
              className="px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="text-[13px] font-semibold" style={{ color: 'var(--cu-text)' }}>
                Ringkasan Per Dana
              </div>
              <div className="text-[11.5px]" style={{ color: 'var(--cu-text-muted)' }}>
                Penggunaan dana per sumber
              </div>
            </div>
            <div className="cu-table-wrap">
            <table className="cu-table">
              <thead>
                <tr>
                  <th>Nama Dana</th>
                  <th>Sumber</th>
                  <th className="cu-num">Alokasi</th>
                  <th className="cu-num">Terpakai</th>
                  <th className="cu-num">Sisa</th>
                  <th style={{ width: 140 }}>Penggunaan</th>
                </tr>
              </thead>
              <tbody>
                {perDana.map(d => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.nama_dana}</td>
                    <td>
                      <span className="cu-badge" style={{ height: 18, padding: '0 6px', fontSize: 10 }}>
                        {d.sumber}
                      </span>
                    </td>
                    <td className="cu-num cu-mono text-[12px]">{fmtCompact(Number(d.jumlah))}</td>
                    <td className="cu-num cu-mono text-[12px]" style={{ color: 'var(--cu-text-2)' }}>
                      {fmtCompact(d.keluar)}
                    </td>
                    <td
                      className="cu-num cu-mono text-[12px] font-medium"
                      style={{ color: d.sisa < 0 ? 'var(--cu-danger)' : 'var(--cu-success)' }}
                    >
                      {fmtCompact(d.sisa)}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 h-1 rounded-full overflow-hidden"
                          style={{ background: 'var(--cu-surface-2)' }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(d.persen, 100)}%`,
                              background: d.persen > 80 ? 'var(--cu-warning)' : 'var(--cu-primary)',
                            }}
                          />
                        </div>
                        <span className="cu-mono text-[11px] w-7 text-right" style={{ color: 'var(--cu-text-muted)' }}>
                          {d.persen.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{ background: 'var(--cu-surface-2)', fontWeight: 600 }}>
                  <td colSpan={2} style={{ color: 'var(--cu-text)' }}>TOTAL</td>
                  <td className="cu-num cu-mono text-[12px]">{fmtCompact(totalDana)}</td>
                  <td className="cu-num cu-mono text-[12px]">{fmtCompact(totalKeluar)}</td>
                  <td className="cu-num cu-mono text-[12px]" style={{ color: sisaSaldo < 0 ? 'var(--cu-danger)' : 'var(--cu-success)' }}>
                    {fmtCompact(sisaSaldo)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Detail Pengeluaran table */}
        <div className="cu-card overflow-hidden">
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--cu-text)' }}>
                Detail Pengeluaran
              </div>
              <div className="text-[11.5px]" style={{ color: 'var(--cu-text-muted)' }}>
                {totalItems} transaksi ditemukan
              </div>
            </div>
          </div>

          {paginatedData.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--cu-text-muted)' }}>
              Tidak ada data pengeluaran untuk filter ini
            </div>
          ) : (
            <>
              <div className="cu-table-wrap">
              <table className="cu-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    {filterDana === 'all' && <th>Dana</th>}
                    <th>Uraian</th>
                    <th>Kategori</th>
                    <th className="cu-num">Jumlah</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map(p => (
                    <tr key={p.id}>
                      <td className="cu-mono text-[12px] whitespace-nowrap" style={{ color: 'var(--cu-text-muted)' }}>
                        {formatTanggal(p.tanggal)}
                      </td>
                      {filterDana === 'all' && (
                        <td className="text-[12.5px] max-w-[130px] truncate" style={{ color: 'var(--cu-text-2)' }}>
                          {p.nama_dana}
                        </td>
                      )}
                      <td className="max-w-[220px]">
                        <div className="truncate text-[12.5px] font-medium" style={{ color: 'var(--cu-text)' }}>
                          {p.uraian}
                        </div>
                        {p.keterangan && (
                          <div className="truncate text-[11px]" style={{ color: 'var(--cu-text-muted)' }}>
                            {p.keterangan}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="cu-badge" style={{ height: 18, padding: '0 6px', fontSize: 10 }}>
                          {p.kategori}
                        </span>
                      </td>
                      <td className="cu-num cu-mono text-[12.5px] font-semibold" style={{ color: 'var(--cu-text)' }}>
                        {formatRupiah(Number(p.jumlah))}
                      </td>
                      <td>
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr style={{ background: 'var(--cu-surface-2)', fontWeight: 600 }}>
                    <td
                      colSpan={filterDana === 'all' ? 4 : 3}
                      style={{ color: 'var(--cu-text)' }}
                    >
                      TOTAL
                    </td>
                    <td className="cu-num cu-mono text-[12.5px]" style={{ color: 'var(--cu-text)' }}>
                      {formatRupiah(totalKeluar)}
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
              </div>

              {/* Pagination */}
              <div
                className="px-4 py-2"
                style={{ borderTop: '1px solid var(--border)' }}
              >
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
        </div>

        {/* Breakdown per Kategori */}
        {perKategori.length > 0 && (
          <div className="cu-card overflow-hidden">
            <div
              className="px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="text-[13px] font-semibold" style={{ color: 'var(--cu-text)' }}>
                Breakdown per Kategori
              </div>
              <div className="text-[11.5px]" style={{ color: 'var(--cu-text-muted)' }}>
                Distribusi pengeluaran yang disetujui
              </div>
            </div>
            <div className="px-4 py-3 space-y-3">
              {perKategori.map((k, i) => (
                <div key={k.kategori}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="cu-mono text-[11px] w-5 text-center rounded"
                        style={{ color: 'var(--cu-text-dim)', background: 'var(--cu-surface-2)' }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[12.5px]" style={{ color: 'var(--cu-text)' }}>
                        {k.kategori}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="cu-mono text-[12px] font-medium" style={{ color: 'var(--cu-text)' }}>
                        {fmtCompact(k.total)}
                      </span>
                      <span className="cu-mono text-[11px] w-10 text-right" style={{ color: 'var(--cu-text-muted)' }}>
                        {k.persen.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--cu-surface-2)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${k.persen}%`, background: 'var(--cu-primary)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
