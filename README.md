<p align="center">
  <img src="favicon.png" alt="Perseus" width="120" />
</p>

<h1 align="center">Perseus Platform</h1>

<p align="center">
  <strong>A multi-tenant web platform for managing and orchestrating AI robot agents</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Python-≥3.11-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

---

## Overview

Perseus is a multi-tenant web platform for managing AI robot agents ("nanobots"). It provides a centralized command center where teams can assign tasks to robots via chat-based `@mentions`, share files through a hierarchical workspace, and monitor robot work progress in real-time.

Think of it as **Slack meets AI agent orchestration** — humans and robots collaborate in chatgroups, with robots executing tasks on real computers using tools, shell access, and file systems.

### Why Perseus?

- **Chat-driven task assignment** — `@mention` a robot in a chatgroup to assign work, just like messaging a teammate.
- **Multi-tenant isolation** — Each organization gets full data isolation with role-based access control.
- **Real-time collaboration** — SSE-powered live message delivery between humans and robots.
- **Hierarchical file sharing** — Workspace files cascade from tenant → team → chatgroup levels.
- **MCP integration** — Robots connect via the Model Context Protocol for standardized tool communication.

---

## Architecture

Perseus consists of three main components that work together:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Perseus Platform                             │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │   Platform    │    │  MCP Server  │    │    Nanobot Agent     │  │
│  │  (Next.js)    │◄──►│  (Node.js)   │◄──►│    (Python)          │  │
│  │              │    │              │    │                      │  │
│  │  • Web UI     │    │  • stdio     │    │  • LLM-powered      │  │
│  │  • REST API   │    │  • 6 tools   │    │  • Tool execution   │  │
│  │  • SSE stream │    │  • JWT auth  │    │  • Multi-provider    │  │
│  └──────┬───────┘    └──────────────┘    └──────────────────────┘  │
│         │                                                           │
│  ┌──────┴───────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │  PostgreSQL   │    │    Redis     │    │  Workspace Volume    │  │
│  │  (Data store) │    │ (Cache/PubSub│    │  (File storage)      │  │
│  └──────────────┘    └──────────────┘    └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

| Component | Directory | Tech Stack | Description |
|-----------|-----------|------------|-------------|
| **Platform** | `platform/` | Next.js 16, React 19, Tailwind CSS 4, Prisma 7 | Web application with frontend UI and REST API backend |
| **Nanobot** | `robot/` | Python 3.11+, LiteLLM, MCP | AI agent that runs on remote machines and executes tasks |
| **MCP Server** | `mcp-server/` | Node.js, TypeScript, MCP SDK | Communication bridge between nanobots and the platform API |

### Core Hierarchy

```
Platform → Tenant → Team → ChatGroup → [Humans + Robots]
```

- **Tenant** — An organization (company, lab, personal workspace)
- **Team** — A group of humans and robots collaborating together
- **ChatGroup** — A conversation space for task assignment and communication
- **Robot (Nanobot)** — An AI agent running on a real computer with ears, mouth, and hands

---

## Features

### Platform

- **Multi-tenant architecture** with strict row-level data isolation
- **JWT authentication** with three token types: user, tenant-scoped, and robot
- **Role-based access control** — Owner, Admin, User roles per tenant
- **Team management** — Create teams, add/remove humans and robots
- **Chat system** — Real-time messaging with `@mention` task assignment
- **SSE streaming** — Live message delivery via Server-Sent Events with Redis Pub/Sub
- **Workspace files** — Hierarchical file sharing (tenant → team → chatgroup) with upload/download
- **API key management** — Issue and revoke API keys for programmatic access
- **LLM configuration** — Per-tenant encrypted LLM provider settings (AES-256-GCM)
- **Rate limiting** — Redis sliding-window rate limiting (1000/hr users, 5000/hr robots)
- **Request logging** — Structured JSON audit trail for all API requests
- **Input sanitization** — HTML tag stripping on all user inputs
- **Health checks** — Database and Redis connectivity monitoring

### Nanobot (Robot Agent)

- **Ultra-lightweight** — ~4,000 lines of core agent code
- **Multi-provider LLM support** — OpenAI, DeepSeek, Qwen, Moonshot, vLLM, and more
- **Tool execution** — Shell commands, file operations, web browsing
- **MCP support** — Model Context Protocol for standardized tool integration
- **Multi-channel** — Slack, Discord, Telegram, DingTalk, Feishu, WeChat, Email, QQ
- **Memory system** — Persistent conversation memory with session management
- **Scheduled tasks** — Cron-based task automation with natural language scheduling
- **Heartbeat monitoring** — Regular status reporting to the platform

### MCP Server

- **6 built-in tools** — `send_message`, `get_messages`, `list_chatgroups`, `upload_file`, `download_file`, `list_files`
- **SSE bridge** — Optional real-time event listener that forwards platform events as MCP notifications
- **Zod validation** — Type-safe tool schemas with runtime validation
- **Auto-reconnect** — Exponential backoff reconnection for SSE streams

---

## Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **Python** >= 3.11
- **Docker** & **Docker Compose** (recommended)
- **PostgreSQL** 16+ (if running without Docker)
- **Redis** 7+ (if running without Docker)

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/rent-a-robot.git
cd rent-a-robot
```

### 2. Start with Docker Compose (Recommended)

The fastest way to get everything running:

```bash
cd platform

# Copy environment template
cp .env.example .env
# Edit .env with your configuration (JWT secrets, etc.)

# Build and start all services
docker compose up --build
```

This starts:
- **Platform** on `http://localhost:3000`
- **PostgreSQL** on `localhost:5432`
- **Redis** on `localhost:6379`

### 3. Run Database Migrations & Seed

```bash
cd platform

# Generate Prisma client
npm run db:generate

# Apply migrations
npm run db:migrate

# Seed with sample data (Alice, Bob, Acme Corp, Atlas robot)
npm run db:seed
```

### 4. Manual Setup (Without Docker)

<details>
<summary>Click to expand manual setup instructions</summary>

#### Platform

```bash
cd platform

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed

# Start development server
npm run dev
```

#### MCP Server

```bash
cd mcp-server

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the server (requires PLATFORM_URL and ROBOT_TOKEN)
PLATFORM_URL=http://localhost:3000 ROBOT_TOKEN=<your-robot-jwt> npm run start
```

#### Nanobot Agent

```bash
cd robot

# Install from source
pip install -e .

# Run the agent
nanobot
```

</details>

---

## API Reference

Perseus exposes a comprehensive REST API. All endpoints require JWT authentication unless noted.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/signup` | Register with email, password, name, phone |
| `POST` | `/api/v1/auth/login` | Login, returns JWT + tenant list |
| `POST` | `/api/v1/auth/verify-phone` | Phone verification via SMS code |
| `POST` | `/api/v1/auth/select-tenant` | Switch tenant context |
| `POST` | `/api/v1/auth/send-phone-code` | Send SMS verification code |

### Tenants

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/tenants` | List user's tenants |
| `POST` | `/api/v1/tenants` | Create tenant |
| `GET` | `/api/v1/tenants/:id` | Get tenant details |
| `PUT` | `/api/v1/tenants/:id` | Update tenant (owner/admin) |
| `DELETE` | `/api/v1/tenants/:id` | Delete tenant (owner only) |
| `GET` | `/api/v1/tenants/:id/users` | List tenant users |
| `GET/PUT/DELETE` | `/api/v1/tenants/:id/llm-config` | Manage LLM provider config |

### Teams

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/teams` | List teams in tenant |
| `POST` | `/api/v1/teams` | Create team (auto-creates "General" chatgroup) |
| `GET` | `/api/v1/teams/:id` | Get team details |
| `PUT` | `/api/v1/teams/:id` | Update team |
| `DELETE` | `/api/v1/teams/:id` | Disband team |
| `POST` | `/api/v1/teams/:id/members` | Add member |
| `DELETE` | `/api/v1/teams/:id/members/:memberId` | Remove member |

### Robots

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/robots` | List robots in tenant |
| `POST` | `/api/v1/robots` | Create robot (name + soul markdown) |
| `GET` | `/api/v1/robots/:id` | Get robot details |
| `PUT` | `/api/v1/robots/:id` | Update robot + generate JWT token |
| `DELETE` | `/api/v1/robots/:id` | Decommission robot |

### Chat Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/chatgroups` | List user's chatgroups |
| `POST` | `/api/v1/chatgroups` | Create chatgroup (min 2 members) |
| `GET` | `/api/v1/chatgroups/:id` | Get group metadata & members |
| `PUT` | `/api/v1/chatgroups/:id` | Modify group |
| `DELETE` | `/api/v1/chatgroups/:id` | Delete group |
| `GET` | `/api/v1/chatgroups/:id/stream` | SSE real-time message stream |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/chatgroups/:id/messages` | Message history (cursor pagination) |
| `POST` | `/api/v1/chatgroups/:id/messages` | Send message with @mention parsing |
| `PUT` | `/api/v1/messages/:id` | Edit message (sender only) |
| `DELETE` | `/api/v1/messages/:id` | Delete message |

### Workspace Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/chatgroups/:id/files` | List files with inheritance |
| `POST` | `/api/v1/chatgroups/:id/files` | Upload file (multipart/form-data) |
| `GET` | `/api/v1/files/:id` | Get file metadata / download |
| `DELETE` | `/api/v1/files/:id` | Delete file |

### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/api-keys` | List keys (admin/owner) |
| `POST` | `/api/v1/api-keys` | Create key (plaintext shown once) |
| `DELETE` | `/api/v1/api-keys/:id` | Revoke key |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check (DB + Redis) |
| `GET` | `/api/v1/onboard` | Robot onboarding endpoint |

---

## Database Schema

Perseus uses **Prisma 7** with PostgreSQL. The schema includes 12 models:

| Model | Purpose |
|-------|---------|
| `Tenant` | Organization / workspace |
| `User` | Human user account |
| `TenantUser` | User-tenant membership with role |
| `Team` | Collaboration group within a tenant |
| `TeamMember` | Human or robot membership in a team |
| `Robot` | AI agent entity |
| `ChatGroup` | Conversation space within a team |
| `ChatGroupMember` | Member of a chatgroup |
| `Message` | Chat message with polymorphic sender |
| `WorkspaceFile` | File with hierarchical scope (tenant/team/chatgroup) |
| `ApiKey` | Programmatic access key |
| `TenantLlmConfig` | Encrypted LLM provider configuration |

Key design patterns:
- **Polymorphic sender** — Messages use `senderId` + `senderType` (human or robot)
- **Hierarchical file scoping** — Files inherit visibility: tenant → team → chatgroup
- **Multi-tenant isolation** — Every query filters by `tenantId`

---

## Project Structure

```
rent-a-robot/
├── favicon.png                  # Project logo
├── LICENSE                      # Perseus Platform License
├── CLAUDE.md                    # AI assistant context
├── PROGRESS.md                  # Development progress tracker
│
├── doc/                         # Design documentation
│   ├── 00-Perseus-Overview.md
│   ├── 01-System-Architecture.md
│   ├── 02-Data-Model.md
│   ├── 03-Auth-and-Security.md
│   ├── 04-Platform-Entities.md
│   ├── 05-Chat-System.md
│   ├── 06-Workspace-Files.md
│   ├── 07-Robot-Lifecycle.md
│   ├── 08-API-Design.md
│   ├── 09-MCP-Integration.md
│   ├── 10-Infrastructure.md
│   └── 11-User-Journeys.md
│
├── platform/                    # Next.js web application
│   ├── docker-compose.yml       # Docker services (platform + postgres + redis)
│   ├── Dockerfile               # Multi-stage build
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   ├── seed.ts              # Seed data
│   │   └── migrations/
│   └── src/
│       ├── middleware.ts         # CORS, logging, auth
│       ├── app/                  # Next.js App Router pages
│       │   ├── (auth)/           # Login, signup, tenant selection
│       │   ├── (dashboard)/      # Dashboard, teams, robots, chat
│       │   └── api/v1/           # REST API routes
│       ├── components/           # React UI components (shadcn/ui)
│       ├── hooks/                # React hooks (auth context)
│       ├── lib/                  # Core libraries
│       │   ├── auth.ts           # JWT middleware
│       │   ├── prisma.ts         # Database client
│       │   ├── redis.ts          # Cache client
│       │   ├── pubsub.ts         # Redis Pub/Sub
│       │   ├── storage.ts        # File upload/download
│       │   ├── crypto.ts         # AES-256-GCM encryption
│       │   ├── rate-limit.ts     # Sliding window limiter
│       │   └── sanitize.ts       # Input sanitization
│       └── services/             # Business logic
│
├── robot/                       # Nanobot AI agent
│   ├── pyproject.toml           # Python package config
│   ├── Dockerfile
│   ├── nanobot/                  # Agent source code
│   │   ├── agent/               # Core agent logic
│   │   ├── bus/                  # Event bus
│   │   ├── channels/            # Multi-platform integrations
│   │   ├── providers/           # LLM provider adapters
│   │   ├── session/             # Session management
│   │   ├── skills/              # Agent capabilities
│   │   └── cron/                # Scheduled tasks
│   ├── bridge/                  # Node.js MCP bridge
│   └── tests/                   # Test suite
│
└── mcp-server/                  # MCP communication server
    ├── package.json
    └── src/
        ├── index.ts             # Server entry point
        ├── bridge.ts            # SSE event bridge
        ├── config.ts            # Configuration
        ├── tools/               # MCP tool definitions
        └── services/            # Platform API client
```

---

## Environment Variables

Create a `.env` file in the `platform/` directory:

```env
# Database
DATABASE_URL=postgresql://perseus:perseus@localhost:5432/perseus

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your-jwt-secret
JWT_ROBOT_SECRET=your-robot-jwt-secret

# File Storage
WORKSPACE_DIR=/workspace
MAX_FILE_SIZE=52428800  # 50MB

# SMS (Aliyun - optional)
ALIYUN_ACCESS_KEY_ID=your-key
ALIYUN_ACCESS_KEY_SECRET=your-secret
ALIYUN_SMS_SIGN_NAME=your-sign
ALIYUN_SMS_TEMPLATE_CODE=your-template

# LLM Encryption
LLM_ENCRYPTION_KEY=your-32-byte-hex-key
```

For the MCP Server:

```env
PLATFORM_URL=http://localhost:3000
ROBOT_TOKEN=<jwt-token-from-robot-onboarding>
ENABLE_SSE=1  # Optional: enable SSE bridge
```

---

## Development

### Platform Commands

```bash
cd platform

npm run dev          # Start development server (port 3000)
npm run build        # Production build
npm run lint         # Run ESLint
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:push      # Push schema changes to DB
npm run db:studio    # Open Prisma Studio (visual DB browser)
npm run db:seed      # Seed database with sample data
```

### MCP Server Commands

```bash
cd mcp-server

npm run build        # Compile TypeScript
npm run start        # Start MCP server
npm run dev          # Build + start in dev mode
```

### Robot Commands

```bash
cd robot

pip install -e .     # Install in development mode
pip install -e ".[dev]"  # Install with dev dependencies
nanobot              # Run the agent

# Tests
pytest               # Run test suite
```

### Docker

```bash
cd platform

docker compose build     # Build all services
docker compose up        # Start platform + PostgreSQL + Redis
docker compose up -d     # Start in background
docker compose down      # Stop all services
docker compose logs -f   # Follow logs
```

---

## Security

- **Multi-tenant isolation** — All database queries are scoped to the authenticated tenant
- **JWT tokens** — Three types: user (login), tenant-scoped (operations), robot (agent auth)
- **Password hashing** — bcrypt with salt rounds
- **API key hashing** — Keys stored as bcrypt hashes, plaintext shown only once at creation
- **LLM config encryption** — AES-256-GCM with format `v1:<iv>:<tag>:<encrypted>`
- **Rate limiting** — Redis sliding-window: 1,000 req/hr for users, 5,000 req/hr for robots
- **Input sanitization** — HTML tag stripping on all user-submitted text
- **CORS** — Configured preflight handling for API routes
- **Request audit logging** — Structured JSON logs for all API requests

---

## Documentation

Comprehensive design documentation is available in the [`doc/`](doc/) directory:

| Document | Description |
|----------|-------------|
| [Perseus Overview](doc/00-Perseus-Overview.md) | Vision, core concepts, and tech stack |
| [System Architecture](doc/01-System-Architecture.md) | Component design and communication patterns |
| [Data Model](doc/02-Data-Model.md) | Database schema with Prisma models and ERD |
| [Auth & Security](doc/03-Auth-and-Security.md) | Multi-tenant auth, RBAC, API keys |
| [Platform Entities](doc/04-Platform-Entities.md) | Entity specs: Tenant, Team, ChatGroup, Robot |
| [Chat System](doc/05-Chat-System.md) | Chat UI, @mention system, real-time messaging |
| [Workspace Files](doc/06-Workspace-Files.md) | File management and permission inheritance |
| [Robot Lifecycle](doc/07-Robot-Lifecycle.md) | Robot creation, JWT tokens, onboarding flow |
| [API Design](doc/08-API-Design.md) | RESTful API endpoints and conventions |
| [MCP Integration](doc/09-MCP-Integration.md) | MCP server design for nanobot communication |
| [Infrastructure](doc/10-Infrastructure.md) | Docker Compose setup and deployment |
| [User Journeys](doc/11-User-Journeys.md) | User flows and wireframes |

---

## License

Perseus Platform License — Free for personal, non-commercial use. Commercial/enterprise use requires a separate license.

See [LICENSE](LICENSE) for full details. For business licensing inquiries, contact: marcoduan1993@gmail.com
