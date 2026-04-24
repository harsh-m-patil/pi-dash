type ModelPricing = {
  inputCostPerToken: number
  outputCostPerToken: number
  cacheWriteCostPerToken: number
  cacheReadCostPerToken: number
  fastMultiplier?: number
}

export type CostBreakdown = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  total: number
}

const FALLBACK_PRICING: Record<string, ModelPricing> = {
  "claude-opus-4-7": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 0.5e-6,
    fastMultiplier: 6,
  },
  "claude-opus-4-6": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 0.5e-6,
    fastMultiplier: 6,
  },
  "claude-opus-4-5": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 0.5e-6,
  },
  "claude-opus-4-1": {
    inputCostPerToken: 15e-6,
    outputCostPerToken: 75e-6,
    cacheWriteCostPerToken: 18.75e-6,
    cacheReadCostPerToken: 1.5e-6,
  },
  "claude-opus-4": {
    inputCostPerToken: 15e-6,
    outputCostPerToken: 75e-6,
    cacheWriteCostPerToken: 18.75e-6,
    cacheReadCostPerToken: 1.5e-6,
  },
  "claude-sonnet-4-6": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 0.3e-6,
  },
  "claude-sonnet-4-5": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 0.3e-6,
  },
  "claude-sonnet-4": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 0.3e-6,
  },
  "claude-3-7-sonnet": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 0.3e-6,
  },
  "claude-3-5-sonnet": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 0.3e-6,
  },
  "claude-haiku-4-5": {
    inputCostPerToken: 1e-6,
    outputCostPerToken: 5e-6,
    cacheWriteCostPerToken: 1.25e-6,
    cacheReadCostPerToken: 0.1e-6,
  },
  "claude-3-5-haiku": {
    inputCostPerToken: 0.8e-6,
    outputCostPerToken: 4e-6,
    cacheWriteCostPerToken: 1e-6,
    cacheReadCostPerToken: 0.08e-6,
  },
  "gpt-5.4": {
    inputCostPerToken: 2.5e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.125e-6,
    cacheReadCostPerToken: 0.25e-6,
  },
  "gpt-5.3-codex": {
    inputCostPerToken: 1.75e-6,
    outputCostPerToken: 14e-6,
    cacheWriteCostPerToken: 2.1875e-6,
    cacheReadCostPerToken: 0.175e-6,
  },
  "gpt-5.4-mini": {
    inputCostPerToken: 0.75e-6,
    outputCostPerToken: 4.5e-6,
    cacheWriteCostPerToken: 0.9375e-6,
    cacheReadCostPerToken: 0.075e-6,
  },
  "gpt-5": {
    inputCostPerToken: 1.25e-6,
    outputCostPerToken: 10e-6,
    cacheWriteCostPerToken: 1.5625e-6,
    cacheReadCostPerToken: 0.125e-6,
  },
  "gpt-5-mini": {
    inputCostPerToken: 0.25e-6,
    outputCostPerToken: 2e-6,
    cacheWriteCostPerToken: 0.3125e-6,
    cacheReadCostPerToken: 0.025e-6,
  },
  "gpt-4o": {
    inputCostPerToken: 2.5e-6,
    outputCostPerToken: 10e-6,
    cacheWriteCostPerToken: 3.125e-6,
    cacheReadCostPerToken: 1.25e-6,
  },
  "gpt-4o-mini": {
    inputCostPerToken: 0.15e-6,
    outputCostPerToken: 0.6e-6,
    cacheWriteCostPerToken: 0.1875e-6,
    cacheReadCostPerToken: 0.075e-6,
  },
  "gpt-4.1": {
    inputCostPerToken: 2e-6,
    outputCostPerToken: 8e-6,
    cacheWriteCostPerToken: 2.5e-6,
    cacheReadCostPerToken: 0.5e-6,
  },
  "gpt-4.1-mini": {
    inputCostPerToken: 0.4e-6,
    outputCostPerToken: 1.6e-6,
    cacheWriteCostPerToken: 0.5e-6,
    cacheReadCostPerToken: 0.1e-6,
  },
  "gpt-4.1-nano": {
    inputCostPerToken: 0.1e-6,
    outputCostPerToken: 0.4e-6,
    cacheWriteCostPerToken: 0.125e-6,
    cacheReadCostPerToken: 0.025e-6,
  },
}

const BUILTIN_ALIASES: Record<string, string> = {
  "anthropic--claude-4.6-opus": "claude-opus-4-6",
  "anthropic--claude-4.6-sonnet": "claude-sonnet-4-6",
  "anthropic--claude-4.5-opus": "claude-opus-4-5",
  "anthropic--claude-4.5-sonnet": "claude-sonnet-4-5",
  "anthropic--claude-4.5-haiku": "claude-haiku-4-5",
}

const sortedPricingKeys = Object.keys(FALLBACK_PRICING).sort((a, b) => b.length - a.length)

function canonicalizeModel(model: string): string {
  return model
    .replace(/@.*$/, "")
    .replace(/-\d{8}$/, "")
    .replace(/^[^/]+\//, "")
}

function resolveModelAlias(model: string): string {
  return BUILTIN_ALIASES[model] ?? model
}

export function getModelPricing(model?: string): ModelPricing | null {
  if (!model) return null

  const canonical = resolveModelAlias(canonicalizeModel(model))
  const exact = FALLBACK_PRICING[canonical]
  if (exact) return exact

  for (const key of sortedPricingKeys) {
    if (canonical.startsWith(`${key}-`) || canonical.startsWith(key)) {
      return FALLBACK_PRICING[key]!
    }
  }

  return null
}

export function calculateUsageCost(
  model: string | undefined,
  usage: {
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
  },
  speed: "standard" | "fast" = "standard",
): CostBreakdown {
  const pricing = getModelPricing(model)
  if (!pricing) {
    return {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    }
  }

  const multiplier = speed === "fast" ? (pricing.fastMultiplier ?? 1) : 1
  const input = usage.input * pricing.inputCostPerToken * multiplier
  const output = usage.output * pricing.outputCostPerToken * multiplier
  const cacheRead = usage.cacheRead * pricing.cacheReadCostPerToken * multiplier
  const cacheWrite = usage.cacheWrite * pricing.cacheWriteCostPerToken * multiplier

  return {
    input,
    output,
    cacheRead,
    cacheWrite,
    total: input + output + cacheRead + cacheWrite,
  }
}
