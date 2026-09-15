import { statusKind, statusLabel, statusStyle } from '@/lib/tokens'

/** Tinted status pill (square corners). Pass the repo's raw status string. */
export function StatusBadge({ status }: { status: string }) {
  const { bg, fg } = statusStyle[statusKind(status)]
  return (
    <span
      className="inline-block px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap"
      style={{ background: bg, color: fg }}
    >
      {statusLabel(status)}
    </span>
  )
}

/** Solid badge for categories / fund sources / roles — white label on the data colour. */
export function SolidBadge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-block px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.1em] whitespace-nowrap"
      style={{ background: color, color: '#ffffff' }}
    >
      {children}
    </span>
  )
}
