# Drop-in code — CatatUang redesign

Real TypeScript/React files matching the repo's stack (Next.js App Router, Tailwind v4, TS).
These are **scaffolds wired to the design tokens**, not a full port: they carry the exact
colors, sizes and structure from the prototype so you don't re-derive them by eye.

## Order of installation

1. `globals.css` → replace the token block + base layer in `src/app/globals.css`.
2. `layout.font.tsx` → apply the Archivo font change in `src/app/layout.tsx`.
3. `lib/tokens.ts` → new file `src/lib/tokens.ts` (data palette + status maps, used by every screen).
4. `components/layout/*` → replace `src/components/layout/Sidebar.tsx`, add `Topbar`, `MobileTabBar`.
5. `components/ui/*` → add as shared presentational primitives (they sit *beside* shadcn/ui, they don't replace it).
6. `components/dashboard/*` → the Dashboard body; use these as the pattern for the other screens.

## Conventions used

- Zero radius everywhere. Never add `rounded-*`.
- No shadows. Structure comes from `border-2 border-[var(--divider)]` on cards and
  `border-b border-[var(--border-hairline)]` between rows.
- Every numeric cell / badge / date / button gets `whitespace-nowrap`.
- Every table is wrapped in `<TableWrap minWidth={…}>`.
- Multi-column grids are always `repeat(auto-fit, minmax(X,1fr))` — never fixed `grid-cols-N`.
- Money is formatted through `formatRp` / `formatCompact` in `lib/tokens.ts`, not inline.
