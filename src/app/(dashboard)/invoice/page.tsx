import { createClient } from '@/lib/supabase/server'
import { InvoiceClient } from './InvoiceClient'
import type { Invoice } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function InvoicePage() {
  const supabase = await createClient()
  const { data: invoiceList } = await supabase
    .from('invoice')
    .select('*')
    .order('tanggal', { ascending: false })

  return <InvoiceClient invoiceList={(invoiceList || []) as Invoice[]} />
}
