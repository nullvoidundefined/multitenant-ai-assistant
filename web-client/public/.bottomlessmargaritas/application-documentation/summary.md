# Multi-tenant AI Assistant — Application Summary

## What Is It?

Multi-tenant AI Assistant is a SaaS platform where each organization gets its own AI assistant powered by Claude. Organizations can customize their assistant's personality via system prompts, manage members with role-based access, and maintain isolated conversation histories. Every conversation is scoped to the organization that owns it — no data leaks between tenants.

---

## What It Does

- **Creates organizations** with automatic slug generation and an admin member
- **Configures per-org AI assistants** — custom system prompts, model selection, temperature, and token limits
- **Streams AI responses** token by token in real time via Server-Sent Events
- **Manages conversations** — create, list, and resume threaded conversations within an org
- **Controls access** with role-based membership — admins, members, and viewers
- **Isolates tenant data** — every query is scoped by organization ID, enforced at the middleware and database layers

---

## User Flows

### 1. Creating an Account

1. Open the app — you'll see a landing page with Log In / Sign Up buttons
2. Click **Sign Up**, enter your first name, last name, email, and a password (8+ characters)
3. You're logged in immediately and taken to the organizations page

### 2. Logging In

1. Open the app and click **Log In**
2. Enter your email and password
3. Your session lasts 7 days — you won't need to log in again on the same device

### 3. Creating an Organization

1. On the organizations page, type a name into the input and click **Create**
2. The org is created with you as the admin
3. A default AI assistant configuration is set up automatically
4. You're taken directly to the chat interface

### 4. Chatting with the AI Assistant

1. Select an organization from your list (or you'll land here after creating one)
2. Type a message in the input at the bottom and press **Send**
3. The assistant's response streams in token by token in real time
4. Your conversation is auto-titled based on your first message
5. Previous conversations appear in the sidebar — click any to resume

### 5. Managing Conversations

1. In the chat view, the sidebar lists all your conversations in this org
2. Click **New Chat** to start a fresh conversation
3. Click any conversation in the sidebar to load its message history
4. Conversations are sorted by most recently updated

### 6. Viewing Organization Settings

1. Click **Settings** in the chat header
2. View the organization name, slug, and creation date
3. See all members with their roles and join dates

### 7. Switching Organizations

1. Click **Organizations** in the sidebar header to return to the org list
2. Select a different organization to enter its chat

### 8. Signing Out

Click **Log Out** on the organizations page.

---

## Key Behaviors to Know

- **Every org gets its own assistant.** The system prompt, model, temperature, and token limit are configurable per organization. Changes affect all future conversations in that org.
- **Conversations are isolated.** Users only see conversations they created within the current org. No cross-org or cross-user data access.
- **Streaming is real-time.** Responses arrive token by token via SSE — you see the assistant "typing" as it generates.
- **Sessions last 7 days.** You stay logged in across browser sessions. Logging in again invalidates previous sessions (single-session-per-account).
- **Roles control access.** Admins, members, and viewers each have different permissions. Org membership is checked on every request via middleware.
- **Data is multi-tenant by design.** Organization ID scoping is enforced at the database query level, not just the application layer.
