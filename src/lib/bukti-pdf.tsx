import { pdf } from '@react-pdf/renderer'
import { BuktiUangPDF } from '@/components/pdf/BuktiUangPDF'
import type { BuktiUang, JenisBuktiUang } from '@/lib/types'

export const JENIS_PREFIX: Record<JenisBuktiUang, string> = {
  penerimaan: 'BPU',
  serah_terima: 'BSTU',
}

/** Render a bukti to PDF and hand it to the browser as a download. */
export async function downloadBuktiPdf(b: BuktiUang) {
  const blob = await pdf(<BuktiUangPDF bukti={b} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${JENIS_PREFIX[b.jenis]}_${b.nomor.replace(/\//g, '-')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
