import { query } from 'app/db/pool/pool.js';
import type { Conversation, Message } from 'multitenant-common';

export async function createConversation(
  orgId: string,
  userId: string,
  title?: string,
): Promise<Conversation> {
  const result = await query<Conversation>(
    `INSERT INTO conversations (org_id, user_id, title)
         VALUES ($1, $2, $3)
         RETURNING *`,
    [orgId, userId, title ?? null],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Insert returned no row');
  return row;
}

export async function getConversation(
  conversationId: string,
  orgId: string,
): Promise<Conversation | null> {
  const result = await query<Conversation>(
    `SELECT * FROM conversations
         WHERE id = $1 AND org_id = $2`,
    [conversationId, orgId],
  );
  return result.rows[0] ?? null;
}

export async function listConversations(
  orgId: string,
  userId: string,
): Promise<Conversation[]> {
  const result = await query<Conversation>(
    `SELECT * FROM conversations
         WHERE org_id = $1 AND user_id = $2
         ORDER BY updated_at DESC NULLS LAST, created_at DESC`,
    [orgId, userId],
  );
  return result.rows;
}

export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  tokenCount?: number,
  isSummary = false,
): Promise<Message> {
  const result = await query<Message>(
    `INSERT INTO messages (conversation_id, role, content, token_count, is_summary)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
    [conversationId, role, content, tokenCount ?? null, isSummary],
  );

  // Update conversation updated_at
  await query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [
    conversationId,
  ]);

  const row = result.rows[0];
  if (!row) throw new Error('Insert returned no row');
  return row;
}

export async function getMessages(
  conversationId: string,
  orgId: string,
): Promise<Message[]> {
  // Verify conversation belongs to org
  const conv = await getConversation(conversationId, orgId);
  if (!conv) return [];

  const result = await query<Message>(
    `SELECT * FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC`,
    [conversationId],
  );
  return result.rows;
}

export async function updateConversationTitle(
  conversationId: string,
  title: string,
): Promise<void> {
  await query(`UPDATE conversations SET title = $1 WHERE id = $2`, [
    title,
    conversationId,
  ]);
}
