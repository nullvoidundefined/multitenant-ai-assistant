import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/db/pool/pool.js', () => ({
  query: vi.fn(),
}));

import { query } from 'app/db/pool/pool.js';

import {
  addMessage,
  createConversation,
  getConversation,
  getMessages,
  listConversations,
  updateConversationTitle,
} from './conversations.js';

describe('conversations repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createConversation', () => {
    it('inserts a conversation and returns it', async () => {
      const conv = { id: 'c1', org_id: 'org-1', user_id: 'u1', title: null, created_at: new Date(), updated_at: null };
      vi.mocked(query).mockResolvedValue({ rows: [conv], rowCount: 1, command: '', oid: 0, fields: [] });

      const result = await createConversation('org-1', 'u1');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversations'),
        ['org-1', 'u1', null],
      );
      expect(result).toEqual(conv);
    });

    it('throws when insert returns no row', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      await expect(createConversation('org-1', 'u1')).rejects.toThrow('Insert returned no row');
    });
  });

  describe('getConversation', () => {
    it('returns conversation when found', async () => {
      const conv = { id: 'c1', org_id: 'org-1', user_id: 'u1', title: 'Test', created_at: new Date(), updated_at: null };
      vi.mocked(query).mockResolvedValue({ rows: [conv], rowCount: 1, command: '', oid: 0, fields: [] });

      const result = await getConversation('c1', 'org-1');

      expect(result).toEqual(conv);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND org_id = $2'),
        ['c1', 'org-1'],
      );
    });

    it('returns null when conversation not found', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      const result = await getConversation('c1', 'org-1');

      expect(result).toBeNull();
    });

    it('scopes query by org_id — prevents cross-org access', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      const result = await getConversation('c1', 'org-2');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('org_id = $2'),
        ['c1', 'org-2'],
      );
      expect(result).toBeNull();
    });
  });

  describe('listConversations', () => {
    it('returns conversations scoped by org and user', async () => {
      const convos = [
        { id: 'c1', org_id: 'org-1', user_id: 'u1', title: 'Chat 1', created_at: new Date(), updated_at: null },
      ];
      vi.mocked(query).mockResolvedValue({ rows: convos, rowCount: 1, command: '', oid: 0, fields: [] });

      const result = await listConversations('org-1', 'u1');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('org_id = $1 AND user_id = $2'),
        ['org-1', 'u1'],
      );
      expect(result).toEqual(convos);
    });
  });

  describe('addMessage', () => {
    it('inserts message and updates conversation updated_at', async () => {
      const msg = { id: 'm1', conversation_id: 'c1', role: 'user', content: 'Hello', token_count: 2, is_summary: false, created_at: new Date() };
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [msg], rowCount: 1, command: '', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] });

      const result = await addMessage('c1', 'user', 'Hello', 2);

      expect(result).toEqual(msg);
      expect(query).toHaveBeenCalledTimes(2);
      expect(query).toHaveBeenNthCalledWith(1,
        expect.stringContaining('INSERT INTO messages'),
        ['c1', 'user', 'Hello', 2, false],
      );
      expect(query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('UPDATE conversations SET updated_at'),
        ['c1'],
      );
    });
  });

  describe('getMessages', () => {
    it('returns empty array when conversation does not belong to org', async () => {
      // getConversation returns null
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });

      const result = await getMessages('c1', 'wrong-org');

      expect(result).toEqual([]);
    });

    it('returns messages when conversation belongs to org', async () => {
      const conv = { id: 'c1', org_id: 'org-1', user_id: 'u1', title: 'Test', created_at: new Date(), updated_at: null };
      const msgs = [
        { id: 'm1', conversation_id: 'c1', role: 'user', content: 'Hello', token_count: 2, is_summary: false, created_at: new Date() },
      ];
      vi.mocked(query)
        .mockResolvedValueOnce({ rows: [conv], rowCount: 1, command: '', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: msgs, rowCount: 1, command: '', oid: 0, fields: [] });

      const result = await getMessages('c1', 'org-1');

      expect(result).toEqual(msgs);
    });
  });

  describe('updateConversationTitle', () => {
    it('updates the conversation title', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 1, command: '', oid: 0, fields: [] });

      await updateConversationTitle('c1', 'New Title');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversations SET title'),
        ['New Title', 'c1'],
      );
    });
  });
});
