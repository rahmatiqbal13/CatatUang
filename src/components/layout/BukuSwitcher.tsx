'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useBukuList } from '@/hooks/use-buku-list'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Buku } from '@/lib/types'

const bukuSub = (b: Buku) => (b.tahun ? `Jan – Des ${b.tahun}` : 'Buku anggaran')

/** Push ?buku= onto the current route. */
function useSwitchBuku() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  return (id: number | string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('buku', String(id))
    router.push(`${pathname}?${params.toString()}`)
  }
}

/** Sidebar "Buku aktif" card that expands into the buku list + "Buku baru". */
export function BukuCard() {
  const { bukuList, loadingBuku, currentBukuId, currentBuku, refetch } = useBukuList()
  const switchBuku = useSwitchBuku()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  return (
    <div className="mr-4 shrink-0 overflow-hidden rounded-[14px] border border-[rgba(24,36,30,0.10)] bg-[var(--surface-hover)]">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-[10px] px-4 py-[14px] text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="label-caps text-[10px]" style={{ color: 'var(--text-muted)' }}>Buku aktif</div>
          <div className="serif mt-1 truncate text-[23px]">{loadingBuku ? 'Memuat…' : currentBuku?.nama ?? 'Belum ada buku'}</div>
          {currentBuku && <div className="mt-[2px] text-[12px]" style={{ color: 'var(--text-muted)' }}>{bukuSub(currentBuku)}</div>}
        </div>
        <ChevronDown size={16} strokeWidth={2} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-[2px] border-t border-[rgba(24,36,30,0.08)] p-[6px]">
          {bukuList.map(b => (
            <button
              key={b.id}
              onClick={() => { setOpen(false); switchBuku(b.id) }}
              className="flex justify-between rounded-[9px] px-[10px] py-[9px] text-left text-[13.5px] hover:bg-[var(--surface-2)]"
              style={{ background: String(b.id) === currentBukuId ? 'var(--surface-2)' : 'transparent' }}
            >
              <span>{b.nama}</span>
              {b.tahun && <span className="cu-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{b.tahun}</span>}
            </button>
          ))}
          <button
            onClick={() => setCreating(true)}
            className="rounded-[9px] px-[10px] py-[9px] text-left text-[13.5px] font-semibold"
            style={{ color: 'var(--brand)' }}
          >
            + Buku baru
          </button>
        </div>
      )}
      <CreateBukuDialog open={creating} onOpenChange={setCreating} onCreated={async id => { setOpen(false); await refetch(); switchBuku(id) }} />
    </div>
  )
}

/** Mobile header pill — "2026 ▾" — that opens the buku sheet. */
export function BukuPill() {
  const { bukuList, currentBukuId, currentBuku, refetch } = useBukuList()
  const switchBuku = useSwitchBuku()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="cu-mono flex min-h-9 shrink-0 items-center gap-[6px] rounded-full px-[14px] py-2 text-[12px] font-semibold whitespace-nowrap"
        style={{ background: 'var(--surface-2)' }}
      >
        {currentBuku?.nama ?? 'Buku'} ▾
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title="Buku anggaran">
          {bukuList.map(b => (
            <button
              key={b.id}
              onClick={() => { setOpen(false); switchBuku(b.id) }}
              className="flex min-h-[60px] w-full items-center gap-[10px] border-t py-[14px] text-left"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              <span className="flex-1">
                <span className="serif block text-[22px]">{b.nama}</span>
                <span className="block text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{bukuSub(b)}</span>
              </span>
              {String(b.id) === currentBukuId && (
                <span className="cu-mono rounded-full px-[10px] py-1 text-[11px] font-semibold" style={{ background: 'var(--accent-100)', color: 'var(--brand)' }}>AKTIF</span>
              )}
            </button>
          ))}
          <button
            onClick={() => setCreating(true)}
            className="mt-[10px] min-h-12 w-full rounded-full text-[14px] font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--surface-elev)' }}
          >
            + Buku baru
          </button>
        </SheetContent>
      </Sheet>
      <CreateBukuDialog open={creating} onOpenChange={setCreating} onCreated={async id => { setOpen(false); await refetch(); switchBuku(id) }} />
    </>
  )
}

function CreateBukuDialog({
  open,
  onOpenChange,
  onCreated,
}: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (id: number) => void }) {
  const supabase = createClient()
  const [nama, setNama] = useState('')
  const [tahun, setTahun] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!nama.trim()) {
      toast.error('Nama buku wajib diisi')
      return
    }
    setSaving(true)
    const { data, error } = await supabase
      .from('buku')
      .insert({ nama: nama.trim(), tahun: tahun ? Number(tahun) : null })
      .select('id')
      .single()
    setSaving(false)
    if (error || !data) {
      toast.error('Gagal membuat buku: ' + (error?.message || 'unknown error'))
      return
    }
    toast.success('Buku dibuat')
    setNama('')
    setTahun('')
    onOpenChange(false)
    onCreated(data.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Buku baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div>
            <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Nama buku *</Label>
            <Input placeholder="cth: 2027" value={nama} onChange={e => setNama(e.target.value)} />
          </div>
          <div>
            <Label className="mb-[7px] block text-[12.5px] font-semibold" style={{ color: 'var(--text-2)' }}>Tahun</Label>
            <Input type="number" placeholder="2027" value={tahun} onChange={e => setTahun(e.target.value)} />
            <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Opsional — dipakai untuk urutan buku di pemilih.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
