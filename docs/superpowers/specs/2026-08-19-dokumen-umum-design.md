# Dokumen Umum: Invoice, Kwitansi, RAB — Design

## Context

CatatUang already tracks Pengeluaran/Pemasukan (book-scoped ledger) and Peminjaman (loan tracking with a printable legal PDF, standalone from balances but still scoped to a `dana_masuk` wallet and pre-fillable from a Pengaturan identity). The user asked for three more document-generation features — Invoice, Kwitansi (receipt), and RAB (Rencana Anggaran Biaya / budget plan) — explicitly **general-purpose**, not branded to any institution ("jangan buat atas nama lembaga apapun buat menjadi general saja"), unlike Peminjaman's surat which names "Koperasi Kantin Kolam Renang UNESA" throughout.

Resolved via brainstorming Q&A:
- All three persist to the database with a list/history, matching the existing Pengeluaran/Pemasukan/Peminjaman CRUD-table pattern (not one-shot forms).
- All three are **standalone/global** — not tied to any Buku or wallet. They don't appear in book-scoped queries and aren't affected by the Buku switcher.
- All three are **pure documents** — creating/editing/deleting one never touches `dana_masuk`/`pemasukan`/`pengeluaran`. No option to auto-post to a ledger.
- Document numbers (No. Invoice / No. Kwitansi / No. RAB) are auto-generated but editable.
- Issuer/preparer identity fields are always typed in manually per document — no Pengaturan-backed default (deliberately different from Peminjaman's `pihak_pertama_*` settings, since these tools are meant to be usable for any party, not just one recurring lender).
- Invoice includes tax (PPN) and discount, both as percentages affecting the total.
- RAB items are grouped by category (free-text `kategori` per item, not a separate category table) with per-category subtotals and a grand total.
- Invoice has a payment status (`belum_dibayar` / `lunas`), toggle-by-click badge like Peminjaman's `belum_lunas`/`lunas`.
- Kwitansi can optionally reference an Invoice (pre-fills payer name and amount) but works standalone too.
- Sidebar gets three separate top-level nav items (Invoice, Kwitansi, RAB) — not grouped under one "Dokumen" menu.

## Data model

Three new tables, all following the exact RLS pattern already used by every table in this app (`ENABLE ROW LEVEL SECURITY`, single `authenticated_select` policy granting all operations to any authenticated user — this app has no per-row ownership model, only the `super_admin` vs `admin` role gate enforced in application code for user-management actions). Line items are stored as a JSONB array column rather than a child table: nothing outside PDF rendering and the list-total column ever needs to query a single line item independent of its parent document, so a child table would only add CRUD surface without benefit.

```sql
CREATE TABLE IF NOT EXISTS public.invoice (
  id              BIGSERIAL PRIMARY KEY,
  nomor           TEXT NOT NULL,
  tanggal         DATE NOT NULL,
  jatuh_tempo     DATE,
  status          TEXT NOT NULL DEFAULT 'belum_dibayar', -- 'belum_dibayar' | 'lunas'
  penerbit_nama     TEXT NOT NULL,
  penerbit_jabatan  TEXT,
  penerbit_instansi TEXT,
  penerima_nama     TEXT NOT NULL,
  penerima_instansi TEXT,
  penerima_alamat   TEXT,
  items           JSONB NOT NULL DEFAULT '[]', -- [{uraian, qty, harga_satuan}]
  diskon_persen   NUMERIC(5,2) NOT NULL DEFAULT 0,
  pajak_persen    NUMERIC(5,2) NOT NULL DEFAULT 0,
  catatan         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  id             BIGSERIAL PRIMARY KEY,
  nomor          TEXT NOT NULL,
  judul          TEXT NOT NULL,
  tanggal        DATE NOT NULL,
  penyusun_nama     TEXT NOT NULL,
  penyusun_jabatan  TEXT,
  items          JSONB NOT NULL DEFAULT '[]', -- [{kategori, uraian, volume, satuan, harga_satuan}]
  catatan        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kwitansi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rab ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_select" ON public.invoice;
DROP POLICY IF EXISTS "authenticated_select" ON public.kwitansi;
DROP POLICY IF EXISTS "authenticated_select" ON public.rab;
CREATE POLICY "authenticated_select" ON public.invoice  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_select" ON public.kwitansi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_select" ON public.rab      FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

Migration file: `supabase/migrate_dokumen_umum.sql`, idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`), matching every prior migration this session.

