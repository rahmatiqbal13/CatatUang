'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Topbar, BarButton } from '@/components/layout/Topbar'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Props = { settingsMap: Record<string, string> }

export function PengaturanClient({ settingsMap }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [namaDirektorat, setNamaDirektorat] = useState(settingsMap.nama_direktorat || '')
  const [currency, setCurrency]             = useState(settingsMap.currency || 'IDR')
  const [pihakPertamaNama, setPihakPertamaNama]         = useState(settingsMap.pihak_pertama_nama || '')
  const [pihakPertamaJabatan, setPihakPertamaJabatan]   = useState(settingsMap.pihak_pertama_jabatan || '')
  const [pihakPertamaInstansi, setPihakPertamaInstansi] = useState(settingsMap.pihak_pertama_instansi || '')
  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Semua kolom password wajib diisi')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password baru minimal 6 karakter')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Konfirmasi password baru tidak cocok')
      return
    }
    setChangingPassword(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      toast.error('Sesi tidak valid, silakan login ulang')
      setChangingPassword(false)
      return
    }
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (reauthError) {
      toast.error('Password saat ini salah')
      setChangingPassword(false)
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      toast.error('Gagal mengubah password: ' + updateError.message)
      setChangingPassword(false)
      return
    }
    toast.success('Password berhasil diubah')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setChangingPassword(false)
  }

  async function handleSave() {
    setSaving(true)
    const updates = [
      { key: 'nama_direktorat', value: namaDirektorat },
      { key: 'currency',        value: currency },
      { key: 'pihak_pertama_nama',     value: pihakPertamaNama },
      { key: 'pihak_pertama_jabatan',  value: pihakPertamaJabatan },
      { key: 'pihak_pertama_instansi', value: pihakPertamaInstansi },
    ]
    for (const u of updates) {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: u.key, value: u.value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) { toast.error(`Gagal menyimpan ${u.key}`); setSaving(false); return }
    }
    toast.success('Pengaturan berhasil disimpan')
    setSaving(false)
    startTransition(() => router.refresh())
  }

  const inputStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--divider)',
    color: 'var(--text)',
  } as const

  return (
    <div className="animate-fade-in">
      <Topbar title="Pengaturan" subtitle="Identitas & buku anggaran" />

      <div className="cu-page max-w-xl">
        {/* Identitas Direktorat */}
        <section className="card-shell">
          <header
            className="flex items-center gap-2 px-[18px] py-[14px]"
            style={{ borderBottom: '2px solid var(--divider)' }}
          >
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center"
              style={{ background: 'var(--accent-100)' }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round">
                <rect x="2" y="3" width="12" height="10" rx="1.5" />
                <path d="M5 7h6M5 10h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-[13px] font-extrabold" style={{ color: 'var(--text)' }}>
                Identitas Direktorat
              </h2>
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                Tampil di sidebar dan header laporan PDF
              </p>
            </div>
          </header>

          <div className="px-[18px] py-[16px]">
            <div>
              <label className="label-caps mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Nama Direktorat
              </label>
              <input
                type="text"
                placeholder="cth: Direktorat Kemahasiswaan"
                value={namaDirektorat}
                onChange={e => setNamaDirektorat(e.target.value)}
                className="h-[34px] w-full px-3 text-[13px] outline-none"
                style={inputStyle}
              />
              <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Nama ini muncul di header sidebar dan laporan PDF
              </p>
            </div>
          </div>
        </section>

        {/* Valuta */}
        <section className="card-shell">
          <header
            className="flex items-center gap-2 px-[18px] py-[14px]"
            style={{ borderBottom: '2px solid var(--divider)' }}
          >
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center"
              style={{ background: 'var(--accent-100)' }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 4v1.5M8 10.5V12M6 6.5C6 5.7 6.9 5 8 5s2 .7 2 1.5-1 1.3-2 1.5-2 .8-2 1.5S6.9 11 8 11s2-.7 2-1.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-[13px] font-extrabold" style={{ color: 'var(--text)' }}>
                Valuta
              </h2>
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                Mata uang yang digunakan pada seluruh tampilan nominal
              </p>
            </div>
          </header>

          <div className="px-[18px] py-[16px]">
            <label className="label-caps mb-1.5 block" style={{ color: 'var(--text-2)' }}>
              Mata Uang
            </label>
            <Select
              value={currency}
              onValueChange={v => setCurrency(v ?? 'IDR')}
              items={{
                IDR: 'IDR — Rupiah Indonesia',
                USD: 'USD — Dolar Amerika',
                EUR: 'EUR — Euro',
                SGD: 'SGD — Dolar Singapura',
                MYR: 'MYR — Ringgit Malaysia',
              }}
            >
              <SelectTrigger className="h-[34px] w-52 text-[13px]" style={inputStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IDR">IDR — Rupiah Indonesia</SelectItem>
                <SelectItem value="USD">USD — Dolar Amerika</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
                <SelectItem value="SGD">SGD — Dolar Singapura</SelectItem>
                <SelectItem value="MYR">MYR — Ringgit Malaysia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Identitas Penandatangan */}
        <section className="card-shell">
          <header
            className="flex items-center gap-2 px-[18px] py-[14px]"
            style={{ borderBottom: '2px solid var(--divider)' }}
          >
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center"
              style={{ background: 'var(--accent-100)' }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2 13.5c0-2.5 2.5-3.5 6-3.5s6 1 6 3.5" />
                <circle cx="8" cy="5.5" r="3" />
              </svg>
            </div>
            <div>
              <h2 className="text-[13px] font-extrabold" style={{ color: 'var(--text)' }}>
                Identitas Penandatangan
              </h2>
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                Isian awal untuk Pihak Pertama saat membuat peminjaman baru — bisa diubah manual tiap peminjaman
              </p>
            </div>
          </header>

          <div className="space-y-3 px-[18px] py-[16px]">
            <div>
              <label className="label-caps mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Nama
              </label>
              <input
                type="text"
                placeholder="cth: Rahmat Iqbal Rizaldi Pratama, S.Kom."
                value={pihakPertamaNama}
                onChange={e => setPihakPertamaNama(e.target.value)}
                className="h-[34px] w-full px-3 text-[13px] outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="label-caps mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Jabatan
              </label>
              <input
                type="text"
                placeholder="cth: Admin USC (Mewakili Koperasi Kantin Kolam Renang UNESA)"
                value={pihakPertamaJabatan}
                onChange={e => setPihakPertamaJabatan(e.target.value)}
                className="h-[34px] w-full px-3 text-[13px] outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="label-caps mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Instansi
              </label>
              <input
                type="text"
                placeholder="cth: Direktorat Unesa Science Center"
                value={pihakPertamaInstansi}
                onChange={e => setPihakPertamaInstansi(e.target.value)}
                className="h-[34px] w-full px-3 text-[13px] outline-none"
                style={inputStyle}
              />
            </div>
          </div>
        </section>

        {/* Keamanan Akun */}
        <section className="card-shell">
          <header
            className="flex items-center gap-2 px-[18px] py-[14px]"
            style={{ borderBottom: '2px solid var(--divider)' }}
          >
            <div
              className="flex h-5 w-5 shrink-0 items-center justify-center"
              style={{ background: 'var(--accent-100)' }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
                <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
              </svg>
            </div>
            <div>
              <h2 className="text-[13px] font-extrabold" style={{ color: 'var(--text)' }}>
                Keamanan Akun
              </h2>
              <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                Ubah password akun Anda
              </p>
            </div>
          </header>

          <div className="space-y-3 px-[18px] py-[16px]">
            <div>
              <label className="label-caps mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Password Saat Ini
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="h-[34px] w-full px-3 text-[13px] outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="label-caps mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Password Baru
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="h-[34px] w-full px-3 text-[13px] outline-none"
                style={inputStyle}
              />
              <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Minimal 6 karakter
              </p>
            </div>
            <div>
              <label className="label-caps mb-1.5 block" style={{ color: 'var(--text-2)' }}>
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="h-[34px] w-full px-3 text-[13px] outline-none"
                style={inputStyle}
              />
            </div>
            <BarButton
              variant="ink"
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="!inline-flex !items-center !gap-2"
            >
              {changingPassword ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengubah...</>
              ) : (
                'Ubah Password'
              )}
            </BarButton>
          </div>
        </section>

        {/* Save button */}
        <div>
          <BarButton
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="!inline-flex !items-center !gap-2"
          >
            {saving ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...</>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 13.5h11M8 2.5v9M4.5 8l3.5 3.5L11.5 8" />
                </svg>
                Simpan Pengaturan
              </>
            )}
          </BarButton>
        </div>
      </div>
    </div>
  )
}
