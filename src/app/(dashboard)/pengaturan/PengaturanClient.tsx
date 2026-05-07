'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Save, Building2, DollarSign } from 'lucide-react'

type Props = { settingsMap: Record<string, string> }

export function PengaturanClient({ settingsMap }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [namaDirektorat, setNamaDirektorat] = useState(settingsMap.nama_direktorat || '')
  const [currency, setCurrency]             = useState(settingsMap.currency || 'IDR')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const updates = [
      { key: 'nama_direktorat', value: namaDirektorat },
      { key: 'currency',        value: currency },
    ]
    for (const u of updates) {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: u.key, value: u.value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (error) { toast.error(`Gagal menyimpan ${u.key}`); setSaving(false); return }
    }
    toast.success('Pengaturan berhasil disimpan')
    setSaving(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Konfigurasi sistem keuangan direktorat</p>
      </div>

      {/* Identitas Sistem */}
      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Identitas Direktorat</CardTitle>
              <CardDescription className="text-xs">Informasi yang tampil di sistem dan laporan PDF</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nama">Nama Direktorat</Label>
            <Input
              id="nama"
              placeholder="cth: Direktorat Kemahasiswaan"
              value={namaDirektorat}
              onChange={e => setNamaDirektorat(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Nama ini muncul di header sidebar dan header PDF laporan</p>
          </div>
        </CardContent>
      </Card>

      {/* Valuta */}
      <Card className="border-0 shadow-sm ring-1 ring-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Valuta</CardTitle>
              <CardDescription className="text-xs">Mata uang yang digunakan pada seluruh tampilan nominal</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>Mata Uang</Label>
            <Select value={currency} onValueChange={v => setCurrency(v ?? 'IDR')}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IDR">IDR — Rupiah Indonesia</SelectItem>
                <SelectItem value="USD">USD — Dolar Amerika</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
                <SelectItem value="SGD">SGD — Dolar Singapura</SelectItem>
                <SelectItem value="MYR">MYR — Ringgit Malaysia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2 w-full sm:w-auto">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </Button>
    </div>
  )
}
