# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## TrendSniper — Application Details

Dark-mode trend intelligence dashboard. Data ingestion supports two sources selectable from the UI:

### Data Sources
- **Apify** (`APIFY_API_TOKEN`): 5-platform coverage — TikTok, Instagram, Facebook (social) + Amazon bestsellers, Shopify stores (e-commerce)
- **Bright Data** (`BRIGHT_DATA_API_TOKEN`): Dataset API — TikTok hashtag posts, Instagram hashtag posts, Amazon product search (3 platforms, residential proxy network)
- **Both**: Runs Apify + Bright Data in parallel and merges all results

### Key Files
- `artifacts/api-server/src/lib/apifyService.ts` — Apify actor fetchers (5 platforms)
- `artifacts/api-server/src/lib/brightDataService.ts` — Bright Data Dataset API fetchers (TikTok, Instagram, Amazon)
- `artifacts/api-server/src/lib/ingestionEngine.ts` — orchestrates all sources, product signal extraction, DB writes
- `artifacts/api-server/src/routes/ingestion.ts` — `/api/ingestion/run` (POST with `{ source: "apify"|"brightdata"|"both" }`) + `/api/ingestion/status`
- `artifacts/trend-sniper/src/pages/sync.tsx` — Data Sync UI with source selector
- `lib/db/src/schema/products.ts` — includes `price` and `rating` columns

### Codegen (CRITICAL)
`lib/api-spec/package.json` codegen script patches `lib/api-zod/src/index.ts` after orval runs to fix bad barrel export. Do not change this.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
