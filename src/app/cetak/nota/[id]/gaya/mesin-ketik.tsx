import { formatRp } from '@/lib/tokens'
import { terbilangRupiah } from '@/lib/formatters'
import type { Nota, Toko } from '@/lib/types'
import { SIGNATURES, stamp, totals, paperSheet, thermalSheet, type NotaStyle, type PaperProps, type ThermalProps } from './shared'

/*
 * Gaya "Mesin ketik": the whole slip is composed as fixed-width text, like a
 * typed carbon copy — ASCII frames, dot leaders — plus a rubber "LUNAS" stamp
 * when the payment covers the total. Monospace is what keeps the columns true.
 */

const center = (s: string, w: number) => {
  const t = s.slice(0, w)
  const left = Math.floor((w - t.length) / 2)
  return ' '.repeat(left) + t + ' '.repeat(w - t.length - left)
}
const right = (s: string, w: number) => s.slice(0, w).padStart(w)
const leftPad = (s: string, w: number) => s.slice(0, w).padEnd(w)

/** Word-wrap to `w` columns, hard-breaking words longer than a line. */
function wrap(text: string, w: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let rest = word
    while (rest.length > w) {
      if (line) { out.push(line); line = '' }
      out.push(rest.slice(0, w))
      rest = rest.slice(w)
    }
    if (!line) line = rest
    else if (line.length + 1 + rest.length <= w) line += ' ' + rest
    else { out.push(line); line = rest }
  }
  if (line) out.push(line)
  return out.length ? out : ['']
}

/** Compose the slip as lines of exactly `W` characters; `signAt` is where the signature block starts. */
function compose(nota: Nota, toko: Toko, showNomor: boolean, W: number, wide: boolean): { lines: string[]; signAt: number } {
  const { subtotal, kembali } = totals(nota)
  const L: string[] = []
  const frame = '+' + '-'.repeat(W - 2) + '+'
  const boxed = (s: string) => '|' + center(s, W - 2) + '|'
  const rule = (c: string) => c.repeat(W)

  L.push(frame)
  L.push(boxed(toko.nama.toUpperCase()))
  for (const l of (toko.alamat ?? '').split('\n').filter(Boolean)) for (const w of wrap(l, W - 4)) L.push(boxed(w))
  if (toko.telepon) L.push(boxed(`Telp. ${toko.telepon}`))
  L.push(frame)
  L.push('')

  const pairs: [string, string][] = [
    ...(showNomor ? [['NOTA', nota.nomor] as [string, string]] : []),
    ['TANGGAL', stamp(nota)],
    ...(nota.kasir ? [['KASIR', nota.kasir] as [string, string]] : []),
    ['BAYAR', nota.metode],
  ]
  if (wide) {
    for (let i = 0; i < pairs.length; i += 2) {
      const a = pairs[i], b = pairs[i + 1]
      const half = Math.floor(W / 2)
      L.push(leftPad(`  ${a[0].padEnd(8)}: ${a[1]}`, half) + (b ? leftPad(`${b[0].padEnd(8)}: ${b[1]}`, W - half) : ''))
    }
  } else {
    for (const [k, v] of pairs) L.push(leftPad(`${k.padEnd(8)}: ${v}`, W))
  }
  L.push(rule('-'))

  if (wide) {
    // NO(4) URAIAN(flex) QTY(9) HARGA(12) JUMLAH(13)
    const nameW = W - 4 - 9 - 12 - 13
    L.push('  NO' + leftPad('  URAIAN', nameW) + right('QTY', 9) + right('HARGA', 12) + right('JUMLAH', 13))
    L.push(rule('-'))
    nota.items.forEach((it, i) => {
      const names = wrap(it.nama, nameW - 2)
      const qty = `${it.qty}${it.satuan ? ' ' + it.satuan : ''}`
      L.push(right(String(i + 1).padStart(2, '0'), 4) + '  ' + leftPad(names[0], nameW - 2) + right(qty, 9) + right(formatRp(it.harga), 12) + right(formatRp(it.qty * it.harga), 13))
      for (const n of names.slice(1)) L.push('      ' + n)
    })
  } else {
    nota.items.forEach(it => {
      for (const n of wrap(it.nama, W)) L.push(n)
      const left = `  ${it.qty}${it.satuan ? ' ' + it.satuan : ''} x ${formatRp(it.harga)}`
      L.push(left + right(formatRp(it.qty * it.harga), W - left.length))
    })
  }
  L.push(rule('='))

  const sumW = wide ? 34 : W
  const sum = (k: string, v: string) => {
    const label = `${k} `
    const dots = '.'.repeat(Math.max(1, sumW - label.length - v.length - 1))
    return (wide ? ' '.repeat(W - sumW) : '') + label + dots + ' ' + v
  }
  L.push(sum('SUBTOTAL', formatRp(subtotal)))
  if (Number(nota.diskon) > 0) L.push(sum('DISKON', '-' + formatRp(nota.diskon)))
  L.push(sum('TOTAL Rp', formatRp(nota.total)))
  if (nota.bayar != null) L.push(sum(nota.metode.toUpperCase(), formatRp(nota.bayar)))
  if (kembali != null && kembali > 0) L.push(sum('KEMBALI', formatRp(kembali)))
  L.push('')
  for (const w of wrap(`Terbilang: ${terbilangRupiah(Number(nota.total))}`, W)) L.push(w)
  if (nota.catatan) for (const w of wrap(`Catatan: ${nota.catatan}`, W)) L.push(w)
  L.push('')

  const signAt = L.length
  const half = Math.floor(W / 2)
  L.push(center(SIGNATURES[0] + ',', half) + center(SIGNATURES[1] + ',', W - half))
  L.push('', '', '')
  const blank = '(' + '_'.repeat(Math.min(18, half - 4)) + ')'
  L.push(center(blank, half) + center(blank, W - half))
  if (toko.catatan_kaki) {
    L.push('')
    for (const w of wrap(`*** ${toko.catatan_kaki} ***`, W)) L.push(center(w, W))
  }
  return { lines: L, signAt }
}

