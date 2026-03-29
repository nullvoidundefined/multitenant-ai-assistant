import { beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted so these are available inside the hoisted vi.mock factory
const { mockStreamFn, mockStreamObj } = vi.hoisted(() => {
  const mockStreamObj = {
    on: vi.fn(),
    finalMessage: vi.fn(),
  };
  const mockStreamFn = vi.fn().mockReturnValue(mockStreamObj);
  return { mockStreamFn, mockStreamObj };
});

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      stream: mockStreamFn,
    },
  })),
}));

vi.mock('app/repositories/conversations/conversations.js', () => ({
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  addMessage: vi.fn(),
  getMessages: vi.fn(),
  updateConversationTitle: vi.fn(),
}));

vi.mock('app/repositories/orgs/orgs.js', () => ({
  getAssistantConfig: vi.fn(),
}));

vi.mock('app/utils/logs/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import * as conversationsRepo from 'app/repositories/conversations/conversations.js';
import * as orgsRepo from 'app/repositories/orgs/orgs.js';

import { streamChat } from './chat.service.js';

function setupMockStream(text: string) {
  mockStreamObj.on.mockImplementation((event: string, cb: (t: string) => void) => {
    if (event === 'text') cb(text);
    return mockStreamObj;
  });
  mockStreamObj.finalMessage.mockResolvedValue({
    usage: { input_tokens: 10, output_tokens: 5 },
  });
}

function setupBasicMocks(opts: { conversationId?: string } = {}) {
  const convId = opts.conversationId ?? 'conv-1';
  vi.mocked(conversationsRepo.createConversation).mockResolvedValue({
    id: convId, org_id: 'org-1', user_id: 'u1', title: null, created_at: new Date(), updated_at: null,
  });
  vi.mocked(conversationsRepo.addMessage).mockResolvedValue({
    id: 'm1', conversation_id: convId, role: 'user', content: 'Hello', token_count: 2, is_summary: false, created_at: new Date(),
  });
  vi.mocked(conversationsRepo.getMessages).mockResolvedValue([
    { id: 'm1', conversation_id: convId, role: 'user', content: 'Hello', token_count: 2, is_summary: false, created_at: new Date() },
  ]);
  vi.mocked(conversationsRepo.updateConversationTitle).mockResolvedValue(undefined);
}

describe('streamChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new conversation when no conversationId provided', async () => {
    vi.mocked(orgsRepo.getAssistantConfig).mockResolvedValue(null);
    setupBasicMocks({ conversationId: 'conv-new' });
    setupMockStream('Hi there!');

    const onToken = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    await streamChat(
      { orgId: 'org-1', userId: 'u1', message: 'Hello' },
      { onToken, onDone, onError },
    );

    expect(conversationsRepo.createConversation).toHaveBeenCalledWith('org-1', 'u1');
    expect(conversationsRepo.addMessage).toHaveBeenCalledWith('conv-new', 'user', 'Hello', 2);
    expect(onToken).toHaveBeenCalledWith('Hi there!');
    expect(onDone).toHaveBeenCalledWith('Hi there!', 'conv-new');
    expect(onError).not.toHaveBeenCalled();
  });

  it('errors when existing conversation not found for org', async () => {
    vi.mocked(orgsRepo.getAssistantConfig).mockResolvedValue(null);
    vi.mocked(conversationsRepo.getConversation).mockResolvedValue(null);

    const onToken = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    await streamChat(
      { orgId: 'org-1', userId: 'u1', message: 'Hello', conversationId: 'conv-foreign' },
      { onToken, onDone, onError },
    );

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Conversation not found' }));
    expect(onToken).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('uses org-specific system prompt when configured', async () => {
    vi.mocked(orgsRepo.getAssistantConfig).mockResolvedValue({
      system_prompt: 'You are a legal assistant.',
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      temperature: 0.5,
    });
    setupBasicMocks();
    setupMockStream('I can help with legal matters.');

    await streamChat(
      { orgId: 'org-1', userId: 'u1', message: 'Help me' },
      { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
    );

    expect(mockStreamFn).toHaveBeenCalledWith(
      expect.objectContaining({
        system: 'You are a legal assistant.',
        temperature: 0.5,
        max_tokens: 2048,
      }),
    );
  });

  it('uses default system prompt when no org config exists', async () => {
    vi.mocked(orgsRepo.getAssistantConfig).mockResolvedValue(null);
    setupBasicMocks();
    setupMockStream('Hello!');

    await streamChat(
      { orgId: 'org-1', userId: 'u1', message: 'Hello' },
      { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
    );

    expect(mockStreamFn).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('helpful AI assistant'),
      }),
    );
  });

  it('calls onError when stream throws', async () => {
    vi.mocked(orgsRepo.getAssistantConfig).mockResolvedValue(null);
    setupBasicMocks();
    mockStreamObj.on.mockReturnValue(mockStreamObj);
    mockStreamObj.finalMessage.mockRejectedValue(new Error('Rate limit exceeded'));

    const onError = vi.fn();

    await streamChat(
      { orgId: 'org-1', userId: 'u1', message: 'Hello' },
      { onToken: vi.fn(), onDone: vi.fn(), onError },
    );

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Rate limit exceeded' }));
  });

  it('filters system messages from Anthropic messages array', async () => {
    vi.mocked(orgsRepo.getAssistantConfig).mockResolvedValue(null);
    vi.mocked(conversationsRepo.createConversation).mockResolvedValue({
      id: 'conv-1', org_id: 'org-1', user_id: 'u1', title: null, created_at: new Date(), updated_at: null,
    });
    vi.mocked(conversationsRepo.addMessage).mockResolvedValue({
      id: 'm4', conversation_id: 'conv-1', role: 'user', content: 'New msg', token_count: 2, is_summary: false, created_at: new Date(),
    });
    vi.mocked(conversationsRepo.getMessages).mockResolvedValue([
      { id: 'm1', conversation_id: 'conv-1', role: 'system', content: 'Summary...', token_count: 10, is_summary: true, created_at: new Date() },
      { id: 'm2', conversation_id: 'conv-1', role: 'user', content: 'Hello', token_count: 2, is_summary: false, created_at: new Date() },
      { id: 'm3', conversation_id: 'conv-1', role: 'assistant', content: 'Hi!', token_count: 2, is_summary: false, created_at: new Date() },
      { id: 'm4', conversation_id: 'conv-1', role: 'user', content: 'New msg', token_count: 2, is_summary: false, created_at: new Date() },
    ]);
    setupMockStream('Response');
    vi.mocked(conversationsRepo.updateConversationTitle).mockResolvedValue(undefined);

    await streamChat(
      { orgId: 'org-1', userId: 'u1', message: 'New msg' },
      { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
    );

    const callArgs = mockStreamFn.mock.calls[0]?.[0] as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(callArgs.messages).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' },
      { role: 'user', content: 'New msg' },
    ]);
  });

  it('auto-generates conversation title for new conversations', async () => {
    vi.mocked(orgsRepo.getAssistantConfig).mockResolvedValue(null);
    setupBasicMocks();
    vi.mocked(conversationsRepo.getMessages).mockResolvedValue([
      { id: 'm1', conversation_id: 'conv-1', role: 'user', content: 'What is the meaning of life?', token_count: 7, is_summary: false, created_at: new Date() },
    ]);
    setupMockStream('42');

    await streamChat(
      { orgId: 'org-1', userId: 'u1', message: 'What is the meaning of life?' },
      { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
    );

    expect(conversationsRepo.updateConversationTitle).toHaveBeenCalledWith(
      'conv-1',
      'What is the meaning of life?',
    );
  });

  it('persists assistant response after streaming completes', async () => {
    vi.mocked(orgsRepo.getAssistantConfig).mockResolvedValue(null);
    setupBasicMocks();
    setupMockStream('A complete response');

    await streamChat(
      { orgId: 'org-1', userId: 'u1', message: 'Hello' },
      { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() },
    );

    // addMessage called twice: once for user message, once for assistant response
    expect(conversationsRepo.addMessage).toHaveBeenCalledTimes(2);
    expect(conversationsRepo.addMessage).toHaveBeenNthCalledWith(2,
      'conv-1',
      'assistant',
      'A complete response',
      expect.any(Number),
    );
  });
});
