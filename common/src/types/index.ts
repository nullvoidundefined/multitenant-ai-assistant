export interface User {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    created_at: Date;
    updated_at: Date | null;
}

export type OrgRole = "admin" | "member" | "viewer";

export interface Organization {
    id: string;
    name: string;
    slug: string;
    created_at: Date;
    updated_at: Date | null;
}

export interface OrgMember {
    org_id: string;
    user_id: string;
    role: OrgRole;
    joined_at: Date;
}

export interface Conversation {
    id: string;
    org_id: string;
    user_id: string;
    title: string | null;
    created_at: Date;
    updated_at: Date | null;
}

export interface Message {
    id: string;
    conversation_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    token_count: number | null;
    is_summary: boolean;
    created_at: Date;
}

export interface AssistantConfig {
    id: string;
    org_id: string;
    system_prompt: string;
    model: string;
    max_tokens: number;
    temperature: number;
}

export interface Invitation {
    id: string;
    org_id: string;
    email: string;
    role: OrgRole;
    token: string;
    status: "pending" | "accepted" | "declined" | "expired";
    invited_by: string;
    expires_at: Date;
    created_at: Date;
}

export interface KnowledgeDoc {
    id: string;
    org_id: string;
    filename: string;
    r2_key: string;
    status: "pending" | "processing" | "ready" | "failed";
    total_chunks: number | null;
    created_at: Date;
    updated_at: Date | null;
}

export interface KnowledgeChunk {
    id: string;
    doc_id: string;
    org_id: string;
    content: string;
    embedding: number[];
    created_at: Date;
}
