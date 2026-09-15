'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Kategori, SumberDana } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Topbar, BarButton } from '@/components/layout/Topbar'
import { autoGrid, categoryColor, sumberColor } from '@/lib/tokens'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Props = { kategoriList: Kategori[]; sumberList: SumberDana[] }

function MasterList({
  title, items, tableName, onRefresh, colorFor,
}: {
  title: string
  items: { id: number; nama: string }[]
  tableName: string
  onRefresh: () => void
  colorFor: (nama: string) => string
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
    setOpenAdd(false)
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
    <section className="card-shell">
      {/* Card header */}
      <header
        className="flex items-center justify-between gap-3 px-[18px] py-[14px]"
        style={{ borderBottom: '2px solid var(--divider)' }}
      >
        <div>
          <h2 className="text-[16px] font-extrabold tracking-[-0.02em]" style={{ color: 'var(--text)' }}>
            {title}
          </h2>
          <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            {items.length} item terdaftar
          </p>
        </div>
        <BarButton
          variant="primary"
          className="!px-2.5 !py-1.5 !text-[12px]"
          onClick={() => setOpenAdd(v => !v)}
        >
          + Tambah
        </BarButton>
      </header>

      {/* Inline add */}
      {openAdd && (
        <div
          className="flex items-center gap-2 px-[18px] py-[12px]"
          style={{ borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-2)' }}
        >
          <input
            type="text"
            autoFocus
            value={inlineVal}
            onChange={e => setInlineVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
            }}
            placeholder={`Tambah ${title.toLowerCase()}…`}
            className="h-[32px] flex-1 px-2.5 text-[12.5px] outline-none"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--divider)',
              color: 'var(--text)',
            }}
          />
          <BarButton
            variant="primary"
            onClick={handleAdd}
            disabled={saving || !inlineVal.trim()}
            className="!px-3 !py-1.5 !text-[12px]"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Tambah'}
          </BarButton>
        </div>
      )}

      {/* Items */}
      {items.length === 0 ? (
        <p className="py-10 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          Belum ada data
        </p>
      ) : (
        <ul>
          {items.map(item => (
            <li
              key={item.id}
              className="row-rule last:border-b-0 group flex items-center justify-between gap-3 px-[18px] py-[11px]"
            >
              <span className="flex min-w-0 items-center gap-[10px]">
                <span aria-hidden className="h-[10px] w-[10px] shrink-0" style={{ background: colorFor(item.nama) }} />
                <span className="truncate text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>
                  {item.nama}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => { setEditTarget(item); setInputVal(item.nama); setOpenEdit(true) }}
                    className="flex h-6 w-6 items-center justify-center transition-colors hover:bg-[var(--surface-2)]"
                    style={{ color: 'var(--text-muted)' }}
                    title="Edit"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => { setDelTarget(item); setOpenDel(true) }}
                    className="flex h-6 w-6 items-center justify-center transition-colors hover:bg-[var(--surface-2)]"
                    style={{ color: 'var(--text-muted)' }}
                    title="Hapus"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9.5h5L11 4" />
                    </svg>
                  </button>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold">Edit {title}</DialogTitle>
          </DialogHeader>
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEdit()}
            autoFocus
            className="h-[34px] w-full px-3 text-[13px] outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--text)' }}
          />
          <DialogFooter>
            <BarButton variant="outline" onClick={() => setOpenEdit(false)} className="!text-[12.5px]">
              Batal
            </BarButton>
            <BarButton variant="primary" onClick={handleEdit} disabled={saving} className="!text-[12.5px]">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Simpan'}
            </BarButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold">Hapus {title}</DialogTitle>
          </DialogHeader>
          <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Hapus <strong style={{ color: 'var(--text)' }}>{delTarget?.nama}</strong>? Pastikan tidak sedang digunakan.
          </p>
          <DialogFooter>
            <BarButton variant="outline" onClick={() => setOpenDel(false)} className="!text-[12.5px]">
              Batal
            </BarButton>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-bold text-white"
              style={{ background: 'var(--data-red)' }}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Hapus'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

export function MasterDataClient({ kategoriList, sumberList }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  function refresh() { startTransition(() => router.refresh()) }

  return (
    <div className="animate-fade-in">
      <Topbar title="Master Data" subtitle="Kategori & sumber dana" />

      <div className="cu-page">
        <div style={autoGrid(280)}>
          <MasterList
            title="Kategori Pengeluaran"
            items={kategoriList}
            tableName="kategori"
            onRefresh={refresh}
            colorFor={categoryColor}
          />
          <MasterList
            title="Sumber Dana"
            items={sumberList}
            tableName="sumber_dana"
            onRefresh={refresh}
            colorFor={sumberColor}
          />
        </div>
      </div>
    </div>
  )
}
