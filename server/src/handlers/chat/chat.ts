import * as conversationsRepo from 'app/repositories/conversations/conversations.js';
import { chatMessageSchema } from 'app/schemas/org.js';
import { streamChat } from 'app/services/chat.service.js';
import type { Request, Response } from 'express';

export async function chat(req: Request, res: Response): Promise<void> {
  const parsed = chatMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join('; ');
    res.status(400).json({ error: { message } });
    return;
  }

  const orgId = req.orgMembership!.orgId;
  const userId = req.user!.id;

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  await streamChat(
    {
      orgId,
      userId,
      message: parsed.data.message,
      conversationId: parsed.data.conversation_id,
    },
    {
      onToken(token) {
        res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
      },
      onDone(fullResponse, conversationId) {
        res.write(
          `data: ${JSON.stringify({ type: 'done', conversation_id: conversationId })}\n\n`,
        );
        res.end();
      },
      onError(error) {
        res.write(
          `data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`,
        );
        res.end();
      },
    },
  );
}

export async function listConversations(
  req: Request,
  res: Response,
): Promise<void> {
  const orgId = req.orgMembership!.orgId;
  const userId = req.user!.id;
  const conversations = await conversationsRepo.listConversations(
    orgId,
    userId,
  );
  res.json({ data: conversations });
}

export async function getMessages(req: Request, res: Response): Promise<void> {
  const orgId = req.orgMembership!.orgId;
  const conversationId = req.params.conversationId as string | undefined;
  if (!conversationId) {
    res.status(400).json({ error: { message: 'Missing conversationId' } });
    return;
  }
  const messages = await conversationsRepo.getMessages(conversationId, orgId);
  res.json({ data: messages });
}
