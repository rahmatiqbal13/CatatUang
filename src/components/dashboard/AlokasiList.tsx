import Link from 'next/link'
import { formatRp, pct, sumberColor } from '@/lib/tokens'
import { ProgressBar } from '@/components/ui/ProgressBar'

export type DanaRow = {
  id: number
  nama: string
  sumber: string
  alokasi: number
  terpakai: number
}

/**
 * Deliberately a LIST, not a table: fund names are long and a table clipped them.
 * Rows are rules on white, so a short list never leaves an empty grey block.
 */
export function AlokasiList({ rows, hrefAll }: { rows: DanaRow[]; hrefAll: string }) {
  return (
    <section className="card-shell">
      <header className="flex items-center justify-between gap-3 px-[18px] py-[14px]" style={{ borderBottom: '2px solid var(--divider)' }}>
        <h2 className="text-[16px] font-extrabold tracking-[-0.02em]">Alokasi per Dana</h2>
        <Link href={hrefAll} className="text-[12.5px] font-bold whitespace-nowrap" style={{ color: 'var(--accent-press)' }}>
          Lihat semua →
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="px-[18px] py-[26px] text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Belum ada dana masuk.
        </p>
      ) : (
        <ul>
          {rows.map(d => {
            const color = sumberColor(d.sumber)
            const sisa = d.alokasi - d.terpakai
            return (
              <li key={d.id} className="row-rule last:border-b-0">
                <Link href={`/dana/${d.id}`} className="block px-[18px] py-[13px] transition-colors hover:bg-[var(--surface-hover)]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className="h-[10px] w-[10px] shrink-0" style={{ background: color }} />
                      <span className="truncate text-[13.5px] font-bold">{d.nama}</span>
                      <span className="shrink-0 px-[6px] py-[2px] text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                        {d.sumber}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-extrabold whitespace-nowrap">Rp {formatRp(sisa)} sisa</span>
                  </div>

                  <div className="mt-[9px] flex items-center gap-[10px]">
                    <span className="flex-1"><ProgressBar used={d.terpakai} total={d.alokasi} color={color} /></span>
                    <span className="text-[11.5px] font-bold whitespace-nowrap">{pct(d.terpakai, d.alokasi)}%</span>
                    <span className="text-[11.5px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {formatRp(d.terpakai)} / {formatRp(d.alokasi)}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
