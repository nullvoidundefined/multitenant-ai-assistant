import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/repositories/auth/auth.js', () => ({
  getSessionWithUser: vi.fn(),
}));

import * as authRepo from 'app/repositories/auth/auth.js';

import { loadSession, requireAuth } from './requireAuth.js';

function mockReq(overrides: Partial<Request> = {}): Request {
  return { cookies: {}, ...overrides } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('requireAuth middleware', () => {
  it('returns 401 when req.user is not set', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Authentication required' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when req.user is set', () => {
    const req = mockReq({
      user: {
        id: 'u1',
        email: 'a@b.com',
        first_name: 'A',
        last_name: 'B',
        created_at: new Date(),
        updated_at: null,
      },
    } as Partial<Request>);
    const res = mockRes();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('loadSession middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next without setting user when no session cookie present', async () => {
    const req = mockReq({ cookies: {} });
    const res = mockRes();
    const next = vi.fn();

    await loadSession(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('calls next without setting user when cookie is not a string', async () => {
    const req = mockReq({ cookies: { sid: 123 } } as unknown as Partial<Request>);
    const res = mockRes();
    const next = vi.fn();

    await loadSession(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('sets req.user when session is valid', async () => {
    const user = {
      id: 'u1',
      email: 'test@test.com',
      first_name: 'Test',
      last_name: 'User',
      created_at: new Date(),
      updated_at: null,
    };
    vi.mocked(authRepo.getSessionWithUser).mockResolvedValue(user);

    const req = mockReq({ cookies: { sid: 'valid-token' } });
    const res = mockRes();
    const next = vi.fn();

    await loadSession(req, res, next);

    expect(authRepo.getSessionWithUser).toHaveBeenCalledWith('valid-token');
    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalled();
  });

  it('does not set req.user when session is expired/invalid', async () => {
    vi.mocked(authRepo.getSessionWithUser).mockResolvedValue(null);

    const req = mockReq({ cookies: { sid: 'expired-token' } });
    const res = mockRes();
    const next = vi.fn();

    await loadSession(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('calls next(err) when repository throws', async () => {
    const error = new Error('DB connection failed');
    vi.mocked(authRepo.getSessionWithUser).mockRejectedValue(error);

    const req = mockReq({ cookies: { sid: 'valid-token' } });
    const res = mockRes();
    const next: NextFunction = vi.fn();

    await loadSession(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
