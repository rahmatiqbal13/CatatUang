import { formatRp } from '@/lib/tokens'
import { formatTanggal, terbilangRupiah } from '@/lib/formatters'
import { SIGNATURES, stamp, totals, paperSheet, thermalSheet, type NotaStyle, type PaperProps, type ThermalProps } from './shared'

/*
 * Gaya "Faktur": office invoice. A black spine down the left edge carries the
 * word NOTA; boxed info panels; a fully ruled table with a grey header row.
 */

const INK = '#111'
const GREY = '#E6E6E6'
const LINE = `1px solid ${INK}`

function Paper({ nota, toko, size, showNomor }: PaperProps) {
  const a5 = size === 'a5'
  const k = a5 ? 0.8 : 1
  const px = (n: number) => Math.round(n * k * 10) / 10
  const { subtotal, kembali } = totals(nota)
  const cell = { border: LINE, padding: `${px(6)}px ${px(8)}px` }
  const caps = { fontSize: px(9.5), letterSpacing: '.14em', textTransform: 'uppercase' as const, fontWeight: 700 }
  const info: [string, string][] = [
    ...(showNomor ? [['Nomor', nota.nomor] as [string, string]] : []),
    ['Tanggal', formatTanggal(nota.tanggal)],
    ...(nota.kasir ? [['Kasir', nota.kasir] as [string, string]] : []),
    ['Pembayaran', nota.metode],
  ]

  return (
    <article className="nota-sheet flex" style={{ ...paperSheet(size), color: INK, fontSize: px(12.5) }}>
      {/* Spine */}
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ width: px(40), background: INK, color: '#fff', marginRight: px(22) }}
      >
        <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', ...caps, fontSize: px(13), letterSpacing: '.6em' }}>
          NOTA · {toko.nama}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: px(18) }}>
        <header className="flex items-start justify-between" style={{ gap: px(20) }}>
          <div className="min-w-0">
            <div style={{ fontSize: px(24), fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{toko.nama}</div>
            {toko.alamat && <div className="whitespace-pre-line" style={{ marginTop: px(6) }}>{toko.alamat}</div>}
            {toko.telepon && <div>Telp. {toko.telepon}</div>}
          </div>
          <table className="shrink-0 border-collapse" style={{ minWidth: px(220) }}>
            <tbody>
              {info.map(([l, v]) => (
                <tr key={l}>
                  <th className="text-left" style={{ ...cell, ...caps, background: GREY }}>{l}</th>
                  <td className="cu-mono" style={{ ...cell, fontWeight: 600 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </header>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['No', 'Uraian barang', 'Qty', 'Satuan', 'Harga', 'Jumlah'].map((h, i) => (
                <th key={h} style={{ ...cell, ...caps, background: GREY, textAlign: i >= 4 ? 'right' : i === 0 || i === 2 || i === 3 ? 'center' : 'left', width: i === 0 ? px(36) : i === 2 ? px(48) : i === 3 ? px(64) : i >= 4 ? px(104) : undefined }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nota.items.map((it, i) => (
              <tr key={i}>
                <td className="text-center" style={cell}>{i + 1}</td>
                <td style={cell}>{it.nama}</td>
                <td className="cu-mono text-center" style={cell}>{it.qty}</td>
                <td className="text-center" style={cell}>{it.satuan ?? '-'}</td>
                <td className="cu-mono text-right" style={cell}>{formatRp(it.harga)}</td>
                <td className="cu-mono text-right" style={cell}>{formatRp(it.qty * it.harga)}</td>
              </tr>
            ))}
            {[
              ['Subtotal', formatRp(subtotal), false],
              ...(Number(nota.diskon) > 0 ? [['Diskon', `−${formatRp(nota.diskon)}`, false] as const] : []),
              ['Total', formatRp(nota.total), true],
              ...(nota.bayar != null ? [[`Dibayar (${nota.metode})`, formatRp(nota.bayar), false] as const] : []),
              ...(kembali != null && kembali > 0 ? [['Kembali', formatRp(kembali), false] as const] : []),
            ].map(([l, v, strong]) => (
              <tr key={String(l)}>
                <td colSpan={4} style={{ border: 0 }} />
                <th className="text-right" style={{ ...cell, ...caps, background: strong ? INK : GREY, color: strong ? '#fff' : INK }}>{l}</th>
                <td className="cu-mono text-right" style={{ ...cell, fontWeight: strong ? 800 : 500, fontSize: strong ? px(14) : undefined }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ border: LINE }}>
          <div style={{ ...caps, background: GREY, padding: `${px(4)}px ${px(8)}px`, borderBottom: LINE }}>Terbilang</div>
          <div className="serif italic" style={{ padding: `${px(8)}px`, fontSize: px(14) }}>{terbilangRupiah(Number(nota.total))}</div>
        </div>
        {nota.catatan && (
          <div style={{ border: LINE }}>
            <div style={{ ...caps, background: GREY, padding: `${px(4)}px ${px(8)}px`, borderBottom: LINE }}>Catatan</div>
            <div style={{ padding: `${px(8)}px` }}>{nota.catatan}</div>
          </div>
        )}

        <div className="mt-auto grid grid-cols-2" style={{ gap: px(28) }}>
          {SIGNATURES.map(sig => (
            <div key={sig} style={{ border: LINE }}>
              <div className="text-center" style={{ ...caps, background: GREY, padding: `${px(4)}px`, borderBottom: LINE }}>{sig}</div>
              <div style={{ height: px(76) }} />
            </div>
          ))}
        </div>
        {toko.catatan_kaki && <div className="text-center" style={{ fontSize: px(11) }}>{toko.catatan_kaki}</div>}
      </div>
    </article>
  )
}

function Thermal({ nota, toko, showNomor }: ThermalProps) {
  const { subtotal, kembali } = totals(nota)
  const label = (t: string) => (
    <div style={{ background: '#000', color: '#fff', fontWeight: 700, letterSpacing: '.18em', padding: '1px 4px', margin: '8px 0 4px' }}>{t}</div>
  )
  const row = (l: string, r: string, bold = false) => (
    <div className="flex justify-between" style={{ fontWeight: bold ? 700 : 400 }}><span>{l}</span><span className="whitespace-nowrap">{r}</span></div>
  )
  return (
    <article className="nota-sheet cu-mono" style={{ ...thermalSheet, fontSize: 11, lineHeight: 1.35, textTransform: 'uppercase' }}>
      <div className="text-center" style={{ border: '1px solid #000', padding: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{toko.nama}</div>
        {toko.alamat && <div className="whitespace-pre-line">{toko.alamat}</div>}
        {toko.telepon && <div>Telp. {toko.telepon}</div>}
      </div>
      {label('Faktur')}
      {showNomor && row('Nomor', nota.nomor)}
      {row('Tanggal', stamp(nota))}
      {nota.kasir && row('Kasir', nota.kasir)}
      {label('Rincian')}
      {nota.items.map((it, i) => (
        <div key={i} style={{ borderBottom: '1px solid #000', padding: '2px 0' }}>
          <div>{i + 1}. {it.nama}</div>
          {row(`${it.qty}${it.satuan ? ` ${it.satuan}` : ''} x ${formatRp(it.harga)}`, formatRp(it.qty * it.harga))}
        </div>
      ))}
      {label('Pembayaran')}
      {row('Subtotal', formatRp(subtotal))}
      {Number(nota.diskon) > 0 && row('Diskon', `-${formatRp(nota.diskon)}`)}
      <div style={{ border: '2px solid #000', padding: '2px 4px', margin: '3px 0' }}>{row('Total', formatRp(nota.total), true)}</div>
      {nota.bayar != null && row(nota.metode, formatRp(nota.bayar))}
      {kembali != null && kembali > 0 && row('Kembali', formatRp(kembali))}
      {nota.catatan && (<>{label('Catatan')}<div>{nota.catatan}</div></>)}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 6, marginTop: 10 }}>
        {SIGNATURES.map(sig => (
          <div key={sig} style={{ border: '1px solid #000' }}>
            <div className="text-center" style={{ borderBottom: '1px solid #000' }}>{sig}</div>
            <div style={{ height: 44 }} />
          </div>
        ))}
      </div>
      {toko.catatan_kaki && <div className="text-center" style={{ marginTop: 8 }}>{toko.catatan_kaki}</div>}
    </article>
  )
}

export const faktur: NotaStyle = { id: 'faktur', label: 'Faktur', hint: 'Gaya invoice kantor, tabel bergaris penuh', Paper, Thermal }
