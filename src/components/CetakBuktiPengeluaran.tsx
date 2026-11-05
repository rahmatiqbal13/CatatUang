'use client'

import { useEffect, useState } from 'react'
import { Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { generateNomor } from '@/lib/nomorDokumen'
import { handleSupabaseError } from '@/lib/error-handler'
import { JENIS_PREFIX, downloadBuktiPdf } from '@/lib/bukti-pdf'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { useUserProfile } from '@/hooks/use-user-profile'
import type { BuktiUang, Pengeluaran } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Form = { pemberi_nama: string; pemberi_jabatan: string; penerima_nama: string; penerima_jabatan: string; keperluan: string }

/**
 * "Cetak bukti" for one pengeluaran: a serah-terima slip between the signed-in
 * user (pemberi) and whoever received the money. The slip is saved to the
 * Bukti Uang archive (so it gets an official number) and downloaded as PDF.
 * If a matching slip already exists, it is offered for reprint instead.
 */
export function CetakBuktiPengeluaran({
  pengeluaran,
  open,
  onOpenChange,
  defaultJabatan,
}: {
  pengeluaran: Pengeluaran | null
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultJabatan?: string
}) {
  const supabase = createClient()
  const { profile } = useUserProfile()
  const [form, setForm] = useState<Form | null>(null)
  const [existing, setExisting] = useState<BuktiUang | null>(null)
  const [busy, setBusy] = useState(false)

  // On open: prefill from the transaction and look for an earlier slip for it.
  const id = open ? pengeluaran?.id : undefined
  useEffect(() => {
    if (!id || !pengeluaran) return
    let active = true
    supabase
      .from('bukti_uang')
      .select('*')
      .eq('jenis', 'serah_terima')
      .eq('jumlah', pengeluaran.jumlah)
      .eq('tanggal', pengeluaran.tanggal)
      .eq('keperluan', pengeluaran.uraian)
      .order('id', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!active) return
        setExisting((data?.[0] as BuktiUang) ?? null)
        setForm({
          pemberi_nama: profile?.nama ?? '',
          pemberi_jabatan: defaultJabatan ?? '',
          penerima_nama: '',
          penerima_jabatan: '',
          keperluan: pengeluaran.uraian,
        })
      })
    return () => { active = false }
    // Re-run only when a different transaction is opened, not on every keystroke/profile tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => (f ? { ...f, [k]: e.target.value } : f))

  async function print(b: BuktiUang) {
    await downloadBuktiPdf(b)
    toast.success(`Bukti ${b.nomor} diunduh`)
    onOpenChange(false)
  }

  async function handleReprint() {
    if (!existing) return
    setBusy(true)
    try { await print(existing) } catch { toast.error('Gagal membuat PDF') } finally { setBusy(false) }
  }

  async function handleCreate() {
    if (!pengeluaran || !form) return
    if (!form.pemberi_nama.trim() || !form.penerima_nama.trim() || !form.keperluan.trim()) {
      toast.error('Nama pemberi, nama penerima, dan keperluan wajib diisi')
      return
    }
    setBusy(true)
    const payload = {
      jenis: 'serah_terima' as const,
      tanggal: pengeluaran.tanggal,
      pemberi_nama: form.pemberi_nama.trim(),
      pemberi_jabatan: form.pemberi_jabatan.trim() || null,
      penerima_nama: form.penerima_nama.trim(),
      penerima_jabatan: form.penerima_jabatan.trim() || null,
      jumlah: Number(pengeluaran.jumlah),
      keperluan: form.keperluan.trim(),
      catatan: null,
    }
    // Retry once if someone else took the number in the meantime.
    for (let attempt = 0; attempt < 2; attempt++) {
      const nomor = await generateNomor(supabase, 'serah_terima', JENIS_PREFIX.serah_terima)
      const { data, error } = await supabase.from('bukti_uang').insert({ ...payload, nomor }).select('*').single()
      if (error?.code === '23505' && attempt === 0) continue
      if (error || !data) {
        toast.error(handleSupabaseError(error))
        setBusy(false)
        return
      }
      try { await print(data as BuktiUang) } catch { toast.error('Bukti tersimpan, tetapi PDF gagal dibuat — cetak dari halaman Bukti Uang') }
      break
    }
    setBusy(false)
  }

  const field = (label: string, k: keyof Form, placeholder?: string) => (
    <div>
      <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>{label}</Label>
      <Input value={form?.[k] ?? ''} onChange={set(k)} placeholder={placeholder} className="text-[14px]" />
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cetak bukti serah terima</DialogTitle>
          {pengeluaran && (
            <DialogDescription>
              <span className="cu-mono font-semibold" style={{ color: 'var(--text)' }}>{formatRupiah(Number(pengeluaran.jumlah))}</span>
              {' · '}{formatTanggal(pengeluaran.tanggal)} · {pengeluaran.nama_dana}
            </DialogDescription>
          )}
        </DialogHeader>

        {existing && (
          <div className="flex flex-wrap items-center gap-3 rounded-[12px] px-4 py-3 text-[13px]" style={{ background: 'var(--accent-100)', color: 'var(--accent-fg)' }}>
            <span className="flex-1">
              Sudah ada bukti <b className="cu-mono">{existing.nomor}</b> untuk transaksi ini ({existing.penerima_nama}).
            </span>
            <Button variant="outline" onClick={handleReprint} disabled={busy} className="bg-[var(--surface-elev)]">
              <Printer className="h-4 w-4" /> Cetak ulang
            </Button>
          </div>
        )}

        <div className="grid gap-4 py-1 sm:grid-cols-2">
          {field('Yang menyerahkan *', 'pemberi_nama')}
          {field('Jabatan', 'pemberi_jabatan', 'cth: Bendahara')}
          {field('Yang menerima *', 'penerima_nama', 'Nama penerima uang')}
          {field('Jabatan', 'penerima_jabatan', 'cth: Teknisi')}
          <div className="sm:col-span-2">{field('Untuk keperluan *', 'keperluan')}</div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleCreate} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {existing ? 'Buat bukti baru' : 'Simpan & cetak'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
