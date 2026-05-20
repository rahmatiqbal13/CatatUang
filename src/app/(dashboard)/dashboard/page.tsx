import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/formatters'
import Link from 'next/link'
import type { DanaMasuk, Pengeluaran } from '@/lib/types'

export const dynamic = 'force-dynamic'

function fmtCompact(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)} M`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)} jt`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)} rb`
  return String(n)
}

function Sparkline({ color = 'var(--cu-primary)' }: { color?: string }) {
  const pts = [40, 65, 52, 80, 70, 90, 78, 95, 88, 102, 94, 110]
  const max = Math.max(...pts), min = Math.min(...pts)
  const range = max - min || 1
  const w = 72, h = 22
  const coords = pts.map((v, i) => [
    (i / (pts.length - 1)) * w,
    h - ((v - min) / range) * (h - 2) - 1,
  ])
  const d = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${d} L${w} ${h} L0 ${h} Z`
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <path d={area} fill={color} opacity="0.1" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

interface KpiProps {
  label: string
  value: string
  delta?: string
  deltaUp?: boolean
  sub?: string
  accent: string
  sparkColor: string
}

function KpiCard({ label, value, delta, deltaUp, sub, accent, sparkColor }: KpiProps) {
  return (
    <div
      className="cu-card flex flex-col gap-2 p-3.5 relative overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-medium" style={{ color: 'var(--cu-text-muted)' }}>
          {label}
        </span>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
      </div>
      <div
        className="cu-mono text-[22px] font-semibold tracking-[-0.02em]"
        style={{ color: 'var(--cu-text)' }}
      >
        {value}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {delta && (
            <span
              className="text-[11.5px] font-medium flex items-center gap-0.5"
              style={{
                color: deltaUp === true
                  ? 'var(--cu-success)'
                  : deltaUp === false
                  ? 'var(--cu-danger)'
                  : 'var(--cu-text-muted)',
              }}
            >
              {deltaUp === true ? '↑' : deltaUp === false ? '↓' : ''}{delta}
            </span>
          )}
          {sub && (
            <span className="text-[11.5px]" style={{ color: 'var(--cu-text-muted)' }}>
              {sub}
            </span>
          )}
        </div>
        <Sparkline color={sparkColor} />
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    approved: { cls: 'cu-badge cu-badge-success cu-badge-dot', label: 'Disetujui' },
    pending:  { cls: 'cu-badge cu-badge-warning cu-badge-dot', label: 'Menunggu'  },
    rejected: { cls: 'cu-badge cu-badge-danger cu-badge-dot',  label: 'Ditolak'   },
  }
  const v = map[status] || { cls: 'cu-badge', label: status }
  return <span className={v.cls}>{v.label}</span>
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: danaList }, { data: pengeluaranList }] = await Promise.all([
    supabase.from('dana_masuk').select('*').order('created_at', { ascending: false }),
    supabase.from('pengeluaran').select('*').order('tanggal', { ascending: false }),
  ])

  const danas = (danaList || []) as DanaMasuk[]
  const pengeluarans = (pengeluaranList || []) as Pengeluaran[]

  const approved = pengeluarans.filter(p => p.status === 'approved')
  const pending  = pengeluarans.filter(p => p.status === 'pending')

  const totalDana    = danas.reduce((s, d) => s + Number(d.jumlah), 0)
  const totalKeluar  = approved.reduce((s, p) => s + Number(p.jumlah), 0)
  const totalPending = pending.reduce((s, p) => s + Number(p.jumlah), 0)
  const sisaSaldo    = totalDana - totalKeluar
  const pctRealisasi = totalDana > 0 ? (totalKeluar / totalDana) * 100 : 0

  return (
    <div className="animate-fade-in">
      {/* Top bar */}
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>
            Dashboard
          </h1>
          <div className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>
            Ringkasan keuangan · Tahun Anggaran 2026
          </div>
        </div>
        <Link
          href="/laporan"
          className="inline-flex items-center gap-1.5 h-7 px-3 rounded-[5px] border text-[12px] font-medium transition-colors hover:bg-[var(--cu-surface-2)]"
          style={{ borderColor: 'var(--border)', color: 'var(--cu-text)' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 2v9M4.5 7.5L8 11l3.5-3.5"/><path d="M2.5 13.5h11"/>
          </svg>
          Ekspor Laporan
        </Link>
      </div>

      <div className="cu-page">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Total Dana Masuk"
            value={fmtCompact(totalDana)}
            delta="+12,4%"
            deltaUp={true}
            sub="vs bulan lalu"
            accent="var(--cu-primary)"
            sparkColor="var(--cu-primary)"
          />
          <KpiCard
            label="Realisasi"
            value={fmtCompact(totalKeluar)}
            delta={`${pctRealisasi.toFixed(1)}%`}
            sub="dari total"
            accent="var(--cu-warning)"
            sparkColor="var(--cu-warning)"
          />
          <KpiCard
            label="Sisa Saldo"
            value={fmtCompact(sisaSaldo)}
            accent="var(--cu-success)"
            sparkColor="var(--cu-success)"
          />
          <KpiCard
            label="Menunggu Approval"
            value={fmtCompact(totalPending)}
            sub={`${pending.length} transaksi`}
            accent="var(--cu-danger)"
            sparkColor="var(--cu-danger)"
          />
        </div>

        {/* Main row: dana table + pending panel */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-[1.6fr_1fr]">
          {/* Dana table */}
          <div className="cu-card overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="text-[13px] font-semibold" style={{ color: 'var(--cu-text)' }}>
                Ringkasan per Dana
              </div>
              <Link
                href="/dana"
                className="text-[12px] flex items-center gap-1"
                style={{ color: 'var(--cu-primary)' }}
              >
                Lihat semua →
              </Link>
            </div>

            {danas.length === 0 ? (
              <div className="py-16 text-center text-[13px]" style={{ color: 'var(--cu-text-muted)' }}>
                Belum ada dana masuk
              </div>
            ) : (
              <div className="cu-table-wrap">
              <table className="cu-table">
                <thead>
                  <tr>
                    <th>Dana</th>
                    <th className="cu-num">Alokasi</th>
                    <th className="cu-num">Terpakai</th>
                    <th style={{ width: 130 }}>Realisasi</th>
                    <th className="cu-num">Sisa</th>
                  </tr>
                </thead>
                <tbody>
                  {danas.slice(0, 7).map(dana => {
                    const keluar = approved
                      .filter(p => p.dana_id === dana.id)
                      .reduce((s, p) => s + Number(p.jumlah), 0)
                    const sisa  = Number(dana.jumlah) - keluar
                    const pct   = dana.jumlah > 0 ? (keluar / Number(dana.jumlah)) * 100 : 0

                    return (
                      <tr key={dana.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="cu-badge" style={{ height: 18, padding: '0 6px', fontSize: 10 }}>
                              {dana.sumber}
                            </span>
                            <Link
                              href={`/dana/${dana.id}`}
                              className="font-medium text-[12.5px] hover:underline"
                              style={{ color: 'var(--cu-text)' }}
                            >
                              {dana.nama_dana}
                            </Link>
                          </div>
                        </td>
                        <td className="cu-num cu-mono text-[12px]">
                          {fmtCompact(Number(dana.jumlah))}
                        </td>
                        <td className="cu-num cu-mono text-[12px]" style={{ color: 'var(--cu-text-2)' }}>
                          {fmtCompact(keluar)}
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
                                  width: `${Math.min(pct, 100)}%`,
                                  background: pct > 80 ? 'var(--cu-warning)' : 'var(--cu-primary)',
                                }}
                              />
                            </div>
                            <span
                              className="cu-mono text-[11px] w-8 text-right"
                              style={{ color: 'var(--cu-text-muted)' }}
                            >
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td
                          className="cu-num cu-mono text-[12px] font-medium"
                          style={{ color: sisa < 0 ? 'var(--cu-danger)' : 'var(--cu-text)' }}
                        >
                          {fmtCompact(sisa)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {/* Pending approval panel */}
          <div className="cu-card overflow-hidden flex flex-col">
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--cu-text)' }}>
                  Menunggu Approval
                </div>
                <div className="text-[11.5px]" style={{ color: 'var(--cu-text-muted)' }}>
                  {pending.length} pengeluaran · {fmtCompact(totalPending)}
                </div>
              </div>
              <span className="cu-badge cu-badge-warning">Action</span>
            </div>

            {pending.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-center">
                  <div
                    className="text-[13px] font-medium"
                    style={{ color: 'var(--cu-text-muted)' }}
                  >
                    Tidak ada pengajuan
                  </div>
                  <div className="text-[11.5px] mt-1" style={{ color: 'var(--cu-text-dim)' }}>
                    Semua sudah diproses
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {pending.map(p => (
                  <div
                    key={p.id}
                    className="px-4 py-2.5 flex flex-col gap-1.5"
                    style={{ borderBottom: '1px solid var(--cu-divider)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-[12.5px] font-medium truncate"
                          style={{ color: 'var(--cu-text)' }}
                        >
                          {p.uraian}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--cu-text-muted)' }}>
                          {p.nama_dana} · {p.kategori}
                        </div>
                      </div>
                      <div
                        className="cu-mono text-[12.5px] font-semibold shrink-0"
                        style={{ color: 'var(--cu-text)' }}
                      >
                        {fmtCompact(Number(p.jumlah))}
                      </div>
                    </div>
                    <Link
                      href="/pengeluaran"
                      className="text-[11px] font-medium"
                      style={{ color: 'var(--cu-primary)' }}
                    >
                      Tinjau di Pengeluaran →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="cu-card overflow-hidden grid grid-cols-2 md:grid-cols-4 cu-stats-strip">
          {[
            { label: 'Total Dana', value: String(danas.length), sub: 'sumber dana aktif' },
            { label: 'Transaksi', value: String(pengeluarans.length), sub: 'semua status' },
            { label: 'Disetujui', value: String(approved.length), sub: 'pengeluaran' },
            { label: 'Realisasi', value: `${pctRealisasi.toFixed(1)}%`, sub: 'dari total alokasi' },
          ].map((s, i) => (
            <div
              key={i}
              className="px-4 py-3"
            >
              <div
                className="text-[11px] font-medium uppercase tracking-[0.02em]"
                style={{ color: 'var(--cu-text-muted)' }}
              >
                {s.label}
              </div>
              <div
                className="cu-mono text-[20px] font-semibold mt-1 tracking-[-0.02em]"
                style={{ color: 'var(--cu-text)' }}
              >
                {s.value}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--cu-text-dim)' }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
