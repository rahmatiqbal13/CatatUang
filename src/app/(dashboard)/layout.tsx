import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'

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
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar namaDirektorat={setting?.value || 'Keuangan Direktorat'} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
