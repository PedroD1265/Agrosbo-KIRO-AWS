/**
 * S1 Harness -- Mock Bedrock Client
 *
 * Simulates Bedrock Converse API responses for local testing without AWS.
 * Supports scenarios: tool request, final answer, errors, timeout.
 *
 * DISPOSABLE -- not production code.
 */

import type { ConverseRequest, ConverseResponse, ConverseContentBlock } from './types.js';
import type { BedrockClient } from './bedrock-client.js';

// ---------- Scenario types ----------

export type MockScenario =
  | 'tool_call_then_answer' // Model requests a tool, then gives final answer
  | 'unknown_tool' // Model requests a tool not in registry
  | 'invalid_arguments' // Model sends wrong argument types
  | 'missing_arguments' // Model omits required arguments
  | 'multi_iteration' // Model requests tools multiple times
  | 'infinite_loop' // Model always requests tools (tests iteration limit)
  | 'timeout' // Simulates a slow response
  | 'model_error' // Simulates an API error
  | 'direct_answer'; // Model answers without tool use

export interface MockClientOptions {
  scenario: MockScenario;
  delayMs?: number;
}

// ---------- Mock client ----------

export function createMockClient(options: MockClientOptions): BedrockClient {
  let callCount = 0;

  return {
    async converse(request: ConverseRequest): Promise<ConverseResponse> {
      callCount++;

      // Simulate delay
      if (options.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }

      // Simulate timeout
      if (options.scenario === 'timeout') {
        await new Promise((resolve) => setTimeout(resolve, 60_000));
        // Should never reach here if timeout works
        throw new Error('Timeout scenario: should have been interrupted');
      }

      // Simulate API error
      if (options.scenario === 'model_error') {
        throw new Error('ThrottlingException: Rate exceeded');
      }

      return generateResponse(options.scenario, request, callCount);
    },
  };
}

function generateResponse(
  scenario: MockScenario,
  request: ConverseRequest,
  callCount: number,
): ConverseResponse {
  switch (scenario) {
    case 'direct_answer':
      return makeTextResponse(
        'El bloque Norte 1 está en estado normal con humedad de suelo al 72%.',
      );

    case 'tool_call_then_answer':
      return handleToolCallThenAnswer(request, callCount);

    case 'unknown_tool':
      return makeToolUseResponse('nonexistent_tool', { query: 'test' });

    case 'invalid_arguments':
      // Send a number where string is expected
      return makeToolUseResponse('get_field_status', { fieldId: 12345 });

    case 'missing_arguments':
      // Omit required 'fieldId'
      return makeToolUseResponse('get_field_status', {});

    case 'multi_iteration':
      return handleMultiIteration(request, callCount);

    case 'infinite_loop':
      // Always request a tool, never finish
      return makeToolUseResponse('list_pending_tasks', { priority: 'high' });

    default:
      return makeTextResponse('Unexpected scenario.');
  }
}

function handleToolCallThenAnswer(request: ConverseRequest, callCount: number): ConverseResponse {
  // First call: check if there's already a tool result in the conversation
  const lastMessage = request.messages[request.messages.length - 1];
  const hasToolResult = lastMessage?.content.some((c) => c.type === 'tool_result');

  if (hasToolResult || callCount > 1) {
    // Second call: give final answer
    return makeTextResponse(
      'Según la información del bloque Norte 1: el cultivo de maíz está en etapa V6, ' +
        'con humedad de suelo al 72% y estado normal. El último riego fue el 15 de enero.',
    );
  }

  // First call: request tool
  return makeToolUseResponse('get_field_status', { fieldId: 'block-norte-01' });
}

function handleMultiIteration(request: ConverseRequest, callCount: number): ConverseResponse {
  // Count tool results in conversation to determine iteration
  let toolResultCount = 0;
  for (const msg of request.messages) {
    for (const block of msg.content) {
      if (block.type === 'tool_result') {
        toolResultCount++;
      }
    }
  }

  if (toolResultCount === 0) {
    // First: get field status
    return makeToolUseResponse('get_field_status', { fieldId: 'block-sur-02' });
  } else if (toolResultCount === 1) {
    // Second: list tasks
    return makeToolUseResponse('list_pending_tasks', { priority: 'high' });
  } else {
    // Third: final answer combining both results
    return makeTextResponse(
      'El bloque Sur 2 necesita riego urgente (humedad al 45%). ' +
        'La tarea de riego de alta prioridad ya está asignada a Carlos con fecha límite 16 de enero.',
    );
  }
}

// ---------- Response builders ----------

function makeTextResponse(text: string): ConverseResponse {
  return {
    output: {
      message: {
        role: 'assistant',
        content: [{ text }],
      },
    },
    stopReason: 'end_turn',
    usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
  };
}

function makeToolUseResponse(toolName: string, input: Record<string, unknown>): ConverseResponse {
  const content: ConverseContentBlock[] = [
    {
      toolUse: {
        toolUseId: `tooluse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: toolName,
        input,
      },
    },
  ];

  return {
    output: {
      message: {
        role: 'assistant',
        content,
      },
    },
    stopReason: 'tool_use',
    usage: { inputTokens: 80, outputTokens: 30, totalTokens: 110 },
  };
}
