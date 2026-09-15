'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  nama: string
  role: string
}

/** Current auth user's profile (nama + role), with the same fallbacks the old Sidebar used. */
export function useUserProfile() {
  const supabase = createClient()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('nama, role')
            .eq('id', user.id)
            .single()

          if (data && !error) {
            setProfile(data)
          } else {
            const emailName = user.email?.split('@')[0] || 'Admin'
            const formattedName = emailName
              .split('.')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            setProfile({ nama: formattedName, role: 'super_admin' })
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setProfile({ nama: 'Administrator', role: 'super_admin' })
      }
      setLoading(false)
    }
    fetchUserProfile()
  }, [supabase])

  return { profile, loading }
}
