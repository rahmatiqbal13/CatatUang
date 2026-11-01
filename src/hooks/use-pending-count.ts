'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/** Pending pengeluaran in the given buku — drives the nav badge. Refreshes on navigation. */
export function usePendingCount(bukuId: string) {
  const pathname = usePathname()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!bukuId) return
    let active = true
    createClient()
      .from('pengeluaran')
      .select('id, dana_masuk!inner(buku_id)', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('dana_masuk.buku_id', bukuId)
      .then(({ count }) => { if (active) setCount(count ?? 0) })
    return () => { active = false }
  }, [bukuId, pathname])

  return count
}
