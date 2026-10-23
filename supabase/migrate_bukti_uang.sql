-- =============================================================
-- BUKTI UANG: BUKTI PENERIMAAN UANG & BUKTI SERAH TERIMA UANG
-- Jalankan di Supabase SQL Editor.
-- Dokumen berdiri sendiri (tidak terikat Buku/Wallet) dan tidak
-- memengaruhi saldo — murni dokumen yang bisa dicetak sebagai PDF.
-- Menggantikan menu Invoice, Kwitansi, dan RAB. Tabel lama
-- (invoice, kwitansi, rab) TIDAK dihapus oleh skrip ini.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.bukti_uang (
  id                BIGSERIAL PRIMARY KEY,
  nomor             TEXT NOT NULL,
  jenis             TEXT NOT NULL CHECK (jenis IN ('penerimaan', 'serah_terima')),
  tanggal           DATE NOT NULL,
  pemberi_nama      TEXT NOT NULL,
  pemberi_jabatan   TEXT,
  penerima_nama     TEXT NOT NULL,
  penerima_jabatan  TEXT,
  jumlah            NUMERIC(18,2) NOT NULL CHECK (jumlah > 0),
  keperluan         TEXT NOT NULL,
  catatan           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bukti_uang ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all" ON public.bukti_uang;
CREATE POLICY "authenticated_all" ON public.bukti_uang FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Opsional: hapus tabel dokumen lama bila datanya sudah tidak diperlukan.
-- DROP TABLE IF EXISTS public.kwitansi;
-- DROP TABLE IF EXISTS public.invoice;
-- DROP TABLE IF EXISTS public.rab;
