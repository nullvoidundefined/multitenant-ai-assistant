import { describe, expect, it } from 'vitest';

import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from './session.js';

describe('session constants', () => {
  it('SESSION_COOKIE_NAME is "sid"', () => {
    expect(SESSION_COOKIE_NAME).toBe('sid');
  });

  it('SESSION_TTL_MS is 7 days in milliseconds', () => {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(SESSION_TTL_MS).toBe(sevenDays);
  });
});
