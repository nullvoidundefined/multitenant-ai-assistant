import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { notFoundHandler } from './notFoundHandler.js';

describe('notFoundHandler', () => {
  it('returns 404 with "Not found" message', () => {
    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: { message: 'Not found' } });
  });
});
