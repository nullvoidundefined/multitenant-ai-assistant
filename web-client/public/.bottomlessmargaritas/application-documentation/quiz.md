# Multi-tenant AI Assistant — Quiz

**1. What are the three independent layers that enforce tenant isolation in this application?**

- A) Authentication, authorization, and encryption
- **B) Middleware (orgMembership), repository (org_id in queries), and database (foreign key constraints)**
- C) Frontend routing, API validation, and database views
- D) CORS, CSRF, and rate limiting

? This is about how the app prevents one organization from accessing another's data.

> Tenant isolation uses defense in depth: the orgMembership middleware rejects non-members with 403, every repository query scopes by org_id, and foreign keys with ON DELETE CASCADE enforce referential integrity. A bug in any single layer cannot expose cross-tenant data.

**2. What HTTP method and content type does the chat endpoint use for streaming responses?**

- A) GET with application/json
- B) POST with application/json
- **C) POST with text/event-stream**
- D) WebSocket upgrade from GET

? Think about how the client sends a message and receives a streamed response.

> The client sends a POST request with the message body, and the server responds with Content-Type: text/event-stream. SSE was chosen over WebSockets because chat responses are strictly server-to-client and request-scoped.

**3. How are session tokens stored in the database?**

- A) The raw 64-character hex token is stored directly
- B) The token is encrypted with AES-256 before storage
- **C) A SHA-256 hash of the token is stored**
- D) The token is stored in Redis, not PostgreSQL

? Consider what happens if the database is breached.

> Only the SHA-256 hash of the session token is stored in the sessions table. The raw token lives in the browser cookie. A database breach cannot be weaponized for session hijacking because the attacker has hashes, not original tokens.

**4. What is the default model configured for new organizations?**

- A) claude-3-opus-20240229
- **B) claude-sonnet-4-20250514**
- C) claude-3-haiku-20240307
- D) gpt-4-turbo

? Check what the createOrg repository function inserts into assistant_configs.

> When an organization is created, the repository inserts a default assistant_configs row with model set to claude-sonnet-4-20250514, max_tokens 4096, and temperature 0.7.

**5. What happens when a user logs in regarding their existing sessions?**

- A) The new session is added alongside existing ones
- B) Only sessions older than 24 hours are deleted
- **C) All existing sessions are deleted within a transaction, then a new one is created**
- D) Existing sessions are marked as inactive but not deleted

? Look at the loginUser function in the auth repository.

> Login uses withTransaction to atomically delete all existing sessions for the user and create a new one. This enforces a single-session-per-account model with no window where all sessions are cleared but the new one does not exist.

**6. What library handles CSRF protection in this application?**

- A) csurf
- B) Custom X-Requested-With header check
- **C) csrf-csrf (double-submit cookie pattern)**
- D) helmet

? Look at the csrfGuard middleware import.

> The app uses the csrf-csrf library which implements the double-submit cookie pattern. It generates a signed CSRF token tied to the session cookie. The frontend must fetch a token from /api/csrf-token and include it in state-changing requests.

**7. What is the purpose of the common package in the monorepo?**

- A) It contains shared React components
- B) It contains database migration files
- **C) It exports shared TypeScript types and a text chunking utility**
- D) It contains shared Express middleware

? Look at common/src/index.ts and what it exports.

> The common package exports TypeScript interfaces (User, Organization, Conversation, Message, AssistantConfig, etc.) and a recursive text chunker. Both server and worker depend on it for type consistency.

**8. What is the request timeout for non-streaming requests?**

- A) 120 seconds
- **B) 30 seconds**
- C) 60 seconds
- D) 10 seconds

? Check the REQUEST_TIMEOUT_MS constant in app.ts.

> Non-streaming requests have a 30-second timeout (REQUEST_TIMEOUT_MS = 30_000). SSE streaming requests are excluded from this timeout by checking if the Accept header is text/event-stream.

**9. How does the application generate organization slugs?**

- A) The user provides a custom slug
- B) A random UUID is used as the slug
- **C) The name is slugified and appended with a base-36 timestamp**
- D) The slug is the organization name in lowercase

? Look at the slugify function and createOrg in the orgs repository.

> The slugify function lowercases the name, replaces non-alphanumeric characters with hyphens, trims hyphens, and truncates to 60 characters. Then Date.now().toString(36) is appended to ensure uniqueness.

