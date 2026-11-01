'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(searchParams.get('deactivated') ? 'Akun Anda telah dinonaktifkan. Hubungi administrator.' : '')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email atau kata sandi salah. Silakan coba lagi.')
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

  const field = 'h-12 w-full rounded-[10px] border px-[14px] text-[15px] outline-none transition-shadow focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_var(--accent-100)]'

  return (
    <div className="grid min-h-screen" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', background: 'var(--background)' }}>
      {/* Left — ruled ledger page */}
      <div
        className="flex flex-col justify-between gap-10 p-7 md:p-14"
        style={{
          background: 'var(--surface-elev)',
          backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 43px, rgba(24,36,30,0.05) 43px 44px)',
        }}
      >
        <div className="flex items-center gap-[11px]">
          <Logo />
        </div>
        <div>
          <div className="serif text-[48px] leading-[1.02] tracking-[-0.03em] md:text-[72px]">
            Setiap rupiah,<br /><i>tercatat rapi.</i>
          </div>
          <p className="mt-[18px] max-w-[420px] text-[15px] leading-[1.55]" style={{ color: 'var(--text-2)' }}>
            Buku kas digital direktorat — dana masuk, pengeluaran, peminjaman, dan bukti uang di satu tempat.
          </p>
        </div>
        <div className="label-caps text-[11px]" style={{ color: 'var(--text-dim)' }}>CatatUang · Buku kas</div>
      </div>

      {/* Right — login form */}
      <div className="flex items-center justify-center p-7 md:p-14">
        <form onSubmit={handleLogin} className="flex w-full max-w-[380px] flex-col gap-[18px]">
          <div>
            <h1 className="m-0 text-[42px] tracking-[-0.02em]">Masuk</h1>
            <p className="mt-[6px] text-[14px]" style={{ color: 'var(--text-2)' }}>Gunakan akun yang dibuat oleh super admin.</p>
          </div>

          <label htmlFor="login-email" className="flex flex-col gap-[7px] text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>
            Email
            <input
              id="login-email"
              name="email"
              type="email"
              spellCheck={false}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@direktorat.ac.id"
              className={field}
              style={{ background: 'var(--surface-elev)', borderColor: 'var(--divider)', color: 'var(--text)', fontWeight: 400 }}
            />
          </label>

          <label htmlFor="login-password" className="flex flex-col gap-[7px] text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>
            Kata sandi
            <span className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Minimal 8 karakter"
                className={`${field} pr-[70px]`}
                style={{ background: 'var(--surface-elev)', borderColor: error ? 'var(--danger)' : 'var(--divider)', color: 'var(--text)', fontWeight: 400 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute top-[6px] right-[6px] h-9 px-[10px] text-[12.5px] font-semibold"
                style={{ color: 'var(--brand)' }}
              >
                {showPassword ? 'Sembunyikan' : 'Lihat'}
              </button>
            </span>
          </label>

          {error && (
            <div role="alert" className="text-[13px]" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-[50px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-colors hover:bg-[var(--accent-hover)]"
            style={{ background: 'var(--accent)', color: 'var(--surface-elev)', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</> : 'Masuk ke buku kas'}
          </button>

          <p className="m-0 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Lupa kata sandi? Hubungi super admin direktorat.
          </p>
        </form>
      </div>
    </div>
  )
}
