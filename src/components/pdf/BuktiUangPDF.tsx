import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatRupiah, formatTanggal, terbilangRupiah } from '@/lib/formatters'
import type { BuktiUang } from '@/lib/types'

/*
 * Mirrors the on-screen "paper slip" in BuktiUangClient. Uses the built-in PDF
 * fonts as stand-ins: Times for the Newsreader serif, Courier for IBM Plex Mono,
 * Helvetica for Hanken Grotesk.
 */
const INK = '#18241E'
const MUTED = '#646B64'
const TEXT_2 = '#45514A'
const RULE = '#DDD7C9'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10.5, color: INK, backgroundColor: '#FFFDF8', padding: '56 56 48', lineHeight: 1.4 },

  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kicker: { fontFamily: 'Courier', fontSize: 8.5, letterSpacing: 2.4, color: MUTED },
  title: { fontFamily: 'Times-Italic', fontSize: 30, lineHeight: 1.1, marginTop: 6 },
  nomorLabel: { fontFamily: 'Courier', fontSize: 8.5, color: MUTED, textAlign: 'right' },
  nomor: { fontFamily: 'Courier-Bold', fontSize: 11, textAlign: 'right', marginTop: 2 },

  doubleRule: { marginTop: 26, marginBottom: 24, borderTop: `1 solid ${INK}`, paddingTop: 2 },
  doubleRuleInner: { borderTop: `1 solid ${INK}` },

  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  label: { width: 120, color: MUTED },
  value: { flex: 1 },
  strong: { fontFamily: 'Helvetica-Bold' },
  soft: { color: TEXT_2 },

  amountBox: { flex: 1, height: 46, justifyContent: 'center', position: 'relative', border: `1 solid ${RULE}`, paddingHorizontal: 12, overflow: 'hidden' },
  amountStripes: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  amountText: { fontFamily: 'Times-Roman', fontSize: 26, lineHeight: 1, letterSpacing: -0.4 },

  terbilang: { flex: 1, fontFamily: 'Times-Italic', fontSize: 13 },
  catatan: { flex: 1, color: TEXT_2, fontSize: 9.5 },

  date: { textAlign: 'right', color: TEXT_2, marginTop: 14, marginBottom: 28 },
  signatures: { flexDirection: 'row', gap: 28 },
  sigBlock: { flex: 1 },
  sigLabel: { fontSize: 9.5, color: MUTED },
  sigName: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginTop: 52, paddingBottom: 4, borderBottom: `1 solid ${INK}` },
  sigRole: { fontSize: 9.5, color: MUTED, marginTop: 4 },
})

export const JUDUL_BUKTI = {
  penerimaan: 'BUKTI PENERIMAAN UANG',
  serah_terima: 'BUKTI SERAH TERIMA UANG',
} as const

const JUDUL_ITALIC = {
  penerimaan: 'Bukti penerimaan',
  serah_terima: 'Bukti serah terima',
} as const

/** Ledger-ruled fill behind the amount: 7pt paper band, 2pt light gap. */
function Stripes() {
  return (
    <View style={s.amountStripes}>
      {Array.from({ length: 8 }, (_, i) => (
        <View key={i} style={{ height: 7, marginBottom: 2, backgroundColor: '#F3EEE2' }} />
      ))}
    </View>
  )
}

function Signature({ label, nama, jabatan }: { label: string; nama: string; jabatan: string | null }) {
  return (
    <View style={s.sigBlock}>
      <Text style={s.sigLabel}>{label}</Text>
      <Text style={s.sigName}>{nama}</Text>
      {jabatan && <Text style={s.sigRole}>{jabatan}</Text>}
    </View>
  )
}

type Props = { bukti: BuktiUang }

export function BuktiUangPDF({ bukti }: Props) {
  return (
    <Document title={`${JUDUL_BUKTI[bukti.jenis]} ${bukti.nomor}`}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <View>
            <Text style={s.kicker}>{JUDUL_BUKTI[bukti.jenis]}</Text>
            <Text style={s.title}>{JUDUL_ITALIC[bukti.jenis]}</Text>
          </View>
          <View>
            <Text style={s.nomorLabel}>Nomor</Text>
            <Text style={s.nomor}>{bukti.nomor}</Text>
          </View>
        </View>

        <View style={s.doubleRule}><View style={s.doubleRuleInner} /></View>

        <View style={s.row}>
          <Text style={s.label}>Telah diterima dari</Text>
          <Text style={s.value}>
            <Text style={s.strong}>{bukti.pemberi_nama}</Text>
            {bukti.pemberi_jabatan && <Text style={s.soft}> · {bukti.pemberi_jabatan}</Text>}
          </Text>
        </View>

        <View style={s.row}>
          <Text style={s.label}>Uang sejumlah</Text>
          <View style={s.amountBox}>
            <Stripes />
            <Text style={s.amountText}>{formatRupiah(bukti.jumlah)}</Text>
          </View>
        </View>

        <View style={s.row}>
          <Text style={s.label}>Terbilang</Text>
          <Text style={s.terbilang}>{terbilangRupiah(bukti.jumlah)}</Text>
        </View>

        <View style={s.row}>
          <Text style={s.label}>Untuk keperluan</Text>
          <Text style={s.value}>{bukti.keperluan}</Text>
        </View>

        {bukti.catatan && (
          <View style={s.row}>
            <Text style={s.label}>Catatan</Text>
            <Text style={s.catatan}>{bukti.catatan}</Text>
          </View>
        )}

        <Text style={s.date}>{formatTanggal(bukti.tanggal)}</Text>

        <View style={s.signatures}>
          <Signature label="Yang menyerahkan" nama={bukti.pemberi_nama} jabatan={bukti.pemberi_jabatan} />
          <Signature label="Yang menerima" nama={bukti.penerima_nama} jabatan={bukti.penerima_jabatan} />
        </View>
      </Page>
    </Document>
  )
}
