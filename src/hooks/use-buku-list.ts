'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Buku } from '@/lib/types'

/** The buku list + the currently-selected one (from ?buku=, defaulting to the newest). */
export function useBukuList() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [bukuList, setBukuList] = useState<Buku[]>([])
  const [loadingBuku, setLoadingBuku] = useState(true)

  const fetchBuku = useCallback(async () => {
    const { data } = await supabase.from('buku').select('*').order('tahun', { ascending: false })
    return (data || []) as Buku[]
  }, [supabase])

  useEffect(() => {
    let active = true
    fetchBuku().then(data => {
      if (active) { setBukuList(data); setLoadingBuku(false) }
    })
    return () => { active = false }
  }, [fetchBuku])

  const refetch = useCallback(async () => {
    setBukuList(await fetchBuku())
  }, [fetchBuku])

  const currentBukuId = searchParams.get('buku') || (bukuList[0] ? String(bukuList[0].id) : '')
  const currentBuku = bukuList.find(b => String(b.id) === currentBukuId)

  return { bukuList, loadingBuku, currentBukuId, currentBuku, refetch }
}
