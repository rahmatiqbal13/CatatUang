import { formatRp } from '@/lib/tokens'

export type RecentRow = {
  key: string
  uraian: string
  meta: string
  jumlah: number
  masuk: boolean
}

/** "Catatan terakhir" — the latest pemasukan and pengeluaran, signed and coloured. */
export function RecentList({ rows }: { rows: RecentRow[] }) {
  return (
    <section className="card-shell px-6 pt-[22px] pb-[10px]">
      <h2 className="m-0 mb-3 text-[26px]">Catatan terakhir</h2>
      {rows.length === 0 ? (
        <p className="serif border-t pt-6 pb-4 text-[18px] italic" style={{ borderColor: 'var(--border-hairline)', color: 'var(--text-2)' }}>
          Belum ada catatan.
        </p>
      ) : (
        rows.map(r => {
          const color = r.masuk ? 'var(--accent)' : 'var(--keluar)'
          return (
            <div key={r.key} className="flex items-center gap-3 border-t py-[13px]" style={{ borderColor: 'var(--border-hairline)' }}>
              <span
                aria-hidden
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold"
                style={{ background: r.masuk ? 'var(--accent-100)' : 'var(--danger-soft)', color }}
              >
                {r.masuk ? '+' : '−'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{r.uraian}</div>
                <div className="mt-[2px] text-[12px]" style={{ color: 'var(--text-muted)' }}>{r.meta}</div>
              </div>
              <span className="cu-mono text-[13.5px] font-semibold whitespace-nowrap" style={{ color }}>
                {r.masuk ? '+' : '−'}Rp {formatRp(r.jumlah)}
              </span>
            </div>
          )
        })
      )}
    </section>
  )
}
