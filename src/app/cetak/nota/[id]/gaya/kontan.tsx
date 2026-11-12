import { formatRp } from '@/lib/tokens'
import { formatTanggal, terbilangRupiah } from '@/lib/formatters'
import { SIGNATURES, stamp, totals, paperSheet, thermalSheet, type NotaStyle, type PaperProps, type ThermalProps } from './shared'

/*
 * Gaya "Nota kontan": the carbon-copy receipt book every Indonesian shop keeps —
 * title "NOTA KONTAN", dotted "Tuan/Toko" line, a column-ruled grid padded with
 * blank rows, and a boxed "Jumlah Rp".
 */

const INK = '#111'
const MIN_ROWS = { a4: 10, a5: 7 }

function Dotted({ children, minWidth }: { children?: React.ReactNode; minWidth?: number }) {
  return (
    <span className="inline-block" style={{ borderBottom: `1px dotted ${INK}`, minWidth, paddingBottom: 1 }}>
      {children ?? ' '}
    </span>
  )
}

function Paper({ nota, toko, size, showNomor }: PaperProps) {
  const a5 = size === 'a5'
  const k = a5 ? 0.82 : 1
  const px = (n: number) => Math.round(n * k * 10) / 10
  const { kembali } = totals(nota)
  const blanks = Math.max(0, MIN_ROWS[size] - nota.items.length)
  const cell = { border: `1px solid ${INK}`, padding: `${px(6)}px ${px(8)}px` }

  return (
    <article className="nota-sheet flex flex-col" style={{ ...paperSheet(size), color: INK, fontSize: px(13), gap: px(16) }}>
      <header className="flex items-start justify-between" style={{ gap: px(20) }}>
        <div className="min-w-0">
          <div className="serif uppercase" style={{ fontSize: px(26), fontWeight: 600, letterSpacing: '.02em', lineHeight: 1.1 }}>{toko.nama}</div>
          {toko.alamat && <div className="whitespace-pre-line" style={{ marginTop: px(4), fontSize: px(12) }}>{toko.alamat}</div>}
          {toko.telepon && <div style={{ fontSize: px(12) }}>Telp. {toko.telepon}</div>}
        </div>
        <div className="shrink-0" style={{ fontSize: px(12.5), lineHeight: 2 }}>
          <div>Tanggal <Dotted minWidth={px(150)}>{formatTanggal(nota.tanggal)}</Dotted></div>
          <div>Tuan/Toko <Dotted minWidth={px(170)}>{nota.pelanggan}</Dotted></div>
        </div>
      </header>

      <div className="text-center">
        <div className="serif inline-block" style={{ fontSize: px(22), fontWeight: 700, letterSpacing: '.18em', borderBottom: `2px solid ${INK}`, paddingBottom: 2 }}>NOTA KONTAN</div>
        <div className="cu-mono" style={{ marginTop: px(6), fontSize: px(11.5) }}>
          {showNomor && <>No. <b>{nota.nomor}</b></>}
          {nota.kasir && <>{showNomor ? '   ·   ' : ''}Kasir: <b>{nota.kasir}</b></>}
        </div>
      </div>

      <table className="w-full border-collapse" style={{ fontSize: px(12.5) }}>
        <thead>
          <tr>
            {['Banyaknya', 'Nama Barang', 'Harga', 'Jumlah'].map((h, i) => (
              <th key={h} className="uppercase" style={{ ...cell, fontSize: px(10.5), letterSpacing: '.08em', fontWeight: 700, width: i === 0 ? px(92) : i >= 2 ? px(112) : undefined, textAlign: 'center' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {nota.items.map((it, i) => (
            <tr key={i}>
              <td className="cu-mono text-center" style={{ ...cell, borderTop: 0, borderBottom: 0 }}>{it.qty} {it.satuan ?? ''}</td>
              <td style={{ ...cell, borderTop: 0, borderBottom: 0 }}>{it.nama}</td>
              <td className="cu-mono text-right" style={{ ...cell, borderTop: 0, borderBottom: 0 }}>{formatRp(it.harga)}</td>
              <td className="cu-mono text-right" style={{ ...cell, borderTop: 0, borderBottom: 0 }}>{formatRp(it.qty * it.harga)}</td>
            </tr>
          ))}
          {Array.from({ length: blanks }, (_, i) => (
            <tr key={`b${i}`}>
              {[0, 1, 2, 3].map(c => <td key={c} style={{ ...cell, borderTop: 0, borderBottom: 0, height: px(30) }} />)}
            </tr>
          ))}
          <tr>
            <td colSpan={2} style={{ ...cell, borderBottom: 0, borderLeft: 0, verticalAlign: 'top' }}>
              {Number(nota.diskon) > 0 && <span className="cu-mono" style={{ fontSize: px(11.5) }}>Diskon −{formatRp(nota.diskon)}</span>}
            </td>
            <td className="text-center uppercase" style={{ ...cell, fontWeight: 700, fontSize: px(11), letterSpacing: '.08em' }}>Jumlah Rp</td>
            <td className="cu-mono text-right" style={{ ...cell, fontWeight: 700, fontSize: px(14), borderWidth: 2 }}>{formatRp(nota.total)}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ lineHeight: 2 }}>
        Terbilang: <Dotted><span className="serif italic" style={{ fontSize: px(14) }}>{terbilangRupiah(Number(nota.total))}</span></Dotted>
        {nota.bayar != null && (
          <div className="cu-mono" style={{ fontSize: px(12) }}>
            {nota.metode} {formatRp(nota.bayar)}{kembali != null && kembali > 0 ? `  ·  Kembali ${formatRp(kembali)}` : ''}
          </div>
        )}
        {nota.catatan && <div style={{ fontSize: px(12) }}>Catatan: {nota.catatan}</div>}
      </div>

      <div className="mt-auto flex flex-col" style={{ gap: px(14) }}>
        <div className="grid grid-cols-2" style={{ gap: px(80) }}>
          {SIGNATURES.map(sig => (
            <div key={sig} className="text-center">
              <div>{sig},</div>
              <div style={{ height: px(60) }} />
              <div>( <Dotted minWidth={px(160)} /> )</div>
            </div>
          ))}
        </div>
        {toko.catatan_kaki && (
          <div className="text-center" style={{ fontSize: px(11.5), borderTop: `1px solid ${INK}`, paddingTop: px(6) }}>
            Perhatian: {toko.catatan_kaki}
          </div>
        )}
      </div>
    </article>
  )
}

function Thermal({ nota, toko, showNomor }: ThermalProps) {
  const { kembali } = totals(nota)
  const cell = { border: '1px solid #000', padding: '2px 3px' }
  return (
    <article className="nota-sheet cu-mono" style={{ ...thermalSheet, fontSize: 11, lineHeight: 1.35 }}>
      <div className="text-center">
        <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase' }}>{toko.nama}</div>
        {toko.alamat && <div className="whitespace-pre-line">{toko.alamat}</div>}
        {toko.telepon && <div>Telp. {toko.telepon}</div>}
        <div style={{ marginTop: 6, fontWeight: 700, letterSpacing: '.2em', textDecoration: 'underline' }}>NOTA KONTAN</div>
        {showNomor && <div>No. {nota.nomor}</div>}
      </div>
      <div style={{ marginTop: 6 }}>Tgl  : {stamp(nota)}</div>
      {nota.kasir && <div>Kasir: {nota.kasir}</div>}
      <table className="w-full border-collapse" style={{ marginTop: 6 }}>
        <thead>
          <tr>
            {['Bnyk', 'Barang', 'Jumlah'].map(h => <th key={h} style={{ ...cell, fontWeight: 700, textAlign: 'center' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {nota.items.map((it, i) => (
            <tr key={i}>
              <td className="text-center align-top" style={{ ...cell, whiteSpace: 'nowrap' }}>{it.qty}{it.satuan ? ` ${it.satuan}` : ''}</td>
              <td className="align-top" style={{ ...cell, overflowWrap: 'anywhere' }}>
                {it.nama}
                {it.qty !== 1 && <div>@{formatRp(it.harga)}</div>}
              </td>
              <td className="text-right align-top" style={{ ...cell, whiteSpace: 'nowrap' }}>{formatRp(it.qty * it.harga)}</td>
            </tr>
          ))}
          {Number(nota.diskon) > 0 && (
            <tr><td colSpan={2} style={cell}>Diskon</td><td className="text-right" style={cell}>-{formatRp(nota.diskon)}</td></tr>
          )}
          <tr style={{ fontWeight: 700 }}>
            <td colSpan={2} style={cell}>JUMLAH Rp</td>
            <td className="text-right" style={{ ...cell, borderWidth: 2 }}>{formatRp(nota.total)}</td>
          </tr>
        </tbody>
      </table>
      {nota.bayar != null && (
        <div style={{ marginTop: 4 }}>{nota.metode} {formatRp(nota.bayar)}{kembali != null && kembali > 0 ? ` · Kembali ${formatRp(kembali)}` : ''}</div>
      )}
      {nota.catatan && <div style={{ marginTop: 4 }}>{nota.catatan}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '3ch', marginTop: 10 }}>
        {SIGNATURES.map(sig => (
          <div key={sig} className="text-center">
            <div>{sig}</div>
            <div style={{ height: 40 }} />
            <div>(..........)</div>
          </div>
        ))}
      </div>
      {toko.catatan_kaki && <div className="text-center" style={{ marginTop: 8, borderTop: '1px solid #000', paddingTop: 4 }}>{toko.catatan_kaki}</div>}
    </article>
  )
}

export const kontan: NotaStyle = { id: 'kontan', label: 'Nota kontan', hint: 'Buku nota toko: tabel bergaris kolom, Tuan/Toko', Paper, Thermal }
