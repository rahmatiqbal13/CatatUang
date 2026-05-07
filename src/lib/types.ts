export type DanaMasuk = {
  id: number
  nama_dana: string
  jumlah: number
  tanggal: string
  sumber: string
  keterangan: string | null
  created_at: string
  updated_at: string
}

export type StatusPengeluaran = 'pending' | 'approved' | 'rejected'

export type Pengeluaran = {
  id: number
  dana_id: number
  nama_dana: string
  uraian: string
  kategori: string
  jumlah: number
  tanggal: string
  keterangan: string | null
  status: StatusPengeluaran
  approved_at: string | null
  created_at: string
  updated_at: string
}

export type Kategori = {
  id: number
  nama: string
  created_at: string
}

export type SumberDana = {
  id: number
  nama: string
  created_at: string
}

export type Setting = {
  id: number
  key: string
  value: string | null
  updated_at: string
}

export type ActivityLog = {
  id: number
  aksi: string
  keterangan: string | null
  entity_type: string | null
  entity_id: number | null
  created_at: string
}

export type RingkasanDana = {
  dana: DanaMasuk
  totalKeluar: number
  totalPending: number
  sisa: number
  persenTerpakai: number
}

export type RingkasanGlobal = {
  totalDana: number
  totalKeluar: number
  totalPending: number
  sisaSaldo: number
  jumlahDana: number
}

export type PerKategori = {
  kategori: string
  total: number
  persenDariTotal: number
}
