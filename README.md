# pi-dash

Local-first analytics dashboard for Pi coding sessions, built in a Next.js monorepo with shared shadcn/ui components.

## What we have achieved so far

### ✅ Monorepo setup
- `apps/dashboard`: primary analytics dashboard app
- `apps/web`: landing/scratch app
- `packages/ui`: shared shadcn/ui component library

### ✅ Pi + Claude ingestion pipeline (dashboard app)
Implemented in `apps/dashboard/lib/pi-ingestion/`:
- Session discovery from local logs:
  - Pi: `~/.pi/agent/sessions`
  - Claude Code: `~/.claude/projects` (and Claude desktop local-agent session directories)
- JSONL parsing into domain objects:
  - Project
  - Session
  - Turn
  - LLM Invocation
  - Tool Call
  - Observed Usage (`input`, `output`, `cacheRead`, `cacheWrite`, `totalTokens`, `cost.*`)
- Tool normalization and bash command extraction
- Session deduplication by `provider + session.id`
- Conflict detection with file hash comparison (conflicted duplicates are excluded)
- 7-day default time window ingestion across both providers

### ✅ Dashboard UI (shadcn/ui from `packages/ui`)
Built in `apps/dashboard/app/page.tsx` using shared components:
- KPI cards (cost, tokens, turns, cache rate, conflicts)
- Provider visibility in recent sessions
- Projects table
- Top tools panel
- Recent sessions table
- Empty state and conflict state panels

### ✅ Charts added
Built with `@workspace/ui/components/chart` + Recharts:
- Daily spend area chart
- Project spend horizontal bar chart
- Improved high-contrast chart colors for light/dark themes

Chart code is in:
- `apps/dashboard/components/dashboard-charts.tsx`

## Run the dashboard

```bash
pnpm install
pnpm --filter dashboard dev
```

Then open the local Next.js URL shown in terminal.

## Workspace scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
```

## Using shared UI components

Add components to the shared UI package:

```bash
pnpm dlx shadcn@latest add button -c packages/ui
```

Use in apps:

```tsx
import { Button } from "@workspace/ui/components/button"
```
