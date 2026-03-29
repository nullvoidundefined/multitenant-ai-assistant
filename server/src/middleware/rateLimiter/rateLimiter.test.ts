import { describe, expect, it } from 'vitest';

import { authRateLimiter, rateLimiter } from './rateLimiter.js';

describe('rateLimiter', () => {
  it('is defined and is a function (Express middleware)', () => {
    expect(typeof rateLimiter).toBe('function');
  });
});

describe('authRateLimiter', () => {
  it('is defined and is a function (Express middleware)', () => {
    expect(typeof authRateLimiter).toBe('function');
  });
});
