-- =============================================================
-- NOTA: nama kasir di struk
-- Jalankan di Supabase SQL Editor SETELAH migrate_nota.sql.
-- Aman dijalankan ulang. Satuan per item disimpan di kolom
-- items (JSONB) yang sudah ada — tidak perlu kolom baru.
-- =============================================================

ALTER TABLE public.nota ADD COLUMN IF NOT EXISTS kasir TEXT;  -- nama akun yang membuat nota
