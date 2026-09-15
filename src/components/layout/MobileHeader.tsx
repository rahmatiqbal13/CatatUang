'use client'

import { Wallet } from 'lucide-react'
import { useBukuList } from '@/hooks/use-buku-list'
import { MobileMoreMenu } from './MobileMoreMenu'

/** Ink-colored mobile top bar: logo + wordmark + active buku + "more" menu. */
export function MobileHeader() {
  const { currentBuku, loadingBuku } = useBukuList()

  return (
    <div className="flex items-center gap-2.5 h-12 px-4 shrink-0 md:hidden" style={{ background: '#201e1d', color: '#f3f2f2' }}>
      <span className="flex h-7 w-7 items-center justify-center shrink-0" style={{ background: 'var(--accent)' }}>
        <Wallet size={15} strokeWidth={2} color="#ffffff" />
      </span>
      <span className="font-extrabold text-[13.5px] tracking-[-0.01em]">CatatUang</span>
      <span className="min-w-0 truncate text-[11px] font-medium" style={{ color: '#c9c6c5' }}>
        {loadingBuku ? '' : currentBuku ? `Buku ${currentBuku.nama}` : ''}
      </span>
      <MobileMoreMenu />
    </div>
  )
}
