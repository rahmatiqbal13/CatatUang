import type { ReactNode } from 'react'
import { formatCompact } from '@/lib/tokens'

/**
 * Dashboard-style KPI block: full colour field, label row, big numeral, delta row.
 * See design_handoff_catatuang_ui/README.md's KPI table for bg/fg per card.
 */
export function StatCard({
  label,
  amount,
  delta,
  bg,
  fg = '#ffffff',
  icon,
}: {
  label: string
  amount: number
  delta?: string
  bg: string
  fg?: string
  icon?: ReactNode
}) {
  const { value, unit } = formatCompact(amount)
  return (
    <div className="flex flex-col gap-3 p-[18px]" style={{ background: bg, color: fg }}>
      <div className="flex items-start justify-between gap-2">
        <span className="label-caps" style={{ opacity: 0.85 }}>{label}</span>
        {icon && <span style={{ opacity: 0.8 }} aria-hidden>{icon}</span>}
      </div>
      <p className="flex items-baseline gap-[5px] whitespace-nowrap">
        <span className="text-[13px] font-semibold">Rp</span>
        <span className="text-[32px] font-extrabold leading-none tracking-[-0.035em]">{value}</span>
        {unit && <span className="text-[15px] font-bold">{unit}</span>}
      </p>
      {delta && <p className="text-[12px] whitespace-nowrap" style={{ opacity: 0.9 }}>{delta}</p>}
    </div>
  )
}
