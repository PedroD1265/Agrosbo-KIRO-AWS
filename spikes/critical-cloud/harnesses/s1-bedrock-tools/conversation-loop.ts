/**
 * S1 Harness -- Conversation Loop
 *
 * Orchestrates the multi-turn conversation with tool use:
 * user prompt -> model response -> tool execution -> tool result -> model response -> ...
 *
 * Implements: iteration limit, timeout, argument validation, unknown tool rejection.
 *
 * DISPOSABLE -- not production code.
 */

import type {
  Message,
  ContentBlock,
  HarnessConfig,
  ToolCallEvidence,
  ExecutionEvidence,
  ConverseContentBlock,
} from './types.js';
import type { BedrockClient } from './bedrock-client.js';
import { buildConverseRequest } from './bedrock-client.js';
import { getToolDefinitions, isKnownTool, getToolSchema, executeTool } from './tool-registry.js';
import { validateArguments } from './validation.js';
import { sanitize, truncateForLog, safeMessageLog } from './sanitize.js';

export interface ConversationResult {
  evidence: ExecutionEvidence;
  success: boolean;
  error?: string;
}

/**
 * Runs the conversation loop with tool-use support.
 */
export async function runConversation(
  client: BedrockClient,
  config: HarnessConfig,
  userPrompt: string,
): Promise<ConversationResult> {
  const tools = getToolDefinitions();
  const toolCalls: ToolCallEvidence[] = [];
  const errors: string[] = [];
  const startedAt = new Date().toISOString();

  // Build initial messages
  const messages: Message[] = [
    {
      role: 'user',
      content: [{ type: 'text', text: userPrompt }],
    },
  ];

  let iteration = 0;
  let finalResponse: string | null = null;
  let stopReason = 'unknown';

  try {
    while (iteration < config.maxIterations) {
      iteration++;

      // Log iteration (sanitized)
      console.log(
        `  [iter ${iteration}/${config.maxIterations}] ${safeMessageLog('user', userPrompt.length, messages.length)}`,
      );

      // Build and send request with timeout
      const request = buildConverseRequest(config, messages, tools);
      const response = await withTimeout(
        client.converse(request),
        config.timeoutMs,
        `Bedrock call timed out after ${config.timeoutMs}ms`,
      );

      stopReason = response.stopReason;
      const assistantContent = response.output.message.content;

      // Process response blocks
      const assistantBlocks: ContentBlock[] = [];
      let hasToolUse = false;

      for (const block of assistantContent) {
        if ('text' in block && block.text) {
          assistantBlocks.push({ type: 'text', text: block.text });
          finalResponse = block.text;
          console.log(
            `  [iter ${iteration}] model text: ${truncateForLog(sanitize(block.text), 100)}`,
          );
        } else if ('toolUse' in block && block.toolUse) {
          hasToolUse = true;
          const { toolUseId, name, input } = block.toolUse;

          console.log(`  [iter ${iteration}] model requests tool: ${name}`);

          // Check if tool is known
          if (!isKnownTool(name)) {
            const evidence: ToolCallEvidence = {
              iteration,
              toolName: name,
              arguments: input,
              validationResult: 'rejected',
              rejectionReason: `Unknown tool: "${name}"`,
            };
            toolCalls.push(evidence);
            errors.push(`Rejected unknown tool: "${name}"`);

            // Send error result back to model
            assistantBlocks.push({
              type: 'tool_use',
              toolUseId,
              name,
              input,
            });

            messages.push({ role: 'assistant', content: assistantBlocks });
            messages.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  toolUseId,
                  content: JSON.stringify({
                    error: 'unknown_tool',
                    message: `Tool "${name}" is not available.`,
                  }),
                  status: 'error',
                },
              ],
            });

            // Continue to next iteration (model may correct itself)
            continue;
          }

          // Validate arguments
          const schema = getToolSchema(name)!;
          const validation = validateArguments(input, schema);

          if (!validation.valid) {
            const evidence: ToolCallEvidence = {
              iteration,
              toolName: name,
              arguments: input,
              validationResult: 'rejected',
              rejectionReason: validation.errors.join('; '),
            };
            toolCalls.push(evidence);
            errors.push(
              `Rejected invalid arguments for "${name}": ${validation.errors.join('; ')}`,
            );

            // Send validation error back to model
            assistantBlocks.push({
              type: 'tool_use',
              toolUseId,
              name,
              input,
            });

            messages.push({ role: 'assistant', content: assistantBlocks });
            messages.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  toolUseId,
                  content: JSON.stringify({
                    error: 'invalid_arguments',
                    message: `Validation failed: ${validation.errors.join('; ')}`,
                  }),
                  status: 'error',
                },
              ],
            });

            continue;
          }

          // Execute tool
          const toolResult = executeTool(name, input);

          const evidence: ToolCallEvidence = {
            iteration,
            toolName: name,
            arguments: input,
            validationResult: 'accepted',
            result: truncateForLog(toolResult),
          };
          toolCalls.push(evidence);

          console.log(`  [iter ${iteration}] tool executed: ${name} -> success`);

          // Add assistant message with tool use, then user message with tool result
          assistantBlocks.push({
            type: 'tool_use',
            toolUseId,
            name,
            input,
          });

          messages.push({ role: 'assistant', content: assistantBlocks });
          messages.push({
            role: 'user',
            content: [
              {
                type: 'tool_result',
                toolUseId,
                content: toolResult,
                status: 'success',
              },
            ],
          });
        }
      }

      // If no tool use, conversation is complete
      if (!hasToolUse) {
        // Add the assistant's final message
        if (assistantBlocks.length > 0 && messages[messages.length - 1]?.role !== 'assistant') {
          messages.push({ role: 'assistant', content: assistantBlocks });
        }
        break;
      }
    }

    // Check if we hit the iteration limit
    if (iteration >= config.maxIterations && stopReason === 'tool_use') {
      errors.push(`Iteration limit reached (${config.maxIterations})`);
      stopReason = 'iteration_limit';
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    errors.push(`Conversation error: ${sanitize(errorMessage)}`);
    stopReason = 'error';
  }

  const evidence: ExecutionEvidence = {
    config,
    startedAt,
    completedAt: new Date().toISOString(),
    totalIterations: iteration,
    toolCalls,
    finalResponse: finalResponse ? truncateForLog(sanitize(finalResponse)) : null,
    stopReason,
    errors,
  };

  return {
    evidence,
    success: errors.length === 0 && finalResponse !== null,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

// ---------- Timeout helper ----------

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
