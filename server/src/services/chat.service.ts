import Anthropic from "@anthropic-ai/sdk";

import * as conversationsRepo from "app/repositories/conversations/conversations.js";
import * as orgsRepo from "app/repositories/orgs/orgs.js";
import { DEFAULT_SYSTEM_PROMPT } from "app/prompts/default-system-prompt.js";
import { logger } from "app/utils/logs/logger.js";

const anthropic = new Anthropic();

// Rough token estimation: ~4 chars per token
function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

interface ChatParams {
    orgId: string;
    userId: string;
    message: string;
    conversationId?: string;
}

interface StreamCallbacks {
    onToken: (token: string) => void;
    onDone: (fullResponse: string, conversationId: string) => void;
    onError: (error: Error) => void;
}

export async function streamChat(
    params: ChatParams,
    callbacks: StreamCallbacks,
): Promise<void> {
    const { orgId, userId, message, conversationId: existingConvId } = params;

    // Load org assistant config
    const config = await orgsRepo.getAssistantConfig(orgId);
    const systemPrompt = config?.system_prompt ?? DEFAULT_SYSTEM_PROMPT;
    const model = config?.model ?? "claude-sonnet-4-20250514";
    const maxTokens = config?.max_tokens ?? 4096;
    const temperature = config?.temperature ?? 0.7;

    // Get or create conversation
    let conversationId = existingConvId;
    if (!conversationId) {
        const conv = await conversationsRepo.createConversation(orgId, userId);
        conversationId = conv.id;
    } else {
        // Verify conversation belongs to this org
        const conv = await conversationsRepo.getConversation(conversationId, orgId);
        if (!conv) {
            callbacks.onError(new Error("Conversation not found"));
            return;
        }
    }

    // Persist the user message
    await conversationsRepo.addMessage(
        conversationId,
        "user",
        message,
        estimateTokens(message),
    );

    // Load conversation history
    const messages = await conversationsRepo.getMessages(conversationId, orgId);

    // Build Anthropic messages array from history (exclude system messages)
    const anthropicMessages: Anthropic.MessageParam[] = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
        }));

    // Stream the response
    let fullResponse = "";

    try {
        const stream = anthropic.messages.stream({
            model,
            max_tokens: maxTokens,
            temperature,
            system: systemPrompt,
            messages: anthropicMessages,
        });

        stream.on("text", (text) => {
            fullResponse += text;
            callbacks.onToken(text);
        });

        await stream.finalMessage();

        // Persist assistant response
        await conversationsRepo.addMessage(
            conversationId,
            "assistant",
            fullResponse,
            estimateTokens(fullResponse),
        );

        // Auto-generate title for new conversations
        if (!existingConvId && fullResponse.length > 0) {
            const title = message.slice(0, 80) + (message.length > 80 ? "..." : "");
            await conversationsRepo.updateConversationTitle(conversationId, title);
        }

        callbacks.onDone(fullResponse, conversationId);
    } catch (err) {
        logger.error({ err, orgId, conversationId }, "Chat stream error");
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
}