Computed values (never stored, always derived from `items` at render/display time, so there's no risk of a stored total drifting from its line items):
- Invoice: `subtotal = Σ(qty × harga_satuan)`; `diskon_nominal = subtotal × diskon_persen / 100`; `dpp = subtotal − diskon_nominal`; `pajak_nominal = dpp × pajak_persen / 100`; `total = dpp + pajak_nominal`.
- RAB: per-category `subtotal = Σ(volume × harga_satuan)` for items sharing that `kategori`; `grandTotal = Σ` all subtotals.
- Kwitansi: `terbilang(jumlah)` via the existing `terbilang()` util in `src/lib/formatters.ts`.

## Types (`src/lib/types.ts`)

```ts
export type InvoiceItem = { uraian: string; qty: number; harga_satuan: number }
export type StatusInvoice = 'belum_dibayar' | 'lunas'
export type Invoice = {
  id: number; nomor: string; tanggal: string; jatuh_tempo: string | null
  status: StatusInvoice
  penerbit_nama: string; penerbit_jabatan: string | null; penerbit_instansi: string | null
  penerima_nama: string; penerima_instansi: string | null; penerima_alamat: string | null
  items: InvoiceItem[]
  diskon_persen: number; pajak_persen: number
  catatan: string | null
  created_at: string; updated_at: string
}

export type Kwitansi = {
  id: number; nomor: string; tanggal: string; invoice_id: number | null
  diterima_dari: string; jumlah: number; untuk_pembayaran: string
  penerima_nama: string; penerima_jabatan: string | null
  catatan: string | null
  created_at: string; updated_at: string
}

export type RabItem = { kategori: string; uraian: string; volume: number; satuan: string; harga_satuan: number }
export type Rab = {
  id: number; nomor: string; judul: string; tanggal: string
  penyusun_nama: string; penyusun_jabatan: string | null
  items: RabItem[]
  catatan: string | null
  created_at: string; updated_at: string
}
```

## Numbering helper (`src/lib/nomorDokumen.ts`)

```ts
export async function generateNomor(
  supabase: SupabaseClient, table: 'invoice' | 'kwitansi' | 'rab', prefix: string
): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`)
  return `${prefix}/${year}/${String((count ?? 0) + 1).padStart(3, '0')}`
}
```
Called client-side when opening the "create" dialog to pre-fill the `nomor` field (editable, not locked) — same low-volume-admin-tool tradeoff as everywhere else in this app; a rare double-create race producing a duplicate number is acceptable and correctable by hand, not worth a DB sequence.

## Pages

Three new routes, none book-scoped (no `resolveBuku`, no `?buku=` param, not added to `BOOK_SCOPED_PATHS`):

- `src/app/(dashboard)/invoice/page.tsx` + `InvoiceClient.tsx`
- `src/app/(dashboard)/kwitansi/page.tsx` + `KwitansiClient.tsx`
- `src/app/(dashboard)/rab/page.tsx` + `RabClient.tsx`

Each server `page.tsx` is a thin fetch-and-pass (`select('*').order('tanggal', { ascending: false })`), no join needed since nothing is book-scoped. Kwitansi's page additionally fetches a slim `invoice` list (`id, nomor, penerima_nama, items, diskon_persen, pajak_persen`) for the optional picker.

Each `*Client.tsx` mirrors `PeminjamanClient.tsx`'s shape: table list, create/edit `Dialog` form, delete-confirm `Dialog`, client-side PDF print button (`pdf(doc).toBlob()` → `URL.createObjectURL` → `<a download>`, same as every other PDF export in this app).

**Invoice & RAB forms** additionally need a line-item mini-editor inside the dialog — a `useState<Item[]>` array with an "+ Tambah Item" row button and a per-row remove button, each row rendering `uraian`/qty-or-volume/satuan(RAB only)/harga_satuan inputs. This is new UI in this codebase (no existing multi-row form), built from plain `Input`s in a flex row, not a new abstraction.

**Kwitansi form**: flat fields (diterima_dari, jumlah, untuk_pembayaran, penerima_nama/jabatan, tanggal) plus an optional Invoice `Select` at the top; choosing one sets `diterima_dari` from `penerima_nama` and `jumlah` from the invoice's computed total, both still editable afterward.

## PDF templates (`src/components/pdf/`)

`InvoicePDF.tsx`, `KwitansiPDF.tsx`, `RabPDF.tsx` — new `@react-pdf/renderer` documents following `PeminjamanPDF.tsx`'s `StyleSheet`/`Document`/`Page` structure and the tightened single-page spacing already tuned there. Unlike `PeminjamanPDF`, these are **not** legal-boilerplate documents — they're structured business documents:

- **InvoicePDF**: header (INVOICE, nomor, tanggal, jatuh tempo), two-column Dari/Kepada block, an items table (Uraian, Qty, Harga Satuan, Subtotal), then a right-aligned totals block (Subtotal, Diskon, Pajak, **Total**), footer catatan + signature line for `penerbit_nama`.
- **KwitansiPDF**: compact single-page receipt — "Telah terima dari: {diterima_dari}", "Jumlah: {formatRupiah(jumlah)}" with "Terbilang: {terbilang(jumlah)} Rupiah" beneath it, "Untuk pembayaran: {untuk_pembayaran}", signature block for `penerima_nama`/`penerima_jabatan`. Same layout family as the amount block already built for `PeminjamanPDF`.
- **RabPDF**: header (RAB, judul, nomor, tanggal), items table grouped by `kategori` (a bold category-header row, its items, a subtotal row), grand total row at the bottom, signature line for `penyusun_nama`/`penyusun_jabatan`.

Every identity field (issuer, recipient, preparer) is a prop sourced from the document's own row — no institution name, address, or logo hardcoded anywhere in these three templates.

## Sidebar (`src/components/layout/Sidebar.tsx`)

Three new `navItems` entries, `superAdminOnly: false`, none added to `BOOK_SCOPED_PATHS`:
```ts
{ href: '/invoice',   label: 'Invoice',   icon: FileText,    superAdminOnly: false },
{ href: '/kwitansi',  label: 'Kwitansi',  icon: ReceiptText, superAdminOnly: false },
{ href: '/rab',       label: 'RAB',       icon: ClipboardList, superAdminOnly: false },
```
(`FileText`, `ReceiptText`, `ClipboardList` all confirmed present in the installed `lucide-react` version and unused elsewhere in `Sidebar.tsx`.)

## Validation (`src/lib/validation.ts`)

Required-field checks inline in each Client's `handleSave` (same style as `PeminjamanClient.handleSave`, not a shared zod schema — this app mixes both approaches and inline checks are what the most recent feature, Peminjaman, used):
- Invoice: `nomor`, `tanggal`, `penerbit_nama`, `penerima_nama`, at least one item with non-empty `uraian` and `harga_satuan > 0`.
- Kwitansi: `nomor`, `tanggal`, `diterima_dari`, `jumlah > 0`, `untuk_pembayaran`, `penerima_nama`.
- RAB: `nomor`, `judul`, `tanggal`, `penyusun_nama`, at least one item with non-empty `kategori`/`uraian` and `harga_satuan > 0`.

## Out of scope

- No auto-posting to `pemasukan`/`pengeluaran` from any of these three (confirmed).
- No Pengaturan-backed default identity for issuer/preparer fields (confirmed — deliberately different from Peminjaman).
- No PDF preview-before-download step; matches the existing one-click download pattern used everywhere else.
- No multi-currency, no recurring/templated invoices, no email delivery — none requested.
