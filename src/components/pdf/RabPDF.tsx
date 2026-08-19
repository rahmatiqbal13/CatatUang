import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { groupRabByKategori, computeRabGrandTotal } from '@/lib/dokumenTotals'
import type { Rab } from '@/lib/types'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1E293B', backgroundColor: '#FFFFFF', padding: '36 48', lineHeight: 1.4 },
  headerTitle: { fontSize: 16, fontWeight: 700, textAlign: 'center' },
  headerSubtitle: { fontSize: 11, textAlign: 'center', marginTop: 2, marginBottom: 4 },
  headerMeta: { textAlign: 'center', color: '#64748B', fontSize: 9, marginBottom: 18 },

  table: { marginBottom: 8 },
  tableHeaderRow: { flexDirection: 'row', borderBottom: '1 solid #1E293B', paddingBottom: 4, marginBottom: 4 },
  categoryRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', paddingVertical: 3, paddingHorizontal: 2, marginTop: 6 },
  categoryLabel: { fontWeight: 700, fontSize: 9.5, textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', paddingVertical: 3, borderBottom: '0.5 solid #E2E8F0' },
  subtotalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 3 },

  colUraian: { flex: 1 },
  colVolume: { width: 50, textAlign: 'right' },
  colSatuan: { width: 50, textAlign: 'right' },
  colHarga: { width: 85, textAlign: 'right' },
  colSubtotal: { width: 85, textAlign: 'right' },
  th: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' },

  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, marginTop: 8, borderTop: '1 solid #1E293B' },
  grandTotalLabel: { fontWeight: 700, fontSize: 11 },
  grandTotalValue: { fontWeight: 700, fontSize: 11 },

  notes: { marginTop: 14, fontSize: 9.5, color: '#475569' },

  signatureBlock: { marginTop: 30, width: 200, alignSelf: 'flex-end', textAlign: 'center' },
  signatureLabel: { marginBottom: 40, color: '#64748B' },
  signatureName: { fontWeight: 700, textDecoration: 'underline' },
})

type Props = { rab: Rab }

export function RabPDF({ rab }: Props) {
  const grouped = groupRabByKategori(rab.items)
  const grandTotal = computeRabGrandTotal(rab.items)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.headerTitle}>RENCANA ANGGARAN BIAYA</Text>
        <Text style={s.headerSubtitle}>{rab.judul}</Text>
        <Text style={s.headerMeta}>No. {rab.nomor} · {formatTanggal(rab.tanggal)}</Text>

        <View style={s.table}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.th, s.colUraian]}>Uraian</Text>
            <Text style={[s.th, s.colVolume]}>Volume</Text>
            <Text style={[s.th, s.colSatuan]}>Satuan</Text>
            <Text style={[s.th, s.colHarga]}>Harga Satuan</Text>
            <Text style={[s.th, s.colSubtotal]}>Subtotal</Text>
          </View>
          {grouped.map(g => (
            <View key={g.kategori}>
              <View style={s.categoryRow}><Text style={s.categoryLabel}>{g.kategori}</Text></View>
              {g.items.map((it, i) => (
                <View key={i} style={s.itemRow}>
                  <Text style={s.colUraian}>{it.uraian}</Text>
                  <Text style={s.colVolume}>{it.volume}</Text>
                  <Text style={s.colSatuan}>{it.satuan}</Text>
                  <Text style={s.colHarga}>{formatRupiah(it.harga_satuan)}</Text>
                  <Text style={s.colSubtotal}>{formatRupiah(it.volume * it.harga_satuan)}</Text>
                </View>
              ))}
              <View style={s.subtotalRow}>
                <Text style={{ fontWeight: 700 }}>Subtotal {g.kategori}: {formatRupiah(g.subtotal)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.grandTotalRow}>
          <Text style={s.grandTotalLabel}>Grand Total</Text>
          <Text style={s.grandTotalValue}>{formatRupiah(grandTotal)}</Text>
        </View>

        {rab.catatan && <Text style={s.notes}>Catatan: {rab.catatan}</Text>}

        <View style={s.signatureBlock}>
          <Text style={s.signatureLabel}>{formatTanggal(rab.tanggal)}</Text>
          <Text style={s.signatureName}>{rab.penyusun_nama}</Text>
          {rab.penyusun_jabatan && <Text style={{ color: '#64748B', fontSize: 9.5 }}>{rab.penyusun_jabatan}</Text>}
        </View>
      </Page>
    </Document>
  )
}
