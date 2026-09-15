"use client";

import { formatRp } from "@/lib/tokens";

export type PendingItem = {
  id: string;
  uraian: string;
  jumlah: number;
  meta: string; // "12 Sep · Belanja Barang · Dana Operasional"
};

/**
 * Wire onApprove/onReject to the repo's existing mutation hooks
 * (use-supabase-mutation + optimistic update). This component owns no data.
 */
export function ApprovalQueue({
  items,
  onApprove,
  onReject,
}: {
  items: PendingItem[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <section className="card-shell">
      <header className="flex items-center justify-between gap-3 px-[18px] py-[14px]" style={{ borderBottom: "2px solid var(--divider)" }}>
        <h2 className="text-[16px] font-extrabold tracking-[-0.02em]">Menunggu Approval</h2>
        {items.length > 0 && (
          <span className="px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-[0.1em] whitespace-nowrap" style={{ background: "#ffe0d9", color: "#ae1800" }}>
            {items.length} antre
          </span>
        )}
      </header>

      {items.length === 0 ? (
        <p className="px-[18px] py-[26px] text-center text-[13px] text-[var(--text-muted)]">
          Semua pengajuan sudah diproses.
        </p>
      ) : (
        <ul>
          {items.map((it) => (
            <li key={it.id} className="row-rule flex gap-3 px-[18px] py-[13px] last:border-b-0">
              <span aria-hidden className="w-[4px] shrink-0 self-stretch" style={{ background: "#c07a00" }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-[13.5px] font-bold">{it.uraian}</p>
                  <p className="shrink-0 text-[14px] font-extrabold whitespace-nowrap">Rp {formatRp(it.jumlah)}</p>
                </div>
                <p className="mt-[2px] text-[11.5px] text-[var(--text-muted)]">{it.meta}</p>
                <div className="mt-[10px] flex gap-2">
                  <button
                    onClick={() => onApprove(it.id)}
                    className="px-[10px] py-[5px] text-[11.5px] font-bold whitespace-nowrap"
                    style={{ background: "#201e1d", color: "#f3f2f2" }}
                  >
                    Setujui
                  </button>
                  <button
                    onClick={() => onReject(it.id)}
                    className="px-[10px] py-[5px] text-[11.5px] font-bold whitespace-nowrap"
                    style={{ background: "var(--surface)", color: "var(--text)", border: "1px solid var(--divider)" }}
                  >
                    Tolak
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
