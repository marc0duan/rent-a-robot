# Perseus Design Documentation Blueprint

## TL;DR

> **Quick Summary**: Create 12 comprehensive Obsidian Markdown design documents + 1 JSON Canvas file in `doc/` folder for the Perseus platform — a multi-tenant web application for managing AI robot agents (nanobots). Documents cover everything from system architecture to API design, using Obsidian-flavored markdown with wikilinks, callouts, mermaid diagrams, and frontmatter properties.
> 
> **Deliverables**:
> - 12 Obsidian Markdown (.md) design documents with cross-references
> - 1 JSON Canvas (.canvas) file as a visual document map
> - All files in `doc/` folder with consistent formatting
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (Overview) → Tasks 2-11 (parallel domain docs) → Tasks 12-13 (canvas + cross-ref verification)

---

## Context

### Original Request
User asked to read the `perseus project design blue print.md` file and use product design skill to generate a detailed project design blueprint with Obsidian skills in the `doc/` folder, using multiple files and creating a canvas that connects them.

### Interview Summary
**Key Discussions**:
- All 12 docs + 1 canvas to be created now (not incrementally)
- Canvas should be a "full doc map" — all documents as nodes with relationship edges between them
- Documents use Obsidian Flavored Markdown: wikilinks `[[]]`, callouts `> [!type]`, mermaid diagrams, frontmatter YAML properties, tags

**Research Findings**:
- `doc/` and `design/` folders exist but are empty — ready for creation
- The nanobot codebase exists under `robot/` with ~3,668 lines of Python
- Zero Perseus platform code exists — these docs are pure design specifications
- Nanobot has MCP *client* support but no platform MCP *server* yet
- Nanobot workspace is local-only (`~/.nanobot/workspace`), not multi-tenant

### Metis Review
**Identified Gaps** (addressed):
- **Scope clarification**: These are design docs only — no platform code exists yet. Docs must be self-contained design specs, not code documentation.
- **MCP direction**: Doc 09 must design the MCP *server* that wraps platform APIs, not document the existing MCP client.
- **Nanobot reference accuracy**: Robot lifecycle doc should reference actual nanobot code paths (`robot/nanobot/`) for accuracy.
- **Canvas must use valid JSON Canvas spec 1.0**: 16-char hex IDs, proper node/edge structure.

---

## Work Objectives

### Core Objective
Create a complete, interconnected set of Obsidian design documents that serve as the authoritative product design blueprint for the Perseus platform.

### Concrete Deliverables
- `doc/00-Perseus-Overview.md` — Project overview, vision, tech stack, concept glossary
- `doc/01-System-Architecture.md` — Component architecture with mermaid diagrams
- `doc/02-Data-Model.md` — PostgreSQL schema design with Prisma model specifications
- `doc/03-Auth-and-Security.md` — Multi-tenant auth, RBAC, API keys, phone verification
- `doc/04-Platform-Entities.md` — Entity specifications: Tenant, Team, Chatgroup, Human, Robot
- `doc/05-Chat-System.md` — Chat UI design, @mention system, messaging flow
- `doc/06-Workspace-Files.md` — File management, permission inheritance, storage design
- `doc/07-Robot-Lifecycle.md` — Robot creation, JWT token, onboarding flow
- `doc/08-API-Design.md` — RESTful API endpoint specification
- `doc/09-MCP-Integration.md` — MCP server design for nanobot consumption
- `doc/10-Infrastructure.md` — Docker Compose, containers, volumes, deployment
- `doc/11-User-Journeys.md` — User flows, wireframe concepts, interaction patterns
- `doc/Perseus-Design-Blueprint.canvas` — JSON Canvas visual document map

### Definition of Done
- [ ] All 13 files exist in `doc/` folder
- [ ] Every `.md` file has valid YAML frontmatter with title, tags, status, created
- [ ] Every `.md` file uses wikilinks `[[filename]]` to cross-reference related docs
- [ ] Every `.md` file includes at least one mermaid diagram or table
- [ ] Every `.md` file uses Obsidian callouts (`> [!type]`) for key information
- [ ] The `.canvas` file is valid JSON Canvas Spec 1.0 with all 12 docs as nodes
- [ ] All wikilinks resolve to actual filenames (no broken links)

### Must Have
- YAML frontmatter on every markdown file
- Obsidian wikilinks between documents `[[02-Data-Model]]`
- Mermaid diagrams for architecture and flows
- Callouts for important notes, warnings, tips
- Consistent heading structure across all docs
- Tags for categorization
- The canvas must include all 12 document nodes with labeled edges

### Must NOT Have (Guardrails)
- **No implementation code** — these are design specs, not code files
- **No placeholder content** — every section must have substantive design detail derived from the blueprint
- **No broken wikilinks** — every `[[link]]` must match an actual filename in `doc/`
- **No generic filler** — all content must be specific to Perseus platform
- **No duplicate information** — each doc covers its domain; cross-reference don't repeat
- **No standard markdown links for internal docs** — use wikilinks `[[]]` not `[text](url)`

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: N/A (documentation task)
- **Automated tests**: None (no code)
- **Framework**: N/A

### QA Policy
Every task includes agent-executed QA scenarios verifying file existence, content quality, and cross-reference integrity.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **File creation**: Use Bash — verify file exists and has expected content structure
- **JSON Canvas**: Use Bash — parse JSON, validate structure against spec
- **Cross-references**: Use Bash/Grep — verify all wikilinks resolve to actual files

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation):
└── Task 1: 00-Perseus-Overview.md [writing]

Wave 2 (After Wave 1 — all domain docs in parallel, MAX PARALLEL):
├── Task 2: 01-System-Architecture.md [writing]
├── Task 3: 02-Data-Model.md [writing]
├── Task 4: 03-Auth-and-Security.md [writing]
├── Task 5: 04-Platform-Entities.md [writing]
├── Task 6: 05-Chat-System.md [writing]
├── Task 7: 06-Workspace-Files.md [writing]
├── Task 8: 07-Robot-Lifecycle.md [writing]
├── Task 9: 08-API-Design.md [writing]
├── Task 10: 09-MCP-Integration.md [writing]
├── Task 11: 10-Infrastructure.md [writing]
└── Task 12: 11-User-Journeys.md [writing]

Wave 3 (After Wave 2 — canvas + verification):
├── Task 13: Perseus-Design-Blueprint.canvas [quick]
└── Task 14: Cross-reference verification [quick]

