import type { ReactNode } from 'react'

/**
 * Sticky page header. `bookSwitcher` receives <BukuSwitcher/> for book-scoped
 * routes, `action` the red primary button for the route (see the handoff
 * README's per-route title/subtitle/action table).
 */
export function Topbar({
  title,
  subtitle,
  bookSwitcher,
  action,
}: {
  title: string
  subtitle?: string
  bookSwitcher?: ReactNode
  action?: ReactNode
}) {
  return (
    <header className="cu-topbar">
      <div className="min-w-0 flex-1">
        <h1 className="text-[24px] font-extrabold leading-[1.1] tracking-[-0.025em]" style={{ color: 'var(--text)' }}>{title}</h1>
        {subtitle && (
          <p className="mt-[2px] text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {bookSwitcher}
        {action}
      </div>
    </header>
  )
}

/** Flush-left, zero-radius buttons. Labels never center, even when the button is wide. */
export function BarButton({
  variant = 'outline',
  className,
  children,
  ...rest
}: { variant?: 'outline' | 'primary' | 'ink' | 'green' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const skin = {
    outline: { background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--divider)' },
    primary: { background: 'var(--accent)', color: '#f3f2f2', border: '1px solid var(--accent)' },
    ink: { background: '#201e1d', color: '#f3f2f2', border: '1px solid #201e1d' },
    green: { background: '#0e8a5f', color: '#ffffff', border: '1px solid #0e8a5f' },
  }[variant]

  return (
    <button
      {...rest}
      className={`px-3 py-2 text-[13px] font-bold whitespace-nowrap text-left transition-colors ${className ?? ''}`}
      style={skin}
    >
      {children}
    </button>
  )
}
