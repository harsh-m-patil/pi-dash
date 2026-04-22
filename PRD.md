## Problem Statement

I use pi coding sessions daily, but I cannot reliably analyze how my usage evolves across projects. I need a dashboard that ingests local pi session logs and gives me trustworthy, granular insights into token usage, cache behavior, cost, tool activity, and session patterns. Today, this data is scattered across raw JSONL logs and is too hard to inspect manually.

## Solution

Build a local-first session analytics dashboard that ingests pi JSONL session logs across all local projects, normalizes them into a stable domain model, and presents filterable insights with default 7-day scope. The dashboard will expose explicit observed usage fields (`input`, `output`, `cacheRead`, `cacheWrite`, `totalTokens`, `cost.total`), tool-call activity, turn-level reconstruction, and project/time filtering.

The system prompt contribution will be shown only as an explanatory estimate (per invocation) and never added to observed totals.

## User Stories

1. As a solo developer, I want all my local pi sessions ingested automatically on app start, so that I can immediately see recent usage.
2. As a solo developer, I want a manual refresh action, so that I can ingest newly created sessions without restarting.
3. As a solo developer, I want ingestion to scan all local projects, so that I can analyze my complete coding-agent usage.
4. As a solo developer, I want to filter by project, so that I can compare focus and spend by workspace.
5. As a solo developer, I want project labels to be human-readable, so that I can recognize projects quickly in the UI.
6. As a solo developer, I want project identity to be collision-safe, so that similarly named folders are not merged incorrectly.
7. As a solo developer, I want sessions deduplicated by session identity, so that repeated scans do not duplicate analytics.
8. As a solo developer, I want deterministic conflict handling for duplicate session IDs with different content, so that analytics remain trustworthy.
9. As a solo developer, I want conflicted sessions surfaced explicitly, so that I can resolve data quality issues.
10. As a solo developer, I want session-level totals for tokens and cost, so that I can understand overall usage quickly.
11. As a solo developer, I want granular observed usage fields (input/output/cacheRead/cacheWrite/totalTokens/cost.total), so that I can distinguish real usage patterns.
12. As a solo developer, I want cache reads and writes shown separately, so that I can reason about caching behavior accurately.
13. As a solo developer, I want token activity and monetary cost both visible, so that I can understand efficiency and spend together.
14. As a solo developer, I want default analytics scoped to last 7 days, so that the first view is actionable and not noisy.
15. As a solo developer, I want to change the time window, so that I can inspect short-term and long-term trends.
16. As a solo developer, I want turns reconstructed from raw events, so that I can see what happened for each user request.
17. As a solo developer, I want a clear turn-completion rule based on assistant stop condition, so that turn boundaries are predictable.
18. As a solo developer, I want invocation-level usage records, so that I can inspect model activity in detail when needed.
19. As a solo developer, I want tool-call counts per session/turn, so that I can understand where tool-heavy workflows happen.
20. As a solo developer, I want tool-call outcomes and latency visible, so that I can identify slow or failing tool interactions.
21. As a solo developer, I want observed metrics to remain canonical, so that estimates never corrupt totals.
22. As a solo developer, I want a system prompt estimate shown only as explanatory context, so that I can reason about likely hidden overhead.
23. As a solo developer, I want the system prompt estimate applied per invocation, so that the rough estimate follows invocation volume.
24. As a future team lead, I want the architecture to support live ingestion later, so that the MVP can evolve to multi-user analytics.
25. As a future team lead, I want module boundaries that are testable in isolation, so that changes remain safe as complexity grows.
26. As a future team lead, I want ingestion behavior to be idempotent, so that scheduled or repeated scans produce stable results.
27. As a product owner, I want transparent ambiguity resolutions documented, so that future contributors understand metric semantics.
28. As a product owner, I want explicit out-of-scope boundaries for MVP, so that delivery remains focused.
29. As a product owner, I want to avoid per-tool token attribution in MVP, so that we avoid false precision from inferred metrics.
30. As a product owner, I want extensibility for watcher-based ingestion later, so that near real-time UX can be added without rework.
31. As a product owner, I want predictable filtering semantics (project + time window), so that dashboards are consistent and explainable.
32. As a product owner, I want robust parse/error handling for malformed logs, so that one bad file does not break all analytics.
33. As a product owner, I want sessions grouped under stable project entities, so that cross-project insights are coherent.
34. As a product owner, I want clear separation between observed and estimated metrics, so that trust in the dashboard remains high.
35. As a product owner, I want the same domain language used in code and docs, so that implementation and product intent stay aligned.

