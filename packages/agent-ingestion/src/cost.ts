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

function isBedrockResponseId(responseId?: string): boolean {
  return typeof responseId === "string" && responseId.toLowerCase().includes("bedrock")
}

const BEDROCK_PRICING: Record<string, ModelPricing> = {
  "amazon.nova-2-lite-v1:0": {
    inputCostPerToken: 3.3e-7,
    outputCostPerToken: 2.75e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "amazon.nova-lite-v1:0": {
    inputCostPerToken: 6e-8,
    outputCostPerToken: 2.4e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 1.5e-8,
  },
  "amazon.nova-micro-v1:0": {
    inputCostPerToken: 3.5e-8,
    outputCostPerToken: 1.4e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 8.75e-9,
  },
  "amazon.nova-premier-v1:0": {
    inputCostPerToken: 2.5e-6,
    outputCostPerToken: 12.5e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "amazon.nova-pro-v1:0": {
    inputCostPerToken: 8e-7,
    outputCostPerToken: 3.2e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 2e-7,
  },
  "anthropic.claude-3-5-haiku-20241022-v1:0": {
    inputCostPerToken: 8e-7,
    outputCostPerToken: 4e-6,
    cacheWriteCostPerToken: 1e-6,
    cacheReadCostPerToken: 8e-8,
  },
  "anthropic.claude-3-5-sonnet-20240620-v1:0": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "anthropic.claude-3-5-sonnet-20241022-v2:0": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "anthropic.claude-3-7-sonnet-20250219-v1:0": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "anthropic.claude-3-haiku-20240307-v1:0": {
    inputCostPerToken: 2.5e-7,
    outputCostPerToken: 1.25e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "anthropic.claude-haiku-4-5-20251001-v1:0": {
    inputCostPerToken: 1e-6,
    outputCostPerToken: 5e-6,
    cacheWriteCostPerToken: 1.25e-6,
    cacheReadCostPerToken: 1e-7,
  },
  "anthropic.claude-opus-4-1-20250805-v1:0": {
    inputCostPerToken: 15e-6,
    outputCostPerToken: 75e-6,
    cacheWriteCostPerToken: 18.75e-6,
    cacheReadCostPerToken: 1.5e-6,
  },
  "anthropic.claude-opus-4-20250514-v1:0": {
    inputCostPerToken: 15e-6,
    outputCostPerToken: 75e-6,
    cacheWriteCostPerToken: 18.75e-6,
    cacheReadCostPerToken: 1.5e-6,
  },
  "anthropic.claude-opus-4-5-20251101-v1:0": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 5e-7,
  },
  "anthropic.claude-opus-4-6-v1": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 5e-7,
  },
  "anthropic.claude-opus-4-7": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 5e-7,
  },
  "anthropic.claude-sonnet-4-20250514-v1:0": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "anthropic.claude-sonnet-4-5-20250929-v1:0": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "anthropic.claude-sonnet-4-6": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "au.anthropic.claude-opus-4-6-v1": {
    inputCostPerToken: 16.5e-6,
    outputCostPerToken: 82.5e-6,
    cacheWriteCostPerToken: 20.625e-6,
    cacheReadCostPerToken: 1.65e-6,
  },
  "au.anthropic.claude-sonnet-4-6": {
    inputCostPerToken: 3.3e-6,
    outputCostPerToken: 16.5e-6,
    cacheWriteCostPerToken: 4.125e-6,
    cacheReadCostPerToken: 3.3e-7,
  },
  "deepseek.r1-v1:0": {
    inputCostPerToken: 1.35e-6,
    outputCostPerToken: 5.4e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "deepseek.v3-v1:0": {
    inputCostPerToken: 5.8e-7,
    outputCostPerToken: 1.68e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "deepseek.v3.2": {
    inputCostPerToken: 6.2e-7,
    outputCostPerToken: 1.85e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "eu.anthropic.claude-haiku-4-5-20251001-v1:0": {
    inputCostPerToken: 1e-6,
    outputCostPerToken: 5e-6,
    cacheWriteCostPerToken: 1.25e-6,
    cacheReadCostPerToken: 1e-7,
  },
  "eu.anthropic.claude-opus-4-5-20251101-v1:0": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 5e-7,
  },
  "eu.anthropic.claude-opus-4-6-v1": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 5e-7,
  },
  "eu.anthropic.claude-opus-4-7": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 5e-7,
  },
  "eu.anthropic.claude-sonnet-4-20250514-v1:0": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "eu.anthropic.claude-sonnet-4-5-20250929-v1:0": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "eu.anthropic.claude-sonnet-4-6": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "global.anthropic.claude-haiku-4-5-20251001-v1:0": {
    inputCostPerToken: 1e-6,
    outputCostPerToken: 5e-6,
    cacheWriteCostPerToken: 1.25e-6,
    cacheReadCostPerToken: 1e-7,
  },
  "global.anthropic.claude-opus-4-5-20251101-v1:0": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 5e-7,
  },
  "global.anthropic.claude-opus-4-6-v1": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 5e-7,
  },
  "global.anthropic.claude-opus-4-7": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 5e-7,
  },
  "global.anthropic.claude-sonnet-4-20250514-v1:0": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "global.anthropic.claude-sonnet-4-5-20250929-v1:0": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "global.anthropic.claude-sonnet-4-6": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "google.gemma-3-12b-it": {
    inputCostPerToken: 5e-8,
    outputCostPerToken: 1e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "google.gemma-3-27b-it": {
    inputCostPerToken: 1.2e-7,
    outputCostPerToken: 2e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "google.gemma-3-4b-it": {
    inputCostPerToken: 4e-8,
    outputCostPerToken: 8e-8,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "meta.llama3-1-405b-instruct-v1:0": {
    inputCostPerToken: 2.4e-6,
    outputCostPerToken: 2.4e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "meta.llama3-1-70b-instruct-v1:0": {
    inputCostPerToken: 7.2e-7,
    outputCostPerToken: 7.2e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "meta.llama3-1-8b-instruct-v1:0": {
    inputCostPerToken: 2.2e-7,
    outputCostPerToken: 2.2e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "meta.llama3-2-11b-instruct-v1:0": {
    inputCostPerToken: 1.6e-7,
    outputCostPerToken: 1.6e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "meta.llama3-2-1b-instruct-v1:0": {
    inputCostPerToken: 1e-7,
    outputCostPerToken: 1e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "meta.llama3-2-3b-instruct-v1:0": {
    inputCostPerToken: 1.5e-7,
    outputCostPerToken: 1.5e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "meta.llama3-2-90b-instruct-v1:0": {
    inputCostPerToken: 7.2e-7,
    outputCostPerToken: 7.2e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "meta.llama3-3-70b-instruct-v1:0": {
    inputCostPerToken: 7.2e-7,
    outputCostPerToken: 7.2e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "meta.llama4-maverick-17b-instruct-v1:0": {
    inputCostPerToken: 2.4e-7,
    outputCostPerToken: 9.7e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "meta.llama4-scout-17b-instruct-v1:0": {
    inputCostPerToken: 1.7e-7,
    outputCostPerToken: 6.6e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "minimax.minimax-m2.1": {
    inputCostPerToken: 3e-7,
    outputCostPerToken: 1.2e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "minimax.minimax-m2.5": {
    inputCostPerToken: 3e-7,
    outputCostPerToken: 1.2e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "minimax.minimax-m2": {
    inputCostPerToken: 3e-7,
    outputCostPerToken: 1.2e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "mistral.devstral-2-123b": {
    inputCostPerToken: 4e-7,
    outputCostPerToken: 2e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "mistral.magistral-small-2509": {
    inputCostPerToken: 5e-7,
    outputCostPerToken: 1.5e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "mistral.ministral-3-14b-instruct": {
    inputCostPerToken: 2e-7,
    outputCostPerToken: 2e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "mistral.ministral-3-3b-instruct": {
    inputCostPerToken: 1e-7,
    outputCostPerToken: 1e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "mistral.ministral-3-8b-instruct": {
    inputCostPerToken: 1.5e-7,
    outputCostPerToken: 1.5e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "mistral.mistral-large-3-675b-instruct": {
    inputCostPerToken: 5e-7,
    outputCostPerToken: 1.5e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "mistral.pixtral-large-2502-v1:0": {
    inputCostPerToken: 2e-6,
    outputCostPerToken: 6e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "mistral.voxtral-mini-3b-2507": {
    inputCostPerToken: 4e-8,
    outputCostPerToken: 4e-8,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "mistral.voxtral-small-24b-2507": {
    inputCostPerToken: 1.5e-7,
    outputCostPerToken: 3.5e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "moonshot.kimi-k2-thinking": {
    inputCostPerToken: 6e-7,
    outputCostPerToken: 2.5e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "moonshotai.kimi-k2.5": {
    inputCostPerToken: 6e-7,
    outputCostPerToken: 3e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "nvidia.nemotron-nano-12b-v2": {
    inputCostPerToken: 2e-7,
    outputCostPerToken: 6e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "nvidia.nemotron-nano-3-30b": {
    inputCostPerToken: 6e-8,
    outputCostPerToken: 2.4e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "nvidia.nemotron-nano-9b-v2": {
    inputCostPerToken: 6e-8,
    outputCostPerToken: 2.3e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "nvidia.nemotron-super-3-120b": {
    inputCostPerToken: 1.5e-7,
    outputCostPerToken: 6.5e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "openai.gpt-oss-120b-1:0": {
    inputCostPerToken: 1.5e-7,
    outputCostPerToken: 6e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "openai.gpt-oss-20b-1:0": {
    inputCostPerToken: 7e-8,
    outputCostPerToken: 3e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "openai.gpt-oss-safeguard-120b": {
    inputCostPerToken: 1.5e-7,
    outputCostPerToken: 6e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "openai.gpt-oss-safeguard-20b": {
    inputCostPerToken: 7e-8,
    outputCostPerToken: 2e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "qwen.qwen3-235b-a22b-2507-v1:0": {
    inputCostPerToken: 2.2e-7,
    outputCostPerToken: 8.8e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "qwen.qwen3-32b-v1:0": {
    inputCostPerToken: 1.5e-7,
    outputCostPerToken: 6e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "qwen.qwen3-coder-30b-a3b-v1:0": {
    inputCostPerToken: 1.5e-7,
    outputCostPerToken: 6e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "qwen.qwen3-coder-480b-a35b-v1:0": {
    inputCostPerToken: 2.2e-7,
    outputCostPerToken: 1.8e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "qwen.qwen3-coder-next": {
    inputCostPerToken: 2.2e-7,
    outputCostPerToken: 1.8e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "qwen.qwen3-next-80b-a3b": {
    inputCostPerToken: 1.4e-7,
    outputCostPerToken: 1.4e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "qwen.qwen3-vl-235b-a22b": {
    inputCostPerToken: 3e-7,
    outputCostPerToken: 1.5e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "us.anthropic.claude-haiku-4-5-20251001-v1:0": {
    inputCostPerToken: 1e-6,
    outputCostPerToken: 5e-6,
    cacheWriteCostPerToken: 1.25e-6,
    cacheReadCostPerToken: 1e-7,
  },
  "us.anthropic.claude-opus-4-1-20250805-v1:0": {
    inputCostPerToken: 15e-6,
    outputCostPerToken: 75e-6,
    cacheWriteCostPerToken: 18.75e-6,
    cacheReadCostPerToken: 1.5e-6,
  },
  "us.anthropic.claude-opus-4-20250514-v1:0": {
    inputCostPerToken: 15e-6,
    outputCostPerToken: 75e-6,
    cacheWriteCostPerToken: 18.75e-6,
    cacheReadCostPerToken: 1.5e-6,
  },
  "us.anthropic.claude-opus-4-5-20251101-v1:0": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 5e-7,
  },
  "us.anthropic.claude-opus-4-6-v1": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 5e-7,
  },
  "us.anthropic.claude-opus-4-7": {
    inputCostPerToken: 5e-6,
    outputCostPerToken: 25e-6,
    cacheWriteCostPerToken: 6.25e-6,
    cacheReadCostPerToken: 5e-7,
  },
  "us.anthropic.claude-sonnet-4-20250514-v1:0": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "us.anthropic.claude-sonnet-4-5-20250929-v1:0": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "us.anthropic.claude-sonnet-4-6": {
    inputCostPerToken: 3e-6,
    outputCostPerToken: 15e-6,
    cacheWriteCostPerToken: 3.75e-6,
    cacheReadCostPerToken: 3e-7,
  },
  "writer.palmyra-x4-v1:0": {
    inputCostPerToken: 2.5e-6,
    outputCostPerToken: 1e-5,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "writer.palmyra-x5-v1:0": {
    inputCostPerToken: 6e-7,
    outputCostPerToken: 6e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "zai.glm-4.7-flash": {
    inputCostPerToken: 7e-8,
    outputCostPerToken: 4e-7,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "zai.glm-4.7": {
    inputCostPerToken: 6e-7,
    outputCostPerToken: 2.2e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
  "zai.glm-5": {
    inputCostPerToken: 1e-6,
    outputCostPerToken: 3.2e-6,
    cacheWriteCostPerToken: 0,
    cacheReadCostPerToken: 0,
  },
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

const sortedBedrockPricingKeys = Object.keys(BEDROCK_PRICING).sort((a, b) => b.length - a.length)
const sortedPricingKeys = Object.keys(FALLBACK_PRICING).sort((a, b) => b.length - a.length)

function resolveModelAlias(model: string): string {
  return BUILTIN_ALIASES[model] ?? model
}

function resolvePricingKey(
  pricingTable: Record<string, ModelPricing>,
  sortedKeys: string[],
  model?: string,
): string | null {
  if (!model) return null

  const canonical = resolveModelAlias(model)
  const exact = pricingTable[canonical]
  if (exact) {
    return canonical
  }

  for (const key of sortedKeys) {
    if (canonical.startsWith(`${key}-`) || canonical.startsWith(key)) {
      return key
    }
  }

  return null
}

export function getModelPricing(model?: string, responseId?: string): ModelPricing | null {
  const bedrockPricingKey = isBedrockResponseId(responseId)
    ? resolvePricingKey(BEDROCK_PRICING, sortedBedrockPricingKeys, model)
    : null
  if (bedrockPricingKey) return BEDROCK_PRICING[bedrockPricingKey] ?? null

  const pricingKey = resolvePricingKey(FALLBACK_PRICING, sortedPricingKeys, model)
  return pricingKey ? FALLBACK_PRICING[pricingKey] ?? null : null
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
  responseId?: string,
): CostBreakdown {
  const pricing = getModelPricing(model, responseId)
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
