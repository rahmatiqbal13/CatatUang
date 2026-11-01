import { pct } from '@/lib/tokens'

/** Realisation bar: rounded paper track, coloured fill. */
export function ProgressBar({
  used,
  total,
  color,
  height = 8,
}: { used: number; total: number; color: string; height?: number }) {
  const p = pct(used, total)
  return (
    <div
      role="progressbar"
      aria-valuenow={p}
      aria-valuemin={0}
      aria-valuemax={100}
      className="overflow-hidden rounded-full"
      style={{ height, background: 'var(--surface-2)', width: '100%' }}
    >
      <div className="rounded-full" style={{ height: '100%', width: `${p}%`, background: color }} />
    </div>
  )
}
