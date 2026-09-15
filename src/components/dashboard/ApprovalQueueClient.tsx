'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSupabaseMutation } from '@/hooks/use-supabase-mutation'
import { handleSupabaseError } from '@/lib/error-handler'
import { formatRp } from '@/lib/tokens'
import { toast } from 'sonner'

export type PendingItem = {
  id: number
  uraian: string
  jumlah: number
  meta: string // "12 Sep · Belanja Barang · Dana Operasional"
}

/**
 * Same approve/reject mutation the Pengeluaran screen uses
 * (see PengeluaranClient.tsx's handleApprove/handleReject) — just surfaced here too.
 */
export function ApprovalQueueClient({ items }: { items: PendingItem[] }) {
  const router = useRouter()
  const supabase = createClient()
  const { mutate: approvePengeluaran, isLoading: approving } = useSupabaseMutation()
  const { mutate: rejectPengeluaran, isLoading: rejecting } = useSupabaseMutation()

  const handleApprove = async (id: number) => {
    await approvePengeluaran(
      async () => {
        const { error } = await supabase.from('pengeluaran').update({ status: 'approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id)
        if (error) throw error
      },
      { onSuccess: () => { toast.success('Pengeluaran disetujui'); router.refresh() }, onError: e => toast.error(handleSupabaseError(e)) }
    )
  }

  const handleReject = async (id: number) => {
    await rejectPengeluaran(
      async () => {
        const { error } = await supabase.from('pengeluaran').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id)
        if (error) throw error
      },
      { onSuccess: () => { toast.success('Pengeluaran ditolak'); router.refresh() }, onError: e => toast.error(handleSupabaseError(e)) }
    )
  }

  return (
    <section className="card-shell">
      <header className="flex items-center justify-between gap-3 px-[18px] py-[14px]" style={{ borderBottom: '2px solid var(--divider)' }}>
        <h2 className="text-[16px] font-extrabold tracking-[-0.02em]">Menunggu Approval</h2>
        {items.length > 0 && (
          <span className="px-2 py-[3px] text-[10px] font-extrabold uppercase tracking-[0.1em] whitespace-nowrap" style={{ background: 'var(--accent-200)', color: 'var(--accent-press)' }}>
            {items.length} antre
          </span>
        )}
      </header>

      {items.length === 0 ? (
        <p className="px-[18px] py-[26px] text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Semua pengajuan sudah diproses.
        </p>
      ) : (
        <ul>
          {items.map(it => (
            <li key={it.id} className="row-rule flex gap-3 px-[18px] py-[13px] last:border-b-0">
              <span aria-hidden className="w-[4px] shrink-0 self-stretch" style={{ background: 'var(--data-amber)' }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-[13.5px] font-bold">{it.uraian}</p>
                  <p className="shrink-0 text-[14px] font-extrabold whitespace-nowrap">Rp {formatRp(it.jumlah)}</p>
                </div>
                <p className="mt-[2px] text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{it.meta}</p>
                <div className="mt-[10px] flex gap-2">
                  <button
                    onClick={() => handleApprove(it.id)}
                    disabled={approving}
                    className="px-[10px] py-[5px] text-[11.5px] font-bold whitespace-nowrap disabled:opacity-50"
                    style={{ background: '#201e1d', color: '#f3f2f2' }}
                  >
                    Setujui
                  </button>
                  <button
                    onClick={() => handleReject(it.id)}
                    disabled={rejecting}
                    className="px-[10px] py-[5px] text-[11.5px] font-bold whitespace-nowrap disabled:opacity-50"
                    style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--divider)' }}
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
  )
}
