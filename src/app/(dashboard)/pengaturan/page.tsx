import { createClient } from '@/lib/supabase/server'
import { PengaturanClient } from './PengaturanClient'

export const dynamic = 'force-dynamic'

export default async function PengaturanPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase.from('settings').select('key, value')
  const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value || '']))
  return <PengaturanClient settingsMap={settingsMap} />
}
