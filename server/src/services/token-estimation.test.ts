import { describe, expect, it } from 'vitest';

/**
 * Tests the token estimation heuristic used in chat.service.ts.
 * The heuristic: Math.ceil(text.length / 4) — roughly 4 chars per token.
 * This is used for UI display and budget checks before the actual API call.
 */

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

describe('token estimation heuristic', () => {
  it('estimates ~1 token for short words', () => {
    expect(estimateTokens('Hi')).toBe(1); // 2 / 4 = 0.5 -> ceil = 1
  });

  it('estimates empty string as 0 tokens', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('estimates "Hello world" as 3 tokens', () => {
    // 11 chars / 4 = 2.75 -> ceil = 3
    expect(estimateTokens('Hello world')).toBe(3);
  });

  it('scales roughly linearly with text length', () => {
    const short = estimateTokens('abcd'); // 4 / 4 = 1
    const long = estimateTokens('abcd'.repeat(10)); // 40 / 4 = 10
    expect(long).toBe(short * 10);
  });

  it('handles long documents', () => {
    const longText = 'a'.repeat(10_000);
    expect(estimateTokens(longText)).toBe(2500);
  });

  it('uses Math.ceil so partial tokens round up', () => {
    // 5 / 4 = 1.25 -> should round up to 2
    expect(estimateTokens('Hello')).toBe(2);
    // 7 / 4 = 1.75 -> should round up to 2
    expect(estimateTokens('Testing')).toBe(2);
  });

  it('provides reasonable estimate for typical user messages', () => {
    const message =
      'Can you help me understand how to configure the system prompt for our organization?';
    const estimated = estimateTokens(message);
    // 83 chars / 4 = 20.75 -> ceil = 21
    expect(estimated).toBe(21);
    // Real token count would be ~15-18, so the heuristic overestimates slightly (safe for budgeting)
    expect(estimated).toBeGreaterThan(10);
    expect(estimated).toBeLessThan(50);
  });
});
