import "server-only"

import { createIngestionService, type IngestionQuery } from "./service"
import type { IngestionResult } from "./types"

export type IngestOptions = IngestionQuery

const defaultIngestionService = createIngestionService()

export async function ingestAgentSessions(options: IngestOptions = {}): Promise<IngestionResult> {
  return defaultIngestionService.ingest(options)
}

export async function ingestPiSessions(options: IngestOptions = {}): Promise<IngestionResult> {
  return ingestAgentSessions(options)
}
