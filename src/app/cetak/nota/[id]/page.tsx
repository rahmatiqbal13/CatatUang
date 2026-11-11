import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { NotaPrint } from './NotaPrint'
import type { Nota, Toko } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** Print view for one nota — lives outside (dashboard) so only the slip is printed. */
export default async function CetakNotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: nota } = await supabase.from('nota').select('*').eq('id', id).single()
  if (!nota) notFound()
  const { data: toko } = await supabase.from('toko').select('*').eq('id', nota.toko_id).single()
  if (!toko) notFound()

  return <NotaPrint nota={nota as Nota} toko={toko as Toko} />
}
