import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatRupiah, formatTanggal, terbilang } from '@/lib/formatters'
import type { BuktiUang } from '@/lib/types'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 11, color: '#1E293B', backgroundColor: '#FFFFFF', padding: '48 56', lineHeight: 1.5 },
  headerTitle: { fontSize: 18, fontWeight: 700, textAlign: 'center', letterSpacing: 2, marginBottom: 4 },
  headerMeta: { textAlign: 'center', color: '#64748B', fontSize: 9.5, marginBottom: 24 },

  intro: { marginBottom: 14 },
  sectionTitle: { fontWeight: 700, marginBottom: 6, marginTop: 4 },
  row: { flexDirection: 'row', marginBottom: 8 },
  label: { width: 120, color: '#64748B' },
  colon: { width: 10 },
  value: { flex: 1, fontWeight: 700 },

  amountBox: { border: '1 solid #1E293B', borderRadius: 4, padding: 12, marginTop: 4, marginBottom: 20 },
  amountValue: { fontSize: 16, fontWeight: 700, textAlign: 'center', marginBottom: 4 },
  terbilangText: { textAlign: 'center', fontStyle: 'italic', color: '#334155' },

  dateLine: { textAlign: 'right', marginTop: 24 },
  signatures: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  signatureBlock: { width: 200, textAlign: 'center' },
  signatureLabel: { marginBottom: 56, color: '#64748B' },
  signatureName: { fontWeight: 700, textDecoration: 'underline' },
  signatureRole: { color: '#64748B', fontSize: 9.5 },
})

export const JUDUL_BUKTI = {
  penerimaan: 'BUKTI PENERIMAAN UANG',
  serah_terima: 'BUKTI SERAH TERIMA UANG',
} as const

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}><Text style={s.label}>{label}</Text><Text style={s.colon}>:</Text><Text style={s.value}>{value}</Text></View>
  )
}

function Signature({ label, nama, jabatan }: { label: string; nama: string; jabatan: string | null }) {
  return (
    <View style={s.signatureBlock}>
      <Text style={s.signatureLabel}>{label}</Text>
      <Text style={s.signatureName}>{nama}</Text>
      {jabatan && <Text style={s.signatureRole}>{jabatan}</Text>}
    </View>
  )
}

type Props = { bukti: BuktiUang }

export function BuktiUangPDF({ bukti }: Props) {
  const tanggal = formatTanggal(bukti.tanggal)
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.headerTitle}>{JUDUL_BUKTI[bukti.jenis]}</Text>
        <Text style={s.headerMeta}>No. {bukti.nomor}</Text>

        {bukti.jenis === 'serah_terima' ? (
          <>
            <Text style={s.intro}>Pada tanggal {tanggal} telah dilakukan serah terima uang antara:</Text>
            <Text style={s.sectionTitle}>Pihak Pertama (Yang Menyerahkan)</Text>
            <Row label="Nama" value={bukti.pemberi_nama} />
            {bukti.pemberi_jabatan && <Row label="Jabatan" value={bukti.pemberi_jabatan} />}
            <Text style={s.sectionTitle}>Pihak Kedua (Yang Menerima)</Text>
            <Row label="Nama" value={bukti.penerima_nama} />
            {bukti.penerima_jabatan && <Row label="Jabatan" value={bukti.penerima_jabatan} />}
            <Text style={[s.intro, { marginTop: 8 }]}>
              Pihak Pertama telah menyerahkan uang kepada Pihak Kedua, dan Pihak Kedua telah menerimanya, untuk keperluan: {bukti.keperluan}
            </Text>
          </>
        ) : (
          <>
            <Row label="Telah terima dari" value={bukti.pemberi_nama} />
            <Row label="Untuk keperluan" value={bukti.keperluan} />
            <Row label="Tanggal" value={tanggal} />
          </>
        )}

        <View style={s.amountBox}>
          <Text style={s.amountValue}>{formatRupiah(bukti.jumlah)}</Text>
          <Text style={s.terbilangText}>{terbilang(bukti.jumlah)} Rupiah</Text>
        </View>

        {bukti.catatan && <Text style={{ marginBottom: 16, color: '#475569', fontSize: 10 }}>Catatan: {bukti.catatan}</Text>}

        <Text style={s.dateLine}>{tanggal}</Text>
        <View style={s.signatures}>
          <Signature label="Yang Menyerahkan" nama={bukti.pemberi_nama} jabatan={bukti.pemberi_jabatan} />
          <Signature label="Yang Menerima" nama={bukti.penerima_nama} jabatan={bukti.penerima_jabatan} />
        </View>
      </Page>
    </Document>
  )
}
