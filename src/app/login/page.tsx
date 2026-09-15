'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Wallet } from 'lucide-react'
import { autoGrid } from '@/lib/tokens'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(searchParams.get('deactivated') ? 'Akun Anda telah dinonaktifkan. Hubungi administrator.' : '')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email atau password salah. Silakan coba lagi.')
      setLoading(false)
      return
    }
    const { data: profile } = await supabase.from('profiles').select('is_active').eq('id', data.user.id).single()
    if (profile && profile.is_active === false) {
      await supabase.auth.signOut()
      setError('Akun Anda telah dinonaktifkan. Hubungi administrator.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <div
        className="w-full max-w-[880px]"
        style={{ ...autoGrid(300), border: '2px solid var(--divider)', minHeight: 460 }}
      >
        {/* Left — brand panel */}
        <div
          className="flex flex-col justify-between p-9"
          style={{ background: 'var(--accent)', color: '#f3f2f2' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center" style={{ background: '#f3f2f2' }}>
              <Wallet size={18} color="#201e1d" strokeWidth={2} />
            </div>
            <span className="text-[19px] font-extrabold tracking-[-0.01em]">CatatUang</span>
          </div>

          <div>
            <h1
              className="text-[38px] font-extrabold leading-[1.05]"
              style={{ letterSpacing: '-0.035em' }}
            >
              Satu buku untuk seluruh keuangan direktorat.
            </h1>
            <p className="mt-4 text-[13px]" style={{ color: '#f9e7e2' }}>
              Semua buku anggaran, pengajuan, persetujuan, dan laporan berada dalam satu tempat — sehingga setiap unit kerja selalu melihat angka yang sama.
            </p>
          </div>
        </div>

        {/* Right — login form */}
        <div className="flex flex-col justify-center p-9" style={{ background: '#ffffff' }}>
          <div className="mb-7">
            <h2 className="text-[24px] font-extrabold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
              Masuk
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Masuk dengan akun yang telah didaftarkan administrator.
            </p>
          </div>

          <form onSubmit={handleLogin} className="max-w-[340px] space-y-4">
            <div>
              <label className="label-caps mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@direktorat.ac.id"
                className="h-[34px] w-full px-3 text-[13px] outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label className="label-caps mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-[34px] w-full px-3 text-[13px] outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--text)' }}
              />
            </div>

            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2 text-[12px]"
                style={{
                  background: 'var(--accent-100)',
                  border: '1px solid var(--accent-press)',
                  color: 'var(--accent-press)',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3zm0 2.5a.75.75 0 00-.75.75v2.5a.75.75 0 001.5 0v-2.5A.75.75 0 008 5.5zm0 5.5a.75.75 0 100 1.5.75.75 0 000-1.5z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-[38px] w-full items-center justify-start gap-2 px-3 text-left text-[14px] font-extrabold transition-opacity"
              style={{
                background: 'var(--accent)',
                color: '#ffffff',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memproses...</>
              ) : (
                'Masuk ke Dashboard'
              )}
            </button>

            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Lupa kata sandi? Hubungi super admin.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
