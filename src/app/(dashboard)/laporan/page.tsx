import { createClient } from '@/lib/supabase/server'
import { LaporanClient } from './LaporanClient'
import type { DanaMasuk, Pengeluaran } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function LaporanPage({ searchParams }: { searchParams: Promise<{ dana?: string }> }) {
  const { dana: danaFilter } = await searchParams
  const supabase = await createClient()

  const [{ data: danaList }, { data: pengeluaranList }, { data: settings }] = await Promise.all([
    supabase.from('dana_masuk').select('*').order('created_at', { ascending: false }),
    supabase.from('pengeluaran').select('*').order('tanggal', { ascending: false }),
    supabase.from('settings').select('key, value'),
  ])

  const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value || '']))

  return (
    <LaporanClient
      danaList={(danaList || []) as DanaMasuk[]}
      pengeluaranList={(pengeluaranList || []) as Pengeluaran[]}
      settingsMap={settingsMap}
      initialDanaFilter={danaFilter || 'all'}
    />
  )
}
