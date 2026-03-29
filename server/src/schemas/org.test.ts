import { describe, expect, it } from 'vitest';

import { chatMessageSchema, createOrgSchema } from './org.js';

describe('createOrgSchema', () => {
  it('accepts valid org name', () => {
    const result = createOrgSchema.safeParse({ name: 'My Org' });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createOrgSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    const result = createOrgSchema.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('accepts name exactly 100 characters', () => {
    const result = createOrgSchema.safeParse({ name: 'a'.repeat(100) });
    expect(result.success).toBe(true);
  });
});

describe('chatMessageSchema', () => {
  it('accepts valid message without conversation_id', () => {
    const result = chatMessageSchema.safeParse({ message: 'Hello' });
    expect(result.success).toBe(true);
  });

  it('accepts valid message with conversation_id', () => {
    const result = chatMessageSchema.safeParse({
      message: 'Hello',
      conversation_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty message', () => {
    const result = chatMessageSchema.safeParse({ message: '' });
    expect(result.success).toBe(false);
  });

  it('rejects message exceeding 10000 characters', () => {
    const result = chatMessageSchema.safeParse({ message: 'a'.repeat(10_001) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid conversation_id format', () => {
    const result = chatMessageSchema.safeParse({
      message: 'Hello',
      conversation_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});
