'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

/** Sign out and land on /login — shared by the sidebar and the mobile "Lainnya" sheet. */
export function useLogout() {
  const router = useRouter()
  return async () => {
    await createClient().auth.signOut()
    toast.success('Berhasil keluar')
    router.push('/login')
    router.refresh()
  }
}
