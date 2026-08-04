'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatTanggal } from '@/lib/formatters'
import type { Profile, UserRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, UserRound } from 'lucide-react'

type Props = { profiles: Profile[]; currentUserId: string }

const roleLabels: Record<UserRole, string> = { super_admin: 'Super Admin', admin: 'Admin' }

type FormData = { nama: string; email: string; password: string; role: UserRole }
const emptyForm: FormData = { nama: '', email: '', password: '', role: 'admin' }

export function PenggunaClient({ profiles, currentUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()

  const [openAdd, setOpenAdd] = useState(false)
  const [openDel, setOpenDel] = useState(false)
  const [delTarget, setDelTarget] = useState<Profile | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  function refresh() { startTransition(() => router.refresh()) }

  async function handleAdd() {
    if (!form.nama.trim() || !form.email.trim() || !form.password) {
      toast.error('Semua kolom wajib diisi')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password minimal 6 karakter')
      return
    }
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const result = await res.json()
    if (!res.ok) {
      toast.error(result.error || 'Gagal menambah pengguna')
      setSaving(false)
      return
    }
    toast.success('Pengguna berhasil ditambahkan')
    setSaving(false)
    setOpenAdd(false)
    setForm(emptyForm)
    refresh()
  }

  async function handleRoleChange(profile: Profile, role: UserRole) {
    setUpdatingId(profile.id)
    const { error } = await supabase.from('profiles').update({ role }).eq('id', profile.id)
    if (error) toast.error('Gagal mengubah role: ' + error.message)
    else { toast.success('Role diperbarui'); refresh() }
    setUpdatingId(null)
  }

  async function handleToggleActive(profile: Profile) {
    setUpdatingId(profile.id)
    const { error } = await supabase.from('profiles').update({ is_active: !profile.is_active }).eq('id', profile.id)
    if (error) toast.error('Gagal mengubah status: ' + error.message)
    else { toast.success(profile.is_active ? 'Pengguna dinonaktifkan' : 'Pengguna diaktifkan'); refresh() }
    setUpdatingId(null)
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const res = await fetch(`/api/users?id=${delTarget.id}`, { method: 'DELETE' })
    const result = await res.json()
    if (!res.ok) {
      toast.error(result.error || 'Gagal menghapus pengguna')
      setSaving(false)
      return
    }
    toast.success('Pengguna dihapus')
    setSaving(false)
    setOpenDel(false)
    setDelTarget(null)
    refresh()
  }

  return (
    <div className="animate-fade-in">
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>
            Manajemen Pengguna
          </h1>
          <div className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>
            {profiles.length} pengguna terdaftar
          </div>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setOpenAdd(true) }}
          className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[5px] text-[12px] font-medium"
          style={{ background: 'var(--cu-primary)', color: '#ffffff' }}
        >
          <Plus className="w-3.5 h-3.5" /> Pengguna Baru
        </button>
      </div>

      <div className="cu-page">
        <div className="cu-card overflow-hidden">
          {profiles.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--cu-text-muted)' }}>
              Belum ada pengguna
            </div>
          ) : (
            <div className="cu-table-wrap">
              <table className="cu-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th style={{ width: 170 }}>Role</th>
                    <th style={{ width: 110 }}>Status</th>
                    <th style={{ width: 110 }}>Dibuat</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(profile => (
                    <tr key={profile.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <UserRound className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--cu-text-muted)' }} />
                          <span className="font-medium text-[12.5px]" style={{ color: 'var(--cu-text)' }}>
                            {profile.nama}
                          </span>
                          {profile.id === currentUserId && (
                            <span className="cu-badge" style={{ height: 18, padding: '0 6px', fontSize: 10 }}>Anda</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <Select
                          value={profile.role}
                          onValueChange={v => v && handleRoleChange(profile, v as UserRole)}
                          items={roleLabels}
                        >
                          <SelectTrigger
                            className="h-[28px] text-[12px] rounded-[5px] w-36"
                            disabled={updatingId === profile.id}
                            style={{ background: 'var(--background)', border: '1px solid var(--border)' }}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleActive(profile)}
                          disabled={updatingId === profile.id || profile.id === currentUserId}
                          className={`cu-badge cu-badge-dot ${profile.is_active ? 'cu-badge-success' : 'cu-badge-danger'}`}
                          style={{
                            cursor: profile.id === currentUserId ? 'not-allowed' : 'pointer',
                            opacity: profile.id === currentUserId ? 0.6 : 1,
                          }}
                          title={profile.id === currentUserId ? 'Tidak bisa nonaktifkan akun sendiri' : 'Klik untuk ubah status'}
                        >
                          {profile.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="cu-mono text-[11.5px]" style={{ color: 'var(--cu-text-2)' }}>
                        {formatTanggal(profile.created_at)}
                      </td>
                      <td>
                        <button
                          onClick={() => { setDelTarget(profile); setOpenDel(true) }}
                          disabled={profile.id === currentUserId}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)]"
                          style={{ color: 'var(--cu-text-muted)', opacity: profile.id === currentUserId ? 0.4 : 1 }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">Tambah Pengguna</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Nama *</Label>
              <Input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Password Awal *</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="h-9 text-[13px]" />
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--cu-text-muted)' }}>
                Minimal 6 karakter. Pengguna bisa menggantinya sendiri lewat Pengaturan.
              </p>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Role *</Label>
              <Select value={form.role} onValueChange={v => v && setForm(f => ({ ...f, role: v as UserRole }))} items={roleLabels}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenAdd(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleAdd} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--cu-primary)', color: '#fff' }}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold" style={{ color: 'var(--cu-danger)' }}>
              Hapus Pengguna
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--cu-text-2)' }}>
            Yakin ingin menghapus <strong style={{ color: 'var(--cu-text)' }}>{delTarget?.nama}</strong>? Akun login orang ini akan ikut dihapus. Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDel(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleDelete} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--cu-danger)', color: '#fff' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