Wave FINAL (After ALL tasks — independent review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Content quality review (unspecified-high)
└── Task F3: Wikilink & canvas integrity check (quick)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 2-12 |
| 2-12 | 1 | 13, 14 |
| 13 | 2-12 | F1-F3 |
| 14 | 2-12 | F1-F3 |
| F1-F3 | 13, 14 | — |

### Agent Dispatch Summary

- **Wave 1**: 1 task → `writing`
- **Wave 2**: 11 tasks → all `writing`
- **Wave 3**: 2 tasks → `quick`
- **FINAL**: 3 tasks → `oracle`, `unspecified-high`, `quick`

---

## TODOs

- [x] 1. Create `doc/00-Perseus-Overview.md` — Project Overview & Vision

  **What to do**:
  - Create the foundational overview document for the Perseus platform
  - Include YAML frontmatter: `title`, `tags` (perseus, overview, design), `status: draft`, `created: 2026-02-19`
  - Write sections: TL;DR (callout), Vision, Core Hierarchy (tenant→team→chatgroup→human/robot), Key Concepts (what is platform/robot/tenant/team/chatgroup/workspace), Tech Stack (table), Docker Architecture (mermaid graph), Related Documents (table with wikilinks to all other docs), Success Metrics
  - Use mermaid diagram for the hierarchy and docker architecture
  - Include wikilinks to ALL other 11 documents in a "Related Documents" section
  - Use Obsidian callouts: `> [!abstract]` for TL;DR, `> [!info]` for robot definition
  - Content source: `perseus project design blue print.md` lines 12-50 (concepts), lines 3 (tech stack)

  **Must NOT do**:
  - Do not include implementation details (no code snippets for actual platform code)
  - Do not repeat full content from other docs — just summarize and link

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation-focused task creating Obsidian-flavored markdown
  - **Skills**: [`obsidian-markdown`, `product-designer`]
    - `obsidian-markdown`: Required for correct Obsidian syntax (wikilinks, callouts, frontmatter, mermaid)
    - `product-designer`: Design document structure and information architecture

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation document)
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 2-12
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `perseus project design blue print.md:12-50` — Core concepts (platform, robot, chatgroup, workspace, team, human definitions)
  - `perseus project design blue print.md:1-10` — Tech stack and docker architecture

  **External References**:
  - Obsidian wikilink syntax: `[[filename]]` and `[[filename|display text]]`
  - Obsidian callout syntax: `> [!type] Title`
  - Mermaid graph syntax for architecture diagrams

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: File exists with correct structure
    Tool: Bash
    Preconditions: doc/ directory exists
    Steps:
      1. Run: test -f doc/00-Perseus-Overview.md && echo "EXISTS" || echo "MISSING"
      2. Run: head -5 doc/00-Perseus-Overview.md — verify YAML frontmatter starts with ---
      3. Run: grep -c '\[\[' doc/00-Perseus-Overview.md — verify wikilinks present
      4. Run: grep -c 'mermaid' doc/00-Perseus-Overview.md — verify mermaid diagram present
      5. Run: grep -c '> \[!' doc/00-Perseus-Overview.md — verify callouts present
    Expected Result: File exists, has frontmatter, ≥10 wikilinks, ≥1 mermaid block, ≥2 callouts
    Evidence: .sisyphus/evidence/task-1-overview-structure.txt

  Scenario: All 11 wikilinks reference valid future filenames
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Extract all [[links]] from file
      2. Verify each matches pattern: 01-System-Architecture through 11-User-Journeys
    Expected Result: 11 wikilinks to other docs present
    Evidence: .sisyphus/evidence/task-1-wikilinks.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `docs(perseus): add project overview document`
  - Files: `doc/00-Perseus-Overview.md`

