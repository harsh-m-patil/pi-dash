# pi-dash

Local-first analytics dashboard for Pi coding sessions.

## Workspace

- `apps/dashboard` — analytics dashboard
- `apps/web` — landing/scratch app
- `packages/ui` — shared UI components

## Features

- Ingests local Pi and Claude session logs
- Normalizes sessions, turns, tool calls, tokens, and cost
- Deduplicates sessions and detects conflicts
- Shows KPIs, recent sessions, projects, top tools, and spend charts

## Run

```bash
pnpm install
pnpm --filter dashboard dev
```
