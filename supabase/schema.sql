-- =============================================================
-- KEUANGAN DIREKTORAT — Database Schema
-- Jalankan file ini di Supabase SQL Editor
--
-- Skema dasar ini dilanjutkan oleh (jalankan berurutan setelah ini):
--   1. fix_rls_policies.sql
--   2. profiles_and_rls.sql   — tabel profiles + fix rekursi RLS
--   3. migrate_buku_pemasukan.sql — buku, pemasukan, dana_masuk.buku_id
--   4. migrate_peminjaman.sql — tabel peminjaman
-- =============================================================

-- ─────────────────────────────────────────
-- 1. TABEL SUMBER DANA
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sumber_dana (
  id         BIGSERIAL PRIMARY KEY,
  nama       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 2. TABEL KATEGORI PENGELUARAN
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kategori (
  id         BIGSERIAL PRIMARY KEY,
  nama       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 3. TABEL DANA MASUK
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dana_masuk (
  id         BIGSERIAL PRIMARY KEY,
  nama_dana  TEXT NOT NULL,
  jumlah     NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tanggal    DATE NOT NULL,
  sumber     TEXT NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 4. TABEL PENGELUARAN
-- ─────────────────────────────────────────
CREATE TYPE IF NOT EXISTS public.status_pengeluaran AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS public.pengeluaran (
  id          BIGSERIAL PRIMARY KEY,
  dana_id     BIGINT NOT NULL REFERENCES public.dana_masuk(id) ON DELETE RESTRICT,
  nama_dana   TEXT NOT NULL,
  uraian      TEXT NOT NULL,
  kategori    TEXT NOT NULL,
  jumlah      NUMERIC(18, 2) NOT NULL DEFAULT 0,
  tanggal     DATE NOT NULL,
  keterangan  TEXT,
  status      public.status_pengeluaran NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 5. TABEL SETTINGS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
  id         BIGSERIAL PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 6. TABEL ACTIVITY LOG
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_log (
  id          BIGSERIAL PRIMARY KEY,
  aksi        TEXT NOT NULL,
  keterangan  TEXT,
  entity_type TEXT,
  entity_id   BIGINT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────
ALTER TABLE public.sumber_dana    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kategori       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dana_masuk     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log   ENABLE ROW LEVEL SECURITY;

-- Hanya user yang sudah login (authenticated) yang bisa akses semua tabel
CREATE POLICY "authenticated_select" ON public.sumber_dana    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_select" ON public.kategori       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_select" ON public.dana_masuk     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_select" ON public.pengeluaran    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_select" ON public.settings       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_select" ON public.activity_log   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────
-- 8. DATA AWAL (SEED)
-- ─────────────────────────────────────────

-- Kategori pengeluaran default
INSERT INTO public.kategori (nama) VALUES
  ('ATK & Perlengkapan Kantor'),
  ('Perjalanan Dinas'),
  ('Honor & Jasa'),
  ('Konsumsi & Akomodasi'),
  ('Pemeliharaan & Perbaikan'),
  ('Pengembangan SDM'),
  ('Kegiatan Mahasiswa'),
  ('Operasional Lainnya')
ON CONFLICT (nama) DO NOTHING;

-- Sumber dana default
INSERT INTO public.sumber_dana (nama) VALUES
  ('DIPA'),
  ('BLU'),
  ('Dana Mandiri'),
  ('Hibah'),
  ('Kerjasama'),
  ('PNBP')
ON CONFLICT (nama) DO NOTHING;

-- Settings default
INSERT INTO public.settings (key, value) VALUES
  ('nama_direktorat', 'Direktorat Kemahasiswaan'),
  ('currency', 'IDR')
ON CONFLICT (key) DO NOTHING;
