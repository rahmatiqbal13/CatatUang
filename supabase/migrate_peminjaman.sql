-- =============================================================
-- PEMINJAMAN (LOAN TRACKING) — Jalankan di Supabase SQL Editor
-- Mencatat pinjaman uang ke anggota (mis. Koperasi Kantin Kolam
-- Renang) dari sebuah wallet. Tidak memengaruhi saldo wallet —
-- murni pencatatan + sumber data untuk cetak surat perjanjian PDF.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.peminjaman (
  id            BIGSERIAL PRIMARY KEY,
  dana_id       BIGINT REFERENCES public.dana_masuk(id) ON DELETE SET NULL,
  nama_dana     TEXT,
  nama_peminjam TEXT NOT NULL,
  jabatan       TEXT,
  unit_kerja    TEXT,
  jumlah        NUMERIC(18, 2) NOT NULL,
  tanggal       DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'belum_lunas', -- 'belum_lunas' | 'lunas'
  keterangan    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.peminjaman ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select" ON public.peminjaman;
CREATE POLICY "authenticated_select" ON public.peminjaman FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Settings baru dipakai oleh halaman Pengaturan > Identitas Penandatangan,
-- ditulis oleh aplikasi lewat upsert biasa — baris ini hanya jaga-jaga
-- supaya key-nya ada sejak awal (opsional, aplikasi juga menangani key kosong).
INSERT INTO public.settings (key, value) VALUES
  ('pihak_pertama_nama', ''),
  ('pihak_pertama_jabatan', ''),
  ('pihak_pertama_instansi', '')
ON CONFLICT (key) DO NOTHING;
