import Link from 'next/link'
import { formatRpCompact, pct, sumberColor } from '@/lib/tokens'

export type DanaRow = {
  id: number
  nama: string
  sumber: string
  alokasi: number
  terpakai: number
}

/**
 * "Dompet dana" — one row per fund: colour chip, name, remaining balance, a
 * thin usage bar and the source · usage line. A list, not a table, so long
 * fund names wrap instead of clipping.
 */
export function AlokasiList({ rows, hrefAll }: { rows: DanaRow[]; hrefAll: string }) {
  return (
    <section className="card-shell px-6 pt-[22px] pb-3">
      <div className="flex items-baseline justify-between gap-[10px]">
        <h2 className="m-0 text-[26px]">Dompet dana</h2>
        <Link href={hrefAll} className="py-[6px] text-[13px] font-semibold whitespace-nowrap" style={{ color: 'var(--brand)' }}>
          Lihat semua →
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="serif mt-3 border-t pt-6 pb-4 text-[18px] italic" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-2)' }}>
          Belum ada dompet di buku ini.
        </p>
      ) : (
        <div className="mt-3">
          {rows.map(d => {
            const color = sumberColor(d.sumber)
            const p = pct(d.terpakai, d.alokasi)
            return (
              <Link
                key={d.id}
                href={`/dana/${d.id}`}
                className="flex w-full flex-col gap-2 border-t py-[14px] transition-colors hover:bg-[var(--surface-hover)]"
                style={{ borderColor: 'var(--border-hairline)' }}
              >
                <div className="flex w-full items-center gap-[10px]">
                  <span aria-hidden className="h-[10px] w-[10px] shrink-0 rounded-[3px]" style={{ background: color }} />
                  <span className="min-w-0 flex-1 text-[14.5px] font-semibold">{d.nama}</span>
                  <span className="cu-mono text-[13.5px] font-semibold whitespace-nowrap">{formatRpCompact(d.alokasi - d.terpakai)}</span>
                </div>
                <div className="h-[6px] w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                  <div className="h-full rounded-full" style={{ width: `${p}%`, background: color }} />
                </div>
                <div className="flex w-full justify-between gap-[10px] text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  <span>{d.sumber} · terpakai {String(p).replace('.', ',')}%</span>
                  <span className="whitespace-nowrap">sisa dari {formatRpCompact(d.alokasi)}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
