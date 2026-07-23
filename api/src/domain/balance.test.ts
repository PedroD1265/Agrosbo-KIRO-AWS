import { describe, it, expect } from 'vitest';

describe('balance rule (placeholder)', () => {
  it('sum of outputs + loss must equal sum of inputs', () => {
    const inputs = [100, 50];
    const outputs = [80, 40];
    const loss = 30;

    const totalIn = inputs.reduce((a, b) => a + b, 0);
    const totalOut = outputs.reduce((a, b) => a + b, 0) + loss;

    expect(totalIn).toBe(totalOut);
  });
});
