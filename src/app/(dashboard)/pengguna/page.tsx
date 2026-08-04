import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PenggunaClient } from './PenggunaClient'
import type { Profile } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PenggunaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (myProfile?.role !== 'super_admin') redirect('/dashboard')

  const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })

  return <PenggunaClient profiles={(profiles || []) as Profile[]} currentUserId={user.id} />
}
