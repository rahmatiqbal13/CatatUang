'use client'

import { useSyncExternalStore } from 'react'
import { Printer, X } from 'lucide-react'
import { formatRp } from '@/lib/tokens'
import { formatTanggal, terbilangRupiah } from '@/lib/formatters'
import { subtotalItems } from '@/lib/nota'
import type { Nota, Toko } from '@/lib/types'

type Template = 'a4' | 'a5' | 'thermal80'

const TEMPLATES: { id: Template; label: string; hint: string }[] = [
  { id: 'a4', label: 'A4', hint: 'Kertas biasa' },
  { id: 'a5', label: 'A5', hint: 'Setengah A4' },
  { id: 'thermal80', label: 'Thermal 80 mm', hint: 'Printer kasir' },
]

/* @page rules per template. Thermal leaves the page length to the printer driver
   (continuous roll) — pick the 80 mm paper size in the print dialog. */
const PAGE_CSS: Record<Template, string> = {
  a4: '@page { size: A4; margin: 14mm; }',
  a5: '@page { size: A5; margin: 9mm; }',
  thermal80: '@page { margin: 0; }',
}

// Print preferences (template, show number), remembered per browser.
const TEMPLATE_KEY = 'catatuang.nota.template'
const NOMOR_KEY = 'catatuang.nota.showNomor'
const listeners = new Set<() => void>()
const readPref = (key: string) => {
  try { return localStorage.getItem(key) } catch { return null }
}
const writePref = (key: string, value: string) => {
  try { localStorage.setItem(key, value) } catch { /* private mode: just don't remember */ }
  listeners.forEach(l => l())
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }
const readTemplate = (): Template => {
  const v = readPref(TEMPLATE_KEY)
  return v === 'a5' || v === 'thermal80' ? v : 'a4'
}
const readShowNomor = () => readPref(NOMOR_KEY) !== '0'

export function NotaPrint({ nota, toko }: { nota: Nota; toko: Toko }) {
  const template = useSyncExternalStore(subscribe, readTemplate, () => 'a4' as Template)
  const showNomor = useSyncExternalStore(subscribe, readShowNomor, () => true)
  const thermal = template === 'thermal80'

  return (
    <div className="nota-print-root min-h-screen" style={{ background: 'var(--surface-2)' }}>
      <style>{`
        ${PAGE_CSS[template]}
        @media print {
          html, body, .nota-print-root { background: #fff !important; }
          .nota-toolbar { display: none !important; }
          .nota-stage { padding: 0 !important; }
          .nota-sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; padding: ${thermal ? '3mm 4mm' : '0'} !important; }
        }
      `}</style>

      {/* Toolbar — never printed */}
      <div className="nota-toolbar sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b px-5 py-3" style={{ background: 'var(--surface-elev)', borderColor: 'var(--divider)' }}>
        <div className="min-w-0 flex-1">
          <div className="label-caps text-[10.5px]" style={{ color: 'var(--text-muted)' }}>Cetak nota</div>
          <div className="cu-mono text-[14px] font-semibold">{nota.nomor}</div>
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Template">
          {TEMPLATES.map(t => {
            const on = template === t.id
            return (
              <button
                key={t.id}
                role="radio"
                aria-checked={on}
                onClick={() => writePref(TEMPLATE_KEY, t.id)}
                className="flex flex-col items-start rounded-[12px] border px-3 py-[6px] text-left"
                style={{ borderColor: on ? '#9DBBA8' : 'var(--divider)', background: on ? 'var(--accent-100)' : 'transparent', color: on ? 'var(--brand)' : 'var(--text)' }}
              >
                <span className="text-[13px] font-semibold">{t.label}</span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.hint}</span>
              </button>
            )
          })}
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-[10px] text-[13px] font-semibold">
          <button
            role="switch"
            aria-checked={showNomor}
            onClick={() => writePref(NOMOR_KEY, showNomor ? '0' : '1')}
            className="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors"
            style={{ background: showNomor ? 'var(--accent)' : 'var(--border-dashed)' }}
          >
            <span
              className="absolute top-[3px] left-[3px] h-5 w-5 rounded-full shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-transform"
              style={{ background: 'var(--surface-elev)', transform: showNomor ? 'translateX(18px)' : 'none' }}
            />
          </button>
          Tampilkan nomor
        </label>
        <button
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--surface-elev)' }}
        >
          <Printer className="h-4 w-4" /> Cetak
        </button>
        <button
          onClick={() => window.close()}
          className="flex h-11 w-11 items-center justify-center rounded-full border"
          style={{ borderColor: 'var(--divider)' }}
          aria-label="Tutup"
        >
          <X className="h-4 w-4" />
        </button>
        {thermal && (
          <p className="w-full text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Di dialog cetak, pilih printer thermal, ukuran kertas 80 mm, margin “Tidak ada”, dan matikan “Header dan footer”.
          </p>
        )}
      </div>

      <div className="nota-stage flex justify-center px-4 py-8">
        {thermal
          ? <ThermalSlip nota={nota} toko={toko} showNomor={showNomor} />
          : <PaperSlip nota={nota} toko={toko} size={template} showNomor={showNomor} />}
      </div>
    </div>
  )
}

