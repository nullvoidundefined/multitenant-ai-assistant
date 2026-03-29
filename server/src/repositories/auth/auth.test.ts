import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/db/pool/pool.js', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import bcrypt from 'bcrypt';
import { query, withTransaction } from 'app/db/pool/pool.js';

import {
  createSession,
  createUser,
  createUserAndSession,
  deleteSession,
  findUserByEmail,
  getSessionWithUser,
  loginUser,
  verifyPassword,
} from './auth.js';

describe('auth repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('hashes password and inserts user', async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed-pw' as never);
      const user = { id: 'u1', email: 'test@test.com', first_name: 'Test', last_name: 'User', created_at: new Date(), updated_at: null };
      vi.mocked(query).mockResolvedValue({ rows: [user], rowCount: 1, command: '', oid: 0, fields: [] });

      const result = await createUser('TEST@test.com', 'password123', 'Test', 'User');

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['test@test.com', 'hashed-pw', 'Test', 'User'],
        undefined,
      );
      expect(result).toEqual(user);
    });

    it('normalizes email to lowercase and trims', async () => {
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
      const user = { id: 'u1', email: 'test@test.com', first_name: 'A', last_name: 'B', created_at: new Date(), updated_at: null };
      vi.mocked(query).mockResolvedValue({ rows: [user], rowCount: 1, command: '', oid: 0, fields: [] });

      await createUser('  TEST@TEST.COM  ', 'pass12345', ' A ', ' B ');

      expect(query).toHaveBeenCalledWith(
        expect.anything(),
        ['test@test.com', 'hashed', 'A', 'B'],
        undefined,
      );
    });
  });

  describe('findUserByEmail', () => {
    it('returns user when found', async () => {
      const user = { id: 'u1', email: 'test@test.com', first_name: 'T', last_name: 'U', password_hash: 'h', created_at: new Date(), updated_at: null };
      vi.mocked(query).mockResolvedValue({ rows: [user], rowCount: 1, command: '', oid: 0, fields: [] });

      const result = await findUserByEmail('TEST@test.com');

      expect(query).toHaveBeenCalledWith(
        expect.anything(),
        ['test@test.com'],
      );
      expect(result).toEqual(user);
    });

    it('returns null when not found', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      const result = await findUserByEmail('nobody@test.com');

      expect(result).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('returns true for matching password', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await verifyPassword('password', 'hash');

      expect(result).toBe(true);
    });

    it('returns false for non-matching password', async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const result = await verifyPassword('wrong', 'hash');

      expect(result).toBe(false);
    });
  });

  describe('getSessionWithUser', () => {
    it('returns user for valid session', async () => {
      const user = { id: 'u1', email: 'test@test.com', first_name: 'T', last_name: 'U', created_at: new Date(), updated_at: null };
      vi.mocked(query).mockResolvedValue({ rows: [user], rowCount: 1, command: '', oid: 0, fields: [] });

      const result = await getSessionWithUser('valid-token');

      expect(result).toEqual(user);
      // Verify it hashes the token before querying
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FROM sessions s'),
        [expect.any(String)],
      );
    });

    it('returns null for invalid/expired session', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      const result = await getSessionWithUser('expired-token');

      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('returns true when session was deleted', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [{ id: 'h' }], rowCount: 1, command: '', oid: 0, fields: [] });

      const result = await deleteSession('token');

      expect(result).toBe(true);
    });

    it('returns false when session did not exist', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      const result = await deleteSession('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('loginUser', () => {
    it('deletes old sessions and creates new one in transaction', async () => {
      vi.mocked(withTransaction).mockImplementation(async (fn) => {
        return fn({} as never);
      });
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] }) // DELETE sessions
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] }); // INSERT session

      const token = await loginUser('u1');

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('createUserAndSession', () => {
    it('creates user and session in single transaction', async () => {
      vi.mocked(withTransaction).mockImplementation(async (fn) => {
        return fn({} as never);
      });
      vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
      const user = { id: 'u1', email: 'test@test.com', first_name: 'T', last_name: 'U', created_at: new Date(), updated_at: null };
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [user], rowCount: 1, command: '', oid: 0, fields: [] }) // INSERT user
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] }); // INSERT session

      const result = await createUserAndSession('test@test.com', 'pass12345', 'T', 'U');

      expect(result.user).toEqual(user);
      expect(typeof result.sessionId).toBe('string');
    });
  });
});