function Lunas({ size }: { size: number }) {
  return (
    <div
      aria-hidden
      className="cu-mono pointer-events-none absolute"
      style={{
        top: '8%', right: '6%', transform: 'rotate(-14deg)',
        border: '3px double #000', borderRadius: 6, padding: '2px 14px',
        fontSize: size, fontWeight: 700, letterSpacing: '.3em', opacity: 0.6,
      }}
    >
      LUNAS
    </div>
  )
}

const isLunas = (nota: Nota) => nota.bayar != null && Number(nota.bayar) >= Number(nota.total)

/** Slip text with the LUNAS stamp pinned over the "Hormat kami" signature. */
function Typed({ nota, toko, showNomor, W, wide, fontSize, lineHeight, stampSize }: {
  nota: Nota; toko: Toko; showNomor: boolean; W: number; wide: boolean; fontSize: number; lineHeight: number; stampSize: number
}) {
  const { lines, signAt } = compose(nota, toko, showNomor, W, wide)
  const pre = (ls: string[]) => (
    <pre className="cu-mono m-0" style={{ fontSize, lineHeight, whiteSpace: 'pre' }}>{ls.join('\n')}</pre>
  )
  return (
    <>
      {pre(lines.slice(0, signAt))}
      {/* A trailing blank line in a <pre> collapses, so the gap before the signatures is a margin. */}
      <div className="relative" style={{ marginTop: `${lineHeight}em` }}>
        {pre(lines.slice(signAt))}
        {isLunas(nota) && <Lunas size={stampSize} />}
      </div>
    </>
  )
}

function Paper({ nota, toko, size, showNomor }: PaperProps) {
  const a5 = size === 'a5'
  // Columns × char width (0.6em) must fit the sheet: A4 ≈ 688px, A5 ≈ 491px.
  const W = a5 ? 58 : 76
  const fontSize = a5 ? 13.6 : 15
  return (
    <article className="nota-sheet" style={{ ...paperSheet(size), color: '#111' }}>
      <Typed nota={nota} toko={toko} showNomor={showNomor} W={W} wide fontSize={fontSize} lineHeight={1.45} stampSize={a5 ? 22 : 28} />
    </article>
  )
}

function Thermal({ nota, toko, showNomor }: ThermalProps) {
  return (
    <article className="nota-sheet" style={thermalSheet}>
      <Typed nota={nota} toko={toko} showNomor={showNomor} W={40} wide={false} fontSize={10.8} lineHeight={1.35} stampSize={16} />
    </article>
  )
}

export const mesinKetik: NotaStyle = { id: 'mesin-ketik', label: 'Mesin ketik', hint: 'Teks monospace, bingkai ASCII, cap LUNAS', Paper, Thermal }
