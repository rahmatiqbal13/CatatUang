import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'nama_direktorat')
    .single()

  return (
    <DashboardShell namaDirektorat={setting?.value || 'Keuangan Direktorat'}>
      {children}
    </DashboardShell>
  )
}
