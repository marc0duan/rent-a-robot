# Perseus Platform - Progress Tracker

## Project Overview

Perseus is a multi-tenant web platform for managing AI robot agents (nanobots). Built on Next.js and PostgreSQL, it provides team-based chatgroups where humans can assign tasks to robots via @mentions, share files through a hierarchical workspace, and monitor robot work progress.

---

## Completed

### Infrastructure & Configuration
- [x] Next.js project scaffolding with TypeScript, Tailwind CSS 4, ESLint
- [x] `tsconfig.json` with `@/*` path alias
- [x] `next.config.ts` with standalone output for Docker
- [x] `postcss.config.mjs` and `eslint.config.mjs`
- [x] `Dockerfile` — multi-stage build (deps → builder → runner)
- [x] `docker-compose.yml` — platform (port 3000), postgres:16-alpine, redis:7-alpine with health checks
- [x] `.env.example` with all required environment variables

### Database Schema (Prisma)
- [x] 11 models: Tenant, User, TenantUser, Team, TeamMember, Robot, ChatGroup, ChatGroupMember, Message, WorkspaceFile, ApiKey
- [x] Proper relations, composite keys, cascade deletes, indexes
- [x] Polymorphic sender pattern (senderId + senderType) for messages
- [x] Hierarchical file scoping (tenant/team/chatgroup)

### Core Libraries (`src/lib/`)
- [x] `prisma.ts` — PrismaClient singleton with globalThis pattern
- [x] `redis.ts` — ioredis singleton with globalThis pattern
- [x] `errors.ts` — ApiError class, errorResponse(), handleError()
- [x] `auth.ts` — JWT auth middleware: signUserToken, signTenantToken, signRobotToken, verifyToken, requireAuth, requireTenantAuth, requireRole, requireRobotAuth, requireApiKey

### API Routes — Auth (4 endpoints)
- [x] `POST /api/v1/auth/signup` — Register with email/password/name/phone
- [x] `POST /api/v1/auth/login` — Login, returns JWT + tenant list
- [x] `POST /api/v1/auth/verify-phone` — Phone verification via Redis
- [x] `POST /api/v1/auth/select-tenant` — Switch tenant context

### API Routes — Tenants (5 endpoints)
- [x] `GET /api/v1/tenants` — List user's tenants
- [x] `POST /api/v1/tenants` — Create tenant (auto-assign owner)
- [x] `GET /api/v1/tenants/{id}` — Get tenant details
- [x] `PUT /api/v1/tenants/{id}` — Update tenant (owner/admin only)
- [x] `DELETE /api/v1/tenants/{id}` — Delete tenant (owner only)
- [x] `GET /api/v1/tenants/{id}/users` — List tenant users

### API Routes — Teams (5 endpoints)
- [x] `GET /api/v1/teams` — List teams in tenant
- [x] `POST /api/v1/teams` — Create team (auto-creates "General" chatgroup)
- [x] `GET /api/v1/teams/{id}` — Get team details
- [x] `PUT /api/v1/teams/{id}` — Update team
- [x] `DELETE /api/v1/teams/{id}` — Disband team
- [x] `POST /api/v1/teams/{id}/members` — Add member
- [x] `DELETE /api/v1/teams/{id}/members/{memberId}` — Remove member

### API Routes — Robots (5 endpoints)
- [x] `GET /api/v1/robots` — List robots in tenant
- [x] `POST /api/v1/robots` — Create robot (name + soulMd)
- [x] `GET /api/v1/robots/{id}` — Get robot details
- [x] `PUT /api/v1/robots/{id}` — Update robot + generate token ("Assign a PC")
- [x] `DELETE /api/v1/robots/{id}` — Decommission robot

### API Routes — ChatGroups (3 endpoints)
- [x] `GET /api/v1/chatgroups` — List user's chatgroups
- [x] `POST /api/v1/chatgroups` — Create chatgroup (min 2 members, at least 1 human)
- [x] `GET /api/v1/chatgroups/{id}` — Get group metadata and members
- [x] `PUT /api/v1/chatgroups/{id}` — Modify group
- [x] `DELETE /api/v1/chatgroups/{id}` — Delete group

### API Routes — Messages (4 endpoints)
- [x] `GET /api/v1/chatgroups/{id}/messages` — Message history with cursor pagination, sender enrichment
- [x] `POST /api/v1/chatgroups/{id}/messages` — Send message with @mention parsing
- [x] `PUT /api/v1/messages/{id}` — Edit message (sender only)
- [x] `DELETE /api/v1/messages/{id}` — Delete message (sender or admin/owner)

### API Routes — Workspace Files (4 endpoints)
- [x] `GET /api/v1/chatgroups/{id}/files` — List files with inheritance (chatgroup + team + tenant)
- [x] `POST /api/v1/chatgroups/{id}/files` — Upload file metadata (stub — no multipart yet)
- [x] `GET /api/v1/files/{id}` — Get file metadata with scope-based access check
- [x] `DELETE /api/v1/files/{id}` — Delete file (uploader or admin/owner)

