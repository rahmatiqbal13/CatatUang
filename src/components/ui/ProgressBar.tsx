import { pct } from '@/lib/tokens'

/** Realisation bar: flat track, flat fill, no radius. */
export function ProgressBar({
  used,
  total,
  color,
  height = 9,
}: { used: number; total: number; color: string; height?: number }) {
  const p = pct(used, total)
  return (
    <div
      role="progressbar"
      aria-valuenow={p}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ height, background: 'var(--surface-2)', width: '100%' }}
    >
      <div style={{ height: '100%', width: `${p}%`, background: color }} />
    </div>
  )
}
