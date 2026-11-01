import type { ReactNode } from 'react'
import { formatCompact } from '@/lib/tokens'

/**
 * KPI block: mono caps label, serif figure tinted by `bg` (the data colour), optional delta line.
 * `fg` is accepted for older call sites and ignored — every card sits on paper now.
 */
export function StatCard({
  label,
  amount,
  delta,
  bg,
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
    <div className="card-shell flex flex-col gap-[6px] px-5 py-[18px]">
      <div className="flex items-start justify-between gap-2">
        <span className="label-caps" style={{ color: 'var(--text-muted)' }}>{label}</span>
        {icon && <span style={{ color: bg, opacity: 0.8 }} aria-hidden>{icon}</span>}
      </div>
      <p className="serif flex items-baseline gap-[6px] whitespace-nowrap" style={{ color: bg }}>
        <span className="text-[18px]" style={{ color: 'var(--text-muted)' }}>Rp</span>
        <span className="text-[30px] leading-none tracking-[-0.02em]">{value}</span>
        {unit && <span className="text-[18px]">{unit}</span>}
      </p>
      {delta && <p className="text-[12px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{delta}</p>}
    </div>
  )
}
