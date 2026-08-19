import { createClient } from '@/lib/supabase/server'
import { KwitansiClient } from './KwitansiClient'
import type { Kwitansi, Invoice } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function KwitansiPage() {
  const supabase = await createClient()
  const [{ data: kwitansiList }, { data: invoiceList }] = await Promise.all([
    supabase.from('kwitansi').select('*').order('tanggal', { ascending: false }),
    supabase.from('invoice').select('id, nomor, penerima_nama, items, diskon_persen, pajak_persen').order('nomor'),
  ])

  return (
    <KwitansiClient
      kwitansiList={(kwitansiList || []) as Kwitansi[]}
      invoiceList={(invoiceList || []) as Pick<Invoice, 'id' | 'nomor' | 'penerima_nama' | 'items' | 'diskon_persen' | 'pajak_persen'>[]}
    />
  )
}
