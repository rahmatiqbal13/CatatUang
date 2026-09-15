/** Design tokens shared by every CatatUang screen. */

export const palette = {
  blue: "#2563d9",
  red: "#ec3013",
  green: "#0e8a5f",
  purple: "#6d3fd4",
  amber: "#c07a00",
  teal: "#0f7d92",
  ink: "#201e1d",
} as const;

export type SumberDana = "APBN" | "PNBP" | "Hibah" | "Kerja Sama";

/** Fund-source colour — drives card top borders, dots and progress fills. */
export const sumberColor: Record<SumberDana, string> = {
  APBN: palette.blue,
  PNBP: palette.purple,
  Hibah: palette.green,
  "Kerja Sama": palette.teal,
};

/** Expense-category colour — drives badges and bars. */
export const kategoriColor: Record<string, string> = {
  "Belanja Barang": palette.blue,
  "Perjalanan Dinas": palette.red,
  Pemeliharaan: palette.green,
  Honorarium: palette.purple,
  Konsumsi: palette.amber,
};

export const categoryColor = (name: string) => kategoriColor[name] ?? palette.ink;

export type StatusKind = "wait" | "ok" | "no";

export const statusStyle: Record<StatusKind, { bg: string; fg: string }> = {
  wait: { bg: "#f6efe1", fg: "#8a5600" },
  ok: { bg: "#e2f2ea", fg: "#0b6b49" },
  no: { bg: "#ffe0d9", fg: "#ae1800" },
};

/** Map the repo's Indonesian status strings onto the three visual kinds. */
export const statusKind = (s: string): StatusKind => {
  const v = s.toLowerCase();
  if (["disetujui", "lunas", "aktif", "dibayar", "selesai"].includes(v)) return "ok";
  if (["ditolak", "dibatalkan"].includes(v)) return "no";
  return "wait";
};

const rp = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 1850000000 → "1.850.000.000" (prefix "Rp" separately, at 13px/600). */
export const formatRp = (n: number) => rp.format(Math.round(n));

/** 1850000000 → { value: "1,85", unit: "M" } for the 32px KPI numerals. */
export const formatCompact = (n: number): { value: string; unit: string } => {
  const one = (x: number) => x.toFixed(2).replace(".", ",").replace(/,00$/, "");
  if (Math.abs(n) >= 1e9) return { value: one(n / 1e9), unit: "M" };
  if (Math.abs(n) >= 1e6) return { value: one(n / 1e6), unit: "jt" };
  if (Math.abs(n) >= 1e3) return { value: one(n / 1e3), unit: "rb" };
  return { value: rp.format(n), unit: "" };
};

export const pct = (part: number, whole: number) =>
  whole <= 0 ? 0 : Math.min(100, Math.round((part / whole) * 1000) / 10);

/** Grid that never crushes its cells. Use instead of grid-cols-N. */
export const autoGrid = (min: number, gap = 16) => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
  gap,
});
