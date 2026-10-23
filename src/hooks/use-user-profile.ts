'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface UserProfile {
  nama: string
  role: string
}

async function fetchUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('nama, role')
    .eq('id', user.id)
    .single()

  if (data && !error) return data

  const emailName = user.email?.split('@')[0] || 'Admin'
  const formattedName = emailName
    .split('.')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  return { nama: formattedName, role: 'super_admin' }
}

// Sidebar and MobileMoreMenu mount together (and twice under StrictMode); concurrent
// auth.getUser() calls fight over the auth-token lock, so share one in-flight request.
let inflight: Promise<UserProfile | null> | null = null

function loadUserProfile() {
  if (!inflight) {
    inflight = fetchUserProfile().finally(() => { inflight = null })
  }
  return inflight
}

/** Current auth user's profile (nama + role), with the same fallbacks the old Sidebar used. */
export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadUserProfile()
      .then(p => { if (!cancelled) setProfile(p) })
      .catch(err => console.error('Error fetching profile:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { profile, loading }
}
