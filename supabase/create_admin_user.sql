-- =============================================================
-- BUAT AKUN ADMIN — Alternatif via SQL Editor
-- Jalankan di Supabase SQL Editor SETELAH schema.sql berhasil
--
-- CATATAN: Cara yang lebih mudah adalah lewat API route.
-- Lihat instruksi di bawah.
-- =============================================================

-- Langkah 1: Aktifkan pgcrypto (wajib untuk crypt & gen_salt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Langkah 2: Masukkan user admin
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@direktorat.ac.id',
  crypt('uscadmin@_140451', gen_salt('bf')),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{"username": "admin", "display_name": "Administrator"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Langkah 3: Verifikasi
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'admin@direktorat.ac.id';
