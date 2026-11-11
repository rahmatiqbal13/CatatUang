'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Printer, Search, Store, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { handleSupabaseError } from '@/lib/error-handler'
import { formatRupiah } from '@/lib/formatters'
import { METODE_BAYAR, SATUAN, generateNomorNota, subtotalItems } from '@/lib/nota'
import { useUserProfile } from '@/hooks/use-user-profile'
import type { Nota, NotaItem, Toko } from '@/lib/types'
import { Topbar, BarButton } from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Props = { notaList: Nota[]; tokoList: Toko[] }

const todayIso = () => new Date().toISOString().split('T')[0]
const labelCls = 'mb-[7px] block text-[12.5px] font-semibold'

type ItemDraft = { nama: string; satuan: string; qty: string; harga: string }
type NotaForm = {
  nomor: string; toko_id: string; tanggal: string; kasir: string
  items: ItemDraft[]; diskon: string; metode: string; bayar: string; catatan: string
}
const emptyItem: ItemDraft = { nama: '', satuan: 'PCS', qty: '1', harga: '' }

const toItems = (drafts: ItemDraft[]): NotaItem[] =>
  drafts
    .filter(d => d.nama.trim())
    .map(d => ({
      nama: d.nama.trim(),
      ...(d.satuan.trim() ? { satuan: d.satuan.trim().toUpperCase() } : {}),
      qty: Number(d.qty) || 0,
      harga: Math.round(Number(d.harga) || 0),
    }))

