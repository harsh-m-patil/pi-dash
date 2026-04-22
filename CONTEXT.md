# Pi Session Analytics

This context covers a dashboard for analyzing pi coding usage. It defines the entities and language used to describe sessions, their internal activity, and derived analytics.

## Language

**Session**:
A top-level pi coding interaction being analyzed as a single unit.
_Avoid_: Run, conversation

**Turn**:
A unit of work that starts with one user message and includes subsequent assistant activity until control returns to the user with an answer, detected in the MVP by `stopReason = "stop"`.
_Avoid_: Message pair, interaction

**Event**:
An atomic recorded occurrence within a **Session**, optionally associated with a **Turn**.
_Avoid_: Step, log line

**Session Log**:
A persisted local pi JSONL file that records data for exactly one **Session** and serves as the input to analytics ingestion.
_Avoid_: Transcript, export

**Tool Call**:
An assistant-requested invocation of a tool recorded within a **Session**.
_Avoid_: System call, command

**Assistant Usage**:
The token and cost usage recorded on an assistant message in a **Session Log**.
_Avoid_: Exact per-tool usage

**LLM Invocation**:
One assistant model invocation represented in the **Session Log** by an assistant message with usage.
_Avoid_: Turn, reply

**System Prompt Estimate**:
A configured token-count estimate for system-prompt contribution attributed per **LLM Invocation**, used only as explanatory breakdown and never added to observed totals.
_Avoid_: Observed system usage, system call

**Observed Spend Breakdown**:
A granular view of observed usage split into input, output, cacheRead, cacheWrite, totalTokens, and cost.total, shown as explicit fields rather than only rolled-up totals.
_Avoid_: Single token number, blended spend, merged cachedTokens only

**Project**:
A workspace identity for grouping **Sessions**, using full session `cwd` as canonical ID and basename as display label.
_Avoid_: Repo slug, folder label

**Ingestion Cycle**:
A dashboard ingestion run that scans local session logs, first on app start and again on explicit refresh.
_Avoid_: Stream, watcher

**Time Window**:
The selected date range used to filter displayed analytics, defaulting to 7 days in the MVP.
_Avoid_: Fixed history, hardcoded range

## Relationships

- A **Session** contains one or more **Turns**
- A **Session** contains zero or more **Events**
- A **Turn** belongs to exactly one **Session**
- An **Event** belongs to exactly one **Session**
- An **Event** may belong to zero or one **Turn**
- A **Turn** contains zero or more **Tool Calls**
- A **Turn** contains zero or more **Assistant Usage** records
- A **Session Log** records exactly one **Session**
- Analytics ingestion reads one or more **Session Logs** to reconstruct **Sessions**, **Turns**, and **Events**
- The MVP reads local **Session Logs** rather than live telemetry
- A **Session** contains zero or more **Tool Calls**
- A **Tool Call** belongs to exactly one **Session**
- A **Session** contains zero or more **Assistant Usage** records derived from assistant messages in the **Session Log**
- A **Session** contains zero or more **LLM Invocations**
- Each **LLM Invocation** has one **Assistant Usage** record
- **System Prompt Estimate** is applied per **LLM Invocation** for rough breakdown reporting
- **System Prompt Estimate** does not change observed token or cost totals
- Each **LLM Invocation** contributes to an **Observed Spend Breakdown**
- A **Session** aggregates **Observed Spend Breakdown** across its **LLM Invocations**
- A **Project** contains zero or more **Sessions**
- A **Session** belongs to exactly one **Project**
- The MVP ingests sessions across all local **Projects** and supports filtering by **Project**
- **Project** canonical ID is full `cwd`
- **Project** display label is path basename, disambiguated when needed
- The MVP performs an **Ingestion Cycle** on app start and on manual refresh
- **Session** canonical identity for ingestion deduplication is `session.id`
- If duplicate `session.id` records disagree by file hash, ingestion marks a conflict and excludes both from analytics until resolved
- The MVP default **Time Window** is last 7 days and is user-adjustable

## Example dialogue

> **Dev:** "When I open a **Session**, am I looking at raw logs or grouped exchanges?"
> **Domain expert:** "A **Session** is the thing you browse first, then you drill into its **Turns** and underlying **Events** for token and tool analysis."

## Flagged ambiguities

- "session" could have meant either a single pi run or a lower-level interaction unit — resolved: **Session** is the top-level analytic entity.
- "session log file" was vague between a raw transcript and a structured telemetry export — resolved: use **Session Log** for the persisted local input artifact, specifically the default local pi JSONL file for the MVP.
- "system call" was used ambiguously — resolved: use **Tool Call** for tool invocations; do not use "system call".
- "system prompt tokens" are not directly separable in the MVP log format — resolved: show them as **System Prompt Estimate** per **LLM Invocation** for rough breakdown reporting.
- Whether system-prompt estimates should affect totals was ambiguous — resolved: they are explanatory only and excluded from observed metrics.
- "token spend" was ambiguous between one blended number and detailed accounting — resolved: use **Observed Spend Breakdown** with granular fields (input/output/cacheRead/cacheWrite/totalTokens/cost.total).
- "granular details" was ambiguous between deeper drill-down views and richer metric fields — resolved: for MVP, it means showing explicit metric fields (e.g., cacheRead, totalTokens, cost.total), not only combined totals.
- "cachedTokens" was ambiguous between a merged cached number and separate cache fields — resolved: show both `cacheRead` and `cacheWrite` explicitly.
- Session scope was ambiguous between current project and all projects — resolved: ingest all local projects and provide **Project** filtering.
- Project identity was ambiguous between full path and basename — resolved: use full `cwd` as canonical **Project** ID and basename as display label.
- Ingestion mode was ambiguous between manual-only, startup+manual, and watcher — resolved: MVP uses startup+manual **Ingestion Cycle**; watcher comes later.
- Session deduplication key was ambiguous between file path, filename, and session identity — resolved: use `session.id`.
- Duplicate-session conflict behavior was ambiguous — resolved: if same `session.id` has differing content, mark conflict and skip from analytics.
- Content equality for duplicate detection was ambiguous — resolved: use byte-level file hash comparison.
- Default analytics date range was ambiguous — resolved: default to 7 days, with user-selectable **Time Window**.
- "turn" could have meant either everything until the next user message or everything until the assistant hands control back — resolved: a **Turn** ends when the assistant returns an answer for the user to respond to, detected in the MVP by `assistant.stopReason = "stop"`.
