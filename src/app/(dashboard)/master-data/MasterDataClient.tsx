'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Kategori, SumberDana } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Props = { kategoriList: Kategori[]; sumberList: SumberDana[] }

function MasterList({
  title, items, tableName, onRefresh
}: {
  title: string
  items: { id: number; nama: string }[]
  tableName: string
  onRefresh: () => void
}) {
  const supabase = createClient()
  const [openAdd, setOpenAdd]   = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDel, setOpenDel]   = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: number; nama: string } | null>(null)
  const [delTarget, setDelTarget]   = useState<{ id: number; nama: string } | null>(null)
  const [inputVal, setInputVal] = useState('')
  const [inlineVal, setInlineVal] = useState('')
  const [saving, setSaving]     = useState(false)

  async function handleAdd() {
    const v = inlineVal.trim()
    if (!v) return
    setSaving(true)
    const { error } = await supabase.from(tableName).insert({ nama: v })
    if (error) {
      toast.error(error.message.includes('unique') ? 'Nama sudah ada' : 'Gagal menambah')
      setSaving(false)
      return
    }
    toast.success('Berhasil ditambahkan')
    setSaving(false)
    setInlineVal('')
    onRefresh()
  }

  async function handleEdit() {
    if (!editTarget || !inputVal.trim()) return
    setSaving(true)
    const { error } = await supabase.from(tableName).update({ nama: inputVal.trim() }).eq('id', editTarget.id)
    if (error) { toast.error('Gagal mengupdate'); setSaving(false); return }
    toast.success('Berhasil diperbarui')
    setSaving(false); setOpenEdit(false); onRefresh()
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from(tableName).delete().eq('id', delTarget.id)
    if (error) { toast.error('Tidak dapat menghapus — mungkin sedang digunakan'); setSaving(false); return }
    toast.success('Berhasil dihapus')
    setSaving(false); setOpenDel(false); onRefresh()
  }

  return (
    <div className="cu-card overflow-hidden">
      {/* Card header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <div className="text-[13px] font-semibold" style={{ color: 'var(--cu-text)' }}>
            {title}
          </div>
          <div className="text-[11.5px]" style={{ color: 'var(--cu-text-muted)' }}>
            {items.length} item terdaftar
          </div>
        </div>
      </div>

      {/* Inline add */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--cu-surface-2)' }}
      >
        <input
          type="text"
          value={inlineVal}
          onChange={e => setInlineVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAdd()
          }}
          placeholder={`Tambah ${title.toLowerCase()}…`}
          className="flex-1 h-[30px] px-2.5 text-[12.5px] rounded-[4px] outline-none"
          style={{
            background: 'var(--background)',
            border: '1px solid var(--border)',
            color: 'var(--cu-text)',
          }}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !inlineVal.trim()}
          className="h-[30px] px-3 rounded-[4px] text-[12px] font-medium flex items-center gap-1.5 transition-opacity"
          style={{
            background: 'var(--cu-primary)',
            color: '#fff',
            opacity: (saving || !inlineVal.trim()) ? 0.5 : 1,
          }}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : (
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 1v10M1 6h10" />
            </svg>
          )}
          Tambah
        </button>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div
          className="py-10 text-center text-[12.5px]"
          style={{ color: 'var(--cu-text-muted)' }}
        >
          Belum ada data
        </div>
      ) : (
        <div>
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between px-4 py-2.5 group"
              style={{ borderBottom: '1px solid var(--cu-divider)' }}
            >
              <span className="text-[13px]" style={{ color: 'var(--cu-text)' }}>
                {item.nama}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditTarget(item); setInputVal(item.nama); setOpenEdit(true) }}
                  className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--cu-surface-2)]"
                  style={{ color: 'var(--cu-text-muted)' }}
                  title="Edit"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" />
                  </svg>
                </button>
                <button
                  onClick={() => { setDelTarget(item); setOpenDel(true) }}
                  className="w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--cu-surface-2)]"
                  style={{ color: 'var(--cu-text-muted)' }}
                  title="Hapus"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9.5h5L11 4" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[14px]">Edit {title}</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEdit()}
            autoFocus
            className="w-full h-[34px] px-3 text-[13px] rounded-[5px] outline-none"
            style={{ background: 'var(--cu-surface)', border: '1px solid var(--border)', color: 'var(--cu-text)' }}
          />
          <DialogFooter>
            <button
              onClick={() => setOpenEdit(false)}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--cu-text)' }}
            >
              Batal
            </button>
            <button
              onClick={handleEdit}
              disabled={saving}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium flex items-center gap-1.5"
              style={{ background: 'var(--cu-primary)', color: '#fff' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[14px]">Hapus {title}</DialogTitle>
          </DialogHeader>
          <p className="text-[12.5px]" style={{ color: 'var(--cu-text-muted)' }}>
            Hapus <strong style={{ color: 'var(--cu-text)' }}>{delTarget?.nama}</strong>? Pastikan tidak sedang digunakan.
          </p>
          <DialogFooter>
            <button
              onClick={() => setOpenDel(false)}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium"
              style={{ border: '1px solid var(--border)', color: 'var(--cu-text)' }}
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="h-8 px-4 rounded-[5px] text-[12.5px] font-medium flex items-center gap-1.5"
              style={{ background: 'var(--cu-danger)', color: '#fff' }}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function MasterDataClient({ kategoriList, sumberList }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  function refresh() { startTransition(() => router.refresh()) }

  return (
    <div className="animate-fade-in">
      {/* Topbar */}
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>
            Master Data
          </h1>
          <div className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>
            Kelola kategori pengeluaran dan sumber dana
          </div>
        </div>
      </div>

      <div className="cu-page">
        <div className="grid grid-cols-2 gap-4">
          <MasterList
            title="Kategori Pengeluaran"
            items={kategoriList}
            tableName="kategori"
            onRefresh={refresh}
          />
          <MasterList
            title="Sumber Dana"
            items={sumberList}
            tableName="sumber_dana"
            onRefresh={refresh}
          />
        </div>
      </div>
    </div>
  )
}
