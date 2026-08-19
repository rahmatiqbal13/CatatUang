-- =============================================================
-- DOKUMEN UMUM: INVOICE, KWITANSI, RAB — Jalankan di Supabase SQL Editor
-- Tiga dokumen umum yang berdiri sendiri (tidak terikat Buku/Wallet
-- manapun) dan tidak memengaruhi saldo — murni dokumen yang bisa
-- dicetak sebagai PDF. Tidak ada identitas lembaga yang di-hardcode;
-- semua field pihak (penerbit/penerima/penyusun) diisi manual per
-- dokumen supaya bisa dipakai untuk keperluan apapun.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.invoice (
  id                BIGSERIAL PRIMARY KEY,
  nomor             TEXT NOT NULL,
  tanggal           DATE NOT NULL,
  jatuh_tempo       DATE,
  status            TEXT NOT NULL DEFAULT 'belum_dibayar', -- 'belum_dibayar' | 'lunas'
  penerbit_nama     TEXT NOT NULL,
  penerbit_jabatan  TEXT,
  penerbit_instansi TEXT,
  penerima_nama     TEXT NOT NULL,
  penerima_instansi TEXT,
  penerima_alamat   TEXT,
  items             JSONB NOT NULL DEFAULT '[]', -- [{uraian, qty, harga_satuan}]
  diskon_persen     NUMERIC(5,2) NOT NULL DEFAULT 0,
  pajak_persen      NUMERIC(5,2) NOT NULL DEFAULT 0,
  catatan           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kwitansi (
  id                BIGSERIAL PRIMARY KEY,
  nomor             TEXT NOT NULL,
  tanggal           DATE NOT NULL,
  invoice_id        BIGINT REFERENCES public.invoice(id) ON DELETE SET NULL,
  diterima_dari     TEXT NOT NULL,
  jumlah            NUMERIC(18,2) NOT NULL,
  untuk_pembayaran  TEXT NOT NULL,
  penerima_nama     TEXT NOT NULL,
  penerima_jabatan  TEXT,
  catatan           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rab (
  id                BIGSERIAL PRIMARY KEY,
  nomor             TEXT NOT NULL,
  judul             TEXT NOT NULL,
  tanggal           DATE NOT NULL,
  penyusun_nama     TEXT NOT NULL,
  penyusun_jabatan  TEXT,
  items             JSONB NOT NULL DEFAULT '[]', -- [{kategori, uraian, volume, satuan, harga_satuan}]
  catatan           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoice  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kwitansi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rab      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select" ON public.invoice;
DROP POLICY IF EXISTS "authenticated_select" ON public.kwitansi;
DROP POLICY IF EXISTS "authenticated_select" ON public.rab;

CREATE POLICY "authenticated_select" ON public.invoice  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_select" ON public.kwitansi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_select" ON public.rab      FOR ALL TO authenticated USING (true) WITH CHECK (true);
