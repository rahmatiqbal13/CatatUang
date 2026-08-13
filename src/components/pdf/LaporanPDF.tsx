import {
  Document, Page, Text, View, StyleSheet
} from '@react-pdf/renderer'
import type { DanaMasukWithSaldo, Pengeluaran } from '@/lib/types'

const NAVY  = '#1E3A5F'
const BLUE  = '#2563EB'
const TEAL  = '#0D9488'
const LIGHT = '#F0F4F8'
const MUTED = '#64748B'
const GREEN = '#065F46'
const GREEN_BG = '#D1FAE5'
const AMBER = '#92400E'
const AMBER_BG = '#FEF3C7'
const RED   = '#991B1B'
const RED_BG  = '#FEE2E2'
const WHITE = '#FFFFFF'
const BORDER = '#E2E8F0'

const s = StyleSheet.create({
  page:       { fontFamily: 'Helvetica', fontSize: 8, color: '#1E293B', backgroundColor: WHITE, paddingBottom: 40 },
  header:     { backgroundColor: NAVY, padding: '14 20 12 20', marginBottom: 0 },
  headerTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerTitle:{ color: WHITE, fontSize: 14, fontWeight: 700, marginBottom: 2 },
  headerSub:  { color: '#94A3B8', fontSize: 8 },
  headerRight:{ alignItems: 'flex-end' },
  headerBadge:{ backgroundColor: BLUE, color: WHITE, fontSize: 7, fontWeight: 600, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
  accentLine: { height: 3, backgroundColor: BLUE },

  body:       { padding: '16 20' },
  section:    { marginBottom: 14 },
  sectionTitle:{ fontSize: 9, fontWeight: 700, color: NAVY, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 3 },

  /* Stats grid */
  statsRow:   { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox:    { flex: 1, borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: '8 10' },
  statLabel:  { fontSize: 6.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  statValue:  { fontSize: 11, fontWeight: 700 },

  /* Table */
  table:      { borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: 'hidden' },
  thead:      { backgroundColor: NAVY, flexDirection: 'row' },
  th:         { color: WHITE, fontWeight: 600, fontSize: 7, padding: '5 6', flex: 1 },
  thRight:    { color: WHITE, fontWeight: 600, fontSize: 7, padding: '5 6', flex: 1, textAlign: 'right' },
  thCenter:   { color: WHITE, fontWeight: 600, fontSize: 7, padding: '5 6', flex: 1, textAlign: 'center' },
  row:        { flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER },
  rowAlt:     { flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: LIGHT },
  rowTotal:   { flexDirection: 'row', borderTopWidth: 2, borderTopColor: BLUE, backgroundColor: '#EFF6FF' },
  td:         { fontSize: 7.5, padding: '5 6', flex: 1, color: '#334155' },
  tdRight:    { fontSize: 7.5, padding: '5 6', flex: 1, textAlign: 'right', color: '#334155' },
  tdCenter:   { fontSize: 7.5, padding: '5 6', flex: 1, textAlign: 'center', color: '#334155' },
  tdBold:     { fontSize: 7.5, padding: '5 6', flex: 1, fontWeight: 700, color: '#1E293B' },
  tdBoldRight:{ fontSize: 7.5, padding: '5 6', flex: 1, fontWeight: 700, textAlign: 'right', color: '#1E293B' },

  /* Badge status */
  badgeApproved: { backgroundColor: GREEN_BG, color: GREEN,  fontSize: 6.5, fontWeight: 600, paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 3 },
  badgePending:  { backgroundColor: AMBER_BG, color: AMBER,  fontSize: 6.5, fontWeight: 600, paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 3 },
  badgeRejected: { backgroundColor: RED_BG,   color: RED,    fontSize: 6.5, fontWeight: 600, paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 3 },

  /* Progress bar */
  progressTrack: { height: 5, backgroundColor: BORDER, borderRadius: 2, marginTop: 2 },
  progressFill:  { height: 5, backgroundColor: BLUE, borderRadius: 2 },

  /* Category row */
  catRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: BORDER },
  catName:    { fontSize: 7.5, color: '#334155', flex: 1 },
  catValue:   { fontSize: 7.5, fontWeight: 700, color: NAVY, width: 80, textAlign: 'right' },
  catPct:     { fontSize: 6.5, color: MUTED, width: 36, textAlign: 'right' },

  /* Footer */
  footer:     { position: 'absolute', bottom: 16, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6 },
  footerText: { fontSize: 6.5, color: MUTED },
  pageNum:    { fontSize: 6.5, color: MUTED },

  /* Dana info */
  infoRow:    { flexDirection: 'row', gap: 4, marginBottom: 3 },
  infoLabel:  { fontSize: 7.5, color: MUTED, width: 90 },
  infoValue:  { fontSize: 7.5, color: '#1E293B', fontWeight: 600 },

  /* Cover */
  coverTitle: { fontSize: 22, fontWeight: 700, color: WHITE, marginBottom: 4 },
  coverSub:   { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
})

function formatRp(v: number) {
  return 'Rp ' + v.toLocaleString('id-ID')
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function pct(v: number, t: number) {
  if (t === 0) return '0.0%'
  return ((v / t) * 100).toFixed(1) + '%'
}
function now() {
  return new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function statusBadge(status: string) {
  if (status === 'approved') return <View style={s.badgeApproved}><Text>Disetujui</Text></View>
  if (status === 'pending')  return <View style={s.badgePending}><Text>Menunggu</Text></View>
  return <View style={s.badgeRejected}><Text>Ditolak</Text></View>
}

function ProgressBar({ value }: { value: number }) {
  const width = Math.min(Math.max(value, 0), 100)
  return (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${width}%` }]} />
    </View>
  )
}

function PageFooter({ namaDirektorat }: { namaDirektorat: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>{namaDirektorat} · Dicetak: {now()}</Text>
      <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`} />
    </View>
  )
}

// ===================== LAPORAN GLOBAL =====================
type GlobalProps = {
  danaList: DanaMasukWithSaldo[]
  pengeluaranList: Pengeluaran[]
  perKategori: { kategori: string; total: number; persen: number }[]
  perDana: (DanaMasukWithSaldo & { keluar: number; pending: number; sisa: number; persen: number })[]
  totalDana: number
  totalKeluar: number
  totalPending: number
  sisaSaldo: number
  namaDirektorat: string
  filterDari?: string
  filterSampai?: string
}

export function LaporanGlobalPDF({
  danaList, pengeluaranList, perKategori, perDana,
  totalDana, totalKeluar, totalPending, sisaSaldo,
  namaDirektorat, filterDari, filterSampai
}: GlobalProps) {
  const periode = filterDari && filterSampai
    ? `${fmtDate(filterDari)} – ${fmtDate(filterSampai)}`
    : filterDari ? `Dari ${fmtDate(filterDari)}`
    : filterSampai ? `Sampai ${fmtDate(filterSampai)}`
    : 'Semua Periode'

  return (
    <Document>
      {/* HALAMAN 1: COVER + RINGKASAN */}
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerTop}>
            <View>
              <Text style={s.headerTitle}>{namaDirektorat}</Text>
              <Text style={s.headerSub}>LAPORAN KEUANGAN</Text>
              <Text style={[s.headerSub, { marginTop: 2 }]}>{periode}</Text>
            </View>
            <View style={s.headerRight}>
              <View style={s.headerBadge}><Text>GLOBAL</Text></View>
            </View>
          </View>
        </View>
        <View style={s.accentLine} />

        <View style={s.body}>
          {/* Stats */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ringkasan Keuangan</Text>
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statLabel}>Total Dana Masuk</Text>
                <Text style={[s.statValue, { color: BLUE }]}>{formatRp(totalDana)}</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statLabel}>Total Pengeluaran</Text>
                <Text style={[s.statValue, { color: '#DC2626' }]}>{formatRp(totalKeluar)}</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statLabel}>Sisa Saldo</Text>
                <Text style={[s.statValue, { color: TEAL }]}>{formatRp(sisaSaldo)}</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statLabel}>Menunggu Approval</Text>
                <Text style={[s.statValue, { color: '#D97706' }]}>{formatRp(totalPending)}</Text>
              </View>
            </View>
          </View>

          {/* Ringkasan per Dana */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ringkasan Per Dana</Text>
            <View style={s.table}>
              <View style={s.thead}>
                <View style={[s.th, { flex: 2 }]}><Text>Nama Dana</Text></View>
                <View style={s.th}><Text>Sumber</Text></View>
                <View style={s.thRight}><Text>Total Dana</Text></View>
                <View style={s.thRight}><Text>Terpakai</Text></View>
                <View style={s.thRight}><Text>Sisa</Text></View>
                <View style={s.thRight}><Text>%</Text></View>
              </View>
              {perDana.map((d, i) => (
                <View key={d.id} style={i % 2 === 0 ? s.row : s.rowAlt}>
                  <View style={[s.td, { flex: 2 }]}><Text>{d.nama_dana}</Text></View>
                  <View style={s.td}><Text>{d.sumber}</Text></View>
                  <View style={s.tdRight}><Text>{formatRp(Number(d.jumlah))}</Text></View>
                  <View style={[s.tdRight, { color: '#DC2626' }]}><Text>{formatRp(d.keluar)}</Text></View>
                  <View style={[s.tdRight, { color: TEAL, fontWeight: 600 }]}><Text>{formatRp(d.sisa)}</Text></View>
                  <View style={s.tdRight}><Text>{d.persen.toFixed(1)}%</Text></View>
                </View>
              ))}
              <View style={s.rowTotal}>
                <View style={[s.tdBold, { flex: 2 }]}><Text>TOTAL</Text></View>
                <View style={s.td}><Text></Text></View>
                <View style={s.tdBoldRight}><Text>{formatRp(totalDana)}</Text></View>
                <View style={[s.tdBoldRight, { color: '#DC2626' }]}><Text>{formatRp(totalKeluar)}</Text></View>
                <View style={[s.tdBoldRight, { color: TEAL }]}><Text>{formatRp(sisaSaldo)}</Text></View>
                <View style={s.tdRight}><Text></Text></View>
              </View>
            </View>
          </View>

          {/* Breakdown Kategori */}
          {perKategori.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Breakdown per Kategori</Text>
              {perKategori.map((k, i) => (
                <View key={k.kategori}>
                  <View style={s.catRow}>
                    <Text style={s.catName}>{i + 1}. {k.kategori}</Text>
                    <Text style={s.catValue}>{formatRp(k.total)}</Text>
                    <Text style={s.catPct}>{k.persen.toFixed(1)}%</Text>
                  </View>
                  <ProgressBar value={k.persen} />
                </View>
              ))}
            </View>
          )}
        </View>
        <PageFooter namaDirektorat={namaDirektorat} />
      </Page>

      {/* HALAMAN 2+: DETAIL PENGELUARAN */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={[s.headerSub, { color: WHITE, fontSize: 9, fontWeight: 600 }]}>{namaDirektorat} — Detail Pengeluaran</Text>
        </View>
        <View style={s.accentLine} />
        <View style={s.body}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Detail Pengeluaran ({pengeluaranList.length} transaksi)</Text>
            <View style={s.table}>
              <View style={s.thead}>
                <View style={[s.th, { flex: 0.8 }]}><Text>Tanggal</Text></View>
                <View style={[s.th, { flex: 1.5 }]}><Text>Dana</Text></View>
                <View style={[s.th, { flex: 2.2 }]}><Text>Uraian</Text></View>
                <View style={s.th}><Text>Kategori</Text></View>
                <View style={s.thRight}><Text>Jumlah</Text></View>
                <View style={s.thCenter}><Text>Status</Text></View>
              </View>
              {pengeluaranList.map((p, i) => (
                <View key={p.id} style={i % 2 === 0 ? s.row : s.rowAlt} wrap={false}>
                  <View style={[s.td, { flex: 0.8 }]}><Text>{fmtDateShort(p.tanggal)}</Text></View>
                  <View style={[s.td, { flex: 1.5 }]}><Text>{p.nama_dana}</Text></View>
                  <View style={[s.td, { flex: 2.2 }]}>
                    <Text>{p.uraian}</Text>
                    {p.keterangan && <Text style={{ color: MUTED, fontSize: 6.5 }}>{p.keterangan}</Text>}
                  </View>
                  <View style={s.td}><Text>{p.kategori}</Text></View>
                  <View style={s.tdRight}><Text>{formatRp(Number(p.jumlah))}</Text></View>
                  <View style={[s.tdCenter, { alignItems: 'center' }]}>{statusBadge(p.status)}</View>
                </View>
              ))}
              <View style={s.rowTotal}>
                <View style={[s.tdBold, { flex: 6.5 }]}><Text>TOTAL PENGELUARAN</Text></View>
                <View style={s.tdBoldRight}><Text>{formatRp(totalKeluar)}</Text></View>
                <View style={s.td}><Text></Text></View>
              </View>
            </View>
          </View>

          {/* Catatan penutup */}
          <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: '10 12', backgroundColor: LIGHT, marginTop: 8 }}>
            <Text style={{ fontSize: 7.5, color: MUTED, marginBottom: 3 }}>Catatan:</Text>
            <Text style={{ fontSize: 7, color: '#475569' }}>
              Laporan ini dibuat secara otomatis oleh Sistem Informasi Keuangan {namaDirektorat} pada {now()}.
              Data yang ditampilkan merupakan pengeluaran berdasarkan filter yang dipilih.
            </Text>
          </View>
        </View>
        <PageFooter namaDirektorat={namaDirektorat} />
      </Page>
    </Document>
  )
}