**10. How many salt rounds does bcrypt use for password hashing?**

- A) 8
- B) 10
- **C) 12**
- D) 16

? Check the SALT_ROUNDS constant in the auth repository.

> The SALT_ROUNDS constant is set to 12. This provides a good balance between security and performance, taking roughly 200-300ms per hash on modern hardware.

**11. What is the maximum message length allowed by the chatMessageSchema?**

- A) 1,000 characters
- B) 5,000 characters
- **C) 10,000 characters**
- D) 50,000 characters

? Look at the Zod schema for chat messages in schemas/org.ts.

> The chatMessageSchema validates that the message string is between 1 and 10,000 characters (max 10_000). The conversation_id is an optional UUID.

**12. What Express version is used and why is it significant?**

- A) Express 4, which requires manual error wrapping
- **B) Express 5, which automatically catches async errors**
- C) Express 3, for its built-in view engine
- D) Express 4 with express-async-errors patch

? Consider why there are no try/catch blocks in route handlers.

> Express 5 automatically catches errors thrown in async route handlers and passes them to the error-handling middleware. This eliminates try/catch boilerplate in every handler.

**13. What happens if REDIS_URL is not set or Redis is unreachable?**

- A) The application crashes on startup
- B) All features are disabled
- **C) The application continues without caching or job queuing**
- D) The application falls back to in-memory queuing

? Think about the fail-open Redis pattern.

> Redis is optional infrastructure. If REDIS_URL is absent or the connection fails, the application continues without caching or job queuing. This prevents Redis outages from cascading into full application downtime.

**14. What cookie settings are used for session cookies in production?**

- A) httpOnly: true, secure: false, sameSite: strict
- B) httpOnly: false, secure: true, sameSite: lax
- **C) httpOnly: true, secure: true, sameSite: none**
- D) httpOnly: true, secure: true, sameSite: strict

? Consider that the frontend (Vercel) and API (Railway) are on different domains.

> In production, session cookies use httpOnly: true, secure: true, and sameSite: none. SameSite=None with Secure=true is required because the frontend and API are on different domains (Vercel and Railway), and the browser must send cookies on cross-origin requests.

**15. How does the system estimate token counts for messages?**

- A) Using the tiktoken library
- B) Counting whitespace-separated words
- **C) Dividing character count by 4 and rounding up**
- D) Calling the Anthropic token counting API

? Look at the estimateTokens function in chat.service.ts.

> Token count is estimated with Math.ceil(text.length / 4), using the rough heuristic that English text averages about 4 characters per token. This avoids the overhead of a tokenizer library.

**16. What is the session TTL (time to live)?**

- A) 24 hours
- B) 3 days
- **C) 7 days**
- D) 30 days

? Check the SESSION_TTL_MS constant.

> SESSION*TTL_MS is set to 7 * 24 _ 60 _ 60 \_ 1000, which equals 7 days. The session cookie maxAge matches this value.

**17. What database is used and what extension is installed for future RAG support?**

- A) MySQL with full-text search
- B) MongoDB with Atlas Search
- **C) PostgreSQL with pgvector**
- D) PostgreSQL with pg_trgm

? Consider what vector storage capability is prepared for knowledge base features.

> The application uses PostgreSQL on Neon with the pgvector extension installed. pgvector enables vector similarity search for the planned knowledge base RAG feature, storing embeddings alongside chunk content without requiring a separate vector database.

**18. How are conversations scoped in the database?**

- A) By user_id only
- B) By org_id only
- **C) By both org_id and user_id with a composite index**
- D) By a tenant_id field

? Look at the conversations table schema and the listConversations query.

> Conversations are doubly scoped by org_id and user_id. The table has individual indexes on each column plus a composite index on (org_id, user_id) for the most common query pattern. Users can only see their own conversations within an organization.

**19. What is the purpose of the is_summary boolean field on the messages table?**

- A) It marks messages that have been read by the user
- B) It flags messages generated by a summarization model
- **C) It marks condensed summaries of older conversation history for token budget management**
- D) It indicates messages that contain citations

? Think about what happens when conversation history exceeds the model's context limit.

> The is_summary flag marks messages that are condensed summaries of prior conversation history. When the token budget is exceeded (planned feature), older messages will be summarized into a single system message with is_summary=true, preserving context while staying within limits.

