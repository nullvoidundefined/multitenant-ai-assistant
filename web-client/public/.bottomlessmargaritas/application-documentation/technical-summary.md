# Multi-tenant AI Assistant — Technical Summary

## Architecture

The Multi-tenant AI Assistant is a three-service monorepo deployed across Vercel, Railway, and Neon. The **Express 5 API server** handles authentication, organization management, and real-time AI chat streaming via Server-Sent Events. A **BullMQ worker** process (currently a placeholder for future knowledge-base processing and conversation summarization) runs as a separate Railway service. The **Next.js 15 frontend** on Vercel provides the UI for organization management, chat, and settings.

Every request flows through a layered middleware stack: Helmet security headers, CORS locked to the frontend origin, Pino request logging, rate limiting, JSON body parsing, cookie parsing, double-submit CSRF protection via `csrf-csrf`, and session loading. Organization-scoped routes add a membership validation middleware that checks the `org_members` table before any handler executes.

Tenant isolation is enforced at three independent layers. The `orgMembership` middleware rejects non-members with 403. Every repository query includes `org_id` as a parameter, preventing cross-tenant data access. Foreign key constraints with cascading deletes ensure referential integrity at the database level.

## Stack

| Layer           | Technology            | Version                  | Notes                                                 |
| --------------- | --------------------- | ------------------------ | ----------------------------------------------------- |
| Frontend        | Next.js               | 15.x                     | App Router, React 19, server/client components        |
| Client state    | TanStack React Query  | 5.x                      | Server state caching, cache invalidation              |
| API server      | Express               | 5.x                      | Async error propagation, no try/catch needed          |
| Runtime         | Node.js               | >= 22.0                  | Required by both server and worker                    |
| Language        | TypeScript            | 5.x                      | Strict mode across all packages                       |
| Database        | PostgreSQL + pgvector | 13+                      | Neon serverless, UUID primary keys                    |
| Cache/Queue     | Redis + BullMQ        | --                       | Railway Redis, ioredis client                         |
| LLM             | Anthropic Claude      | claude-sonnet-4-20250514 | Streaming SDK with AbortController                    |
| Auth            | Custom sessions       | --                       | bcrypt (12 rounds) + SHA-256 hashed HTTP-only cookies |
| Validation      | Zod                   | 4.x                      | All request bodies validated                          |
| Logging         | Pino                  | 10.x                     | JSON in prod, pino-pretty in dev                      |
| CSRF            | csrf-csrf             | --                       | Double-submit cookie pattern                          |
| Testing         | Vitest                | 3.x                      | Unit and integration tests                            |
| Package manager | pnpm                  | 9.x                      | Workspaces monorepo                                   |
| Containers      | Docker                | --                       | Multi-stage builds for server and worker              |

## Key Patterns

1. **Three-layer tenant isolation** -- Middleware checks org membership, repository queries scope by `org_id`, and database foreign keys enforce referential integrity. A bug in any single layer cannot expose cross-tenant data.

2. **SSE streaming chat** -- The chat endpoint sets `Content-Type: text/event-stream`, flushes headers immediately, and streams tokens from the Anthropic SDK's `messages.stream()` as `data: {"type":"token","token":"..."}` events. The client reads the response body via `ReadableStream.getReader()` and parses SSE lines incrementally.

3. **SHA-256 session hashing** -- The raw 64-character hex session token lives in the browser cookie. Only its SHA-256 hash is stored in the database. A database breach cannot be used to hijack sessions.

4. **Transaction-based auth** -- Registration (create user + create session) and login (delete old sessions + create new session) each run inside a `withTransaction()` wrapper, preventing orphaned users or session gaps.

5. **Per-org assistant configuration** -- Each organization has an `assistant_configs` row storing system prompt, model, max tokens, and temperature. The chat service loads this config before every Anthropic API call, making each org's assistant behave differently.

6. **Fail-open Redis** -- If `REDIS_URL` is absent or the connection fails, the application continues without caching or job queuing. Redis outages do not cascade into full downtime.

## Data Flow

1. User sends a message from the chat UI via `POST /orgs/:orgId/chat` with `{ message, conversation_id? }`
2. The `orgMembership` middleware validates the user is a member of the organization
3. The handler validates the body with Zod (`chatMessageSchema`) and sets SSE response headers
4. The chat service loads the org's assistant config (system prompt, model, temperature, max tokens)
5. If no `conversation_id` is provided, a new conversation is created; otherwise the existing one is verified
6. The user message is persisted to the `messages` table with an estimated token count
7. Full conversation history is loaded and filtered to `user`/`assistant` roles for the Anthropic API
8. The Anthropic SDK streams the response; each text chunk fires an `onToken` callback that writes an SSE event
9. After the stream completes, the full assistant response is persisted to `messages`
10. For new conversations, the title is auto-generated from the first 80 characters of the user's message
11. A `done` SSE event is sent with the `conversation_id`, and the connection closes

