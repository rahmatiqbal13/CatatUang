import { formatRp } from '@/lib/tokens'
import { formatTanggal } from '@/lib/formatters'
import { SIGNATURES, stamp, totals, paperSheet, thermalSheet, type NotaStyle, type PaperProps, type ThermalProps } from './shared'

/*
 * Gaya "Minimalis": whitespace does the work. Sans throughout, one hairline,
 * the total set large and light in the top-right corner, lowercase labels.
 */

const INK = '#1A1A1A'
const SOFT = '#7A7A7A'
const HAIR = '#D9D9D9'

function Paper({ nota, toko, size, showNomor }: PaperProps) {
  const a5 = size === 'a5'
  const k = a5 ? 0.8 : 1
  const px = (n: number) => Math.round(n * k * 10) / 10
  const { subtotal, kembali } = totals(nota)
  const meta = [showNomor ? nota.nomor : null, formatTanggal(nota.tanggal), nota.kasir ? `kasir ${nota.kasir}` : null, nota.metode.toLowerCase()].filter(Boolean)
  const label = { fontSize: px(11), color: SOFT, letterSpacing: '.02em' }

  return (
    <article className="nota-sheet flex flex-col" style={{ ...paperSheet(size), color: INK, fontSize: px(13), fontWeight: 400 }}>
      <header className="flex items-start justify-between" style={{ gap: px(24) }}>
        <div className="min-w-0">
          <div style={{ fontSize: px(20), fontWeight: 600, letterSpacing: '-0.01em' }}>{toko.nama}</div>
          <div style={{ ...label, marginTop: px(6), lineHeight: 1.6 }}>
            {toko.alamat && <div className="whitespace-pre-line">{toko.alamat}</div>}
            {toko.telepon && <div>{toko.telepon}</div>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div style={label}>total</div>
          <div style={{ fontSize: px(46), fontWeight: 300, letterSpacing: '-0.04em', lineHeight: 1 }}>
            <span style={{ fontSize: px(18), color: SOFT, marginRight: 6 }}>Rp</span>{formatRp(nota.total)}
          </div>
        </div>
      </header>

      <div style={{ ...label, marginTop: px(40) }}>nota · {meta.join(' · ')}</div>

      <div style={{ marginTop: px(28) }}>
        {nota.items.map((it, i) => (
          <div key={i} className="grid items-baseline" style={{ gridTemplateColumns: '1fr auto', gap: px(16), padding: `${px(12)}px 0` }}>
            <div>
              <div style={{ fontWeight: 500 }}>{it.nama}</div>
              <div style={{ ...label, marginTop: 2 }}>{it.qty}{it.satuan ? ` ${it.satuan.toLowerCase()}` : ''} × {formatRp(it.harga)}</div>
            </div>
            <div style={{ fontVariantNumeric: 'tabular-nums' }}>{formatRp(it.qty * it.harga)}</div>
          </div>
        ))}
      </div>

      <div className="ml-auto flex flex-col" style={{ width: '50%', marginTop: px(16), paddingTop: px(16), borderTop: `1px solid ${HAIR}`, gap: px(6), fontVariantNumeric: 'tabular-nums' }}>
        <Row label="subtotal" value={formatRp(subtotal)} px={px} />
        {Number(nota.diskon) > 0 && <Row label="diskon" value={`−${formatRp(nota.diskon)}`} px={px} />}
        <Row label="total" value={formatRp(nota.total)} px={px} strong />
        {nota.bayar != null && <Row label={nota.metode.toLowerCase()} value={formatRp(nota.bayar)} px={px} />}
        {kembali != null && kembali > 0 && <Row label="kembali" value={formatRp(kembali)} px={px} />}
      </div>

      {nota.catatan && <div style={{ ...label, marginTop: px(28), color: INK }}>{nota.catatan}</div>}

      <div className="mt-auto grid grid-cols-2" style={{ gap: px(64), paddingTop: px(48) }}>
        {SIGNATURES.map(sig => (
          <div key={sig}>
            <div style={{ height: px(56) }} />
            <div style={{ borderTop: `1px solid ${INK}`, paddingTop: px(6), ...label }}>{sig.toLowerCase()}</div>
          </div>
        ))}
      </div>
      {toko.catatan_kaki && <div style={{ ...label, marginTop: px(28) }}>{toko.catatan_kaki}</div>}
    </article>
  )
}

function Row({ label, value, px, strong }: { label: string; value: string; px: (n: number) => number; strong?: boolean }) {
  return (
    <div className="flex justify-between" style={{ fontWeight: strong ? 600 : 400 }}>
      <span style={{ color: strong ? INK : SOFT, fontSize: px(12) }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function Thermal({ nota, toko, showNomor }: ThermalProps) {
  const { subtotal, kembali } = totals(nota)
  const row = (l: string, r: string, bold = false) => (
    <div className="flex justify-between" style={{ fontWeight: bold ? 700 : 400 }}><span>{l}</span><span>{r}</span></div>
  )
  return (
    <article className="nota-sheet" style={{ ...thermalSheet, fontSize: 11.5, lineHeight: 1.45 }}>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{toko.nama}</div>
      {toko.alamat && <div className="whitespace-pre-line">{toko.alamat}</div>}
      {toko.telepon && <div>{toko.telepon}</div>}
      <div style={{ marginTop: 10 }}>{[showNomor ? nota.nomor : null, stamp(nota)].filter(Boolean).join(' · ')}</div>
      {nota.kasir && <div>kasir {nota.kasir}</div>}

      <div style={{ marginTop: 12 }}>
        {nota.items.map((it, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <div>{it.nama}</div>
            {row(`${it.qty}${it.satuan ? ` ${it.satuan.toLowerCase()}` : ''} × ${formatRp(it.harga)}`, formatRp(it.qty * it.harga))}
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #000', marginTop: 6, paddingTop: 6 }}>
        {row('subtotal', formatRp(subtotal))}
        {Number(nota.diskon) > 0 && row('diskon', `-${formatRp(nota.diskon)}`)}
        <div style={{ fontSize: 14 }}>{row('total', formatRp(nota.total), true)}</div>
        {nota.bayar != null && row(nota.metode.toLowerCase(), formatRp(nota.bayar))}
        {kembali != null && kembali > 0 && row('kembali', formatRp(kembali))}
      </div>
      {nota.catatan && <div style={{ marginTop: 10 }}>{nota.catatan}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '4ch', marginTop: 16 }}>
        {SIGNATURES.map(sig => (
          <div key={sig}>
            <div style={{ height: 40 }} />
            <div style={{ borderTop: '1px solid #000', paddingTop: 2 }}>{sig.toLowerCase()}</div>
          </div>
        ))}
      </div>
      {toko.catatan_kaki && <div style={{ marginTop: 12 }}>{toko.catatan_kaki}</div>}
    </article>
  )
}

export const minimalis: NotaStyle = { id: 'minimalis', label: 'Minimalis', hint: 'Lega, tanpa garis, total besar di pojok', Paper, Thermal }