- [ ] 2. Create `doc/01-System-Architecture.md` — System Architecture

  **What to do**:
  - Create comprehensive system architecture document
  - YAML frontmatter: `title: System Architecture`, `tags: [perseus, architecture, design]`, `status: draft`, `created: 2026-02-19`
  - Sections:
    - **System Overview**: High-level architecture with mermaid C4-style diagram showing Platform Service, PostgreSQL, Redis, Nanobot clients
    - **Component Architecture**: Frontend (Next.js pages/components), Backend (API routes, services, middleware), Database layer (Prisma), Cache layer (Redis)
    - **Communication Patterns**: HTTP REST (platform API), WebSocket (real-time chat), JWT (robot auth), MCP (robot tool integration)
    - **Data Flow Diagrams**: User → Platform → Database flow, Robot → Platform → Response flow, Chat message flow with mermaid sequence diagrams
    - **Technology Decisions**: Why Next.js (SSR + API routes), Why PostgreSQL (relational multi-tenant), Why Redis (sessions + real-time), Why Prisma (type-safe ORM + migrations)
    - **Security Architecture**: Auth middleware, tenant isolation, robot token validation
    - **Scalability Considerations**: Horizontal scaling strategy, database connection pooling
  - Include ≥3 mermaid diagrams (system overview, data flow, sequence diagram)
  - Cross-reference: [[00-Perseus-Overview]], [[02-Data-Model]], [[03-Auth-and-Security]], [[10-Infrastructure]]

  **Must NOT do**:
  - No actual code implementation
  - No detailed API endpoints (that's doc 08)
  - No detailed database schemas (that's doc 02)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Technical architecture documentation
  - **Skills**: [`obsidian-markdown`, `product-designer`]
    - `obsidian-markdown`: Obsidian formatting with mermaid diagrams
    - `product-designer`: Architecture design patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3-12)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `perseus project design blue print.md:3-9` — Tech stack and Docker containers
  - `perseus project design blue print.md:87-98` — API design and MCP integration overview
  - `robot/nanobot/` — Nanobot architecture for understanding robot-side communication

  **External References**:
  - Mermaid sequence diagram syntax for data flows
  - C4 model for system architecture diagrams

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Architecture doc has required sections and diagrams
    Tool: Bash
    Preconditions: doc/ directory exists
    Steps:
      1. Run: test -f doc/01-System-Architecture.md && echo "EXISTS"
      2. Run: grep -c 'mermaid' doc/01-System-Architecture.md — expect ≥3
      3. Run: grep -c '\[\[' doc/01-System-Architecture.md — expect ≥4 wikilinks
      4. Run: grep '## ' doc/01-System-Architecture.md — verify section headings
    Expected Result: File exists, ≥3 mermaid blocks, ≥4 wikilinks, all sections present
    Evidence: .sisyphus/evidence/task-2-architecture-structure.txt

  Scenario: Mermaid diagrams are syntactically valid
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Extract mermaid code blocks
      2. Verify each starts with valid mermaid type (graph, sequenceDiagram, flowchart, etc.)
    Expected Result: All mermaid blocks have valid type declarations
    Evidence: .sisyphus/evidence/task-2-mermaid-valid.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `docs(perseus): add system architecture document`
  - Files: `doc/01-System-Architecture.md`

- [ ] 3. Create `doc/02-Data-Model.md` — Database Schema Design

  **What to do**:
  - Create comprehensive database schema design document for PostgreSQL with Prisma
  - YAML frontmatter: `title: Data Model & Database Schema`, `tags: [perseus, database, prisma, postgresql]`, `status: draft`, `created: 2026-02-19`
  - Sections:
    - **Overview**: Database philosophy, multi-tenant data isolation strategy
    - **Entity Relationship Diagram**: Full ER diagram in mermaid `erDiagram` showing all tables and relationships
    - **Core Models** (with Prisma-style model definitions in code blocks):
      - `Tenant` — id, name, slug, createdAt, updatedAt, ownerId
      - `User` — id, email, phone, name, createdAt (one email can own multiple tenants)
      - `TenantUser` — userId, tenantId, role (owner/admin/user), joinedAt
      - `Team` — id, name, tenantId, createdAt
      - `TeamMember` — teamId, userId/robotId, memberType (human/robot), joinedAt
      - `Robot` — id, name, tenantId, createdById, soulMd (text), status (created/onboarding/onboard/offline), tokenHash, tokenExpiresAt
      - `ChatGroup` — id, name, teamId, createdById, createdAt
      - `ChatGroupMember` — chatGroupId, userId/robotId, memberType, joinedAt
      - `Message` — id, chatGroupId, senderId, senderType, content, mentions (json), createdAt, updatedAt
      - `WorkspaceFile` — id, path, filename, mimeType, size, uploadedById, scope (tenant/team/chatgroup), scopeId, createdAt
      - `ApiKey` — id, keyHash, label, level (tenant/user), tenantId, userId, createdAt, expiresAt
    - **Indexes & Constraints**: Unique constraints, foreign keys, indexes for query performance
    - **Multi-Tenant Isolation**: Row-level tenant filtering strategy, `tenantId` on key tables
    - **Migration Strategy**: Prisma migration workflow, seed data approach
  - Include mermaid ER diagram and tables showing field types
  - Cross-reference: [[00-Perseus-Overview]], [[01-System-Architecture]], [[04-Platform-Entities]], [[08-API-Design]]

  **Must NOT do**:
  - No actual Prisma schema files (design doc only)
  - No migration SQL — just strategy description
  - Do not design S3/Wasabi storage tables (reserved for future)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Database design documentation with Prisma model definitions
  - **Skills**: [`obsidian-markdown`, `database-schema-designer`]
    - `obsidian-markdown`: Obsidian formatting
    - `database-schema-designer`: Schema design best practices, normalization, indexing

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4-12)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `perseus project design blue print.md:20` — Hierarchy: platform → tenant → teams → chatgroup → human or robots
  - `perseus project design blue print.md:57-71` — Auth roles and API key levels
  - `perseus project design blue print.md:36` — Team rules (min members, chatgroup creation rules)
  - `perseus project design blue print.md:52-53` — Robot onboarding and token structure

  **External References**:
  - Prisma model syntax for code block examples
  - PostgreSQL data types reference
  - Mermaid erDiagram syntax

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Data model doc has all required entities
    Tool: Bash
    Preconditions: doc/ exists
    Steps:
      1. Run: test -f doc/02-Data-Model.md && echo "EXISTS"
      2. Run: grep -c 'Tenant\|User\|Team\|Robot\|ChatGroup\|Message\|WorkspaceFile\|ApiKey' doc/02-Data-Model.md — expect ≥8 entities mentioned
      3. Run: grep -c 'erDiagram\|mermaid' doc/02-Data-Model.md — expect ≥1 ER diagram
      4. Run: grep -c 'model ' doc/02-Data-Model.md — expect Prisma model blocks
    Expected Result: All entities present, ER diagram exists, Prisma models shown
    Evidence: .sisyphus/evidence/task-3-datamodel-entities.txt

  Scenario: Multi-tenant isolation is addressed
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Run: grep -i 'tenant.*isolation\|tenantId\|multi-tenant\|row.level' doc/02-Data-Model.md
    Expected Result: Multi-tenant isolation strategy documented with tenantId references
    Evidence: .sisyphus/evidence/task-3-tenant-isolation.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `docs(perseus): add database schema design document`
  - Files: `doc/02-Data-Model.md`

- [ ] 4. Create `doc/03-Auth-and-Security.md` — Authentication & Access Control

  **What to do**:
  - Create comprehensive authentication and security design document
  - YAML frontmatter: `title: Authentication & Security`, `tags: [perseus, auth, security, rbac]`, `status: draft`, `created: 2026-02-19`
  - Sections:
    - **Authentication Flow**: Sign-up with phone number (Aliyun SMS verification), email login, multi-tenant login flow (tenant selection page when user has multiple tenants)
    - **Multi-Tenant Auth**: One email → many tenants, tenant selection before dashboard, tenant context in JWT
    - **Role-Based Access Control (RBAC)**: Built-in roles table:
      - `owner` — full control
      - `admin` — full control except granting admin role
      - `user` — manage only own team resources
    - **Onboarding Flow**: Sign up → phone verification → create new tenant → becomes owner
    - **API Key System**: Two levels:
      - Tenant-level: only admin/owner can create, used for tenant-wide API access
      - User-level: all users can create, personal API credential
    - **Robot Token (JWT)**: Structure (robot name, creator, teams, tenant), default never-expires with optional expiry, used by nanobot to authenticate with platform API
    - **Session Management**: Redis-backed sessions, JWT token structure
    - **Security Headers & Middleware**: CORS, CSRF, rate limiting
    - **Mermaid Diagrams**: Auth flow sequence diagram, RBAC permission matrix
  - Cross-reference: [[00-Perseus-Overview]], [[02-Data-Model]], [[07-Robot-Lifecycle]], [[08-API-Design]]

  **Must NOT do**:
  - No actual JWT secret values or credentials
  - No implementation of Aliyun SMS SDK — design spec only
  - No OAuth/social login (not in blueprint)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Security design documentation
  - **Skills**: [`obsidian-markdown`, `product-designer`]
    - `obsidian-markdown`: Obsidian formatting
    - `product-designer`: Auth UX flow design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2-3, 5-12)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `perseus project design blue print.md:57-71` — Full auth specification (roles, onboarding, API keys, multi-tenant)
  - `perseus project design blue print.md:52-53` — Robot token JWT structure and flow

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Auth doc covers all RBAC roles and API key levels
    Tool: Bash
    Preconditions: doc/ exists
    Steps:
      1. Run: test -f doc/03-Auth-and-Security.md && echo "EXISTS"
      2. Run: grep -c 'owner\|admin\|user' doc/03-Auth-and-Security.md — expect ≥6 role mentions
      3. Run: grep -c 'tenant.level\|user.level\|api.key\|API Key' doc/03-Auth-and-Security.md — expect API key levels
      4. Run: grep -c 'robot.token\|JWT\|jwt' doc/03-Auth-and-Security.md — expect robot token section
      5. Run: grep -c 'mermaid' doc/03-Auth-and-Security.md — expect ≥1 auth flow diagram
    Expected Result: All roles, API key levels, robot tokens documented with diagram
    Evidence: .sisyphus/evidence/task-4-auth-coverage.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `docs(perseus): add authentication and security document`
  - Files: `doc/03-Auth-and-Security.md`

