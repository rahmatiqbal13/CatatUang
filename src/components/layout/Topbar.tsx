import type { ReactNode } from 'react'

/**
 * Page header: mono kicker, large serif title, subtitle, and the route's
 * actions on the right. `back` renders above the kicker (e.g. "← Semua dompet").
 */
export function Topbar({
  title,
  subtitle,
  crumb,
  back,
  action,
}: {
  title: string
  subtitle?: string
  crumb?: string
  back?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="cu-topbar">
      <div className="min-w-0 flex-[1_1_320px]">
        {back && <div className="mb-[10px]">{back}</div>}
        {crumb && <div className="label-caps text-[11px]" style={{ color: 'var(--text-muted)' }}>{crumb}</div>}
        <h1
          className="mt-2 text-[34px] leading-[1.08] tracking-[-0.02em] md:text-[46px] md:leading-[1.05] md:tracking-[-0.025em]"
          style={{ color: 'var(--text)', textWrap: 'pretty' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[13.5px] md:text-[14.5px]" style={{ color: 'var(--text-2)' }}>{subtitle}</p>
        )}
      </div>
      {action && <div className="flex flex-wrap items-center gap-[10px]">{action}</div>}
    </header>
  )
}

/** Pill buttons. `primary`/`green` is the filled green action, `outline` an ink-outlined pill, `ink` the soft green. */
export function BarButton({
  variant = 'outline',
  className,
  children,
  ...rest
}: { variant?: 'outline' | 'primary' | 'ink' | 'green' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const skin = {
    outline: 'border-[var(--text)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)]',
    primary: 'border-[var(--accent)] bg-[var(--accent)] text-[var(--background)] hover:bg-[var(--accent-hover)]',
    green: 'border-[var(--accent)] bg-[var(--accent)] text-[var(--background)] hover:bg-[var(--accent-hover)]',
    ink: 'border-transparent bg-[var(--accent-100)] text-[var(--accent-fg)] hover:bg-[var(--accent-200)]',
  }[variant]

  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-2 rounded-full border px-[18px] py-[10px] text-[14px] font-semibold whitespace-nowrap transition-colors disabled:pointer-events-none ${skin} ${className ?? ''}`}
    >
      {children}
    </button>
  )
}
