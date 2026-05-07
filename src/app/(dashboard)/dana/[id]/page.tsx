import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DanaDetailClient } from './DanaDetailClient'
import type { DanaMasuk, Pengeluaran, Kategori } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DanaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: dana }, { data: pengeluaranList }, { data: kategoriList }] = await Promise.all([
    supabase.from('dana_masuk').select('*').eq('id', id).single(),
    supabase.from('pengeluaran').select('*').eq('dana_id', id).order('tanggal', { ascending: false }),
    supabase.from('kategori').select('*').order('nama'),
  ])

  if (!dana) notFound()

  return (
    <DanaDetailClient
      dana={dana as DanaMasuk}
      pengeluaranList={(pengeluaranList || []) as Pengeluaran[]}
      kategoriList={(kategoriList || []) as Kategori[]}
    />
  )
}
