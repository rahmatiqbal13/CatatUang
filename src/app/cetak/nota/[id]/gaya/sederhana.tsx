import { formatRp } from '@/lib/tokens'
import { formatTanggal, terbilangRupiah } from '@/lib/formatters'
import { subtotalItems } from '@/lib/nota'
import { SIGNATURES, stamp, type NotaStyle, type PaperProps, type ThermalProps } from './shared'

/* Gaya "Sederhana": the first, plain layout. */

/* ── A4 / A5 ─────────────────────────────────────────────────────────── */

function Paper({ nota, toko, size, showNomor }: PaperProps) {
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

export const sederhana: NotaStyle = { id: 'sederhana', label: 'Sederhana', hint: 'Tata letak polos versi pertama', Paper, Thermal }
