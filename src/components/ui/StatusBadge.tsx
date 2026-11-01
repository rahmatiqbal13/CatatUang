import { stampColor, statusKind, statusLabel } from '@/lib/tokens'

/** Rubber-stamp status label: outlined mono caps, slightly rotated. Pass the repo's raw status string. */
export function StatusBadge({ status }: { status: string }) {
  const color = stampColor[statusKind(status)]
  return (
    <span
      className="cu-mono inline-block rounded-[4px] px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.12em] whitespace-nowrap"
      style={{ border: `1.5px solid ${color}`, color, transform: 'rotate(-2deg)' }}
    >
      {statusLabel(status)}
    </span>
  )
}

/** Outlined pill for categories / fund sources / roles, in the data colour. */
export function SolidBadge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="cu-mono inline-block rounded-full px-[9px] py-[2px] text-[11px] font-semibold whitespace-nowrap"
      style={{ border: `1.5px solid ${color}`, color }}
    >
      {children}
    </span>
  )
}
