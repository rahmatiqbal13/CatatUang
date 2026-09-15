'use client'

import { Suspense, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useBukuList } from '@/hooks/use-buku-list'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const CREATE_BUKU_VALUE = '__create__'

/**
 * "Buku {nama} ▾" outline button for the Topbar — same buku list / create-buku
 * dialog logic the old Sidebar owned, now shared across every page's Topbar.
 */
export function BukuSwitcher() {
  return (
    <Suspense fallback={<span className="h-[38px] w-[120px] shrink-0" style={{ background: 'var(--surface-2)' }} />}>
      <BukuSwitcherInner />
    </Suspense>
  )
}

function BukuSwitcherInner() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { bukuList, loadingBuku, currentBukuId, refetch } = useBukuList()

  const [openCreateBuku, setOpenCreateBuku] = useState(false)
  const [newBukuNama, setNewBukuNama] = useState('')
  const [newBukuTahun, setNewBukuTahun] = useState('')
  const [savingBuku, setSavingBuku] = useState(false)

  function handleBukuChange(value: string | null) {
    if (!value) return
    if (value === CREATE_BUKU_VALUE) {
      setNewBukuNama('')
      setNewBukuTahun('')
      setOpenCreateBuku(true)
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('buku', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  async function handleCreateBuku() {
    if (!newBukuNama.trim()) {
      toast.error('Nama buku wajib diisi')
      return
    }
    setSavingBuku(true)
    const { data, error } = await supabase
      .from('buku')
      .insert({ nama: newBukuNama.trim(), tahun: newBukuTahun ? Number(newBukuTahun) : null })
      .select('id')
      .single()
    if (error || !data) {
      toast.error('Gagal membuat buku: ' + (error?.message || 'unknown error'))
      setSavingBuku(false)
      return
    }
    toast.success('Buku dibuat')
    setSavingBuku(false)
    setOpenCreateBuku(false)
    await refetch()
    const params = new URLSearchParams(searchParams.toString())
    params.set('buku', String(data.id))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <>
      <Select
        value={currentBukuId}
        onValueChange={handleBukuChange}
        items={{
          ...Object.fromEntries(bukuList.map(b => [String(b.id), b.nama])),
          [CREATE_BUKU_VALUE]: '+ Buku Baru',
        }}
      >
        <SelectTrigger
          className="h-[38px] px-3 text-[13px] font-bold"
          style={{ background: 'var(--surface)', border: '1px solid var(--divider)' }}
          disabled={loadingBuku}
        >
          <SelectValue placeholder={loadingBuku ? 'Memuat…' : 'Pilih buku'} />
        </SelectTrigger>
        <SelectContent>
          {bukuList.map(b => (
            <SelectItem key={b.id} value={String(b.id)}>{b.nama}</SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={CREATE_BUKU_VALUE}>+ Buku Baru</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={openCreateBuku} onOpenChange={setOpenCreateBuku}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-extrabold">Buku Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Nama Buku *</Label>
              <Input placeholder="cth: 2027" value={newBukuNama} onChange={e => setNewBukuNama(e.target.value)} className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="label-caps mb-1 block" style={{ color: 'var(--text-2)' }}>Tahun</Label>
              <Input type="number" placeholder="2027" value={newBukuTahun} onChange={e => setNewBukuTahun(e.target.value)} className="h-9 text-[13px]" />
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Opsional — dipakai untuk urutan buku di pemilih.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenCreateBuku(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleCreateBuku} disabled={savingBuku} className="h-8 text-[12px]" style={{ background: 'var(--accent)', color: '#fff' }}>
              {savingBuku ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
