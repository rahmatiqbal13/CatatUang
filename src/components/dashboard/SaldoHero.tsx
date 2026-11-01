import { formatRp, pct } from '@/lib/tokens'
import { terbilangRupiah } from '@/lib/formatters'

/**
 * The ledger's headline: remaining balance in big serif numerals with its
 * terbilang, realisation %, and one stacked bar (green = tersedia, red =
 * terpakai, ochre hatching = pending reserved).
 */
export function SaldoHero({
  totalMasuk,
  totalKeluar,
  totalPending,
  pemasukanCount,
  danaCount,
  approvedCount,
  pendingCount,
}: {
  totalMasuk: number
  totalKeluar: number
  totalPending: number
  pemasukanCount: number
  danaCount: number
  approvedCount: number
  pendingCount: number
}) {
  const sisa = totalMasuk - totalKeluar
  const tersedia = sisa - totalPending
  const realisasi = pct(totalKeluar, totalMasuk)

  const legend = [
    { label: 'Dana masuk', color: 'var(--text)', value: totalMasuk, sub: `${pemasukanCount} pemasukan · ${danaCount} dompet` },
    { label: 'Terpakai', color: 'var(--keluar)', value: totalKeluar, sub: `${approvedCount} pengeluaran disetujui` },
    { label: 'Menunggu', color: 'var(--data-amber)', value: totalPending, sub: `${pendingCount} pengajuan dicadangkan` },
    { label: 'Tersedia', color: 'var(--accent)', value: tersedia, sub: 'bebas dipakai' },
  ]

  return (
    <section className="card-shell flex flex-col gap-6 p-[22px] md:p-[30px_32px]" style={{ animation: 'fade-in .4s ease both' }}>
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <div className="label-caps text-[11px]" style={{ color: 'var(--text-muted)' }}>Sisa saldo · seluruh dompet</div>
          <div className="mt-3 flex flex-wrap items-baseline gap-[10px]">
            <span className="serif text-[24px]" style={{ color: 'var(--text-muted)' }}>Rp</span>
            <span className="serif text-[44px] leading-[.95] tracking-[-0.035em] md:text-[76px]">{formatRp(sisa)}</span>
          </div>
          <div className="serif mt-[10px] max-w-[620px] text-[16px] italic" style={{ color: 'var(--text-2)', textWrap: 'pretty' }}>
            {terbilangRupiah(sisa)}
          </div>
        </div>
        <div>
          <div className="label-caps text-[11px]" style={{ color: 'var(--text-muted)' }}>Realisasi</div>
          <div className="serif mt-2 text-[44px] leading-none tracking-[-0.02em]" style={{ color: 'var(--keluar)' }}>
            {realisasi.toFixed(1).replace('.', ',')}%
          </div>
          <div className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>dari total dana masuk</div>
        </div>
      </div>

      <div className="flex h-[14px] overflow-hidden rounded-full" style={{ background: 'var(--accent)' }}>
        <div style={{ width: `${pct(totalKeluar, totalMasuk)}%`, background: 'var(--keluar)', transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} />
        <div className="cu-hatch" style={{ width: `${pct(totalPending, totalMasuk)}%`, transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} />
      </div>

      <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))' }}>
        {legend.map(l => (
          <div key={l.label} className="flex flex-col gap-[5px]">
            <div className="flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--text-2)' }}>
              <span className="h-[10px] w-[10px] rounded-[3px]" style={{ background: l.color }} />
              {l.label}
            </div>
            <div className="cu-mono text-[16px] font-semibold whitespace-nowrap">Rp {formatRp(l.value)}</div>
            <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{l.sub}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
