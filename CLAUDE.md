# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Perseus is a multi-tenant web platform for managing AI robot agents ("nanobots"). It provides team-based chatgroups where humans can assign tasks to robots via @mentions, share files through a hierarchical workspace, and monitor robot work progress.

The project consists of three main components:
- **platform/** — Next.js web application
- **robot/** — Python AI agent (nanobot)
- **mcp-server/** — Model Context Protocol server for platform-agent communication

## Development Commands

### Platform (Next.js)
```bash
cd platform

# Development
npm run dev                    # Start dev server

# Build
npm run build                  # Build Next.js app
npm run start                  # Start production server

# Linting
npm run lint                   # Run ESLint

# Database
npm run db:generate            # Generate Prisma client
npm run db:migrate             # Run Prisma migrations
npm run db:push                # Push schema to DB
npm run db:studio              # Open Prisma Studio
npm run db:seed                # Seed database (creates Alice/Bob, Acme Corp, Atlas robot)
```

### Docker
```bash
cd platform
docker compose build           # Build all services
docker compose up              # Start platform + PostgreSQL + Redis
```

### MCP Server
```bash
cd mcp-server
npm run build                   # Build TypeScript
npm run start                   # Start MCP server
npm run dev                     # Build and start in dev mode
```

## Architecture

### Multi-Tenancy
- Every API query filters by `auth.tenantId` for tenant isolation
- Three JWT token types: user token, tenant-scoped token, robot token
- Tenant → Team → ChatGroup hierarchy

### Database Schema (Prisma)
11 models: Tenant, User, TenantUser, Team, TeamMember, Robot, ChatGroup, ChatGroupMember, Message, WorkspaceFile, ApiKey, TenantLlmConfig

Key patterns:
- **Polymorphic sender**: Messages use `senderId` + `senderType` (human or robot)
- **Hierarchical file scoping**: WorkspaceFile has `scope` enum (TENANT, TEAM, CHATGROUP) with inheritance
- **Prisma 7**: Client generated at `./generated/prisma`, uses `prisma.config.ts`

### API Routes Structure
- `/api/v1/auth/` — Authentication (signup, login, verify-phone, select-tenant)
- `/api/v1/tenants/` — Tenant management
- `/api/v1/teams/` — Team management
- `/api/v1/robots/` — Robot CRUD + onboard endpoint
- `/api/v1/chatgroups/` — Chat groups
- `/api/v1/messages/` — Message CRUD
- `/api/v1/files/` — Workspace files
- `/api/v1/api-keys/` — API key management

### Key Libraries (`platform/src/lib/`)
- `prisma.ts` — PrismaClient singleton with globalThis pattern
- `redis.ts` — ioredis singleton
- `auth.ts` — JWT middleware: signUserToken, signTenantToken, signRobotToken, verifyToken, requireAuth, requireTenantAuth, requireRole, requireRobotAuth
- `errors.ts` — ApiError class, errorResponse(), handleError()
- `crypto.ts` — AES-256-GCM encryption for LLM config (format: `v1:<iv>:<tag>:<encrypted>`)
- `pubsub.ts` — Redis Pub/Sub for cross-instance message broadcasting
- `storage.ts` — File upload/download with workspace directory
- `rate-limit.ts` — Redis sliding window rate limiting
- `sanitize.ts` — HTML tag stripping middleware

### Next.js Patterns
- **Async params**: Next.js 15+ uses `async function({ params }: { params: Promise<{ id: string }> })`
- **App Router**: Pages in `src/app/(auth)/` and `src/app/(dashboard)/`
- **SSE**: Real-time messages via `src/app/api/v1/chatgroups/[id]/stream/route.ts`

### MCP Server
- Standalone Node.js process with stdio transport
- Requires `PLATFORM_URL` and `ROBOT_TOKEN` env vars
- Tools: send_message, get_messages, list_chatgroups, upload_file, download_file, list_files

## Environment Variables

Key variables needed in `platform/.env`:
- `DATABASE_URL` — PostgreSQL connection
- `REDIS_URL` — Redis connection
- `JWT_SECRET` — JWT signing key
- `LLM_CONFIG_ENC_KEY` — AES key for encrypting LLM configs (32 hex chars)
- `ALIYUN_ACCESS_KEY_ID`, `ALIYUN_ACCESS_KEY_SECRET`, `ALIYUN_SIGN_NAME`, `ALIYUN_TEMPLATE_CODE` — SMS verification