**20. What SSE event types does the chat endpoint emit?**

- A) start, chunk, end
- B) message, complete, error
- **C) token, done, error**
- D) delta, stop, fault

? Look at the onToken, onDone, and onError callbacks in the chat handler.

> The chat handler emits three SSE event types: token (with each text chunk), done (with the conversation_id when streaming completes), and error (with a message string if something fails).

**21. How is auto-titling implemented for new conversations?**

- A) Claude generates a title from the conversation context
- B) The user provides a title when creating a conversation
- **C) The first user message is truncated to 80 characters**
- D) The first 3 words of the response are used

? Look at what happens after the stream completes in chat.service.ts when there is no existing conversation ID.

> For new conversations (when no conversation_id was provided), the title is set to the first 80 characters of the user's initial message, with an ellipsis appended if truncated.

**22. What is the JSON body size limit for the Express server?**

- A) 1kb
- B) 5kb
- **C) 10kb**
- D) 100kb

? Check the express.json() configuration in app.ts.

> The Express JSON parser is configured with a limit of 10kb via express.json({ limit: '10kb' }). The URL-encoded parser has the same limit.

**23. What rate limits are applied to authentication endpoints?**

- A) 5 requests per 15 minutes
- **B) 10 requests per 15 minutes**
- C) 50 requests per 15 minutes
- D) 100 requests per 15 minutes

? Check the authRateLimiter configuration in rateLimiter.ts.

> The authRateLimiter allows 10 requests per 15-minute window (windowMs: 15 _ 60 _ 1000, max: 10). The global rate limiter allows 100 requests per 15 minutes.

**24. What happens if a user tries to register with an email that already exists?**

- A) The existing account is silently overwritten
- B) A generic 400 error is returned
- **C) A 409 Conflict error with "Email already registered" is returned**
- D) The registration succeeds and creates a duplicate user

? Look at the register handler's catch block.

> The register handler catches PostgreSQL error code 23505 (unique constraint violation on the email column) and returns a 409 status with the message "Email already registered."

**25. How does the orgMembership middleware attach membership data to the request?**

- A) It sets req.org with the full organization object
- B) It adds the membership to a custom header
- **C) It sets req.orgMembership with { orgId, role }**
- D) It stores the membership in the session

? Look at what the middleware assigns after successful membership verification.

> After verifying the user is a member by querying org_members, the middleware sets req.orgMembership = { orgId, role: membership.role }. This is available to all downstream handlers.

**26. What logging library is used and what format does it produce?**

- A) Winston with text format
- B) Morgan with combined format
- **C) Pino with JSON in production and pino-pretty in development**
- D) Console.log with custom formatting

? Check the logger utility and the pino-http middleware.

> The application uses Pino for structured JSON logging. In development, pino-pretty provides human-readable output. The pino-http middleware adds request/response logging with request IDs.

**27. How does the worker process handle health checks for Railway?**

- A) It exposes a /health endpoint on the Express app
- B) Railway pings the BullMQ connection
- **C) It runs a minimal HTTP server on port 3001 that responds with "ok"**
- D) It writes health status to a file that Railway monitors

? Look at the worker's workers.ts file.

> The worker creates a plain Node.js http.createServer that responds with "ok" on any request, listening on the PORT environment variable (default 3001). This satisfies Railway's health check requirements without needing Express.

**28. What TypeScript path alias pattern is used in the server package?**

- A) @server/\*
- B) ~/server/\*
- **C) app/\***
- D) src/\*

? Look at the import statements in server source files.

> Server imports use the app/\* path alias (e.g., import from 'app/config/env.js'). The tsc-alias package resolves these path aliases after TypeScript compilation for production builds.

**29. How does the application handle graceful shutdown?**

- A) It exits immediately on SIGTERM
- B) It only closes the database pool
- **C) It closes the HTTP server, drains the database pool, and quits Redis on SIGTERM/SIGINT**
- D) It relies on Docker to handle shutdown

? Look at the shutdown function in app.ts.

> The startServer function registers handlers for both SIGTERM and SIGINT. The shutdown function closes the HTTP server (waiting for in-flight requests), drains the pg pool, and quits the Redis connection before calling process.exit(0).

**30. What is the primary key type used across all database tables?**

- A) Auto-incrementing integers
- B) CUID strings
- **C) UUIDs generated by PostgreSQL (gen_random_uuid())**
- D) Snowflake IDs

