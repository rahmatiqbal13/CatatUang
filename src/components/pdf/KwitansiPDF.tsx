import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatRupiah, formatTanggal, terbilang } from '@/lib/formatters'
import type { Kwitansi } from '@/lib/types'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 11, color: '#1E293B', backgroundColor: '#FFFFFF', padding: '48 56', lineHeight: 1.5 },
  headerTitle: { fontSize: 18, fontWeight: 700, textAlign: 'center', letterSpacing: 2, marginBottom: 4 },
  headerMeta: { textAlign: 'center', color: '#64748B', fontSize: 9.5, marginBottom: 24 },

  row: { flexDirection: 'row', marginBottom: 10 },
  label: { width: 120, color: '#64748B' },
  colon: { width: 10 },
  value: { flex: 1, fontWeight: 700 },

  amountBox: { border: '1 solid #1E293B', borderRadius: 4, padding: 12, marginTop: 4, marginBottom: 20 },
  amountValue: { fontSize: 16, fontWeight: 700, textAlign: 'center', marginBottom: 4 },
  terbilangText: { textAlign: 'center', fontStyle: 'italic', color: '#334155' },

  signatureBlock: { marginTop: 40, width: 200, alignSelf: 'flex-end', textAlign: 'center' },
  signatureLabel: { marginBottom: 40, color: '#64748B' },
  signatureName: { fontWeight: 700, textDecoration: 'underline' },
})

type Props = { kwitansi: Kwitansi }

export function KwitansiPDF({ kwitansi }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.headerTitle}>KWITANSI</Text>
        <Text style={s.headerMeta}>No. {kwitansi.nomor}</Text>

        <View style={s.row}><Text style={s.label}>Telah terima dari</Text><Text style={s.colon}>:</Text><Text style={s.value}>{kwitansi.diterima_dari}</Text></View>
        <View style={s.row}><Text style={s.label}>Untuk pembayaran</Text><Text style={s.colon}>:</Text><Text style={s.value}>{kwitansi.untuk_pembayaran}</Text></View>
        <View style={s.row}><Text style={s.label}>Tanggal</Text><Text style={s.colon}>:</Text><Text style={s.value}>{formatTanggal(kwitansi.tanggal)}</Text></View>

        <View style={s.amountBox}>
          <Text style={s.amountValue}>{formatRupiah(kwitansi.jumlah)}</Text>
          <Text style={s.terbilangText}>{terbilang(kwitansi.jumlah)} Rupiah</Text>
        </View>

        {kwitansi.catatan && <Text style={{ marginBottom: 16, color: '#475569', fontSize: 10 }}>Catatan: {kwitansi.catatan}</Text>}

        <View style={s.signatureBlock}>
          <Text style={s.signatureLabel}>{formatTanggal(kwitansi.tanggal)}</Text>
          <Text style={s.signatureName}>{kwitansi.penerima_nama}</Text>
          {kwitansi.penerima_jabatan && <Text style={{ color: '#64748B', fontSize: 9.5 }}>{kwitansi.penerima_jabatan}</Text>}
        </View>
      </Page>
    </Document>
  )
}
