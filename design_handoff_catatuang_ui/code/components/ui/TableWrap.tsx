import type { ReactNode } from "react";

/**
 * Mandatory table wrapper: horizontal scroll + a min-width wide enough for the
 * content, so no column is ever clipped. min-widths per screen are in the README.
 */
export function TableWrap({ minWidth, children }: { minWidth: number; children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

export function Th({ align = "left", children }: { align?: "left" | "right"; children?: ReactNode }) {
  return (
    <th
      className="px-2 py-[9px] text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] whitespace-nowrap first:pl-4 last:pr-4"
      style={{ textAlign: align, borderBottom: "2px solid var(--divider)" }}
    >
      {children}
    </th>
  );
}

export function Td({ align = "left", children }: { align?: "left" | "right"; children?: ReactNode }) {
  return (
    <td
      className="px-2 py-[11px] align-middle text-[13px] first:pl-4 last:pr-4"
      style={{ textAlign: align, borderBottom: "1px solid var(--border-hairline)" }}
    >
      {children}
    </td>
  );
}
