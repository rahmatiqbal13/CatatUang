'use client'

import { useUserProfile } from '@/hooks/use-user-profile'
import { BukuPill } from './BukuSwitcher'
import { initials } from './nav-items'

/** Mobile top row: active-buku pill on the left, user initials on the right. */
export function MobileHeader() {
  const { profile } = useUserProfile()

  return (
    <div className="flex shrink-0 items-center gap-[10px] px-5 pt-3 pb-1 md:hidden">
      <BukuPill />
      <span className="flex-1" />
      <span
        title={profile?.nama}
        className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-[13px] font-bold"
        style={{ background: 'var(--keluar)', color: 'var(--surface-elev)' }}
      >
        {profile ? initials(profile.nama) : ''}
      </span>
    </div>
  )
}
