import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { terbilang } from '@/lib/formatters'
import type { Peminjaman } from '@/lib/types'

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1E293B', backgroundColor: '#FFFFFF', padding: '36 56', lineHeight: 1.4 },

  headerTitle: { fontSize: 12, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase' },
  headerSpacer: { height: 16 },

  paragraph: { marginBottom: 6, textAlign: 'justify' },

  sectionTitle: { fontSize: 10, fontWeight: 700, marginTop: 8, marginBottom: 3 },

  infoRow: { flexDirection: 'row', marginBottom: 2 },
  infoLabel: { width: 90 },
  infoColon: { width: 10 },
  infoValue: { flex: 1 },

  pasalTitle: { fontSize: 10, fontWeight: 700, marginTop: 9, marginBottom: 3 },

  amountBlock: { marginTop: 3, marginBottom: 6 },
  amountRow: { flexDirection: 'row' },
  amountLabel: { width: 60 },
  amountValue: { fontWeight: 700 },

  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  signatureCol: { width: '45%' },
  signatureLabel: { marginBottom: 36 },
  signatureName: { fontWeight: 700, textDecoration: 'underline' },
  signatureBlank: { color: '#94A3B8' },
})

function fullDate(d: string) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d))
}

type Props = {
  peminjaman: Peminjaman
  pihakPertamaNama: string
  pihakPertamaJabatan: string
  pihakPertamaInstansi: string
}

export function PeminjamanPDF({ peminjaman, pihakPertamaNama, pihakPertamaJabatan, pihakPertamaInstansi }: Props) {
  const tahun = new Date(peminjaman.tanggal).getFullYear()
  const tanggalLengkap = fullDate(peminjaman.tanggal)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <Text style={s.headerTitle}>Surat Perjanjian Pinjaman Uang</Text>
        <Text style={s.headerTitle}>Koperasi Kantin</Text>
        <Text style={s.headerTitle}>Kolam Renang</Text>
        <Text style={s.headerTitle}>Tahun {tahun}</Text>
        <View style={s.headerSpacer} />

        <Text style={s.paragraph}>
          Pada hari ini, {tanggalLengkap} bertempat di Surabaya, kami yang bertanda tangan di bawah ini:
        </Text>

        <Text style={s.sectionTitle}>1. PIHAK PEMBERI (PIHAK PERTAMA)</Text>
        <View style={s.infoRow}><Text style={s.infoLabel}>Nama</Text><Text style={s.infoColon}>:</Text><Text style={s.infoValue}>{pihakPertamaNama}</Text></View>
        <View style={s.infoRow}><Text style={s.infoLabel}>Jabatan</Text><Text style={s.infoColon}>:</Text><Text style={s.infoValue}>{pihakPertamaJabatan}</Text></View>
        <View style={s.infoRow}><Text style={s.infoLabel}>Instansi</Text><Text style={s.infoColon}>:</Text><Text style={s.infoValue}>{pihakPertamaInstansi}</Text></View>
        <Text style={[s.paragraph, { marginTop: 6 }]}>
          Dalam hal ini bertindak untuk dan atas nama Koperasi Kantin Kolam Renang UNESA, yang selanjutnya dalam perjanjian ini disebut sebagai <Text style={{ fontWeight: 700 }}>PIHAK PERTAMA.</Text>
        </Text>

        <Text style={s.sectionTitle}>2. PIHAK PEMINJAM (PIHAK KEDUA)</Text>
        <View style={s.infoRow}><Text style={s.infoLabel}>Nama</Text><Text style={s.infoColon}>:</Text><Text style={s.infoValue}>{peminjaman.nama_peminjam}</Text></View>
        <View style={s.infoRow}><Text style={s.infoLabel}>Jabatan</Text><Text style={s.infoColon}>:</Text><Text style={s.infoValue}>{peminjaman.jabatan || '-'}</Text></View>
        <View style={s.infoRow}><Text style={s.infoLabel}>Unit Kerja</Text><Text style={s.infoColon}>:</Text><Text style={s.infoValue}>{peminjaman.unit_kerja || '-'}</Text></View>
        <Text style={[s.paragraph, { marginTop: 6 }]}>
          Dalam hal ini bertindak untuk dan atas nama diri sendiri, yang selanjutnya dalam perjanjian ini disebut sebagai <Text style={{ fontWeight: 700 }}>PIHAK KEDUA.</Text>
        </Text>

        <Text style={s.paragraph}>
          Kedua belah pihak dengan ini sepakat untuk mengadakan perjanjian pinjaman uang dengan ketentuan sebagai berikut:
        </Text>

        <Text style={s.pasalTitle}>Pasal 1: Penyerahan Dana</Text>
        <Text style={s.paragraph}>
          PIHAK PERTAMA telah menyerahkan dana pinjaman Koperasi Kolam Renang kepada PIHAK KEDUA secara tunai / transfer sejumlah:
        </Text>
        <View style={s.amountBlock}>
          <View style={s.amountRow}><Text style={s.amountLabel}>Rp</Text><Text style={s.amountValue}>{new Intl.NumberFormat('id-ID').format(peminjaman.jumlah)}</Text></View>
          <View style={s.amountRow}><Text style={s.amountLabel}>Terbilang</Text><Text>: {terbilang(peminjaman.jumlah)} Rupiah</Text></View>
        </View>

        <Text style={s.pasalTitle}>Pasal 2: Sistem Pengembalian (Cicilan)</Text>
        <Text style={s.paragraph}>
          PIHAK KEDUA menyatakan telah menerima dana tersebut pada {tanggalLengkap} dan bersedia mengembalikannya secara bertahap kepada PIHAK PERTAMA.
        </Text>

        <Text style={s.pasalTitle}>Pasal 3: Pertanggungjawaban</Text>
        <Text style={s.paragraph}>
          Segala bentuk penggunaan dan pengembalian dana pinjaman ini akan dipertanggungjawabkan sesuai dengan ketentuan yang berlaku di lingkungan Koperasi Kantin Kolam Renang UNESA.
        </Text>

        <Text style={s.paragraph}>
          Demikian surat perjanjian sekaligus bukti penerimaan ini dibuat secara sadar, tanpa paksaan dari pihak manapun, agar dapat dipergunakan sebagaimana mestinya.
        </Text>

        <Text style={{ marginTop: 10 }}>Surabaya, {tanggalLengkap}</Text>

        <View style={s.signatureRow}>
          <View style={s.signatureCol}>
            <Text style={s.signatureLabel}>Pemberi</Text>
            <Text style={s.signatureName}>{pihakPertamaNama}</Text>
          </View>
          <View style={s.signatureCol}>
            <Text style={s.signatureLabel}>Penerima</Text>
            <Text style={s.signatureName}>{peminjaman.nama_peminjam}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
