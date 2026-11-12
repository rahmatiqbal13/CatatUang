'use client'

import { useSyncExternalStore } from 'react'
import { Printer, X } from 'lucide-react'
import type { Nota, Toko } from '@/lib/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { NOTA_STYLES, styleById } from './gaya'

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
const STYLE_KEY = 'catatuang.nota.style'
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

const readGaya = () => styleById(readPref(STYLE_KEY)).id

export function NotaPrint({ nota, toko }: { nota: Nota; toko: Toko }) {
  const template = useSyncExternalStore(subscribe, readTemplate, () => 'a4' as Template)
  const showNomor = useSyncExternalStore(subscribe, readShowNomor, () => true)
  const gaya = styleById(useSyncExternalStore(subscribe, readGaya, () => NOTA_STYLES[0].id))
  const thermal = template === 'thermal80'

  return (
    <div className="nota-print-root min-h-screen" style={{ background: 'var(--surface-2)' }}>
      <style>{`
        ${PAGE_CSS[template]}
        @media print {
          html, body, .nota-print-root { background: #fff !important; }
          .nota-toolbar { display: none !important; }
          .nota-sheet, .nota-sheet * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
        <Select
          value={gaya.id}
          onValueChange={v => { if (v) writePref(STYLE_KEY, v) }}
          items={Object.fromEntries(NOTA_STYLES.map(g => [g.id, g.label]))}
        >
          <SelectTrigger className="h-11 min-w-[170px] rounded-full text-[13px] font-semibold" aria-label="Gaya nota">
            <span className="mr-1 font-normal" style={{ color: 'var(--text-muted)' }}>Gaya</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTA_STYLES.map(g => (
              <SelectItem key={g.id} value={g.id}>
                <span className="flex flex-col">
                  <span className="font-semibold">{g.label}</span>
                  <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{g.hint}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          ? <gaya.Thermal nota={nota} toko={toko} showNomor={showNomor} />
          : <gaya.Paper nota={nota} toko={toko} size={template} showNomor={showNomor} />}
      </div>
    </div>
  )
}
