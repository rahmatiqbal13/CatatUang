"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  LayoutDashboard, Landmark, Receipt, HandCoins, FileText,
  ScrollText, Calculator, BarChart3, Database, Users, Settings, Wallet,
} from "lucide-react";

type Item = { href: string; label: string; Icon: typeof Wallet; superAdminOnly?: boolean };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Dash", Icon: LayoutDashboard },
  { href: "/dana", label: "Dana", Icon: Landmark },
  { href: "/pengeluaran", label: "Keluar", Icon: Receipt },
  { href: "/peminjaman", label: "Pinjam", Icon: HandCoins },
  { href: "/invoice", label: "Invoice", Icon: FileText },
  { href: "/kwitansi", label: "Kwitansi", Icon: ScrollText },
  { href: "/rab", label: "RAB", Icon: Calculator },
  { href: "/laporan", label: "Laporan", Icon: BarChart3 },
  { href: "/master-data", label: "Master", Icon: Database },
  { href: "/pengguna", label: "User", Icon: Users, superAdminOnly: true },
  { href: "/pengaturan", label: "Setting", Icon: Settings },
];

/** Paths that carry the active book in ?buku= — keep in step with the repo constant. */
const BOOK_SCOPED = ["/dashboard", "/dana", "/pengeluaran", "/peminjaman", "/invoice", "/kwitansi", "/rab", "/laporan"];

export function Sidebar({ role }: { role?: string }) {
  const pathname = usePathname();
  const buku = useSearchParams().get("buku");

  const hrefFor = (href: string) =>
    buku && BOOK_SCOPED.includes(href) ? `${href}?buku=${buku}` : href;

  // /dana/[id] keeps "Dana" lit
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      aria-label="Navigasi utama"
      className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col items-center overflow-y-auto bg-[var(--surface)] px-0 py-3 md:flex"
      style={{ borderRight: "2px solid var(--divider)" }}
    >
      <Link href={hrefFor("/dashboard")} aria-label="CatatUang" className="mb-[10px]">
        <span className="flex h-10 w-10 items-center justify-center bg-[var(--accent)]">
          <Wallet size={20} strokeWidth={2} color="#ffffff" />
        </span>
      </Link>

      <ul className="flex w-full flex-col items-center gap-[2px]">
        {ITEMS.filter((i) => !i.superAdminOnly || role === "super_admin").map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={hrefFor(href)}
                aria-current={active ? "page" : undefined}
                className="flex w-14 flex-col items-center gap-1 pt-2 pb-[6px] text-center transition-colors"
                style={{
                  background: active ? "#201e1d" : "transparent",
                  color: active ? "#f3f2f2" : "var(--text-muted)",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--surface-2)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <Icon size={19} strokeWidth={1.75} />
                <span className="text-[8.5px] font-bold uppercase tracking-[0.04em] whitespace-nowrap">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
