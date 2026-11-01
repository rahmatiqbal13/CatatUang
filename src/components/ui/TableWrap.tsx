import type { ReactNode } from 'react'

/**
 * Mandatory table wrapper: horizontal scroll + a min-width wide enough for the
 * content, so no column is ever clipped. min-widths per screen are in the
 * design_handoff_catatuang_ui/README.md.
 */
export function TableWrap({ minWidth, children }: { minWidth: number; children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth }}>{children}</div>
    </div>
  )
}

export function Th({ align = 'left', width, children }: { align?: 'left' | 'right'; width?: number | string; children?: ReactNode }) {
  return (
    <th
      className="cu-mono px-2 py-[10px] text-[10.5px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)] whitespace-nowrap first:pl-6 last:pr-6"
      style={{ textAlign: align, borderBottom: '1px solid var(--divider)', width }}
    >
      {children}
    </th>
  )
}

export function Td({ align = 'left', children }: { align?: 'left' | 'right'; children?: ReactNode }) {
  return (
    <td
      className="px-2 py-[13px] align-middle text-[13.5px] first:pl-6 last:pr-6"
      style={{ textAlign: align, borderBottom: '1px solid var(--border-hairline)' }}
    >
      {children}
    </td>
  )
}
