-- =============================================================
-- MIGRASI DATA — Jalankan di Supabase SQL Editor
-- Sumber: Laporan Keuangan Operasional (PDF)
-- Total Dana  : Rp 200.497.250
-- Total Keluar: Rp 176.315.901
-- Sisa Saldo  : Rp  24.181.349
-- =============================================================

-- Gunakan CTE agar dana_id otomatis tersambung ke semua pengeluaran
WITH new_dana AS (
  INSERT INTO public.dana_masuk (nama_dana, jumlah, tanggal, sumber, keterangan, created_at, updated_at)
  VALUES (
    'Dana Operasional USC',
    200497250,
    '2025-10-01',
    'Lainnya',
    'Migrasi dari sistem lama',
    NOW(),
    NOW()
  )
  RETURNING id
)
INSERT INTO public.pengeluaran
  (dana_id, nama_dana, uraian, kategori, jumlah, tanggal, status, approved_at, created_at, updated_at)
SELECT
  new_dana.id,
  'Dana Operasional USC',
  t.uraian,
  t.kategori,
  t.jumlah,
  t.tanggal::date,
  'approved',
  NOW(),
  NOW(),
  NOW()
FROM new_dana,
(VALUES
  -- ── April 2026 ──────────────────────────────────────────
  ('reimbiurse brin',                          'ATK & Perlengkapan',   1450000,    '2026-04-27'),
  ('Pembelian Kabel dan Stop Kontak',          'ATK & Perlengkapan',   1000000,    '2026-04-27'),
  ('Materi 2026',                              'ATK & Perlengkapan',   2000000,    '2026-04-23'),
  ('Pembelian selang ac indoor',               'ATK & Perlengkapan',   100000,     '2026-04-21'),
  ('Beli Galon 8 Buah',                        'Konsumsi & Akomodasi', 153500,     '2026-04-20'),
  ('Konusmsi Persiapan Brin',                  'Konsumsi & Akomodasi', 600000,     '2026-04-17'),
  ('Lampu dan Fitting SSFC',                   'Pemeliharaan',         1200000,    '2026-04-17'),
  ('Beli Mata Bor',                            'ATK & Perlengkapan',   100000,     '2026-04-17'),
  ('Bensin Pak pur dan Pak Fikri',             'Konsumsi & Akomodasi', 1000000,    '2026-04-15'),
  ('Pembelian Barcode 2D',                     'ATK & Perlengkapan',   414405,     '2026-04-14'),
  ('Pembelian Kertas Thermal 20 buah',         'ATK & Perlengkapan',   273700,     '2026-04-14'),
  ('Pembelian Lampu, Pilok, Box Besi',         'ATK & Perlengkapan',   350000,     '2026-04-13'),
  ('Konsumsi Persiapan Brin',                  'Konsumsi & Akomodasi', 200000,     '2026-04-13'),
  ('Konsumsi Anak anak',                       'Konsumsi & Akomodasi', 300000,     '2026-04-10'),
  ('Beli konsumsi Minum',                      'ATK & Perlengkapan',   156000,     '2026-04-10'),
  ('Beli Tisu & Baterai',                      'ATK & Perlengkapan',   200000,     '2026-04-10'),
  ('HDMI to VGA',                              'ATK & Perlengkapan',   50000,      '2026-04-10'),
  ('Pembelian Tab operasional',                'ATK & Perlengkapan',   4400000,    '2026-04-08'),
  ('Pembelian Printer Thermal',                'ATK & Perlengkapan',   680399,     '2026-04-07'),
  ('Bunga Duka Cita',                          'ATK & Perlengkapan',   602500,     '2026-04-01'),
  -- ── Maret 2026 ──────────────────────────────────────────
  ('Pembayaran Durenan',                       'Lain-lain',            1925000,    '2026-03-11'),
  ('Bayar Bukber FIKK',                        'Konsumsi & Akomodasi', 1000000,    '2026-03-11'),
  ('Pembelian Galon 8 dan Baju 37 Buah',       'Lain-lain',            2812600,    '2026-03-04'),
  ('Beli Seal Cendela',                        'Pemeliharaan',         400000,     '2026-03-03'),
  -- ── Februari 2026 ───────────────────────────────────────
  ('Pembelian tabebuya',                       'Lain-lain',            1150000,    '2026-02-13'),
  ('Karangan Bunga Ucapan Selamat Pak Oc',     'Lain-lain',            600000,     '2026-02-10'),
  ('Konsumsi Kunjungan UPY',                   'Konsumsi & Akomodasi', 320000,     '2026-02-10'),
  ('Meteran Jahit & Meteran Jahit Roll',       'ATK & Perlengkapan',   22500,      '2026-02-10'),
  ('Pembelian Lakban Jilid hitam/putih',       'ATK & Perlengkapan',   80000,      '2026-02-10'),
  ('Bayar check ac',                           'Pemeliharaan',         100000,     '2026-02-10'),
  ('Beli konsumsi Pak Pur Tenis dg Petin',     'Konsumsi & Akomodasi', 600000,     '2026-02-06'),
  ('Karangan Bunga 2',                         'Lain-lain',            1200000,    '2026-02-02'),
  -- ── Januari 2026 ────────────────────────────────────────
  ('Pembersihan ac',                           'Pemeliharaan',         90000,      '2026-01-29'),
  ('Beli Keyboard 3',                          'ATK & Perlengkapan',   106000,     '2026-01-28'),
  ('Pembelian Backdrop',                       'ATK & Perlengkapan',   100000,     '2026-01-23'),
  ('Uang Tahunan Seluruh Unit Usaha',          'Lain-lain',            10000000,   '2026-01-23'),
  ('Pembayaran Penjilidan DOD Blitar',         'ATK & Perlengkapan',   181000,     '2026-01-23'),
  ('Galon Minum 9',                            'Konsumsi & Akomodasi', 200000,     '2026-01-23'),
  ('PPH 23',                                   'Lain-lain',            58000,      '2026-01-22'),
  ('Pembelian Ampli',                          'Lain-lain',            4500000,    '2026-01-22'),
  ('Perbaikan, Pembelian, dan Pengecatan',     'Pemeliharaan',         850000,     '2026-01-22'),
  ('Penggantian Kunci',                        'Lain-lain',            150000,     '2026-01-22'),
  ('Pengeluaran Jasa (Pak Fikri)',             'Lain-lain',            4500000,    '2026-01-21'),
  ('Konsumsi Pimpinan',                        'Konsumsi & Akomodasi', 322000,     '2026-01-21'),
  ('Galon 4',                                  'Konsumsi & Akomodasi', 80300,      '2026-01-14'),
  ('Perbaikan dan Setting Sound SSFC',         'Pemeliharaan',         320000,     '2026-01-12'),
  ('Biaya Pasang Smart Lock',                  'Honor & Jasa',         150000,     '2026-01-09'),
  ('Pembelian Baju Team USC Unit Usaha',       'Lain-lain',            3500000,    '2026-01-09'),
  ('Konsumsi',                                 'Konsumsi & Akomodasi', 150000,     '2026-01-09'),
  ('Pembelian Panci dan Sabun Cuci Piring',    'Lain-lain',            200000,     '2026-01-08'),
  ('Perbaikan AC SSFC',                        'Pemeliharaan',         500000,     '2026-01-07'),
  ('konsumsi',                                 'Konsumsi & Akomodasi', 360000,     '2026-01-07'),
  ('Pembelian Mini pc, kertas, dan Gaga',      'Lain-lain',            10000000,   '2026-01-06'),
  ('Perbaikan SSFC',                           'Pemeliharaan',         1500000,    '2026-01-05'),
  ('Pembelian Kabel Sound SSFC',               'Lain-lain',            250000,     '2026-01-05'),
  -- ── Desember 2025 ───────────────────────────────────────
  ('Pembelian Bouy dan Gergaji Mesin',         'Pemeliharaan',         3522000,    '2025-12-30'),
  ('Galon 8',                                  'Konsumsi & Akomodasi', 153000,     '2025-12-30'),
  ('Perbaikan HT usc',                         'Pemeliharaan',         2500000,    '2025-12-23'),
  ('Bensin Tosa',                              'Lain-lain',            50000,      '2025-12-19'),
  ('Pembelian Semen dan Pasir',                'Pemeliharaan',         150000,     '2025-12-17'),
  ('Rak Gantung Atas TV Monitor',             'ATK & Perlengkapan',   51000,      '2025-12-17'),
  ('Konsumsi Buah Untuk Kunjungan Benchmark',  'Konsumsi & Akomodasi', 50000,      '2025-12-17'),
  ('Ganti Uang Pak Afif',                      'Lain-lain',            1163000,    '2025-12-16'),
  ('Pembelian Pupuk',                          'Lain-lain',            150000,     '2025-12-16'),
  ('Air Unesa',                                'Konsumsi & Akomodasi', 70000,      '2025-12-12'),
  ('Bensin',                                   'Lain-lain',            150000,     '2025-12-12'),
  ('Konsumsi',                                 'Konsumsi & Akomodasi', 50000,      '2025-12-12'),
  ('Cetak Buku dan konsumsi',                  'Kegiatan & Acara',     380500,     '2025-12-10'),
  ('Pembelian Pipa Duck Kabel',                'Lain-lain',            104000,     '2025-12-10'),
  ('Perbaikan Sling 12 Meter',                 'Pemeliharaan',         350000,     '2025-12-10'),
  ('bensin mobil musik senja',                 'Konsumsi & Akomodasi', 150000,     '2025-12-05'),
  ('Pembelian Air Galon 4 buah',               'Konsumsi & Akomodasi', 80200,      '2025-12-04'),
  ('Pajak',                                    'Lain-lain',            132000,     '2025-12-04'),
  ('Pembelian perlengkapan dan perkabelan',    'Pemeliharaan',         159000,     '2025-12-04'),
  ('Pembelian Materai',                        'ATK & Perlengkapan',   1000000,    '2025-12-04'),
  ('Pembelian Kabel dan HDMI',                 'Lain-lain',            445492,     '2025-12-03'),
  -- ── November 2025 ───────────────────────────────────────
  ('Pinjam SERC',                              'Lain-lain',            7700000,    '2025-11-28'),
  ('Uang Bensin',                              'Perjalanan Dinas',     200000,     '2025-11-28'),
  ('Pembelian Bracket TV Standing 55"',        'Lain-lain',            1688056,    '2025-11-26'),
  ('Pajak Pembelian dan Jasa',                 'Lain-lain',            950000,     '2025-11-25'),
  ('Ganti Uang Service Pompa',                 'Lain-lain',            350000,     '2025-11-18'),
  ('bantal Sofa',                              'Lain-lain',            200000,     '2025-11-14'),
  ('Uang untuk mahasiswa pak donny',           'Lain-lain',            150000,     '2025-11-13'),
  ('Operasional Tari Event Unair',             'Perjalanan Dinas',     3500000,    '2025-11-12'),
  ('Pajak TUP',                                'Lain-lain',            430000,     '2025-11-11'),
  ('Pembelian Baju Kegiatan',                  'Lain-lain',            3000000,    '2025-11-06'),
  ('Renovasi Kolam',                           'Pemeliharaan',         3000000,    '2025-11-05'),
  ('Pembelian Karpet',                         'Pemeliharaan',         561199,     '2025-11-04'),
  ('Opersional',                               'Lain-lain',            2579260,    '2025-11-03'),
  ('Konsumsi',                                 'Konsumsi & Akomodasi', 115000,     '2025-11-03'),
  ('Pembelian Rak, Rantai Plastik, Traff',     'Lain-lain',            2860000,    '2025-11-03'),
  -- ── Oktober 2025 ────────────────────────────────────────
  ('Cutting Sticker dan Banner',               'ATK & Perlengkapan',   300000,     '2025-10-31'),
  ('Team Sound Musik Rutin',                   'Honor & Jasa',         4400000,    '2025-10-31'),
  ('Konsumsi Pra Kunjungan',                   'Konsumsi & Akomodasi', 234000,     '2025-10-30'),
  ('Konsumsi Team Persiapan Kunjungan',        'Konsumsi & Akomodasi', 200000,     '2025-10-29'),
  ('Cetak Banner Info operasional',            'ATK & Perlengkapan',   300000,     '2025-10-28'),
  ('Sound Man Live Music Unesa 2x',            'Honor & Jasa',         900000,     '2025-10-27'),
  ('Biaya Music Live Rutin',                   'ATK & Perlengkapan',   4000000,    '2025-10-24'),
  ('Pembelian Printer Thermal dan Refill',     'Pemeliharaan',         906000,     '2025-10-24'),
  ('Pindah Dana',                              'Lain-lain',            50000000,   '2025-10-21'),
  ('Operasional',                              'Lain-lain',            2579260,    '2025-10-21'),
  ('Konsumsi Pengisi Band Senja',              'Konsumsi & Akomodasi', 170000,     '2025-10-18'),
  ('Konsumsi Dosen Band Senja',                'Konsumsi & Akomodasi', 76000,      '2025-10-16'),
  ('Konsumsi USC saat Band Senja',             'Konsumsi & Akomodasi', 83000,      '2025-10-16'),
  ('Horarium Band Senja',                      'Honor & Jasa',         3500000,    '2025-10-16'),
  ('Pembelian Paper Shreder Secure Maxi',      'ATK & Perlengkapan',   1553850,    '2025-10-16'),
  ('Pembelian HP Scanjet 2000',                'ATK & Perlengkapan',   3962180,    '2025-10-16'),
  ('Konsumsi FIKK Bu Mona',                   'Konsumsi & Akomodasi', 1500000,    '2025-10-02')
) AS t(uraian, kategori, jumlah, tanggal);

-- Verifikasi hasil migrasi
SELECT
  'dana_masuk' AS tabel,
  COUNT(*) AS jumlah_baris,
  TO_CHAR(SUM(jumlah), 'FM999,999,999,999') AS total
FROM public.dana_masuk
UNION ALL
SELECT
  'pengeluaran',
  COUNT(*),
  TO_CHAR(SUM(jumlah), 'FM999,999,999,999')
FROM public.pengeluaran
WHERE status = 'approved';
