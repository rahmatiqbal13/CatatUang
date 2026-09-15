'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { pdf } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { generateNomor } from '@/lib/nomorDokumen'
import { computeInvoiceTotals } from '@/lib/dokumenTotals'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'
import type { Invoice, InvoiceItem, StatusInvoice } from '@/lib/types'
import { Topbar, BarButton } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { TableWrap } from '@/components/ui/TableWrap'
import { autoGrid, palette } from '@/lib/tokens'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, X, Printer } from 'lucide-react'

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
  const [printingId, setPrintingId] = useState<number | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(invoiceList[0]?.id ?? null)

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
    const nonBlankRows = items.filter(it => it.uraian.trim() || Number(it.harga_satuan) > 0)
    if (parsedItems.length !== nonBlankRows.length) {
      toast.error('Ada item yang belum lengkap — lengkapi atau hapus barisnya')
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

  async function handlePrint(inv: Invoice) {
    setPrintingId(inv.id)
    try {
      const blob = await pdf(<InvoicePDF invoice={inv} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Invoice_${inv.nomor.replace(/\//g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Invoice berhasil diunduh')
    } catch (err) {
      console.error(err)
      toast.error('Gagal membuat invoice')
    } finally {
      setPrintingId(null)
    }
  }

  const belumDibayarCount = invoiceList.filter(i => i.status === 'belum_dibayar').length
  const selected = invoiceList.find(inv => inv.id === selectedId) ?? invoiceList[0] ?? null
  const selectedTotals = selected ? computeInvoiceTotals(selected.items, selected.diskon_persen, selected.pajak_persen) : null

  return (
    <div className="animate-fade-in">
      <Topbar
        title="Invoice"
        subtitle={`${invoiceList.length} invoice · ${belumDibayarCount} belum dibayar`}
        action={
          <BarButton variant="primary" onClick={openAdd}>
            <Plus className="mr-1 -mt-[2px] inline w-3.5 h-3.5" />+ Invoice
          </BarButton>
        }
      />

      <div className="cu-page">
        {invoiceList.length === 0 ? (
          <div className="card-shell py-16 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Belum ada invoice
          </div>
        ) : (
          <div style={autoGrid(520)}>
            {/* Left: invoice list */}
            <section className="card-shell overflow-hidden self-start">
              <ul>
                {invoiceList.map(inv => {
                  const t = computeInvoiceTotals(inv.items, inv.diskon_persen, inv.pajak_persen)
                  const isSelected = selected?.id === inv.id
                  return (
                    <li key={inv.id} className="row-rule last:border-b-0">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedId(inv.id)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(inv.id) } }}
                        className="flex items-stretch gap-3 cursor-pointer transition-colors"
                        style={{ background: isSelected ? 'var(--surface-hover)' : 'transparent' }}
                      >
                        <span aria-hidden className="w-[4px] shrink-0" style={{ background: inv.status === 'lunas' ? palette.green : palette.red }} />
                        <div className="flex flex-1 min-w-0 items-center justify-between gap-3 py-[12px] pr-[16px]">
                          <div className="min-w-0">
                            <div className="text-[13px] font-extrabold truncate">{inv.nomor}</div>
                            <div className="truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>
                              {inv.penerima_nama} · {formatTanggal(inv.tanggal)}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="whitespace-nowrap text-[14px] font-extrabold">{formatRupiah(t.total)}</span>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); handleToggleStatus(inv) }}
                              disabled={updatingId === inv.id}
                              title="Klik untuk ubah status"
                            >
                              <StatusBadge status={inv.status} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>

            {/* Right: live preview */}
            {selected && selectedTotals && (
              <section className="card-shell" style={{ padding: 22 }}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[26px] font-extrabold tracking-[-0.02em]">INVOICE</h2>
                    <div className="whitespace-nowrap text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                      {selected.nomor} · {formatTanggal(selected.tanggal)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="label-caps" style={{ color: 'var(--text-muted)' }}>Jatuh Tempo</div>
                    <div className="whitespace-nowrap text-[13px] font-bold">
                      {selected.jatuh_tempo ? formatTanggal(selected.jatuh_tempo) : '—'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1">
                  <button
                    onClick={() => handlePrint(selected)}
                    disabled={printingId === selected.id}
                    title="Unduh PDF"
                    aria-label="Unduh invoice PDF"
                    className="flex h-7 w-7 items-center justify-center hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {printingId === selected.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => openEdit(selected)}
                    title="Edit"
                    aria-label="Edit invoice"
                    className="flex h-7 w-7 items-center justify-center hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setDelTarget(selected); setOpenDel(true) }}
                    title="Hapus"
                    aria-label="Hapus invoice"
                    className="flex h-7 w-7 items-center justify-center hover:bg-[var(--accent-100)]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-[18px]" style={autoGrid(180)}>
                  <div>
                    <div className="label-caps mb-1" style={{ color: 'var(--text-muted)' }}>Dari</div>
                    <div className="text-[13px] font-bold">{selected.penerbit_nama}</div>
                    {selected.penerbit_jabatan && <div className="text-[12px]" style={{ color: 'var(--text-2)' }}>{selected.penerbit_jabatan}</div>}
                    {selected.penerbit_instansi && <div className="text-[12px]" style={{ color: 'var(--text-2)' }}>{selected.penerbit_instansi}</div>}
                  </div>
                  <div>
                    <div className="label-caps mb-1" style={{ color: 'var(--text-muted)' }}>Kepada</div>
                    <div className="text-[13px] font-bold">{selected.penerima_nama}</div>
                    {selected.penerima_instansi && <div className="text-[12px]" style={{ color: 'var(--text-2)' }}>{selected.penerima_instansi}</div>}
                    {selected.penerima_alamat && <div className="text-[12px]" style={{ color: 'var(--text-2)' }}>{selected.penerima_alamat}</div>}
                  </div>
                </div>

                <div className="mt-[18px]">
                  <TableWrap minWidth={300}>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="px-[10px] py-[6px] text-left text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)', borderBottom: '2px solid var(--divider)' }}>Uraian</th>
                          <th className="px-[10px] py-[6px] text-right text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)', borderBottom: '2px solid var(--divider)' }}>Qty</th>
                          <th className="px-[10px] py-[6px] text-right text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)', borderBottom: '2px solid var(--divider)' }}>Harga</th>
                          <th className="px-[10px] py-[6px] text-right text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)', borderBottom: '2px solid var(--divider)' }}>Jumlah</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.items.map((it, i) => (
                          <tr key={i}>
                            <td className="px-[10px] py-[6px] text-[12.5px]" style={{ borderBottom: '1px solid var(--border-hairline)' }}>{it.uraian}</td>
                            <td className="whitespace-nowrap px-[10px] py-[6px] text-right text-[12.5px]" style={{ borderBottom: '1px solid var(--border-hairline)' }}>{it.qty}</td>
                            <td className="whitespace-nowrap px-[10px] py-[6px] text-right text-[12.5px]" style={{ borderBottom: '1px solid var(--border-hairline)' }}>{formatRupiah(it.harga_satuan)}</td>
                            <td className="whitespace-nowrap px-[10px] py-[6px] text-right text-[12.5px] font-semibold" style={{ borderBottom: '1px solid var(--border-hairline)' }}>{formatRupiah(it.qty * it.harga_satuan)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TableWrap>
                </div>

                <div className="ml-auto mt-[18px]" style={{ maxWidth: 260 }}>
                  <div className="flex justify-between py-[3px] text-[12.5px]">
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
                    <span className="whitespace-nowrap">{formatRupiah(selectedTotals.subtotal)}</span>
                  </div>
                  {selected.diskon_persen > 0 && (
                    <div className="flex justify-between py-[3px] text-[12.5px]">
                      <span style={{ color: 'var(--text-muted)' }}>Diskon ({selected.diskon_persen}%)</span>
                      <span className="whitespace-nowrap">-{formatRupiah(selectedTotals.diskonNominal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-[3px] text-[12.5px]">
                    <span style={{ color: 'var(--text-muted)' }}>Pajak {selected.pajak_persen}%</span>
                    <span className="whitespace-nowrap">{formatRupiah(selectedTotals.pajakNominal)}</span>
                  </div>
                  <div className="mt-[6px] flex items-center justify-between pt-[10px]" style={{ borderTop: '2px solid var(--divider)' }}>
                    <span className="text-[13px] font-bold">Total</span>
                    <span className="whitespace-nowrap text-[20px] font-extrabold" style={{ color: 'var(--accent)' }}>{formatRupiah(selectedTotals.total)}</span>
                  </div>
                </div>

                {selected.catatan && (
                  <div className="mt-[18px] text-[12px]" style={{ color: 'var(--text-muted)' }}>{selected.catatan}</div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">{editTarget ? 'Edit Invoice' : 'Invoice Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Nomor *</Label>
                <Input value={form.nomor} disabled className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Jatuh Tempo</Label>
              <Input type="date" value={form.jatuh_tempo} onChange={e => setForm(f => ({ ...f, jatuh_tempo: e.target.value }))} className="h-9 text-[13px]" />
            </div>

            <div className="text-[11.5px] font-semibold pt-1" style={{ color: 'var(--text-muted)' }}>Dari (Penerbit)</div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Nama *</Label>
              <Input value={form.penerbit_nama} onChange={e => setForm(f => ({ ...f, penerbit_nama: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Jabatan</Label>
                <Input value={form.penerbit_jabatan} onChange={e => setForm(f => ({ ...f, penerbit_jabatan: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Instansi</Label>
                <Input value={form.penerbit_instansi} onChange={e => setForm(f => ({ ...f, penerbit_instansi: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="text-[11.5px] font-semibold pt-1" style={{ color: 'var(--text-muted)' }}>Kepada (Penerima)</div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Nama *</Label>
              <Input value={form.penerima_nama} onChange={e => setForm(f => ({ ...f, penerima_nama: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Instansi</Label>
                <Input value={form.penerima_instansi} onChange={e => setForm(f => ({ ...f, penerima_instansi: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Alamat</Label>
                <Input value={form.penerima_alamat} onChange={e => setForm(f => ({ ...f, penerima_alamat: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="text-[11.5px] font-semibold pt-1" style={{ color: 'var(--text-muted)' }}>Item</div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--text-2)' }}>Uraian</Label>
                    <Input value={it.uraian} onChange={e => updateItem(i, { uraian: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="w-16">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--text-2)' }}>Qty</Label>
                    <Input type="number" value={it.qty} onChange={e => updateItem(i, { qty: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="w-32">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--text-2)' }}>Harga Satuan</Label>
                    <Input type="number" value={it.harga_satuan} onChange={e => updateItem(i, { harga_satuan: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItemRow(i)}
                    disabled={items.length === 1}
                    aria-label="Hapus item"
                    className="w-9 h-9 flex items-center justify-center hover:bg-[var(--accent-100)] disabled:opacity-30"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addItemRow} className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
                + Tambah Item
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Diskon (%)</Label>
                <Input type="number" value={form.diskon_persen} onChange={e => setForm(f => ({ ...f, diskon_persen: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Pajak / PPN (%)</Label>
                <Input type="number" value={form.pajak_persen} onChange={e => setForm(f => ({ ...f, pajak_persen: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="p-3 space-y-1" style={{ background: 'var(--surface-2)' }}>
              <div className="flex justify-between text-[12px]"><span style={{ color: 'var(--text-muted)' }}>Subtotal</span><span>{formatRupiah(totals.subtotal)}</span></div>
              <div className="flex justify-between text-[12px]"><span style={{ color: 'var(--text-muted)' }}>Diskon</span><span>-{formatRupiah(totals.diskonNominal)}</span></div>
              <div className="flex justify-between text-[12px]"><span style={{ color: 'var(--text-muted)' }}>Pajak</span><span>{formatRupiah(totals.pajakNominal)}</span></div>
              <div className="flex justify-between text-[13px] font-semibold pt-1" style={{ borderTop: '1px solid var(--border-hairline)' }}><span>Total</span><span>{formatRupiah(totals.total)}</span></div>
            </div>

            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--text-2)' }}>Catatan</Label>
              <Textarea placeholder="Catatan tambahan (opsional)" rows={2} value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} className="text-[13px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--accent)', color: '#fff' }}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold" style={{ color: 'var(--accent-press)' }}>Hapus Invoice</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--text-2)' }}>
            Yakin ingin menghapus invoice <strong style={{ color: 'var(--text)' }}>{delTarget?.nomor}</strong>? Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDel(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleDelete} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--accent-press)', color: '#fff' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