### API Routes — API Keys (3 endpoints)
- [x] `GET /api/v1/api-keys` — List keys (admin/owner only, excludes keyHash)
- [x] `POST /api/v1/api-keys` — Create key with bcrypt hash (plaintext shown once)
- [x] `DELETE /api/v1/api-keys/{id}` — Revoke key

### API Routes — System (2 endpoints)
- [x] `GET /api/health` — Health check (database + Redis connectivity)
- [x] `GET /api/v1/onboard` — Robot onboarding (fetches config, updates status to "onboard")

---

## Not Yet Implemented

### Database
- [x] ~~Run `prisma migrate dev`~~ — Migration `20260219165806_init` applied, all 11 tables created
- [ ] Seed data for development

### Real-Time Features
- [ ] WebSocket/SSE for live message delivery
- [ ] Redis Pub/Sub for cross-instance message broadcasting

### File Handling
- [ ] Actual multipart file upload (currently metadata-only stub)
- [ ] File download/streaming endpoint
- [ ] `/workspace` volume directory creation
- [ ] File size limits and validation

### External Integrations
- [ ] Aliyun SMS integration for phone verification (stub exists)
- [ ] LLM provider config storage per tenant (for robot onboarding)

### Security & Operations
- [ ] Rate limiting middleware (1000/hr users, 5000/hr robots)
- [ ] CORS configuration
- [ ] Request logging / audit trail
- [ ] Input sanitization middleware

### MCP Server
- [ ] Standalone MCP server process for nanobot integration (doc/09)
- [ ] Tool definitions for robot commands
- [ ] Bidirectional communication bridge

### Frontend UI
- [x] Login / signup pages
- [x] Tenant switcher (select-tenant page with create org flow)
- [x] Dashboard layout with sidebar navigation
- [x] Dashboard overview page with stats cards
- [x] Team management dashboard (list, create, delete)
- [x] Team detail page (members, chat groups, add/remove members)
- [x] Robot management dashboard (create, edit, delete, Assign PC token flow)
- [x] Chat interface (group list with search, message viewer, message editor)
- [x] @mention dropdown with member suggestions
- [x] API key management UI (create, revoke, one-time key display)
- [x] Root page redirect (auth check → dashboard or login)
- [x] Auth layout with Perseus branding
- [x] shadcn/ui component library (23 components installed)
- [x] Typed API client (`src/lib/api/client.ts`)
- [x] Auth context with JWT management (`src/hooks/use-auth.tsx`)
- [ ] File upload/download in chat (metadata-only stub exists)

---

## Architecture Notes

- **Auth**: JWT-based with three token types (user, tenant-scoped, robot)
- **Multi-tenancy**: Every query filters by `auth.tenantId` for isolation
- **Params pattern**: Next.js 15+ async params — `{ params }: { params: Promise<{ id: string }> }`
- **Error handling**: Consistent `ApiError` → `handleError()` → JSON error response
- **File scoping**: Hierarchical inheritance (tenant → team → chatgroup)
- **Prisma 7**: Uses `prisma.config.ts` with `defineConfig()`, PrismaPg adapter, generated client at `./generated/prisma`

---

## Verification Results (2026-02-20)

### Build
- `tsc --noEmit` — **0 errors**
- `next build` — **34 routes compiled** (24 API + 10 frontend pages), 0 type errors
- `docker compose build` — **all steps passed** (node:22-alpine, Prisma 7 generate, standalone output)

### Runtime
- `docker compose up` — all 3 containers healthy (platform, postgres:16-alpine, redis:7-alpine)
- `GET /api/health` — `{"status":"ok","database":"connected","redis":"connected"}`

### API Smoke Tests (all passing)
- `POST /api/v1/auth/signup` — user created, JWT returned
- `POST /api/v1/auth/login` — authenticated, JWT returned
- `POST /api/v1/tenants` — tenant created, owner assigned, tenant-scoped JWT returned
- `POST /api/v1/teams` — team created, creator auto-added as member, "General" chatgroup auto-created
- `GET /api/v1/chatgroups?teamId=...` — lists chatgroups correctly
- `POST /api/v1/chatgroups/{id}/messages` — message sent with @mention content
- `GET /api/v1/chatgroups/{id}/messages` — messages retrieved with cursor pagination and sender enrichment

### Frontend Pages (all compiling and rendering)
- Login, Signup, Select-Tenant — auth flow complete
- Dashboard overview — stats cards, quick actions
- Teams — list, create, delete, detail with members
- Robots — CRUD, Assign PC token flow, edit soul
- Chat — group list, message viewer, @mention, send
- API Keys — create, revoke, one-time key display
- Tenant settings — org info, member list with roles
