import { query, withTransaction } from 'app/db/pool/pool.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createOrg,
  getAssistantConfig,
  getMembership,
  getOrgById,
  getUserOrgs,
  listMembers,
} from './orgs.js';

vi.mock('app/db/pool/pool.js', () => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock('app/prompts/default-system-prompt.js', () => ({
  DEFAULT_SYSTEM_PROMPT: 'Default prompt for testing',
}));

describe('orgs repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrg', () => {
    it('creates org, adds creator as admin, and creates assistant config', async () => {
      const org = {
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org-abc',
        created_at: new Date(),
        updated_at: null,
      };
      vi.mocked(withTransaction).mockImplementation(async (fn) => {
        const client = {} as never;
        return fn(client);
      });
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [org],
          rowCount: 1,
          command: '',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: '',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
          command: '',
          oid: 0,
          fields: [],
        });

      const result = await createOrg('Test Org', 'u1');

      expect(result).toEqual(org);
      // Verify all three queries were called (INSERT org, INSERT member, INSERT config)
      expect(query).toHaveBeenCalledTimes(3);
      expect(query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO organizations'),
        expect.arrayContaining(['Test Org']),
        expect.anything(),
      );
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('INSERT INTO org_members'),
        expect.arrayContaining(['u1']),
        expect.anything(),
      );
      expect(query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('INSERT INTO assistant_configs'),
        expect.arrayContaining(['Default prompt for testing']),
        expect.anything(),
      );
    });
  });

  describe('getOrgById', () => {
    it('returns org when found', async () => {
      const org = {
        id: 'org-1',
        name: 'Test',
        slug: 'test',
        created_at: new Date(),
        updated_at: null,
      };
      vi.mocked(query).mockResolvedValue({
        rows: [org],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const result = await getOrgById('org-1');

      expect(result).toEqual(org);
    });

    it('returns null when not found', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: [],
      });

      const result = await getOrgById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserOrgs', () => {
    it('returns orgs with role for user', async () => {
      const orgs = [
        {
          id: 'org-1',
          name: 'Org 1',
          slug: 'org-1',
          role: 'admin',
          created_at: new Date(),
          updated_at: null,
        },
      ];
      vi.mocked(query).mockResolvedValue({
        rows: orgs,
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const result = await getUserOrgs('u1');

      expect(result).toEqual(orgs);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INNER JOIN org_members'),
        ['u1'],
      );
    });
  });

  describe('getMembership', () => {
    it('returns membership when user belongs to org', async () => {
      const membership = {
        org_id: 'org-1',
        user_id: 'u1',
        role: 'admin',
        joined_at: new Date(),
      };
      vi.mocked(query).mockResolvedValue({
        rows: [membership],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const result = await getMembership('org-1', 'u1');

      expect(result).toEqual(membership);
    });

    it('returns null when user does not belong to org', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: [],
      });

      const result = await getMembership('org-1', 'u-stranger');

      expect(result).toBeNull();
    });
  });

  describe('listMembers', () => {
    it('returns members for org', async () => {
      const members = [
        {
          user_id: 'u1',
          email: 'a@b.com',
          role: 'admin',
          joined_at: '2024-01-01',
        },
        {
          user_id: 'u2',
          email: 'c@d.com',
          role: 'member',
          joined_at: '2024-01-02',
        },
      ];
      vi.mocked(query).mockResolvedValue({
        rows: members,
        rowCount: 2,
        command: '',
        oid: 0,
        fields: [],
      });

      const result = await listMembers('org-1');

      expect(result).toEqual(members);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE om.org_id = $1'),
        ['org-1'],
      );
    });
  });

  describe('getAssistantConfig', () => {
    it('returns config when it exists', async () => {
      const config = {
        system_prompt: 'You are a bot.',
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.7,
      };
      vi.mocked(query).mockResolvedValue({
        rows: [config],
        rowCount: 1,
        command: '',
        oid: 0,
        fields: [],
      });

      const result = await getAssistantConfig('org-1');

      expect(result).toEqual(config);
    });

    it('returns null when no config exists', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: [],
      });

      const result = await getAssistantConfig('org-no-config');

      expect(result).toBeNull();
    });
  });
});
