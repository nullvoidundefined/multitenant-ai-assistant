'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';
import { get, API_BASE } from '@/lib/api';

import styles from './chat.module.scss';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface Conversation {
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string | null;
}

interface ApiMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
        return 'just now';
    }
    if (diffMins < 60) {
        return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
        return `${diffDays}d ago`;
    }
    return date.toLocaleDateString();
}

export default function ChatPage() {
    const params = useParams();
    const orgId = params.orgId as string;
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const queryClient = useQueryClient();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: conversationsData } = useQuery({
        queryKey: ['conversations', orgId],
        queryFn: () => get<{ data: Conversation[] }>(`/orgs/${orgId}/conversations`),
        enabled: !!user && !!orgId,
    });

    const conversations = conversationsData?.data ?? [];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadConversation = useCallback(
        async (conv: Conversation) => {
            if (streaming) return;
            setConversationId(conv.id);
            const res = await get<{ data: ApiMessage[] }>(
                `/orgs/${orgId}/conversations/${conv.id}/messages`,
            );
            const filtered = res.data
                .filter((m) => m.role === 'user' || m.role === 'assistant')
                .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
            setMessages(filtered);
        },
        [orgId, streaming],
    );

    const startNewChat = useCallback(() => {
        setMessages([]);
        setConversationId(null);
    }, []);

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            if (!input.trim() || streaming) {
                return;
            }

            const userMessage = input.trim();
            setInput('');
            setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
            setStreaming(true);

            // Add empty assistant message to stream into
            setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

            try {
                const res = await fetch(`${API_BASE}/orgs/${orgId}/chat`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({
                        message: userMessage,
                        conversation_id: conversationId ?? undefined,
                    }),
                });

                if (!res.ok || !res.body) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body?.error?.message ?? 'Chat request failed');
                }

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) {
                            continue;
                        }
                        const data = line.slice(6);
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.type === 'token') {
                                setMessages((prev) => {
                                    const updated = [...prev];
                                    const last = updated[updated.length - 1];
                                    if (last && last.role === 'assistant') {
                                        updated[updated.length - 1] = {
                                            ...last,
                                            content: last.content + parsed.token,
                                        };
                                    }
                                    return updated;
                                });
                            } else if (parsed.type === 'done') {
                                if (parsed.conversation_id) {
                                    setConversationId(parsed.conversation_id);
                                }
                                // Refresh conversation list
                                void queryClient.invalidateQueries({
                                    queryKey: ['conversations', orgId],
                                });
                            } else if (parsed.type === 'error') {
                                setMessages((prev) => {
                                    const updated = [...prev];
                                    const last = updated[updated.length - 1];
                                    if (last && last.role === 'assistant') {
                                        updated[updated.length - 1] = {
                                            ...last,
                                            content: `Error: ${parsed.message}`,
                                        };
                                    }
                                    return updated;
                                });
                            }
                        } catch {
                            // Skip malformed JSON
                        }
                    }
                }
            } catch (err) {
                setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === 'assistant' && !last.content) {
                        updated[updated.length - 1] = {
                            ...last,
                            content: err instanceof Error ? err.message : 'Something went wrong',
                        };
                    }
                    return updated;
                });
            } finally {
                setStreaming(false);
            }
        },
        [input, streaming, orgId, conversationId, queryClient],
    );

    if (authLoading) {
        return (
            <div className={styles.container}>
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        router.push('/login');
        return null;
    }

    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <a href="/orgs" className={styles.backLink}>
                        &larr; Organizations
                    </a>
                    <button className={styles.newChatButton} onClick={startNewChat}>
                        New Chat
                    </button>
                </div>

                <div className={styles.conversationList}>
                    {conversations.length === 0 && (
                        <p className={styles.noConversations}>No conversations yet</p>
                    )}
                    {conversations.map((conv, idx) => (
                        <button
                            key={conv.id}
                            className={`${styles.convItem} ${conv.id === conversationId ? styles.convItemActive : ''}`}
                            onClick={() => void loadConversation(conv)}
                        >
                            <span className={styles.convTitle}>
                                {conv.title?.trim() || `Conversation ${conversations.length - idx}`}
                            </span>
                            <span className={styles.convTime}>
                                {formatRelativeTime(conv.updated_at ?? conv.created_at)}
                            </span>
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main chat area */}
            <div className={styles.chatArea}>
                <div className={styles.chatHeader}>
                    <span className={styles.chatHeaderTitle}>
                        {conversationId
                            ? (() => {
                                  const idx = conversations.findIndex(
                                      (c) => c.id === conversationId,
                                  );
                                  const conv = conversations[idx];
                                  return conv?.title?.trim() ||
                                      `Conversation ${conversations.length - idx}`;
                              })()
                            : 'New Conversation'}
                    </span>
                    <a
                        href={`/orgs/${orgId}/settings`}
                        className={styles.settingsLink}
                    >
                        Settings
                    </a>
                </div>

                <div className={styles.messageList}>
                    {messages.length === 0 && (
                        <div className={styles.emptyState}>
                            <p>Start a conversation with your organization&apos;s AI assistant.</p>
                        </div>
                    )}
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`${styles.message} ${msg.role === 'user' ? styles.user : styles.assistant}`}
                        >
                            <div className={styles.bubble}>
                                {msg.content.split('\n').map((line, j) => (
                                    <p key={j}>{line || '\u00A0'}</p>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <form className={styles.inputArea} onSubmit={handleSubmit}>
                    <input
                        className={styles.chatInput}
                        type="text"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={streaming}
                    />
                    <button
                        className={styles.sendButton}
                        type="submit"
                        disabled={streaming || !input.trim()}
                    >
                        {streaming ? 'Sending...' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
}
