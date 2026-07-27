/**
 * S1 Harness -- Bedrock Client Adapter
 *
 * Abstracts the Bedrock Converse API call behind an interface so we can
 * swap in a mock client for local testing without AWS.
 *
 * DISPOSABLE -- not production code.
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
  type ConverseCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';

import type {
  ConverseRequest,
  ConverseResponse,
  HarnessConfig,
  ToolDefinition,
  Message,
} from './types.js';

// ---------- Client interface ----------

export interface BedrockClient {
  converse(request: ConverseRequest): Promise<ConverseResponse>;
}

// ---------- AWS SDK client (live mode) ----------

/**
 * Creates a real Bedrock client using @aws-sdk/client-bedrock-runtime.
 * Only used in live mode (T10).
 */
export function createLiveClient(config: HarnessConfig): BedrockClient {
  const sdkClient = new BedrockRuntimeClient({ region: config.region });

  return {
    async converse(request: ConverseRequest): Promise<ConverseResponse> {
      const input: ConverseCommandInput = {
        modelId: request.modelId,
        messages: request.messages.map(convertMessageToSdk),
        toolConfig: request.toolConfig ? convertToolConfig(request.toolConfig) : undefined,
        inferenceConfig: request.inferenceConfig,
      };

      const command = new ConverseCommand(input);
      const response: ConverseCommandOutput = await sdkClient.send(command);

      return mapSdkResponse(response);
    },
  };
}

// ---------- SDK type converters ----------

function convertMessageToSdk(
  msg: Message,
): ConverseCommandInput['messages'] extends (infer M)[] | undefined ? M : never {
  const content = msg.content.map((block) => {
    switch (block.type) {
      case 'text':
        return { text: block.text };
      case 'tool_use':
        return {
          toolUse: {
            toolUseId: block.toolUseId,
            name: block.name,
            input: block.input,
          },
        };
      case 'tool_result':
        return {
          toolResult: {
            toolUseId: block.toolUseId,
            content: [{ text: block.content }],
            status: block.status,
          },
        };
    }
  });

  // The SDK accepts plain objects matching the shape; explicit cast needed
  // because the SDK types include a $unknown discriminant.
  return { role: msg.role, content } as ReturnType<typeof convertMessageToSdk>;
}

function convertToolConfig(
  config: NonNullable<ConverseRequest['toolConfig']>,
): ConverseCommandInput['toolConfig'] {
  return {
    tools: config.tools.map((t) => ({
      toolSpec: {
        name: t.toolSpec.name,
        description: t.toolSpec.description,
        inputSchema: { json: t.toolSpec.inputSchema.json },
      },
    })),
  } as unknown as ConverseCommandInput['toolConfig'];
}

function mapSdkResponse(response: ConverseCommandOutput): ConverseResponse {
  const outputContent = response.output?.message?.content ?? [];

  return {
    output: {
      message: {
        role: 'assistant',
        content: outputContent.map((block) => {
          if (block.text) {
            return { text: block.text };
          }
          if (block.toolUse) {
            return {
              toolUse: {
                toolUseId: block.toolUse.toolUseId ?? '',
                name: block.toolUse.name ?? '',
                input: (block.toolUse.input as Record<string, unknown>) ?? {},
              },
            };
          }
          return { text: '[unknown block]' };
        }),
      },
    },
    stopReason: (response.stopReason as ConverseResponse['stopReason']) ?? 'end_turn',
    usage: {
      inputTokens: response.usage?.inputTokens ?? 0,
      outputTokens: response.usage?.outputTokens ?? 0,
      totalTokens: (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0),
    },
  };
}

// ---------- Request builder ----------

export function buildConverseRequest(
  config: HarnessConfig,
  messages: Message[],
  tools: ToolDefinition[],
): ConverseRequest {
  return {
    modelId: config.modelId,
    messages,
    toolConfig: {
      tools: tools.map((t) => ({
        toolSpec: {
          name: t.name,
          description: t.description,
          inputSchema: { json: t.inputSchema },
        },
      })),
    },
    inferenceConfig: {
      maxTokens: 1024,
      temperature: 0.1,
    },
  };
}
