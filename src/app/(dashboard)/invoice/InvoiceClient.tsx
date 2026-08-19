'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { generateNomor } from '@/lib/nomorDokumen'
import { computeInvoiceTotals } from '@/lib/dokumenTotals'
import type { Invoice, InvoiceItem, StatusInvoice } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'

type Props = { invoiceList: Invoice[] }

type ItemForm = { uraian: string; qty: string; harga_satuan: string }
const emptyItem: ItemForm = { uraian: '', qty: '1', harga_satuan: '' }

type FormData = {
  nomor: string; tanggal: string; jatuh_tempo: string
  penerbit_nama: string; penerbit_jabatan: string; penerbit_instansi: string
  penerima_nama: string; penerima_instansi: string; penerima_alamat: string
  diskon_persen: string; pajak_persen: string
  catatan: string
}
const emptyForm: FormData = {
  nomor: '', tanggal: '', jatuh_tempo: '',
  penerbit_nama: '', penerbit_jabatan: '', penerbit_instansi: '',
  penerima_nama: '', penerima_instansi: '', penerima_alamat: '',
  diskon_persen: '0', pajak_persen: '0',
  catatan: '',
}

function StatusBadge({ status }: { status: StatusInvoice }) {
  return status === 'lunas'
    ? <span className="cu-badge cu-badge-success cu-badge-dot">Lunas</span>
    : <span className="cu-badge cu-badge-warning cu-badge-dot">Belum Dibayar</span>
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export function InvoiceClient({ invoiceList }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [openForm, setOpenForm] = useState(false)
  const [openDel, setOpenDel] = useState(false)
  const [editTarget, setEditTarget] = useState<Invoice | null>(null)
  const [delTarget, setDelTarget] = useState<Invoice | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [items, setItems] = useState<ItemForm[]>([{ ...emptyItem }])
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const openAdd = async () => {
    setEditTarget(null)
    const nomor = await generateNomor(supabase, 'invoice', 'INV')
    setForm({ ...emptyForm, nomor, tanggal: todayIso() })
    setItems([{ ...emptyItem }])
    setOpenForm(true)
  }

  const openEdit = (inv: Invoice) => {
    setEditTarget(inv)
    setForm({
      nomor: inv.nomor,
      tanggal: inv.tanggal,
      jatuh_tempo: inv.jatuh_tempo || '',
      penerbit_nama: inv.penerbit_nama,
      penerbit_jabatan: inv.penerbit_jabatan || '',
      penerbit_instansi: inv.penerbit_instansi || '',
      penerima_nama: inv.penerima_nama,
      penerima_instansi: inv.penerima_instansi || '',
      penerima_alamat: inv.penerima_alamat || '',
      diskon_persen: String(inv.diskon_persen),
      pajak_persen: String(inv.pajak_persen),
      catatan: inv.catatan || '',
    })
    setItems(inv.items.map(it => ({ uraian: it.uraian, qty: String(it.qty), harga_satuan: String(it.harga_satuan) })))
    setOpenForm(true)
  }

  function updateItem(i: number, patch: Partial<ItemForm>) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  function addItemRow() { setItems(prev => [...prev, { ...emptyItem }]) }
  function removeItemRow(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  const parsedItems: InvoiceItem[] = items
    .filter(it => it.uraian.trim() && Number(it.harga_satuan) > 0)
    .map(it => ({ uraian: it.uraian.trim(), qty: Number(it.qty) || 0, harga_satuan: Number(it.harga_satuan) || 0 }))
  const totals = computeInvoiceTotals(parsedItems, Number(form.diskon_persen) || 0, Number(form.pajak_persen) || 0)

  async function handleSave() {
    if (!form.nomor || !form.tanggal || !form.penerbit_nama || !form.penerima_nama) {
      toast.error('Nomor, tanggal, penerbit, dan penerima wajib diisi')
      return
    }
    if (parsedItems.length === 0) {
      toast.error('Minimal satu item dengan uraian dan harga satuan valid')
      return
    }
    setSaving(true)
    const payload = {
      nomor: form.nomor,
      tanggal: form.tanggal,
      jatuh_tempo: form.jatuh_tempo || null,
      penerbit_nama: form.penerbit_nama,
      penerbit_jabatan: form.penerbit_jabatan || null,
      penerbit_instansi: form.penerbit_instansi || null,
      penerima_nama: form.penerima_nama,
      penerima_instansi: form.penerima_instansi || null,
      penerima_alamat: form.penerima_alamat || null,
      items: parsedItems,
      diskon_persen: Number(form.diskon_persen) || 0,
      pajak_persen: Number(form.pajak_persen) || 0,
      catatan: form.catatan || null,
      updated_at: new Date().toISOString(),
    }
    if (editTarget) {
      const { error } = await supabase.from('invoice').update(payload).eq('id', editTarget.id)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Invoice diperbarui')
    } else {
      const { error } = await supabase.from('invoice').insert({ ...payload, status: 'belum_dibayar' })
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Invoice ditambahkan')
    }
    setSaving(false)
    setOpenForm(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from('invoice').delete().eq('id', delTarget.id)
    if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
    toast.success('Invoice dihapus')
    setSaving(false)
    setOpenDel(false)
    setDelTarget(null)
    router.refresh()
  }

  async function handleToggleStatus(inv: Invoice) {
    setUpdatingId(inv.id)
    const newStatus: StatusInvoice = inv.status === 'lunas' ? 'belum_dibayar' : 'lunas'
    const { error } = await supabase.from('invoice').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', inv.id)
    if (error) toast.error(handleSupabaseError(error))
    else { toast.success(newStatus === 'lunas' ? 'Ditandai lunas' : 'Ditandai belum dibayar'); router.refresh() }
    setUpdatingId(null)
  }

  return (
    <div className="animate-fade-in">
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>Invoice</h1>
          <div className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>{invoiceList.length} invoice</div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[5px] text-[12px] font-medium"
          style={{ background: 'var(--cu-primary)', color: '#ffffff' }}
        >
          <Plus className="w-3.5 h-3.5" /> Invoice Baru
        </button>
      </div>

      <div className="cu-page">
        <div className="cu-card overflow-hidden">
          {invoiceList.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--cu-text-muted)' }}>Belum ada invoice</div>
          ) : (
            <div className="cu-table-wrap">
              <table className="cu-table">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Nomor</th>
                    <th style={{ width: 90 }}>Tanggal</th>
                    <th>Penerima</th>
                    <th className="cu-num" style={{ width: 130 }}>Total</th>
                    <th style={{ width: 110 }}>Status</th>
                    <th style={{ width: 90 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceList.map(inv => {
                    const t = computeInvoiceTotals(inv.items, inv.diskon_persen, inv.pajak_persen)
                    return (
                      <tr key={inv.id}>
                        <td className="cu-mono text-[12px]">{inv.nomor}</td>
                        <td className="cu-mono text-[11.5px] whitespace-nowrap" style={{ color: 'var(--cu-text-2)' }}>{formatTanggal(inv.tanggal)}</td>
                        <td className="text-[12.5px]" style={{ color: 'var(--cu-text)' }}>{inv.penerima_nama}</td>
                        <td className="cu-num cu-mono text-[12px] font-medium">{formatRupiah(t.total)}</td>
                        <td>
                          <button
                            onClick={() => handleToggleStatus(inv)}
                            disabled={updatingId === inv.id}
                            className={`cu-badge cu-badge-dot ${inv.status === 'lunas' ? 'cu-badge-success' : 'cu-badge-warning'}`}
                            style={{ cursor: 'pointer' }}
                            title="Klik untuk ubah status"
                          >
                            {inv.status === 'lunas' ? 'Lunas' : 'Belum Dibayar'}
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => openEdit(inv)} title="Edit" aria-label="Edit invoice" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => { setDelTarget(inv); setOpenDel(true) }} title="Hapus" aria-label="Hapus invoice" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)]" style={{ color: 'var(--cu-text-muted)' }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">{editTarget ? 'Edit Invoice' : 'Invoice Baru'}</DialogTitle>
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
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jatuh Tempo</Label>
              <Input type="date" value={form.jatuh_tempo} onChange={e => setForm(f => ({ ...f, jatuh_tempo: e.target.value }))} className="h-9 text-[13px]" />
            </div>

            <div className="text-[11.5px] font-semibold pt-1" style={{ color: 'var(--cu-text-muted)' }}>Dari (Penerbit)</div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Nama *</Label>
              <Input value={form.penerbit_nama} onChange={e => setForm(f => ({ ...f, penerbit_nama: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jabatan</Label>
                <Input value={form.penerbit_jabatan} onChange={e => setForm(f => ({ ...f, penerbit_jabatan: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Instansi</Label>
                <Input value={form.penerbit_instansi} onChange={e => setForm(f => ({ ...f, penerbit_instansi: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="text-[11.5px] font-semibold pt-1" style={{ color: 'var(--cu-text-muted)' }}>Kepada (Penerima)</div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Nama *</Label>
              <Input value={form.penerima_nama} onChange={e => setForm(f => ({ ...f, penerima_nama: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Instansi</Label>
                <Input value={form.penerima_instansi} onChange={e => setForm(f => ({ ...f, penerima_instansi: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Alamat</Label>
                <Input value={form.penerima_alamat} onChange={e => setForm(f => ({ ...f, penerima_alamat: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="text-[11.5px] font-semibold pt-1" style={{ color: 'var(--cu-text-muted)' }}>Item</div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Uraian</Label>
                    <Input value={it.uraian} onChange={e => updateItem(i, { uraian: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="w-16">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Qty</Label>
                    <Input type="number" value={it.qty} onChange={e => updateItem(i, { qty: e.target.value })} className="h-9 text-[13px]" />
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Diskon (%)</Label>
                <Input type="number" value={form.diskon_persen} onChange={e => setForm(f => ({ ...f, diskon_persen: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Pajak / PPN (%)</Label>
                <Input type="number" value={form.pajak_persen} onChange={e => setForm(f => ({ ...f, pajak_persen: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="rounded-md p-3 space-y-1" style={{ background: 'var(--cu-surface-2)' }}>
              <div className="flex justify-between text-[12px]"><span style={{ color: 'var(--cu-text-muted)' }}>Subtotal</span><span className="cu-mono">{formatRupiah(totals.subtotal)}</span></div>
              <div className="flex justify-between text-[12px]"><span style={{ color: 'var(--cu-text-muted)' }}>Diskon</span><span className="cu-mono">-{formatRupiah(totals.diskonNominal)}</span></div>
              <div className="flex justify-between text-[12px]"><span style={{ color: 'var(--cu-text-muted)' }}>Pajak</span><span className="cu-mono">{formatRupiah(totals.pajakNominal)}</span></div>
              <div className="flex justify-between text-[13px] font-semibold pt-1" style={{ borderTop: '1px solid var(--border)' }}><span>Total</span><span className="cu-mono">{formatRupiah(totals.total)}</span></div>
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
            <DialogTitle className="text-[15px] font-semibold" style={{ color: 'var(--cu-danger)' }}>Hapus Invoice</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--cu-text-2)' }}>
            Yakin ingin menghapus invoice <strong style={{ color: 'var(--cu-text)' }}>{delTarget?.nomor}</strong>? Tindakan ini tidak dapat dibatalkan.
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
