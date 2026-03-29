import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/repositories/orgs/orgs.js', () => ({
  getMembership: vi.fn(),
}));

import * as orgsRepo from 'app/repositories/orgs/orgs.js';

import { orgMembership, requireRole } from './orgMembership.js';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    user: undefined,
    orgMembership: undefined,
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

describe('orgMembership middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', () => {
    const req = mockReq({ user: undefined, params: { orgId: 'org-1' } });
    const res = mockRes();
    const next = vi.fn();

    orgMembership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Authentication required' },
    });
  });

  it('returns 400 when orgId param is missing', () => {
    const req = mockReq({
      user: { id: 'u1', email: 'a@b.com', first_name: 'A', last_name: 'B', created_at: new Date(), updated_at: null },
      params: {},
    });
    const res = mockRes();
    const next = vi.fn();

    orgMembership(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 403 when user is not a member of the org', async () => {
    vi.mocked(orgsRepo.getMembership).mockResolvedValue(null);

    const req = mockReq({
      user: { id: 'u1', email: 'a@b.com', first_name: 'A', last_name: 'B', created_at: new Date(), updated_at: null },
      params: { orgId: 'org-1' },
    });
    const res = mockRes();
    const next = vi.fn();

    orgMembership(req, res, next);

    // Wait for the promise to resolve
    await vi.waitFor(() => {
      expect(res.status).toHaveBeenCalledWith(403);
    });
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Not a member of this organization' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.orgMembership and calls next when user is a member', async () => {
    vi.mocked(orgsRepo.getMembership).mockResolvedValue({
      org_id: 'org-1',
      user_id: 'u1',
      role: 'admin',
      joined_at: new Date(),
    });

    const req = mockReq({
      user: { id: 'u1', email: 'a@b.com', first_name: 'A', last_name: 'B', created_at: new Date(), updated_at: null },
      params: { orgId: 'org-1' },
    });
    const res = mockRes();
    const next = vi.fn();

    orgMembership(req, res, next);

    await vi.waitFor(() => {
      expect(next).toHaveBeenCalled();
    });
    expect(req.orgMembership).toEqual({ orgId: 'org-1', role: 'admin' });
  });

  it('calls next(err) when repository throws', async () => {
    const error = new Error('DB error');
    vi.mocked(orgsRepo.getMembership).mockRejectedValue(error);

    const req = mockReq({
      user: { id: 'u1', email: 'a@b.com', first_name: 'A', last_name: 'B', created_at: new Date(), updated_at: null },
      params: { orgId: 'org-1' },
    });
    const res = mockRes();
    const next: NextFunction = vi.fn();

    orgMembership(req, res, next);

    await vi.waitFor(() => {
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});

describe('requireRole middleware', () => {
  it('returns 403 when orgMembership is not set', () => {
    const middleware = requireRole('admin');
    const req = mockReq({ orgMembership: undefined });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Organization membership required' },
    });
  });

  it('returns 403 when user role is not in allowed list', () => {
    const middleware = requireRole('admin');
    const req = mockReq({ orgMembership: { orgId: 'org-1', role: 'member' } });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Requires one of: admin' },
    });
  });

  it('calls next when user has admin role', () => {
    const middleware = requireRole('admin');
    const req = mockReq({ orgMembership: { orgId: 'org-1', role: 'admin' } });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts multiple allowed roles', () => {
    const middleware = requireRole('admin', 'member');
    const req = mockReq({ orgMembership: { orgId: 'org-1', role: 'member' } });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('rejects viewer when only admin and member are allowed', () => {
    const middleware = requireRole('admin', 'member');
    const req = mockReq({ orgMembership: { orgId: 'org-1', role: 'viewer' } });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
