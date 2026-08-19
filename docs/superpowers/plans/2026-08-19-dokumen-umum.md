# Dokumen Umum: Invoice, Kwitansi, RAB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three standalone, general-purpose document generators — Invoice, Kwitansi (receipt), RAB (budget plan) — to CatatUang, each with a CRUD list/dialog and a one-click PDF export, following the existing Peminjaman feature's pattern exactly but with zero institution branding and zero ledger impact.

**Architecture:** Three new Supabase tables (`invoice`, `kwitansi`, `rab`), none book-scoped, none referencing `dana_masuk`/`pemasukan`/`pengeluaran`. Each gets a Next.js server `page.tsx` (thin fetch) + client `*Client.tsx` (table list, create/edit `Dialog`, delete-confirm `Dialog`, PDF print button) under `src/app/(dashboard)/<route>/`, plus a `@react-pdf/renderer` template under `src/components/pdf/`. Shared math (`computeInvoiceTotals`, `groupRabByKategori`, `computeRabGrandTotal`) and document numbering (`generateNomor`) live in `src/lib/` so the on-screen preview and the PDF never compute a total two different ways.

**Tech Stack:** Next.js 16 App Router (Turbopack), TypeScript, Supabase (Postgres + PostgREST + RLS), `@base-ui/react` Select/Dialog primitives (shadcn-style wrappers in `src/components/ui/`), `@react-pdf/renderer`, `sonner` toasts, Tailwind CSS.

## Global Constraints

- No institution name, logo, or address hardcoded anywhere in `InvoicePDF.tsx`, `KwitansiPDF.tsx`, or `RabPDF.tsx` — every identity field (issuer, recipient, preparer) is a prop sourced from the document's own database row. This is the entire point of the feature ("jangan buat atas nama lembaga apapun buat menjadi general saja").
- `invoice`, `kwitansi`, and `rab` tables carry no `buku_id` / `dana_id` and are never added to `BOOK_SCOPED_PATHS` in `src/components/layout/Sidebar.tsx` — they are global, not book-scoped.
- Creating, editing, or deleting a row in any of the three new tables must never write to `pemasukan`, `pengeluaran`, or `dana_masuk` — pure documents, no ledger side effects.
- RLS on every new table: `ENABLE ROW LEVEL SECURITY` plus a single `authenticated_select` policy granting `FOR ALL TO authenticated USING (true) WITH CHECK (true)` — identical to every existing table's policy (see `supabase/migrate_peminjaman.sql`). This app has no per-row ownership model.
- This repository has no automated test framework (`package.json` has no `jest`/`vitest`; confirmed via `cat package.json`). Verification throughout this plan is `npx tsc --noEmit`, `npm run lint`, `npm run build`, and live Playwright smoke scripts run against the dev server on `http://localhost:3000` — the same approach used for every feature already in this codebase (Peminjaman, Buku switcher, etc.).
- **The Supabase project behind this app is live production data used by real people.** Every test record created by a verification script in this plan must be deleted via the service-role REST API in the same task, before moving on. Never touch the real `peminjaman` row for "Rudianto" or any other pre-existing record.
- Currency is always formatted via `formatRupiah()` from `src/lib/formatters.ts`, never via `Intl.NumberFormat({ style: 'currency' })` directly — the latter caused a real SSR hydration bug earlier in this project's history.
- All UI copy is Indonesian, matching the existing tone (`"wajib diisi"`, `"Tindakan ini tidak dapat dibatalkan"`, etc.).
- Dev login used for every Playwright verification script in this plan: email `admin@direktorat.ac.id`, password `usc@_140451`.
- Reading Supabase credentials for REST cleanup calls, used throughout this plan:
  ```bash
  URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
  KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
  ```

---

## Task 1: Foundation — schema, types, numbering, shared math

**Files:**
- Create: `supabase/migrate_dokumen_umum.sql`
- Modify: `src/lib/types.ts`
- Create: `src/lib/nomorDokumen.ts`
- Create: `src/lib/dokumenTotals.ts`

