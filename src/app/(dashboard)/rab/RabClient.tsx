'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { generateNomor } from '@/lib/nomorDokumen'
import { computeRabGrandTotal, groupRabByKategori } from '@/lib/dokumenTotals'
import type { Rab, RabItem } from '@/lib/types'
import { pdf } from '@react-pdf/renderer'
import { RabPDF } from '@/components/pdf/RabPDF'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, X, Printer } from 'lucide-react'

type Props = { rabList: Rab[] }

type ItemForm = { kategori: string; uraian: string; volume: string; satuan: string; harga_satuan: string }
const emptyItem: ItemForm = { kategori: '', uraian: '', volume: '1', satuan: '', harga_satuan: '' }

type FormData = { nomor: string; judul: string; tanggal: string; penyusun_nama: string; penyusun_jabatan: string; catatan: string }
const emptyForm: FormData = { nomor: '', judul: '', tanggal: '', penyusun_nama: '', penyusun_jabatan: '', catatan: '' }

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export function RabClient({ rabList }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [openForm, setOpenForm] = useState(false)
  const [openDel, setOpenDel] = useState(false)
  const [editTarget, setEditTarget] = useState<Rab | null>(null)
  const [delTarget, setDelTarget] = useState<Rab | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [items, setItems] = useState<ItemForm[]>([{ ...emptyItem }])
  const [saving, setSaving] = useState(false)
  const [printingId, setPrintingId] = useState<number | null>(null)

  async function handlePrint(r: Rab) {
    setPrintingId(r.id)
    try {
      const blob = await pdf(<RabPDF rab={r} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `RAB_${r.nomor.replace(/\//g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('RAB berhasil diunduh')
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat RAB')
    } finally {
      setPrintingId(null)
    }
  }

  const openAdd = async () => {
    setEditTarget(null)
    const nomor = await generateNomor(supabase, 'rab', 'RAB')
    setForm({ ...emptyForm, nomor, tanggal: todayIso() })
    setItems([{ ...emptyItem }])
    setOpenForm(true)
  }

  const openEdit = (r: Rab) => {
    setEditTarget(r)
    setForm({
      nomor: r.nomor,
      judul: r.judul,
      tanggal: r.tanggal,
      penyusun_nama: r.penyusun_nama,
      penyusun_jabatan: r.penyusun_jabatan || '',
      catatan: r.catatan || '',
    })
    setItems(r.items.map(it => ({ kategori: it.kategori, uraian: it.uraian, volume: String(it.volume), satuan: it.satuan, harga_satuan: String(it.harga_satuan) })))
    setOpenForm(true)
  }

  function updateItem(i: number, patch: Partial<ItemForm>) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  function addItemRow() { setItems(prev => [...prev, { ...emptyItem }]) }
  function removeItemRow(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  const parsedItems: RabItem[] = items
    .filter(it => it.kategori.trim() && it.uraian.trim() && Number(it.harga_satuan) > 0)
    .map(it => ({ kategori: it.kategori.trim(), uraian: it.uraian.trim(), volume: Number(it.volume) || 0, satuan: it.satuan.trim(), harga_satuan: Number(it.harga_satuan) || 0 }))
  const grouped = groupRabByKategori(parsedItems)
  const grandTotal = computeRabGrandTotal(parsedItems)

  async function handleSave() {
    if (!form.nomor || !form.judul || !form.tanggal || !form.penyusun_nama) {
      toast.error('Nomor, judul, tanggal, dan penyusun wajib diisi')
      return
    }
    const nonBlankRows = items.filter(it => it.kategori.trim() || it.uraian.trim() || Number(it.harga_satuan) > 0)
    if (parsedItems.length !== nonBlankRows.length) {
      toast.error('Ada item yang belum lengkap — lengkapi atau hapus barisnya')
      return
    }
    if (parsedItems.length === 0) {
      toast.error('Minimal satu item dengan kategori, uraian, dan harga satuan valid')
      return
    }
    setSaving(true)
    const payload = {
      nomor: form.nomor,
      judul: form.judul,
      tanggal: form.tanggal,
      penyusun_nama: form.penyusun_nama,
      penyusun_jabatan: form.penyusun_jabatan || null,
      items: parsedItems,
      catatan: form.catatan || null,
      updated_at: new Date().toISOString(),
    }
    if (editTarget) {
      const { error } = await supabase.from('rab').update(payload).eq('id', editTarget.id)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('RAB diperbarui')
    } else {
      const { error } = await supabase.from('rab').insert(payload)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('RAB ditambahkan')
    }
    setSaving(false)
    setOpenForm(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from('rab').delete().eq('id', delTarget.id)
    if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
    toast.success('RAB dihapus')
    setSaving(false)
    setOpenDel(false)
    setDelTarget(null)
    router.refresh()
  }

  return (
    <div className="animate-fade-in">
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>RAB</h1>
          <div className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>{rabList.length} rencana anggaran</div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[5px] text-[12px] font-medium"
          style={{ background: 'var(--cu-primary)', color: '#ffffff' }}
        >
          <Plus className="w-3.5 h-3.5" /> RAB Baru
        </button>
      </div>

      <div className="cu-page">
        <div className="cu-card overflow-hidden">
          {rabList.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--cu-text-muted)' }}>Belum ada RAB</div>
          ) : (
            <div className="cu-table-wrap">
              <table className="cu-table">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Nomor</th>
                    <th style={{ width: 90 }}>Tanggal</th>
                    <th>Judul</th>
                    <th className="cu-num" style={{ width: 140 }}>Total</th>
                    <th style={{ width: 90 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rabList.map(r => (
                    <tr key={r.id}>
                      <td className="cu-mono text-[12px]">{r.nomor}</td>
                      <td className="cu-mono text-[11.5px] whitespace-nowrap" style={{ color: 'var(--cu-text-2)' }}>{formatTanggal(r.tanggal)}</td>
                      <td className="text-[12.5px]" style={{ color: 'var(--cu-text)' }}>{r.judul}</td>
                      <td className="cu-num cu-mono text-[12px] font-medium">{formatRupiah(computeRabGrandTotal(r.items))}</td>
                      <td>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => handlePrint(r)} disabled={printingId === r.id} title="Unduh PDF" aria-label="Unduh RAB PDF" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
                            {printingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
                          </button>
                          <button onClick={() => openEdit(r)} title="Edit" aria-label="Edit RAB" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => { setDelTarget(r); setOpenDel(true) }} title="Hapus" aria-label="Hapus RAB" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)]" style={{ color: 'var(--cu-text-muted)' }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">{editTarget ? 'Edit RAB' : 'RAB Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Nomor *</Label>
                <Input value={form.nomor} onChange={e => setForm(f => ({ ...f, nomor: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Judul *</Label>
              <Input placeholder="cth: RAB Kegiatan Lomba 17 Agustus" value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Penyusun *</Label>
                <Input value={form.penyusun_nama} onChange={e => setForm(f => ({ ...f, penyusun_nama: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jabatan</Label>
                <Input value={form.penyusun_jabatan} onChange={e => setForm(f => ({ ...f, penyusun_jabatan: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="text-[11.5px] font-semibold pt-1" style={{ color: 'var(--cu-text-muted)' }}>Item Anggaran</div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-end gap-2 flex-wrap">
                  <div className="w-28">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Kategori</Label>
                    <Input value={it.kategori} onChange={e => updateItem(i, { kategori: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Uraian</Label>
                    <Input value={it.uraian} onChange={e => updateItem(i, { uraian: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="w-16">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Volume</Label>
                    <Input type="number" value={it.volume} onChange={e => updateItem(i, { volume: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="w-20">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Satuan</Label>
                    <Input placeholder="unit" value={it.satuan} onChange={e => updateItem(i, { satuan: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="w-32">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Harga Satuan</Label>
                    <Input type="number" value={it.harga_satuan} onChange={e => updateItem(i, { harga_satuan: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItemRow(i)}
                    disabled={items.length === 1}
                    aria-label="Hapus item"
                    className="w-9 h-9 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)] disabled:opacity-30"
                    style={{ color: 'var(--cu-text-muted)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addItemRow} className="text-[12px] font-medium" style={{ color: 'var(--cu-primary)' }}>
                + Tambah Item
              </button>
            </div>

            <div className="rounded-md p-3 space-y-1" style={{ background: 'var(--cu-surface-2)' }}>
              {grouped.map(g => (
                <div key={g.kategori} className="flex justify-between text-[12px]">
                  <span style={{ color: 'var(--cu-text-muted)' }}>{g.kategori}</span>
                  <span className="cu-mono">{formatRupiah(g.subtotal)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[13px] font-semibold pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                <span>Grand Total</span><span className="cu-mono">{formatRupiah(grandTotal)}</span>
              </div>
            </div>

            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Catatan</Label>
              <Textarea placeholder="Catatan tambahan (opsional)" rows={2} value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} className="text-[13px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--cu-primary)', color: '#fff' }}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold" style={{ color: 'var(--cu-danger)' }}>Hapus RAB</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--cu-text-2)' }}>
            Yakin ingin menghapus RAB <strong style={{ color: 'var(--cu-text)' }}>{delTarget?.judul}</strong>? Tindakan ini tidak dapat dibatalkan.
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
