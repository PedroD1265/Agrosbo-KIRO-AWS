/**
 * S1 Harness -- Tool Registry
 *
 * Local registry of synthetic agricultural tools for validating Bedrock tool calling.
 * All tools are read-only and return synthetic data.
 *
 * DISPOSABLE -- not production code.
 * This is NOT the definitive tool registry for Spec 21.
 */

import type { ToolDefinition, ToolInputSchema } from './types.js';

// ---------- Tool implementations ----------

type ToolHandler = (args: Record<string, unknown>) => string;

interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

// ---------- Synthetic tool: get_field_status ----------

const getFieldStatusSchema: ToolInputSchema = {
  type: 'object',
  properties: {
    fieldId: {
      type: 'string',
      description: 'Unique identifier of the field/block (e.g. "block-norte-01")',
    },
  },
  required: ['fieldId'],
};

function handleGetFieldStatus(args: Record<string, unknown>): string {
  const fieldId = args.fieldId as string;

  // Synthetic data -- no real DB connection
  const syntheticFields: Record<string, object> = {
    'block-norte-01': {
      fieldId: 'block-norte-01',
      name: 'Bloque Norte 1',
      crop: 'Maíz',
      stage: 'V6 (vegetativo)',
      hectares: 12.5,
      lastIrrigation: '2024-01-15',
      soilMoisture: 0.72,
      status: 'normal',
    },
    'block-sur-02': {
      fieldId: 'block-sur-02',
      name: 'Bloque Sur 2',
      crop: 'Soja',
      stage: 'R3 (inicio de vaina)',
      hectares: 8.3,
      lastIrrigation: '2024-01-12',
      soilMoisture: 0.45,
      status: 'needs_irrigation',
    },
  };

  const field = syntheticFields[fieldId];
  if (!field) {
    return JSON.stringify({
      error: 'field_not_found',
      message: `No field found with id "${fieldId}"`,
      availableFields: Object.keys(syntheticFields),
    });
  }

  return JSON.stringify(field);
}

// ---------- Synthetic tool: list_pending_tasks ----------

const listPendingTasksSchema: ToolInputSchema = {
  type: 'object',
  properties: {
    assignee: {
      type: 'string',
      description: 'Filter by assignee name (optional)',
    },
    priority: {
      type: 'string',
      description: 'Filter by priority level',
      enum: ['high', 'medium', 'low'],
    },
  },
  required: [],
};

function handleListPendingTasks(args: Record<string, unknown>): string {
  // Synthetic tasks
  const allTasks = [
    {
      id: 'task-001',
      title: 'Riego Bloque Sur 2',
      priority: 'high',
      assignee: 'Carlos',
      dueDate: '2024-01-16',
      type: 'irrigation',
    },
    {
      id: 'task-002',
      title: 'Aplicación fertilizante Bloque Norte 1',
      priority: 'medium',
      assignee: 'María',
      dueDate: '2024-01-18',
      type: 'application',
    },
    {
      id: 'task-003',
      title: 'Revisión de plagas sector Este',
      priority: 'low',
      assignee: 'Carlos',
      dueDate: '2024-01-20',
      type: 'inspection',
    },
  ];

  let filtered = allTasks;

  if (args.assignee && typeof args.assignee === 'string') {
    filtered = filtered.filter(
      (t) => t.assignee.toLowerCase() === (args.assignee as string).toLowerCase(),
    );
  }

  if (args.priority && typeof args.priority === 'string') {
    filtered = filtered.filter((t) => t.priority === args.priority);
  }

  return JSON.stringify({ tasks: filtered, total: filtered.length });
}

// ---------- Registry ----------

const REGISTRY: Map<string, RegisteredTool> = new Map();

function register(def: ToolDefinition, handler: ToolHandler): void {
  REGISTRY.set(def.name, { definition: def, handler });
}

// Register synthetic tools
register(
  {
    name: 'get_field_status',
    description:
      'Get the current status of a field/block including crop stage, soil moisture, and irrigation info. Read-only.',
    inputSchema: getFieldStatusSchema,
  },
  handleGetFieldStatus,
);

register(
  {
    name: 'list_pending_tasks',
    description: 'List pending tasks for the farm. Can filter by assignee or priority. Read-only.',
    inputSchema: listPendingTasksSchema,
  },
  handleListPendingTasks,
);

// ---------- Public API ----------

export function getToolDefinitions(): ToolDefinition[] {
  return Array.from(REGISTRY.values()).map((r) => r.definition);
}

export function isKnownTool(name: string): boolean {
  return REGISTRY.has(name);
}

export function getToolSchema(name: string): ToolInputSchema | null {
  const tool = REGISTRY.get(name);
  return tool ? tool.definition.inputSchema : null;
}

export function executeTool(name: string, args: Record<string, unknown>): string {
  const tool = REGISTRY.get(name);
  if (!tool) {
    throw new Error(`Unknown tool: "${name}"`);
  }
  return tool.handler(args);
}

export function getRegisteredToolNames(): string[] {
  return Array.from(REGISTRY.keys());
}
