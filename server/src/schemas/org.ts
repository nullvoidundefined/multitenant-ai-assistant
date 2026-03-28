import { z } from 'zod';

export const createOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(100),
});

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(10_000),
  conversation_id: z.string().uuid().optional(),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