## Implementation Decisions

- Build a local-first ingestion architecture around default pi JSONL session logs.
- Use a domain model with these core entities: Project, Session, Turn, Event, Tool Call, LLM Invocation, Assistant Usage, Observed Spend Breakdown, System Prompt Estimate.
- Define Session as top-level analysis unit.
- Define Turn as one user message through assistant completion, with MVP completion detected by assistant stop reason `stop`.
- Reconstruct turns and invocation-level records from message/event streams.
- Treat observed usage as canonical and preserve raw observed fields without blending.
- Expose granular observed fields explicitly: input, output, cacheRead, cacheWrite, totalTokens, and cost.total.
- Keep cacheRead and cacheWrite separate in reporting.
- Support all-project ingestion from local sessions with project filtering.
- Use full workspace path (`cwd`) as canonical project identity and basename as display label with disambiguation.
- Use startup scan + manual refresh ingestion cycle for MVP.
- Use session identity (`session.id`) as deduplication key.
- For duplicate session IDs, compare byte-level file hash to determine equality.
- If same session ID has different hash/content, mark as conflict and exclude from analytics until resolved.
- Keep System Prompt Estimate as a configured explanatory estimate per invocation.
- Do not add System Prompt Estimate to observed totals (non-additive).
- Use default dashboard time window of last 7 days with user-adjustable range.
- Avoid per-tool token attribution in MVP because logs do not provide direct per-tool token usage.
- Prepare architecture for later watcher-based ingestion and live telemetry extension.

### Proposed deep modules

- Ingestion Orchestrator: coordinates startup scan and manual refresh while enforcing idempotency.
- Session Log Parser: converts raw JSONL records into normalized domain events and usage records.
- Turn Reconstruction Engine: builds stable turns from event streams using completion semantics.
- Identity & Conflict Resolver: applies dedup key/hash strategy and conflict exclusion rules.
- Analytics Aggregator: computes session/project/time-window metrics from observed usage.
- Query/Filter Service: applies project and time-window filtering consistently across views.
- Estimate Annotator: applies non-additive system prompt estimate overlays to invocation/session views.

## Testing Decisions

- Good tests should validate external behavior and invariants, not internal implementation details.
- Prioritize deterministic, isolated tests for deep modules with stable interfaces.
- Modules to test:
  - Session Log Parser (record normalization, malformed input handling).
  - Turn Reconstruction Engine (boundary detection, especially stop-reason completion).
  - Identity & Conflict Resolver (dedup, hash equality, conflict exclusion).
  - Analytics Aggregator (field-level accuracy for observed spend breakdown).
  - Query/Filter Service (project and time-window correctness, default 7-day behavior).
  - Estimate Annotator (non-additive explanatory overlay behavior).
- Add integration tests for ingestion cycle behavior (startup scan + manual refresh idempotency).
- Add end-to-end smoke tests to verify that analytics remain stable across repeated ingestion cycles.
- Prior art in the current codebase is minimal/nonexistent; test strategy should establish a new baseline centered on behavior-driven module contracts.

## Out of Scope

- Multi-user analytics and manager-level rollups.
- Live streaming/file-watcher ingestion in MVP.
- Real-time telemetry extensions for pi in MVP.
- True per-tool token attribution in MVP.
- System-prompt exact accounting from provider internals.
- Hosted/cloud deployment concerns.
- Team-level auth, RBAC, and sharing features.

## Further Notes

- The product should preserve a strict distinction between observed metrics and estimates.
- Ambiguous terms were resolved and captured in domain language (e.g., Tool Call vs system call).
- The architecture should allow future evolution to watcher/live-ingestion and team analytics without redefining core entities.
