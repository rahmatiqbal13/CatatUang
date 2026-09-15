import { categoryColor, formatCompact } from "@/lib/tokens";

export type KategoriRow = { nama: string; total: number };

export function KategoriBars({ rows }: { rows: KategoriRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <section className="card-shell p-[18px]">
      <h2 className="mb-[14px] text-[16px] font-extrabold tracking-[-0.02em]">Pengeluaran per Kategori</h2>
      <ul className="flex flex-col gap-[10px]">
        {rows.map((r) => {
          const c = formatCompact(r.total);
          return (
            <li key={r.nama} className="flex items-center gap-3">
              <span className="w-[118px] shrink-0 text-[12.5px] font-semibold">{r.nama}</span>
              <span className="min-w-0 flex-1" style={{ height: 16, background: "var(--surface-2)" }}>
                <span className="block h-full" style={{ width: `${(r.total / max) * 100}%`, background: categoryColor(r.nama) }} />
              </span>
              <span className="w-[62px] shrink-0 text-right text-[12px] font-bold whitespace-nowrap">
                {c.value} {c.unit}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
