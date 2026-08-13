-- =============================================================
-- PEMINJAMAN: PEMBERI PER-BARIS — Jalankan di Supabase SQL Editor
-- Identitas Pihak Pertama (pemberi pinjaman) diisi manual per
-- peminjaman, bukan satu identitas global — pemegang kas kantin
-- kolam berbeda-beda orang, tidak selalu admin sistem.
-- =============================================================

ALTER TABLE public.peminjaman
  ADD COLUMN IF NOT EXISTS pemberi_nama     TEXT,
  ADD COLUMN IF NOT EXISTS pemberi_jabatan  TEXT,
  ADD COLUMN IF NOT EXISTS pemberi_instansi TEXT;
