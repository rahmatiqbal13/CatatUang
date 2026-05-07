'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Kategori, SumberDana } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, Tag, Landmark } from 'lucide-react'

type Props = { kategoriList: Kategori[]; sumberList: SumberDana[] }

function MasterList({
  title, icon: Icon, description, items, tableName, onRefresh
}: {
  title: string
  icon: React.ElementType
  description: string
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
  const [saving, setSaving]     = useState(false)

  async function handleAdd() {
    if (!inputVal.trim()) return
    setSaving(true)
    const { error } = await supabase.from(tableName).insert({ nama: inputVal.trim() })
    if (error) { toast.error(error.message.includes('unique') ? 'Nama sudah ada' : 'Gagal menambah'); setSaving(false); return }
    toast.success('Berhasil ditambahkan')
    setSaving(false); setOpenAdd(false); setInputVal(''); onRefresh()
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
    <Card className="border-0 shadow-sm ring-1 ring-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => { setInputVal(''); setOpenAdd(true) }}>
            <Plus className="w-3.5 h-3.5" /> Tambah
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
          ) : items.map(item => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 group">
              <span className="text-sm font-medium text-slate-800">{item.nama}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-primary"
                  onClick={() => { setEditTarget(item); setInputVal(item.nama); setOpenEdit(true) }}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:text-destructive"
                  onClick={() => { setDelTarget(item); setOpenDel(true) }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Add Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Tambah {title}</DialogTitle></DialogHeader>
          <Input placeholder={`Nama ${title.toLowerCase()}`} value={inputVal} onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>Batal</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit {title}</DialogTitle></DialogHeader>
          <Input value={inputVal} onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleEdit()} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>Batal</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Hapus {title}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Hapus <strong>{delTarget?.nama}</strong>? Pastikan tidak sedang digunakan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDel(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Hapus'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function MasterDataClient({ kategoriList, sumberList }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  function refresh() { startTransition(() => router.refresh()) }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Master Data</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Kelola kategori pengeluaran dan sumber dana</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MasterList
          title="Kategori Pengeluaran"
          icon={Tag}
          description={`${kategoriList.length} kategori terdaftar`}
          items={kategoriList}
          tableName="kategori"
          onRefresh={refresh}
        />
        <MasterList
          title="Sumber Dana"
          icon={Landmark}
          description={`${sumberList.length} sumber terdaftar`}
          items={sumberList}
          tableName="sumber_dana"
          onRefresh={refresh}
        />
      </div>
    </div>
  )
}