export function NotaClient({ notaList, tokoList }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { profile } = useUserProfile()
  const tokoById = useMemo(() => new Map(tokoList.map(t => [t.id, t])), [tokoList])

  const [filterToko, setFilterToko] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')

  const [form, setForm] = useState<NotaForm | null>(null)
  const [editTarget, setEditTarget] = useState<Nota | null>(null)
  const [saving, setSaving] = useState(false)
  const [delTarget, setDelTarget] = useState<Nota | null>(null)
  const [openToko, setOpenToko] = useState(false)

  const filtered = notaList.filter(n => {
    if (filterToko !== 'all' && n.toko_id !== filterToko) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [n.nomor, n.kasir ?? '', n.pelanggan ?? '', tokoById.get(n.toko_id)?.nama ?? '', ...n.items.map(i => i.nama)]
      .some(v => v.toLowerCase().includes(q))
  })
  const totalFiltered = filtered.reduce((s, n) => s + Number(n.total), 0)

  async function openAdd() {
    setEditTarget(null)
    const nomor = await generateNomorNota(supabase)
    const lastToko = filterToko !== 'all' ? filterToko : (notaList[0]?.toko_id ?? tokoList[0]?.id)
    setForm({
      nomor, toko_id: lastToko ? String(lastToko) : '', tanggal: todayIso(), kasir: profile?.nama ?? '',
      items: [{ ...emptyItem }], diskon: '', metode: 'Tunai', bayar: '', catatan: '',
    })
  }

  function openEdit(n: Nota) {
    setEditTarget(n)
    setForm({
      nomor: n.nomor, toko_id: String(n.toko_id), tanggal: n.tanggal, kasir: n.kasir ?? '',
      items: n.items.length ? n.items.map(i => ({ nama: i.nama, satuan: i.satuan ?? '', qty: String(i.qty), harga: String(i.harga) })) : [{ ...emptyItem }],
      diskon: n.diskon ? String(n.diskon) : '', metode: n.metode, bayar: n.bayar != null ? String(n.bayar) : '', catatan: n.catatan ?? '',
    })
  }

  const items = form ? toItems(form.items) : []
  const subtotal = subtotalItems(items)
  const diskon = Math.round(Number(form?.diskon) || 0)
  const total = Math.max(0, subtotal - diskon)
  const bayar = form?.bayar ? Math.round(Number(form.bayar)) : null

  const setItem = (i: number, patch: Partial<ItemDraft>) =>
    setForm(f => f && { ...f, items: f.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) })

  async function handleSave(andPrint: boolean) {
    if (!form) return
    if (!form.toko_id || !form.tanggal) { toast.error('Toko dan tanggal wajib diisi'); return }
    if (items.length === 0) { toast.error('Tambahkan minimal satu item'); return }
    if (items.some(i => i.qty <= 0 || i.harga < 0)) { toast.error('Jumlah item harus lebih dari 0 dan harga tidak boleh negatif'); return }
    if (diskon > subtotal) { toast.error('Diskon melebihi subtotal'); return }
    if (bayar != null && bayar < total) { toast.error('Uang dibayar kurang dari total'); return }

    setSaving(true)
    const payload = {
      toko_id: Number(form.toko_id),
      tanggal: form.tanggal,
      kasir: form.kasir.trim() || null,
      items,
      diskon,
      total,
      metode: form.metode,
      bayar,
      catatan: form.catatan.trim() || null,
      updated_at: new Date().toISOString(),
    }

    let id = editTarget?.id
    if (editTarget) {
      const { error } = await supabase.from('nota').update(payload).eq('id', editTarget.id)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
    } else {
      let nomor = form.nomor
      for (let attempt = 0; ; attempt++) {
        const { data, error } = await supabase.from('nota').insert({ ...payload, nomor }).select('id').single()
        if (error?.code === '23505' && attempt === 0) {
          // Someone else took this number meanwhile — take the next free one.
          nomor = await generateNomorNota(supabase)
          continue
        }
        if (error || !data) { toast.error(handleSupabaseError(error)); setSaving(false); return }
        id = data.id
        if (nomor !== form.nomor) toast.info(`Nomor ${form.nomor} sudah terpakai, nota disimpan sebagai ${nomor}`)
        break
      }
    }

    toast.success(editTarget ? 'Nota diperbarui' : 'Nota disimpan')
    setSaving(false)
    setForm(null)
    router.refresh()
    if (andPrint && id) window.open(`/cetak/nota/${id}`, '_blank')
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from('nota').delete().eq('id', delTarget.id)
    setSaving(false)
    if (error) { toast.error(handleSupabaseError(error)); return }
    toast.success('Nota dihapus')
    setDelTarget(null)
    router.refresh()
  }

  return (
    <div className="animate-fade-in">
      <Topbar
        crumb="Toko / Nota"
        title="Nota"
        subtitle={`${notaList.length} nota · ${tokoList.length} toko`}
        action={
          <>
            <BarButton variant="outline" onClick={() => setOpenToko(true)}>
              <Store className="h-4 w-4" /> Kelola toko
            </BarButton>
            <BarButton variant="primary" onClick={openAdd} disabled={tokoList.length === 0}>
              <Plus className="h-4 w-4" /> Nota baru
            </BarButton>
          </>
        }
      />

      <div className="cu-page">
        {tokoList.length === 0 ? (
          <div className="card-shell flex flex-col items-center gap-4 px-6 py-14 text-center">
            <p className="serif text-[22px] italic" style={{ color: 'var(--text-2)' }}>Belum ada toko.</p>
            <p className="max-w-sm text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
              Tambahkan profil toko dulu — nama, alamat, dan telepon toko akan tampil di kepala nota.
            </p>
            <BarButton variant="primary" onClick={() => setOpenToko(true)}><Plus className="h-4 w-4" /> Tambah toko</BarButton>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-[10px]">
              {[{ id: 'all' as const, nama: 'Semua toko' }, ...tokoList].map(t => {
                const active = filterToko === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setFilterToko(t.id)}
                    className="inline-flex min-h-[38px] items-center rounded-full px-[14px] py-2 text-[13px] font-semibold whitespace-nowrap"
                    style={{
                      background: active ? 'var(--accent-100)' : 'transparent',
                      color: active ? 'var(--brand)' : 'var(--text)',
                      border: active ? '1px solid #9DBBA8' : '1px solid var(--border-dashed)',
                    }}
                  >
                    {t.nama}
                  </button>
                )
              })}
              <span className="flex-[1_1_0]" />
              <div
                className="flex h-[42px] max-w-[320px] flex-[1_1_220px] items-center gap-2 rounded-full px-[14px] focus-within:border-[var(--brand)]"
                style={{ border: '1px solid var(--divider)', background: 'var(--surface)' }}
              >
                <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <input
                  className="flex-1 bg-transparent text-[14px] outline-none"
                  placeholder="Cari nomor, kasir, item"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="label-caps -mt-2 text-[11.5px] tracking-[.12em]" style={{ color: 'var(--text-muted)' }}>
              {filtered.length} nota · {formatRupiah(totalFiltered)}
            </div>

            <section className="card-shell px-6 py-1">
              {filtered.length === 0 ? (
                <div className="serif py-10 text-center text-[19px] italic" style={{ color: 'var(--text-2)' }}>
                  {notaList.length ? 'Tidak ada nota yang cocok.' : 'Belum ada nota.'}
                </div>
              ) : (
                filtered.map(n => {
                  const d = new Date(n.tanggal)
                  const toko = tokoById.get(n.toko_id)
                  return (
                    <div key={n.id} className="row-rule flex flex-wrap items-center gap-x-4 gap-y-[10px] py-4 last:border-b-0">
                      <div className="w-[42px] shrink-0 text-center">
                        <div className="serif text-[24px] leading-none">{d.getDate()}</div>
                        <div className="cu-mono mt-[3px] text-[10px] tracking-[.1em] uppercase" style={{ color: 'var(--text-muted)' }}>
                          {d.toLocaleDateString('id-ID', { month: 'short' }).replace('.', '')}
                        </div>
                      </div>
                      <div className="min-w-0 flex-[1_1_200px]">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="cu-mono text-[13px] font-semibold">{n.nomor}</span>
                        </div>
                        <div className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                          {toko?.nama ?? '—'} · {n.items.length} item · {n.metode}{n.kasir ? ` · Kasir ${n.kasir}` : ''}
                        </div>
                      </div>
                      <span className="cu-mono ml-auto min-w-[130px] text-right text-[15px] font-semibold whitespace-nowrap">
                        {formatRupiah(Number(n.total))}
                      </span>
                      <div className="flex items-center gap-[6px]">
                        <a
                          href={`/cetak/nota/${n.id}`}
                          target="_blank"
                          rel="noopener"
                          className="inline-flex h-[34px] items-center gap-[6px] rounded-full px-3 text-[13px] font-semibold"
                          style={{ background: 'var(--accent-100)', color: 'var(--accent-fg)' }}
                        >
                          <Printer className="h-4 w-4" /> Cetak
                        </a>
                        <button
                          onClick={() => openEdit(n)}
                          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface-2)]"
                          style={{ color: 'var(--text-muted)' }}
                          title="Edit"
                          aria-label={`Edit ${n.nomor}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDelTarget(n)}
                          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--danger-soft)]"
                          style={{ color: 'var(--text-muted)' }}
                          title="Hapus"
                          aria-label={`Hapus ${n.nomor}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </section>
          </>
        )}
      </div>

      {/* Form nota */}
      <Dialog open={form !== null} onOpenChange={o => { if (!o) setForm(null) }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit nota' : 'Nota baru'}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className={labelCls} style={{ color: 'var(--text-2)' }}>Nomor</Label>
                  <Input value={form.nomor} disabled className="cu-mono text-[14px]" />
                </div>
                <div>
                  <Label className={labelCls} style={{ color: 'var(--text-2)' }}>Toko *</Label>
                  <Select
                    value={form.toko_id}
                    onValueChange={v => setForm(f => f && { ...f, toko_id: v ?? '' })}
                    items={Object.fromEntries(tokoList.map(t => [String(t.id), t.nama]))}
                  >
                    <SelectTrigger className="w-full text-[14px]"><SelectValue placeholder="Pilih toko" /></SelectTrigger>
                    <SelectContent>{tokoList.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nama}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={labelCls} style={{ color: 'var(--text-2)' }}>Tanggal *</Label>
                  <Input type="date" value={form.tanggal} onChange={e => setForm(f => f && { ...f, tanggal: e.target.value })} className="text-[14px]" />
                </div>
              </div>

              <div>
                <Label className={labelCls} style={{ color: 'var(--text-2)' }}>Kasir</Label>
                <Input value={form.kasir} onChange={e => setForm(f => f && { ...f, kasir: e.target.value })} placeholder="Nama yang melayani — opsional" className="text-[14px]" />
              </div>

              {/* Items */}
              <div>
                <div className="mb-2 flex items-center gap-[10px]">
                  <span className="label-caps whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>Item</span>
                  <span className="h-px flex-1" style={{ background: 'var(--divider)' }} />
                </div>
                <div className="hidden grid-cols-[1fr_64px_80px_120px_110px_32px] gap-2 px-1 pb-1 text-[11.5px] sm:grid" style={{ color: 'var(--text-muted)' }}>
                  <span>Nama item</span><span>Qty</span><span>Satuan</span><span>Harga</span><span className="text-right">Subtotal</span><span />
                </div>
                <datalist id="nota-satuan">{SATUAN.map(u => <option key={u} value={u} />)}</datalist>
                <div className="flex flex-col gap-3 sm:gap-2">
                  {form.items.map((it, i) => (
                    <div key={i} className="grid grid-cols-[64px_80px_1fr_32px] gap-2 sm:grid-cols-[1fr_64px_80px_120px_110px_32px] sm:items-center">
                      <Input value={it.nama} onChange={e => setItem(i, { nama: e.target.value })} placeholder="Nama item" className="col-span-3 text-[14px] sm:col-span-1" />
                      <button
                        onClick={() => setForm(f => f && { ...f, items: f.items.length > 1 ? f.items.filter((_, j) => j !== i) : [{ ...emptyItem }] })}
                        className="flex h-11 w-8 items-center justify-center rounded-full hover:bg-[var(--danger-soft)] sm:order-last"
                        style={{ color: 'var(--text-muted)' }}
                        aria-label="Hapus item"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <Input type="number" inputMode="decimal" min={0} value={it.qty} onChange={e => setItem(i, { qty: e.target.value })} className="text-[14px]" aria-label="Qty" />
                      <Input list="nota-satuan" value={it.satuan} onChange={e => setItem(i, { satuan: e.target.value })} placeholder="PCS" className="text-[14px] uppercase" aria-label="Satuan" />
                      <Input type="number" inputMode="numeric" min={0} value={it.harga} onChange={e => setItem(i, { harga: e.target.value })} placeholder="Harga" className="col-span-2 text-[14px] sm:col-span-1" aria-label="Harga" />
                      <span className="cu-mono hidden text-right text-[13.5px] font-semibold sm:block">
                        {formatRupiah((Number(it.qty) || 0) * (Number(it.harga) || 0))}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setForm(f => f && { ...f, items: [...f.items, { ...emptyItem }] })}
                  className="mt-2 text-[13.5px] font-semibold"
                  style={{ color: 'var(--brand)' }}
                >
                  + Tambah item
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className={labelCls} style={{ color: 'var(--text-2)' }}>Diskon (Rp)</Label>
                  <Input type="number" inputMode="numeric" min={0} value={form.diskon} onChange={e => setForm(f => f && { ...f, diskon: e.target.value })} placeholder="0" className="text-[14px]" />
                </div>
                <div>
                  <Label className={labelCls} style={{ color: 'var(--text-2)' }}>Metode bayar</Label>
                  <Select value={form.metode} onValueChange={v => setForm(f => f && { ...f, metode: v ?? 'Tunai' })}>
                    <SelectTrigger className="w-full text-[14px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{METODE_BAYAR.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={labelCls} style={{ color: 'var(--text-2)' }}>Uang dibayar (Rp)</Label>
                  <Input type="number" inputMode="numeric" min={0} value={form.bayar} onChange={e => setForm(f => f && { ...f, bayar: e.target.value })} placeholder="Opsional" className="text-[14px]" />
                </div>
              </div>

              <div>
                <Label className={labelCls} style={{ color: 'var(--text-2)' }}>Catatan</Label>
                <Textarea value={form.catatan} onChange={e => setForm(f => f && { ...f, catatan: e.target.value })} placeholder="Opsional — tampil di nota" rows={2} className="text-[14px]" />
              </div>

              <div className="rule-dashed flex flex-col gap-1 pt-4 text-[13.5px]">
                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Subtotal</span><span className="cu-mono">{formatRupiah(subtotal)}</span></div>
                {diskon > 0 && <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Diskon</span><span className="cu-mono">−{formatRupiah(diskon)}</span></div>}
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="serif text-[28px] tracking-[-0.02em]">{formatRupiah(total)}</span>
                </div>
                {bayar != null && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Kembalian</span>
                    <span className="cu-mono" style={{ color: bayar < total ? 'var(--danger)' : undefined }}>{formatRupiah(bayar - total)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setForm(null)}>Batal</Button>
            <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>Simpan</Button>
            <Button onClick={() => handleSave(true)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Simpan & cetak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hapus nota */}
      <Dialog open={delTarget !== null} onOpenChange={o => { if (!o) setDelTarget(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--danger)' }}>Hapus nota</DialogTitle>
          </DialogHeader>
          <p className="text-[13.5px]" style={{ color: 'var(--text-2)' }}>
            Hapus nota <b className="cu-mono" style={{ color: 'var(--text)' }}>{delTarget?.nomor}</b>? Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDelTarget(null)}>Batal</Button>
            <Button onClick={handleDelete} disabled={saving} style={{ background: 'var(--danger)', color: 'var(--surface-elev)' }}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TokoDialog open={openToko} onOpenChange={setOpenToko} tokoList={tokoList} notaList={notaList} />
    </div>
  )
}

type TokoForm = { nama: string; alamat: string; telepon: string; catatan_kaki: string }
const emptyToko: TokoForm = { nama: '', alamat: '', telepon: '', catatan_kaki: 'Terima kasih atas kunjungan Anda' }

/** List + add/edit/delete of store profiles. A store with notes can't be deleted. */
function TokoDialog({
  open, onOpenChange, tokoList, notaList,
}: { open: boolean; onOpenChange: (o: boolean) => void; tokoList: Toko[]; notaList: Nota[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [editing, setEditing] = useState<{ id: number | null; form: TokoForm } | null>(null)
  const [saving, setSaving] = useState(false)

  const notaCount = (id: number) => notaList.filter(n => n.toko_id === id).length
  const set = (k: keyof TokoForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEditing(ed => ed && { ...ed, form: { ...ed.form, [k]: e.target.value } })

  async function save() {
    if (!editing) return
    if (!editing.form.nama.trim()) { toast.error('Nama toko wajib diisi'); return }
    setSaving(true)
    const payload = {
      nama: editing.form.nama.trim(),
      alamat: editing.form.alamat.trim() || null,
      telepon: editing.form.telepon.trim() || null,
      catatan_kaki: editing.form.catatan_kaki.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = editing.id
      ? await supabase.from('toko').update(payload).eq('id', editing.id)
      : await supabase.from('toko').insert(payload)
    setSaving(false)
    if (error) { toast.error(handleSupabaseError(error)); return }
    toast.success(editing.id ? 'Toko diperbarui' : 'Toko ditambahkan')
    setEditing(null)
    router.refresh()
  }

  async function remove(t: Toko) {
    if (!confirm(`Hapus toko "${t.nama}"?`)) return
    const { error } = await supabase.from('toko').delete().eq('id', t.id)
    if (error) { toast.error(handleSupabaseError(error)); return }
    toast.success('Toko dihapus')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) setEditing(null) }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? (editing.id ? 'Edit toko' : 'Toko baru') : 'Kelola toko'}</DialogTitle>
        </DialogHeader>

        {editing ? (
          <div className="flex flex-col gap-4">
            <div>
              <Label className={labelCls} style={{ color: 'var(--text-2)' }}>Nama toko *</Label>
              <Input value={editing.form.nama} onChange={set('nama')} placeholder="cth: Kantin Kolam USC" className="text-[14px]" />
            </div>
            <div>
              <Label className={labelCls} style={{ color: 'var(--text-2)' }}>Alamat</Label>
              <Textarea value={editing.form.alamat} onChange={set('alamat')} rows={2} className="text-[14px]" />
            </div>
            <div>
              <Label className={labelCls} style={{ color: 'var(--text-2)' }}>Telepon / WhatsApp</Label>
              <Input value={editing.form.telepon} onChange={set('telepon')} className="text-[14px]" />
            </div>
            <div>
              <Label className={labelCls} style={{ color: 'var(--text-2)' }}>Catatan kaki nota</Label>
              <Input value={editing.form.catatan_kaki} onChange={set('catatan_kaki')} className="text-[14px]" />
            </div>
          </div>
        ) : (
          <div>
            {tokoList.map(t => {
              const used = notaCount(t.id)
              return (
                <div key={t.id} className="flex items-center gap-3 border-t py-[14px]" style={{ borderColor: 'var(--border-hairline)' }}>
                  <div className="min-w-0 flex-1">
                    <div className="serif text-[21px]">{t.nama}</div>
                    <div className="truncate text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
                      {[t.alamat, t.telepon].filter(Boolean).join(' · ') || 'Belum ada alamat'} · {used} nota
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing({ id: t.id, form: { nama: t.nama, alamat: t.alamat ?? '', telepon: t.telepon ?? '', catatan_kaki: t.catatan_kaki ?? '' } })}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--surface-2)]"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label={`Edit ${t.nama}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(t)}
                    disabled={used > 0}
                    title={used > 0 ? 'Toko masih dipakai di nota' : 'Hapus'}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--danger-soft)]"
                    style={{ color: 'var(--text-muted)' }}
                    aria-label={`Hapus ${t.nama}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
            <button
              onClick={() => setEditing({ id: null, form: emptyToko })}
              className="mt-2 min-h-11 w-full rounded-full text-[14px] font-semibold"
              style={{ background: 'var(--accent)', color: 'var(--surface-elev)' }}
            >
              + Tambah toko
            </button>
          </div>
        )}

        {editing && (
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Kembali</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
