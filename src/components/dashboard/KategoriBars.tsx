import { categoryColor, formatRp } from '@/lib/tokens'

export type KategoriRow = { nama: string; total: number }

export function KategoriBars({ rows, periode }: { rows: KategoriRow[]; periode?: string }) {
  const max = Math.max(1, ...rows.map(r => r.total))
  return (
    <section className="card-shell px-6 py-[22px]">
      <h2 className="m-0 text-[26px]">Belanja per kategori</h2>
      <p className="mt-[6px] mb-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
        Pengeluaran disetujui{periode ? ` · ${periode}` : ''}
      </p>
      {rows.length === 0 ? (
        <p className="serif text-[17px] italic" style={{ color: 'var(--text-2)' }}>Belum ada pengeluaran disetujui.</p>
      ) : (
        <ul className="flex flex-col gap-[14px]">
          {rows.map(r => (
            <li key={r.nama} className="flex flex-col gap-[6px]">
              <div className="flex justify-between gap-[10px] text-[13px]">
                <span className="font-medium">{r.nama}</span>
                <span className="cu-mono font-semibold whitespace-nowrap">Rp {formatRp(r.total)}</span>
              </div>
              <div className="h-2 rounded-[4px]" style={{ background: 'var(--surface-3)' }}>
                <div className="h-full rounded-[4px]" style={{ width: `${(r.total / max) * 100}%`, background: categoryColor(r.nama) }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
