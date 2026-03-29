import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

vi.mock('app/utils/logs/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { errorHandler } from './errorHandler.js';

function mockReq(): Request {
  return { id: 'req-1' } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('errorHandler', () => {
  it('returns 500 with error message in non-production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const err = new Error('Something broke');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Something broke' },
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('returns generic message in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Secret internal details');
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Internal server error' },
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('handles non-Error objects', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = 'string error';
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Internal server error' },
    });

    process.env.NODE_ENV = originalEnv;
  });
});
