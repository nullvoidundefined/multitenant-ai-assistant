import { describe, expect, it } from 'vitest';

import { isProduction } from './env.js';

describe('isProduction', () => {
  it('returns true when NODE_ENV is production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    expect(isProduction()).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  it('returns false when NODE_ENV is development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    expect(isProduction()).toBe(false);

    process.env.NODE_ENV = originalEnv;
  });

  it('returns false when NODE_ENV is test', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    expect(isProduction()).toBe(false);

    process.env.NODE_ENV = originalEnv;
  });

  it('returns false when NODE_ENV is undefined', () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    expect(isProduction()).toBe(false);

    process.env.NODE_ENV = originalEnv;
  });
});
