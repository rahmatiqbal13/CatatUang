import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatRupiah, formatTanggal } from '@/lib/formatters'
import { computeInvoiceTotals } from '@/lib/dokumenTotals'
import type { Invoice } from '@/lib/types'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1E293B', backgroundColor: '#FFFFFF', padding: '36 48', lineHeight: 1.4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  headerTitle: { fontSize: 20, fontWeight: 700, letterSpacing: 1 },
  headerMeta: { textAlign: 'right' },
  headerMetaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },
  headerMetaLabel: { color: '#64748B', width: 80, textAlign: 'right', marginRight: 6 },

  partiesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  partyCol: { width: '45%' },
  partyLabel: { fontSize: 9, color: '#64748B', textTransform: 'uppercase', marginBottom: 3 },
  partyName: { fontWeight: 700, marginBottom: 1 },
  partyLine: { color: '#334155' },

  table: { marginBottom: 10 },
  tableHeaderRow: { flexDirection: 'row', borderBottom: '1 solid #1E293B', paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 3, borderBottom: '0.5 solid #E2E8F0' },
  colUraian: { flex: 1 },
  colQty: { width: 40, textAlign: 'right' },
  colHarga: { width: 90, textAlign: 'right' },
  colSubtotal: { width: 90, textAlign: 'right' },
  th: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#64748B' },

  totalsBlock: { alignSelf: 'flex-end', width: 220, marginTop: 6 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalsLabel: { color: '#64748B' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 5, marginTop: 3, borderTop: '1 solid #1E293B' },
  grandTotalLabel: { fontWeight: 700 },
  grandTotalValue: { fontWeight: 700 },

  notes: { marginTop: 16, fontSize: 9.5, color: '#475569' },

  signatureBlock: { marginTop: 30, width: 200, alignSelf: 'flex-end', textAlign: 'center' },
  signatureLabel: { marginBottom: 40, color: '#64748B' },
  signatureName: { fontWeight: 700, textDecoration: 'underline' },
})

type Props = { invoice: Invoice }

export function InvoicePDF({ invoice }: Props) {
  const t = computeInvoiceTotals(invoice.items, invoice.diskon_persen, invoice.pajak_persen)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>INVOICE</Text>
          <View style={s.headerMeta}>
            <View style={s.headerMetaRow}><Text style={s.headerMetaLabel}>No. Invoice</Text><Text>{invoice.nomor}</Text></View>
            <View style={s.headerMetaRow}><Text style={s.headerMetaLabel}>Tanggal</Text><Text>{formatTanggal(invoice.tanggal)}</Text></View>
            {invoice.jatuh_tempo && (
              <View style={s.headerMetaRow}><Text style={s.headerMetaLabel}>Jatuh Tempo</Text><Text>{formatTanggal(invoice.jatuh_tempo)}</Text></View>
            )}
          </View>
        </View>

        <View style={s.partiesRow}>
          <View style={s.partyCol}>
            <Text style={s.partyLabel}>Dari</Text>
            <Text style={s.partyName}>{invoice.penerbit_nama}</Text>
            {invoice.penerbit_jabatan && <Text style={s.partyLine}>{invoice.penerbit_jabatan}</Text>}
            {invoice.penerbit_instansi && <Text style={s.partyLine}>{invoice.penerbit_instansi}</Text>}
          </View>
          <View style={s.partyCol}>
            <Text style={s.partyLabel}>Kepada</Text>
            <Text style={s.partyName}>{invoice.penerima_nama}</Text>
            {invoice.penerima_instansi && <Text style={s.partyLine}>{invoice.penerima_instansi}</Text>}
            {invoice.penerima_alamat && <Text style={s.partyLine}>{invoice.penerima_alamat}</Text>}
          </View>
        </View>

        <View style={s.table}>
          <View style={s.tableHeaderRow}>
            <Text style={[s.th, s.colUraian]}>Uraian</Text>
            <Text style={[s.th, s.colQty]}>Qty</Text>
            <Text style={[s.th, s.colHarga]}>Harga Satuan</Text>
            <Text style={[s.th, s.colSubtotal]}>Subtotal</Text>
          </View>
          {invoice.items.map((it, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={s.colUraian}>{it.uraian}</Text>
              <Text style={s.colQty}>{it.qty}</Text>
              <Text style={s.colHarga}>{formatRupiah(it.harga_satuan)}</Text>
              <Text style={s.colSubtotal}>{formatRupiah(it.qty * it.harga_satuan)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totalsBlock}>
          <View style={s.totalsRow}><Text style={s.totalsLabel}>Subtotal</Text><Text>{formatRupiah(t.subtotal)}</Text></View>
          {invoice.diskon_persen > 0 && (
            <View style={s.totalsRow}><Text style={s.totalsLabel}>Diskon ({invoice.diskon_persen}%)</Text><Text>-{formatRupiah(t.diskonNominal)}</Text></View>
          )}
          {invoice.pajak_persen > 0 && (
            <View style={s.totalsRow}><Text style={s.totalsLabel}>Pajak ({invoice.pajak_persen}%)</Text><Text>{formatRupiah(t.pajakNominal)}</Text></View>
          )}
          <View style={s.grandTotalRow}><Text style={s.grandTotalLabel}>Total</Text><Text style={s.grandTotalValue}>{formatRupiah(t.total)}</Text></View>
        </View>

        {invoice.catatan && <Text style={s.notes}>Catatan: {invoice.catatan}</Text>}

        <View style={s.signatureBlock}>
          <Text style={s.signatureLabel}>{formatTanggal(invoice.tanggal)}</Text>
          <Text style={s.signatureName}>{invoice.penerbit_nama}</Text>
        </View>
      </Page>
    </Document>
  )
}
