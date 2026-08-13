import * as XLSX from 'xlsx'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import type { DanaMasukWithSaldo, Pengeluaran } from '@/lib/types'

/**
 * Export data ke file Excel
 * Mendukung format .xlsx dan .csv
 */

export type ExportFormat = 'xlsx' | 'csv'

interface ExportOptions {
  filename?: string
  sheetName?: string
  format?: ExportFormat
}

/**
 * Export array of objects ke Excel
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  options: ExportOptions = {}
): void {
  const {
    filename = 'export',
    sheetName = 'Data',
    format = 'xlsx',
  } = options

  if (data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data)

  // Set column widths (auto-width based on content)
  const colWidths = calculateColumnWidths(data)
  ws['!cols'] = colWidths

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Generate file
  const fileExtension = format === 'csv' ? 'csv' : 'xlsx'
  const mimeType = format === 'csv' 
    ? 'text/csv;charset=utf-8'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

  const wbout = XLSX.write(wb, { bookType: format, type: 'array' })
  const blob = new Blob([wbout], { type: mimeType })

  // Download
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${formatDateForFile(new Date())}.${fileExtension}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Export Dana Masuk ke Excel
 */
export function exportDanaMasuk(
  danaList: DanaMasukWithSaldo[],
  filename?: string
): void {
  const data = danaList.map((dana, index) => ({
    'No': index + 1,
    'Nama Dana': dana.nama_dana,
    'Jumlah': Number(dana.jumlah),
    'Jumlah (Formatted)': formatRupiah(Number(dana.jumlah)),
    'Tanggal': formatTanggal(dana.tanggal),
    'Sumber': dana.sumber,
    'Keterangan': dana.keterangan || '-',
    'Dibuat': formatTanggal(dana.created_at),
  }))

  exportToExcel(data, {
    filename: filename || 'dana_masuk',
    sheetName: 'Dana Masuk',
  })
}

/**
 * Export Pengeluaran ke Excel
 */
export function exportPengeluaran(
  pengeluaranList: Pengeluaran[],
  filename?: string
): void {
  const statusMap: Record<string, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
  }

  const data = pengeluaranList.map((p, index) => ({
    'No': index + 1,
    'Tanggal': formatTanggal(p.tanggal),
    'Nama Dana': p.nama_dana,
    'Uraian': p.uraian,
    'Kategori': p.kategori,
    'Jumlah': Number(p.jumlah),
    'Jumlah (Formatted)': formatRupiah(Number(p.jumlah)),
    'Status': statusMap[p.status] || p.status,
    'Keterangan': p.keterangan || '-',
    'Dibuat': formatTanggal(p.created_at),
  }))

  exportToExcel(data, {
    filename: filename || 'pengeluaran',
    sheetName: 'Pengeluaran',
  })
}

/**
 * Export Laporan Lengkap dengan multiple sheets
 */
export function exportLaporanLengkap(
  danaList: DanaMasukWithSaldo[],
  pengeluaranList: Pengeluaran[],
  filename?: string
): void {
  // Sheet 1: Ringkasan
  const totalDana = danaList.reduce((sum, d) => sum + Number(d.jumlah), 0)
  const approvedPengeluaran = pengeluaranList.filter(p => p.status === 'approved')
  const totalPengeluaran = approvedPengeluaran.reduce((sum, p) => sum + Number(p.jumlah), 0)
  const sisaSaldo = totalDana - totalPengeluaran

  const ringkasanData = [
    { 'Keterangan': 'Total Dana Masuk', 'Nilai': totalDana, 'Formatted': formatRupiah(totalDana) },
    { 'Keterangan': 'Total Pengeluaran (Approved)', 'Nilai': totalPengeluaran, 'Formatted': formatRupiah(totalPengeluaran) },
    { 'Keterangan': 'Sisa Saldo', 'Nilai': sisaSaldo, 'Formatted': formatRupiah(sisaSaldo) },
    { 'Keterangan': 'Jumlah Dana', 'Nilai': danaList.length, 'Formatted': `${danaList.length} dana` },
    { 'Keterangan': 'Jumlah Pengeluaran', 'Nilai': pengeluaranList.length, 'Formatted': `${pengeluaranList.length} transaksi` },
  ]

  // Sheet 2: Dana Masuk
  const danaData = danaList.map((dana, index) => ({
    'No': index + 1,
    'Nama Dana': dana.nama_dana,
    'Jumlah': Number(dana.jumlah),
    'Jumlah (Formatted)': formatRupiah(Number(dana.jumlah)),
    'Tanggal': formatTanggal(dana.tanggal),
    'Sumber': dana.sumber,
    'Keterangan': dana.keterangan || '-',
  }))

  // Sheet 3: Pengeluaran
  const statusMap: Record<string, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
  }

  const pengeluaranData = pengeluaranList.map((p, index) => ({
    'No': index + 1,
    'Tanggal': formatTanggal(p.tanggal),
    'Nama Dana': p.nama_dana,
    'Uraian': p.uraian,
    'Kategori': p.kategori,
    'Jumlah': Number(p.jumlah),
    'Jumlah (Formatted)': formatRupiah(Number(p.jumlah)),
    'Status': statusMap[p.status] || p.status,
    'Keterangan': p.keterangan || '-',
  }))

  // Create workbook with multiple sheets
  const wb = XLSX.utils.book_new()

  // Add sheets
  const wsRingkasan = XLSX.utils.json_to_sheet(ringkasanData)
  const wsDana = XLSX.utils.json_to_sheet(danaData)
  const wsPengeluaran = XLSX.utils.json_to_sheet(pengeluaranData)

  // Set column widths
  wsRingkasan['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }]
  wsDana['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 30 }]
  wsPengeluaran['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 12 }, { wch: 30 }]

  XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan')
  XLSX.utils.book_append_sheet(wb, wsDana, 'Dana Masuk')
  XLSX.utils.book_append_sheet(wb, wsPengeluaran, 'Pengeluaran')

  // Download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename || 'laporan_keuangan'}_${formatDateForFile(new Date())}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Calculate optimal column widths based on content
 */
function calculateColumnWidths<T extends Record<string, any>>(data: T[]): { wch: number }[] {
  if (data.length === 0) return []

  const keys = Object.keys(data[0])
  return keys.map(key => {
    const maxContentLength = Math.max(
      key.length,
      ...data.map(row => {
        const value = row[key]
        return value ? String(value).length : 0
      })
    )
    // Add some padding and limit max width
    return { wch: Math.min(maxContentLength + 2, 50) }
  })
}

/**
 * Format date untuk filename
 */
function formatDateForFile(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Convert table element ke Excel
 * Useful untuk export tabel yang sudah dirender
 */
export function exportTableToExcel(
  tableElement: HTMLTableElement,
  filename?: string
): void {
  const wb = XLSX.utils.table_to_book(tableElement, { sheet: 'Data' })
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename || 'export'}_${formatDateForFile(new Date())}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
