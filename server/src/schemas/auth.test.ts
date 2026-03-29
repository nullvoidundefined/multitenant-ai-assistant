import { describe, expect, it } from 'vitest';

import { loginSchema, registerSchema } from './auth.js';

describe('registerSchema', () => {
  it('accepts valid registration input', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'securepass123',
      first_name: 'Test',
      last_name: 'User',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'not-an-email',
      password: 'securepass123',
      first_name: 'Test',
      last_name: 'User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
      first_name: 'Test',
      last_name: 'User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty first_name', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'securepass123',
      first_name: '',
      last_name: 'User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty last_name', () => {
    const result = registerSchema.safeParse({
      email: 'test@example.com',
      password: 'securepass123',
      first_name: 'Test',
      last_name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts valid login input', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'anypassword',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({
      email: 'bad',
      password: 'anypassword',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});
