# Handoff: CatatUang UI Redesign (Command Center)

## Overview
Redesign UI untuk **CatatUang** (`github.com/rahmatiqbal13/CatatUang`) — sistem manajemen keuangan direktorat: Next.js App Router + Supabase + Tailwind + shadcn/ui. Redesign mencakup seluruh 14 layar aplikasi: Dashboard, Dana Masuk (+ detail), Pengeluaran, Peminjaman, Invoice, Kwitansi, RAB, Laporan, Master Data, Pengguna, Pengaturan, Login, dan tampilan Mobile.

Tujuan redesign: tampilan lebih modern dan berwarna, angka lebih jelas, **tidak ada informasi yang terpotong** di lebar layar berapa pun, tanpa mengubah fungsi yang sudah ada.

## About the Design Files
File di bundel ini adalah **referensi desain dalam bentuk HTML** — prototipe yang menunjukkan tampilan dan perilaku yang dituju, **bukan kode produksi untuk disalin langsung**. Tugas implementasi adalah **membuat ulang desain ini di dalam codebase CatatUang yang sudah ada** (Next.js App Router, React Server/Client Components, Tailwind v4, shadcn/ui, Supabase) memakai pola yang sudah berlaku di repo — bukan menempelkan HTML-nya.

Perilaku aplikasi (query Supabase, RLS, buku switcher, approval, ekspor PDF/Excel) **sudah ada di repo dan tidak boleh berubah**. Yang berubah hanya lapisan presentasi.

## Fidelity
**High-fidelity.** Warna, tipografi, ukuran, jarak, dan state sudah final — rekonstruksi harus presisi. Gunakan komponen shadcn/ui yang sudah ada (`Button`, `Dialog`, `Select`, `Table`, `Input`, `Badge`) dengan token baru, jangan menulis primitif baru.

---

## Design Tokens

