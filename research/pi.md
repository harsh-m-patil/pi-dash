# Pi Coding Agent

## Each line

- a type (session, message etc)
- has a id
- timestamp of creation
- parentId (useful for `/tree`) null for type == session

## Session 

- type : json
- Each session is a simple `jsonl` file
- It has cwd (the directory where you invoke the coding agent)

## Agent Settings/Config Events

- type : "event_name" -> "model_change", "thinking_level_change"
- Events such as model change, thinking level change

## Messages

- type : message
- a message object

```typescript

type TextContent = {
    type: "text"
    text: string
}

type ThinkingContent = {
    type: "thinking"
    thinking: string
    thinkingSignature: string // json string
}

// default tools provided by pi
type ToolName = "read" | "write" | "edit" | "bash"

type ToolCallContent = {
    type: "toolCall"
    id: string
    name: ToolName
    arguements: Record<string, string> // for e.g the name of the file to be read
    // the bash command to be executed with a timeout
}

type Content = TextContent | ThinkingContent | ToolCallContent

type Usage = {
	input: number
	output: number
	cacheRead: number
	cacheWrite: number
	totalTokens: number
	cost: {
		input: number
		output: number
		cacheRead: number
		cacheWrite: number
		total: number
	}
}

type Message = {
    role: "assistant" | "user" | "toolResult"
    content: Content[]
    api: "openai-completions" | "anthropic-messages" | "openai-responses" | "openai-codex-responses" // and many more
    provider: "openai-codex" | "github-copilot" | "your-custom-provider-name"
    model: string
    usage: Usage
    stopReason: "toolUse" | "stop"
    timestamp: number
    responseId: string
}
```

