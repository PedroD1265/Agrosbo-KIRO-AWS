/**
 * S1 Harness -- Argument Validation
 *
 * Validates tool call arguments against the tool's input schema.
 * DISPOSABLE -- not production code.
 */

import type { ToolInputSchema, ToolParameterProperty } from './types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates arguments against a tool's input schema.
 * Checks: required fields present, type matches, enum membership.
 */
export function validateArguments(
  args: Record<string, unknown>,
  schema: ToolInputSchema,
): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  for (const requiredField of schema.required) {
    if (
      !(requiredField in args) ||
      args[requiredField] === undefined ||
      args[requiredField] === null
    ) {
      errors.push(`Missing required field: "${requiredField}"`);
    }
  }

  // Check types and constraints for provided fields
  for (const [key, value] of Object.entries(args)) {
    const propDef = schema.properties[key];

    if (!propDef) {
      // Extra fields are tolerated but warned (model may include unexpected fields)
      errors.push(`Unknown field: "${key}" (not in schema)`);
      continue;
    }

    if (value === undefined || value === null) {
      continue; // Already checked in required pass
    }

    const typeError = checkType(key, value, propDef);
    if (typeError) {
      errors.push(typeError);
    }
  }

  return { valid: errors.length === 0, errors };
}

function checkType(key: string, value: unknown, prop: ToolParameterProperty): string | null {
  switch (prop.type) {
    case 'string':
      if (typeof value !== 'string') {
        return `Field "${key}" expected string, got ${typeof value}`;
      }
      if (prop.enum && !prop.enum.includes(value)) {
        return `Field "${key}" value "${value}" not in enum [${prop.enum.join(', ')}]`;
      }
      return null;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return `Field "${key}" expected number, got ${typeof value}`;
      }
      return null;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return `Field "${key}" expected boolean, got ${typeof value}`;
      }
      return null;

    case 'array':
      if (!Array.isArray(value)) {
        return `Field "${key}" expected array, got ${typeof value}`;
      }
      return null;

    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        return `Field "${key}" expected object, got ${typeof value}`;
      }
      return null;

    default:
      return null;
  }
}
