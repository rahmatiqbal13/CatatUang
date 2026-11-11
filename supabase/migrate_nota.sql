-- =============================================================
-- NOTA TOKO: profil toko + nota penjualan yang bisa dicetak
-- Jalankan di Supabase SQL Editor.
-- Berdiri sendiri (tidak terikat Buku/Wallet) dan tidak
-- memengaruhi saldo — murni dokumen yang bisa dicetak di
-- kertas biasa (A4/A5) atau kertas thermal 80 mm.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.toko (
  id            BIGSERIAL PRIMARY KEY,
  nama          TEXT NOT NULL,
  alamat        TEXT,
  telepon       TEXT,
  catatan_kaki  TEXT,               -- mis. "Terima kasih atas kunjungan Anda"
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nota (
  id          BIGSERIAL PRIMARY KEY,
  nomor       TEXT NOT NULL UNIQUE,  -- NT/2026/0001
  toko_id     BIGINT NOT NULL REFERENCES public.toko(id) ON DELETE RESTRICT,
  tanggal     DATE NOT NULL,
  pelanggan   TEXT,
  -- [{ "nama": "Kopi susu", "qty": 2, "harga": 15000 }, ...]
  items       JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  diskon      NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (diskon >= 0),
  total       NUMERIC(18,2) NOT NULL CHECK (total >= 0),  -- subtotal item − diskon
  metode      TEXT NOT NULL DEFAULT 'Tunai',
  bayar       NUMERIC(18,2),                               -- uang diterima (untuk kembalian)
  catatan     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nota_toko_id_idx ON public.nota (toko_id);
CREATE INDEX IF NOT EXISTS nota_tanggal_idx ON public.nota (tanggal DESC);

ALTER TABLE public.toko ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nota ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all" ON public.toko;
CREATE POLICY "authenticated_all" ON public.toko FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all" ON public.nota;
CREATE POLICY "authenticated_all" ON public.nota FOR ALL TO authenticated USING (true) WITH CHECK (true);