## API Endpoints

| Method | Path                                      | Auth       | Description                                                   |
| ------ | ----------------------------------------- | ---------- | ------------------------------------------------------------- |
| GET    | `/health`                                 | No         | Returns `{ status: "ok" }`                                    |
| GET    | `/health/ready`                           | No         | DB connectivity check, returns 200 or 503                     |
| GET    | `/api/csrf-token`                         | No         | Returns a CSRF token for state-changing requests              |
| POST   | `/auth/register`                          | No         | Create user + session (rate-limited: 10/15min)                |
| POST   | `/auth/login`                             | No         | Validate credentials, create session (rate-limited: 10/15min) |
| POST   | `/auth/logout`                            | No         | Delete session, clear cookie                                  |
| GET    | `/auth/me`                                | Session    | Return current user                                           |
| POST   | `/orgs`                                   | Session    | Create org (creator becomes admin, default config created)    |
| GET    | `/orgs`                                   | Session    | List user's orgs with roles                                   |
| GET    | `/orgs/:orgId`                            | Membership | Get org details                                               |
| GET    | `/orgs/:orgId/members`                    | Membership | List org members with roles                                   |
| POST   | `/orgs/:orgId/chat`                       | Membership | Stream AI response via SSE                                    |
| GET    | `/orgs/:orgId/conversations`              | Membership | List user's conversations in org                              |
| GET    | `/orgs/:orgId/conversations/:id/messages` | Membership | Get messages in conversation                                  |

## Database Schema

| Table               | Primary Key                 | Purpose             | Key Columns                                                       |
| ------------------- | --------------------------- | ------------------- | ----------------------------------------------------------------- |
| `users`             | UUID                        | User accounts       | email (unique), password_hash, first_name, last_name              |
| `sessions`          | SHA-256 hash (text)         | Auth sessions       | user_id (FK), expires_at (7-day TTL)                              |
| `organizations`     | UUID                        | Tenant containers   | name, slug (unique, auto-generated)                               |
| `org_members`       | Composite (org_id, user_id) | Membership junction | role (admin/member/viewer), joined_at                             |
| `assistant_configs` | UUID                        | Per-org AI settings | org_id (unique FK), system_prompt, model, max_tokens, temperature |
| `conversations`     | UUID                        | Chat threads        | org_id (FK), user_id (FK), title (auto-generated)                 |
| `messages`          | UUID                        | Chat messages       | conversation_id (FK), role, content, token_count, is_summary      |

All tables use `ON DELETE CASCADE` foreign keys. The `updated_at` columns on `users` and `organizations` have auto-update triggers. Conversations are doubly scoped by `org_id` and `user_id` with a composite index.

## Environment Variables

| Variable              | Required   | Used By        | Description                                             |
| --------------------- | ---------- | -------------- | ------------------------------------------------------- |
| `DATABASE_URL`        | Yes        | Server, Worker | Neon PostgreSQL connection string                       |
| `ANTHROPIC_API_KEY`   | Yes        | Server         | Claude API key                                          |
| `CORS_ORIGIN`         | Prod only  | Server         | Frontend URL for CORS                                   |
| `CSRF_SECRET`         | Prod only  | Server         | Secret for double-submit CSRF tokens                    |
| `REDIS_URL`           | No         | Server, Worker | Redis connection; features degrade gracefully if absent |
| `NODE_ENV`            | No         | Server, Worker | Set to `production` on Railway                          |
| `PORT`                | No         | Server, Worker | HTTP port (default: 3001)                               |
| `GCP_PROJECT_ID`      | No         | Server, Worker | GCP Secret Manager project                              |
| `GCP_SA_JSON`         | No         | Server, Worker | GCP service account credentials                         |
| `NEXT_PUBLIC_API_URL` | Yes (prod) | Web Client     | API base URL                                            |

## Decisions

- **Express 5 over Express 4** -- Async errors propagate automatically to the error handler, eliminating try/catch boilerplate in every route handler.
- **Custom sessions over Supabase Auth** -- Full control over the auth flow, single-session-per-account enforcement, and session hashing that prevents database-breach-to-session-hijack attacks.
- **SSE over WebSockets** -- Chat responses are strictly server-to-client, request-scoped, and do not require bidirectional state. SSE works through proxies, supports auto-reconnect natively, and needs no handshake.
- **Double-submit CSRF via csrf-csrf** -- Stateless CSRF protection using a signed cookie plus a header token, avoiding server-side token storage while protecting cross-origin state-changing requests.
- **Monorepo with shared common package** -- The `common` package exports TypeScript interfaces and the text chunker, ensuring type consistency between server and worker without duplication.