? Check the migration files and CREATE TABLE statements.

> All tables use UUID primary keys with DEFAULT gen_random_uuid(). The sessions table is the exception, using a TEXT primary key that stores the SHA-256 hash of the session token.

**31. What role is automatically assigned to the user who creates an organization?**

- **A) admin**
- B) owner
- C) member
- D) creator

? Look at the createOrg repository function.

> The createOrg function inserts the creator into org_members with role set to 'admin' within the same transaction that creates the organization.

**32. How are database migrations managed in this project?**

- A) TypeORM migration files
- B) Prisma migrate
- **C) node-pg-migrate with plain JavaScript files**
- D) Knex.js migrations

? Check the migrations directory and package.json scripts.

> Migrations use node-pg-migrate with plain JavaScript files (not TypeScript) so they execute directly in production without compilation. Files are named with Unix timestamps to guarantee ordering.

**33. What default parameters does the text chunker use?**

- A) 200 tokens max, 20 token overlap
- B) 1000 tokens max, 100 token overlap
- **C) 500 tokens max, 50 token overlap**
- D) 250 tokens max, 25 token overlap

? Look at the DEFAULT_MAX_TOKENS and DEFAULT_OVERLAP_TOKENS constants in the chunker.

> The chunker defaults to 500-token chunks with 50-token overlap. Separators are tried in order: double newlines, single newlines, periods with spaces, then single spaces. If no separator works, it falls back to hard character-count splitting.

**34. What frontend state management approach does the application use?**

- A) Redux with Redux Toolkit
- B) Zustand for global state
- **C) TanStack React Query for server state, React useState for local UI state**
- D) React Context for all state

? Look at the frontend architecture — how data is fetched and cached.

> The app uses TanStack React Query for server state management (auth/me, orgs list, conversations, messages) with cache invalidation after mutations. Local UI state (form inputs, streaming status, selected conversation) uses React useState. There is no global client-side store.

**35. How does the frontend read SSE responses from the chat endpoint?**

- A) Using the EventSource API
- B) Using a WebSocket fallback
- **C) Using fetch() with ReadableStream.getReader() to parse SSE lines manually**
- D) Using the @microsoft/fetch-event-source library

? The chat endpoint uses POST, which EventSource does not support.

> Since the chat endpoint is POST (not GET), the standard EventSource API cannot be used. Instead, the frontend uses fetch() and reads the response body as a ReadableStream via getReader(), manually parsing SSE data: lines with a TextDecoder and buffer.

**36. What Docker build strategy is used for the server and worker?**

- A) Single-stage build with all dependencies
- B) Build locally, copy binary to scratch image
- **C) Multi-stage build: compile TypeScript in stage 1, copy dist to production stage 2**
- D) Pre-built images from Docker Hub

? Check Dockerfile.server structure.

> Both Dockerfiles use two-stage builds. Stage 1 installs all dependencies (including dev deps for TypeScript), runs tsc and tsc-alias. Stage 2 starts fresh with Node 22 slim, installs only production dependencies, and copies the compiled dist/ and migrations/ from stage 1.

**37. What security headers does the application set and through which library?**

- A) Custom headers set manually in middleware
- **B) Helmet sets XSS protection, clickjacking prevention, and MIME sniffing guards**
- C) CORS handles all security headers
- D) Cloudflare provides all security headers

? Check the first middleware in the app.ts stack.

> Helmet is the first middleware applied. It sets security headers including X-Content-Type-Options (MIME sniffing), X-Frame-Options (clickjacking), and other browser security policies.

**38. What three roles are available in the org_members table?**

- A) owner, editor, viewer
- B) superadmin, admin, user
- **C) admin, member, viewer**
- D) admin, editor, reader

? Check the OrgRole type in common/src/types.

> The OrgRole type is defined as 'admin' | 'member' | 'viewer'. The requireRole middleware factory can be used to restrict routes to specific roles.

**39. What happens to all related data when an organization is deleted?**

- A) Related data is orphaned with null foreign keys
- B) A soft delete flag is set
- **C) All members, assistant config, conversations, and messages are cascaded-deleted**
- D) A background job cleans up related data asynchronously

? Look at the ON DELETE CASCADE constraints.

> All foreign keys use ON DELETE CASCADE. Deleting an organization automatically removes its org_members, assistant_configs, conversations, and all messages within those conversations.

