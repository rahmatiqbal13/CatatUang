import { formatRp } from '@/lib/tokens'
import { formatTanggal } from '@/lib/formatters'
import { SIGNATURES, stamp, totals, paperSheet, thermalSheet, type NotaStyle, type PaperProps, type ThermalProps } from './shared'

/*
 * Gaya "Tegas": poster-loud. Heavy uppercase sans, thick black rules, the
 * total as a full-width black slab with oversized figures.
 */

const INK = '#000'

function Paper({ nota, toko, size, showNomor }: PaperProps) {
  const a5 = size === 'a5'
  const k = a5 ? 0.78 : 1
  const px = (n: number) => Math.round(n * k * 10) / 10
  const { subtotal, kembali } = totals(nota)
  const caps = { textTransform: 'uppercase' as const, letterSpacing: '.08em', fontWeight: 800 }
  const meta: [string, string][] = [
    ...(showNomor ? [['No', nota.nomor] as [string, string]] : []),
    ['Tanggal', formatTanggal(nota.tanggal)],
    ...(nota.kasir ? [['Kasir', nota.kasir] as [string, string]] : []),
    ['Bayar', nota.metode],
  ]

  return (
    <article className="nota-sheet flex flex-col" style={{ ...paperSheet(size), color: INK, fontSize: px(13) }}>
      <div style={{ fontSize: px(52), fontWeight: 900, lineHeight: 0.92, letterSpacing: '-0.035em', textTransform: 'uppercase' }}>{toko.nama}</div>
      <div style={{ marginTop: px(10), fontWeight: 600 }}>
        {[toko.alamat?.replace(/\s*\n\s*/g, ', '), toko.telepon].filter(Boolean).join('  /  ')}
      </div>
      <div style={{ height: px(8), background: INK, margin: `${px(16)}px 0` }} />

      <div className="grid" style={{ gridTemplateColumns: `repeat(${meta.length}, 1fr)`, gap: px(12) }}>
        {meta.map(([l, v]) => (
          <div key={l}>
            <div style={{ ...caps, fontSize: px(10) }}>{l}</div>
            <div style={{ fontSize: px(16), fontWeight: 800, marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: px(22), borderTop: `3px solid ${INK}` }}>
        {nota.items.map((it, i) => (
          <div key={i} className="grid items-baseline" style={{ gridTemplateColumns: `${px(44)}px 1fr auto`, gap: px(12), padding: `${px(10)}px 0`, borderBottom: `1.5px solid ${INK}` }}>
            <span style={{ fontSize: px(22), fontWeight: 900 }}>{String(i + 1).padStart(2, '0')}</span>
            <span>
              <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>{it.nama}</span>
              <span style={{ display: 'block', fontWeight: 600, fontSize: px(12) }}>
                {it.qty}{it.satuan ? ` ${it.satuan}` : ''} × {formatRp(it.harga)}
              </span>
            </span>
            <span style={{ fontSize: px(16), fontWeight: 800 }}>{formatRp(it.qty * it.harga)}</span>
          </div>
        ))}
      </div>

      <div className="ml-auto" style={{ width: '55%', marginTop: px(14), fontWeight: 700 }}>
        <Row l="Subtotal" r={formatRp(subtotal)} />
        {Number(nota.diskon) > 0 && <Row l="Diskon" r={`−${formatRp(nota.diskon)}`} />}
      </div>

      <div className="flex items-end justify-between" style={{ background: INK, color: '#fff', padding: `${px(14)}px ${px(18)}px`, marginTop: px(10) }}>
        <span style={{ ...caps, fontSize: px(16), letterSpacing: '.2em' }}>Total</span>
        <span style={{ fontSize: px(48), fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 0.9 }}>
          <span style={{ fontSize: px(20), marginRight: 6 }}>Rp</span>{formatRp(nota.total)}
        </span>
      </div>

      <div className="ml-auto" style={{ width: '55%', marginTop: px(10), fontWeight: 700 }}>
        {nota.bayar != null && <Row l={nota.metode} r={formatRp(nota.bayar)} />}
        {kembali != null && kembali > 0 && <Row l="Kembali" r={formatRp(kembali)} />}
      </div>

      {nota.catatan && <div style={{ marginTop: px(16), fontWeight: 600 }}>{nota.catatan}</div>}

      <div className="mt-auto" style={{ paddingTop: px(24) }}>
        <div className="grid grid-cols-2" style={{ gap: px(40) }}>
          {SIGNATURES.map(sig => (
            <div key={sig}>
              <div style={{ ...caps, fontSize: px(11) }}>{sig}</div>
              <div style={{ height: px(60) }} />
              <div style={{ borderTop: `3px solid ${INK}` }} />
            </div>
          ))}
        </div>
        {toko.catatan_kaki && (
          <div style={{ ...caps, fontSize: px(13), marginTop: px(20), borderTop: `8px solid ${INK}`, paddingTop: px(8) }}>{toko.catatan_kaki}</div>
        )}
      </div>
    </article>
  )
}

function Row({ l, r }: { l: string; r: string }) {
  return (
    <div className="flex justify-between" style={{ padding: '3px 0' }}>
      <span style={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>{l}</span>
      <span>{r}</span>
    </div>
  )
}

function Thermal({ nota, toko, showNomor }: ThermalProps) {
  const { subtotal, kembali } = totals(nota)
  const row = (l: string, r: string) => (
    <div className="flex justify-between"><span>{l}</span><span className="whitespace-nowrap">{r}</span></div>
  )
  return (
    <article className="nota-sheet" style={{ ...thermalSheet, fontSize: 11.5, lineHeight: 1.3, fontWeight: 700, textTransform: 'uppercase' }}>
      <div style={{ background: '#000', color: '#fff', padding: '6px 4px', fontSize: 18, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.01em' }}>{toko.nama}</div>
      <div style={{ marginTop: 4, fontWeight: 600 }}>
        {toko.alamat && <div className="whitespace-pre-line">{toko.alamat}</div>}
        {toko.telepon && <div>{toko.telepon}</div>}
      </div>
      <div style={{ height: 4, background: '#000', margin: '6px 0' }} />
      {showNomor && row('No', nota.nomor)}
      {row('Tgl', stamp(nota))}
      {nota.kasir && row('Kasir', nota.kasir)}
      <div style={{ height: 2, background: '#000', margin: '6px 0' }} />
      {nota.items.map((it, i) => (
        <div key={i} style={{ borderBottom: '1px solid #000', padding: '3px 0' }}>
          <div>{it.nama}</div>
          {row(`${it.qty}${it.satuan ? ` ${it.satuan}` : ''} × ${formatRp(it.harga)}`, formatRp(it.qty * it.harga))}
        </div>
      ))}
      <div style={{ marginTop: 4 }}>
        {row('Subtotal', formatRp(subtotal))}
        {Number(nota.diskon) > 0 && row('Diskon', `-${formatRp(nota.diskon)}`)}
      </div>
      <div className="flex items-baseline justify-between" style={{ background: '#000', color: '#fff', padding: '5px 4px', margin: '5px 0' }}>
        <span>Total</span>
        <span style={{ fontSize: 18, fontWeight: 900 }}>{formatRp(nota.total)}</span>
      </div>
      {nota.bayar != null && row(nota.metode, formatRp(nota.bayar))}
      {kembali != null && kembali > 0 && row('Kembali', formatRp(kembali))}
      {nota.catatan && <div style={{ marginTop: 6, fontWeight: 600 }}>{nota.catatan}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '4ch', marginTop: 12 }}>
        {SIGNATURES.map(sig => (
          <div key={sig}>
            <div>{sig}</div>
            <div style={{ height: 40 }} />
            <div style={{ borderTop: '2px solid #000' }} />
          </div>
        ))}
      </div>
      {toko.catatan_kaki && <div className="text-center" style={{ background: '#000', color: '#fff', padding: '3px 4px', marginTop: 10 }}>{toko.catatan_kaki}</div>}
    </article>
  )
}

export const tegas: NotaStyle = { id: 'tegas', label: 'Tegas', hint: 'Huruf tebal besar, garis hitam tebal', Paper, Thermal }
