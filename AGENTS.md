<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Quick Guide

Purpose: short, actionable instructions for AI coding agents working in this repository.

## Quick commands
- **Dev:** `npm run dev` (runs `next dev`)
- **Build:** `npm run build` (runs `next build`)
- **Start:** `npm run start` (runs `next start`)
- **Lint:** `npm run lint` (runs `eslint`)

## Key files & locations
- **Next.js app root:** `src/app` — app router entry points and route groups.
- **Layouts:** `src/app/layout.tsx`, `src/app/(dashboard)/layout.tsx`.
- **Pages/examples:** `src/app/(dashboard)/dana/page.tsx`, `src/app/login/page.tsx`.
- **UI components:** `src/components/*` and `src/components/ui` (shadcn-based primitives).
- **Supabase helpers:** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`.
- **Migrations/schema:** `supabase/*.sql` and `supabase-schema.sql`.

## Conventions
- TypeScript + Next.js (app router) and Tailwind CSS.
- Prefer server components by default; mark components with `'use client'` only when needed.
- Follow existing component and layout patterns under `src/components` and `src/app`.
- Keep changes minimal and focused; preserve style and existing APIs.

## Supabase & secrets
- This project uses Supabase. Do not commit secrets or environment variables.
- Database schema and migration SQL live in `supabase/` and `supabase-schema.sql`.

## Agent behavior guidelines
- Link to repository files rather than copying large docs.
- If a change may affect deployments or DB, call it out and ask before applying.
- Avoid broad refactors without an explicit request. Prefer small, testable changes.
- When running `npm run dev`, ensure environment variables are available — failures can be caused by missing Supabase keys.

## References
- See [README.md](README.md) for project overview.

