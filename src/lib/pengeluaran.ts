import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Approve or reject a pending pengeluaran. Only touches rows still pending, so a
 * double click or a stale screen can't re-approve. Who may approve, the balance
 * check and approved_by are enforced by the pengeluaran_guard trigger
 * (supabase/migrate_security_hardening.sql).
 */
export async function setPengeluaranStatus(supabase: SupabaseClient, id: number, status: 'approved' | 'rejected') {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('pengeluaran')
    .update(status === 'approved' ? { status, approved_at: now, updated_at: now } : { status, updated_at: now })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id')
  if (error) throw error
  if (!data?.length) throw new Error('Pengajuan ini sudah diproses. Muat ulang halaman.')
}
