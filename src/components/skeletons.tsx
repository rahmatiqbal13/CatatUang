/**
 * Skeleton components untuk loading states
 * Mengurangi layout shift dan meningkatkan UX
 *
 * Flat/zero-radius shimmer blocks matching the Modernist chrome — plain
 * `<Bar>` divs on `var(--surface-2)` inside `.card-shell` containers, no
 * shadcn Card/Skeleton, no rounded/shadow/ring classes.
 */

function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse ${className || ''}`} style={{ background: 'var(--surface-2)' }} />
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={`card-shell p-5 space-y-3 ${className || ''}`}>
      <Bar className="h-3 w-20" />
      <Bar className="h-6 w-32" />
    </div>
  )
}

export function SkeletonStatCard() {
  return (
    <div className="card-shell p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Bar className="h-3 w-24" />
          <Bar className="h-7 w-32" />
        </div>
        <Bar className="h-9 w-9" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Bar key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Bar
              key={`cell-${rowIndex}-${colIndex}`}
              className={`h-4 ${colIndex === 0 ? 'flex-1' : 'w-24'}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonDanaCard() {
  return (
    <div className="card-shell">
      <div className="p-4 pb-2" style={{ borderBottom: '2px solid var(--divider)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Bar className="h-5 w-full max-w-[200px]" />
            <div className="flex gap-2">
              <Bar className="h-4 w-16" />
              <Bar className="h-4 w-24" />
            </div>
          </div>
          <div className="flex gap-1">
            <Bar className="h-7 w-7" />
            <Bar className="h-7 w-7" />
          </div>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Bar className="h-3 w-16" />
            <Bar className="h-5 w-24" />
          </div>
          <div className="space-y-1">
            <Bar className="h-3 w-16" />
            <Bar className="h-5 w-24" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Bar className="h-3 w-20" />
            <Bar className="h-3 w-12" />
          </div>
          <Bar className="h-1.5 w-full" />
        </div>
        <Bar className="h-8 w-full" />
      </div>
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Bar className="h-8 w-48" />
        <Bar className="h-4 w-64" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Ringkasan Card */}
      <div className="card-shell">
        <div className="p-4 pb-3" style={{ borderBottom: '2px solid var(--divider)' }}>
          <Bar className="h-5 w-32" />
        </div>
        <div className="p-0">
          <SkeletonTable rows={3} columns={5} />
        </div>
      </div>
    </div>
  )
}

export function SkeletonDanaList() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Bar className="h-8 w-32" />
          <Bar className="h-4 w-24" />
        </div>
        <Bar className="h-9 w-32" />
      </div>

      {/* Search */}
      <Bar className="h-10 w-full" />

      {/* Dana Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <SkeletonDanaCard />
        <SkeletonDanaCard />
        <SkeletonDanaCard />
      </div>
    </div>
  )
}

export function SkeletonPengeluaran() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Bar className="h-8 w-32" />
        <Bar className="h-4 w-36" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Bar className="h-10 flex-1 min-w-52" />
        <Bar className="h-10 w-36" />
        <Bar className="h-10 w-48" />
      </div>

      {/* Table */}
      <div className="card-shell">
        <div className="p-4 pb-3" style={{ borderBottom: '2px solid var(--divider)' }}>
          <Bar className="h-5 w-24" />
        </div>
        <div className="px-6 py-4">
          <SkeletonTable rows={8} columns={7} />
        </div>
      </div>
    </div>
  )
}

export function SkeletonLaporan() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Bar className="h-8 w-48" />
          <Bar className="h-4 w-32" />
        </div>
        <Bar className="h-9 w-32" />
      </div>

      {/* Filter Card */}
      <div className="card-shell p-4">
        <div className="flex flex-wrap gap-3">
          <Bar className="h-10 w-52" />
          <Bar className="h-10 w-36" />
          <Bar className="h-10 w-36" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Tables */}
      <div className="card-shell">
        <div className="p-4 pb-3" style={{ borderBottom: '2px solid var(--divider)' }}>
          <Bar className="h-5 w-32" />
        </div>
        <div className="px-6 py-4">
          <SkeletonTable rows={5} columns={6} />
        </div>
      </div>
    </div>
  )
}

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Bar className="h-4 w-24" />
          <Bar className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-3 pt-2">
        <Bar className="h-10 w-20" />
        <Bar className="h-10 w-24" />
      </div>
    </div>
  )
}
