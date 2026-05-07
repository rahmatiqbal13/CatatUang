-- ============================================================
-- KEUANGAN DIREKTORAT - Supabase Schema
-- Jalankan seluruh file ini di Supabase SQL Editor
-- ============================================================

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value) VALUES
  ('nama_direktorat', 'Nama Direktorat'),
  ('currency', 'IDR'),
  ('nama_kepala', ''),
  ('nama_bendahara', '')
ON CONFLICT (key) DO NOTHING;

-- Sumber Dana
CREATE TABLE IF NOT EXISTS sumber_dana (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO sumber_dana (nama) VALUES
  ('UKT'), ('DIPA'), ('APBN'), ('APBD'), ('BLU'), ('Hibah'), ('Lainnya')
ON CONFLICT (nama) DO NOTHING;

-- Kategori
CREATE TABLE IF NOT EXISTS kategori (
  id SERIAL PRIMARY KEY,
  nama VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO kategori (nama) VALUES
  ('Perjalanan Dinas'),
  ('ATK & Perlengkapan'),
  ('Konsumsi & Akomodasi'),
  ('Honor & Jasa'),
  ('Sewa & Fasilitas'),
  ('Komunikasi'),
  ('Pemeliharaan'),
  ('Kegiatan & Acara'),
  ('Lain-lain')
ON CONFLICT (nama) DO NOTHING;

-- Dana Masuk
CREATE TABLE IF NOT EXISTS dana_masuk (
  id SERIAL PRIMARY KEY,
  nama_dana VARCHAR(255) NOT NULL,
  jumlah DECIMAL(15, 2) NOT NULL,
  tanggal DATE NOT NULL,
  sumber VARCHAR(100) NOT NULL,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pengeluaran
CREATE TABLE IF NOT EXISTS pengeluaran (
  id SERIAL PRIMARY KEY,
  dana_id INTEGER REFERENCES dana_masuk(id) ON DELETE RESTRICT,
  nama_dana VARCHAR(255) NOT NULL,
  uraian TEXT NOT NULL,
  kategori VARCHAR(100) NOT NULL,
  jumlah DECIMAL(15, 2) NOT NULL,
  tanggal DATE NOT NULL,
  keterangan TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  aksi VARCHAR(100) NOT NULL,
  keterangan TEXT,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Disable RLS (single admin app, semua akses via service key)
-- ============================================================
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE sumber_dana DISABLE ROW LEVEL SECURITY;
ALTER TABLE kategori DISABLE ROW LEVEL SECURITY;
ALTER TABLE dana_masuk DISABLE ROW LEVEL SECURITY;
ALTER TABLE pengeluaran DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log DISABLE ROW LEVEL SECURITY;
