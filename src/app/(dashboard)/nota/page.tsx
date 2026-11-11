import { createClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/fetchAll'
import { NotaClient } from './NotaClient'
import type { Nota, Toko } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function NotaPage() {
  const supabase = await createClient()
  const [{ data: notaList }, { data: tokoList }] = await Promise.all([
    fetchAll((from, to) => supabase.from('nota').select('*').order('tanggal', { ascending: false }).order('id', { ascending: false }).range(from, to)),
    supabase.from('toko').select('*').order('nama'),
  ])

  return <NotaClient notaList={(notaList || []) as Nota[]} tokoList={(tokoList || []) as Toko[]} />
}
