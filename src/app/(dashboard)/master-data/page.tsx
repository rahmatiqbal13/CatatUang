import { createClient } from '@/lib/supabase/server'
import { MasterDataClient } from './MasterDataClient'
import type { Kategori, SumberDana } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function MasterDataPage() {
  const supabase = await createClient()
  const [{ data: kategoriList }, { data: sumberList }] = await Promise.all([
    supabase.from('kategori').select('*').order('nama'),
    supabase.from('sumber_dana').select('*').order('nama'),
  ])
  return (
    <MasterDataClient
      kategoriList={(kategoriList || []) as Kategori[]}
      sumberList={(sumberList || []) as SumberDana[]}
    />
  )
}
