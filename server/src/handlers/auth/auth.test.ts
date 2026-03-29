import * as authRepo from 'app/repositories/auth/auth.js';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { login, logout, me, register } from './auth.js';

vi.mock('app/repositories/auth/auth.js', () => ({
  createUserAndSession: vi.fn(),
  findUserByEmail: vi.fn(),
  verifyPassword: vi.fn(),
  loginUser: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock('app/config/env.js', () => ({
  isProduction: vi.fn(() => false),
}));

vi.mock('app/utils/logs/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    cookies: {},
    ip: '127.0.0.1',
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('register handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for invalid input', async () => {
    const req = mockReq({ body: { email: 'bad' } });
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 201 with user on successful registration', async () => {
    const user = {
      id: 'u1',
      email: 'test@test.com',
      first_name: 'Test',
      last_name: 'User',
      created_at: new Date('2024-01-01'),
    };
    vi.mocked(authRepo.createUserAndSession).mockResolvedValue({
      user: { ...user, updated_at: null },
      sessionId: 'session-123',
    });

    const req = mockReq({
      body: {
        email: 'test@test.com',
        password: 'securepass123',
        first_name: 'Test',
        last_name: 'User',
      },
    });
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.cookie).toHaveBeenCalledWith(
      'sid',
      'session-123',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.json).toHaveBeenCalledWith({
      user: expect.objectContaining({ id: 'u1', email: 'test@test.com' }),
    });
  });

  it('returns 409 when email already exists', async () => {
    vi.mocked(authRepo.createUserAndSession).mockRejectedValue({
      code: '23505',
    });

    const req = mockReq({
      body: {
        email: 'existing@test.com',
        password: 'securepass123',
        first_name: 'Test',
        last_name: 'User',
      },
    });
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Email already registered' },
    });
  });
});

describe('login handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for invalid input', async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 401 when user not found', async () => {
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue(null);

    const req = mockReq({
      body: { email: 'no@test.com', password: 'pass1234' },
    });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when password is wrong', async () => {
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      first_name: 'Test',
      last_name: 'User',
      password_hash: 'hashed',
      created_at: new Date(),
      updated_at: null,
    });
    vi.mocked(authRepo.verifyPassword).mockResolvedValue(false);

    const req = mockReq({
      body: { email: 'test@test.com', password: 'wrongpass' },
    });
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns user and sets cookie on successful login', async () => {
    vi.mocked(authRepo.findUserByEmail).mockResolvedValue({
      id: 'u1',
      email: 'test@test.com',
      first_name: 'Test',
      last_name: 'User',
      password_hash: 'hashed',
      created_at: new Date(),
      updated_at: null,
    });
    vi.mocked(authRepo.verifyPassword).mockResolvedValue(true);
    vi.mocked(authRepo.loginUser).mockResolvedValue('new-session');

    const req = mockReq({
      body: { email: 'test@test.com', password: 'rightpass' },
    });
    const res = mockRes();

    await login(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'sid',
      'new-session',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(res.json).toHaveBeenCalledWith({
      user: expect.objectContaining({ id: 'u1' }),
    });
  });
});

describe('logout handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears cookie and returns 204', async () => {
    vi.mocked(authRepo.deleteSession).mockResolvedValue(true);

    const req = mockReq({ cookies: { sid: 'my-session' } });
    const res = mockRes();

    await logout(req, res);

    expect(authRepo.deleteSession).toHaveBeenCalledWith('my-session');
    expect(res.clearCookie).toHaveBeenCalledWith('sid', { path: '/' });
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('still clears cookie when no session cookie exists', async () => {
    const req = mockReq({ cookies: {} });
    const res = mockRes();

    await logout(req, res);

    expect(authRepo.deleteSession).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('me handler', () => {
  it('returns req.user', async () => {
    const user = {
      id: 'u1',
      email: 'test@test.com',
      first_name: 'Test',
      last_name: 'User',
      created_at: new Date(),
      updated_at: null,
    };
    const req = mockReq({ user } as Partial<Request>);
    const res = mockRes();

    await me(req, res);

    expect(res.json).toHaveBeenCalledWith({ user });
  });
});
