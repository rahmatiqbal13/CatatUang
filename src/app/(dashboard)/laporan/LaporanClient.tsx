'use client'

import { useState, type CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import { formatRupiah, formatTanggal, hitungPersen } from '@/lib/formatters'
import { usePagination, PaginationControls } from '@/hooks/use-pagination'
import { ExcelExportDropdown } from '@/components/excel-export-button'
import type { DanaMasukWithSaldo, Pengeluaran } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Topbar, BarButton } from '@/components/layout/Topbar'
import { TableWrap, Th, Td } from '@/components/ui/TableWrap'
import { StatusBadge, SolidBadge } from '@/components/ui/StatusBadge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { autoGrid, categoryColor, sumberColor, formatCompact, pct, palette } from '@/lib/tokens'

const PDFExportButton = dynamic(() => import('./PDFExportButton'), { ssr: false })

type Props = {
  danaList: DanaMasukWithSaldo[]
  pengeluaranList: Pengeluaran[]
  settingsMap: Record<string, string>
  initialDanaFilter: string
  bukuNama: string
}

function fmtCompact(n: number) {
  const c = formatCompact(n)
  return c.unit ? `${c.value} ${c.unit}` : c.value
}

const fieldStyle: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-hairline)',
  color: 'var(--text)',
}

function monthKey(tanggal: string) {
  return tanggal.slice(0, 7)
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit' }).format(new Date(y, m - 1, 1))
}