- [ ] 5. Create `doc/04-Platform-Entities.md` — Entity Specifications

  **What to do**:
  - Create detailed entity specification document for all platform entities
  - YAML frontmatter: `title: Platform Entities`, `tags: [perseus, entities, domain-model]`, `status: draft`, `created: 2026-02-19`
  - Sections for EACH entity (Tenant, Team, ChatGroup, Human/User, Robot):
    - **Description**: What it is, its role in the hierarchy
    - **Properties**: Complete field list with types and constraints
    - **Business Rules**: Validation rules, constraints, invariants
    - **Relationships**: How it connects to other entities (use wikilinks)
    - **State Machine** (where applicable): State transitions (e.g., Robot: created → onboarding → onboard → offline)
    - **Management Operations**: CRUD + special operations
  - Entity hierarchy mermaid diagram showing containment and relationships
  - **Tenant**: Organization unit, slug-based routing, settings
  - **Team**: Min structure with humans+robots, shared files, multiple chatgroups
  - **ChatGroup**: Rules (min 2 members, at least 1 human, no 2-robot-only groups), member management
  - **Human/User**: Real person, can manage robots and teams, one email → many tenants
  - **Robot**: AI agent, soul.md definition, onboarding states, token lifecycle
  - Cross-reference: [[00-Perseus-Overview]], [[02-Data-Model]], [[07-Robot-Lifecycle]], [[05-Chat-System]]

  **Must NOT do**:
  - No duplicate of database schema (reference [[02-Data-Model]] instead)
  - No API endpoint details (reference [[08-API-Design]])
  - No UI implementation details

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Domain model documentation with business rules
  - **Skills**: [`obsidian-markdown`, `product-designer`]
    - `obsidian-markdown`: Obsidian formatting
    - `product-designer`: Entity design and state machines

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2-4, 6-12)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `perseus project design blue print.md:14-50` — All entity definitions
  - `perseus project design blue print.md:36` — Team and chatgroup rules
  - `perseus project design blue print.md:52-53` — Robot onboarding states

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All 5 entities documented with business rules
    Tool: Bash
    Preconditions: doc/ exists
    Steps:
      1. Run: test -f doc/04-Platform-Entities.md && echo "EXISTS"
      2. Run: grep -c '## Tenant\|## Team\|## Chat.Group\|## Human\|## Robot' doc/04-Platform-Entities.md — expect 5 entity sections
      3. Run: grep -i 'state\|status\|lifecycle' doc/04-Platform-Entities.md — expect state machine for Robot
      4. Run: grep 'at least\|minimum\|not allowed\|must' doc/04-Platform-Entities.md — expect business rules
    Expected Result: 5 entity sections, state machine present, business rules documented
    Evidence: .sisyphus/evidence/task-5-entities-coverage.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `docs(perseus): add platform entities document`
  - Files: `doc/04-Platform-Entities.md`

- [ ] 6. Create `doc/05-Chat-System.md` — Chat & Messaging Design

  **What to do**:
  - Create comprehensive chat system design document
  - YAML frontmatter: `title: Chat System Design`, `tags: [perseus, chat, messaging, real-time]`, `status: draft`, `created: 2026-02-19`
  - Sections:
    - **Chat UI Layout**: ASCII wireframe showing:
      - Left panel: recent used groups list, clickable sections
      - Right panel: chat body with 60% height message viewing + 40% height editing window
    - **@Mention System**: When user types `@`, show dropdown popup with robots and humans in the team; mention format: `@Jane Generate a python code...`
    - **Message Flow**: User sends message → if contains @robot → extract command → send to nanobot service → nanobot processes → returns result to chatgroup
    - **Message Types**: Text, file attachment (workspace link), system message (robot status), @mention task
    - **Real-Time Messaging**: WebSocket or SSE for real-time updates, Redis pub/sub for message routing
    - **Message Storage**: PostgreSQL for persistent history, message CRUD operations
    - **Chat Group Creation**: UI flow for creating new chatgroup within a team, selecting members
    - **Mermaid Diagrams**: Message flow sequence diagram, @mention task assignment flow, UI layout diagram
  - Cross-reference: [[00-Perseus-Overview]], [[04-Platform-Entities]], [[06-Workspace-Files]], [[08-API-Design]], [[07-Robot-Lifecycle]]

  **Must NOT do**:
  - No actual React component code
  - No WebSocket implementation details — design level only
  - No detailed CSS/Tailwind styling specs

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Chat system design with UX considerations
  - **Skills**: [`obsidian-markdown`, `product-designer`]
    - `obsidian-markdown`: Obsidian formatting with ASCII wireframes
    - `product-designer`: Chat UX design patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2-5, 7-12)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `perseus project design blue print.md:26-28` — Chatgroup UI layout specification (left panel, right panel, 60/40 split)
  - `perseus project design blue print.md:38-44` — @mention task assignment with example
  - `perseus project design blue print.md:89-91` — Chat CRUD API requirements

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Chat system doc has UI wireframe and @mention design
    Tool: Bash
    Preconditions: doc/ exists
    Steps:
      1. Run: test -f doc/05-Chat-System.md && echo "EXISTS"
      2. Run: grep -i '@mention\|@.*mention\|mention.*system\|dropdown\|popup' doc/05-Chat-System.md — expect @mention system documented
      3. Run: grep -i 'left.*panel\|right.*panel\|60%\|40%\|wireframe\|layout' doc/05-Chat-System.md — expect UI layout
      4. Run: grep -c 'mermaid' doc/05-Chat-System.md — expect ≥2 diagrams
      5. Run: grep -i 'websocket\|real.time\|socket' doc/05-Chat-System.md — expect real-time strategy
    Expected Result: @mention system, UI layout, real-time strategy, and flow diagrams present
    Evidence: .sisyphus/evidence/task-6-chat-coverage.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `docs(perseus): add chat system design document`
  - Files: `doc/05-Chat-System.md`