// ===================== LAPORAN PER DANA =====================
type PerDanaProps = {
  dana: DanaMasukWithSaldo
  pengeluaranList: Pengeluaran[]
  perKategori: { kategori: string; total: number; persen: number }[]
  totalKeluar: number
  totalPending: number
  sisa: number
  persenTerpakai: number
  namaDirektorat: string
}

export function LaporanDanaPDF({
  dana, pengeluaranList, perKategori,
  totalKeluar, totalPending, sisa, persenTerpakai,
  namaDirektorat
}: PerDanaProps) {
  return (
    <Document>
      {/* COVER */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>{namaDirektorat}</Text>
              <Text style={s.headerSub}>LAPORAN DANA</Text>
            </View>
            <View style={s.headerRight}>
              <View style={s.headerBadge}><Text>PER DANA</Text></View>
            </View>
          </View>
        </View>
        <View style={s.accentLine} />

        <View style={s.body}>
          {/* Info Dana */}
          <View style={[s.section, { borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: '12 14', backgroundColor: LIGHT }]}>
            <Text style={[s.sectionTitle, { borderBottomWidth: 0, paddingBottom: 0, marginBottom: 8 }]}>{dana.nama_dana}</Text>
            <View style={s.infoRow}><Text style={s.infoLabel}>Sumber Dana</Text><Text style={s.infoValue}>{dana.sumber}</Text></View>
            <View style={s.infoRow}><Text style={s.infoLabel}>Tanggal Masuk</Text><Text style={s.infoValue}>{fmtDate(dana.tanggal)}</Text></View>
            {dana.keterangan && <View style={s.infoRow}><Text style={s.infoLabel}>Keterangan</Text><Text style={s.infoValue}>{dana.keterangan}</Text></View>}
            <View style={s.infoRow}><Text style={s.infoLabel}>Dicetak</Text><Text style={s.infoValue}>{now()}</Text></View>
          </View>

          {/* Stats */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Ringkasan Dana</Text>
            <View style={s.statsRow}>
              <View style={s.statBox}>
                <Text style={s.statLabel}>Total Dana</Text>
                <Text style={[s.statValue, { color: BLUE }]}>{formatRp(Number(dana.jumlah))}</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statLabel}>Terpakai</Text>
                <Text style={[s.statValue, { color: '#DC2626' }]}>{formatRp(totalKeluar)}</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statLabel}>Pending</Text>
                <Text style={[s.statValue, { color: '#D97706' }]}>{formatRp(totalPending)}</Text>
              </View>
              <View style={s.statBox}>
                <Text style={s.statLabel}>Sisa Saldo</Text>
                <Text style={[s.statValue, { color: TEAL }]}>{formatRp(sisa)}</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={{ marginTop: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 7.5, color: MUTED }}>Tingkat Penggunaan Dana</Text>
                <Text style={{ fontSize: 7.5, fontWeight: 700, color: NAVY }}>{persenTerpakai.toFixed(1)}%</Text>
              </View>
              <View style={[s.progressTrack, { height: 8 }]}>
                <View style={[s.progressFill, { width: `${Math.min(persenTerpakai, 100)}%`, height: 8,
                  backgroundColor: persenTerpakai > 90 ? '#DC2626' : persenTerpakai > 70 ? '#D97706' : TEAL
                }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
                <Text style={{ fontSize: 6.5, color: MUTED }}>{formatRp(totalKeluar)} terpakai</Text>
                <Text style={{ fontSize: 6.5, color: MUTED }}>{formatRp(sisa)} tersisa</Text>
              </View>
            </View>
          </View>

          {/* Breakdown Kategori */}
          {perKategori.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Breakdown per Kategori</Text>
              {perKategori.map((k, i) => (
                <View key={k.kategori}>
                  <View style={s.catRow}>
                    <Text style={s.catName}>{i + 1}. {k.kategori}</Text>
                    <Text style={s.catValue}>{formatRp(k.total)}</Text>
                    <Text style={s.catPct}>{pct(k.total, totalKeluar)}</Text>
                  </View>
                  <ProgressBar value={(k.total / (totalKeluar || 1)) * 100} />
                </View>
              ))}
            </View>
          )}
        </View>
        <PageFooter namaDirektorat={namaDirektorat} />
      </Page>

      {/* HALAMAN DETAIL PENGELUARAN */}
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={[s.headerSub, { color: WHITE, fontSize: 9, fontWeight: 600 }]}>
            {dana.nama_dana} — Detail Pengeluaran
          </Text>
        </View>
        <View style={s.accentLine} />
        <View style={s.body}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Daftar Pengeluaran ({pengeluaranList.length} transaksi)</Text>
            <View style={s.table}>
              <View style={s.thead}>
                <View style={[s.th, { flex: 0.9 }]}><Text>Tanggal</Text></View>
                <View style={[s.th, { flex: 2.5 }]}><Text>Uraian</Text></View>
                <View style={[s.th, { flex: 1.2 }]}><Text>Kategori</Text></View>
                <View style={s.thRight}><Text>Jumlah</Text></View>
                <View style={s.thCenter}><Text>Status</Text></View>
              </View>
              {pengeluaranList.map((p, i) => (
                <View key={p.id} style={i % 2 === 0 ? s.row : s.rowAlt} wrap={false}>
                  <View style={[s.td, { flex: 0.9 }]}><Text>{fmtDateShort(p.tanggal)}</Text></View>
                  <View style={[s.td, { flex: 2.5 }]}>
                    <Text>{p.uraian}</Text>
                    {p.keterangan && <Text style={{ color: MUTED, fontSize: 6.5 }}>{p.keterangan}</Text>}
                  </View>
                  <View style={[s.td, { flex: 1.2 }]}><Text>{p.kategori}</Text></View>
                  <View style={s.tdRight}><Text>{formatRp(Number(p.jumlah))}</Text></View>
                  <View style={[s.tdCenter, { alignItems: 'center' }]}>{statusBadge(p.status)}</View>
                </View>
              ))}
              <View style={s.rowTotal}>
                <View style={[s.tdBold, { flex: 5.6 }]}><Text>TOTAL PENGELUARAN</Text></View>
                <View style={s.tdBoldRight}><Text>{formatRp(totalKeluar)}</Text></View>
                <View style={s.td}><Text></Text></View>
              </View>
            </View>
          </View>

          {/* Catatan penutup */}
          <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 4, padding: '10 12', backgroundColor: LIGHT, marginTop: 8 }}>
            <Text style={{ fontSize: 7, color: '#475569' }}>
              Laporan ini dibuat secara otomatis oleh Sistem Informasi Keuangan {namaDirektorat} pada {now()}.
              Laporan mencakup seluruh pengeluaran dari dana "{dana.nama_dana}".
            </Text>
          </View>
        </View>
        <PageFooter namaDirektorat={namaDirektorat} />
      </Page>
    </Document>
  )
}
