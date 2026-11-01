'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseMutation } from '@/hooks/use-supabase-mutation'
import { handleSupabaseError } from '@/lib/error-handler'
import { setPengeluaranStatus } from '@/lib/pengeluaran'
import { useUserProfile } from '@/hooks/use-user-profile'
import { formatRp } from '@/lib/tokens'
import { toast } from 'sonner'

export type PendingItem = {
  id: number
  uraian: string
  jumlah: number
  meta: string // "12 Sep · Belanja Barang · Dana Operasional"
}

const STAMP = {
  approved: { text: 'DISETUJUI', color: 'var(--accent)' },
  rejected: { text: 'DITOLAK', color: 'var(--danger)' },
}

/** Approve/reject queue; the buttons only show for super admins (the DB enforces it too). */
export function ApprovalQueueClient({ items, totalPending }: { items: PendingItem[]; totalPending: number }) {
  const router = useRouter()
  const supabase = createClient()
  const { profile } = useUserProfile()
  const canApprove = profile?.role === 'super_admin'
  const { mutate, isLoading } = useSupabaseMutation()
  const [stamped, setStamped] = useState<{ id: number; status: keyof typeof STAMP } | null>(null)

  const decide = async (id: number, status: keyof typeof STAMP) => {
    await mutate(
      () => setPengeluaranStatus(supabase, id, status),
      {
        onSuccess: () => {
          setStamped({ id, status })
          toast.success(status === 'approved' ? 'Pengeluaran disetujui' : 'Pengeluaran ditolak')
          // Let the stamp land before the row leaves the queue.
          setTimeout(() => { setStamped(null); router.refresh() }, 700)
        },
        onError: e => toast.error(handleSupabaseError(e)),
      }
    )
  }

  return (
    <section className="card-shell px-6 pt-[22px] pb-[10px]">
      <div className="flex flex-wrap items-center gap-[10px]">
        <h2 className="m-0 text-[26px] tracking-[-0.01em]">Menunggu persetujuan</h2>
        <span className="cu-mono rounded-full px-[9px] py-[3px] text-[11px] font-semibold" style={{ background: 'var(--status-wait-bg)', color: 'var(--status-wait-fg)' }}>
          {items.length} antre
        </span>
      </div>
      <p className="mt-[6px] mb-[14px] text-[13px]" style={{ color: 'var(--text-muted)' }}>
        {items.length ? `Rp ${formatRp(totalPending)} perlu ditinjau bendahara` : 'Tidak ada antrean'}
      </p>

      {items.length === 0 ? (
        <div className="rule-dashed serif pt-7 pb-[22px] text-[18px] italic" style={{ color: 'var(--text-2)' }}>
          Semua pengajuan sudah ditinjau.
        </div>
      ) : (
        items.map(it => {
          const stamp = stamped?.id === it.id ? STAMP[stamped.status] : null
          return (
            <div key={it.id} className="rule-dashed relative flex flex-wrap items-center gap-3 py-4">
              <div className="min-w-0 flex-[1_1_200px]">
                <div className="text-[15px] font-semibold" style={{ textWrap: 'pretty' }}>{it.uraian}</div>
                <div className="mt-[3px] text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{it.meta}</div>
              </div>
              <div className="cu-mono text-[15px] font-semibold whitespace-nowrap">Rp {formatRp(it.jumlah)}</div>
              {canApprove && (
                <div className="flex flex-[1_1_100%] gap-2 md:flex-none">
                  <button
                    onClick={() => decide(it.id, 'approved')}
                    disabled={isLoading}
                    className="min-h-11 flex-1 rounded-full px-4 py-[9px] text-[13px] font-semibold whitespace-nowrap transition-colors hover:bg-[var(--accent-200)] md:min-h-[34px]"
                    style={{ background: 'var(--accent-100)', color: 'var(--accent-fg)' }}
                  >
                    Setujui
                  </button>
                  <button
                    onClick={() => decide(it.id, 'rejected')}
                    disabled={isLoading}
                    className="min-h-11 flex-1 rounded-full border px-4 py-[9px] text-[13px] font-semibold whitespace-nowrap transition-colors hover:bg-[var(--danger-soft)] md:min-h-[34px]"
                    style={{ borderColor: 'var(--divider)', color: 'var(--danger)' }}
                  >
                    Tolak
                  </button>
                </div>
              )}
              {stamp && (
                <div
                  aria-hidden
                  className="cu-stamp cu-mono pointer-events-none absolute top-[14px] right-6 rounded-[6px] border-[3px] px-[14px] py-[5px] text-[18px] font-bold tracking-[.18em]"
                  style={{ borderColor: stamp.color, color: stamp.color, background: 'rgba(251,249,244,.88)' }}
                >
                  {stamp.text}
                </div>
              )}
            </div>
          )
        })
      )}
    </section>
  )
}