- [ ] 7. Create `doc/06-Workspace-Files.md` — Workspace & File Management

  **What to do**:
  - Create workspace and file management design document
  - YAML frontmatter: `title: Workspace & File Management`, `tags: [perseus, workspace, files, storage]`, `status: draft`, `created: 2026-02-19`
  - Sections:
    - **Workspace Concept**: Simple file-sharing space, exists at three scopes (tenant, team, chatgroup)
    - **Permission Inheritance Model**: Mermaid diagram showing: tenant files → inherited by teams → inherited by chatgroups. Callout explaining broadest-to-specific inheritance.
    - **Storage Architecture**: `/workspace` volume structure using folder hierarchy: `/{tenantId}/{teamId}/{chatgroupId}/` for scope-based access. Reserved S3/Wasabi interface (callout: `> [!warning] Future — S3/Wasabi storage interface reserved`)
    - **Robot File Access Rules**: Robot can ONLY access workspace files from the chatgroup where it was called — NOT other chatgroups. Critical security boundary.
    - **File Operations**: Upload (from chat), download (by robot or human), list, delete, metadata
    - **File Sharing in Chat**: Sending files in chatgroup → stored in workspace → robot can access file path
    - **Folder Structure**: `tenant/{tenantId}/files/`, `team/{teamId}/files/`, `chatgroup/{chatGroupId}/files/`
    - **Mermaid Diagrams**: Permission inheritance flow, file upload/download sequence
  - Cross-reference: [[00-Perseus-Overview]], [[04-Platform-Entities]], [[05-Chat-System]], [[08-API-Design]], [[10-Infrastructure]]

  **Must NOT do**:
  - No S3/Wasabi implementation — just mark as reserved for future
  - No file content processing or indexing design

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: [`obsidian-markdown`, `product-designer`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `perseus project design blue print.md:10` — Workspace volume and S3/Wasabi reservation
  - `perseus project design blue print.md:30-32` — Workspace definition and permission inheritance
  - `perseus project design blue print.md:92` — Robot file access rules

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Workspace doc covers permission inheritance and robot access rules
    Tool: Bash
    Steps:
      1. Run: test -f doc/06-Workspace-Files.md && echo "EXISTS"
      2. Run: grep -i 'inherit\|permission' doc/06-Workspace-Files.md — expect inheritance model
      3. Run: grep -i 'robot.*only\|not.*allowed\|security' doc/06-Workspace-Files.md — expect robot access restriction
      4. Run: grep -i 'S3\|Wasabi\|future' doc/06-Workspace-Files.md — expect future storage mention
    Expected Result: Inheritance, robot restrictions, future storage documented
    Evidence: .sisyphus/evidence/task-7-workspace-coverage.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `docs(perseus): add workspace and file management document`
  - Files: `doc/06-Workspace-Files.md`

- [ ] 8. Create `doc/07-Robot-Lifecycle.md` — Robot Creation & Onboarding

  **What to do**:
  - Create robot lifecycle management design document
  - YAML frontmatter: `title: Robot Lifecycle & Onboarding`, `tags: [perseus, robot, nanobot, onboarding]`, `status: draft`, `created: 2026-02-19`
  - Sections:
    - **Robot Creation Flow**: User creates robot → defines name + soul.md → saved to database
    - **Robot Token Generation**: "Assign a PC" button → generates JWT containing: robot name, creator, teams, tenant. Default never-expires with optional expiry.
    - **Nanobot Onboarding Flow**: Step-by-step: input robot-token → set base_url → call platform API for config (LLM keys) → test connectivity → status update
    - **Robot States**: Mermaid state diagram: `created` → `onboarding` → `onboard` ↔ `offline`
    - **soul.md Design**: What goes in soul.md, robot personality/capabilities
    - **Token Management**: View, revoke, set expiry, rotate tokens
    - **Robot Management UI**: List view, detail view with status, "Assign a PC" button
    - **Nanobot Integration Points**: How `robot/nanobot/` code connects to platform
    - **Mermaid Diagrams**: State machine, onboarding sequence diagram, token flow
  - Cross-reference: [[00-Perseus-Overview]], [[04-Platform-Entities]], [[03-Auth-and-Security]], [[09-MCP-Integration]]

  **Must NOT do**:
  - No changes to existing nanobot code — document integration design
  - No actual JWT signing implementation

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: [`obsidian-markdown`, `product-designer`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `perseus project design blue print.md:52-53` — Complete robot onboarding flow
  - `robot/nanobot/config/schema.py` — Nanobot config schema
  - `robot/nanobot/cli/commands.py` — `nanobot onboard` CLI command
  - `robot/README.md` — Nanobot architecture and quick start

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Robot lifecycle doc covers onboarding flow and state machine
    Tool: Bash
    Steps:
      1. Run: test -f doc/07-Robot-Lifecycle.md && echo "EXISTS"
      2. Run: grep -i 'soul.md' doc/07-Robot-Lifecycle.md — expect soul.md section
      3. Run: grep -i 'robot.token\|JWT' doc/07-Robot-Lifecycle.md — expect token generation
      4. Run: grep -i 'stateDiagram\|state.*machine' doc/07-Robot-Lifecycle.md — expect state machine
      5. Run: grep -c 'mermaid' doc/07-Robot-Lifecycle.md — expect ≥2 diagrams
    Expected Result: Soul.md, token, state machine all documented
    Evidence: .sisyphus/evidence/task-8-robot-lifecycle.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `docs(perseus): add robot lifecycle document`
  - Files: `doc/07-Robot-Lifecycle.md`

- [ ] 9. Create `doc/08-API-Design.md` — RESTful API Specification

  **What to do**:
  - Create comprehensive RESTful API design document
  - YAML frontmatter: `title: RESTful API Design`, `tags: [perseus, api, rest, endpoints]`, `status: draft`, `created: 2026-02-19`
  - Sections:
    - **API Design Principles**: RESTful conventions, versioning (`/api/v1/`), JSON format, pagination, error handling
    - **Authentication**: Bearer token (JWT), robot-token, API key header
    - **Endpoint Groups** (method, path, description, request/response examples):
      - **Tenant Management**: CRUD `/api/v1/tenants`, user management
      - **Team Management**: CRUD `/api/v1/teams`, assign/remove members
      - **Robot Management**: CRUD `/api/v1/robots`, token generation, soul.md update
      - **ChatGroup CRUD**: CRUD `/api/v1/chatgroups`, member management
      - **Chat/Message CRUD**: Send, get history, update, delete messages
      - **Workspace Files CRUD**: Scoped file operations, robot access restricted to calling chatgroup
      - **Auth Endpoints**: Login, signup, phone verification, tenant selection
    - **Request/Response Examples**: JSON examples for key endpoints
    - **Error Response Format**: `{ error: { code, message, details } }`
    - **Rate Limiting**: Per-tenant and per-user limits
    - **Endpoint Summary Table**: Method | Path | Auth | Description
  - Cross-reference: [[00-Perseus-Overview]], [[02-Data-Model]], [[03-Auth-and-Security]], [[09-MCP-Integration]]

  **Must NOT do**:
  - No OpenAPI/Swagger file — design doc with examples only
  - No GraphQL — RESTful only
  - No implementation code

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: [`obsidian-markdown`, `api-design-principles`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `perseus project design blue print.md:87-93` — API requirements: robot-token auth, chatgroup/chat/workspace CRUD
  - `perseus project design blue print.md:73-85` — Tenant and team management features

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: API doc covers all endpoint groups with examples
    Tool: Bash
    Steps:
      1. Run: test -f doc/08-API-Design.md && echo "EXISTS"
      2. Run: grep -c 'GET\|POST\|PUT\|DELETE' doc/08-API-Design.md — expect ≥20 HTTP methods
      3. Run: grep -c '/api/v1/' doc/08-API-Design.md — expect ≥10 versioned paths
      4. Run: grep -c '```json' doc/08-API-Design.md — expect ≥5 JSON examples
    Expected Result: All endpoints with methods, paths, and examples
    Evidence: .sisyphus/evidence/task-9-api-coverage.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `docs(perseus): add RESTful API design document`
  - Files: `doc/08-API-Design.md`

- [ ] 10. Create `doc/09-MCP-Integration.md` — MCP Server Design

  **What to do**:
  - Create MCP (Model Context Protocol) integration design document
  - YAML frontmatter: `title: MCP Server Integration`, `tags: [perseus, mcp, nanobot, integration]`, `status: draft`, `created: 2026-02-19`
  - Sections:
    - **MCP Overview**: What MCP is, why Perseus needs an MCP server
    - **Architecture**: Platform exposes RESTful APIs → MCP server wraps them as MCP tools → Nanobot connects as MCP client. Mermaid diagram showing this flow.
    - **MCP Server Design**: A standalone MCP server that requires only `platform_url` and `robot-token` to configure. It internally calls platform APIs.
    - **MCP Tools** (each tool maps to platform API):
      - `send_message` — Send message to chatgroup
      - `get_messages` — Get chat history
      - `list_chatgroups` — List robot's chatgroups
      - `upload_file` — Upload file to workspace
      - `download_file` — Download file from workspace
      - `list_files` — List workspace files
      - `get_task` — Get assigned task details
    - **Authentication**: Robot-token passed to MCP server, used for all platform API calls
    - **Integration with Nanobot**: Add MCP server to nanobot's `config.json` under `tools.mcpServers`
    - **Transport**: Stdio mode (local process) as default, HTTP/SSE as optional
    - **Mermaid Diagrams**: MCP architecture flow, tool-to-API mapping
  - Cross-reference: [[00-Perseus-Overview]], [[01-System-Architecture]], [[07-Robot-Lifecycle]], [[08-API-Design]]

  **Must NOT do**:
  - No actual MCP server code — design specification
  - Do not modify existing nanobot MCP client code
  - No MCP resource or prompt definitions — tools only for now

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: [`obsidian-markdown`, `mcp-builder`]
    - `mcp-builder`: MCP server design patterns and best practices

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `perseus project design blue print.md:95-98` — MCP requirements: implement with API interface, integrate into nanobot as default
  - `robot/nanobot/agent/tools/mcp.py` — Existing nanobot MCP client implementation
  - `robot/README.md` — MCP config format (tools.mcpServers)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: MCP doc covers server design and tool mappings
    Tool: Bash
    Steps:
      1. Run: test -f doc/09-MCP-Integration.md && echo "EXISTS"
      2. Run: grep -i 'send_message\|get_messages\|list_files\|upload_file' doc/09-MCP-Integration.md — expect tool definitions
      3. Run: grep -i 'robot.token\|platform_url\|base_url' doc/09-MCP-Integration.md — expect auth config
      4. Run: grep -c 'mermaid' doc/09-MCP-Integration.md — expect ≥1 architecture diagram
    Expected Result: MCP tools, auth config, and architecture diagram documented
    Evidence: .sisyphus/evidence/task-10-mcp-coverage.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `docs(perseus): add MCP integration design document`
  - Files: `doc/09-MCP-Integration.md`

- [ ] 11. Create `doc/10-Infrastructure.md` — Docker & Deployment

  **What to do**:
  - Create infrastructure and deployment design document
  - YAML frontmatter: `title: Infrastructure & Deployment`, `tags: [perseus, docker, infrastructure, deployment]`, `status: draft`, `created: 2026-02-19`
  - Sections:
    - **Docker Compose Architecture**: 3 containers — platform service, PostgreSQL, Redis. Mermaid diagram.
    - **Container Specifications**:
      - Platform Service: Next.js app, port mapping, environment variables
      - PostgreSQL: Version, data volume, connection string
      - Redis: Version, persistence config
    - **Volume Mounts**: `/workspace` volume for workspace files, PostgreSQL data volume, Redis data volume
    - **Environment Variables**: Database URL, Redis URL, JWT secret, Aliyun SMS credentials, platform URL
    - **Development Setup**: `docker-compose.yml` structure, hot reload config for Next.js
    - **Networking**: Internal Docker network, service discovery, exposed ports
    - **Health Checks**: Container health check commands
    - **Production Considerations**: Reverse proxy (nginx), SSL/TLS, backup strategy, monitoring (callout: `> [!tip] Future consideration`)
    - **Mermaid Diagrams**: Docker Compose topology, network diagram
  - Cross-reference: [[00-Perseus-Overview]], [[01-System-Architecture]], [[02-Data-Model]], [[06-Workspace-Files]]

  **Must NOT do**:
  - No actual docker-compose.yml file — design doc only
  - No Kubernetes/cloud deployment — Docker Compose for dev only
  - No CI/CD pipeline design (not in blueprint)

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: [`obsidian-markdown`, `product-designer`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `perseus project design blue print.md:5-9` — Docker Compose containers: platform, postgresql, redis
  - `perseus project design blue print.md:10` — /workspace volume
  - `robot/Dockerfile` — Existing nanobot Dockerfile for reference

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Infrastructure doc covers all 3 containers and volumes
    Tool: Bash
    Steps:
      1. Run: test -f doc/10-Infrastructure.md && echo "EXISTS"
      2. Run: grep -i 'postgresql\|postgres' doc/10-Infrastructure.md — expect PostgreSQL section
      3. Run: grep -i 'redis' doc/10-Infrastructure.md — expect Redis section
      4. Run: grep -i '/workspace\|volume' doc/10-Infrastructure.md — expect volume mounts
      5. Run: grep -c 'mermaid' doc/10-Infrastructure.md — expect ≥1 diagram
    Expected Result: All containers, volumes, and topology documented
    Evidence: .sisyphus/evidence/task-11-infra-coverage.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `docs(perseus): add infrastructure and deployment document`
  - Files: `doc/10-Infrastructure.md`

- [ ] 12. Create `doc/11-User-Journeys.md` — User Flows & Wireframes

  **What to do**:
  - Create user journey and wireframe concept document
  - YAML frontmatter: `title: User Journeys & Wireframes`, `tags: [perseus, ux, user-journey, wireframes]`, `status: draft`, `created: 2026-02-19`
  - Sections:
    - **User Personas**: Tenant Owner, Admin, Regular User, Robot (as system actor)
    - **Key User Journeys** (each with steps, touchpoints, emotions):
      - **Sign Up & Onboard**: Phone verification → create tenant → first login
      - **Create a Team**: Navigate to tenant manage → create team → add members
      - **Create a Robot**: Navigate to robot manage → define name/soul.md → "Assign a PC" → token generation
      - **Robot Onboarding**: Copy token → configure nanobot → test connectivity
      - **Create Chat Group**: Select team → create chatgroup → add members
      - **Assign Task to Robot**: Open chatgroup → type `@Jane Generate...` → robot processes → result appears
      - **Share Files**: Upload file in chat → robot downloads via workspace
      - **Manage API Keys**: Navigate to settings → create tenant or user API key
    - **Wireframe Concepts** (ASCII art wireframes):
      - Login page (with tenant selector for multi-tenant users)
      - Dashboard / home page
      - Tenant management page
      - Team management page
      - Robot management page (with "Assign a PC" button)
      - Chat group view (left panel list + right panel 60/40 split)
      - Workspace file browser
    - **Navigation Structure**: Site map mermaid diagram
    - **Mermaid Diagrams**: User journey flows, navigation structure
  - Cross-reference: [[00-Perseus-Overview]], [[03-Auth-and-Security]], [[04-Platform-Entities]], [[05-Chat-System]], [[07-Robot-Lifecycle]]

  **Must NOT do**:
  - No Figma/Sketch mockups — ASCII wireframes and flow descriptions
  - No actual React component design
  - No responsive design specifications

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: [`obsidian-markdown`, `product-designer`]
    - `product-designer`: User journey mapping and wireframing expertise

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Task 1

  **References**:
  - `perseus project design blue print.md:26-28` — Chat UI layout (60/40 split, left/right panels)
  - `perseus project design blue print.md:52-53` — Robot onboarding user flow
  - `perseus project design blue print.md:57-69` — Login auth and tenant selection flow
  - `perseus project design blue print.md:73-85` — Tenant and team management page features

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: User journeys doc has wireframes and journey flows
    Tool: Bash
    Steps:
      1. Run: test -f doc/11-User-Journeys.md && echo "EXISTS"
      2. Run: grep -i 'wireframe\|┌\|┐\|│\|└\|┘\|├\|─' doc/11-User-Journeys.md — expect ASCII wireframes
      3. Run: grep -i 'journey\|flow\|step' doc/11-User-Journeys.md — expect user journeys
      4. Run: grep -c 'mermaid' doc/11-User-Journeys.md — expect ≥1 diagram
      5. Run: grep -i 'persona\|owner\|admin\|user' doc/11-User-Journeys.md — expect personas
    Expected Result: Wireframes, journeys, navigation, and personas documented
    Evidence: .sisyphus/evidence/task-12-journeys-coverage.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `docs(perseus): add user journeys and wireframes document`
  - Files: `doc/11-User-Journeys.md`

- [ ] 13. Create `doc/Perseus-Design-Blueprint.canvas` — Visual Document Map

  **What to do**:
  - Create a JSON Canvas file (Spec 1.0) that visually maps all 12 design documents
  - Structure as a knowledge graph with documents as nodes and relationships as edges
  - **Node Layout** (file nodes referencing each doc):
    - Center: `00-Perseus-Overview.md` as the hub (larger node, color green)
    - Top row: Architecture group — `01-System-Architecture.md`, `10-Infrastructure.md`
    - Left column: Data group — `02-Data-Model.md`, `04-Platform-Entities.md`
    - Right column: Features group — `05-Chat-System.md`, `06-Workspace-Files.md`
    - Bottom left: Security group — `03-Auth-and-Security.md`, `07-Robot-Lifecycle.md`
    - Bottom right: Integration group — `08-API-Design.md`, `09-MCP-Integration.md`
    - Bottom center: `11-User-Journeys.md`
  - **Group nodes** to categorize: "Architecture", "Data Model", "Features", "Security & Robots", "APIs & Integration", "UX"
  - **Edges**: Labeled relationships showing how docs relate (e.g., "defines schema for" from Data Model to Entities, "authenticates" from Auth to API, "consumes" from MCP to API)
  - Use 16-character hex IDs, proper positioning with spacing
  - Must be valid JSON parseable by `JSON.parse()`

  **Must NOT do**:
  - No text nodes with long descriptions — use file nodes pointing to actual docs
  - No link nodes (external URLs)
  - No invalid JSON — must parse cleanly
  - No `\\n` in strings — use `\n` for newlines

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single structured JSON file creation
  - **Skills**: [`json-canvas`]
    - `json-canvas`: JSON Canvas Spec 1.0 formatting and validation rules

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs all docs to exist for file references)
  - **Parallel Group**: Wave 3 (with Task 14)
  - **Blocks**: F1-F3
  - **Blocked By**: Tasks 2-12

  **References**:
  - All 12 doc files (for file node paths)
  - JSON Canvas Spec 1.0 for structure validation

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Canvas file is valid JSON with all document nodes
    Tool: Bash
    Steps:
      1. Run: test -f doc/Perseus-Design-Blueprint.canvas && echo "EXISTS"
      2. Run: python3 -c "import json; d=json.load(open('doc/Perseus-Design-Blueprint.canvas')); print(f'nodes: {len(d.get(\"nodes\",[]))}, edges: {len(d.get(\"edges\",[]))}')"
      3. Verify: ≥12 file nodes (one per doc) + group nodes
      4. Verify: ≥10 edges connecting related documents
      5. Run: python3 -c "import json; d=json.load(open('doc/Perseus-Design-Blueprint.canvas')); ids=[n['id'] for n in d['nodes']]; print('unique' if len(ids)==len(set(ids)) else 'DUPLICATE IDS')"
    Expected Result: Valid JSON, ≥12 file nodes, ≥10 edges, all IDs unique
    Evidence: .sisyphus/evidence/task-13-canvas-valid.txt

  Scenario: Canvas file nodes reference existing doc files
    Tool: Bash
    Steps:
      1. Extract all "file" values from file-type nodes
      2. Verify each referenced file exists in doc/
    Expected Result: All file references resolve to actual files
    Evidence: .sisyphus/evidence/task-13-canvas-refs.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `docs(perseus): add visual design blueprint canvas`
  - Files: `doc/Perseus-Design-Blueprint.canvas`

- [ ] 14. Cross-Reference Verification & Link Fixing

  **What to do**:
  - Verify ALL wikilinks across all 12 markdown files resolve to actual filenames
  - Extract every `[[...]]` wikilink from every doc file
  - Check that referenced filename exists in `doc/`
  - Fix any broken wikilinks (typos, missing references)
  - Verify consistency: if doc A links to doc B, doc B should ideally link back to doc A
  - Generate a cross-reference matrix showing which docs link to which

  **Must NOT do**:
  - No content changes — only fix broken wikilink references
  - No adding new sections to documents

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Automated verification and minor fixes
  - **Skills**: [`obsidian-markdown`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 13)
  - **Parallel Group**: Wave 3
  - **Blocks**: F1-F3
  - **Blocked By**: Tasks 2-12

  **References**:
  - All 12 doc files in `doc/`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All wikilinks resolve to actual files
    Tool: Bash
    Steps:
      1. Run: grep -roh '\[\[[^]]*\]\]' doc/*.md | sort -u — extract all unique wikilinks
      2. For each link, verify the referenced filename exists in doc/
      3. Count total links, valid links, broken links
    Expected Result: 0 broken wikilinks across all documents
    Evidence: .sisyphus/evidence/task-14-wikilinks-verified.txt

  Scenario: No orphaned documents (every doc is linked from at least one other)
    Tool: Bash
    Steps:
      1. List all doc filenames
      2. For each, grep all other docs for wikilinks referencing it
      3. Verify each doc is referenced at least once
    Expected Result: Every document is linked from at least 1 other document
    Evidence: .sisyphus/evidence/task-14-no-orphans.txt
  ```

  **Commit**: NO (only fixes if needed, commit with Wave 3)

---

> 3 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each document: verify it exists in `doc/`, has YAML frontmatter, uses wikilinks, includes mermaid diagrams. Verify canvas file is valid JSON. Compare deliverables against plan. Check all 13 files exist.
  Output: `Files [13/13] | Frontmatter [12/12] | Wikilinks [OK/FAIL] | Canvas [VALID/INVALID] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Content Quality Review** — `unspecified-high`
  Review each document for: substantive design content (not placeholders), consistency with blueprint source material (`perseus project design blue print.md`), no contradictions between docs, proper Obsidian syntax (callouts, wikilinks, mermaid). Check for AI slop: generic filler, over-abstraction, placeholder text like "[TBD]" or "[TODO]".
  Output: `Docs [12 reviewed] | Content Quality [HIGH/MEDIUM/LOW per doc] | Contradictions [NONE/N found] | VERDICT`

- [ ] F3. **Wikilink & Canvas Integrity Check** — `quick`
  Extract all `[[wikilinks]]` from every doc file. Verify each resolves to an actual file in `doc/`. Parse `.canvas` JSON — verify all `file` node paths exist, all edge `fromNode`/`toNode` IDs are valid, JSON validates against Canvas Spec 1.0 rules.
  Output: `Wikilinks [N total, N valid, N broken] | Canvas Nodes [N] | Canvas Edges [N valid/N invalid] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `docs(perseus): add project overview` — `doc/00-Perseus-Overview.md`
- **Wave 2**: `docs(perseus): add domain design documents` — `doc/01-*.md` through `doc/11-*.md`
- **Wave 3**: `docs(perseus): add canvas and verify cross-references` — `doc/Perseus-Design-Blueprint.canvas`
- **Final**: `docs(perseus): complete design blueprint documentation` — all files

---

## Success Criteria

### Verification Commands
```bash
ls doc/*.md | wc -l           # Expected: 12
ls doc/*.canvas | wc -l       # Expected: 1
grep -r '\[\[' doc/*.md       # Expected: wikilinks in every file
python3 -c "import json; json.load(open('doc/Perseus-Design-Blueprint.canvas'))"  # Expected: valid JSON
```

### Final Checklist
- [ ] All 12 `.md` files present in `doc/`
- [ ] 1 `.canvas` file present in `doc/`
- [ ] All files have YAML frontmatter
- [ ] All files use Obsidian wikilinks for cross-references
- [ ] All wikilinks resolve to actual files
- [ ] Canvas JSON is valid and includes all 12 doc nodes
- [ ] No placeholder/generic content — all content specific to Perseus
- [ ] Consistent formatting across all documents
