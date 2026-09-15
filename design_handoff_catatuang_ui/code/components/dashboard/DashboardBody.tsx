import { Landmark, Receipt, Wallet, Clock } from "lucide-react";
import { autoGrid, palette } from "@/lib/tokens";
import { StatCard } from "@/components/ui/StatCard";
import { AlokasiList, type DanaRow } from "./AlokasiList";
import { ApprovalQueue, type PendingItem } from "./ApprovalQueue";
import { KategoriBars, type KategoriRow } from "./KategoriBars";

/** Composition reference for /dashboard. Data still comes from the server page. */
export function DashboardBody({
  totals,
  dana,
  pending,
  kategori,
  hrefDana,
  onApprove,
  onReject,
}: {
  totals: { masuk: number; realisasi: number; sisa: number; menunggu: number; deltaMasuk: string };
  dana: DanaRow[];
  pending: PendingItem[];
  kategori: KategoriRow[];
  hrefDana: string;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const realisasiPct = totals.masuk ? ((totals.realisasi / totals.masuk) * 100).toFixed(1).replace(".", ",") : "0";
  const sisaPct = totals.masuk ? ((totals.sisa / totals.masuk) * 100).toFixed(1).replace(".", ",") : "0";

  return (
    <div className="flex flex-col gap-5 px-6 pt-5 pb-8">
      <div style={autoGrid(220)}>
        <StatCard label="Total Dana Masuk" amount={totals.masuk} bg={palette.blue} delta={totals.deltaMasuk} icon={<Landmark size={17} />} />
        <StatCard label="Realisasi" amount={totals.realisasi} bg={palette.red} delta={`${realisasiPct}% dari alokasi`} icon={<Receipt size={17} />} />
        <StatCard label="Sisa Saldo" amount={totals.sisa} bg={palette.green} delta={`${sisaPct}% tersedia`} icon={<Wallet size={17} />} />
        <StatCard label="Menunggu Approval" amount={totals.menunggu} bg={palette.ink} fg="#f3f2f2" delta={`${pending.length} transaksi perlu ditinjau`} icon={<Clock size={17} />} />
      </div>

      <div style={{ ...autoGrid(300), alignItems: "start" }}>
        <AlokasiList rows={dana} hrefAll={hrefDana} />
        <div className="flex flex-col gap-4">
          <ApprovalQueue items={pending} onApprove={onApprove} onReject={onReject} />
          <KategoriBars rows={kategori} />
        </div>
      </div>
    </div>
  );
}