**Interfaces:**
- Produces: `Invoice`, `InvoiceItem`, `StatusInvoice`, `Kwitansi`, `Rab`, `RabItem` types (consumed by every later task). `generateNomor(supabase: SupabaseClient, table: 'invoice' | 'kwitansi' | 'rab', prefix: string): Promise<string>`. `computeInvoiceTotals(items: InvoiceItem[], diskonPersen: number, pajakPersen: number): { subtotal: number; diskonNominal: number; dpp: number; pajakNominal: number; total: number }`. `groupRabByKategori(items: RabItem[]): { kategori: string; items: RabItem[]; subtotal: number }[]`. `computeRabGrandTotal(items: RabItem[]): number`.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrate_dokumen_umum.sql`:

```sql
-- =============================================================
-- DOKUMEN UMUM: INVOICE, KWITANSI, RAB — Jalankan di Supabase SQL Editor
-- Tiga dokumen umum yang berdiri sendiri (tidak terikat Buku/Wallet
-- manapun) dan tidak memengaruhi saldo — murni dokumen yang bisa
-- dicetak sebagai PDF. Tidak ada identitas lembaga yang di-hardcode;
-- semua field pihak (penerbit/penerima/penyusun) diisi manual per
-- dokumen supaya bisa dipakai untuk keperluan apapun.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.invoice (
  id                BIGSERIAL PRIMARY KEY,
  nomor             TEXT NOT NULL,
  tanggal           DATE NOT NULL,
  jatuh_tempo       DATE,
  status            TEXT NOT NULL DEFAULT 'belum_dibayar', -- 'belum_dibayar' | 'lunas'
  penerbit_nama     TEXT NOT NULL,
  penerbit_jabatan  TEXT,
  penerbit_instansi TEXT,
  penerima_nama     TEXT NOT NULL,
  penerima_instansi TEXT,
  penerima_alamat   TEXT,
  items             JSONB NOT NULL DEFAULT '[]', -- [{uraian, qty, harga_satuan}]
  diskon_persen     NUMERIC(5,2) NOT NULL DEFAULT 0,
  pajak_persen      NUMERIC(5,2) NOT NULL DEFAULT 0,
  catatan           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  id                BIGSERIAL PRIMARY KEY,
  nomor             TEXT NOT NULL,
  judul             TEXT NOT NULL,
  tanggal           DATE NOT NULL,
  penyusun_nama     TEXT NOT NULL,
  penyusun_jabatan  TEXT,
  items             JSONB NOT NULL DEFAULT '[]', -- [{kategori, uraian, volume, satuan, harga_satuan}]
  catatan           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoice  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kwitansi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rab      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_select" ON public.invoice;
DROP POLICY IF EXISTS "authenticated_select" ON public.kwitansi;
DROP POLICY IF EXISTS "authenticated_select" ON public.rab;

CREATE POLICY "authenticated_select" ON public.invoice  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_select" ON public.kwitansi FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_select" ON public.rab      FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Append new types to `src/lib/types.ts`**

Open `src/lib/types.ts` and append at the end of the file (after the existing `Profile` type):

```ts
export type InvoiceItem = { uraian: string; qty: number; harga_satuan: number }
export type StatusInvoice = 'belum_dibayar' | 'lunas'
export type Invoice = {
  id: number
  nomor: string
  tanggal: string
  jatuh_tempo: string | null
  status: StatusInvoice
  penerbit_nama: string
  penerbit_jabatan: string | null
  penerbit_instansi: string | null
  penerima_nama: string
  penerima_instansi: string | null
  penerima_alamat: string | null
  items: InvoiceItem[]
  diskon_persen: number
  pajak_persen: number
  catatan: string | null
  created_at: string
  updated_at: string
}

export type Kwitansi = {
  id: number
  nomor: string
  tanggal: string
  invoice_id: number | null
  diterima_dari: string
  jumlah: number
  untuk_pembayaran: string
  penerima_nama: string
  penerima_jabatan: string | null
  catatan: string | null
  created_at: string
  updated_at: string
}

export type RabItem = { kategori: string; uraian: string; volume: number; satuan: string; harga_satuan: number }
export type Rab = {
  id: number
  nomor: string
  judul: string
  tanggal: string
  penyusun_nama: string
  penyusun_jabatan: string | null
  items: RabItem[]
  catatan: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 3: Write the numbering helper**

Create `src/lib/nomorDokumen.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js'

export async function generateNomor(
  supabase: SupabaseClient,
  table: 'invoice' | 'kwitansi' | 'rab',
  prefix: string
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

- [ ] **Step 4: Write the shared totals math**

Create `src/lib/dokumenTotals.ts`:

```ts
import type { InvoiceItem, RabItem } from './types'

export function computeInvoiceTotals(items: InvoiceItem[], diskonPersen: number, pajakPersen: number) {
  const subtotal = items.reduce((sum, it) => sum + it.qty * it.harga_satuan, 0)
  const diskonNominal = subtotal * diskonPersen / 100
  const dpp = subtotal - diskonNominal
  const pajakNominal = dpp * pajakPersen / 100
  const total = dpp + pajakNominal
  return { subtotal, diskonNominal, dpp, pajakNominal, total }
}

export function groupRabByKategori(items: RabItem[]) {
  const map = new Map<string, RabItem[]>()
  for (const it of items) {
    const key = it.kategori || 'Lainnya'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(it)
  }
  return Array.from(map.entries()).map(([kategori, items]) => ({
    kategori,
    items,
    subtotal: items.reduce((sum, it) => sum + it.volume * it.harga_satuan, 0),
  }))
}

export function computeRabGrandTotal(items: RabItem[]) {
  return items.reduce((sum, it) => sum + it.volume * it.harga_satuan, 0)
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 6: Run the migration in Supabase**

This step cannot be automated — this project's Supabase access is REST-only via a service-role key, with no direct SQL execution. Open the Supabase Dashboard SQL Editor for this project, paste the full contents of `supabase/migrate_dokumen_umum.sql`, and run it. Confirm success by checking the Table Editor shows three new tables: `invoice`, `kwitansi`, `rab`.

Verify from the shell instead of the dashboard if preferred:
```bash
cd "/Volumes/File Home/File Web/CatatUang"
URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
curl -s "${URL}/rest/v1/invoice?select=id&limit=1" -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
curl -s "${URL}/rest/v1/kwitansi?select=id&limit=1" -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
curl -s "${URL}/rest/v1/rab?select=id&limit=1" -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
```
Expected: `[]` from all three (empty array, not a `relation does not exist` error).

- [ ] **Step 7: Commit**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
git add supabase/migrate_dokumen_umum.sql src/lib/types.ts src/lib/nomorDokumen.ts src/lib/dokumenTotals.ts
git commit -m "$(cat <<'EOF'
feat: add data model foundation for invoice/kwitansi/rab documents

Standalone tables (no buku/wallet scoping), shared numbering and
totals-math helpers used by both the CRUD UI and the PDF templates.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Invoice — CRUD page

**Files:**
- Create: `src/app/(dashboard)/invoice/page.tsx`
- Create: `src/app/(dashboard)/invoice/InvoiceClient.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `Invoice`, `InvoiceItem`, `StatusInvoice` from `src/lib/types.ts`; `generateNomor` from `src/lib/nomorDokumen.ts`; `computeInvoiceTotals` from `src/lib/dokumenTotals.ts`; `formatRupiah`, `formatTanggal` from `src/lib/formatters.ts`; `handleSupabaseError` from `src/lib/error-handler.ts`.
- Produces: route `/invoice`, component `InvoiceClient` (no print button yet — added in Task 3).

- [ ] **Step 1: Write the server page**

Create `src/app/(dashboard)/invoice/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { InvoiceClient } from './InvoiceClient'
import type { Invoice } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function InvoicePage() {
  const supabase = await createClient()
  const { data: invoiceList } = await supabase
    .from('invoice')
    .select('*')
    .order('tanggal', { ascending: false })

  return <InvoiceClient invoiceList={(invoiceList || []) as Invoice[]} />
}
```

- [ ] **Step 2: Write the client component**

Create `src/app/(dashboard)/invoice/InvoiceClient.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { generateNomor } from '@/lib/nomorDokumen'
import { computeInvoiceTotals } from '@/lib/dokumenTotals'
import type { Invoice, InvoiceItem, StatusInvoice } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'

type Props = { invoiceList: Invoice[] }

type ItemForm = { uraian: string; qty: string; harga_satuan: string }
const emptyItem: ItemForm = { uraian: '', qty: '1', harga_satuan: '' }

type FormData = {
  nomor: string; tanggal: string; jatuh_tempo: string
  penerbit_nama: string; penerbit_jabatan: string; penerbit_instansi: string
  penerima_nama: string; penerima_instansi: string; penerima_alamat: string
  diskon_persen: string; pajak_persen: string
  catatan: string
}
const emptyForm: FormData = {
  nomor: '', tanggal: '', jatuh_tempo: '',
  penerbit_nama: '', penerbit_jabatan: '', penerbit_instansi: '',
  penerima_nama: '', penerima_instansi: '', penerima_alamat: '',
  diskon_persen: '0', pajak_persen: '0',
  catatan: '',
}

function StatusBadge({ status }: { status: StatusInvoice }) {
  return status === 'lunas'
    ? <span className="cu-badge cu-badge-success cu-badge-dot">Lunas</span>
    : <span className="cu-badge cu-badge-warning cu-badge-dot">Belum Dibayar</span>
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export function InvoiceClient({ invoiceList }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [openForm, setOpenForm] = useState(false)
  const [openDel, setOpenDel] = useState(false)
  const [editTarget, setEditTarget] = useState<Invoice | null>(null)
  const [delTarget, setDelTarget] = useState<Invoice | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [items, setItems] = useState<ItemForm[]>([{ ...emptyItem }])
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const openAdd = async () => {
    setEditTarget(null)
    const nomor = await generateNomor(supabase, 'invoice', 'INV')
    setForm({ ...emptyForm, nomor, tanggal: todayIso() })
    setItems([{ ...emptyItem }])
    setOpenForm(true)
  }

  const openEdit = (inv: Invoice) => {
    setEditTarget(inv)
    setForm({
      nomor: inv.nomor,
      tanggal: inv.tanggal,
      jatuh_tempo: inv.jatuh_tempo || '',
      penerbit_nama: inv.penerbit_nama,
      penerbit_jabatan: inv.penerbit_jabatan || '',
      penerbit_instansi: inv.penerbit_instansi || '',
      penerima_nama: inv.penerima_nama,
      penerima_instansi: inv.penerima_instansi || '',
      penerima_alamat: inv.penerima_alamat || '',
      diskon_persen: String(inv.diskon_persen),
      pajak_persen: String(inv.pajak_persen),
      catatan: inv.catatan || '',
    })
    setItems(inv.items.map(it => ({ uraian: it.uraian, qty: String(it.qty), harga_satuan: String(it.harga_satuan) })))
    setOpenForm(true)
  }

  function updateItem(i: number, patch: Partial<ItemForm>) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  function addItemRow() { setItems(prev => [...prev, { ...emptyItem }]) }
  function removeItemRow(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  const parsedItems: InvoiceItem[] = items
    .filter(it => it.uraian.trim() && Number(it.harga_satuan) > 0)
    .map(it => ({ uraian: it.uraian.trim(), qty: Number(it.qty) || 0, harga_satuan: Number(it.harga_satuan) || 0 }))
  const totals = computeInvoiceTotals(parsedItems, Number(form.diskon_persen) || 0, Number(form.pajak_persen) || 0)

  async function handleSave() {
    if (!form.nomor || !form.tanggal || !form.penerbit_nama || !form.penerima_nama) {
      toast.error('Nomor, tanggal, penerbit, dan penerima wajib diisi')
      return
    }
    if (parsedItems.length === 0) {
      toast.error('Minimal satu item dengan uraian dan harga satuan valid')
      return
    }
    setSaving(true)
    const payload = {
      nomor: form.nomor,
      tanggal: form.tanggal,
      jatuh_tempo: form.jatuh_tempo || null,
      penerbit_nama: form.penerbit_nama,
      penerbit_jabatan: form.penerbit_jabatan || null,
      penerbit_instansi: form.penerbit_instansi || null,
      penerima_nama: form.penerima_nama,
      penerima_instansi: form.penerima_instansi || null,
      penerima_alamat: form.penerima_alamat || null,
      items: parsedItems,
      diskon_persen: Number(form.diskon_persen) || 0,
      pajak_persen: Number(form.pajak_persen) || 0,
      catatan: form.catatan || null,
      updated_at: new Date().toISOString(),
    }
    if (editTarget) {
      const { error } = await supabase.from('invoice').update(payload).eq('id', editTarget.id)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Invoice diperbarui')
    } else {
      const { error } = await supabase.from('invoice').insert({ ...payload, status: 'belum_dibayar' })
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Invoice ditambahkan')
    }
    setSaving(false)
    setOpenForm(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from('invoice').delete().eq('id', delTarget.id)
    if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
    toast.success('Invoice dihapus')
    setSaving(false)
    setOpenDel(false)
    setDelTarget(null)
    router.refresh()
  }

  async function handleToggleStatus(inv: Invoice) {
    setUpdatingId(inv.id)
    const newStatus: StatusInvoice = inv.status === 'lunas' ? 'belum_dibayar' : 'lunas'
    const { error } = await supabase.from('invoice').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', inv.id)
    if (error) toast.error(handleSupabaseError(error))
    else { toast.success(newStatus === 'lunas' ? 'Ditandai lunas' : 'Ditandai belum dibayar'); router.refresh() }
    setUpdatingId(null)
  }

  return (
    <div className="animate-fade-in">
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>Invoice</h1>
          <div className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>{invoiceList.length} invoice</div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[5px] text-[12px] font-medium"
          style={{ background: 'var(--cu-primary)', color: '#ffffff' }}
        >
          <Plus className="w-3.5 h-3.5" /> Invoice Baru
        </button>
      </div>

      <div className="cu-page">
        <div className="cu-card overflow-hidden">
          {invoiceList.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--cu-text-muted)' }}>Belum ada invoice</div>
          ) : (
            <div className="cu-table-wrap">
              <table className="cu-table">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Nomor</th>
                    <th style={{ width: 90 }}>Tanggal</th>
                    <th>Penerima</th>
                    <th className="cu-num" style={{ width: 130 }}>Total</th>
                    <th style={{ width: 110 }}>Status</th>
                    <th style={{ width: 90 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceList.map(inv => {
                    const t = computeInvoiceTotals(inv.items, inv.diskon_persen, inv.pajak_persen)
                    return (
                      <tr key={inv.id}>
                        <td className="cu-mono text-[12px]">{inv.nomor}</td>
                        <td className="cu-mono text-[11.5px] whitespace-nowrap" style={{ color: 'var(--cu-text-2)' }}>{formatTanggal(inv.tanggal)}</td>
                        <td className="text-[12.5px]" style={{ color: 'var(--cu-text)' }}>{inv.penerima_nama}</td>
                        <td className="cu-num cu-mono text-[12px] font-medium">{formatRupiah(t.total)}</td>
                        <td>
                          <button
                            onClick={() => handleToggleStatus(inv)}
                            disabled={updatingId === inv.id}
                            className={`cu-badge cu-badge-dot ${inv.status === 'lunas' ? 'cu-badge-success' : 'cu-badge-warning'}`}
                            style={{ cursor: 'pointer' }}
                            title="Klik untuk ubah status"
                          >
                            {inv.status === 'lunas' ? 'Lunas' : 'Belum Dibayar'}
                          </button>
                        </td>
                        <td>
                          <div className="flex items-center gap-0.5">
                            <button onClick={() => openEdit(inv)} title="Edit" aria-label="Edit invoice" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button onClick={() => { setDelTarget(inv); setOpenDel(true) }} title="Hapus" aria-label="Hapus invoice" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)]" style={{ color: 'var(--cu-text-muted)' }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">{editTarget ? 'Edit Invoice' : 'Invoice Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Nomor *</Label>
                <Input value={form.nomor} onChange={e => setForm(f => ({ ...f, nomor: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jatuh Tempo</Label>
              <Input type="date" value={form.jatuh_tempo} onChange={e => setForm(f => ({ ...f, jatuh_tempo: e.target.value }))} className="h-9 text-[13px]" />
            </div>

            <div className="text-[11.5px] font-semibold pt-1" style={{ color: 'var(--cu-text-muted)' }}>Dari (Penerbit)</div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Nama *</Label>
              <Input value={form.penerbit_nama} onChange={e => setForm(f => ({ ...f, penerbit_nama: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jabatan</Label>
                <Input value={form.penerbit_jabatan} onChange={e => setForm(f => ({ ...f, penerbit_jabatan: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Instansi</Label>
                <Input value={form.penerbit_instansi} onChange={e => setForm(f => ({ ...f, penerbit_instansi: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="text-[11.5px] font-semibold pt-1" style={{ color: 'var(--cu-text-muted)' }}>Kepada (Penerima)</div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Nama *</Label>
              <Input value={form.penerima_nama} onChange={e => setForm(f => ({ ...f, penerima_nama: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Instansi</Label>
                <Input value={form.penerima_instansi} onChange={e => setForm(f => ({ ...f, penerima_instansi: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Alamat</Label>
                <Input value={form.penerima_alamat} onChange={e => setForm(f => ({ ...f, penerima_alamat: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="text-[11.5px] font-semibold pt-1" style={{ color: 'var(--cu-text-muted)' }}>Item</div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Uraian</Label>
                    <Input value={it.uraian} onChange={e => updateItem(i, { uraian: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="w-16">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Qty</Label>
                    <Input type="number" value={it.qty} onChange={e => updateItem(i, { qty: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="w-32">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Harga Satuan</Label>
                    <Input type="number" value={it.harga_satuan} onChange={e => updateItem(i, { harga_satuan: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItemRow(i)}
                    disabled={items.length === 1}
                    aria-label="Hapus item"
                    className="w-9 h-9 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)] disabled:opacity-30"
                    style={{ color: 'var(--cu-text-muted)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addItemRow} className="text-[12px] font-medium" style={{ color: 'var(--cu-primary)' }}>
                + Tambah Item
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Diskon (%)</Label>
                <Input type="number" value={form.diskon_persen} onChange={e => setForm(f => ({ ...f, diskon_persen: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Pajak / PPN (%)</Label>
                <Input type="number" value={form.pajak_persen} onChange={e => setForm(f => ({ ...f, pajak_persen: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="rounded-md p-3 space-y-1" style={{ background: 'var(--cu-surface-2)' }}>
              <div className="flex justify-between text-[12px]"><span style={{ color: 'var(--cu-text-muted)' }}>Subtotal</span><span className="cu-mono">{formatRupiah(totals.subtotal)}</span></div>
              <div className="flex justify-between text-[12px]"><span style={{ color: 'var(--cu-text-muted)' }}>Diskon</span><span className="cu-mono">-{formatRupiah(totals.diskonNominal)}</span></div>
              <div className="flex justify-between text-[12px]"><span style={{ color: 'var(--cu-text-muted)' }}>Pajak</span><span className="cu-mono">{formatRupiah(totals.pajakNominal)}</span></div>
              <div className="flex justify-between text-[13px] font-semibold pt-1" style={{ borderTop: '1px solid var(--border)' }}><span>Total</span><span className="cu-mono">{formatRupiah(totals.total)}</span></div>
            </div>

            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Catatan</Label>
              <Textarea placeholder="Catatan tambahan (opsional)" rows={2} value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} className="text-[13px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--cu-primary)', color: '#fff' }}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold" style={{ color: 'var(--cu-danger)' }}>Hapus Invoice</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--cu-text-2)' }}>
            Yakin ingin menghapus invoice <strong style={{ color: 'var(--cu-text)' }}>{delTarget?.nomor}</strong>? Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDel(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleDelete} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--cu-danger)', color: '#fff' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

Note: `StatusBadge` is defined but not referenced in the JSX — the table renders an inline `<button>` badge instead, same as the existing `PeminjamanClient.tsx`, which defines an equally-unused `StatusBadge` function today. `npx tsc --noEmit` (no `noUnusedLocals` in `tsconfig.json`) will not flag this; leave it as-is for consistency with the existing file.

- [ ] **Step 3: Add the sidebar nav item**

In `src/components/layout/Sidebar.tsx`, add `FileText` to the `lucide-react` import (`src/components/layout/Sidebar.tsx:7-18`):

```ts
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  FileBarChart,
  Settings,
  Database,
  Users,
  LogOut,
  Loader2,
  HandCoins,
  FileText,
} from 'lucide-react'
```

Add a new entry to `navItems` (`src/components/layout/Sidebar.tsx:28-37`), right after Peminjaman:

```ts
const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard, superAdminOnly: false },
  { href: '/dana',        label: 'Dana Masuk',  icon: Wallet,          superAdminOnly: false },
  { href: '/pengeluaran', label: 'Pengeluaran', icon: Receipt,         superAdminOnly: false },
  { href: '/peminjaman',  label: 'Peminjaman',  icon: HandCoins,       superAdminOnly: false },
  { href: '/invoice',     label: 'Invoice',     icon: FileText,        superAdminOnly: false },
  { href: '/laporan',     label: 'Laporan',     icon: FileBarChart,    superAdminOnly: false },
  { href: '/master-data', label: 'Master Data', icon: Database,        superAdminOnly: false },
  { href: '/pengguna',    label: 'Pengguna',    icon: Users,           superAdminOnly: true  },
  { href: '/pengaturan',  label: 'Pengaturan',  icon: Settings,        superAdminOnly: false },
]
```

Do **not** add `/invoice` to `BOOK_SCOPED_PATHS` (`src/components/layout/Sidebar.tsx:39`) — it must stay exactly as `['/dashboard', '/dana', '/pengeluaran', '/peminjaman', '/laporan']`.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 5: Start the dev server if not already running**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
lsof -ti:3000 -sTCP:LISTEN >/dev/null 2>&1 && echo "already running" || (npm run dev &)
```
Wait for `Ready` in the output before continuing (or confirm "already running").

