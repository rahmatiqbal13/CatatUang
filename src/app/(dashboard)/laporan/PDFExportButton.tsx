'use client'

import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { DanaMasuk, Pengeluaran } from '@/lib/types'
import { LaporanGlobalPDF, LaporanDanaPDF } from '@/components/pdf/LaporanPDF'

type Props = {
  danaList: DanaMasuk[]
  pengeluaranList: Pengeluaran[]
  perKategori: { kategori: string; total: number; persen: number }[]
  perDana: (DanaMasuk & { keluar: number; pending: number; sisa: number; persen: number })[]
  selectedDana: DanaMasuk | null
  settingsMap: Record<string, string>
  totalDana: number
  totalKeluar: number
  totalPending: number
  sisaSaldo: number
}

export default function PDFExportButton({
  danaList, pengeluaranList, perKategori, perDana,
  selectedDana, settingsMap,
  totalDana, totalKeluar, totalPending, sisaSaldo,
}: Props) {
  const [loading, setLoading] = useState(false)
  const namaDirektorat = settingsMap.nama_direktorat || 'Keuangan Direktorat'

  async function handleExport() {
    setLoading(true)
    toast.loading('Memproses PDF...')
    try {
      let doc
      let filename

      if (selectedDana) {
        const approved = pengeluaranList.filter(p => p.status === 'approved')
        const persenTerpakai = Number(selectedDana.jumlah) > 0 ? (totalKeluar / Number(selectedDana.jumlah)) * 100 : 0
        doc = (
          <LaporanDanaPDF
            dana={selectedDana}
            pengeluaranList={pengeluaranList}
            perKategori={perKategori}
            totalKeluar={totalKeluar}
            totalPending={totalPending}
            sisa={sisaSaldo}
            persenTerpakai={persenTerpakai}
            namaDirektorat={namaDirektorat}
          />
        )
        filename = `Laporan_${selectedDana.nama_dana.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 7)}.pdf`
      } else {
        doc = (
          <LaporanGlobalPDF
            danaList={danaList}
            pengeluaranList={pengeluaranList}
            perKategori={perKategori}
            perDana={perDana}
            totalDana={totalDana}
            totalKeluar={totalKeluar}
            totalPending={totalPending}
            sisaSaldo={sisaSaldo}
            namaDirektorat={namaDirektorat}
          />
        )
        filename = `Laporan_Keuangan_${new Date().toISOString().slice(0, 7)}.pdf`
      }

      const blob = await pdf(doc).toBlob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.dismiss()
      toast.success('PDF berhasil diunduh')
    } catch (err) {
      console.error(err)
      toast.dismiss()
      toast.error('Gagal membuat PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleExport} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
      {loading ? 'Memproses...' : 'Export PDF'}
    </Button>
  )
}