/** Signature lines at the foot of every template: the recipient signs "Tanda terima"; "Hormat kami" is the store's, line only. */
const SIGNATURES = ['Tanda terima', 'Hormat kami'] as const

/* ── A4 / A5 ─────────────────────────────────────────────────────────── */

function PaperSlip({ nota, toko, size, showNomor }: { nota: Nota; toko: Toko; size: 'a4' | 'a5'; showNomor: boolean }) {
  const a5 = size === 'a5'
  const subtotal = subtotalItems(nota.items)
  const kembali = nota.bayar != null ? Number(nota.bayar) - Number(nota.total) : null
  const fs = (a4: number) => (a5 ? Math.round(a4 * 0.85 * 10) / 10 : a4)

  return (
    <article
      className="nota-sheet flex flex-col"
      style={{
        // Sheet = paper minus @page margins, so the preview matches the print.
        width: a5 ? '130mm' : '182mm',
        minHeight: a5 ? '192mm' : '269mm',
        background: '#fff',
        color: '#18241E',
        padding: a5 ? '9mm' : '14mm',
        boxSizing: 'content-box',
        boxShadow: '0 22px 44px -30px rgba(24,36,30,.45)',
        border: '1px solid var(--divider)',
        gap: a5 ? 14 : 20,
        fontSize: fs(13),
      }}
    >
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="serif leading-[1.05] tracking-[-0.02em]" style={{ fontSize: fs(30) }}>{toko.nama}</div>
          {toko.alamat && <div className="mt-[6px] whitespace-pre-line" style={{ color: '#45514A' }}>{toko.alamat}</div>}
          {toko.telepon && <div style={{ color: '#45514A' }}>Telp. {toko.telepon}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="label-caps" style={{ color: '#646B64', fontSize: fs(11) }}>Nota</div>
          {showNomor && <div className="cu-mono font-semibold" style={{ fontSize: fs(14) }}>{nota.nomor}</div>}
          <div className="mt-1" style={{ color: '#45514A' }}>{formatTanggal(nota.tanggal)}</div>
          {nota.kasir && <div style={{ color: '#646B64' }}>Kasir: {nota.kasir}</div>}
        </div>
      </header>

      <div style={{ borderTop: '3px double #18241E' }} />

      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid #18241E' }}>
            {['No', 'Item', 'Qty', 'Harga', 'Jumlah'].map((h, i) => (
              <th
                key={h}
                className="label-caps py-2 font-medium"
                style={{ color: '#646B64', fontSize: fs(10.5), textAlign: i >= 2 ? 'right' : 'left', width: i === 0 ? 32 : i === 2 ? 80 : i >= 3 ? 110 : undefined }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nota.items.map((it, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #E3DDD0' }}>
              <td className="cu-mono py-2" style={{ color: '#646B64' }}>{i + 1}</td>
              <td className="py-2">{it.nama}</td>
              <td className="cu-mono py-2 text-right whitespace-nowrap">{it.qty}{it.satuan ? ` ${it.satuan}` : ''}</td>
              <td className="cu-mono py-2 text-right">{formatRp(it.harga)}</td>
              <td className="cu-mono py-2 text-right font-semibold">{formatRp(it.qty * it.harga)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ml-auto flex w-full max-w-[300px] flex-col gap-1">
        <Line label="Subtotal" value={formatRp(subtotal)} />
        {Number(nota.diskon) > 0 && <Line label="Diskon" value={`−${formatRp(nota.diskon)}`} />}
        <div className="mt-1 flex items-baseline justify-between border-t pt-2" style={{ borderColor: '#18241E' }}>
          <span className="font-semibold">Total</span>
          <span className="serif tracking-[-0.02em]" style={{ fontSize: fs(26) }}>Rp {formatRp(nota.total)}</span>
        </div>
        <Line label={`Bayar · ${nota.metode}`} value={nota.bayar != null ? formatRp(nota.bayar) : '—'} />
        {kembali != null && kembali > 0 && <Line label="Kembali" value={formatRp(kembali)} />}
      </div>

      <div className="serif italic" style={{ color: '#45514A', fontSize: fs(15) }}>
        Terbilang: {terbilangRupiah(Number(nota.total))}
      </div>

      {nota.catatan && <div style={{ color: '#45514A' }}>Catatan: {nota.catatan}</div>}

      <div className="mt-auto flex flex-col gap-5 pt-6">
        {toko.catatan_kaki && <div className="serif text-center italic" style={{ color: '#45514A', fontSize: fs(14) }}>{toko.catatan_kaki}</div>}
        <div className="grid grid-cols-2" style={{ gap: a5 ? 32 : 64 }}>
          {SIGNATURES.map(sig => (
            <div key={sig} className="text-center">
              <div style={{ color: '#646B64' }}>{sig},</div>
              <div style={{ height: a5 ? 52 : 68 }} />
              <div className="border-t" style={{ borderColor: '#18241E' }} />
            </div>
          ))}
        </div>
      </div>
    </article>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span style={{ color: '#646B64' }}>{label}</span>
      <span className="cu-mono">{value}</span>
    </div>
  )
}

/* ── Thermal 80 mm ───────────────────────────────────────────────────── */

const pad2 = (n: number) => String(n).padStart(2, '0')

/** "16/10/2026 19:06" — time only when the nota was created on its own date (not backdated). */
function stamp(nota: Nota) {
  const [y, m, d] = nota.tanggal.split('-')
  const date = `${d}/${m}/${y}`
  const created = new Date(nota.created_at)
  if (Number.isNaN(created.getTime())) return date
  const sameDay = created.getFullYear() === +y && created.getMonth() + 1 === +m && created.getDate() === +d
  return sameDay ? `${date} ${pad2(created.getHours())}:${pad2(created.getMinutes())}` : date
}

// 80 mm roll ≈ 72 mm printable; pure black, mono, all caps, no greys (thermal heads dither them badly).
function ThermalSlip({ nota, toko, showNomor }: { nota: Nota; toko: Toko; showNomor: boolean }) {
  const subtotal = subtotalItems(nota.items)
  const kembali = nota.bayar != null ? Number(nota.bayar) - Number(nota.total) : null
  const dash = '1px dashed #000'
  const rule = <div style={{ borderTop: dash, margin: '5px 0' }} />
  // "Sub Total     :      549.631"
  const sum = (l: string, r: string, bold = false) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2ch 13ch', fontWeight: bold ? 700 : 400 }}>
      <span>{l}</span><span>:</span><span className="text-right whitespace-nowrap">{r}</span>
    </div>
  )
  const ref = [showNomor ? nota.nomor : null, nota.metode, 'Umum'].filter(Boolean).join('/')
  // Only reserve the unit column when some item actually has a unit.
  const hasSatuan = nota.items.some(it => it.satuan)

  return (
    <article
      className="nota-sheet cu-mono"
      style={{
        width: '72mm',
        background: '#fff',
        color: '#000',
        padding: '4mm',
        boxSizing: 'content-box',
        boxShadow: '0 22px 44px -30px rgba(24,36,30,.45)',
        fontSize: 11.5,
        lineHeight: 1.35,
        textTransform: 'uppercase',
      }}
    >
      <div className="text-center">
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{toko.nama}</div>
        {toko.alamat && <div className="whitespace-pre-line">{toko.alamat}</div>}
        {toko.telepon && <div>Telp : {toko.telepon}</div>}
        <div>{ref}</div>
        {nota.kasir && <div>{nota.kasir} Kasir</div>}
      </div>

      {/* ------16/10/2026 19:06------ */}
      <div className="flex items-center gap-[1ch]" style={{ marginTop: 3 }}>
        <span className="flex-1" style={{ borderTop: dash }} />
        <span className="whitespace-nowrap">{stamp(nota)}</span>
        <span className="flex-1" style={{ borderTop: dash }} />
      </div>
      {rule}

      {nota.items.map((it, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: hasSatuan ? '3ch 4ch 1fr auto' : '3ch 1fr auto', columnGap: '1ch', marginBottom: 4 }}>
          <span className="text-right">{it.qty}</span>
          {hasSatuan && <span>{it.satuan ?? ''}</span>}
          <span style={{ overflowWrap: 'anywhere' }}>
            {it.nama}
            {it.qty !== 1 && <span style={{ display: 'block' }}>@{formatRp(it.harga)}</span>}
          </span>
          <span className="text-right whitespace-nowrap">{formatRp(it.qty * it.harga)}</span>
        </div>
      ))}

      {rule}
      {sum('Sub Total', formatRp(subtotal))}
      {Number(nota.diskon) > 0 && sum('Diskon', `-${formatRp(nota.diskon)}`)}
      {sum('Total', formatRp(nota.total), true)}
      {nota.bayar != null && sum(nota.metode, formatRp(nota.bayar))}
      {kembali != null && kembali > 0 && sum('Kembali', formatRp(kembali))}
      {nota.catatan && (<>{rule}<div>{nota.catatan}</div></>)}
      {rule}
      {/* Signature lines: recipient left, store right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '4ch', marginTop: 4 }}>
        {SIGNATURES.map(sig => (
          <div key={sig} className="text-center">
            <div>{sig}</div>
            <div style={{ height: 44 }} />
            <div style={{ borderTop: '1px solid #000' }} />
          </div>
        ))}
      </div>
      {toko.catatan_kaki && (<>{rule}<div className="text-center">{toko.catatan_kaki}</div></>)}
    </article>
  )
}
