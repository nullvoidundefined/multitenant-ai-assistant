'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { API_BASE } from '@/lib/api';

import styles from './chat.module.scss';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatPage() {
    const params = useParams();
    const orgId = params.orgId as string;
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [streaming, setStreaming] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            if (!input.trim() || streaming) return;

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
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
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
        [input, streaming, orgId, conversationId],
    );

    if (authLoading) {
        return <div className={styles.container}><p>Loading...</p></div>;
    }

    if (!user) {
        router.push('/login');
        return null;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <a href="/orgs" className={styles.backLink}>
                    &larr; Organizations
                </a>
                <button
                    className={styles.newChatButton}
                    onClick={() => {
                        setMessages([]);
                        setConversationId(null);
                    }}
                >
                    New Chat
                </button>
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
    );
}