- [ ] **Step 6: Live CRUD smoke test**

Create `/tmp/test-invoice-crud.mjs`:

```js
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', err => console.log('PAGEERROR:', err.message))

await page.goto('http://localhost:3000/login')
await page.fill('input[type="email"]', 'admin@direktorat.ac.id')
await page.fill('input[type="password"]', 'usc@_140451')
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard**', { timeout: 15000 })

await page.goto('http://localhost:3000/invoice')
await page.waitForLoadState('networkidle')

await page.click('text=Invoice Baru')
const dialog = page.locator('[role="dialog"]')
await dialog.waitFor({ state: 'visible' })

const nomor = await dialog.locator('label:has-text("Nomor")').locator('xpath=following-sibling::input[1]').inputValue()
console.log('GENERATED NOMOR:', nomor)

await dialog.locator('label:has-text("Nama")').first().locator('xpath=following-sibling::input[1]').fill('PT Uji Coba Plan')
await dialog.locator('label:has-text("Nama")').nth(1).locator('xpath=following-sibling::input[1]').fill('Budi Santoso Test')
await dialog.locator('label:has-text("Uraian")').locator('xpath=following-sibling::input[1]').fill('Jasa Konsultasi Uji')
await dialog.locator('label:has-text("Qty")').locator('xpath=following-sibling::input[1]').fill('2')
await dialog.locator('label:has-text("Harga Satuan")').locator('xpath=following-sibling::input[1]').fill('500000')
await dialog.locator('label:has-text("Diskon")').locator('xpath=following-sibling::input[1]').fill('10')
await dialog.locator('label:has-text("Pajak")').locator('xpath=following-sibling::input[1]').fill('11')

const totalText = await dialog.locator('text=Total').locator('xpath=following-sibling::span[1]').textContent()
console.log('PREVIEW TOTAL:', totalText)

await dialog.locator('button:has-text("Simpan")').click()
await page.waitForTimeout(1500)
console.log('CREATE TOAST:', await page.locator('[data-sonner-toast]').allTextContents())

// Edit it: change qty to 3
const row = page.locator('tr', { hasText: 'Budi Santoso Test' }).first()
await row.locator('button[title="Edit"]').click()
await dialog.waitFor({ state: 'visible' })
await dialog.locator('label:has-text("Qty")').locator('xpath=following-sibling::input[1]').fill('3')
await dialog.locator('button:has-text("Simpan")').click()
await page.waitForTimeout(1500)
console.log('EDIT TOAST:', await page.locator('[data-sonner-toast]').allTextContents())

// Toggle status
await row.locator('button:has-text("Belum Dibayar")').click()
await page.waitForTimeout(1000)
console.log('TOGGLE TOAST:', await page.locator('[data-sonner-toast]').allTextContents())

// Delete
await row.locator('button[title="Hapus"]').click()
await page.locator('[role="dialog"]').locator('button:has-text("Hapus")').click()
await page.waitForTimeout(1500)
console.log('DELETE TOAST:', await page.locator('[data-sonner-toast]').allTextContents())

await browser.close()
```

Run: `node /tmp/test-invoice-crud.mjs`

Expected output includes: `GENERATED NOMOR: INV/2026/001` (or the next sequential number if the table isn't empty), `PREVIEW TOTAL: Rp 999.000` (subtotal 2×500.000=1.000.000, minus 10% diskon=900.000, plus 11% pajak=999.000), `CREATE TOAST: [ 'Invoice ditambahkan' ]`, `EDIT TOAST: [ 'Invoice diperbarui' ]`, `TOGGLE TOAST: [ 'Ditandai lunas' ]`, `DELETE TOAST: [ 'Invoice dihapus' ]`.

- [ ] **Step 7: Verify cleanup**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
curl -s "${URL}/rest/v1/invoice?penerima_nama=eq.Budi%20Santoso%20Test&select=id" -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
```
Expected: `[]` — the test row was deleted by the script's own delete step. If it isn't empty (delete step failed), delete it manually:
```bash
curl -s -X DELETE "${URL}/rest/v1/invoice?penerima_nama=eq.Budi%20Santoso%20Test" -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
```

- [ ] **Step 8: Commit**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
git add "src/app/(dashboard)/invoice" src/components/layout/Sidebar.tsx
git commit -m "$(cat <<'EOF'
feat: add Invoice CRUD page

Standalone list + create/edit dialog with a line-item editor, tax/
discount, and payment status toggle. No PDF export yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Invoice — PDF export

**Files:**
- Create: `src/components/pdf/InvoicePDF.tsx`
- Modify: `src/app/(dashboard)/invoice/InvoiceClient.tsx`

**Interfaces:**
- Consumes: `Invoice` type, `computeInvoiceTotals`, `formatRupiah`, `formatTanggal`.
- Produces: `InvoicePDF` component (props: `{ invoice: Invoice }`), print button wired into `InvoiceClient`'s Aksi column.

- [ ] **Step 1: Write the PDF template**

Create `src/components/pdf/InvoicePDF.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { computeInvoiceTotals } from '@/lib/dokumenTotals'
import type { Invoice } from '@/lib/types'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1E293B', backgroundColor: '#FFFFFF', padding: '36 48', lineHeight: 1.4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  headerTitle: { fontSize: 20, fontWeight: 700, letterSpacing: 1 },
  headerMeta: { textAlign: 'right' },
  headerMetaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },
  headerMetaLabel: { color: '#64748B', width: 80, textAlign: 'right', marginRight: 6 },

  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  partyCol: { width: '45%' },
  partyLabel: { fontSize: 9, color: '#64748B', textTransform: 'uppercase', marginBottom: 3 },
  partyName: { fontWeight: 700, marginBottom: 1 },
  partyLine: { color: '#334155' },

  table: { marginBottom: 10 },
  tableHeaderRow: { flexDirection: 'row', borderBottom: '1 solid #1E293B', paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 3, borderBottom: '0.5 solid #E2E8F0' },
  colUraian: { flex: 1 },
  colQty: { width: 40, textAlign: 'right' },
  colHarga: { width: 90, textAlign: 'right' },
  colSubtotal: { width: 90, textAlign: 'right' },
  th: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' },

  totalsBlock: { alignSelf: 'flex-end', width: 220, marginTop: 6 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalsLabel: { color: '#64748B' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5, marginTop: 3, borderTop: '1 solid #1E293B' },
  grandTotalLabel: { fontWeight: 700 },
  grandTotalValue: { fontWeight: 700 },

  notes: { marginTop: 16, fontSize: 9.5, color: '#475569' },

  signatureBlock: { marginTop: 30, width: 200, alignSelf: 'flex-end', textAlign: 'center' },
  signatureLabel: { marginBottom: 40, color: '#64748B' },
  signatureName: { fontWeight: 700, textDecoration: 'underline' },
})

type Props = { invoice: Invoice }