**40. How does the loadSession middleware behave when no session cookie is present?**

- A) It returns a 401 error
- B) It redirects to the login page
- **C) It calls next() without attaching req.user (fail-open)**
- D) It creates an anonymous session

? Look at the loadSession function in requireAuth.ts.

> loadSession is a fail-open middleware. If no cookie is present or the session lookup returns null, it simply calls next() without setting req.user. The separate requireAuth middleware checks for req.user and returns 401 if absent.

**41. What is the maximum organization name length allowed?**

- A) 50 characters
- B) 80 characters
- **C) 100 characters**
- D) 255 characters

? Check the createOrgSchema Zod validation.

> The createOrgSchema validates that the organization name is between 1 and 100 characters: z.string().min(1).max(100).

**42. How does the application handle uncaught exceptions and unhandled rejections?**

- A) They are silently ignored
- B) They are logged but the process continues
- **C) They are logged as fatal with Pino, the logger is flushed, and the process exits with code 1**
- D) They trigger a graceful shutdown sequence

? Look at the process event handlers in startServer().

> Both uncaughtException and unhandledRejection handlers log the error at fatal level using Pino, flush the logger to ensure the error is written, and immediately exit with code 1. This prevents the process from continuing in an undefined state.

**43. What is the global rate limit for non-auth requests?**

- **A) 100 requests per 15 minutes**
- B) 1000 requests per 15 minutes
- C) 50 requests per minute
- D) 500 requests per hour

? Check the rateLimiter configuration.

> The global rateLimiter allows 100 requests per 15-minute window (windowMs: 15 _ 60 _ 1000, max: 100) with standard headers enabled and legacy headers disabled.

**44. What additional types beyond the core entities does the common package define?**

- A) Only User and Organization
- **B) Invitation, KnowledgeDoc, and KnowledgeChunk types for planned features**
- C) API response wrapper types
- D) Error types and HTTP status codes

? Look at all interfaces exported from common/src/types/index.ts.

> Beyond the core types (User, Organization, OrgMember, Conversation, Message, AssistantConfig), the common package also defines Invitation (for member invitations), KnowledgeDoc (for document uploads with processing status), and KnowledgeChunk (for embedded document chunks) -- all prepared for future features.

**45. What proxy trust setting is configured on the Express app?**

- A) trust proxy is disabled
- **B) trust proxy is set to 1 (trust first proxy)**
- C) trust proxy is set to true (trust all proxies)
- D) trust proxy is set to a specific IP range

? Check app.set() calls in app.ts.

> The app sets trust proxy to 1 via app.set('trust proxy', 1), meaning it trusts the first proxy in the chain. This is necessary for Railway's reverse proxy to correctly report client IPs and for rate limiting to work properly.

**46. What happens when the Anthropic streaming API call throws an error during chat?**

- A) The server crashes
- B) A 500 JSON error is returned
- **C) An SSE error event is written with the error message, then the connection closes**
- D) The error is silently swallowed

? Look at the onError callback in chat.service.ts and the chat handler.

> If the Anthropic stream throws an error, the catch block in streamChat logs it and calls the onError callback. The chat handler writes an SSE event with type "error" and the error message, then calls res.end() to close the connection.

**47. What is the order of the first six middleware in the Express stack?**

- A) CORS, helmet, logger, body parser, cookie parser, rate limiter
- **B) helmet, CORS, request logger, rate limiter, body parser (JSON + URL), cookie parser**
- C) rate limiter, helmet, CORS, body parser, logger, cookie parser
- D) logger, helmet, CORS, rate limiter, cookie parser, body parser

? Trace the app.use() calls in order in app.ts.

> The middleware stack starts with helmet, then CORS, request logger (pino-http), rate limiter, express.json + express.urlencoded, and cookie parser -- in that exact order. CSRF guard and loadSession come after.

**48. How does the chunker handle text that exceeds the max token size after trying all separators?**

- A) It throws an error
- B) It truncates to the max token limit
- **C) It performs a hard split by character count (maxTokens \* 4 characters)**
- D) It returns the oversized chunk as-is

? Look at the fallback behavior in the recursiveSplit function.

> When no separator is found or all separators have been exhausted, the chunker falls back to hard splitting by character count. It calculates maxChars as maxTokens \* 4 and slices the text into chunks of that size.
