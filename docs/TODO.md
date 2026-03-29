# Manual Setup TODO

Everything that couldn't be automated. Complete these in order.

## 1. GitHub

- [ ] Re-authenticate the GitHub CLI: `gh auth login -h github.com`
- [ ] Create the repo: `gh repo create multitenant-ai-assistant --private --source . --push`
- [ ] (Or if the repo already exists: `git remote add origin git@github.com:nullvoidundefined/multitenant-ai-assistant.git && git push -u origin main`)

## 2. Neon Database

- [ ] Go to [Neon Console](https://console.neon.tech) and create a new project named `multitenant-ai-assistant`
- [ ] Copy the connection string (looks like `postgresql://neondb_owner:...@ep-....neon.tech/neondb?sslmode=require`)
- [ ] Paste it into `server/.env` as `DATABASE_URL=...`
- [ ] Paste it into `worker/.env` as `DATABASE_URL=...`
- [ ] Set it on Railway for both services:
  ```
  railway variable set --service server DATABASE_URL="<your-neon-connection-string>"
  railway variable set --service worker DATABASE_URL="<your-neon-connection-string>"
  ```

## 3. Run Migrations

- [ ] From `application/server/`, run: `pnpm migrate:up`
- [ ] Verify tables were created: check Neon console SQL Editor with `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`

## 4. Railway Deployment

Railway project **balanced-vibrancy** has been created with:

- **Redis** service (running, connection configured)
- **server** service (env vars set: `NODE_ENV`, `PORT`, `ANTHROPIC_API_KEY`, `REDIS_URL`)
- **worker** service (env vars set: `NODE_ENV`, `ANTHROPIC_API_KEY`, `REDIS_URL`)

Still needed:

- [ ] Set `DATABASE_URL` on both server and worker (see step 2 above)
- [ ] Set `CORS_ORIGIN` on server to your Vercel frontend URL once deployed:
  ```
  railway variable set --service server CORS_ORIGIN="https://your-app.vercel.app"
  ```
- [ ] Link GitHub repo to Railway server service for auto-deploy, or push manually:
  ```
  railway service link server
  railway up
  ```
- [ ] Configure worker service to use `Dockerfile.worker`:
  - In Railway dashboard → worker service → Settings → Build → set Dockerfile path to `Dockerfile.worker`
  - Or deploy worker manually: `railway service link worker && railway up`
- [ ] Generate a public domain for the server service:
  ```
  railway domain --service server
  ```
- [ ] After domain is generated, update `CORS_ORIGIN` to include both the Vercel URL and Railway domain

## 5. Vercel Deployment (Frontend)

- [ ] From `application/web-client/`, run: `vercel` and follow the prompts to create a new project
- [ ] Set the environment variable in Vercel:
  ```
  vercel env add NEXT_PUBLIC_API_URL
  ```
  Value: your Railway server public URL (e.g., `https://server-production-xxxx.up.railway.app`)
- [ ] Deploy: `vercel --prod`
- [ ] Copy the Vercel URL and set it as `CORS_ORIGIN` on Railway server (see step 4)

## 6. Local Development

- [ ] Install Redis locally (if not running): `brew install redis && brew services start redis`
  - Or use the Railway Redis via public URL in your local `.env`
- [ ] Start all services: `cd application && pnpm dev`
  - Server runs on http://localhost:3001
  - Frontend runs on http://localhost:3000

## What's Already Done

- [x] Monorepo scaffolded (common, server, worker, web-client)
- [x] All TypeScript source code written and compiling
- [x] 7 database migrations created
- [x] Session-based auth (register, login, logout, me)
- [x] Org creation with auto-admin membership
- [x] Org membership middleware on all org-scoped routes
- [x] Streaming chat endpoint with Anthropic Claude
- [x] Next.js frontend (landing, auth, org list, chat)
- [x] Railway project created with Redis + server + worker services
- [x] `ANTHROPIC_API_KEY` set on Railway (server + worker)
- [x] `REDIS_URL` set on Railway (server + worker, using internal URL)
- [x] Dockerfiles for server and worker
- [x] `.env` files with all non-secret values pre-filled
- [x] Initial git commit
