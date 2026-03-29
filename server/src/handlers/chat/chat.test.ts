import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('app/repositories/conversations/conversations.js', () => ({
  listConversations: vi.fn(),
  getMessages: vi.fn(),
}));

vi.mock('app/services/chat.service.js', () => ({
  streamChat: vi.fn(),
}));

import * as conversationsRepo from 'app/repositories/conversations/conversations.js';
import { streamChat } from 'app/services/chat.service.js';

import { chat, getMessages, listConversations } from './chat.js';

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
    setHeader: vi.fn().mockReturnThis(),
    flushHeaders: vi.fn(),
    write: vi.fn(),
    end: vi.fn(),
  } as unknown as Response;
  return res;
}

describe('chat handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for invalid input', async () => {
    const req = mockReq({ body: { message: '' } });
    const res = mockRes();

    await chat(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('sets SSE headers and calls streamChat for valid input', async () => {
    vi.mocked(streamChat).mockResolvedValue(undefined);

    const req = mockReq({ body: { message: 'Hello AI' } });
    const res = mockRes();

    await chat(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.flushHeaders).toHaveBeenCalled();
    expect(streamChat).toHaveBeenCalledWith(
      { orgId: 'org-1', userId: 'u1', message: 'Hello AI', conversationId: undefined },
      expect.objectContaining({
        onToken: expect.any(Function),
        onDone: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });
});

describe('listConversations handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns conversations for org and user', async () => {
    const convos = [
      { id: 'c1', org_id: 'org-1', user_id: 'u1', title: 'Chat 1', created_at: new Date(), updated_at: null },
    ];
    vi.mocked(conversationsRepo.listConversations).mockResolvedValue(convos);

    const req = mockReq();
    const res = mockRes();

    await listConversations(req, res);

    expect(conversationsRepo.listConversations).toHaveBeenCalledWith('org-1', 'u1');
    expect(res.json).toHaveBeenCalledWith({ data: convos });
  });
});

describe('getMessages handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when conversationId is missing', async () => {
    const req = mockReq({ params: {} });
    const res = mockRes();

    await getMessages(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns messages for valid conversationId', async () => {
    const msgs = [
      { id: 'm1', conversation_id: 'c1', role: 'user' as const, content: 'Hi', token_count: 1, is_summary: false, created_at: new Date() },
    ];
    vi.mocked(conversationsRepo.getMessages).mockResolvedValue(msgs);

    const req = mockReq({ params: { conversationId: 'c1' } });
    const res = mockRes();

    await getMessages(req, res);

    expect(conversationsRepo.getMessages).toHaveBeenCalledWith('c1', 'org-1');
    expect(res.json).toHaveBeenCalledWith({ data: msgs });
  });
});
