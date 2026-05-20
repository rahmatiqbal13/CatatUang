'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email atau password salah. Silakan coba lagi.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--background)' }}>
      {/* Left — form */}
      <div
        className="w-full md:w-[420px] md:shrink-0 flex flex-col justify-center px-6 md:px-12 py-12 md:py-0"
        style={{ borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12">
          <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
            <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="var(--cu-primary)" />
            <path
              d="M10.5 12.5a4.5 4.5 0 014.5-4.5h2.5a4.5 4.5 0 014.5 4.5"
              stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"
            />
            <rect x="9" y="13.5" width="14" height="10.5" rx="2.5" stroke="white" strokeWidth="1.8" fill="none" />
            <circle cx="19" cy="18.75" r="1.4" fill="white" />
          </svg>
          <span className="font-semibold text-[14px] tracking-[-0.01em]" style={{ color: 'var(--cu-text)' }}>
            CatatUang
          </span>
        </div>

        <div className="mb-7">
          <h1
            className="text-[24px] font-semibold tracking-[-0.02em]"
            style={{ color: 'var(--cu-text)' }}
          >
            Masuk ke CatatUang
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--cu-text-muted)' }}>
            Sistem Manajemen Keuangan Direktorat
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              className="block text-[12px] font-medium mb-1.5"
              style={{ color: 'var(--cu-text-2)' }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="admin@direktorat.ac.id"
              className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
              style={{
                background: 'var(--cu-surface)',
                border: '1px solid var(--border)',
                color: 'var(--cu-text)',
              }}
            />
          </div>

          <div>
            <label
              className="block text-[12px] font-medium mb-1.5"
              style={{ color: 'var(--cu-text-2)' }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
              style={{
                background: 'var(--cu-surface)',
                border: '1px solid var(--border)',
                color: 'var(--cu-text)',
              }}
            />
          </div>

          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-[5px] text-[12px]"
              style={{
                background: 'color-mix(in srgb, var(--cu-danger) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--cu-danger) 30%, transparent)',
                color: 'var(--cu-danger)',
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
            className="w-full h-[34px] rounded-[5px] text-[13px] font-medium flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: 'var(--cu-primary)',
              color: '#ffffff',
              opacity: loading ? 0.7 : 1,
              marginTop: '4px',
            }}
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Memproses...</>
            ) : (
              'Masuk'
            )}
          </button>
        </form>

        <p className="text-[11.5px] mt-10" style={{ color: 'var(--cu-text-dim)' }}>
          Hanya untuk pengguna yang berwenang · TA 2026
        </p>
      </div>

      {/* Right — preview panel (hidden on mobile) */}
      <div
        className="hidden md:flex flex-1 relative overflow-hidden flex-col"
        style={{ background: 'var(--cu-surface)' }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(var(--cu-text) 1px, transparent 1px), linear-gradient(90deg, var(--cu-text) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
            opacity: 0.03,
          }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Top tagline */}
          <div>
            <div
              className="text-[10.5px] font-medium uppercase tracking-[0.08em] mb-4"
              style={{ color: 'var(--cu-text-muted)' }}
            >
              Keuangan Direktorat · TA 2026
            </div>
            <h2
              className="text-[28px] font-semibold tracking-[-0.025em] leading-snug"
              style={{ color: 'var(--cu-text)' }}
            >
              Setiap rupiah,<br />
              tercatat dengan tepat.
            </h2>
            <p
              className="text-[13px] mt-4 max-w-xs"
              style={{ color: 'var(--cu-text-muted)' }}
            >
              Kelola anggaran, pantau realisasi, dan hasilkan laporan keuangan yang akurat dan transparan.
            </p>
          </div>

          {/* Mini dashboard card */}
          <div className="cu-card max-w-[320px] overflow-hidden">
            <div
              className="px-4 py-2.5 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <span className="text-[12px] font-medium" style={{ color: 'var(--cu-text)' }}>
                Ringkasan
              </span>
              <span className="cu-badge">Mei 2026</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Dana Masuk', val: '2.4 M' },
                  { label: 'Realisasi', val: '1.7 M' },
                  { label: 'Sisa Saldo', val: '720 jt' },
                  { label: 'Menunggu', val: '3 txn' },
                ].map(item => (
                  <div
                    key={item.label}
                    className="px-2.5 py-2 rounded-[4px]"
                    style={{ background: 'var(--cu-surface-2)' }}
                  >
                    <div className="text-[10px]" style={{ color: 'var(--cu-text-muted)' }}>
                      {item.label}
                    </div>
                    <div
                      className="cu-mono text-[14px] font-semibold mt-0.5"
                      style={{ color: 'var(--cu-text)' }}
                    >
                      {item.val}
                    </div>
                  </div>
                ))}
              </div>
              {/* Micro bar chart */}
              <div className="flex items-end gap-[3px] h-9 pt-1">
                {[30, 55, 40, 70, 60, 85, 75, 90, 80, 95, 88, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all"
                    style={{
                      height: `${h}%`,
                      background: i === 11
                        ? 'var(--cu-primary)'
                        : 'var(--cu-surface-2)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-[11px]" style={{ color: 'var(--cu-text-dim)' }}>
            CatatUang v2 · Finance Management System
          </div>
        </div>
      </div>
    </div>
  )
}
