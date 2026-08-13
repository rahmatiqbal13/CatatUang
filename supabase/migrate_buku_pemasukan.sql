-- =============================================================
-- BUKU (BOOK) & PEMASUKAN (INCOME LEDGER) — Jalankan di Supabase SQL Editor
-- Menambahkan pengelompokan wallet per buku/tahun, dan mengganti
-- dana_masuk.jumlah (angka tunggal yang di-increment) menjadi ledger
-- pemasukan sungguhan (satu baris per transaksi), simetris dengan
-- pengeluaran yang sudah begitu sejak awal.
--
-- Seluruh file ini aman dijalankan berkali-kali (idempotent) —
-- termasuk di database yang sudah pernah menjalankannya.
-- =============================================================

-- ─────────────────────────────────────────
-- 1. TABEL BUKU
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.buku (
  id         BIGSERIAL PRIMARY KEY,
  nama       TEXT NOT NULL,
  tahun      INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.buku ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select" ON public.buku;
CREATE POLICY "authenticated_select" ON public.buku FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────
-- 2. TABEL PEMASUKAN (ledger, simetris dengan pengeluaran)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pemasukan (
  id         BIGSERIAL PRIMARY KEY,
  dana_id    BIGINT NOT NULL REFERENCES public.dana_masuk(id) ON DELETE RESTRICT,
  nama_dana  TEXT NOT NULL,
  uraian     TEXT NOT NULL,
  jumlah     NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tanggal    DATE NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.pemasukan ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select" ON public.pemasukan;
CREATE POLICY "authenticated_select" ON public.pemasukan FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────
-- 3. dana_masuk: tambah buku_id
-- ─────────────────────────────────────────
ALTER TABLE public.dana_masuk ADD COLUMN IF NOT EXISTS buku_id BIGINT REFERENCES public.buku(id);

-- =============================================================
-- MIGRASI DATA SATU KALI — backfill buku + saldo awal dari
-- dana_masuk.jumlah. Aman dijalankan berkali-kali: setiap langkah
-- hanya memproses baris yang belum pernah diproses, dan blok
-- terakhir otomatis dilewati begitu kolom `jumlah` sudah dihapus
-- (sudah terjadi di database production project ini).
-- =============================================================

INSERT INTO public.buku (nama, tahun)
SELECT DISTINCT EXTRACT(YEAR FROM tanggal)::text, EXTRACT(YEAR FROM tanggal)::int
FROM public.dana_masuk
WHERE buku_id IS NULL;

UPDATE public.dana_masuk d
SET buku_id = b.id
FROM public.buku b
WHERE d.buku_id IS NULL AND b.tahun = EXTRACT(YEAR FROM d.tanggal)::int;

ALTER TABLE public.dana_masuk ALTER COLUMN buku_id SET NOT NULL;

-- Backfill "Saldo Awal" dari dana_masuk.jumlah — pakai EXECUTE dinamis
-- supaya blok ini tidak gagal parse begitu kolom `jumlah` sudah tidak ada.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dana_masuk' AND column_name = 'jumlah'
  ) THEN
    EXECUTE $sql$
      INSERT INTO public.pemasukan (dana_id, nama_dana, uraian, jumlah, tanggal, keterangan)
      SELECT d.id, d.nama_dana, 'Saldo Awal', d.jumlah, d.tanggal, d.keterangan
      FROM public.dana_masuk d
      WHERE d.jumlah IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.pemasukan p WHERE p.dana_id = d.id)
    $sql$;
  END IF;
END $$;

-- Hapus kolom lama setelah aplikasi diverifikasi jalan dengan baik
-- memakai pemasukan sebagai sumber saldo (irreversible; IF EXISTS
-- membuatnya aman dijalankan ulang):
ALTER TABLE public.dana_masuk DROP COLUMN IF EXISTS jumlah;
