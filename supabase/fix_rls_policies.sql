-- =============================================================
-- FIX RLS POLICIES — Jalankan di Supabase SQL Editor
-- Memperbaiki error 403 pada semua tabel
-- =============================================================

-- Hapus policy lama jika ada (abaikan error jika tidak ada)
DROP POLICY IF EXISTS "authenticated_select" ON public.sumber_dana;
DROP POLICY IF EXISTS "authenticated_select" ON public.kategori;
DROP POLICY IF EXISTS "authenticated_select" ON public.dana_masuk;
DROP POLICY IF EXISTS "authenticated_select" ON public.pengeluaran;
DROP POLICY IF EXISTS "authenticated_select" ON public.settings;
DROP POLICY IF EXISTS "authenticated_select" ON public.activity_log;

-- Pastikan RLS aktif pada semua tabel
ALTER TABLE public.sumber_dana   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kategori      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dana_masuk    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengeluaran   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log  ENABLE ROW LEVEL SECURITY;

-- Buat policy baru: user yang sudah login bisa SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "authenticated_all" ON public.sumber_dana
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.kategori
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.dana_masuk
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.pengeluaran
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all" ON public.activity_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Verifikasi: tampilkan semua policy yang aktif
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
