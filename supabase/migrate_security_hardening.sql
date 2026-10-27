-- =============================================================
-- SECURITY HARDENING — Jalankan di Supabase SQL Editor
-- Jalankan SETELAH profiles_and_rls.sql (butuh public.profiles).
-- Aman dijalankan berkali-kali (idempotent).
--
-- 1. Pengeluaran: hanya super_admin yang boleh menyetujui/menolak,
--    approval dicatat (approved_by), approval diblok jika saldo dana
--    tidak cukup, pengeluaran yang sudah disetujui terkunci.
-- 2. activity_log: hanya boleh dibaca & ditambah (tidak bisa diubah/dihapus).
-- 3. settings: hanya super_admin yang boleh mengubah.
-- 4. bukti_uang: nomor dokumen unik.
-- =============================================================

-- ─────────────────────────────────────────
-- 0. is_super_admin: user nonaktif tidak dihitung super admin
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active
  );
$$;

-- ─────────────────────────────────────────
-- 1. PENGELUARAN
-- ─────────────────────────────────────────
ALTER TABLE public.pengeluaran
  ADD COLUMN IF NOT EXISTS created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.pengeluaran_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  saldo NUMERIC;
BEGIN
  -- SQL Editor / service role (tanpa user login) tidak dibatasi
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'approved' AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Pengeluaran yang sudah disetujui hanya dapat dihapus oleh super admin';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Semua pengajuan baru mulai dari pending, apa pun yang dikirim klien
    NEW.status      := 'pending';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    NEW.created_by  := auth.uid();
    RETURN NEW;
  END IF;

  -- UPDATE
  NEW.created_by := OLD.created_by;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    IF OLD.status = 'approved' AND (
         NEW.dana_id   IS DISTINCT FROM OLD.dana_id
      OR NEW.jumlah    IS DISTINCT FROM OLD.jumlah
      OR NEW.tanggal   IS DISTINCT FROM OLD.tanggal
      OR NEW.uraian    IS DISTINCT FROM OLD.uraian
      OR NEW.kategori  IS DISTINCT FROM OLD.kategori
      OR NEW.nama_dana IS DISTINCT FROM OLD.nama_dana
    ) THEN
      RAISE EXCEPTION 'Pengeluaran yang sudah disetujui tidak dapat diubah';
    END IF;
    -- Mengedit pengeluaran yang ditolak = mengajukan ulang
    IF OLD.status = 'rejected' THEN
      NEW.status := 'pending';
    END IF;
    NEW.approved_at := OLD.approved_at;
    NEW.approved_by := OLD.approved_by;
    RETURN NEW;
  END IF;

  -- Perubahan status
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Hanya super admin yang dapat menyetujui atau menolak pengeluaran';
  END IF;

  IF NEW.status = 'approved' THEN
    -- Kunci baris dana supaya dua approval bersamaan tidak lolos cek saldo
    PERFORM 1 FROM public.dana_masuk WHERE id = NEW.dana_id FOR UPDATE;

    SELECT COALESCE((SELECT SUM(jumlah) FROM public.pemasukan WHERE dana_id = NEW.dana_id), 0)
         - COALESCE((SELECT SUM(jumlah) FROM public.pengeluaran
                     WHERE dana_id = NEW.dana_id AND status = 'approved' AND id <> NEW.id), 0)
      INTO saldo;

    IF NEW.jumlah > saldo THEN
      RAISE EXCEPTION 'Saldo dana tidak mencukupi (sisa Rp %, diajukan Rp %)',
        to_char(saldo, 'FM999G999G999G990'), to_char(NEW.jumlah, 'FM999G999G999G990');
    END IF;

    NEW.approved_at := NOW();
    NEW.approved_by := auth.uid();
  ELSE
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pengeluaran_guard ON public.pengeluaran;
CREATE TRIGGER pengeluaran_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.pengeluaran
  FOR EACH ROW EXECUTE FUNCTION public.pengeluaran_guard();

-- ─────────────────────────────────────────
-- 2. ACTIVITY LOG: append-only
-- ─────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_log'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.activity_log', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "activity_log_select" ON public.activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_log_insert" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- ─────────────────────────────────────────
-- 3. SETTINGS: semua boleh baca, hanya super_admin boleh ubah
-- ─────────────────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.settings', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "settings_select" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_insert_super_admin" ON public.settings FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());
CREATE POLICY "settings_update_super_admin" ON public.settings FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "settings_delete_super_admin" ON public.settings FOR DELETE TO authenticated USING (public.is_super_admin());

-- ─────────────────────────────────────────
-- 4. BUKTI UANG: nomor unik
-- Dilewati (dengan NOTICE) bila sudah ada nomor ganda — perbaiki dulu
-- datanya, lalu jalankan ulang file ini.
-- ─────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT nomor FROM public.bukti_uang GROUP BY nomor HAVING COUNT(*) > 1) THEN
    RAISE NOTICE 'bukti_uang punya nomor ganda — unique index TIDAK dibuat. Cek: SELECT nomor, COUNT(*) FROM bukti_uang GROUP BY nomor HAVING COUNT(*) > 1;';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS bukti_uang_nomor_key ON public.bukti_uang (nomor);
  END IF;
END $$;
