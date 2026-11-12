import { formatRp } from '@/lib/tokens'
import { formatTanggal, terbilangRupiah } from '@/lib/formatters'
import { subtotalItems } from '@/lib/nota'
import { SIGNATURES, monogram, stamp, type NotaStyle, type PaperProps, type ThermalProps } from './shared'

/* Gaya "Cetak klasik": letterpress slip (paper) and inverse-masthead receipt (thermal). */

const INK = '#18241E'
const MUTED = '#5B635C'
const HAIR = '#C9C2B2'

/**
 * Letterpress-style slip: double-ruled frame, monogram + serif masthead, a
 * ticket perforation, a ledger table and a solid ink total bar. Greyscale-safe.
 */
function Paper({ nota, toko, size, showNomor }: PaperProps) {
  const a5 = size === 'a5'
  const k = a5 ? 0.8 : 1
  const px = (n: number) => Math.round(n * k * 10) / 10
  const subtotal = subtotalItems(nota.items)
  const kembali = nota.bayar != null ? Number(nota.bayar) - Number(nota.total) : null
  const kontak = [toko.alamat?.replace(/\s*\n\s*/g, ', '), toko.telepon && `Telp. ${toko.telepon}`].filter(Boolean)
  const meta: [string, string][] = [
    ...(showNomor ? [['No.', nota.nomor] as [string, string]] : []),
    ['Tanggal', formatTanggal(nota.tanggal)],
    ...(nota.kasir ? [['Kasir', nota.kasir] as [string, string]] : []),
    ['Bayar', nota.metode],
  ]
  const inset = px(30)

  return (
    <article
      className="nota-sheet flex"
      style={{
        // Sheet = paper minus @page margins, so the preview matches the print.
        width: a5 ? '130mm' : '182mm',
        minHeight: a5 ? '192mm' : '269mm',
        background: '#fff',
        color: INK,
        padding: a5 ? '9mm' : '14mm',
        boxSizing: 'content-box',
        boxShadow: '0 22px 44px -30px rgba(24,36,30,.45)',
        border: '1px solid var(--divider)',
        fontSize: px(13),
      }}
    >
      {/* Double-ruled frame */}
      <div className="flex flex-1" style={{ border: `1.5px solid ${INK}`, padding: 3 }}>
        <div className="flex flex-1 flex-col" style={{ border: `0.75px solid ${INK}` }}>

          {/* Masthead */}
          <header className="flex items-start justify-between" style={{ gap: px(24), padding: `${px(30)}px ${inset}px ${px(24)}px` }}>
            <div className="flex min-w-0 items-start" style={{ gap: px(16) }}>
              <div
                aria-hidden
                className="serif flex shrink-0 items-center justify-center rounded-full italic"
                style={{ width: px(58), height: px(58), background: INK, color: '#fff', fontSize: px(24), letterSpacing: '-0.02em' }}
              >
                {monogram(toko.nama)}
              </div>
              <div className="min-w-0">
                <div className="cu-mono uppercase" style={{ fontSize: px(9.5), letterSpacing: '.24em', color: MUTED }}>Nota penjualan</div>
                <div className="serif" style={{ fontSize: px(34), lineHeight: 1.02, letterSpacing: '-0.025em', marginTop: px(4) }}>{toko.nama}</div>
                {kontak.length > 0 && (
                  <div style={{ marginTop: px(8), color: MUTED, fontSize: px(12), lineHeight: 1.45 }}>{kontak.join('  ·  ')}</div>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="serif italic" style={{ fontSize: px(46), lineHeight: 0.9, letterSpacing: '-0.03em' }}>Nota</div>
              <dl className="cu-mono" style={{ marginTop: px(12), display: 'grid', gridTemplateColumns: 'auto auto', columnGap: px(12), rowGap: px(3), fontSize: px(11.5), justifyContent: 'end' }}>
                {meta.map(([l, v]) => (
                  <div key={l} className="contents">
                    <dt className="uppercase" style={{ color: MUTED, letterSpacing: '.12em', fontSize: px(9.5), alignSelf: 'center' }}>{l}</dt>
                    <dd className="m-0 text-right font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </header>

          {/* Ticket perforation with side notches */}
          <div className="relative" style={{ height: 0, borderTop: `1.5px dashed ${INK}` }}>
            {(['left', 'right'] as const).map(side => (
              <span
                key={side}
                aria-hidden
                className="absolute rounded-full"
                style={{
                  top: -px(9), [side]: -px(9) - 1, width: px(18), height: px(18),
                  background: '#fff', border: `0.75px solid ${INK}`,
                  clipPath: side === 'left' ? 'inset(0 0 0 50%)' : 'inset(0 50% 0 0)',
                }}
              />
            ))}
          </div>

          {/* Ledger */}
          <div style={{ padding: `${px(22)}px ${inset}px 0` }}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['No', 'Uraian', 'Qty', 'Jumlah'].map((h, i) => (
                    <th
                      key={h}
                      className="cu-mono uppercase"
                      style={{
                        fontSize: px(9.5), letterSpacing: '.16em', fontWeight: 600, color: INK,
                        padding: `${px(8)}px 0`, borderTop: `1.5px solid ${INK}`, borderBottom: `0.75px solid ${INK}`,
                        textAlign: i >= 2 ? 'right' : 'left', width: i === 0 ? px(38) : i === 2 ? px(90) : i === 3 ? px(120) : undefined,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nota.items.map((it, i) => (
                  <tr key={i} style={{ borderBottom: `0.75px dotted ${HAIR}` }}>
                    <td className="cu-mono align-top" style={{ padding: `${px(10)}px 0`, color: MUTED, fontSize: px(11) }}>{String(i + 1).padStart(2, '0')}</td>
                    <td className="align-top" style={{ padding: `${px(10)}px ${px(12)}px ${px(10)}px 0` }}>
                      <div style={{ fontWeight: 500 }}>{it.nama}</div>
                      <div className="cu-mono" style={{ color: MUTED, fontSize: px(11), marginTop: 2 }}>@ {formatRp(it.harga)}</div>
                    </td>
                    <td className="cu-mono text-right align-top whitespace-nowrap" style={{ padding: `${px(10)}px 0` }}>
                      {it.qty}{it.satuan && <span style={{ color: MUTED, fontSize: px(10.5) }}> {it.satuan}</span>}
                    </td>
                    <td className="cu-mono text-right align-top font-semibold" style={{ padding: `${px(10)}px 0` }}>{formatRp(it.qty * it.harga)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary: words left, figures right */}
          <div className="grid items-start" style={{ gridTemplateColumns: '1fr minmax(0, 46%)', gap: px(28), padding: `${px(22)}px ${inset}px 0` }}>
            <div className="flex flex-col" style={{ gap: px(14) }}>
              <div>
                <div className="cu-mono uppercase" style={{ fontSize: px(9.5), letterSpacing: '.18em', color: MUTED }}>Terbilang</div>
                <div
                  className="serif italic"
                  style={{
                    marginTop: px(4), fontSize: px(16), lineHeight: `${px(26)}px`,
                    backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${px(25)}px, ${HAIR} ${px(25)}px ${px(26)}px)`,
                  }}
                >
                  {terbilangRupiah(Number(nota.total))}
                </div>
              </div>
              {nota.catatan && (
                <div>
                  <div className="cu-mono uppercase" style={{ fontSize: px(9.5), letterSpacing: '.18em', color: MUTED }}>Catatan</div>
                  <div style={{ marginTop: px(4), color: INK }}>{nota.catatan}</div>
                </div>
              )}
            </div>
            <div className="cu-mono flex flex-col" style={{ gap: px(4), fontSize: px(12.5) }}>
              <SumLine label="Subtotal" value={formatRp(subtotal)} />
              {Number(nota.diskon) > 0 && <SumLine label="Diskon" value={`−${formatRp(nota.diskon)}`} />}
              <div
                className="flex items-baseline justify-between"
                style={{ background: INK, color: '#fff', padding: `${px(10)}px ${px(14)}px`, margin: `${px(6)}px 0`, gap: px(12) }}
              >
                <span className="uppercase" style={{ fontSize: px(10), letterSpacing: '.22em' }}>Total</span>
                <span className="serif whitespace-nowrap" style={{ fontSize: px(26), letterSpacing: '-0.02em', lineHeight: 1 }}>
                  <span style={{ fontSize: px(14), marginRight: 4 }}>Rp</span>{formatRp(nota.total)}
                </span>
              </div>
              {nota.bayar != null && <SumLine label={`Dibayar · ${nota.metode}`} value={formatRp(nota.bayar)} />}
              {kembali != null && kembali > 0 && <SumLine label="Kembali" value={formatRp(kembali)} />}
            </div>
          </div>

          {/* Closing: thank-you + signature lines */}
          <div className="mt-auto flex flex-col" style={{ gap: px(22), padding: `${px(28)}px ${inset}px ${px(26)}px` }}>
            {toko.catatan_kaki && (
              <div className="flex items-center" style={{ gap: px(14), color: MUTED }}>
                <span className="flex-1" style={{ borderTop: `0.75px solid ${HAIR}` }} />
                <span className="serif italic" style={{ fontSize: px(15), color: INK }}>{toko.catatan_kaki}</span>
                <span className="flex-1" style={{ borderTop: `0.75px solid ${HAIR}` }} />
              </div>
            )}
            <div className="grid grid-cols-2" style={{ gap: px(56) }}>
              {SIGNATURES.map(sig => (
                <div key={sig} className="text-center">
                  <div className="cu-mono uppercase" style={{ fontSize: px(9.5), letterSpacing: '.2em', color: MUTED }}>{sig}</div>
                  <div style={{ height: px(64) }} />
                  <div style={{ borderTop: `0.75px solid ${INK}` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function SumLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between" style={{ gap: 16 }}>
      <span style={{ color: MUTED }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

// 80 mm roll ≈ 72 mm printable; pure black, mono, all caps, no greys (thermal heads dither them badly).
function Thermal({ nota, toko, showNomor }: ThermalProps) {
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
        {/* Inverse masthead — thermal heads print solid black cleanly */}
        <div style={{ background: '#000', color: '#fff', fontSize: 14, fontWeight: 700, letterSpacing: '.04em', padding: '5px 4px', marginBottom: 4 }}>{toko.nama}</div>
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
      <div style={{ borderTop: '3px double #000', borderBottom: '3px double #000', padding: '3px 0', margin: '4px 0' }}>
        {sum('Total', formatRp(nota.total), true)}
      </div>
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
      {toko.catatan_kaki && (<>{rule}<div className="text-center">*** {toko.catatan_kaki} ***</div></>)}
    </article>
  )
}


export const klasik: NotaStyle = { id: 'klasik', label: 'Cetak klasik', hint: 'Bingkai ganda, monogram, panel total hitam', Paper, Thermal }
