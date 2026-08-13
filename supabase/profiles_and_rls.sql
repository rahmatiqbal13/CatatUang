-- =============================================================
-- PROFILES TABLE & RLS FIX — Jalankan di Supabase SQL Editor
-- Tabel profiles sudah ada di project ini sejak sebelum repo ini
-- dibuat; definisi di bawah didokumentasikan di sini (IF NOT EXISTS,
-- aman dijalankan ulang) supaya setup baru tidak kehilangan tabel ini.
--
-- Bagian RLS memperbaiki bug "infinite recursion detected in policy
-- for relation 'profiles'" (42P17) — Sidebar.tsx gagal memuat nama/
-- role user asli dan diam-diam jatuh ke fallback derive-dari-email.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin', -- 'admin' | 'super_admin'
  is_active     BOOLEAN NOT NULL DEFAULT true,
  unit_kerja_id BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama apa pun namanya (termasuk yang menyebabkan rekursi)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- Baca: semua user login boleh baca semua profil (dipakai Sidebar untuk lookup nama/role sendiri)
CREATE POLICY "profiles_select_authenticated" ON public.profiles
FOR SELECT TO authenticated
USING (true);

-- Fungsi SECURITY DEFINER supaya cek "apakah super_admin" tidak memicu rekursi RLS
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Update: hanya super_admin yang boleh ubah role/status user lain (dipakai halaman Pengguna)
CREATE POLICY "profiles_update_super_admin" ON public.profiles
FOR UPDATE TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());
