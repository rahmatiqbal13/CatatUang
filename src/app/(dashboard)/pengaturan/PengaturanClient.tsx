'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

  return (
    <div className="animate-fade-in">
      {/* Topbar */}
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>
            Pengaturan
          </h1>
          <div className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>
            Konfigurasi sistem keuangan direktorat
          </div>
        </div>
      </div>

      <div className="cu-page max-w-xl">
        {/* Identitas Direktorat */}
        <div className="cu-card overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center shrink-0"
              style={{ background: 'var(--cu-primary-soft)' }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="var(--cu-primary)" strokeWidth="1.8" strokeLinecap="round">
                <rect x="2" y="3" width="12" height="10" rx="1.5" />
                <path d="M5 7h6M5 10h4" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--cu-text)' }}>
                Identitas Direktorat
              </div>
              <div className="text-[11.5px]" style={{ color: 'var(--cu-text-muted)' }}>
                Tampil di sidebar dan header laporan PDF
              </div>
            </div>
          </div>

          <div className="px-4 py-4">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                Nama Direktorat
              </label>
              <input
                type="text"
                placeholder="cth: Direktorat Kemahasiswaan"
                value={namaDirektorat}
                onChange={e => setNamaDirektorat(e.target.value)}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--cu-text)',
                }}
              />
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--cu-text-muted)' }}>
                Nama ini muncul di header sidebar dan laporan PDF
              </p>
            </div>
          </div>
        </div>

        {/* Valuta */}
        <div className="cu-card overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center shrink-0"
              style={{ background: 'var(--cu-primary-soft)' }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="var(--cu-primary)" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 4v1.5M8 10.5V12M6 6.5C6 5.7 6.9 5 8 5s2 .7 2 1.5-1 1.3-2 1.5-2 .8-2 1.5S6.9 11 8 11s2-.7 2-1.5" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--cu-text)' }}>
                Valuta
              </div>
              <div className="text-[11.5px]" style={{ color: 'var(--cu-text-muted)' }}>
                Mata uang yang digunakan pada seluruh tampilan nominal
              </div>
            </div>
          </div>

          <div className="px-4 py-4">
            <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
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
              <SelectTrigger
                className="h-[34px] text-[13px] rounded-[5px] w-52"
                style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
              >
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
        </div>

        {/* Identitas Penandatangan */}
        <div className="cu-card overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center shrink-0"
              style={{ background: 'var(--cu-primary-soft)' }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="var(--cu-primary)" strokeWidth="1.8" strokeLinecap="round">
                <path d="M2 13.5c0-2.5 2.5-3.5 6-3.5s6 1 6 3.5" />
                <circle cx="8" cy="5.5" r="3" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--cu-text)' }}>
                Identitas Penandatangan
              </div>
              <div className="text-[11.5px]" style={{ color: 'var(--cu-text-muted)' }}>
                Isian awal untuk Pihak Pertama saat membuat peminjaman baru — bisa diubah manual tiap peminjaman
              </div>
            </div>
          </div>

          <div className="px-4 py-4 space-y-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                Nama
              </label>
              <input
                type="text"
                placeholder="cth: Rahmat Iqbal Rizaldi Pratama, S.Kom."
                value={pihakPertamaNama}
                onChange={e => setPihakPertamaNama(e.target.value)}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                Jabatan
              </label>
              <input
                type="text"
                placeholder="cth: Admin USC (Mewakili Koperasi Kantin Kolam Renang UNESA)"
                value={pihakPertamaJabatan}
                onChange={e => setPihakPertamaJabatan(e.target.value)}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                Instansi
              </label>
              <input
                type="text"
                placeholder="cth: Direktorat Unesa Science Center"
                value={pihakPertamaInstansi}
                onChange={e => setPihakPertamaInstansi(e.target.value)}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
            </div>
          </div>
        </div>

        {/* Keamanan Akun */}
        <div className="cu-card overflow-hidden">
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center shrink-0"
              style={{ background: 'var(--cu-primary-soft)' }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="var(--cu-primary)" strokeWidth="1.8" strokeLinecap="round">
                <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
                <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
              </svg>
            </div>
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--cu-text)' }}>
                Keamanan Akun
              </div>
              <div className="text-[11.5px]" style={{ color: 'var(--cu-text-muted)' }}>
                Ubah password akun Anda
              </div>
            </div>
          </div>

          <div className="px-4 py-4 space-y-3">
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                Password Saat Ini
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                Password Baru
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--cu-text-muted)' }}>
                Minimal 6 karakter
              </p>
            </div>
            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--cu-text-2)' }}>
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
                style={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={changingPassword}
              className="inline-flex items-center gap-2 h-8 px-4 rounded-[5px] text-[13px] font-medium transition-opacity"
              style={{ background: 'var(--cu-text)', color: 'var(--background)', opacity: changingPassword ? 0.7 : 1 }}
            >
              {changingPassword ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengubah...</>
              ) : (
                'Ubah Password'
              )}
            </button>
          </div>
        </div>

        {/* Save button */}
        <div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 h-8 px-4 rounded-[5px] text-[13px] font-medium transition-opacity"
            style={{
              background: 'var(--cu-primary)',
              color: '#ffffff',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 13.5h11M8 2.5v9M4.5 8l3.5 3.5L11.5 8" />
                </svg>
                Simpan Pengaturan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