export function InvoicePDF({ invoice }: Props) {
  const t = computeInvoiceTotals(invoice.items, invoice.diskon_persen, invoice.pajak_persen)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>INVOICE</Text>
          <View style={s.headerMeta}>
            <View style={s.headerMetaRow}><Text style={s.headerMetaLabel}>No. Invoice</Text><Text>{invoice.nomor}</Text></View>
            <View style={s.headerMetaRow}><Text style={s.headerMetaLabel}>Tanggal</Text><Text>{formatTanggal(invoice.tanggal)}</Text></View>
            {invoice.jatuh_tempo && (
              <View style={s.headerMetaRow}><Text style={s.headerMetaLabel}>Jatuh Tempo</Text><Text>{formatTanggal(invoice.jatuh_tempo)}</Text></View>
            )}
          </View>
        </View>

        <View style={s.partiesRow}>
          <View style={s.partyCol}>
            <Text style={s.partyLabel}>Dari</Text>
            <Text style={s.partyName}>{invoice.penerbit_nama}</Text>
            {invoice.penerbit_jabatan && <Text style={s.partyLine}>{invoice.penerbit_jabatan}</Text>}
            {invoice.penerbit_instansi && <Text style={s.partyLine}>{invoice.penerbit_instansi}</Text>}
          </View>
          <View style={s.partyCol}>
            <Text style={s.partyLabel}>Kepada</Text>
            <Text style={s.partyName}>{invoice.penerima_nama}</Text>
            {invoice.penerima_instansi && <Text style={s.partyLine}>{invoice.penerima_instansi}</Text>}
            {invoice.penerima_alamat && <Text style={s.partyLine}>{invoice.penerima_alamat}</Text>}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.th, s.colUraian]}>Uraian</Text>
            <Text style={[s.th, s.colQty]}>Qty</Text>
            <Text style={[s.th, s.colHarga]}>Harga Satuan</Text>
            <Text style={[s.th, s.colSubtotal]}>Subtotal</Text>
          </View>
          {invoice.items.map((it, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={s.colUraian}>{it.uraian}</Text>
              <Text style={s.colQty}>{it.qty}</Text>
              <Text style={s.colHarga}>{formatRupiah(it.harga_satuan)}</Text>
              <Text style={s.colSubtotal}>{formatRupiah(it.qty * it.harga_satuan)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totalsBlock}>
          <View style={s.totalsRow}><Text style={s.totalsLabel}>Subtotal</Text><Text>{formatRupiah(t.subtotal)}</Text></View>
          {invoice.diskon_persen > 0 && (
            <View style={s.totalsRow}><Text style={s.totalsLabel}>Diskon ({invoice.diskon_persen}%)</Text><Text>-{formatRupiah(t.diskonNominal)}</Text></View>
          )}
          {invoice.pajak_persen > 0 && (
            <View style={s.totalsRow}><Text style={s.totalsLabel}>Pajak ({invoice.pajak_persen}%)</Text><Text>{formatRupiah(t.pajakNominal)}</Text></View>
          )}
          <View style={s.grandTotalRow}><Text style={s.grandTotalLabel}>Total</Text><Text style={s.grandTotalValue}>{formatRupiah(t.total)}</Text></View>
        </View>

        {invoice.catatan && <Text style={s.notes}>Catatan: {invoice.catatan}</Text>}

        <View style={s.signatureBlock}>
          <Text style={s.signatureLabel}>{formatTanggal(invoice.tanggal)}</Text>
          <Text style={s.signatureName}>{invoice.penerbit_nama}</Text>
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Wire the print button into `InvoiceClient.tsx`**

Add imports at the top of `src/app/(dashboard)/invoice/InvoiceClient.tsx`:

```tsx
import { pdf } from '@react-pdf/renderer'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'
```

Add `Printer` to the `lucide-react` import line:

```tsx
import { Plus, Pencil, Trash2, Loader2, X, Printer } from 'lucide-react'
```

Add a `printingId` state next to `updatingId`:

```tsx
const [printingId, setPrintingId] = useState<number | null>(null)
```

Add a `handlePrint` function next to `handleToggleStatus`:

```tsx
async function handlePrint(inv: Invoice) {
  setPrintingId(inv.id)
  try {
    const blob = await pdf(<InvoicePDF invoice={inv} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Invoice_${inv.nomor.replace(/\//g, '-')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Invoice berhasil diunduh')
  } catch (err) {
    console.error(err)
    toast.error('Gagal membuat invoice')
  } finally {
    setPrintingId(null)
  }
}
```

In the Aksi `<td>` of the table row, add the print button before the Edit button:

```tsx
<div className="flex items-center gap-0.5">
  <button onClick={() => handlePrint(inv)} disabled={printingId === inv.id} title="Unduh PDF" aria-label="Unduh invoice PDF" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
    {printingId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
  </button>
  <button onClick={() => openEdit(inv)} title="Edit" aria-label="Edit invoice" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
    <Pencil className="w-3 h-3" />
  </button>
  <button onClick={() => { setDelTarget(inv); setOpenDel(true) }} title="Hapus" aria-label="Hapus invoice" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)]" style={{ color: 'var(--cu-text-muted)' }}>
    <Trash2 className="w-3 h-3" />
  </button>
</div>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Install a temporary PDF-text-reader for verification**

This machine has neither `pdftotext` nor `pdf-parse` installed, and this repo has no automated test framework to lean on — verification of the actual rendered PDF content needs a text extractor.

```bash
cd "/Volumes/File Home/File Web/CatatUang"
git status --short package-lock.json
npm install --no-save pdf-parse
git status --short package-lock.json
```
If the second `git status` shows `package-lock.json` as modified, revert it (it's a throwaway dev-time install, not a real dependency): `git checkout -- package-lock.json`.

- [ ] **Step 5: Live PDF verification**

Create `/tmp/test-invoice-pdf.mjs`:

```js
import { chromium } from 'playwright'
import fs from 'fs'

const browser = await chromium.launch()
const page = await browser.newPage()

await page.goto('http://localhost:3000/login')
await page.fill('input[type="email"]', 'admin@direktorat.ac.id')
await page.fill('input[type="password"]', 'usc@_140451')
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard**', { timeout: 15000 })

await page.goto('http://localhost:3000/invoice')
await page.waitForLoadState('networkidle')

await page.click('text=Invoice Baru')
const dialog = page.locator('[role="dialog"]')
await dialog.waitFor({ state: 'visible' })
await dialog.locator('label:has-text("Nama")').first().locator('xpath=following-sibling::input[1]').fill('PT Uji Coba PDF')
await dialog.locator('label:has-text("Nama")').nth(1).locator('xpath=following-sibling::input[1]').fill('Budi Santoso PDF')
await dialog.locator('label:has-text("Uraian")').locator('xpath=following-sibling::input[1]').fill('Jasa Konsultasi')
await dialog.locator('label:has-text("Qty")').locator('xpath=following-sibling::input[1]').fill('2')
await dialog.locator('label:has-text("Harga Satuan")').locator('xpath=following-sibling::input[1]').fill('500000')
await dialog.locator('label:has-text("Diskon")').locator('xpath=following-sibling::input[1]').fill('10')
await dialog.locator('label:has-text("Pajak")').locator('xpath=following-sibling::input[1]').fill('11')
await dialog.locator('button:has-text("Simpan")').click()
await page.waitForTimeout(1500)

const row = page.locator('tr', { hasText: 'Budi Santoso PDF' }).first()
const [download] = await Promise.all([
  page.waitForEvent('download'),
  row.locator('button[title="Unduh PDF"]').click(),
])
const pdfPath = '/tmp/test-invoice.pdf'
await download.saveAs(pdfPath)

const pdfParse = (await import('pdf-parse')).default
const buf = fs.readFileSync(pdfPath)
const { text, numpages } = await pdfParse(buf)
console.log('PAGES:', numpages)
console.log('CONTAINS 1.000.000 (subtotal):', text.includes('1.000.000'))
console.log('CONTAINS 999.000 (total):', text.includes('999.000'))
console.log('CONTAINS penerbit name:', text.includes('PT Uji Coba PDF'))
console.log('CONTAINS penerima name:', text.includes('Budi Santoso PDF'))

fs.unlinkSync(pdfPath)

// cleanup the test invoice
await row.locator('button[title="Hapus"]').click()
await page.locator('[role="dialog"]').locator('button:has-text("Hapus")').click()
await page.waitForTimeout(1500)
console.log('CLEANUP TOAST:', await page.locator('[data-sonner-toast]').allTextContents())

await browser.close()
```

Run: `node /tmp/test-invoice-pdf.mjs`

Expected output: `PAGES: 1`, `CONTAINS 1.000.000 (subtotal): true`, `CONTAINS 999.000 (total): true`, `CONTAINS penerbit name: true`, `CONTAINS penerima name: true`, `CLEANUP TOAST: [ 'Invoice dihapus' ]`.

- [ ] **Step 6: Verify cleanup**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
curl -s "${URL}/rest/v1/invoice?select=id" -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
```
Expected: `[]`.

- [ ] **Step 7: Commit**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
git add src/components/pdf/InvoicePDF.tsx "src/app/(dashboard)/invoice/InvoiceClient.tsx"
git commit -m "$(cat <<'EOF'
feat: add Invoice PDF export

Business-document layout (header, two-party block, item table,
tax/discount totals, signature) with no institution branding —
every identity field comes from the invoice row itself.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Kwitansi — CRUD page

**Files:**
- Create: `src/app/(dashboard)/kwitansi/page.tsx`
- Create: `src/app/(dashboard)/kwitansi/KwitansiClient.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `Kwitansi`, `Invoice` types; `generateNomor`; `computeInvoiceTotals` (to derive the picked invoice's total); `formatRupiah`, `formatTanggal`; `handleSupabaseError`.
- Produces: route `/kwitansi`, component `KwitansiClient` (no print button yet — added in Task 5).

- [ ] **Step 1: Write the server page**

Create `src/app/(dashboard)/kwitansi/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { KwitansiClient } from './KwitansiClient'
import type { Kwitansi, Invoice } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function KwitansiPage() {
  const supabase = await createClient()
  const [{ data: kwitansiList }, { data: invoiceList }] = await Promise.all([
    supabase.from('kwitansi').select('*').order('tanggal', { ascending: false }),
    supabase.from('invoice').select('id, nomor, penerima_nama, items, diskon_persen, pajak_persen').order('nomor'),
  ])

  return (
    <KwitansiClient
      kwitansiList={(kwitansiList || []) as Kwitansi[]}
      invoiceList={(invoiceList || []) as Pick<Invoice, 'id' | 'nomor' | 'penerima_nama' | 'items' | 'diskon_persen' | 'pajak_persen'>[]}
    />
  )
}
```

- [ ] **Step 2: Write the client component**

Create `src/app/(dashboard)/kwitansi/KwitansiClient.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { generateNomor } from '@/lib/nomorDokumen'
import { computeInvoiceTotals } from '@/lib/dokumenTotals'
import type { Kwitansi, Invoice } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'

type InvoiceOption = Pick<Invoice, 'id' | 'nomor' | 'penerima_nama' | 'items' | 'diskon_persen' | 'pajak_persen'>

type Props = { kwitansiList: Kwitansi[]; invoiceList: InvoiceOption[] }

type FormData = {
  nomor: string; tanggal: string; invoice_id: string
  diterima_dari: string; jumlah: string; untuk_pembayaran: string
  penerima_nama: string; penerima_jabatan: string
  catatan: string
}
const emptyForm: FormData = {
  nomor: '', tanggal: '', invoice_id: '',
  diterima_dari: '', jumlah: '', untuk_pembayaran: '',
  penerima_nama: '', penerima_jabatan: '',
  catatan: '',
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

const NO_INVOICE_VALUE = '__none__'

export function KwitansiClient({ kwitansiList, invoiceList }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [openForm, setOpenForm] = useState(false)
  const [openDel, setOpenDel] = useState(false)
  const [editTarget, setEditTarget] = useState<Kwitansi | null>(null)
  const [delTarget, setDelTarget] = useState<Kwitansi | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  const openAdd = async () => {
    setEditTarget(null)
    const nomor = await generateNomor(supabase, 'kwitansi', 'KWT')
    setForm({ ...emptyForm, nomor, tanggal: todayIso() })
    setOpenForm(true)
  }

  const openEdit = (k: Kwitansi) => {
    setEditTarget(k)
    setForm({
      nomor: k.nomor,
      tanggal: k.tanggal,
      invoice_id: k.invoice_id ? String(k.invoice_id) : '',
      diterima_dari: k.diterima_dari,
      jumlah: String(k.jumlah),
      untuk_pembayaran: k.untuk_pembayaran,
      penerima_nama: k.penerima_nama,
      penerima_jabatan: k.penerima_jabatan || '',
      catatan: k.catatan || '',
    })
    setOpenForm(true)
  }

  function handlePickInvoice(value: string | null) {
    const v = value ?? NO_INVOICE_VALUE
    if (v === NO_INVOICE_VALUE) {
      setForm(f => ({ ...f, invoice_id: '' }))
      return
    }
    const inv = invoiceList.find(i => String(i.id) === v)
    if (!inv) return
    const totals = computeInvoiceTotals(inv.items, inv.diskon_persen, inv.pajak_persen)
    setForm(f => ({
      ...f,
      invoice_id: v,
      diterima_dari: inv.penerima_nama,
      jumlah: String(totals.total),
      untuk_pembayaran: `Pembayaran Invoice ${inv.nomor}`,
    }))
  }

  async function handleSave() {
    if (!form.nomor || !form.tanggal || !form.diterima_dari || !form.jumlah || !form.untuk_pembayaran || !form.penerima_nama) {
      toast.error('Nomor, tanggal, diterima dari, jumlah, untuk pembayaran, dan penerima wajib diisi')
      return
    }
    const jumlah = parseFloat(form.jumlah)
    if (isNaN(jumlah) || jumlah <= 0) {
      toast.error('Jumlah tidak valid')
      return
    }
    setSaving(true)
    const payload = {
      nomor: form.nomor,
      tanggal: form.tanggal,
      invoice_id: form.invoice_id ? Number(form.invoice_id) : null,
      diterima_dari: form.diterima_dari,
      jumlah,
      untuk_pembayaran: form.untuk_pembayaran,
      penerima_nama: form.penerima_nama,
      penerima_jabatan: form.penerima_jabatan || null,
      catatan: form.catatan || null,
      updated_at: new Date().toISOString(),
    }
    if (editTarget) {
      const { error } = await supabase.from('kwitansi').update(payload).eq('id', editTarget.id)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Kwitansi diperbarui')
    } else {
      const { error } = await supabase.from('kwitansi').insert(payload)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('Kwitansi ditambahkan')
    }
    setSaving(false)
    setOpenForm(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from('kwitansi').delete().eq('id', delTarget.id)
    if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
    toast.success('Kwitansi dihapus')
    setSaving(false)
    setOpenDel(false)
    setDelTarget(null)
    router.refresh()
  }

  return (
    <div className="animate-fade-in">
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>Kwitansi</h1>
          <div className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>{kwitansiList.length} kwitansi</div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[5px] text-[12px] font-medium"
          style={{ background: 'var(--cu-primary)', color: '#ffffff' }}
        >
          <Plus className="w-3.5 h-3.5" /> Kwitansi Baru
        </button>
      </div>

      <div className="cu-page">
        <div className="cu-card overflow-hidden">
          {kwitansiList.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--cu-text-muted)' }}>Belum ada kwitansi</div>
          ) : (
            <div className="cu-table-wrap">
              <table className="cu-table">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Nomor</th>
                    <th style={{ width: 90 }}>Tanggal</th>
                    <th>Diterima Dari</th>
                    <th>Untuk Pembayaran</th>
                    <th className="cu-num" style={{ width: 130 }}>Jumlah</th>
                    <th style={{ width: 90 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {kwitansiList.map(k => (
                    <tr key={k.id}>
                      <td className="cu-mono text-[12px]">{k.nomor}</td>
                      <td className="cu-mono text-[11.5px] whitespace-nowrap" style={{ color: 'var(--cu-text-2)' }}>{formatTanggal(k.tanggal)}</td>
                      <td className="text-[12.5px]" style={{ color: 'var(--cu-text)' }}>{k.diterima_dari}</td>
                      <td className="text-[12px] truncate max-w-[220px]" style={{ color: 'var(--cu-text-2)' }} title={k.untuk_pembayaran}>{k.untuk_pembayaran}</td>
                      <td className="cu-num cu-mono text-[12px] font-medium">{formatRupiah(Number(k.jumlah))}</td>
                      <td>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => openEdit(k)} title="Edit" aria-label="Edit kwitansi" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => { setDelTarget(k); setOpenDel(true) }} title="Hapus" aria-label="Hapus kwitansi" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)]" style={{ color: 'var(--cu-text-muted)' }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">{editTarget ? 'Edit Kwitansi' : 'Kwitansi Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Nomor *</Label>
                <Input value={form.nomor} onChange={e => setForm(f => ({ ...f, nomor: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            {invoiceList.length > 0 && (
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Kaitkan ke Invoice (opsional)</Label>
                <Select
                  value={form.invoice_id || NO_INVOICE_VALUE}
                  onValueChange={handlePickInvoice}
                  items={{
                    [NO_INVOICE_VALUE]: 'Tidak terkait invoice',
                    ...Object.fromEntries(invoiceList.map(i => [String(i.id), `${i.nomor} — ${i.penerima_nama}`])),
                  }}
                >
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Tidak terkait invoice" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_INVOICE_VALUE}>Tidak terkait invoice</SelectItem>
                    {invoiceList.map(i => <SelectItem key={i.id} value={String(i.id)}>{i.nomor} — {i.penerima_nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Diterima Dari *</Label>
              <Input value={form.diterima_dari} onChange={e => setForm(f => ({ ...f, diterima_dari: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jumlah *</Label>
              <Input type="number" placeholder="0" value={form.jumlah} onChange={e => setForm(f => ({ ...f, jumlah: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Untuk Pembayaran *</Label>
              <Input value={form.untuk_pembayaran} onChange={e => setForm(f => ({ ...f, untuk_pembayaran: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Penerima *</Label>
                <Input value={form.penerima_nama} onChange={e => setForm(f => ({ ...f, penerima_nama: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jabatan</Label>
                <Input value={form.penerima_jabatan} onChange={e => setForm(f => ({ ...f, penerima_jabatan: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Catatan</Label>
              <Textarea placeholder="Catatan tambahan (opsional)" rows={2} value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} className="text-[13px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--cu-primary)', color: '#fff' }}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold" style={{ color: 'var(--cu-danger)' }}>Hapus Kwitansi</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--cu-text-2)' }}>
            Yakin ingin menghapus kwitansi <strong style={{ color: 'var(--cu-text)' }}>{delTarget?.nomor}</strong>? Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDel(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleDelete} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--cu-danger)', color: '#fff' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: Add the sidebar nav item**

In `src/components/layout/Sidebar.tsx`, add `ReceiptText` to the `lucide-react` import:

```ts
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  FileBarChart,
  Settings,
  Database,
  Users,
  LogOut,
  Loader2,
  HandCoins,
  FileText,
  ReceiptText,
} from 'lucide-react'
```

Add to `navItems`, right after Invoice:

```ts
{ href: '/kwitansi',    label: 'Kwitansi',    icon: ReceiptText,     superAdminOnly: false },
```

Do not add `/kwitansi` to `BOOK_SCOPED_PATHS`.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 5: Live CRUD smoke test (standalone, no invoice link)**

Create `/tmp/test-kwitansi-crud.mjs`:

```js
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', err => console.log('PAGEERROR:', err.message))

await page.goto('http://localhost:3000/login')
await page.fill('input[type="email"]', 'admin@direktorat.ac.id')
await page.fill('input[type="password"]', 'usc@_140451')
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard**', { timeout: 15000 })

await page.goto('http://localhost:3000/kwitansi')
await page.waitForLoadState('networkidle')

await page.click('text=Kwitansi Baru')
const dialog = page.locator('[role="dialog"]')
await dialog.waitFor({ state: 'visible' })

const nomor = await dialog.locator('label:has-text("Nomor")').locator('xpath=following-sibling::input[1]').inputValue()
console.log('GENERATED NOMOR:', nomor)

await dialog.locator('label:has-text("Diterima Dari")').locator('xpath=following-sibling::input[1]').fill('Siti Aminah Test')
await dialog.locator('label:has-text("Jumlah")').locator('xpath=following-sibling::input[1]').fill('750000')
await dialog.locator('label:has-text("Untuk Pembayaran")').locator('xpath=following-sibling::input[1]').fill('Sewa ruang aula')
await dialog.locator('label:has-text("Penerima")').locator('xpath=following-sibling::input[1]').fill('Bendahara Test')

await dialog.locator('button:has-text("Simpan")').click()
await page.waitForTimeout(1500)
console.log('CREATE TOAST:', await page.locator('[data-sonner-toast]').allTextContents())

const row = page.locator('tr', { hasText: 'Siti Aminah Test' }).first()
await row.locator('button[title="Hapus"]').click()
await page.locator('[role="dialog"]').locator('button:has-text("Hapus")').click()
await page.waitForTimeout(1500)
console.log('DELETE TOAST:', await page.locator('[data-sonner-toast]').allTextContents())

await browser.close()
```

Run: `node /tmp/test-kwitansi-crud.mjs`

Expected: `GENERATED NOMOR: KWT/2026/001`, `CREATE TOAST: [ 'Kwitansi ditambahkan' ]`, `DELETE TOAST: [ 'Kwitansi dihapus' ]`.

- [ ] **Step 6: Verify cleanup**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
curl -s "${URL}/rest/v1/kwitansi?select=id" -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
```
Expected: `[]`.

- [ ] **Step 7: Commit**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
git add "src/app/(dashboard)/kwitansi" src/components/layout/Sidebar.tsx
git commit -m "$(cat <<'EOF'
feat: add Kwitansi CRUD page

Standalone receipt list + create/edit dialog, with an optional
invoice picker that pre-fills payer name and amount. No PDF yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Kwitansi — PDF export

**Files:**
- Create: `src/components/pdf/KwitansiPDF.tsx`
- Modify: `src/app/(dashboard)/kwitansi/KwitansiClient.tsx`

**Interfaces:**
- Consumes: `Kwitansi` type, `formatRupiah`, `formatTanggal`, `terbilang` (from `src/lib/formatters.ts`).
- Produces: `KwitansiPDF` component (props: `{ kwitansi: Kwitansi }`), print button wired into `KwitansiClient`'s Aksi column.

- [ ] **Step 1: Write the PDF template**

Create `src/components/pdf/KwitansiPDF.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatRupiah, formatTanggal, terbilang } from '@/lib/formatters'
import type { Kwitansi } from '@/lib/types'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 11, color: '#1E293B', backgroundColor: '#FFFFFF', padding: '48 56', lineHeight: 1.5 },
  headerTitle: { fontSize: 18, fontWeight: 700, textAlign: 'center', letterSpacing: 2, marginBottom: 4 },
  headerMeta: { textAlign: 'center', color: '#64748B', fontSize: 9.5, marginBottom: 24 },

  row: { flexDirection: 'row', marginBottom: 10 },
  label: { width: 120, color: '#64748B' },
  colon: { width: 10 },
  value: { flex: 1, fontWeight: 700 },

  amountBox: { border: '1 solid #1E293B', borderRadius: 4, padding: 12, marginTop: 4, marginBottom: 20 },
  amountValue: { fontSize: 16, fontWeight: 700, textAlign: 'center', marginBottom: 4 },
  terbilangText: { textAlign: 'center', fontStyle: 'italic', color: '#334155' },

  signatureBlock: { marginTop: 40, width: 200, alignSelf: 'flex-end', textAlign: 'center' },
  signatureLabel: { marginBottom: 40, color: '#64748B' },
  signatureName: { fontWeight: 700, textDecoration: 'underline' },
})

type Props = { kwitansi: Kwitansi }

export function KwitansiPDF({ kwitansi }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.headerTitle}>KWITANSI</Text>
        <Text style={s.headerMeta}>No. {kwitansi.nomor}</Text>

        <View style={s.row}><Text style={s.label}>Telah terima dari</Text><Text style={s.colon}>:</Text><Text style={s.value}>{kwitansi.diterima_dari}</Text></View>
        <View style={s.row}><Text style={s.label}>Untuk pembayaran</Text><Text style={s.colon}>:</Text><Text style={s.value}>{kwitansi.untuk_pembayaran}</Text></View>
        <View style={s.row}><Text style={s.label}>Tanggal</Text><Text style={s.colon}>:</Text><Text style={s.value}>{formatTanggal(kwitansi.tanggal)}</Text></View>

        <View style={s.amountBox}>
          <Text style={s.amountValue}>{formatRupiah(kwitansi.jumlah)}</Text>
          <Text style={s.terbilangText}>{terbilang(kwitansi.jumlah)} Rupiah</Text>
        </View>

        {kwitansi.catatan && <Text style={{ marginBottom: 16, color: '#475569', fontSize: 10 }}>Catatan: {kwitansi.catatan}</Text>}

        <View style={s.signatureBlock}>
          <Text style={s.signatureLabel}>{formatTanggal(kwitansi.tanggal)}</Text>
          <Text style={s.signatureName}>{kwitansi.penerima_nama}</Text>
          {kwitansi.penerima_jabatan && <Text style={{ color: '#64748B', fontSize: 9.5 }}>{kwitansi.penerima_jabatan}</Text>}
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Wire the print button into `KwitansiClient.tsx`**

Add imports:

```tsx
import { pdf } from '@react-pdf/renderer'
import { KwitansiPDF } from '@/components/pdf/KwitansiPDF'
```

Add `Printer` to the `lucide-react` import line:

```tsx
import { Plus, Pencil, Trash2, Loader2, Printer } from 'lucide-react'
```

Add state and handler next to `saving`:

```tsx
const [printingId, setPrintingId] = useState<number | null>(null)

async function handlePrint(k: Kwitansi) {
  setPrintingId(k.id)
  try {
    const blob = await pdf(<KwitansiPDF kwitansi={k} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Kwitansi_${k.nomor.replace(/\//g, '-')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Kwitansi berhasil diunduh')
  } catch (err) {
    console.error(err)
    toast.error('Gagal membuat kwitansi')
  } finally {
    setPrintingId(null)
  }
}
```

In the Aksi `<td>`, add the print button before Edit:

```tsx
<div className="flex items-center gap-0.5">
  <button onClick={() => handlePrint(k)} disabled={printingId === k.id} title="Unduh PDF" aria-label="Unduh kwitansi PDF" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
    {printingId === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
  </button>
  <button onClick={() => openEdit(k)} title="Edit" aria-label="Edit kwitansi" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
    <Pencil className="w-3 h-3" />
  </button>
  <button onClick={() => { setDelTarget(k); setOpenDel(true) }} title="Hapus" aria-label="Hapus kwitansi" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)]" style={{ color: 'var(--cu-text-muted)' }}>
    <Trash2 className="w-3 h-3" />
  </button>
</div>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Live PDF verification**

Create `/tmp/test-kwitansi-pdf.mjs`:

```js
import { chromium } from 'playwright'
import fs from 'fs'

const browser = await chromium.launch()
const page = await browser.newPage()

await page.goto('http://localhost:3000/login')
await page.fill('input[type="email"]', 'admin@direktorat.ac.id')
await page.fill('input[type="password"]', 'usc@_140451')
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard**', { timeout: 15000 })

await page.goto('http://localhost:3000/kwitansi')
await page.waitForLoadState('networkidle')

await page.click('text=Kwitansi Baru')
const dialog = page.locator('[role="dialog"]')
await dialog.waitFor({ state: 'visible' })
await dialog.locator('label:has-text("Diterima Dari")').locator('xpath=following-sibling::input[1]').fill('Siti Aminah PDF')
await dialog.locator('label:has-text("Jumlah")').locator('xpath=following-sibling::input[1]').fill('750000')
await dialog.locator('label:has-text("Untuk Pembayaran")').locator('xpath=following-sibling::input[1]').fill('Sewa ruang aula')
await dialog.locator('label:has-text("Penerima")').locator('xpath=following-sibling::input[1]').fill('Bendahara PDF')
await dialog.locator('button:has-text("Simpan")').click()
await page.waitForTimeout(1500)

const row = page.locator('tr', { hasText: 'Siti Aminah PDF' }).first()
const [download] = await Promise.all([
  page.waitForEvent('download'),
  row.locator('button[title="Unduh PDF"]').click(),
])
const pdfPath = '/tmp/test-kwitansi.pdf'
await download.saveAs(pdfPath)

const pdfParse = (await import('pdf-parse')).default
const buf = fs.readFileSync(pdfPath)
const { text, numpages } = await pdfParse(buf)
console.log('PAGES:', numpages)
console.log('CONTAINS 750.000:', text.includes('750.000'))
console.log('CONTAINS TERBILANG:', text.includes('Tujuh Ratus Lima Puluh Ribu Rupiah'))
console.log('CONTAINS payer:', text.includes('Siti Aminah PDF'))

fs.unlinkSync(pdfPath)

await row.locator('button[title="Hapus"]').click()
await page.locator('[role="dialog"]').locator('button:has-text("Hapus")').click()
await page.waitForTimeout(1500)
console.log('CLEANUP TOAST:', await page.locator('[data-sonner-toast]').allTextContents())

await browser.close()
```

Run: `node /tmp/test-kwitansi-pdf.mjs`

Expected: `PAGES: 1`, `CONTAINS 750.000: true`, `CONTAINS TERBILANG: true`, `CONTAINS payer: true`, `CLEANUP TOAST: [ 'Kwitansi dihapus' ]`.

- [ ] **Step 5: Verify cleanup**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
curl -s "${URL}/rest/v1/kwitansi?select=id" -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
```
Expected: `[]`.

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
git add src/components/pdf/KwitansiPDF.tsx "src/app/(dashboard)/kwitansi/KwitansiClient.tsx"
git commit -m "$(cat <<'EOF'
feat: add Kwitansi PDF export

Compact single-page receipt layout with the amount spelled out via
the existing terbilang() helper. No institution branding.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: RAB — CRUD page

**Files:**
- Create: `src/app/(dashboard)/rab/page.tsx`
- Create: `src/app/(dashboard)/rab/RabClient.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `Rab`, `RabItem` types; `generateNomor`; `groupRabByKategori`, `computeRabGrandTotal`; `formatRupiah`, `formatTanggal`; `handleSupabaseError`.
- Produces: route `/rab`, component `RabClient` (no print button yet — added in Task 7).

- [ ] **Step 1: Write the server page**

Create `src/app/(dashboard)/rab/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { RabClient } from './RabClient'
import type { Rab } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function RabPage() {
  const supabase = await createClient()
  const { data: rabList } = await supabase.from('rab').select('*').order('tanggal', { ascending: false })
  return <RabClient rabList={(rabList || []) as Rab[]} />
}
```

- [ ] **Step 2: Write the client component**

Create `src/app/(dashboard)/rab/RabClient.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { handleSupabaseError } from '@/lib/error-handler'
import { generateNomor } from '@/lib/nomorDokumen'
import { computeRabGrandTotal, groupRabByKategori } from '@/lib/dokumenTotals'
import type { Rab, RabItem } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'

type Props = { rabList: Rab[] }

type ItemForm = { kategori: string; uraian: string; volume: string; satuan: string; harga_satuan: string }
const emptyItem: ItemForm = { kategori: '', uraian: '', volume: '1', satuan: '', harga_satuan: '' }

type FormData = { nomor: string; judul: string; tanggal: string; penyusun_nama: string; penyusun_jabatan: string; catatan: string }
const emptyForm: FormData = { nomor: '', judul: '', tanggal: '', penyusun_nama: '', penyusun_jabatan: '', catatan: '' }

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

export function RabClient({ rabList }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [openForm, setOpenForm] = useState(false)
  const [openDel, setOpenDel] = useState(false)
  const [editTarget, setEditTarget] = useState<Rab | null>(null)
  const [delTarget, setDelTarget] = useState<Rab | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [items, setItems] = useState<ItemForm[]>([{ ...emptyItem }])
  const [saving, setSaving] = useState(false)

  const openAdd = async () => {
    setEditTarget(null)
    const nomor = await generateNomor(supabase, 'rab', 'RAB')
    setForm({ ...emptyForm, nomor, tanggal: todayIso() })
    setItems([{ ...emptyItem }])
    setOpenForm(true)
  }

  const openEdit = (r: Rab) => {
    setEditTarget(r)
    setForm({
      nomor: r.nomor,
      judul: r.judul,
      tanggal: r.tanggal,
      penyusun_nama: r.penyusun_nama,
      penyusun_jabatan: r.penyusun_jabatan || '',
      catatan: r.catatan || '',
    })
    setItems(r.items.map(it => ({ kategori: it.kategori, uraian: it.uraian, volume: String(it.volume), satuan: it.satuan, harga_satuan: String(it.harga_satuan) })))
    setOpenForm(true)
  }

  function updateItem(i: number, patch: Partial<ItemForm>) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it))
  }
  function addItemRow() { setItems(prev => [...prev, { ...emptyItem }]) }
  function removeItemRow(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  const parsedItems: RabItem[] = items
    .filter(it => it.kategori.trim() && it.uraian.trim() && Number(it.harga_satuan) > 0)
    .map(it => ({ kategori: it.kategori.trim(), uraian: it.uraian.trim(), volume: Number(it.volume) || 0, satuan: it.satuan.trim(), harga_satuan: Number(it.harga_satuan) || 0 }))
  const grouped = groupRabByKategori(parsedItems)
  const grandTotal = computeRabGrandTotal(parsedItems)

  async function handleSave() {
    if (!form.nomor || !form.judul || !form.tanggal || !form.penyusun_nama) {
      toast.error('Nomor, judul, tanggal, dan penyusun wajib diisi')
      return
    }
    if (parsedItems.length === 0) {
      toast.error('Minimal satu item dengan kategori, uraian, dan harga satuan valid')
      return
    }
    setSaving(true)
    const payload = {
      nomor: form.nomor,
      judul: form.judul,
      tanggal: form.tanggal,
      penyusun_nama: form.penyusun_nama,
      penyusun_jabatan: form.penyusun_jabatan || null,
      items: parsedItems,
      catatan: form.catatan || null,
      updated_at: new Date().toISOString(),
    }
    if (editTarget) {
      const { error } = await supabase.from('rab').update(payload).eq('id', editTarget.id)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('RAB diperbarui')
    } else {
      const { error } = await supabase.from('rab').insert(payload)
      if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
      toast.success('RAB ditambahkan')
    }
    setSaving(false)
    setOpenForm(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!delTarget) return
    setSaving(true)
    const { error } = await supabase.from('rab').delete().eq('id', delTarget.id)
    if (error) { toast.error(handleSupabaseError(error)); setSaving(false); return }
    toast.success('RAB dihapus')
    setSaving(false)
    setOpenDel(false)
    setDelTarget(null)
    router.refresh()
  }

  return (
    <div className="animate-fade-in">
      <div className="cu-topbar">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-[-0.015em]" style={{ color: 'var(--cu-text)' }}>RAB</h1>
          <div className="text-[12px]" style={{ color: 'var(--cu-text-muted)' }}>{rabList.length} rencana anggaran</div>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-1.5 h-[30px] px-3 rounded-[5px] text-[12px] font-medium"
          style={{ background: 'var(--cu-primary)', color: '#ffffff' }}
        >
          <Plus className="w-3.5 h-3.5" /> RAB Baru
        </button>
      </div>

      <div className="cu-page">
        <div className="cu-card overflow-hidden">
          {rabList.length === 0 ? (
            <div className="py-16 text-center text-[13px]" style={{ color: 'var(--cu-text-muted)' }}>Belum ada RAB</div>
          ) : (
            <div className="cu-table-wrap">
              <table className="cu-table">
                <thead>
                  <tr>
                    <th style={{ width: 110 }}>Nomor</th>
                    <th style={{ width: 90 }}>Tanggal</th>
                    <th>Judul</th>
                    <th className="cu-num" style={{ width: 140 }}>Total</th>
                    <th style={{ width: 90 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rabList.map(r => (
                    <tr key={r.id}>
                      <td className="cu-mono text-[12px]">{r.nomor}</td>
                      <td className="cu-mono text-[11.5px] whitespace-nowrap" style={{ color: 'var(--cu-text-2)' }}>{formatTanggal(r.tanggal)}</td>
                      <td className="text-[12.5px]" style={{ color: 'var(--cu-text)' }}>{r.judul}</td>
                      <td className="cu-num cu-mono text-[12px] font-medium">{formatRupiah(computeRabGrandTotal(r.items))}</td>
                      <td>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => openEdit(r)} title="Edit" aria-label="Edit RAB" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button onClick={() => { setDelTarget(r); setOpenDel(true) }} title="Hapus" aria-label="Hapus RAB" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)]" style={{ color: 'var(--cu-text-muted)' }}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold">{editTarget ? 'Edit RAB' : 'RAB Baru'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Nomor *</Label>
                <Input value={form.nomor} onChange={e => setForm(f => ({ ...f, nomor: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>
            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Judul *</Label>
              <Input placeholder="cth: RAB Kegiatan Lomba 17 Agustus" value={form.judul} onChange={e => setForm(f => ({ ...f, judul: e.target.value }))} className="h-9 text-[13px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Penyusun *</Label>
                <Input value={form.penyusun_nama} onChange={e => setForm(f => ({ ...f, penyusun_nama: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Jabatan</Label>
                <Input value={form.penyusun_jabatan} onChange={e => setForm(f => ({ ...f, penyusun_jabatan: e.target.value }))} className="h-9 text-[13px]" />
              </div>
            </div>

            <div className="text-[11.5px] font-semibold pt-1" style={{ color: 'var(--cu-text-muted)' }}>Item Anggaran</div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-end gap-2 flex-wrap">
                  <div className="w-28">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Kategori</Label>
                    <Input value={it.kategori} onChange={e => updateItem(i, { kategori: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Uraian</Label>
                    <Input value={it.uraian} onChange={e => updateItem(i, { uraian: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="w-16">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Volume</Label>
                    <Input type="number" value={it.volume} onChange={e => updateItem(i, { volume: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="w-20">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Satuan</Label>
                    <Input placeholder="unit" value={it.satuan} onChange={e => updateItem(i, { satuan: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <div className="w-32">
                    <Label className="text-[11px] mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Harga Satuan</Label>
                    <Input type="number" value={it.harga_satuan} onChange={e => updateItem(i, { harga_satuan: e.target.value })} className="h-9 text-[13px]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItemRow(i)}
                    disabled={items.length === 1}
                    aria-label="Hapus item"
                    className="w-9 h-9 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)] disabled:opacity-30"
                    style={{ color: 'var(--cu-text-muted)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addItemRow} className="text-[12px] font-medium" style={{ color: 'var(--cu-primary)' }}>
                + Tambah Item
              </button>
            </div>

            <div className="rounded-md p-3 space-y-1" style={{ background: 'var(--cu-surface-2)' }}>
              {grouped.map(g => (
                <div key={g.kategori} className="flex justify-between text-[12px]">
                  <span style={{ color: 'var(--cu-text-muted)' }}>{g.kategori}</span>
                  <span className="cu-mono">{formatRupiah(g.subtotal)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[13px] font-semibold pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                <span>Grand Total</span><span className="cu-mono">{formatRupiah(grandTotal)}</span>
              </div>
            </div>

            <div>
              <Label className="text-[12px] font-medium mb-1 block" style={{ color: 'var(--cu-text-2)' }}>Catatan</Label>
              <Textarea placeholder="Catatan tambahan (opsional)" rows={2} value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} className="text-[13px]" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenForm(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--cu-primary)', color: '#fff' }}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Menyimpan…</> : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openDel} onOpenChange={setOpenDel}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-semibold" style={{ color: 'var(--cu-danger)' }}>Hapus RAB</DialogTitle>
          </DialogHeader>
          <div className="py-3 text-[13px]" style={{ color: 'var(--cu-text-2)' }}>
            Yakin ingin menghapus RAB <strong style={{ color: 'var(--cu-text)' }}>{delTarget?.judul}</strong>? Tindakan ini tidak dapat dibatalkan.
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenDel(false)} className="h-8 text-[12px]">Batal</Button>
            <Button onClick={handleDelete} disabled={saving} className="h-8 text-[12px]" style={{ background: 'var(--cu-danger)', color: '#fff' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 3: Add the sidebar nav item**

Add `ClipboardList` to the `lucide-react` import in `src/components/layout/Sidebar.tsx`:

```ts
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  FileBarChart,
  Settings,
  Database,
  Users,
  LogOut,
  Loader2,
  HandCoins,
  FileText,
  ReceiptText,
  ClipboardList,
} from 'lucide-react'
```

Add to `navItems`, right after Kwitansi:

```ts
{ href: '/rab',         label: 'RAB',          icon: ClipboardList,   superAdminOnly: false },
```

Do not add `/rab` to `BOOK_SCOPED_PATHS`. Final `navItems` array should now read:

```ts
const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard, superAdminOnly: false },
  { href: '/dana',        label: 'Dana Masuk',  icon: Wallet,          superAdminOnly: false },
  { href: '/pengeluaran', label: 'Pengeluaran', icon: Receipt,         superAdminOnly: false },
  { href: '/peminjaman',  label: 'Peminjaman',  icon: HandCoins,       superAdminOnly: false },
  { href: '/invoice',     label: 'Invoice',     icon: FileText,        superAdminOnly: false },
  { href: '/kwitansi',    label: 'Kwitansi',    icon: ReceiptText,     superAdminOnly: false },
  { href: '/rab',         label: 'RAB',          icon: ClipboardList,   superAdminOnly: false },
  { href: '/laporan',     label: 'Laporan',     icon: FileBarChart,    superAdminOnly: false },
  { href: '/master-data', label: 'Master Data', icon: Database,        superAdminOnly: false },
  { href: '/pengguna',    label: 'Pengguna',    icon: Users,           superAdminOnly: true  },
  { href: '/pengaturan',  label: 'Pengaturan',  icon: Settings,        superAdminOnly: false },
]

const BOOK_SCOPED_PATHS = ['/dashboard', '/dana', '/pengeluaran', '/peminjaman', '/laporan']
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 5: Live CRUD smoke test (two categories)**

Create `/tmp/test-rab-crud.mjs`:

```js
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', err => console.log('PAGEERROR:', err.message))

await page.goto('http://localhost:3000/login')
await page.fill('input[type="email"]', 'admin@direktorat.ac.id')
await page.fill('input[type="password"]', 'usc@_140451')
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard**', { timeout: 15000 })

await page.goto('http://localhost:3000/rab')
await page.waitForLoadState('networkidle')

await page.click('text=RAB Baru')
const dialog = page.locator('[role="dialog"]')
await dialog.waitFor({ state: 'visible' })

const nomor = await dialog.locator('label:has-text("Nomor")').locator('xpath=following-sibling::input[1]').inputValue()
console.log('GENERATED NOMOR:', nomor)

await dialog.locator('label:has-text("Judul")').locator('xpath=following-sibling::input[1]').fill('RAB Uji Coba Plan')
await dialog.locator('label:has-text("Penyusun")').locator('xpath=following-sibling::input[1]').fill('Panitia Test')

// first item row: Konsumsi
await dialog.locator('label:has-text("Kategori")').locator('xpath=following-sibling::input[1]').fill('Konsumsi')
await dialog.locator('label:has-text("Uraian")').locator('xpath=following-sibling::input[1]').fill('Snack peserta')
await dialog.locator('label:has-text("Volume")').locator('xpath=following-sibling::input[1]').fill('50')
await dialog.locator('label:has-text("Satuan")').locator('xpath=following-sibling::input[1]').fill('dus')
await dialog.locator('label:has-text("Harga Satuan")').locator('xpath=following-sibling::input[1]').fill('15000')

// add second row: Perlengkapan
await dialog.locator('text=+ Tambah Item').click()
const kategoriInputs = dialog.locator('label:has-text("Kategori")').locator('xpath=following-sibling::input[1]')
const uraianInputs = dialog.locator('label:has-text("Uraian")').locator('xpath=following-sibling::input[1]')
const volumeInputs = dialog.locator('label:has-text("Volume")').locator('xpath=following-sibling::input[1]')
const satuanInputs = dialog.locator('label:has-text("Satuan")').locator('xpath=following-sibling::input[1]')
const hargaInputs = dialog.locator('label:has-text("Harga Satuan")').locator('xpath=following-sibling::input[1]')
await kategoriInputs.nth(1).fill('Perlengkapan')
await uraianInputs.nth(1).fill('Spanduk')
await volumeInputs.nth(1).fill('5')
await satuanInputs.nth(1).fill('unit')
await hargaInputs.nth(1).fill('100000')

const grandTotalText = await dialog.locator('text=Grand Total').locator('xpath=following-sibling::span[1]').textContent()
console.log('PREVIEW GRAND TOTAL:', grandTotalText)

await dialog.locator('button:has-text("Simpan")').click()
await page.waitForTimeout(1500)
console.log('CREATE TOAST:', await page.locator('[data-sonner-toast]').allTextContents())

const row = page.locator('tr', { hasText: 'RAB Uji Coba Plan' }).first()
const rowTotal = await row.locator('td.cu-num').textContent()
console.log('LIST ROW TOTAL:', rowTotal)

await row.locator('button[title="Hapus"]').click()
await page.locator('[role="dialog"]').locator('button:has-text("Hapus")').click()
await page.waitForTimeout(1500)
console.log('DELETE TOAST:', await page.locator('[data-sonner-toast]').allTextContents())

await browser.close()
```

Run: `node /tmp/test-rab-crud.mjs`

Expected: `GENERATED NOMOR: RAB/2026/001`, `PREVIEW GRAND TOTAL: Rp 1.250.000` (50×15.000=750.000 Konsumsi + 5×100.000=500.000 Perlengkapan), `CREATE TOAST: [ 'RAB ditambahkan' ]`, `LIST ROW TOTAL: Rp 1.250.000`, `DELETE TOAST: [ 'RAB dihapus' ]`.

- [ ] **Step 6: Verify cleanup**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
curl -s "${URL}/rest/v1/rab?select=id" -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
```
Expected: `[]`.

- [ ] **Step 7: Commit**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
git add "src/app/(dashboard)/rab" src/components/layout/Sidebar.tsx
git commit -m "$(cat <<'EOF'
feat: add RAB CRUD page

Standalone budget-plan list + create/edit dialog with a
free-text-category line-item editor and per-category subtotals.
No PDF yet.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: RAB — PDF export

**Files:**
- Create: `src/components/pdf/RabPDF.tsx`
- Modify: `src/app/(dashboard)/rab/RabClient.tsx`

**Interfaces:**
- Consumes: `Rab` type, `groupRabByKategori`, `computeRabGrandTotal`, `formatRupiah`, `formatTanggal`.
- Produces: `RabPDF` component (props: `{ rab: Rab }`), print button wired into `RabClient`'s Aksi column.

- [ ] **Step 1: Write the PDF template**

Create `src/components/pdf/RabPDF.tsx`:

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { groupRabByKategori, computeRabGrandTotal } from '@/lib/dokumenTotals'
import type { Rab } from '@/lib/types'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1E293B', backgroundColor: '#FFFFFF', padding: '36 48', lineHeight: 1.4 },
  headerTitle: { fontSize: 16, fontWeight: 700, textAlign: 'center' },
  headerSubtitle: { fontSize: 11, textAlign: 'center', marginTop: 2, marginBottom: 4 },
  headerMeta: { textAlign: 'center', color: '#64748B', fontSize: 9, marginBottom: 18 },

  table: { marginBottom: 8 },
  tableHeaderRow: { flexDirection: 'row', borderBottom: '1 solid #1E293B', paddingBottom: 4, marginBottom: 4 },
  categoryRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', paddingVertical: 3, paddingHorizontal: 2, marginTop: 6 },
  categoryLabel: { fontWeight: 700, fontSize: 9.5, textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', paddingVertical: 3, borderBottom: '0.5 solid #E2E8F0' },
  subtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 3 },

  colUraian: { flex: 1 },
  colVolume: { width: 50, textAlign: 'right' },
  colSatuan: { width: 50, textAlign: 'right' },
  colHarga: { width: 85, textAlign: 'right' },
  colSubtotal: { width: 85, textAlign: 'right' },
  th: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' },

  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, marginTop: 8, borderTop: '1 solid #1E293B' },
  grandTotalLabel: { fontWeight: 700, fontSize: 11 },
  grandTotalValue: { fontWeight: 700, fontSize: 11 },

  notes: { marginTop: 14, fontSize: 9.5, color: '#475569' },

  signatureBlock: { marginTop: 30, width: 200, alignSelf: 'flex-end', textAlign: 'center' },
  signatureLabel: { marginBottom: 40, color: '#64748B' },
  signatureName: { fontWeight: 700, textDecoration: 'underline' },
})

type Props = { rab: Rab }

export function RabPDF({ rab }: Props) {
  const grouped = groupRabByKategori(rab.items)
  const grandTotal = computeRabGrandTotal(rab.items)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.headerTitle}>RENCANA ANGGARAN BIAYA</Text>
        <Text style={s.headerSubtitle}>{rab.judul}</Text>
        <Text style={s.headerMeta}>No. {rab.nomor} · {formatTanggal(rab.tanggal)}</Text>

        <View style={s.table}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.th, s.colUraian]}>Uraian</Text>
            <Text style={[s.th, s.colVolume]}>Volume</Text>
            <Text style={[s.th, s.colSatuan]}>Satuan</Text>
            <Text style={[s.th, s.colHarga]}>Harga Satuan</Text>
            <Text style={[s.th, s.colSubtotal]}>Subtotal</Text>
          </View>
          {grouped.map(g => (
            <View key={g.kategori}>
              <View style={s.categoryRow}><Text style={s.categoryLabel}>{g.kategori}</Text></View>
              {g.items.map((it, i) => (
                <View key={i} style={s.itemRow}>
                  <Text style={s.colUraian}>{it.uraian}</Text>
                  <Text style={s.colVolume}>{it.volume}</Text>
                  <Text style={s.colSatuan}>{it.satuan}</Text>
                  <Text style={s.colHarga}>{formatRupiah(it.harga_satuan)}</Text>
                  <Text style={s.colSubtotal}>{formatRupiah(it.volume * it.harga_satuan)}</Text>
                </View>
              ))}
              <View style={s.subtotalRow}>
                <Text style={{ fontWeight: 700 }}>Subtotal {g.kategori}: {formatRupiah(g.subtotal)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.grandTotalRow}>
          <Text style={s.grandTotalLabel}>Grand Total</Text>
          <Text style={s.grandTotalValue}>{formatRupiah(grandTotal)}</Text>
        </View>

        {rab.catatan && <Text style={s.notes}>Catatan: {rab.catatan}</Text>}

        <View style={s.signatureBlock}>
          <Text style={s.signatureLabel}>{formatTanggal(rab.tanggal)}</Text>
          <Text style={s.signatureName}>{rab.penyusun_nama}</Text>
          {rab.penyusun_jabatan && <Text style={{ color: '#64748B', fontSize: 9.5 }}>{rab.penyusun_jabatan}</Text>}
        </View>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Wire the print button into `RabClient.tsx`**

Add imports:

```tsx
import { pdf } from '@react-pdf/renderer'
import { RabPDF } from '@/components/pdf/RabPDF'
```

Add `Printer` to the `lucide-react` import line:

```tsx
import { Plus, Pencil, Trash2, Loader2, X, Printer } from 'lucide-react'
```

Add state and handler next to `saving`:

```tsx
const [printingId, setPrintingId] = useState<number | null>(null)

async function handlePrint(r: Rab) {
  setPrintingId(r.id)
  try {
    const blob = await pdf(<RabPDF rab={r} />).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `RAB_${r.nomor.replace(/\//g, '-')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('RAB berhasil diunduh')
  } catch (err) {
    console.error(err)
    toast.error('Gagal membuat RAB')
  } finally {
    setPrintingId(null)
  }
}
```

In the Aksi `<td>`, add the print button before Edit:

```tsx
<div className="flex items-center gap-0.5">
  <button onClick={() => handlePrint(r)} disabled={printingId === r.id} title="Unduh PDF" aria-label="Unduh RAB PDF" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
    {printingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
  </button>
  <button onClick={() => openEdit(r)} title="Edit" aria-label="Edit RAB" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-surface-2)]" style={{ color: 'var(--cu-text-muted)' }}>
    <Pencil className="w-3 h-3" />
  </button>
  <button onClick={() => { setDelTarget(r); setOpenDel(true) }} title="Hapus" aria-label="Hapus RAB" className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--cu-danger-soft)]" style={{ color: 'var(--cu-text-muted)' }}>
    <Trash2 className="w-3 h-3" />
  </button>
</div>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output, exit code 0.

- [ ] **Step 4: Live PDF verification**

Create `/tmp/test-rab-pdf.mjs`:

```js
import { chromium } from 'playwright'
import fs from 'fs'

const browser = await chromium.launch()
const page = await browser.newPage()

await page.goto('http://localhost:3000/login')
await page.fill('input[type="email"]', 'admin@direktorat.ac.id')
await page.fill('input[type="password"]', 'usc@_140451')
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard**', { timeout: 15000 })

await page.goto('http://localhost:3000/rab')
await page.waitForLoadState('networkidle')

await page.click('text=RAB Baru')
const dialog = page.locator('[role="dialog"]')
await dialog.waitFor({ state: 'visible' })
await dialog.locator('label:has-text("Judul")').locator('xpath=following-sibling::input[1]').fill('RAB Uji Coba PDF')
await dialog.locator('label:has-text("Penyusun")').locator('xpath=following-sibling::input[1]').fill('Panitia PDF')
await dialog.locator('label:has-text("Kategori")').locator('xpath=following-sibling::input[1]').fill('Konsumsi')
await dialog.locator('label:has-text("Uraian")').locator('xpath=following-sibling::input[1]').fill('Snack peserta')
await dialog.locator('label:has-text("Volume")').locator('xpath=following-sibling::input[1]').fill('50')
await dialog.locator('label:has-text("Satuan")').locator('xpath=following-sibling::input[1]').fill('dus')
await dialog.locator('label:has-text("Harga Satuan")').locator('xpath=following-sibling::input[1]').fill('15000')
await dialog.locator('text=+ Tambah Item').click()
await dialog.locator('label:has-text("Kategori")').locator('xpath=following-sibling::input[1]').nth(1).fill('Perlengkapan')
await dialog.locator('label:has-text("Uraian")').locator('xpath=following-sibling::input[1]').nth(1).fill('Spanduk')
await dialog.locator('label:has-text("Volume")').locator('xpath=following-sibling::input[1]').nth(1).fill('5')
await dialog.locator('label:has-text("Satuan")').locator('xpath=following-sibling::input[1]').nth(1).fill('unit')
await dialog.locator('label:has-text("Harga Satuan")').locator('xpath=following-sibling::input[1]').nth(1).fill('100000')
await dialog.locator('button:has-text("Simpan")').click()
await page.waitForTimeout(1500)

const row = page.locator('tr', { hasText: 'RAB Uji Coba PDF' }).first()
const [download] = await Promise.all([
  page.waitForEvent('download'),
  row.locator('button[title="Unduh PDF"]').click(),
])
const pdfPath = '/tmp/test-rab.pdf'
await download.saveAs(pdfPath)

const pdfParse = (await import('pdf-parse')).default
const buf = fs.readFileSync(pdfPath)
const { text, numpages } = await pdfParse(buf)
console.log('PAGES:', numpages)
console.log('CONTAINS 750.000 (Konsumsi subtotal):', text.includes('750.000'))
console.log('CONTAINS 500.000 (Perlengkapan subtotal):', text.includes('500.000'))
console.log('CONTAINS 1.250.000 (grand total):', text.includes('1.250.000'))
console.log('CONTAINS Konsumsi:', text.includes('KONSUMSI') || text.includes('Konsumsi'))
console.log('CONTAINS Perlengkapan:', text.includes('PERLENGKAPAN') || text.includes('Perlengkapan'))

fs.unlinkSync(pdfPath)

await row.locator('button[title="Hapus"]').click()
await page.locator('[role="dialog"]').locator('button:has-text("Hapus")').click()
await page.waitForTimeout(1500)
console.log('CLEANUP TOAST:', await page.locator('[data-sonner-toast]').allTextContents())

await browser.close()
```

Run: `node /tmp/test-rab-pdf.mjs`

Expected: `PAGES: 1`, `CONTAINS 750.000 (Konsumsi subtotal): true`, `CONTAINS 500.000 (Perlengkapan subtotal): true`, `CONTAINS 1.250.000 (grand total): true`, both category checks `true`, `CLEANUP TOAST: [ 'RAB dihapus' ]`.

- [ ] **Step 5: Verify cleanup and remove the temporary `pdf-parse` install**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
curl -s "${URL}/rest/v1/rab?select=id" -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"

npm uninstall pdf-parse
git status --short package-lock.json
```
Expected: `[]` from the REST call. If `npm uninstall` reports it wasn't in `package.json` (since it was installed with `--no-save`), that's fine — just confirm `ls node_modules/pdf-parse` no longer exists (or run `rm -rf node_modules/pdf-parse` directly) and `git status --short package-lock.json` shows no diff. This dev-only PDF-text-reader was verification tooling, not a runtime dependency of the app.

- [ ] **Step 6: Commit**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
git add src/components/pdf/RabPDF.tsx "src/app/(dashboard)/rab/RabClient.tsx"
git commit -m "$(cat <<'EOF'
feat: add RAB PDF export

Category-grouped item table with per-category subtotals and a
grand total. No institution branding.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Final integration check

**Files:** none (verification only).

**Interfaces:** none — this task confirms all prior tasks work together and nothing else in the app regressed.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors (warnings acceptable only if they already existed before this plan — compare against `git stash` if unsure).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds. This is the check that previously caught real bugs in this project (missing `<Suspense>` around `useSearchParams()` on the login page and in `Sidebar.tsx`) — if it fails with a similar "should be wrapped in a suspense boundary" error on `/invoice`, `/kwitansi`, or `/rab`, it means one of those pages' `page.tsx` files reads `searchParams` outside of a Suspense-wrapped client component; none of the three should (they don't read `searchParams` at all per this plan), so a failure here signals something else went wrong and needs investigating before proceeding.

- [ ] **Step 3: Full click-through regression check**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
lsof -ti:3000 -sTCP:LISTEN >/dev/null 2>&1 && echo "already running" || (npm run dev &)
```

Create `/tmp/test-full-regression.mjs`:

```js
import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('pageerror', err => errors.push(err.message))

await page.goto('http://localhost:3000/login')
await page.fill('input[type="email"]', 'admin@direktorat.ac.id')
await page.fill('input[type="password"]', 'usc@_140451')
await page.click('button[type="submit"]')
await page.waitForURL('**/dashboard**', { timeout: 15000 })

for (const path of ['/dashboard', '/dana', '/pengeluaran', '/peminjaman', '/invoice', '/kwitansi', '/rab', '/laporan', '/pengaturan']) {
  await page.goto(`http://localhost:3000${path}`)
  await page.waitForLoadState('networkidle')
  console.log(path, '-> title:', await page.title())
}

console.log('CONSOLE ERRORS:', errors.length === 0 ? 'none' : errors)

// Confirm the real Peminjaman record is untouched
await page.goto('http://localhost:3000/peminjaman')
await page.waitForLoadState('networkidle')
const rudiantoVisible = await page.locator('text=Rudianto').isVisible()
console.log('RUDIANTO STILL PRESENT:', rudiantoVisible)

await browser.close()
```

Run: `node /tmp/test-full-regression.mjs`

Expected: every path prints a real page title (not an error page), `CONSOLE ERRORS: none`, `RUDIANTO STILL PRESENT: true`.

- [ ] **Step 4: Confirm no orphaned test data**

```bash
cd "/Volumes/File Home/File Web/CatatUang"
URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2- | tr -d '"' | tr -d "'" | xargs)
curl -s "${URL}/rest/v1/invoice?select=id"   -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
curl -s "${URL}/rest/v1/kwitansi?select=id"  -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
curl -s "${URL}/rest/v1/rab?select=id"       -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
curl -s "${URL}/rest/v1/peminjaman?select=id,nama_peminjam" -H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}"
```
Expected: `invoice`, `kwitansi`, `rab` all `[]` (every verification task cleaned up after itself); `peminjaman` returns exactly `[{"id":2,"nama_peminjam":"Rudianto"}]` (or whatever its current real id is) and nothing else.

- [ ] **Step 5: Clean up temp scripts**

```bash
rm -f /tmp/test-invoice-crud.mjs /tmp/test-invoice-pdf.mjs /tmp/test-kwitansi-crud.mjs /tmp/test-kwitansi-pdf.mjs /tmp/test-rab-crud.mjs /tmp/test-rab-pdf.mjs /tmp/test-full-regression.mjs
```

No commit needed for this task — it's verification-only and produced no file changes (assuming Steps 1–2 passed without needing fixes).

---

## Self-Review Notes

- **Spec coverage:** every section of `docs/superpowers/specs/2026-08-19-dokumen-umum-design.md` maps to a task — data model & RLS (Task 1), numbering (Task 1, used in Tasks 2/4/6), `Invoice`/`Kwitansi`/`Rab` types (Task 1), Invoice CRUD+tax/discount+status (Task 2), Invoice PDF (Task 3), Kwitansi CRUD+optional invoice link (Task 4), Kwitansi PDF+terbilang (Task 5), RAB CRUD+category grouping (Task 6), RAB PDF (Task 7), Sidebar nav items as three separate entries not book-scoped (Tasks 2/4/6), no ledger writes anywhere (true throughout — no task ever touches `pemasukan`/`pengeluaran`/`dana_masuk`), no institution branding (Tasks 3/5/7 templates take every identity field as a prop).
- **Type consistency check:** `InvoiceItem { uraian, qty, harga_satuan }` is used identically in `types.ts`, `dokumenTotals.ts`, `InvoiceClient.tsx`, and `InvoicePDF.tsx`. `RabItem { kategori, uraian, volume, satuan, harga_satuan }` is used identically across `types.ts`, `dokumenTotals.ts`, `RabClient.tsx`, and `RabPDF.tsx`. `generateNomor`'s signature (`supabase, table, prefix`) matches every call site in Tasks 2/4/6. `computeInvoiceTotals`'s return shape (`subtotal, diskonNominal, dpp, pajakNominal, total`) matches every place it's destructured (`InvoiceClient.tsx`, `InvoicePDF.tsx`, `KwitansiClient.tsx`'s `handlePickInvoice`).
- **No placeholders:** every step above contains complete, runnable code — no `TODO`, no "implement later", no code referencing a function not defined in an earlier task.
