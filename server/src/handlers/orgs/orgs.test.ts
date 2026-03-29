import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/repositories/orgs/orgs.js', () => ({
  createOrg: vi.fn(),
  getUserOrgs: vi.fn(),
  getOrgById: vi.fn(),
  listMembers: vi.fn(),
}));

import * as orgsRepo from 'app/repositories/orgs/orgs.js';

import { createOrg, getOrg, listMembers, listOrgs } from './orgs.js';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    user: { id: 'u1', email: 'a@b.com', first_name: 'A', last_name: 'B', created_at: new Date(), updated_at: null },
    orgMembership: { orgId: 'org-1', role: 'admin' as const },
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('createOrg handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for invalid input', async () => {
    const req = mockReq({ body: { name: '' } });
    const res = mockRes();

    await createOrg(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with created org', async () => {
    const org = { id: 'org-1', name: 'My Org', slug: 'my-org-abc', created_at: new Date(), updated_at: null };
    vi.mocked(orgsRepo.createOrg).mockResolvedValue(org);

    const req = mockReq({ body: { name: 'My Org' } });
    const res = mockRes();

    await createOrg(req, res);

    expect(orgsRepo.createOrg).toHaveBeenCalledWith('My Org', 'u1');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ data: org });
  });
});

describe('listOrgs handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns list of orgs for user', async () => {
    const orgs = [
      { id: 'org-1', name: 'Org 1', slug: 'org-1', role: 'admin' as const, created_at: new Date(), updated_at: null },
    ];
    vi.mocked(orgsRepo.getUserOrgs).mockResolvedValue(orgs);

    const req = mockReq();
    const res = mockRes();

    await listOrgs(req, res);

    expect(res.json).toHaveBeenCalledWith({ data: orgs });
  });
});

describe('getOrg handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns org data when found', async () => {
    const org = { id: 'org-1', name: 'My Org', slug: 'my-org', created_at: new Date(), updated_at: null };
    vi.mocked(orgsRepo.getOrgById).mockResolvedValue(org);

    const req = mockReq();
    const res = mockRes();

    await getOrg(req, res);

    expect(res.json).toHaveBeenCalledWith({ data: org });
  });

  it('returns 404 when org not found', async () => {
    vi.mocked(orgsRepo.getOrgById).mockResolvedValue(null);

    const req = mockReq();
    const res = mockRes();

    await getOrg(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('listMembers handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns members list', async () => {
    const members = [
      { user_id: 'u1', email: 'a@b.com', role: 'admin', joined_at: '2024-01-01' },
    ];
    vi.mocked(orgsRepo.listMembers).mockResolvedValue(members);

    const req = mockReq();
    const res = mockRes();

    await listMembers(req, res);

    expect(res.json).toHaveBeenCalledWith({ data: members });
  });
});
