# App 5: Multi-tenant AI Assistant

Each organization gets its own AI assistant with isolated conversations, configurable system prompts, per-tenant knowledge base (RAG), and role-based member access.

## Key AI pattern

Multi-tenant context scoping + conversation summarization when token budget is exceeded. Prompt assembly: system prompt → summary → recent messages → knowledge chunks → user message.

## Stack

- Monorepo: `packages/api`, `packages/worker`, `packages/web`, `packages/common`
- Next.js on Vercel, Express + BullMQ worker on Railway
- PostgreSQL + pgvector on Neon, Redis on Railway
- Cloudflare R2 for knowledge base documents
- Resend for invitation emails
- Reuses chunker from app 4

## Spec

Read `FULL_APPLICATION_SPEC.md` for full system design, DB schema, and task breakdown.

## Build order

POC → create org, start conversation, get response with org system prompt → then knowledge base RAG → then member management → then frontend.