Ganti blok `:root` di `src/app/globals.css`. Skema lama (navy #1d3557 + ivory) diganti skema **Modernist**: ground abu terang, tinta hampir hitam, aksen merah, ditambah palet data berwarna.

### Warna inti
| Token | Hex | Pemakaian |
| --- | --- | --- |
| `--background` / ground | `#f3f2f2` | latar halaman |
| `--surface` | `#ffffff` | kartu, tabel, panel |
| `--surface-2` | `#eae9e9` | track bar, hover ringan |
| `--text` | `#201e1d` | teks utama |
| `--text-2` | `#444141` | teks sekunder |
| `--text-muted` | `#605d5d` | label, meta |
| `--text-dim` | `#7d7979` | teks paling redup |
| `--divider` | `rgba(32,30,29,0.4)` | **garis 2px** antar bagian |
| `--border-hairline` | `#d7d3d3` | garis 1px antar baris tabel |
| `--accent` | `#ec3013` | aksi primer, realisasi, penekanan |
| `--accent-hover` | `#dd2b0f` | hover aksi primer |
| `--accent-press` | `#ae1800` | pressed + teks merah ukuran kecil (kontras ≥4.5:1) |
| `--accent-100` | `#fff2ef` | tint |
| `--accent-200` | `#ffe0d9` | badge merah |

### Palet data (colorful)
| Peran | Hex | Dipakai untuk |
| --- | --- | --- |
| Biru | `#2563d9` | sumber dana APBN, KPI Dana Masuk, seri "dana masuk", kategori Belanja Barang, badge role Admin |
| Merah aksen | `#ec3013` | KPI Realisasi, seri "pengeluaran", kategori Perjalanan Dinas, badge Super Admin |
| Hijau | `#0e8a5f` | sumber dana Hibah, KPI Sisa Saldo, kategori Pemeliharaan, status Aktif/Lunas, tombol Excel |
| Ungu | `#6d3fd4` | sumber dana PNBP, kategori Honorarium |
| Amber | `#c07a00` | kategori Konsumsi, penanda antrean approval |
| Teal | `#0f7d92` | sumber dana Kerja Sama |
| Tinta | `#201e1d` | KPI Menunggu Approval, tombol sekunder solid |

### Warna status (badge: background + foreground)
| Status | bg | fg |
| --- | --- | --- |
| Menunggu / Belum Lunas | `#f6efe1` | `#8a5600` |
| Disetujui / Lunas / Aktif | `#e2f2ea` | `#0b6b49` |
| Ditolak | `#ffe0d9` | `#ae1800` |

### Tipografi
- Satu keluarga: **Archivo** (Google Fonts, weight 400/500/600/700/800). Ganti `Inter` + `JetBrains_Mono` di `src/app/layout.tsx` dengan `Archivo` sebagai `--font-sans`; angka tidak lagi butuh font mono.
- Angka memakai `font-variant-numeric: tabular-nums` (set di container root).
- Skala yang dipakai:

| Peran | size / weight / letter-spacing |
| --- | --- |
| Judul halaman (topbar) | 24px / 800 / -0.025em / line-height 1.1 |
| Subjudul topbar | 12.5px / 400 / — / warna `--text-muted` |
| Judul kartu / section | 16–17px / 800 / -0.02em |
| Angka KPI | 32px / 800 / -0.035em / line-height 1 |
| Angka besar (detail, RAB total) | 24–26px / 800 / -0.03em |
| Label uppercase | 10–10.5px / 700 / letter-spacing 0.1–0.12em / uppercase |
| Header tabel | 10px / 700 / 0.1em / uppercase / `--text-muted` |
| Sel tabel | 13px / 400–600 |
| Teks baris utama | 13.5px / 600–700 |
| Meta baris | 11.5–12px / 400 / `--text-muted` |
| Tombol | 12–14px / 700 |

### Bentuk, spacing, elevasi
- **Border-radius: 0 di mana pun.** Hapus `--radius: 0.375rem`; semua komponen shadcn harus di-override jadi `rounded-none`.
- **Tanpa shadow.** Struktur dibentuk garis: border kartu `2px solid var(--divider)`, pemisah baris `1px solid #d7d3d3`, rule antar section `2px`.
- Spacing: 4 / 8 / 12 / 16 / 20 / 24 / 32px. Padding kartu 18px, padding sel tabel 11px vertikal (16px pada kolom tepi, 8px kolom tengah), padding halaman 20px atas/bawah 24px kiri/kanan.
- Rail kiri: lebar **76px**, sticky, `border-right: 2px solid var(--divider)`.

---

## Screens / Views

Semua layar memakai shell yang sama: **rail ikon 76px** (kiri, sticky, full height) + **topbar sticky** (judul, subjudul, tombol Buku, aksi primer merah) + area konten `padding: 20px 24px 32px`, `display:flex; flex-direction:column; gap:20px`.

### Shell — Rail navigasi
Ganti `src/components/layout/Sidebar.tsx` (232px, gelap-terang, label horizontal) dengan rail 76px:
- Logo: kotak 40×40 `#ec3013`, ikon wallet putih stroke 2, margin-bottom 10px.
- Item: lebar 56px, `padding: 8px 0 6px`, kolom `flex`, ikon 19px stroke 1.75 di atas label 8.5px/700 di bawah, `gap: 4px`, teks center.
- Aktif: background `#201e1d`, teks `#f3f2f2`. Non-aktif: teks `#605d5d`, hover background `#eae9e9`.
- Urutan & label pendek: Dash, Dana, Keluar, Pinjam, Invoice, Kwitansi, RAB, Laporan, Master, User, Setting. Item **User** tetap hanya untuk `super_admin` (logika lama dipertahankan).
- `/dana/[id]` menandai item **Dana** sebagai aktif.

### Shell — Topbar
Background `#ffffff`, `border-bottom: 2px solid var(--divider)`, `padding: 14px 24px`, `display:flex; gap:16px; flex-wrap:wrap`, sticky `top:0; z-index:10`.
Kiri: judul 24px/800 + subjudul 12.5px. Kanan: tombol outline "Buku 2026 ▾" (di implementasi = `Select` buku yang sudah ada), lalu tombol aksi primer merah.

Judul / subjudul / aksi primer per rute:

| Rute | Judul | Subjudul | Aksi primer |
| --- | --- | --- | --- |
| `/dashboard` | Dashboard | Keuangan Direktorat · Buku {nama} | + Pengeluaran |
| `/dana` | Dana Masuk | {n} sumber dana aktif · Buku {nama} | + Dana Baru |
| `/dana/[id]` | {nama dana} | {sumber} · masuk {tanggal} | + Pemasukan |
| `/pengeluaran` | Pengeluaran | {n} transaksi · Buku {nama} | + Pengeluaran |
| `/peminjaman` | Peminjaman | {n} peminjam · {m} belum lunas | + Peminjaman |
| `/invoice` | Invoice | {n} invoice · {m} belum dibayar | + Invoice |
| `/kwitansi` | Kwitansi | {n} kwitansi diterbitkan | + Kwitansi |
| `/rab` | RAB | Rencana Anggaran Biaya · {tahun} | + RAB |
| `/laporan` | Laporan | Periode {dari} – {sampai} | Cetak |
| `/master-data` | Master Data | Kategori & sumber dana | + Data |
| `/pengguna` | Pengguna | {n} akun terdaftar | + Pengguna |
| `/pengaturan` | Pengaturan | Identitas & buku anggaran | Simpan |

Tombol: outline = `padding: 8px 12px; border: 1px solid var(--divider); font-size:13px; font-weight:700`, hover `background:#eae9e9`. Primer = sama tapi `background:#ec3013; color:#f3f2f2`, hover `#dd2b0f`. Semua label **rata kiri**, tanpa radius.

### 1. Dashboard (`/dashboard`)
Struktur: KPI strip → dua kolom (Alokasi per Dana | Approval + Kategori).

**KPI strip** — `grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap:16px`. Empat kartu blok warna penuh, `padding:18px`, isi kolom `gap:12px`:
1. baris label: label uppercase 10.5px/700/0.12em (opacity .85) + ikon 17px kanan (opacity .8);
2. angka: "Rp" 13px/600 + nilai 32px/800/-0.035em + satuan 15px/700;
3. baris delta: nilai tebal + keterangan, 12px.

| Kartu | bg | fg | nilai contoh | delta / sub |
| --- | --- | --- | --- | --- |
| Total Dana Masuk | `#2563d9` | `#ffffff` | 1,85 M | ↑ 12,4% vs bulan lalu |
| Realisasi | `#ec3013` | `#ffffff` | 1,21 M | 65,4% dari alokasi |
| Sisa Saldo | `#0e8a5f` | `#ffffff` | 640,0 jt | 34,6% tersedia |
| Menunggu Approval | `#201e1d` | `#f3f2f2` | 86,4 jt | 4 transaksi perlu ditinjau |

**Dua kolom**: `grid-template-columns: repeat(auto-fit, minmax(300px,1fr)); gap:16px; align-items:start`.

*Alokasi per Dana* — kartu putih border 2px. Header `padding:14px 18px`, judul 16px/800 + link "Lihat semua →" 12.5px/700 warna `#ae1800`. Tiap baris (bukan tabel — daftar, agar tidak pernah terpotong): `padding:13px 18px`, border-bottom 1px `#d7d3d3`, hover `#f8f4f4`, klik → `/dana/{id}`. Isi baris: kotak warna 10×10 sesuai sumber + nama dana 13.5px/700 + badge sumber (10px/700 uppercase, bg `#eae9e9`, teks `#444141`), kanan "{sisa} sisa" 13px/800; baris kedua: track 9px `#eae9e9` + fill warna sumber, persen 11.5px/700, "{terpakai} / {alokasi}" 11.5px `--text-muted`.

*Menunggu Approval* — header dengan badge "{n} antre" (`bg #ffe0d9`, `color #ae1800`, 10px/800 uppercase). Tiap item: strip vertikal 4px `#c07a00` di kiri, uraian 13.5px/700 + jumlah 14px/800 (nowrap) di kanan, meta 11.5px, lalu dua tombol: **Setujui** (`bg #201e1d`, teks `#f3f2f2`) dan **Tolak** (outline) — 5px 10px, 11.5px/700. Kosong → "Semua pengajuan sudah diproses." 13px, center, padding 26px.

*Pengeluaran per Kategori* — kartu putih padding 18px; tiap baris: nama kategori 12.5px/600 lebar tetap 118px, bar `height:16px` di track `#eae9e9` dengan warna kategori, nilai 12px/700 rata kanan lebar 62px.

### 2. Dana Masuk (`/dana`)
Grid kartu: `repeat(auto-fit, minmax(280px,1fr)); gap:16px`. Kartu putih, border 2px, **border-top 6px warna sumber**, padding 18px, hover `#f8f4f4`, klik → detail. Isi: nama dana 17px/800 + badge sumber solid warna sumber (teks putih); dua kolom angka (Alokasi, Sisa) label uppercase 10px + nilai 18px/800 (Sisa diberi warna sumber); bar realisasi 9px; kaki "Terpakai {x} · {pct} · {tanggal}" 12px.

### 3. Detail Dana (`/dana/[id]`)
Empat kartu statistik `repeat(auto-fit, minmax(200px,1fr))`, padding 16px, label uppercase 10.5px + nilai 26px/800: **Alokasi** (warna sumber), **Terpakai** (`#ec3013`), **Sisa** (`#0e8a5f`), **Realisasi %** (`#201e1d`). Di bawahnya tabel "Transaksi Dana Ini" — kolom Tanggal / Uraian / Jenis / Jumlah; Jenis = badge solid (Masuk hijau, Keluar merah), Jumlah 800 diwarnai sama. `min-width` tabel 520px di dalam wrapper `overflow-x:auto`.

### 4. Pengeluaran (`/pengeluaran`)
Baris filter: kartu putih `padding:16px 18px`, label "FILTER" uppercase, lalu chip **Semua / Menunggu / Disetujui / Ditolak** (`padding:7px 12px`, 12.5px/700; aktif = bg `#201e1d` teks `#f3f2f2`, non-aktif = putih border `--divider`), spacer, ringkasan "{n} transaksi · {total}" 12.5px kanan.
Tabel: kolom Tanggal / Uraian (+nama dana 11.5px di baris kedua) / Kategori (badge solid warna kategori, teks putih) / Status (badge status) / Jumlah (800, rata kanan). `min-width: 620px`, wrapper `overflow-x:auto`, semua sel angka & badge `white-space: nowrap`.

### 5. Peminjaman (`/peminjaman`)
Grid kartu `repeat(auto-fit, minmax(290px,1fr))`. Kartu: nama peminjam 17px/800 + jabatan/unit 12px, badge status kanan atas; jumlah 24px/800; baris meta "{tanggal} · {nama dana}"; dua tombol: **Tandai Lunas** (solid tinta) dan **Cetak Bukti** (outline).

### 6. Invoice (`/invoice`)
Dua kolom `repeat(auto-fit, minmax(520px,1fr))` — **minmax besar ini penting**: preview invoice tidak boleh berbagi baris sebelum ada ruang, kalau tidak kolom Jumlah terpotong.
*Kiri — daftar*: tiap baris strip 4px warna status (hijau Lunas / merah Belum Dibayar), nomor 13px/800, "{penerima} · {tanggal}" 12px, kanan total 14px/800 + status 10.5px/700 uppercase berwarna. Baris terpilih background `#f8f4f4`.
*Kanan — preview*: padding 22px. Header "INVOICE" 26px/800 + "{nomor} · {tanggal}" 12.5px `nowrap`; kanan blok "Jatuh Tempo". Blok Dari / Kepada dua kolom `minmax(180px,1fr)`. Tabel item (`min-width:300px`, padding sel 10px/6px): Uraian / Qty / Harga / Jumlah. Total di kanan: Subtotal, Pajak 11%, lalu **Total** 20px/800 warna `#ec3013` di atas rule 2px.

### 7. Kwitansi (`/kwitansi`)
Grid `repeat(auto-fit, minmax(330px,1fr))`. Kartu: header tinta (`#201e1d`, teks `#f3f2f2`) bertulis "KWITANSI" 15px/800 letter-spacing .06em + nomor kanan; badan padding 18px: "Telah diterima dari" + nama 14px/700; blok jumlah background `#ffe0d9` — label `#ae1800` 10px uppercase, angka 26px/800 `#ae1800`, terbilang 11.5px `#7c1405`; "Untuk pembayaran"; kaki tanggal + nama penerima dipisah garis 1px.

### 8. RAB (`/rab`)
Kartu tunggal. Header: judul RAB 19px/800, meta "{nomor} · {tanggal} · Disusun {penyusun}", kanan "TOTAL RAB" + angka 24px/800 `#ec3013`. Tabel `min-width:620px`: Kategori (badge solid warna kategori) / Uraian / Volume / Harga Satuan / Jumlah (800).

### 9. Laporan (`/laporan`)
Baris periode: dua kotak tanggal outline + "s/d", spacer, tombol **Unduh PDF** (solid tinta) dan **Unduh Excel** (solid `#0e8a5f`) — keduanya menyambung ke `PDFExportButton` dan `excel-export-button` yang sudah ada.
Grafik batang "Dana Masuk vs Pengeluaran": tinggi 180px, satu grup per bulan (`flex:1`), dua batang bersebelahan `gap:4px` — biru `#2563d9` (masuk) dan merah `#ec3013` (keluar), tinggi = persen terhadap nilai maksimum; label bulan 11.5px/700 di bawah. Legenda di bawah grafik.
Di bawahnya kartu ringkasan kategori `repeat(auto-fit, minmax(230px,1fr))` dengan **border-left 6px** warna kategori: nama 12.5px/700, total 22px/800, "{share}% dari total pengeluaran" 11.5px.

### 10. Master Data (`/master-data`)
Dua kartu berdampingan `minmax(280px,1fr)`: **Kategori Pengeluaran** dan **Sumber Dana**. Header kartu + tombol merah "+ Tambah". Tiap baris: kotak warna 10×10 + nama 13.5px/600, kanan info pemakaian 12px `--text-muted`.

### 11. Pengguna (`/pengguna`)
Tabel `min-width:520px`: Nama (700) / Email / Peran (badge solid — Super Admin `#ec3013`, Admin `#2563d9`) / Status (teks 700 — Aktif `#0e8a5f`, Nonaktif `#7d7979`).

### 12. Pengaturan (`/pengaturan`)
Dua kartu: **Identitas Direktorat** (field Nama Direktorat, Penanggung Jawab, Alamat, Buku Aktif — label uppercase 10.5px di atas input border 1px padding 10px/12px, background `#f8f4f4`) + tombol merah "Simpan Perubahan" rata kiri; **Buku Anggaran** — daftar buku dengan nama 13.5px/700 dan info "{status} · {n} transaksi".

### 13. Login (`/login`)
Dua panel dalam satu border 2px, `repeat(auto-fit, minmax(300px,1fr))`, min-height 460px.
Kiri: **panel merah penuh** `#ec3013`, teks `#f3f2f2`, padding 36px, `justify-content: space-between` — logo (kotak 34px `#f3f2f2` + wordmark 19px/800), headline 38px/800/-0.035em ("Satu buku untuk seluruh keuangan direktorat."), paragraf 13px.
Kanan: panel putih padding 36px — "Masuk" 24px/800, subteks, field Email & Kata Sandi (label uppercase + input border 1px padding 11px/12px), tombol merah penuh lebar-konten "Masuk ke Dashboard" 14px/800 **rata kiri**, lalu "Lupa kata sandi? Hubungi super admin." 12px.

### 14. Mobile (breakpoint < 768px)
- Rail 76px disembunyikan; ganti header atas tinta 12px/14px dengan logo + nama + "Buku {nama}" di kanan.
- KPI jadi baris penuh: satu blok warna per KPI, label uppercase kiri + angka ringkas 18px/800 kanan, `gap:10px`.
- Panel approval versi ringkas: uraian + jumlah satu baris, dua tombol **Setujui/Tolak** masing-masing `flex:1`, tinggi ≥44px.
- **Bottom tab bar** 4 item (Dash, Dana, Keluar, Lapor): grid 4 kolom, border-top 2px, item tinggi min 52px, ikon 18px + label 9.5px/700, aktif `#ec3013`.
- Form input cepat: header merah "Pengeluaran Baru", field bertinggi ≥44px, tombol simpan solid tinta lebar penuh 14px/800.

---

## Interactions & Behavior
- **Navigasi rail** — `Link` Next.js seperti sekarang; state aktif dari `usePathname()`; `BOOK_SCOPED_PATHS` tetap membawa `?buku=`.
- **Buku switcher** — tetap `Select` shadcn + dialog "Buku Baru" yang sudah ada; hanya restyle (radius 0, border 1px `--divider`, tinggi 38px).
- **Filter status pengeluaran** — chip mengubah query/state; tabel dan ringkasan "{n} transaksi · {total}" ikut berubah.
- **Approval** — tombol Setujui/Tolak memanggil mutasi yang sudah ada (`use-supabase-mutation`, optimistic via `use-optimistic`); item hilang dari antrean setelah diproses, badge "{n} antre" berkurang, empty state muncul saat habis.
- **Klik baris dana** → `/dana/{id}`; **klik baris invoice** → memuat preview di kolom kanan.
- **Hover**: baris tabel/daftar `#f8f4f4`; tombol outline `#eae9e9`; tombol primer `#dd2b0f`; item rail `#eae9e9`.
- **Focus**: `:focus-visible { outline: 2px solid #ec3013; outline-offset: 2px; }` — jangan biarkan ring biru bawaan.
- **Transisi**: hanya `background-color`/`color` 120ms; tanpa animasi masuk selain fade halus yang sudah ada.
- **Loading**: pertahankan `src/components/skeletons.tsx`, sesuaikan jadi blok abu `#eae9e9` tanpa radius.
- **Toast**: `sonner` tetap, radius 0.

### Aturan anti-terpotong (wajib)
Ini requirement eksplisit dari pemilik produk. Terapkan di semua layar:
1. Semua grid multi-kolom memakai `repeat(auto-fit, minmax(X,1fr))` dengan X cukup besar sehingga isi tidak pernah terjepit — jangan `grid-cols-4` kaku.
2. Bila jumlah item bisa tidak memenuhi baris terakhir, **jangan gambar garis lewat background container** (akan tampak blok abu kosong); gambar garis per sel (border/box-shadow) di atas container putih.
3. Semua sel angka, badge, tanggal, dan tombol: `white-space: nowrap`.
4. Setiap `<table>` dibungkus `overflow-x: auto` dan diberi `min-width` yang muat isinya (nilai per layar tercantum di atas).
5. Teks panjang memakai `text-wrap: pretty`; hindari tinggi tetap pada kotak berisi teks.

## State Management
Tidak ada state baru. Yang dipakai ulang: `searchParams.buku` (buku aktif), filter status pengeluaran (query param atau state lokal client component), invoice terpilih (state lokal `InvoiceClient`), status approval (mutasi Supabase + optimistic), profil user & role (fetch di `Sidebar`/layout seperti sekarang). Semua angka di prototipe adalah contoh — sumbernya tetap query Supabase yang ada di masing-masing `page.tsx`.

## Assets
Tidak ada aset biner. Semua ikon **Lucide** (sudah dipakai repo, `lucide-react`) pada 17–19px stroke 1.75–2. Logo = kotak merah 40×40 berisi ikon `Wallet` putih (SVG inline di prototipe boleh diganti komponen Lucide). Font **Archivo** dari Google Fonts via `next/font/google`.

## Files
- `code/` — **file TypeScript/React siap tempel** (Next.js App Router, Tailwind v4): token `globals.css`, font Archivo, `lib/tokens.ts` (palet data, map status, formatter rupiah, helper `autoGrid`), shell (`Sidebar` rail 76px, `Topbar` + `BarButton`, `MobileTabBar`), primitif presentasi (`StatCard`, `StatusBadge`/`SolidBadge`, `TableWrap`/`Th`/`Td`, `ProgressBar`), dan body Dashboard (`AlokasiList`, `ApprovalQueue`, `KategoriBars`, `DashboardBody`). Baca `code/README.md` untuk urutan pemasangan. Komponen ini **tidak mengambil data sendiri** — semua props; query Supabase tetap di `page.tsx` masing-masing.
- `CatatUang App.dc.html` — prototipe lengkap 14 layar, rail berfungsi, filter/approval/detail bisa diklik. **Referensi utama.**
- `reference-dashboard-v2.dc.html` — varian dashboard alternatif (sidebar 240px gelap dengan label), disertakan sebagai pembanding saja.

Buka file `.dc.html` langsung di browser untuk melihat desain.

### Peta ke file repo yang perlu disentuh
| Desain | File repo |
| --- | --- |
| Token & base style | `src/app/globals.css`, `src/app/layout.tsx` (font) |
| Rail + shell | `src/components/layout/Sidebar.tsx`, `src/components/layout/DashboardShell.tsx` |
| Dashboard | `src/app/(dashboard)/dashboard/page.tsx` |
| Dana + detail | `src/app/(dashboard)/dana/DanaClient.tsx`, `dana/[id]/DanaDetailClient.tsx` |
| Pengeluaran | `src/app/(dashboard)/pengeluaran/PengeluaranClient.tsx` |
| Peminjaman | `src/app/(dashboard)/peminjaman/PeminjamanClient.tsx` |
| Invoice | `src/app/(dashboard)/invoice/InvoiceClient.tsx` |
| Kwitansi | `src/app/(dashboard)/kwitansi/KwitansiClient.tsx` |
| RAB | `src/app/(dashboard)/rab/RabClient.tsx` |
| Laporan | `src/app/(dashboard)/laporan/LaporanClient.tsx` + `PDFExportButton.tsx` |
| Master Data | `src/app/(dashboard)/master-data/MasterDataClient.tsx` |
| Pengguna | `src/app/(dashboard)/pengguna/PenggunaClient.tsx` |
| Pengaturan | `src/app/(dashboard)/pengaturan/PengaturanClient.tsx` |
| Login | `src/app/login/page.tsx` |
| Primitif | `src/components/ui/*` (radius 0, border `--divider`, focus merah) |

### Urutan implementasi yang disarankan
1. Token + font + override `src/components/ui/*` (radius 0, warna, focus ring).
2. Shell: rail 76px + topbar + responsif mobile.
3. Dashboard (pola kartu, daftar, bar, badge lahir di sini).
4. Tabel-tabel: Pengeluaran → Detail Dana → RAB → Pengguna.
5. Kartu: Dana, Peminjaman, Kwitansi.
6. Invoice (dua kolom + preview) dan Laporan (grafik + ekspor).
7. Master Data, Pengaturan, Login.
8. Pass terakhir: cek setiap layar pada lebar 360 / 768 / 1024 / 1440 px untuk aturan anti-terpotong.
