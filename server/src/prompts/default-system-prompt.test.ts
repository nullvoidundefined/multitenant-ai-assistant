import { describe, expect, it } from 'vitest';

import { DEFAULT_SYSTEM_PROMPT } from './default-system-prompt.js';

describe('DEFAULT_SYSTEM_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof DEFAULT_SYSTEM_PROMPT).toBe('string');
    expect(DEFAULT_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });

  it('mentions being a helpful AI assistant', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('helpful AI assistant');
  });

  it('instructs about uncertainty handling', () => {
    expect(DEFAULT_SYSTEM_PROMPT).toContain('unsure');
  });
});
