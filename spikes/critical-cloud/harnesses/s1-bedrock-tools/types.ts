/**
 * S1 Harness -- Types
 *
 * Shared type definitions for the Bedrock tool-calling harness.
 * DISPOSABLE -- not production code.
 */

// ---------- Tool definitions ----------

export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolParameterProperty>;
  required: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
}

// ---------- Conversation messages ----------

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolUseContent {
  type: 'tool_use';
  toolUseId: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: 'tool_result';
  toolUseId: string;
  content: string;
  status: 'success' | 'error';
}

export type ContentBlock = TextContent | ToolUseContent | ToolResultContent;

export interface Message {
  role: 'user' | 'assistant';
  content: ContentBlock[];
}

// ---------- Converse API request/response (simplified) ----------

export interface ConverseRequest {
  modelId: string;
  messages: Message[];
  toolConfig?: {
    tools: Array<{
      toolSpec: {
        name: string;
        description: string;
        inputSchema: { json: ToolInputSchema };
      };
    }>;
  };
  inferenceConfig?: {
    maxTokens?: number;
    temperature?: number;
  };
}

export interface ConverseToolUseBlock {
  toolUse: {
    toolUseId: string;
    name: string;
    input: Record<string, unknown>;
  };
}

export interface ConverseTextBlock {
  text: string;
}

export type ConverseContentBlock = ConverseToolUseBlock | ConverseTextBlock;

export interface ConverseResponse {
  output: {
    message: {
      role: 'assistant';
      content: ConverseContentBlock[];
    };
  };
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

// ---------- Harness config ----------

export interface HarnessConfig {
  region: string;
  modelId: string;
  maxIterations: number;
  timeoutMs: number;
  dryRun: boolean;
}

// ---------- Execution evidence ----------

export interface ToolCallEvidence {
  iteration: number;
  toolName: string;
  arguments: Record<string, unknown>;
  validationResult: 'accepted' | 'rejected';
  rejectionReason?: string;
  result?: string;
}

export interface ExecutionEvidence {
  config: HarnessConfig;
  startedAt: string;
  completedAt: string;
  totalIterations: number;
  toolCalls: ToolCallEvidence[];
  finalResponse: string | null;
  stopReason: string;
  errors: string[];
}
