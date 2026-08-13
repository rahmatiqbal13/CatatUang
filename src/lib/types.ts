export type Buku = {
  id: number
  nama: string
  tahun: number | null
  created_at: string
  updated_at: string
}

export type DanaMasuk = {
  id: number
  buku_id: number
  nama_dana: string
  tanggal: string
  sumber: string
  keterangan: string | null
  created_at: string
  updated_at: string
}

// dana_masuk enriched with its computed saldo (sum of pemasukan) — the shape
// server pages pass down after aggregating pemasukan per wallet
export type DanaMasukWithSaldo = DanaMasuk & { jumlah: number }

export type Pemasukan = {
  id: number
  dana_id: number
  nama_dana: string
  uraian: string
  jumlah: number
  tanggal: string
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

export type StatusPeminjaman = 'belum_lunas' | 'lunas'

export type Peminjaman = {
  id: number
  dana_id: number | null
  nama_dana: string | null
  nama_peminjam: string
  jabatan: string | null
  unit_kerja: string | null
  pemberi_nama: string | null
  pemberi_jabatan: string | null
  pemberi_instansi: string | null
  jumlah: number
  tanggal: string
  status: StatusPeminjaman
  keterangan: string | null
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

export type UserRole = 'super_admin' | 'admin'

export type Profile = {
  id: string
  nama: string
  role: UserRole
  is_active: boolean
  unit_kerja_id: number | null
  created_at: string
  email?: string
}
