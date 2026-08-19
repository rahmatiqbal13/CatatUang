import { createClient } from '@/lib/supabase/server'
import { RabClient } from './RabClient'
import type { Rab } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function RabPage() {
  const supabase = await createClient()
  const { data: rabList } = await supabase.from('rab').select('*').order('tanggal', { ascending: false })
  return <RabClient rabList={(rabList || []) as Rab[]} />
}
