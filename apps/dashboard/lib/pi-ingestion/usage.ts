import type { ObservedUsage } from "@/lib/pi-ingestion/types"

export function createEmptyUsage(): ObservedUsage {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    },
  }
}

export function addUsage(base: ObservedUsage, incoming: ObservedUsage): ObservedUsage {
  return {
    input: base.input + incoming.input,
    output: base.output + incoming.output,
    cacheRead: base.cacheRead + incoming.cacheRead,
    cacheWrite: base.cacheWrite + incoming.cacheWrite,
    totalTokens: base.totalTokens + incoming.totalTokens,
    cost: {
      input: base.cost.input + incoming.cost.input,
      output: base.cost.output + incoming.cost.output,
      cacheRead: base.cost.cacheRead + incoming.cost.cacheRead,
      cacheWrite: base.cost.cacheWrite + incoming.cost.cacheWrite,
      total: base.cost.total + incoming.cost.total,
    },
  }
}