export function LaporanClient({ danaList, pengeluaranList, settingsMap, initialDanaFilter, bukuNama }: Props) {
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

  // Monthly "Dana Masuk vs Pengeluaran" — reuses danaScope (respects the dana
  // filter) and the approved subset of filteredPengeluaran (respects status +
  // date-range filters); no new Supabase calls.
  const danaInRange = danaScope.filter(d => (!filterDari || d.tanggal >= filterDari) && (!filterSampai || d.tanggal <= filterSampai))
  const monthlyMasuk = new Map<string, number>()
  danaInRange.forEach(d => monthlyMasuk.set(monthKey(d.tanggal), (monthlyMasuk.get(monthKey(d.tanggal)) || 0) + Number(d.jumlah)))
  const monthlyKeluar = new Map<string, number>()
  approved.forEach(p => monthlyKeluar.set(monthKey(p.tanggal), (monthlyKeluar.get(monthKey(p.tanggal)) || 0) + Number(p.jumlah)))
  const months = Array.from(new Set([...monthlyMasuk.keys(), ...monthlyKeluar.keys()])).sort()
  const maxMonthly = Math.max(1, ...months.map(m => Math.max(monthlyMasuk.get(m) || 0, monthlyKeluar.get(m) || 0)))

  const periodeLabel = filterDari || filterSampai
    ? `${filterDari ? formatTanggal(filterDari) : 'Awal'} – ${filterSampai ? formatTanggal(filterSampai) : 'Sekarang'}`
    : 'Semua Tanggal'

  const hasFilters = Boolean(filterDari || filterSampai || filterDana !== 'all' || filterStatus !== 'approved')

  return (
    <div className="animate-fade-in">
      <Topbar
        title="Laporan"
        subtitle={`Periode ${periodeLabel}`}
        action={
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
        }
      />

      <div className="cu-page">
        {/* Filter bar */}
        <div className="card-shell p-[16px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="label-caps" style={{ color: 'var(--text-muted)' }}>{bukuNama}</span>

            <Select
              value={filterDana}
              onValueChange={v => setFilterDana(v ?? 'all')}
              items={{ all: 'Semua Dana', ...Object.fromEntries(danaList.map(d => [String(d.id), d.nama_dana])) }}
            >
              <SelectTrigger className="h-[34px] w-52 text-[12.5px]" style={fieldStyle}>
                <SelectValue placeholder="Semua Dana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Dana</SelectItem>
                {danaList.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.nama_dana}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterStatus}
              onValueChange={v => setFilterStatus(v ?? 'approved')}
              items={{ all: 'Semua Status', approved: 'Disetujui', pending: 'Menunggu', rejected: 'Ditolak' }}
            >
              <SelectTrigger className="h-[34px] w-40 text-[12.5px]" style={fieldStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="pending">Menunggu</SelectItem>
                <SelectItem value="rejected">Ditolak</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterDari}
                onChange={e => setFilterDari(e.target.value)}
                className="h-[34px] px-[10px] text-[12.5px] outline-none"
                style={fieldStyle}
              />
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>—</span>
              <input
                type="date"
                value={filterSampai}
                onChange={e => setFilterSampai(e.target.value)}
                className="h-[34px] px-[10px] text-[12.5px] outline-none"
                style={fieldStyle}
              />
            </div>

            {hasFilters && (
              <BarButton
                variant="outline"
                onClick={() => { setFilterDari(''); setFilterSampai(''); setFilterDana('all'); setFilterStatus('approved') }}
              >
                Reset
              </BarButton>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div style={autoGrid(220)}>
          {[
            { label: 'Total Dana', value: fmtCompact(totalDana), full: formatRupiah(totalDana), color: palette.blue },
            { label: 'Realisasi', value: fmtCompact(totalKeluar), full: formatRupiah(totalKeluar), color: palette.red },
            { label: 'Sisa Saldo', value: fmtCompact(sisaSaldo), full: formatRupiah(sisaSaldo), color: palette.green },
            { label: 'Pending', value: fmtCompact(totalPending), full: formatRupiah(totalPending), color: palette.amber },
          ].map(kpi => (
            <div key={kpi.label} className="card-shell p-[16px]">
              <div className="label-caps" style={{ color: 'var(--text-muted)' }}>{kpi.label}</div>
              <div className="mt-1 whitespace-nowrap text-[26px] font-extrabold tracking-[-0.02em]" style={{ color: kpi.color }}>
                {kpi.value}
              </div>
              <div className="mt-[2px] whitespace-nowrap text-[11px]" style={{ color: 'var(--text-dim)' }}>
                {kpi.full}
              </div>
            </div>
          ))}
        </div>

        {/* Dana Masuk vs Pengeluaran */}
        <div className="card-shell p-[18px]">
          <h2 className="text-[16px] font-extrabold tracking-[-0.02em]">Dana Masuk vs Pengeluaran</h2>
          {months.length === 0 ? (
            <p className="py-[26px] text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Tidak ada data untuk periode ini
            </p>
          ) : (
            <>
              <div className="mt-[14px] flex items-end" style={{ height: 180, gap: 10 }}>
                {months.map(m => {
                  const masuk = monthlyMasuk.get(m) || 0
                  const keluar = monthlyKeluar.get(m) || 0
                  return (
                    <div key={m} className="flex flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
                      <div className="flex w-full items-end justify-center" style={{ height: 140, gap: 4, maxWidth: 56 }}>
                        <div
                          className="flex-1"
                          style={{ height: `${(masuk / maxMonthly) * 100}%`, background: 'var(--data-blue)', minHeight: masuk > 0 ? 2 : 0 }}
                          title={`Masuk: ${formatRupiah(masuk)}`}
                        />
                        <div
                          className="flex-1"
                          style={{ height: `${(keluar / maxMonthly) * 100}%`, background: 'var(--data-red)', minHeight: keluar > 0 ? 2 : 0 }}
                          title={`Keluar: ${formatRupiah(keluar)}`}
                        />
                      </div>
                      <div className="mt-2 whitespace-nowrap text-[11.5px] font-bold">{monthLabel(m)}</div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-[14px] flex items-center gap-5">
                <span className="flex items-center gap-[6px] text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                  <span aria-hidden className="h-[10px] w-[10px] shrink-0" style={{ background: 'var(--data-blue)' }} />
                  Dana Masuk
                </span>
                <span className="flex items-center gap-[6px] text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                  <span aria-hidden className="h-[10px] w-[10px] shrink-0" style={{ background: 'var(--data-red)' }} />
                  Pengeluaran
                </span>
              </div>
            </>
          )}
        </div>

        {/* Ringkasan per Dana (shown when all dana) */}
        {filterDana === 'all' && (
          <div className="card-shell">
            <div className="px-[18px] py-[14px]" style={{ borderBottom: '2px solid var(--divider)' }}>
              <div className="text-[16px] font-extrabold tracking-[-0.02em]">Ringkasan Per Dana</div>
              <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Penggunaan dana per sumber</div>
            </div>
            <TableWrap minWidth={620}>
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Nama Dana</Th>
                    <Th>Sumber</Th>
                    <Th align="right">Alokasi</Th>
                    <Th align="right">Terpakai</Th>
                    <Th align="right">Sisa</Th>
                    <Th width={160}>Penggunaan</Th>
                  </tr>
                </thead>
                <tbody>
                  {perDana.map(d => (
                    <tr key={d.id}>
                      <Td><span className="font-bold">{d.nama_dana}</span></Td>
                      <Td><SolidBadge color={sumberColor(d.sumber)}>{d.sumber}</SolidBadge></Td>
                      <Td align="right"><span className="whitespace-nowrap">{fmtCompact(Number(d.jumlah))}</span></Td>
                      <Td align="right"><span className="whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{fmtCompact(d.keluar)}</span></Td>
                      <Td align="right">
                        <span className="whitespace-nowrap font-bold" style={{ color: d.sisa < 0 ? 'var(--accent)' : 'var(--data-green)' }}>
                          {fmtCompact(d.sisa)}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="flex-1"><ProgressBar used={d.keluar} total={Number(d.jumlah)} color={sumberColor(d.sumber)} /></span>
                          <span className="w-8 shrink-0 whitespace-nowrap text-right text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                            {pct(d.keluar, Number(d.jumlah))}%
                          </span>
                        </div>
                      </Td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <td className="px-2 py-[11px] text-[13px] font-extrabold first:pl-4" colSpan={2}>TOTAL</td>
                    <td className="whitespace-nowrap px-2 py-[11px] text-right text-[13px] font-extrabold">{fmtCompact(totalDana)}</td>
                    <td className="whitespace-nowrap px-2 py-[11px] text-right text-[13px] font-extrabold">{fmtCompact(totalKeluar)}</td>
                    <td className="whitespace-nowrap px-2 py-[11px] text-right text-[13px] font-extrabold" style={{ color: sisaSaldo < 0 ? 'var(--accent)' : 'var(--data-green)' }}>
                      {fmtCompact(sisaSaldo)}
                    </td>
                    <td className="px-2 py-[11px] last:pr-4" />
                  </tr>
                </tbody>
              </table>
            </TableWrap>
          </div>
        )}

        {/* Detail Pengeluaran table */}
        <div className="card-shell">
          <div className="px-[18px] py-[14px]" style={{ borderBottom: '2px solid var(--divider)' }}>
            <div className="text-[16px] font-extrabold tracking-[-0.02em]">Detail Pengeluaran</div>
            <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{totalItems} transaksi ditemukan</div>
          </div>

          {paginatedData.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Tidak ada data pengeluaran untuk filter ini
            </div>
          ) : (
            <>
              <TableWrap minWidth={620}>
                <table className="w-full">
                  <thead>
                    <tr>
                      <Th>Tanggal</Th>
                      {filterDana === 'all' && <Th>Dana</Th>}
                      <Th>Uraian</Th>
                      <Th>Kategori</Th>
                      <Th align="right">Jumlah</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map(p => (
                      <tr key={p.id}>
                        <Td><span className="whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatTanggal(p.tanggal)}</span></Td>
                        {filterDana === 'all' && (
                          <Td><span className="block max-w-[130px] truncate" style={{ color: 'var(--text-2)' }}>{p.nama_dana}</span></Td>
                        )}
                        <Td>
                          <div className="max-w-[220px] truncate font-semibold">{p.uraian}</div>
                          {p.keterangan && (
                            <div className="max-w-[220px] truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.keterangan}</div>
                          )}
                        </Td>
                        <Td><SolidBadge color={categoryColor(p.kategori)}>{p.kategori}</SolidBadge></Td>
                        <Td align="right"><span className="whitespace-nowrap font-bold">{formatRupiah(Number(p.jumlah))}</span></Td>
                        <Td><StatusBadge status={p.status} /></Td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--surface-2)' }}>
                      <td className="px-2 py-[11px] text-[13px] font-extrabold first:pl-4" colSpan={filterDana === 'all' ? 4 : 3}>
                        TOTAL
                      </td>
                      <td className="whitespace-nowrap px-2 py-[11px] text-right text-[13px] font-extrabold">{formatRupiah(totalKeluar)}</td>
                      <td className="px-2 py-[11px] last:pr-4" />
                    </tr>
                  </tbody>
                </table>
              </TableWrap>

              <div className="px-[18px] py-[10px]" style={{ borderTop: '1px solid var(--border-hairline)' }}>
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
          <div className="card-shell p-[18px]">
            <h2 className="text-[16px] font-extrabold tracking-[-0.02em]">Pengeluaran per Kategori</h2>
            <p className="mb-[14px] text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Distribusi pengeluaran yang disetujui</p>
            <div style={autoGrid(230)}>
              {perKategori.map(k => (
                <div key={k.kategori} className="card-shell p-[14px]" style={{ borderLeft: `6px solid ${categoryColor(k.kategori)}` }}>
                  <div className="text-[12.5px] font-bold">{k.kategori}</div>
                  <div className="mt-1 whitespace-nowrap text-[22px] font-extrabold tracking-[-0.02em]">{fmtCompact(k.total)}</div>
                  <div className="mt-[2px] text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                    {k.persen.toFixed(1)}% dari total pengeluaran
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
