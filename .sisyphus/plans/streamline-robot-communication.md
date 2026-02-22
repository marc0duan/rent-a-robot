# Streamline Platform ↔ Nanobot Communication

## TL;DR

> **Quick Summary**: Implement end-to-end admin-to-robot communication: robot creation with team/chatgroup/LLM assignment → JWT token generation → nanobot CLI onboarding → per-robot SSE stream → bidirectional @mention routing between chatgroups and robot streams. Replaces the current shared stream + MCP-only communication with direct per-robot channels.
> 
> **Deliverables**:
> - Enhanced robot creation UI with team, chatgroup, and LLM provider assignment
> - New per-robot SSE stream endpoint (`/api/v1/robots/[id]/stream`)
> - New robot config endpoint (`/api/v1/robots/[id]/config`)
> - New robot message POST endpoint (`/api/v1/robots/[id]/messages`)
> - @mention → robot stream routing via Redis pub/sub
> - Robot response → chatgroup stream routing
> - Nanobot SQLite3 local storage (replacing JSON config)
> - Updated nanobot CLI onboard flow with SQLite persistence
> - Working `PlatformChannel.send()` for direct robot→platform messages
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 5 waves
> **Critical Path**: Task 1 → Task 3 → Task 6 → Task 8 → Task 12 → Task 15 → Final

---

## Context

### Original Request
Admin creates robot on robots page with name, soul.md, team, chatgroup, and LLM provider assignments. After creation, JWT token is displayed. Admin copies token and runs `nanobot onboard --platform-url localhost:3000 --token <token>`. Nanobot calls `/api/v1/robots/[id]/config`, stores config in local SQLite3 DB, then listens to `/api/v1/robots/[id]/stream` for bidirectional SSE communication. @mention routing delivers chatgroup messages to the mentioned robot's stream, and robot responses are routed back to the chatgroup.

### Interview Summary
**Key Discussions**:
- **LLM Provider**: Only MiniMax.com support needed currently
- **Storage**: Nanobot must use SQLite3, not JSON config files
- **Communication**: SSE downstream (platform→robot) + POST upstream (robot→platform)
- **Testing**: No automated tests; Agent-Executed QA scenarios only
- **MCP Server**: Not being modified — existing MCP tools continue working as safety net

**Research Findings**:
- Platform has partial implementation: robot CRUD, shared stream, onboard endpoint, @mention parsing
- Nanobot has Typer CLI with existing `onboard` command, JSON config storage, no PlatformChannel.send()
- Frontend has robot create/edit/delete UI, team/chatgroup member management, LLM settings
- Redis pub/sub uses `chatgroup:${chatGroupId}:messages` pattern — needs new robot-specific channels
- 3 existing bugs found: soulMd required/optional mismatch, "mooonshot" typo, env var naming

### Metis Review
**Identified Gaps** (addressed in plan):
- Self-mention loop prevention: Robot must ignore messages where `senderId === self.robotId`
- Concurrent connection handling: Accept last connection, close previous (or document no-op)
- Robot removal from chatgroup: Not real-time updated in SSE — acceptable, document as known limitation
- Message ordering during reconnection: Accept message loss during SSE disconnect (no replay)
- @mention of offline robot: Message is published but lost — acceptable for v1
- Robot message POST needs `chatGroupId` so robot knows where to respond
- SSE message events must include `chatGroupId` field
- Message size limit on robot POST endpoint (10KB max)
- Robot name length validation (1-2 words to match @mention regex)

---

## Work Objectives

### Core Objective
Enable direct bidirectional communication between the Perseus platform and nanobot agents through per-robot SSE streams with @mention routing, replacing the current shared stream + MCP-only pattern.

### Concrete Deliverables
- `platform/src/app/api/v1/robots/[id]/stream/route.ts` — Per-robot SSE stream endpoint
- `platform/src/app/api/v1/robots/[id]/config/route.ts` — Robot config endpoint (replaces /onboard)
- `platform/src/app/api/v1/robots/[id]/messages/route.ts` — Robot POST message endpoint
- `platform/src/lib/pubsub.ts` — Extended with robot-specific channel functions
- `platform/src/app/api/v1/chatgroups/[id]/messages/route.ts` — @mention routing logic added
- `platform/src/app/(dashboard)/robots/page.tsx` — Enhanced creation UI
- `robot/nanobot/config/database.py` — SQLite3 storage module
- `robot/nanobot/channels/platform.py` — Working send() implementation
- `robot/nanobot/cli/commands.py` — Updated onboard command

### Definition of Done
- [ ] `curl` round-trip: human @mentions robot → robot receives via SSE → robot POSTs response → human sees response in chatgroup stream (< 2 seconds)
- [ ] `nanobot onboard --platform-url http://localhost:3000 --token <token>` succeeds and stores config in SQLite3 DB
- [ ] Existing MCP server `send_message` tool continues working unchanged
- [ ] Existing `/api/v1/robots/stream` (shared) continues working unchanged

### Must Have
- Per-robot SSE stream at `/api/v1/robots/[id]/stream`
- Robot config endpoint at `/api/v1/robots/[id]/config`
- Robot message POST endpoint at `/api/v1/robots/[id]/messages`
- @mention routing from chatgroup to robot-specific Redis channel
- Robot response routing back to chatgroup stream
- SQLite3 storage in nanobot for decoded token claims + config
- Self-mention loop prevention (robot ignores own messages)
- Robot-chatgroup membership verification on POST
- `chatGroupId` included in SSE message events
- Robot name validation (1-2 words, alphanumeric + spaces only)

### Must NOT Have (Guardrails)
- **No changes to `mcp-server/`** — Zero files touched
- **No Prisma schema changes** — Use existing models and junction tables as-is
- **No multi-LLM provider UI** — MiniMax only; the existing `TenantLlmConfig` already stores provider config
- **No robot health monitoring dashboard** — Robot status field is sufficient
- **No message edit/delete sync** through robot stream — new messages only
- **No file sharing through robot channel** — MCP server handles this
- **No robot-to-robot direct communication** — Only human↔robot via chatgroup
- **No admin UI for stream monitoring** — Future feature
- **No webhook/callback alternatives** — SSE down + POST up only
- **No refactoring of `onboard` CLI from `requests` to `httpx`** — Sync is fine for one-shot CLI
- **No deletion of existing JSON config files** — SQLite migration reads JSON, keeps backup
- **No over-commenting** — Follow existing code style; no JSDoc/docstring proliferation
- **No premature abstraction** — No "BaseCommunicationChannel" or "StreamProviderFactory"
- **No excessive error handling** — Match existing error patterns in the codebase

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.
> Acceptance criteria requiring "user manually tests/confirms" are FORBIDDEN.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: None
- **QA Method**: Agent-Executed QA scenarios using curl, Playwright, and tmux

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API endpoints**: Use Bash (curl) — Send requests, assert status + response fields
- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **CLI/TUI**: Use interactive_bash (tmux) — Run command, validate output
- **SSE streams**: Use Bash (curl -N with timeout) — Connect, capture events, verify content

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — bug fixes + infrastructure):
├── Task 1: Fix soulMd required/optional mismatch [quick]
├── Task 2: Fix "mooonshot" provider typo [quick]
├── Task 3: Add robot pub/sub channel functions to pubsub.ts [quick]
├── Task 4: Add robot name validation (1-2 words) [quick]
└── Task 5: Create SQLite3 storage module for nanobot [unspecified-high]

Wave 2 (After Wave 1 — new platform endpoints, MAX PARALLEL):
├── Task 6: Create per-robot SSE stream endpoint [deep]
├── Task 7: Create robot config endpoint [unspecified-high]
├── Task 8: Create robot message POST endpoint [deep]
└── Task 9: Update nanobot onboard CLI to use SQLite3 + new config endpoint [unspecified-high]

Wave 3 (After Wave 2 — routing + nanobot channel):
├── Task 10: Wire @mention routing in chatgroup message creation [deep]
├── Task 11: Implement PlatformChannel.send() in nanobot [unspecified-high]
└── Task 12: Update nanobot PlatformChannel to use per-robot stream URL [unspecified-high]

Wave 4 (After Wave 3 — frontend enhancement):
├── Task 13: Add team/chatgroup selectors to robot creation UI [visual-engineering]
├── Task 14: Enhance token display dialog with onboard command [visual-engineering]
└── Task 15: End-to-end integration QA [deep]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Real manual QA [unspecified-high]
└── Task F4: Scope fidelity check [deep]

Critical Path: Task 1 → Task 3 → Task 6 → Task 8 → Task 10 → Task 12 → Task 15 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 5 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 13 | 1 |
| 2 | — | — | 1 |
| 3 | — | 6, 8, 10 | 1 |
| 4 | — | 13 | 1 |
| 5 | — | 9 | 1 |
| 6 | 3 | 12, 15 | 2 |
| 7 | — | 9 | 2 |
| 8 | 3 | 10, 11, 15 | 2 |
| 9 | 5, 7 | 15 | 2 |
| 10 | 3, 8 | 15 | 3 |
| 11 | 8 | 12, 15 | 3 |
| 12 | 6, 11 | 15 | 3 |
| 13 | 1, 4 | 15 | 4 |
| 14 | — | 15 | 4 |
| 15 | 6, 8, 9, 10, 11, 12, 13, 14 | F1-F4 | 4 |
| F1-F4 | 15 | — | FINAL |

### Agent Dispatch Summary

- **Wave 1**: **5 tasks** — T1 → `quick`, T2 → `quick`, T3 → `quick`, T4 → `quick`, T5 → `unspecified-high`
- **Wave 2**: **4 tasks** — T6 → `deep`, T7 → `unspecified-high`, T8 → `deep`, T9 → `unspecified-high`
- **Wave 3**: **3 tasks** — T10 → `deep`, T11 → `unspecified-high`, T12 → `unspecified-high`
- **Wave 4**: **3 tasks** — T13 → `visual-engineering`, T14 → `visual-engineering`, T15 → `deep`
- **FINAL**: **4 tasks** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

### Wave 1 — Bug Fixes + Infrastructure

 [x] 1. Fix soulMd required/optional mismatch in robot creation API

  **What to do**:
  - In `platform/src/app/api/v1/robots/route.ts`, change the POST handler validation:
    - Current: `if (!name || !soulMd) return errorResponse('Missing required fields', 400)`
    - Change to: `if (!name) return errorResponse('Missing required fields: name', 400)`
    - Default `soulMd` to empty string if not provided: `const soul = soulMd || ''`
  - Verify that `prisma.robot.create` accepts empty string for `soulMd` (it's a `@db.Text` field, should be fine)

  **Must NOT do**:
  - Do not change the frontend — it already handles optional soulMd correctly
  - Do not add complex default soul content — just use empty string

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, 2-line change, straightforward validation fix
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `api-design-principles`: Not needed for a simple validation fix

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Task 13 (frontend needs valid API to test against)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `platform/src/app/api/v1/robots/route.ts:27-52` — Current POST handler with the validation check at line ~35

  **API/Type References**:
  - `platform/prisma/schema.prisma` — Robot model, `soulMd String @db.Text` field definition

  **External References**: None

  **WHY Each Reference Matters**:
  - `robots/route.ts` — Contains the exact `if (!name || !soulMd)` validation that needs to be relaxed. The executor should read lines 27-52 to see the full POST handler context.
  - `schema.prisma` — Confirms `soulMd` is a Text field that accepts empty strings (no NOT NULL constraint beyond Prisma's required field, which accepts empty string).

  **Acceptance Criteria**:
  - [ ] `curl -X POST http://localhost:3000/api/v1/robots -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' -d '{"name": "TestBot"}'` → 201 with robot object
  - [ ] `curl -X POST http://localhost:3000/api/v1/robots -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' -d '{"name": "TestBot", "soulMd": "You are helpful"}'` → 201 (existing behavior preserved)
  - [ ] `curl -X POST http://localhost:3000/api/v1/robots -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' -d '{}'` → 400 (name still required)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Create robot without soulMd (happy path)
    Tool: Bash (curl)
    Preconditions: Dev server running at localhost:3000, valid tenant auth token in $TOKEN
    Steps:
      1. curl -s -w '\n%{http_code}' -X POST http://localhost:3000/api/v1/robots \
         -H 'Authorization: Bearer '$TOKEN -H 'Content-Type: application/json' \
         -d '{"name": "SoullessBot"}'
      2. Parse response JSON — extract robot.id, robot.name, robot.soulMd, robot.status
      3. Assert HTTP status is 201
      4. Assert robot.name === "SoullessBot"
      5. Assert robot.soulMd === "" (empty string, not null/undefined)
      6. Assert robot.status === "created"
    Expected Result: 201 with robot object containing empty soulMd
    Failure Indicators: 400 status, "Missing required fields" error, soulMd is null
    Evidence: .sisyphus/evidence/task-1-create-without-soul.json

  Scenario: Create robot without name (error case)
    Tool: Bash (curl)
    Preconditions: Same as above
    Steps:
      1. curl -s -w '\n%{http_code}' -X POST http://localhost:3000/api/v1/robots \
         -H 'Authorization: Bearer '$TOKEN -H 'Content-Type: application/json' \
         -d '{"soulMd": "I have a soul but no name"}'
      2. Assert HTTP status is 400
      3. Assert response contains error about missing name
    Expected Result: 400 validation error
    Failure Indicators: 201 status (robot created without name)
    Evidence: .sisyphus/evidence/task-1-create-without-name.json
  ```

  **Commit**: YES
  - Message: `fix(platform): make soulMd optional in robot creation API`
  - Files: `platform/src/app/api/v1/robots/route.ts`
  - Pre-commit: `npm run lint`

- [ ] 2. Fix "mooonshot" provider typo in settings page

  **What to do**:
  - In `platform/src/app/(dashboard)/settings/page.tsx`, find the `PROVIDERS` array
  - Change `{ label: 'Moonshot', value: 'mooonshot' }` to `{ label: 'Moonshot', value: 'moonshot' }`
  - This is a single character fix (remove one extra 'o')

  **Must NOT do**:
  - Do not change the backend `allowedProviders` array — it already has the correct spelling
  - Do not add new providers

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single character typo fix in one file
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `platform/src/app/(dashboard)/settings/page.tsx` — PROVIDERS constant array with the typo
  - `platform/src/app/api/v1/tenants/[id]/llm-config/route.ts` — `allowedProviders` array with correct 'moonshot' spelling

  **WHY Each Reference Matters**:
  - `settings/page.tsx` — Contains the typo to fix. Search for `mooonshot` (triple 'o').
  - `llm-config/route.ts` — Shows the correct spelling to match against.

  **Acceptance Criteria**:
  - [ ] `grep -r 'mooonshot' platform/src/` returns no results
  - [ ] `grep -r 'moonshot' platform/src/app/(dashboard)/settings/page.tsx` returns the corrected entry

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Verify typo is fixed (happy path)
    Tool: Bash (grep)
    Preconditions: None
    Steps:
      1. grep -rn 'mooonshot' platform/src/
      2. Assert: no output (exit code 1 — no matches)
      3. grep -rn "value: 'moonshot'" platform/src/app/\(dashboard\)/settings/page.tsx
      4. Assert: exactly one match with correct spelling
    Expected Result: Zero instances of 'mooonshot', one instance of 'moonshot' in PROVIDERS
    Failure Indicators: 'mooonshot' still found, or 'moonshot' not found
    Evidence: .sisyphus/evidence/task-2-typo-fix.txt
  ```

  **Commit**: YES
  - Message: `fix(platform): fix moonshot provider typo in settings`
  - Files: `platform/src/app/(dashboard)/settings/page.tsx`
  - Pre-commit: `npm run lint`

- [ ] 3. Add robot-specific pub/sub channel functions to pubsub.ts

  **What to do**:
  - In `platform/src/lib/pubsub.ts`, add new functions for robot-specific channels:
    - `robotChannel(robotId: string): string` — returns `robot:${robotId}:messages`
    - `publishToRobot(robotId: string, payload: object): Promise<void>` — publishes message to robot channel
    - `subscribeToRobot(robotId: string, callback: (message: any) => void): () => void` — subscribes to robot channel, returns unsubscribe function
  - Follow the exact same pattern as existing `chatGroupChannel()`, `publishMessage()`, and `subscribeToChatGroup()`
  - The robot channel carries messages FROM chatgroups TO the robot (used by @mention routing)

  **Must NOT do**:
  - Do not modify existing chatgroup channel functions
  - Do not create a separate PubSubHub — use the existing singleton
  - Do not add complex message types — use same payload shape as chatgroup messages

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding 3 small functions following an established pattern in the same file
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Tasks 6, 8, 10 (all new endpoints need these channel functions)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `platform/src/lib/pubsub.ts:1-80` — Full file. Copy the pattern from `chatGroupChannel()` (line ~5), `publishMessage()` (line ~55), and `subscribeToChatGroup()` (line ~65). The PubSubHub class at lines ~10-50 manages Redis subscriptions.

  **API/Type References**:
  - `platform/src/lib/redis.ts` — Redis client singleton used by pubsub

  **WHY Each Reference Matters**:
  - `pubsub.ts` — THE file being modified. Every new function must mirror the existing pattern exactly: same error handling, same Redis pub/sub client usage, same callback signature.

  **Acceptance Criteria**:
  - [ ] `robotChannel('abc-123')` returns `'robot:abc-123:messages'`
  - [ ] `publishToRobot` publishes JSON to the correct Redis channel
  - [ ] `subscribeToRobot` subscribes and calls callback with parsed messages
  - [ ] Existing chatgroup functions unchanged (no regressions)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Verify robot channel functions exist and compile
    Tool: Bash
    Preconditions: platform/ directory
    Steps:
      1. cd platform && npx tsc --noEmit src/lib/pubsub.ts
      2. Assert: no TypeScript errors
      3. grep -n 'robotChannel\|publishToRobot\|subscribeToRobot' src/lib/pubsub.ts
      4. Assert: all 3 functions are found
      5. grep -n 'chatGroupChannel\|publishMessage\|subscribeToChatGroup' src/lib/pubsub.ts
      6. Assert: all 3 original functions still present
    Expected Result: TypeScript compiles, all 6 functions present
    Failure Indicators: Compile errors, missing functions, broken imports
    Evidence: .sisyphus/evidence/task-3-pubsub-functions.txt
  ```

  **Commit**: YES
  - Message: `feat(platform): add robot-specific pub/sub channel functions`
  - Files: `platform/src/lib/pubsub.ts`
  - Pre-commit: `npm run lint`

- [ ] 4. Add robot name validation for @mention compatibility

  **What to do**:
  - In `platform/src/app/api/v1/robots/route.ts` POST handler, add validation:
    - Robot name must be 1-2 words (matches `/@(\w+(?:\s\w+)?)/g` regex used for @mention parsing)
    - Validate with regex: `/^\w+(?:\s\w+)?$/` (1-2 words, alphanumeric + underscores)
    - If invalid, return 400: `"Robot name must be 1-2 words (alphanumeric) for @mention compatibility"`
  - Apply same validation in `platform/src/app/api/v1/robots/[id]/route.ts` PUT handler (when name is being updated)

  **Must NOT do**:
  - Do not modify the @mention regex in chatgroup messages — it's correct
  - Do not add name uniqueness check (not required for v1)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding one regex validation in two locations, following existing pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Task 13 (frontend needs valid API to test against)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `platform/src/app/api/v1/robots/route.ts:27-52` — POST handler where validation should be added after name check
  - `platform/src/app/api/v1/robots/[id]/route.ts:30-80` — PUT handler where validation should be added when name is provided
  - `platform/src/app/api/v1/chatgroups/[id]/messages/route.ts:45-60` — The @mention regex `/@(\w+(?:\s\w+)?)/g` that robot names must be compatible with

  **WHY Each Reference Matters**:
  - `robots/route.ts` — Primary location for the new validation in POST
  - `robots/[id]/route.ts` — Secondary location for validation in PUT (only when name is being changed)
  - `chatgroups messages route` — Shows the EXACT regex that robot names must match. The name validation regex should be the inverse test.

  **Acceptance Criteria**:
  - [ ] `curl POST /api/v1/robots` with name `"TestBot"` → 201 (single word OK)
  - [ ] `curl POST /api/v1/robots` with name `"Test Bot"` → 201 (two words OK)
  - [ ] `curl POST /api/v1/robots` with name `"My Super Bot"` → 400 (three words rejected)
  - [ ] `curl POST /api/v1/robots` with name `"Bot@123"` → 400 (special chars rejected)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Valid robot names accepted (happy path)
    Tool: Bash (curl)
    Preconditions: Dev server running, valid tenant auth token in $TOKEN
    Steps:
      1. curl -s -w '\n%{http_code}' -X POST http://localhost:3000/api/v1/robots \
         -H 'Authorization: Bearer '$TOKEN -H 'Content-Type: application/json' \
         -d '{"name": "Atlas"}'
      2. Assert HTTP status is 201
      3. curl -s -w '\n%{http_code}' -X POST http://localhost:3000/api/v1/robots \
         -H 'Authorization: Bearer '$TOKEN -H 'Content-Type: application/json' \
         -d '{"name": "Test Bot"}'
      4. Assert HTTP status is 201
    Expected Result: Both single-word and two-word names accepted
    Failure Indicators: 400 status for valid names
    Evidence: .sisyphus/evidence/task-4-valid-names.json

  Scenario: Invalid robot names rejected (error case)
    Tool: Bash (curl)
    Preconditions: Same as above
    Steps:
      1. curl -s -w '\n%{http_code}' -X POST http://localhost:3000/api/v1/robots \
         -H 'Authorization: Bearer '$TOKEN -H 'Content-Type: application/json' \
         -d '{"name": "My Super Bot"}'
      2. Assert HTTP status is 400
      3. Assert response contains mention of @mention compatibility
    Expected Result: 400 with descriptive error message
    Failure Indicators: 201 status (three-word name accepted)
    Evidence: .sisyphus/evidence/task-4-invalid-names.json
  ```

  **Commit**: YES
  - Message: `feat(platform): add robot name validation for @mention compatibility`
  - Files: `platform/src/app/api/v1/robots/route.ts`, `platform/src/app/api/v1/robots/[id]/route.ts`
  - Pre-commit: `npm run lint`

 [x] 5. Create SQLite3 config storage module for nanobot

  **What to do**:
  - Create new file `robot/nanobot/config/database.py` with:
    - `ConfigDatabase` class that manages SQLite3 connection to `~/.nanobot/nanobot.db`
    - `init_db()` method that creates tables if not exist:
      - `config` table: `key TEXT PRIMARY KEY, value TEXT` (stores JSON-serialized config values)
      - `robot_info` table: `robot_id TEXT PRIMARY KEY, robot_name TEXT, tenant_id TEXT, team_ids TEXT, chat_group_ids TEXT, creator_id TEXT, creator_email TEXT, platform_url TEXT, robot_token TEXT`
      - `llm_config` table: `id INTEGER PRIMARY KEY, provider TEXT, api_key TEXT, base_url TEXT, model TEXT`
    - `save_robot_info(data: dict)` — stores decoded JWT claims + config
    - `get_robot_info() -> dict | None` — retrieves stored robot info
    - `save_llm_config(data: dict)` — stores LLM provider config
    - `get_llm_config() -> dict | None` — retrieves LLM config
    - `migrate_from_json(json_path: str)` — reads existing `~/.nanobot/config.json` and imports data into SQLite (one-time migration)
  - Add `aiosqlite` to `robot/pyproject.toml` dependencies (for async SQLite support)
  - Also use standard `sqlite3` module for sync operations in the CLI onboard command
  - Database file location: `~/.nanobot/nanobot.db` (same directory as existing JSON config)

  **Must NOT do**:
  - Do not delete or modify existing `config.json` files — migration reads them, keeps originals
  - Do not use an ORM (SQLAlchemy, etc.) — use raw sqlite3 for simplicity
  - Do not create migration system — just `CREATE TABLE IF NOT EXISTS`
  - Do not add encryption to SQLite — store values in plaintext (same as current JSON)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New module creation with database schema design, migration logic, and async support
  - **Skills**: [`database-schema-designer`]
    - `database-schema-designer`: Helps design proper SQLite table structure with appropriate types and constraints
  - **Skills Evaluated but Omitted**:
    - `database-migration`: Overkill — we're doing simple CREATE IF NOT EXISTS, not versioned migrations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Task 9 (onboard CLI needs this module to store config)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `robot/nanobot/config/loader.py` — Current JSON config loading/saving pattern. The migration function should read this format.
  - `robot/nanobot/config/schema.py` — Pydantic models for `PlatformConfig`, `ProvidersConfig`. The SQLite schema should store the same fields.

  **API/Type References**:
  - `robot/nanobot/config/schema.py:PlatformConfig` — Fields: `platform_url`, `robot_token`
  - `robot/nanobot/config/schema.py:ProvidersConfig` — Fields: provider settings

  **External References**:
  - Python `sqlite3` stdlib: https://docs.python.org/3/library/sqlite3.html
  - `aiosqlite` package: https://pypi.org/project/aiosqlite/

  **WHY Each Reference Matters**:
  - `loader.py` — Shows current config file path (`~/.nanobot/config.json`) and JSON structure that migration must read
  - `schema.py` — Defines the Pydantic models whose fields map to SQLite columns

  **Acceptance Criteria**:
  - [ ] `from nanobot.config.database import ConfigDatabase` imports without error
  - [ ] `ConfigDatabase().init_db()` creates `~/.nanobot/nanobot.db` with 3 tables
  - [ ] `save_robot_info()` + `get_robot_info()` round-trips data correctly
  - [ ] `save_llm_config()` + `get_llm_config()` round-trips data correctly
  - [ ] `aiosqlite` appears in `pyproject.toml` dependencies

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: SQLite database creation and data round-trip (happy path)
    Tool: Bash (python)
    Preconditions: robot/ package installed (`pip install -e .`)
    Steps:
      1. python3 -c "
         from nanobot.config.database import ConfigDatabase
         db = ConfigDatabase()
         db.init_db()
         db.save_robot_info({
           'robot_id': 'test-123',
           'robot_name': 'TestBot',
           'tenant_id': 'tenant-456',
           'platform_url': 'http://localhost:3000'
         })
         info = db.get_robot_info()
         assert info['robot_id'] == 'test-123', f'Expected test-123, got {info["robot_id"]}'
         assert info['robot_name'] == 'TestBot'
         print('PASS: round-trip works')"
      2. Assert output contains "PASS: round-trip works"
      3. ls -la ~/.nanobot/nanobot.db
      4. Assert file exists
    Expected Result: Database created, data round-trips correctly
    Failure Indicators: ImportError, assertion failure, missing database file
    Evidence: .sisyphus/evidence/task-5-sqlite-roundtrip.txt

  Scenario: Migration from existing JSON config (edge case)
    Tool: Bash (python)
    Preconditions: Existing ~/.nanobot/config.json with valid config data
    Steps:
      1. python3 -c "
         from nanobot.config.database import ConfigDatabase
         db = ConfigDatabase()
         db.init_db()
         db.migrate_from_json('~/.nanobot/config.json')
         info = db.get_robot_info()
         print(f'Migrated: {info}')"
      2. Assert output contains "Migrated:" with valid data
      3. ls -la ~/.nanobot/config.json
      4. Assert original JSON file still exists (not deleted)
    Expected Result: JSON data migrated to SQLite, original JSON preserved
    Failure Indicators: FileNotFoundError, empty migration, JSON file deleted
    Evidence: .sisyphus/evidence/task-5-json-migration.txt
  ```

  **Commit**: YES
  - Message: `feat(robot): add SQLite3 config storage module`
  - Files: `robot/nanobot/config/database.py`, `robot/pyproject.toml`
  - Pre-commit: —

### Wave 2 — New Platform Endpoints

 [x] 6. Create per-robot SSE stream endpoint

  **What to do**:
  - Create new file `platform/src/app/api/v1/robots/[id]/stream/route.ts`
  - Implement `GET` handler that:
    - Authenticates via `requireRobotAuth` (X-Robot-Token header)
    - Verifies `auth.robotId === params.id` (prevent robot from accessing another robot's stream)
    - Finds all chatgroups the robot is a member of via `prisma.chatGroupMember.findMany`
    - Subscribes to the robot-specific Redis channel: `subscribeToRobot(robotId, callback)`
    - Also subscribes to chatgroup channels for messages NOT involving @mentions (for general awareness)
    - Sends initial `event: connected` with `{robotId, chatGroups: [...]}` data
    - Sends periodic `event: heartbeat` every 30 seconds to keep connection alive
    - On message from robot channel: forward as `event: message` with full message payload including `chatGroupId`
    - On client disconnect: unsubscribe from all channels, clean up
  - Follow the exact pattern from `platform/src/app/api/v1/robots/stream/route.ts` (existing shared stream)
  - Key difference from shared stream: this listens to `robot:${robotId}:messages` channel (per-robot) in ADDITION to chatgroup channels

  **Must NOT do**:
  - Do not remove or modify the existing `/api/v1/robots/stream` endpoint — it must continue working
  - Do not add WebSocket support — SSE only
  - Do not add message replay/history — fire-and-forget SSE
  - Do not add connection tracking or "last connection wins" logic — accept multiple connections

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex SSE stream handling with Redis subscriptions, auth, and cleanup logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 9)
  - **Blocks**: Tasks 12, 15
  - **Blocked By**: Task 3 (needs robot pub/sub channel functions)

  **References**:

  **Pattern References**:
  - `platform/src/app/api/v1/robots/stream/route.ts` — CRITICAL: The existing shared robot stream. Copy this pattern exactly for the per-robot stream. Shows SSE setup, Redis subscription, cleanup, heartbeat.
  - `platform/src/app/api/v1/chatgroups/[id]/stream/route.ts` — Alternative SSE pattern with per-entity URL. Shows how to extract `params.id` in Next.js 15+ async params.

  **API/Type References**:
  - `platform/src/lib/pubsub.ts` — `subscribeToRobot()` function (created in Task 3) + `subscribeToChatGroup()`
  - `platform/src/lib/auth.ts` — `requireRobotAuth` middleware, `RobotAuthPayload` type

  **WHY Each Reference Matters**:
  - `robots/stream/route.ts` — THE template to copy. Same SSE pattern, same Redis subscription lifecycle, same cleanup. The new endpoint adds robot-specific channel subscription on top.
  - `chatgroups/[id]/stream/route.ts` — Shows the Next.js 15+ `async params` pattern needed for `[id]` routes.
  - `pubsub.ts` — Provides `subscribeToRobot()` for per-robot channel subscription.
  - `auth.ts` — `requireRobotAuth` validates the X-Robot-Token header.

  **Acceptance Criteria**:
  - [ ] `curl -N -H 'X-Robot-Token: $TOKEN' http://localhost:3000/api/v1/robots/$ID/stream` opens SSE connection
  - [ ] First event is `event: connected` with robotId and chatGroup list
  - [ ] Heartbeat events arrive every ~30 seconds
  - [ ] Messages published to `robot:$ID:messages` Redis channel appear as SSE events
  - [ ] SSE events include `chatGroupId` field in message data
  - [ ] Wrong robot ID returns 403
  - [ ] Existing `/api/v1/robots/stream` still works

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Robot connects to per-robot SSE stream (happy path)
    Tool: Bash (curl with timeout)
    Preconditions: Dev server running, robot created and onboarded with valid token in $TOKEN, robot ID in $ROBOT_ID
    Steps:
      1. timeout 10 curl -s -N -H "X-Robot-Token: $TOKEN" \
         http://localhost:3000/api/v1/robots/$ROBOT_ID/stream > /tmp/sse-output.txt 2>&1 &
      2. sleep 2
      3. cat /tmp/sse-output.txt
      4. Assert output contains "event: connected"
      5. Assert output contains "robotId"
      6. kill %1 2>/dev/null
    Expected Result: SSE stream opens with connected event containing robotId
    Failure Indicators: Connection refused, 401/403 error, no connected event
    Evidence: .sisyphus/evidence/task-6-sse-connect.txt

  Scenario: Wrong robot ID rejected (error case)
    Tool: Bash (curl)
    Preconditions: Same as above
    Steps:
      1. curl -s -w '\n%{http_code}' -H "X-Robot-Token: $TOKEN" \
         http://localhost:3000/api/v1/robots/wrong-robot-id/stream
      2. Assert HTTP status is 403
    Expected Result: 403 Forbidden
    Failure Indicators: 200 status (stream opens for wrong robot)
    Evidence: .sisyphus/evidence/task-6-wrong-id.txt
  ```

  **Commit**: YES
  - Message: `feat(platform): add per-robot SSE stream endpoint`
  - Files: `platform/src/app/api/v1/robots/[id]/stream/route.ts`
  - Pre-commit: `npm run lint`

 [x] 7. Create robot config endpoint

  **What to do**:
  - Create new file `platform/src/app/api/v1/robots/[id]/config/route.ts`
  - Implement `GET` handler that:
    - Authenticates via `requireRobotAuth` (X-Robot-Token header)
    - Verifies `auth.robotId === params.id`
    - Fetches robot data: `prisma.robot.findUnique({ where: { id: params.id } })`
    - Updates robot status to `"onboard"` if currently `"onboarding"`
    - Fetches tenant info: `prisma.tenant.findUnique({ where: { id: robot.tenantId } })`
    - Fetches teams via `prisma.teamMember.findMany` → `prisma.team.findMany`
    - Fetches chatgroups via `prisma.chatGroupMember.findMany` → `prisma.chatGroup.findMany`
    - Fetches and decrypts LLM config: `prisma.tenantLlmConfig.findUnique` → `decrypt(apiKeyEnc)`
    - Returns response matching existing onboard format:
      ```json
      {
        "robot": { "id", "name", "soulMd" },
        "tenant": { "id", "name" },
        "teams": [...],
        "chatgroups": [...],
        "config": { "llm": { "provider", "apiKey", "baseUrl", "model" } }
      }
      ```
  - This is essentially the same logic as `/api/v1/onboard/route.ts` but at a different URL

  **Must NOT do**:
  - Do not remove the existing `/api/v1/onboard` endpoint — keep it working for backward compatibility
  - Do not return the robot token in the response (it's sensitive)
  - Do not add new fields beyond what `/api/v1/onboard` already returns

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New endpoint with multiple DB queries, auth, decryption — follows existing pattern closely
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 8, 9)
  - **Blocks**: Task 9 (nanobot onboard CLI needs this endpoint)
  - **Blocked By**: None (uses existing pubsub, auth, crypto)

  **References**:

  **Pattern References**:
  - `platform/src/app/api/v1/onboard/route.ts` — CRITICAL: Copy this logic almost verbatim. Same DB queries, same response shape, same decryption. The only difference is the URL path and that this uses `params.id` instead of getting robotId from the token alone.

  **API/Type References**:
  - `platform/src/lib/auth.ts` — `requireRobotAuth`, `RobotAuthPayload`
  - `platform/src/lib/crypto.ts` — `decrypt()` for LLM config API key
  - `platform/prisma/schema.prisma` — Robot, Tenant, TeamMember, ChatGroupMember, TenantLlmConfig models

  **WHY Each Reference Matters**:
  - `onboard/route.ts` — THE template. Same business logic, just at `/robots/[id]/config` instead of `/onboard`. Copy the query pattern exactly.
  - `crypto.ts` — Shows how to decrypt `apiKeyEnc` to return plaintext `apiKey` to the robot.

  **Acceptance Criteria**:
  - [ ] `curl -H 'X-Robot-Token: $TOKEN' http://localhost:3000/api/v1/robots/$ID/config` → 200 with robot, tenant, teams, chatgroups, config
  - [ ] Response includes decrypted LLM API key (not encrypted)
  - [ ] Wrong robot ID → 403
  - [ ] No token → 401
  - [ ] Existing `/api/v1/onboard` still works

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Robot fetches config via new endpoint (happy path)
    Tool: Bash (curl)
    Preconditions: Robot created, assigned to team + chatgroup, token generated. Tenant has LLM config saved.
    Steps:
      1. curl -s -w '\n%{http_code}' -H "X-Robot-Token: $TOKEN" \
         http://localhost:3000/api/v1/robots/$ROBOT_ID/config
      2. Parse response JSON
      3. Assert HTTP status is 200
      4. Assert response.robot.id === $ROBOT_ID
      5. Assert response.robot.name is non-empty string
      6. Assert response.teams is array with length >= 1
      7. Assert response.chatgroups is array with length >= 1
      8. Assert response.config.llm.provider is non-empty string
      9. Assert response.config.llm.apiKey is non-empty string (decrypted, not encrypted format)
    Expected Result: 200 with full robot config including decrypted LLM key
    Failure Indicators: 401/403/404, missing fields, encrypted apiKey (starts with 'v1:')
    Evidence: .sisyphus/evidence/task-7-config-endpoint.json

  Scenario: Unauthorized access rejected (error case)
    Tool: Bash (curl)
    Preconditions: Same as above
    Steps:
      1. curl -s -w '\n%{http_code}' http://localhost:3000/api/v1/robots/$ROBOT_ID/config
      2. Assert HTTP status is 401 (no token)
      3. curl -s -w '\n%{http_code}' -H "X-Robot-Token: $TOKEN" \
         http://localhost:3000/api/v1/robots/wrong-id/config
      4. Assert HTTP status is 403 (wrong robot ID)
    Expected Result: 401 without token, 403 with wrong ID
    Failure Indicators: 200 status (config exposed without auth)
    Evidence: .sisyphus/evidence/task-7-config-unauthorized.json
  ```

  **Commit**: YES
  - Message: `feat(platform): add robot config endpoint`
  - Files: `platform/src/app/api/v1/robots/[id]/config/route.ts`
  - Pre-commit: `npm run lint`

 [x] 8. Create robot message POST endpoint

  **What to do**:
  - Create `platform/src/app/api/v1/robots/[id]/messages/route.ts` with a POST handler
  - Authenticate via `requireRobotAuth(request)` — verify `auth.robotId === params.id`
  - Parse body: `{ chatGroupId: string, content: string }`
  - Validate `content` is non-empty string, max 10KB (`content.length <= 10240`)
  - Verify robot is a member of `chatGroupId` by querying `ChatGroupMember` where `memberId === auth.robotId` and `chatGroupId === body.chatGroupId`
  - Verify chatgroup belongs to robot's tenant
  - Sanitize content via `sanitizeString(content)`
  - Create message via `prisma.message.create()` with `senderType: "robot"`, `senderId: auth.robotId`
  - After creation, publish to chatgroup Redis channel via `publishMessage(chatGroupId, { type: "new_message", message: { ...message, sender: { name: robotName, type: "robot" } } })`
  - Look up robot name from `prisma.robot.findUnique({ where: { id: auth.robotId }, select: { name: true } })`
  - Return `{ message }` with status 201
  - Apply rate limiting: `applyRateLimit(request, "robot", auth.robotId)`

  **Must NOT do**:
  - Do NOT parse @mentions in robot messages — only humans trigger @mention routing
  - Do NOT allow robot to post to chatgroups it's not a member of
  - Do NOT change the existing `chatgroups/[id]/messages/route.ts` — this is a separate endpoint
  - Do NOT add file upload support — MCP handles files

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires careful auth verification, membership checks, and pub/sub integration — multiple interacting concerns
  - **Skills**: []
    - No special skills needed — pure backend API route
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — backend-only task
    - `api-design-principles`: Could help but task is well-specified enough

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 9)
  - **Blocks**: [Task 11 (PlatformChannel.send needs this endpoint to POST to)]
  - **Blocked By**: [Task 3 (needs `publishMessage` from pubsub.ts, but actually uses existing `publishMessage` for chatgroup channel — no dependency on Task 3's robot channel functions)] → Effectively: None (can start with Wave 2)

  **References**:

  **Pattern References** (existing code to follow):
  - `platform/src/app/api/v1/chatgroups/[id]/messages/route.ts:88-191` — The POST handler for human messages. Copy the auth pattern, message creation, and publishMessage call. Key differences: use `requireRobotAuth` instead of `requireTenantAuth`, use `senderType: "robot"`, and skip @mention parsing.
  - `platform/src/app/api/v1/robots/[id]/stream/route.ts` (created in Task 6) — Shows the per-robot route pattern with `requireRobotAuth` and `auth.robotId === params.id` verification.

  **API/Type References** (contracts to implement against):
  - `platform/src/lib/auth.ts` — `requireRobotAuth` function and `RobotAuthPayload` type (contains `robotId`, `robotName`, `tenantId`)
  - `platform/src/lib/pubsub.ts:74-81` — `publishMessage(chatGroupId, payload)` function — publishes to chatgroup Redis channel
  - `platform/src/lib/sanitize.ts` — `sanitizeString(content)` — strips HTML tags
  - `platform/src/lib/rate-limit.ts` — `applyRateLimit(request, type, id)` — rate limits requests

  **External References**:
  - None needed — follows established codebase patterns

  **WHY Each Reference Matters**:
  - `chatgroups/[id]/messages/route.ts` — This is the CLOSEST existing pattern. The robot POST endpoint does the same thing (create message + publish), just with robot auth instead of user auth and without @mention parsing.
  - `auth.ts` — Must use `requireRobotAuth` (not `requireTenantAuth`) since robots authenticate via `X-Robot-Token` header, not `Authorization: Bearer`.
  - `pubsub.ts` — Robot responses must appear in the chatgroup stream. Use the EXISTING `publishMessage` (chatgroup channel), NOT the new robot channel.

  **Acceptance Criteria**:
  - [ ] File created: `platform/src/app/api/v1/robots/[id]/messages/route.ts`
  - [ ] `curl -X POST -H 'X-Robot-Token: $TOKEN' -H 'Content-Type: application/json' -d '{"chatGroupId": "$CG_ID", "content": "Hello from robot"}' http://localhost:3000/api/v1/robots/$ID/messages` → 201
  - [ ] Response contains `message.senderType === "robot"`
  - [ ] Message appears in chatgroup SSE stream
  - [ ] Missing chatGroupId → 400
  - [ ] Robot not member of chatgroup → 403
  - [ ] Content > 10KB → 400
  - [ ] No token → 401
  - [ ] Wrong robot ID → 403

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Robot posts message to chatgroup (happy path)
    Tool: Bash (curl)
    Preconditions: Robot created, assigned to team + chatgroup, token generated. Dev server running.
    Steps:
      1. curl -s -w '\n%{http_code}' -X POST \
         -H "X-Robot-Token: $TOKEN" \
         -H "Content-Type: application/json" \
         -d '{"chatGroupId": "$CG_ID", "content": "Analysis complete. Found 3 issues."}' \
         http://localhost:3000/api/v1/robots/$ROBOT_ID/messages
      2. Parse response JSON
      3. Assert HTTP status is 201
      4. Assert response.message.senderType === "robot"
      5. Assert response.message.senderId === $ROBOT_ID
      6. Assert response.message.chatGroupId === $CG_ID
      7. Assert response.message.content === "Analysis complete. Found 3 issues."
    Expected Result: 201 with message object containing senderType "robot"
    Failure Indicators: 401/403/404, missing message fields, senderType not "robot"
    Evidence: .sisyphus/evidence/task-8-robot-post-message.json

  Scenario: Robot posts to chatgroup it's not a member of (error case)
    Tool: Bash (curl)
    Preconditions: Robot created, token generated. A different chatgroup exists that robot is NOT a member of.
    Steps:
      1. curl -s -w '\n%{http_code}' -X POST \
         -H "X-Robot-Token: $TOKEN" \
         -H "Content-Type: application/json" \
         -d '{"chatGroupId": "$OTHER_CG_ID", "content": "Should fail"}' \
         http://localhost:3000/api/v1/robots/$ROBOT_ID/messages
      2. Assert HTTP status is 403
      3. Assert response contains error about membership
    Expected Result: 403 Forbidden with membership error
    Failure Indicators: 201 (message created in non-member chatgroup)
    Evidence: .sisyphus/evidence/task-8-robot-post-not-member.json

  Scenario: Content exceeds 10KB limit (error case)
    Tool: Bash (curl)
    Preconditions: Robot created, assigned to chatgroup, token generated.
    Steps:
      1. Generate a string > 10240 characters: LONG_CONTENT=$(python3 -c "print('x' * 10241)")
      2. curl -s -w '\n%{http_code}' -X POST \
         -H "X-Robot-Token: $TOKEN" \
         -H "Content-Type: application/json" \
         -d "{\"chatGroupId\": \"$CG_ID\", \"content\": \"$LONG_CONTENT\"}" \
         http://localhost:3000/api/v1/robots/$ROBOT_ID/messages
      3. Assert HTTP status is 400
    Expected Result: 400 Bad Request with size limit error
    Failure Indicators: 201 (oversized message accepted)
    Evidence: .sisyphus/evidence/task-8-robot-post-oversized.json
  ```

  **Commit**: YES
  - Message: `feat(platform): add robot message POST endpoint`
  - Files: `platform/src/app/api/v1/robots/[id]/messages/route.ts`
  - Pre-commit: `npm run lint`

 [x] 9. Update nanobot onboard CLI to use SQLite3 + new config endpoint

  **What to do**:
  - Modify `robot/nanobot/cli/commands.py` — update the `onboard` command's platform flow (lines 170-260)
  - Instead of calling `GET /api/v1/onboard`, call `GET /api/v1/robots/{robot_id}/config`
  - Extract `robot_id` from the JWT token: decode the token (base64 decode the payload segment, no signature verification needed) to read the `robotId` claim
  - Use the extracted `robot_id` to construct the URL: `{platform_url}/api/v1/robots/{robot_id}/config`
  - Replace JSON config storage with SQLite3 storage via `ConfigDatabase` (from Task 5)
  - After fetching config, call `db.store_config(robot_id=..., robot_name=..., tenant_id=..., team_id=..., chat_group_id=..., platform_url=..., robot_token=token)` and `db.store_llm_config(provider=..., api_key=..., model=..., base_url=...)`
  - Keep the existing JSON config save as a FALLBACK — write both SQLite and JSON so that the existing `load_config()` system still works during this transition
  - Update `PlatformConfig` in `robot/nanobot/config/schema.py` to add optional fields: `robot_id: str = ""`, `robot_name: str = ""`  (these are populated during onboard from the token claims)
  - Print success output showing robot name, tenant name, and the storage path
  - Import `ConfigDatabase` from `nanobot.config.database`

  **Must NOT do**:
  - Do NOT delete or rename the existing JSON config file — keep it as fallback
  - Do NOT require signature verification for JWT decode — just base64 decode the payload
  - Do NOT modify the non-platform onboard flow (the flow when no `--platform-url` is provided)
  - Do NOT change the CLI argument names (`--platform-url`, `--token`)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Mid-complexity Python task — modifying existing CLI flow with new storage integration
  - **Skills**: []
    - No special skills needed — Python CLI modification
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed — CLI/Python task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7, 8)
  - **Blocks**: [Task 12 (PlatformChannel needs robot_id from config)]
  - **Blocked By**: [Task 5 (needs `ConfigDatabase` class from `database.py`)]

  **References**:

  **Pattern References** (existing code to follow):
  - `robot/nanobot/cli/commands.py:157-260` — Current `onboard` command. Lines 170-260 handle the platform flow: fetch from `/api/v1/onboard`, parse response, set `PlatformConfig`, save JSON config. This is the code to modify.
  - `robot/nanobot/config/loader.py` — `load_config()`, `save_config()`, `get_config_path()` — keep calling `save_config()` as fallback alongside new SQLite storage.

  **API/Type References** (contracts to implement against):
  - `robot/nanobot/config/schema.py:237-242` — `PlatformConfig` model — add `robot_id: str = ""` and `robot_name: str = ""`
  - `robot/nanobot/config/database.py` (created in Task 5) — `ConfigDatabase` class with `store_config()`, `store_llm_config()`, `get_config()`
  - `platform/src/app/api/v1/robots/[id]/config/route.ts` (created in Task 7) — Response shape: `{ robot: { id, name, soulMd, status }, tenant: { id, name }, teams: [...], chatgroups: [...], config: { llm: { provider, apiKey, model, baseUrl } } }`

  **External References**:
  - Python `base64` module — `base64.urlsafe_b64decode()` for JWT payload decoding
  - Python `json` module — `json.loads()` for parsing decoded JWT payload

  **WHY Each Reference Matters**:
  - `commands.py:157-260` — This is THE code to modify. Understand the current flow before changing it. Key: the `onboard_url` construction on line 174 needs to change from `/api/v1/onboard` to `/api/v1/robots/{robot_id}/config`.
  - `schema.py:237-242` — Need to add `robot_id` and `robot_name` fields so PlatformChannel can access them later.
  - `database.py` (Task 5) — The new storage target. Must import and call correctly.

  **Acceptance Criteria**:
  - [ ] `nanobot onboard --platform-url http://localhost:3000 --token $TOKEN` succeeds
  - [ ] SQLite DB created at `~/.nanobot/nanobot.db` with robot config data
  - [ ] `sqlite3 ~/.nanobot/nanobot.db "SELECT * FROM config;"` shows robot_id, robot_name, tenant_id, platform_url
  - [ ] `sqlite3 ~/.nanobot/nanobot.db "SELECT * FROM llm_config;"` shows provider, api_key, model
  - [ ] JSON config at `~/.nanobot/config.json` is also updated (fallback)
  - [ ] `PlatformConfig` in schema.py has `robot_id` and `robot_name` fields
  - [ ] Invalid/expired token → error message
  - [ ] Unreachable platform URL → network error message

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Successful platform onboard with SQLite storage (happy path)
    Tool: Bash
    Preconditions: Platform running at localhost:3000 with seeded data. Robot created with token generated.
    Steps:
      1. rm -f ~/.nanobot/nanobot.db (clean slate)
      2. nanobot onboard --platform-url http://localhost:3000 --token $TOKEN
      3. Assert exit code 0
      4. Assert output contains "Connected to platform"
      5. Assert output contains robot name (e.g., "Robot: TestBot")
      6. sqlite3 ~/.nanobot/nanobot.db "SELECT robot_id, robot_name, platform_url FROM config;"
      7. Assert output contains the robot's ID
      8. Assert output contains the platform URL
      9. sqlite3 ~/.nanobot/nanobot.db "SELECT provider FROM llm_config;"
      10. Assert output contains "minimax" (or the configured provider)
      11. python3 -c "import json; c = json.load(open('$HOME/.nanobot/config.json')); print(c.get('platform', {}).get('robot_token', ''))"
      12. Assert JSON config also has the robot token (fallback)
    Expected Result: SQLite DB created with config, JSON config also updated
    Failure Indicators: Exit code non-zero, missing DB file, empty query results
    Evidence: .sisyphus/evidence/task-9-onboard-success.txt

  Scenario: Onboard with invalid token (error case)
    Tool: Bash
    Preconditions: Platform running at localhost:3000.
    Steps:
      1. nanobot onboard --platform-url http://localhost:3000 --token "invalid.token.here"
      2. Assert exit code is non-zero
      3. Assert output contains error message (e.g., "Failed to connect" or decode error)
    Expected Result: Graceful error message, no crash
    Failure Indicators: Exit code 0 (success on invalid token), Python traceback
    Evidence: .sisyphus/evidence/task-9-onboard-invalid-token.txt
  ```

  **Commit**: YES
  - Message: `feat(robot): update onboard CLI for SQLite3 + new config endpoint`
  - Files: `robot/nanobot/cli/commands.py`, `robot/nanobot/config/schema.py`
  - Pre-commit: —

### Wave 3 (After Wave 2 — routing + channel integration)

 [x] 10. Wire @mention routing to robot pub/sub channels

  **What to do**:
  - In `platform/src/app/api/v1/chatgroups/[id]/messages/route.ts`, after the `publishMessage()` call (line 185), add robot-specific routing
  - Import `publishToRobot` from `@/lib/pubsub` (added in Task 3)
  - After the chatgroup publish, iterate over the `mentions` array (line 156-158)
  - For each mention where `type === "robot"`, call `publishToRobot(mention.id, messagePayload)` where `messagePayload` is:
    ```typescript
    {
      type: "mention",
      message: {
        id: message.id,
        chatGroupId: id,   // the chatgroup ID from URL params
        content: message.content,
        senderId: auth.userId,
        senderType: "human",
        senderName: sender?.name ?? "Unknown",
        createdAt: message.createdAt,
        mentions: message.mentions,
      }
    }
    ```
  - The `chatGroupId` field is CRITICAL — the robot needs it to know which chatgroup to respond to
  - Wrap the robot publish calls in `Promise.all()` for multiple @mentions, with `.catch(() => {})` (same pattern as line 185)
  - Only route to `type === "robot"` mentions — NEVER route to `type === "human"` mentions

  **Must NOT do**:
  - Do NOT modify the existing `publishMessage()` chatgroup broadcast — it must remain as-is
  - Do NOT add any new database queries — all needed data is already available in scope
  - Do NOT block the response on robot publish — fire-and-forget like the existing chatgroup publish
  - Do NOT change the @mention regex or parsing logic (lines 127-162)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Routing logic requires understanding pub/sub flow and message contracts between platform and robot
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `vercel-react-best-practices`: Not relevant — this is a pure API route change, no React

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 11, 12)
  - **Blocks**: Task 15 (E2E integration QA)
  - **Blocked By**: Task 3 (pub/sub functions), Task 8 (robot message POST endpoint)

  **References**:

  **Pattern References** (existing code to follow):
  - `platform/src/app/api/v1/chatgroups/[id]/messages/route.ts:179-185` — Existing `publishMessage()` call pattern. New robot routing goes AFTER line 185, before the `return NextResponse.json()` on line 187
  - `platform/src/app/api/v1/chatgroups/[id]/messages/route.ts:156-158` — The `mentions` array with `{ id, name, type }` objects. Filter for `type === "robot"` only
  - `platform/src/app/api/v1/chatgroups/[id]/messages/route.ts:127-162` — Full @mention parsing flow. DO NOT modify — only consume the `mentions` array it produces

  **API/Type References** (contracts to implement against):
  - `platform/src/lib/pubsub.ts:publishToRobot()` — Function added in Task 3. Signature: `publishToRobot(robotId: string, payload: Record<string, unknown>): Promise<void>`
  - `platform/src/lib/pubsub.ts:70-81` — Existing `publishMessage()` for pattern reference on how to call publish

  **WHY Each Reference Matters**:
  - `messages/route.ts:179-185`: The exact insertion point — new code goes after this line
  - `messages/route.ts:156-158`: The data source — `mentionedRobots` array is already resolved by the existing code
  - `pubsub.ts:publishToRobot`: The function to call — must match the signature added in Task 3

  **Acceptance Criteria**:
  - [ ] `publishToRobot` is imported from `@/lib/pubsub`
  - [ ] Robot routing code inserted after `publishMessage()` and before `return NextResponse.json()`
  - [ ] Only `type === "robot"` mentions trigger `publishToRobot()`
  - [ ] Message payload includes `chatGroupId`, `content`, `senderId`, `senderType`, `senderName`
  - [ ] Robot publish is fire-and-forget (`.catch(() => {})`)
  - [ ] `npm run lint` passes in `platform/`

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Message with @mention of a robot is published to robot channel
    Tool: Bash (curl + redis-cli)
    Preconditions: Platform running at localhost:3000. Seeded DB with a robot named "Atlas" added to a chatgroup. Valid tenant token available.
    Steps:
      1. In terminal A, subscribe to robot channel: redis-cli SUBSCRIBE "robot:<atlas-robot-id>:messages"
      2. In terminal B, POST /api/v1/chatgroups/<chatgroup-id>/messages with body {"content": "Hey @Atlas can you help?"} and Authorization header
      3. Check terminal A for received message within 5s
      4. Parse the JSON payload and verify it contains: type="mention", message.chatGroupId=<chatgroup-id>, message.content contains "@Atlas", message.senderType="human"
    Expected Result: Redis subscriber receives a JSON message on "robot:<atlas-robot-id>:messages" with correct chatGroupId and content
    Failure Indicators: No message received on robot channel, missing chatGroupId field, wrong message type
    Evidence: .sisyphus/evidence/task-10-mention-routing.txt

  Scenario: Message with @mention of a human does NOT publish to robot channel
    Tool: Bash (curl + redis-cli)
    Preconditions: Same as above, plus a human user "Alice" in the chatgroup.
    Steps:
      1. In terminal A, subscribe with: redis-cli PSUBSCRIBE "robot:*:messages"
      2. POST /api/v1/chatgroups/<chatgroup-id>/messages with body {"content": "Hey @Alice check this out"}
      3. Wait 3s and check terminal A
    Expected Result: No message published to any robot:*:messages channel
    Failure Indicators: Any message appears on a robot channel for a human mention
    Evidence: .sisyphus/evidence/task-10-human-mention-no-route.txt

  Scenario: Message with no @mention does NOT publish to robot channel
    Tool: Bash (curl + redis-cli)
    Preconditions: Same as above.
    Steps:
      1. In terminal A, subscribe with: redis-cli PSUBSCRIBE "robot:*:messages"
      2. POST /api/v1/chatgroups/<chatgroup-id>/messages with body {"content": "Just a regular message"}
      3. Wait 3s and check terminal A
    Expected Result: No message published to any robot channel
    Failure Indicators: Any message appears on a robot channel
    Evidence: .sisyphus/evidence/task-10-no-mention-no-route.txt
  ```

  **Commit**: YES
  - Message: `feat(platform): wire @mention routing to robot pub/sub channels`
  - Files: `platform/src/app/api/v1/chatgroups/[id]/messages/route.ts`
  - Pre-commit: `npm run lint`

 [x] 11. Implement PlatformChannel.send() via POST

  **What to do**:
  - In `robot/nanobot/channels/platform.py`, replace the no-op `send()` method (lines 96-98) with a working implementation
  - The method receives an `OutboundMessage` with fields: `channel`, `chat_id`, `content`, `reply_to`, `media`, `metadata`
  - `msg.chat_id` will contain the `chatGroupId` (set by `_handle_platform_message` at line 219 where `chat_id=chat_group_id`)
  - Implement `send()` to POST to `{platform_url}/api/v1/robots/{robot_id}/messages` (the endpoint created in Task 8)
  - Request body: `{"chatGroupId": msg.chat_id, "content": msg.content}`
  - Request headers: `{"Authorization": "Bearer {robot_token}", "Content-Type": "application/json"}`
  - Read `platform_url` from `self.config.platform_url`, `robot_token` from `self.config.robot_token`
  - Read `robot_id` from `self.config.robot_id` (field added in Task 9 to `PlatformConfig`)
  - Use `httpx.AsyncClient` for the POST (httpx is already imported in the file for SSE)
  - Handle HTTP errors gracefully: log the error, do NOT raise/crash
  - Add a 10-second timeout on the POST request

  **Must NOT do**:
  - Do NOT use `requests` library — use `httpx` (already imported)
  - Do NOT block the agent loop on network errors — log and continue
  - Do NOT modify `_handle_platform_message()` — that's Task 12
  - Do NOT add retry logic — simple fire-and-log is sufficient for v1

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Straightforward HTTP POST implementation but needs to match API contract from Task 8
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `api-design-principles`: Not designing an API — implementing a client call

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 12)
  - **Blocks**: Task 15 (E2E integration QA)
  - **Blocked By**: Task 8 (robot message POST endpoint — defines the API contract), Task 9 (onboard CLI — provides `robot_id` in config)

  **References**:

  **Pattern References** (existing code to follow):
  - `robot/nanobot/channels/platform.py:96-98` — Current no-op `send()` method to replace
  - `robot/nanobot/channels/platform.py:106-178` — `_connect_and_read()` method showing how `httpx.AsyncClient` is used with auth headers in the same file

  **API/Type References** (contracts to implement against):
  - `robot/nanobot/bus/events.py:26-35` — `OutboundMessage` dataclass: `channel`, `chat_id`, `content`, `reply_to`, `media`, `metadata`
  - `robot/nanobot/config/schema.py:237-242` — `PlatformConfig` with `platform_url`, `robot_token` fields (Task 9 adds `robot_id`, `robot_name`)
  - Task 8 acceptance criteria — The POST endpoint expects body `{chatGroupId: string, content: string}` and returns `{message: {...}, routed: boolean}`

  **WHY Each Reference Matters**:
  - `platform.py:96-98`: The exact code to replace — currently a no-op docstring
  - `platform.py:106-178`: Shows how `httpx` is already used in this file — follow same patterns for client instantiation and header setup
  - `events.py:26-35`: The `OutboundMessage` type signature — `msg.chat_id` is the chatGroupId, `msg.content` is the text
  - `schema.py:237-242`: Where to read config values from — `self.config.platform_url`, `self.config.robot_token`, `self.config.robot_id`

  **Acceptance Criteria**:
  - [ ] `send()` method POSTs to `/api/v1/robots/{robot_id}/messages`
  - [ ] Request body includes `chatGroupId` (from `msg.chat_id`) and `content` (from `msg.content`)
  - [ ] Authorization header uses `self.config.robot_token`
  - [ ] HTTP errors are caught and logged (no crash)
  - [ ] 10-second timeout on the POST request
  - [ ] No `import requests` — uses `httpx` only

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: PlatformChannel.send() posts message to platform
    Tool: Bash (Python script)
    Preconditions: Platform running at localhost:3000. Robot onboarded with valid token and robot_id stored in SQLite config.
    Steps:
      1. Create a Python test script that imports PlatformChannel and OutboundMessage
      2. Instantiate PlatformChannel with a PlatformConfig pointing to localhost:3000 with valid robot_token and robot_id
      3. Call await channel.send(OutboundMessage(channel="platform", chat_id="<valid-chatgroup-id>", content="Hello from robot"))
      4. Check platform DB or chatgroup messages API for the new message with senderType="robot"
    Expected Result: Message appears in the chatgroup with senderId=<robot-id> and senderType="robot"
    Failure Indicators: HTTP error logged, message not found in chatgroup, wrong senderId
    Evidence: .sisyphus/evidence/task-11-send-message.txt

  Scenario: PlatformChannel.send() handles network error gracefully
    Tool: Bash (Python script)
    Preconditions: Platform NOT running (or wrong URL configured).
    Steps:
      1. Instantiate PlatformChannel with platform_url pointing to localhost:9999 (nothing running)
      2. Call await channel.send(OutboundMessage(channel="platform", chat_id="fake-id", content="test"))
      3. Assert no exception is raised
      4. Check logs for error message
    Expected Result: Error is logged, no exception propagates, agent continues running
    Failure Indicators: Unhandled exception, Python traceback, agent crash
    Evidence: .sisyphus/evidence/task-11-send-error-handling.txt
  ```

  **Commit**: YES
  - Message: `feat(robot): implement PlatformChannel.send() via POST`
  - Files: `robot/nanobot/channels/platform.py`
  - Pre-commit: —

 [x] 12. Update PlatformChannel to use per-robot stream URL + self-mention filter

  **What to do**:
  - In `robot/nanobot/channels/platform.py`, update `_get_stream_url()` (lines 45-53) to use the per-robot endpoint:
    - Change line 53 from `return platform_url + "/api/v1/robots/stream"` to `return platform_url + f"/api/v1/robots/{self.config.robot_id}/stream"`
    - `self.config.robot_id` is populated during onboard (Task 9)
  - In `_handle_platform_message()` (lines 187-226), add self-mention loop prevention:
    - At the top of the method (after line 201 where `sender_id` is extracted), add:
      ```python
      # Prevent self-mention loop: ignore messages sent by this robot
      if sender_id == self.config.robot_id:
          logger.debug(f"Ignoring self-sent message {message_id}")
          return
      ```
    - This prevents infinite loops when the robot's own response is broadcast back through the chatgroup → robot routing
  - Add a guard in `start()` (after line 61): if `self.config.robot_id` is not set, log error and return (same pattern as the existing `platform_url` and `robot_token` guards at lines 57-63)

  **Must NOT do**:
  - Do NOT modify `send()` — that's Task 11
  - Do NOT change the SSE connection/reconnection logic (`_connect_and_read`, `_wait_before_reconnect`)
  - Do NOT change the heartbeat logic
  - Do NOT filter messages by `senderType` — only filter by `senderId === self.config.robot_id`

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Two targeted modifications in a single file — URL update + self-mention filter
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `api-design-principles`: Not designing an API — modifying client-side channel code

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11)
  - **Blocks**: Task 15 (E2E integration QA)
  - **Blocked By**: Task 6 (per-robot stream endpoint — URL must exist), Task 9 (onboard CLI — provides `robot_id` in config)

  **References**:

  **Pattern References** (existing code to follow):
  - `robot/nanobot/channels/platform.py:45-53` — Current `_get_stream_url()` returning shared `/api/v1/robots/stream`. Change to `/api/v1/robots/{robot_id}/stream`
  - `robot/nanobot/channels/platform.py:55-63` — Existing guard pattern in `start()`: check config field, log error, return. Copy this pattern for `robot_id` guard
  - `robot/nanobot/channels/platform.py:187-226` — `_handle_platform_message()` where self-mention filter goes (after line 201)

  **API/Type References** (contracts to implement against):
  - `robot/nanobot/config/schema.py:237-242` — `PlatformConfig` with `robot_id` field (added in Task 9)
  - Task 6 — Per-robot stream endpoint at `/api/v1/robots/[id]/stream` with robot JWT auth

  **WHY Each Reference Matters**:
  - `platform.py:45-53`: The exact method to modify — line 53 is the URL to change
  - `platform.py:55-63`: Pattern for the new guard clause — consistent error handling style
  - `platform.py:187-226`: Where self-mention filter goes — must be early in the method, before the message is forwarded to the bus
  - `schema.py:237-242`: Source of `robot_id` — confirms the field name and location in config

  **Acceptance Criteria**:
  - [ ] `_get_stream_url()` returns URL with `/api/v1/robots/{robot_id}/stream` (not the old shared endpoint)
  - [ ] `start()` checks `self.config.robot_id` and returns early if not set
  - [ ] `_handle_platform_message()` skips messages where `senderId == self.config.robot_id`
  - [ ] Self-mention skip is logged at debug level
  - [ ] No changes to SSE connection/reconnection logic

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Stream URL uses per-robot endpoint
    Tool: Bash (Python script)
    Preconditions: PlatformConfig with robot_id="robot_abc123" and platform_url="http://localhost:3000"
    Steps:
      1. Create a Python script that instantiates PlatformChannel with the config above
      2. Call channel._get_stream_url()
      3. Assert return value equals "http://localhost:3000/api/v1/robots/robot_abc123/stream"
    Expected Result: URL includes the robot_id in the path
    Failure Indicators: URL still contains "/api/v1/robots/stream" (old shared endpoint)
    Evidence: .sisyphus/evidence/task-12-stream-url.txt

  Scenario: Self-mention messages are ignored
    Tool: Bash (Python script)
    Preconditions: PlatformChannel configured with robot_id="robot_abc123"
    Steps:
      1. Create a mock message dict: {"id": "msg_1", "chatGroupId": "cg_1", "content": "test", "senderId": "robot_abc123", "senderType": "robot"}
      2. Call await channel._handle_platform_message(mock_message)
      3. Assert that _handle_message was NOT called (mock the bus to verify)
    Expected Result: Message is silently dropped, debug log emitted
    Failure Indicators: Message forwarded to bus, no debug log
    Evidence: .sisyphus/evidence/task-12-self-mention-filter.txt

  Scenario: start() rejects missing robot_id
    Tool: Bash (Python script)
    Preconditions: PlatformConfig with platform_url and robot_token set, but robot_id empty/None
    Steps:
      1. Instantiate PlatformChannel with robot_id=""
      2. Call await channel.start()
      3. Assert _running is still False
      4. Check logs for "robot_id" related error
    Expected Result: Channel does not start, error logged
    Failure Indicators: Channel starts without robot_id, no error logged
    Evidence: .sisyphus/evidence/task-12-missing-robot-id.txt
  ```

  **Commit**: YES
  - Message: `feat(robot): update PlatformChannel to use per-robot stream URL`
  - Files: `robot/nanobot/channels/platform.py`
  - Pre-commit: —

### Wave 4 (After Wave 3 — UI enhancements + integration QA)

- [ ] 13. Add team/chatgroup selectors and auto-assign flow to robot creation UI

  **What to do**:
  - Modify `platform/src/app/(dashboard)/robots/page.tsx` to add team and chatgroup selection to the Create Robot dialog.
  - Add new state variables: `newTeamId: string`, `newChatGroupId: string`, `teams: Array<{id, name}>`, `chatgroups: Array<{id, name, teamId}>`.
  - On dialog open, fetch teams via `api.teams.list()` and populate a `<Select>` dropdown labeled "Assign to Team".
  - When a team is selected (`newTeamId` changes), fetch chatgroups for that team via `api.chatGroups.list(newTeamId)` and populate a second `<Select>` dropdown labeled "Assign to Chat Group".
  - Make both selectors **required** — disable the Create button until `newName`, `newTeamId`, and `newChatGroupId` are all set. `newSoul` (soulMd) remains optional per Task 1's fix.
  - Update `handleCreate` (currently lines 87-110) to perform these steps in sequence:
    1. `const robot = await api.robots.create({ name: newName, soulMd: newSoul || undefined })` — create the robot
    2. `await api.teams.addMember(newTeamId, { memberId: robot.id, memberType: 'robot' })` — add robot to team
    3. `await api.chatGroups.update(newChatGroupId, { addMemberIds: [robot.id] })` — add robot to chatgroup (use the chatgroup update endpoint which accepts member additions)
    4. `const tokenRes = await api.robots.update(robot.id, { generateToken: true, teamId: newTeamId, chatGroupId: newChatGroupId })` — generate JWT token with team/chatgroup context
    5. Set `assignToken` state to display the token in the Assign PC dialog (auto-open it)
  - If any step fails after robot creation, show an error toast but do NOT delete the robot — user can manually fix via UI.
  - Reset `newTeamId`, `newChatGroupId`, `teams`, `chatgroups` when dialog closes.
  - Use the existing `Select` component from `@/components/ui/select` (shadcn/ui) — it's already available in the project.
  - The team selector should show team name. The chatgroup selector should show chatgroup name.
  - If no teams exist, show disabled select with placeholder "No teams available — create a team first".
  - If a team has no chatgroups, show disabled select with placeholder "No chatgroups in this team".

  **Must NOT do**:
  - Do NOT create new API endpoints — use existing `api.teams.list()`, `api.teams.addMember()`, `api.chatGroups.list()`, `api.chatGroups.update()`, `api.robots.create()`, `api.robots.update()`
  - Do NOT modify the Assign PC dialog here (that's Task 14)
  - Do NOT add form validation beyond required field checks
  - Do NOT add loading spinners for each sequential step — use a single `isCreating` state for the entire flow
  - Do NOT modify the robots API route — token generation with team/chatgroup context is handled by Task 7's changes to `api/v1/robots/[id]/route.ts`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: This is a React UI task — modifying a dialog form with selects, state management, and sequential API calls
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Needed for polished form layout with cascading selects
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for implementation, only for QA (which is in the scenario)
    - `vercel-react-best-practices`: Overkill for a form dialog modification

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 14)
  - **Parallel Group**: Wave 4 (with Tasks 14, 15)
  - **Blocks**: Task 15 (E2E integration QA)
  - **Blocked By**: Tasks 7 (config endpoint with token changes), 10 (@mention routing)

  **References**:

  **Pattern References** (existing code to follow):
  - `platform/src/app/(dashboard)/robots/page.tsx:297-353` — Current Create Dialog structure. Copy this dialog pattern and add two `<Select>` components below the existing `newName` and `newSoul` fields.
  - `platform/src/app/(dashboard)/robots/page.tsx:87-110` — Current `handleCreate` function. This is where the sequential create→assign→token flow will be implemented.
  - `platform/src/app/(dashboard)/robots/page.tsx:51-70` — Current state variables. Add `newTeamId`, `newChatGroupId`, `teams`, `chatgroups` here.
  - `platform/src/app/(dashboard)/teams/page.tsx` — Team management page. Look at how teams are fetched and displayed for UI pattern reference.

  **API/Type References** (contracts to implement against):
  - `platform/src/lib/api/client.ts:228` — `api.teams.list()` returns `{ teams: Array<{ id: string, name: string, ... }> }`. Use this to populate the team selector.
  - `platform/src/lib/api/client.ts:244` — `api.teams.addMember(id, { memberId, memberType })` — call with `memberType: 'robot'` after robot creation.
  - `platform/src/lib/api/client.ts:276` — `api.chatGroups.list(teamId?)` returns `{ chatgroups: Array<{ id: string, name: string, teamId: string, ... }> }`. Pass `newTeamId` to filter.
  - `platform/src/lib/api/client.ts:284-292` — `api.chatGroups.update(id, data)` — use to add robot as member.

  **Component References**:
  - `platform/src/components/ui/select.tsx` — shadcn/ui Select component. Import `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` for the dropdowns.

  **WHY Each Reference Matters**:
  - The Create Dialog (lines 297-353) shows the existing layout pattern — new selects must match the spacing, label style, and input sizing.
  - The `handleCreate` function shows the current flow — the new sequential flow replaces the single `api.robots.create()` call.
  - The API client references are critical — they show the exact function signatures and return types to use.
  - The Select component import is needed because the current dialog only uses `Input` and `Textarea`.

  **Acceptance Criteria**:
  - [ ] Team selector dropdown appears in Create Robot dialog below the Soul field
  - [ ] Chatgroup selector appears below team selector, disabled until team is selected
  - [ ] Selecting a team fetches and populates chatgroups for that team
  - [ ] Create button disabled until name + team + chatgroup are selected
  - [ ] Creating a robot: creates robot → adds to team → adds to chatgroup → generates token → shows token
  - [ ] Error during any step shows toast, does not crash
  - [ ] `npx tsc --noEmit` passes with no new errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Happy path — create robot with team and chatgroup assignment
    Tool: Playwright (playwright skill)
    Preconditions: Platform running at localhost:3000, logged in as admin, at least 1 team with 1 chatgroup exists
    Steps:
      1. Navigate to http://localhost:3000/robots
      2. Click button with text "Create Robot" (selector: button:has-text("Create Robot"))
      3. Wait for dialog to appear (selector: [role="dialog"])
      4. Fill input[name="name"] or first Input in dialog with "QA-Bot-13"
      5. Click the team selector dropdown (selector: [role="dialog"] select or Select trigger for team)
      6. Assert: dropdown contains at least 1 team option
      7. Select the first team option
      8. Wait 500ms for chatgroup fetch
      9. Assert: chatgroup selector is now enabled (not disabled)
      10. Click the chatgroup selector, select first option
      11. Assert: Create button is now enabled
      12. Click Create button
      13. Wait for loading to complete (isCreating → false)
      14. Assert: Token display dialog appears with a JWT token string (starts with "eyJ")
      15. Screenshot
    Expected Result: Robot created, assigned to team and chatgroup, token displayed
    Failure Indicators: Create button stays disabled, error toast appears, no token shown, dialog doesn't close
    Evidence: .sisyphus/evidence/task-13-create-robot-happy.png

  Scenario: No teams available — selectors show empty state
    Tool: Playwright (playwright skill)
    Preconditions: Platform running, logged in, tenant has NO teams
    Steps:
      1. Navigate to http://localhost:3000/robots
      2. Click "Create Robot" button
      3. Wait for dialog
      4. Assert: team selector shows "No teams available" placeholder or is disabled
      5. Assert: chatgroup selector is disabled
      6. Assert: Create button is disabled
      7. Screenshot
    Expected Result: Both selectors disabled/empty, Create button disabled
    Failure Indicators: Selectors show options when none should exist, Create button enabled
    Evidence: .sisyphus/evidence/task-13-no-teams.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add team/chatgroup selectors to robot creation dialog`
  - Files: `platform/src/app/(dashboard)/robots/page.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 14. Enhance token display dialog with onboard command and copy button

  **What to do**:
  - Modify `platform/src/app/(dashboard)/robots/page.tsx` — specifically the Assign PC dialog (lines 355-425).
  - After the existing token display area (lines 372-394), add a second display block showing the full nanobot onboard command.
  - The command format: `nanobot onboard --platform-url http://localhost:3000 --token <actual-token-value>`
  - Use `window.location.origin` to dynamically get the platform URL instead of hardcoding `localhost:3000`.
  - Add a label above the command block: "Onboard Command" (similar to the existing "Robot Token" label).
  - Display the command in a `<pre>` or monospace styled `<div>` with word-break for long tokens.
  - Add a dedicated copy button for the full command (in addition to the existing token-only copy button at lines 379-390).
  - When clicked, copy the full command string to clipboard using `navigator.clipboard.writeText()`.
  - Show a brief "Copied!" feedback (reuse the existing copy feedback pattern from the token copy button).
  - The existing token copy button and its functionality must remain unchanged.
  - Layout: stack vertically — Token section (existing) → Onboard Command section (new) → both with their own copy buttons.

  **Must NOT do**:
  - Do NOT modify the token generation logic
  - Do NOT change the dialog open/close behavior
  - Do NOT add any API calls — this is purely a UI display enhancement
  - Do NOT remove or modify the existing token copy functionality
  - Do NOT add platform URL configuration — use `window.location.origin` for dynamic URL

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Pure UI enhancement — adding a display block and copy button to an existing dialog
  - **Skills**: [`frontend-design`]
    - `frontend-design`: Ensures the onboard command block looks polished and consistent with the existing token display
  - **Skills Evaluated but Omitted**:
    - `playwright`: Not needed for implementation, only for QA scenario

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 13, but same file — coordinate via separate dialog sections)
  - **Parallel Group**: Wave 4 (with Tasks 13, 15)
  - **Blocks**: Task 15 (E2E integration QA)
  - **Blocked By**: None technically, but logically after Task 7 (config endpoint) since the onboard command references the config endpoint

  **References**:

  **Pattern References** (existing code to follow):
  - `platform/src/app/(dashboard)/robots/page.tsx:355-425` — The full Assign PC dialog. This is where the new onboard command block will be inserted.
  - `platform/src/app/(dashboard)/robots/page.tsx:372-394` — Existing token display area with copy button. The new onboard command block should visually match this pattern: label → monospace text → copy button.
  - `platform/src/app/(dashboard)/robots/page.tsx:379-390` — The existing copy button implementation using `navigator.clipboard.writeText()`. Duplicate this pattern for the onboard command copy button.

  **WHY Each Reference Matters**:
  - Lines 355-425 define the dialog boundary — the new block must be inserted within this structure, after the token display but before the dialog's close button.
  - Lines 372-394 show the exact visual pattern to replicate — same label style, same monospace container, same copy button placement.
  - Lines 379-390 show the clipboard API usage — reuse the exact same `navigator.clipboard.writeText()` + feedback pattern.

  **Acceptance Criteria**:
  - [ ] Onboard command section appears below the token section in the Assign PC dialog
  - [ ] Command uses dynamic `window.location.origin` for the platform URL
  - [ ] Command format: `nanobot onboard --platform-url <origin> --token <token>`
  - [ ] Copy button copies the full command to clipboard
  - [ ] "Copied!" feedback appears when copy button is clicked
  - [ ] Existing token copy button still works independently
  - [ ] `npx tsc --noEmit` passes with no new errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Happy path — onboard command displayed and copyable
    Tool: Playwright (playwright skill)
    Preconditions: Platform running at localhost:3000, logged in as admin, at least 1 robot exists with a generated token
    Steps:
      1. Navigate to http://localhost:3000/robots
      2. Find a robot card with an existing token (or generate one via Assign PC button)
      3. Open the Assign PC dialog for that robot
      4. Wait for dialog to appear (selector: [role="dialog"])
      5. Assert: "Robot Token" label and token string visible (existing functionality)
      6. Scroll down within dialog if needed
      7. Assert: "Onboard Command" label visible
      8. Assert: command text contains "nanobot onboard --platform-url http://localhost:3000 --token eyJ"
      9. Click the copy button next to the onboard command
      10. Assert: "Copied!" feedback text appears
      11. Screenshot
    Expected Result: Onboard command displayed with correct format, copy works
    Failure Indicators: No onboard command section, wrong URL, missing token in command, copy fails
    Evidence: .sisyphus/evidence/task-14-onboard-command-happy.png

  Scenario: Dynamic URL — command uses actual origin, not hardcoded
    Tool: Playwright (playwright skill)
    Preconditions: Platform running at localhost:3000
    Steps:
      1. Open robot Assign PC dialog as in happy path
      2. Read the onboard command text content
      3. Assert: command contains "--platform-url http://localhost:3000" (matches window.location.origin)
      4. Assert: command does NOT contain hardcoded "localhost" outside of the origin
    Expected Result: Platform URL in command matches the browser's origin
    Failure Indicators: Hardcoded URL that doesn't match origin
    Evidence: .sisyphus/evidence/task-14-dynamic-url.png
  ```

  **Commit**: YES (group with Task 13)
  - Message: `feat(ui): add onboard command display with copy button to token dialog`
  - Files: `platform/src/app/(dashboard)/robots/page.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 15. End-to-end integration QA (no code — verification only)

  **What to do**:
  - This is a **QA-only task** — no code changes. The executing agent runs the full round-trip flow to verify all tasks work together.
  - Prerequisites: ALL tasks 1-14 must be complete. Platform and nanobot must be running.
  - The full flow to verify:
    1. **Seed the database** — `npm run db:seed` in platform/ to get clean state with Alice, Bob, Acme Corp, Atlas robot.
    2. **Login as admin** — `POST /api/v1/auth/login` with seeded admin credentials → get user JWT.
    3. **Select tenant** — `POST /api/v1/auth/select-tenant` → get tenant-scoped JWT.
    4. **Create a team** (if not seeded) — `POST /api/v1/teams` with `{name: "QA Team"}`.
    5. **Create a robot via UI** — Open robots page, use new Create Dialog with team + chatgroup selectors, create "IntegrationBot".
    6. **Copy the onboard command** — From the token dialog, copy the `nanobot onboard --platform-url ... --token ...` command.
    7. **Run nanobot onboard** — Execute the copied command in a terminal. Verify it calls `/api/v1/robots/[id]/config` and stores config in SQLite3.
    8. **Start nanobot** — Run `nanobot` to start the agent. Verify it connects to `/api/v1/robots/[id]/stream` via SSE.
    9. **Send @mention in chatgroup** — `POST /api/v1/chatgroups/[id]/messages` with `{content: "@IntegrationBot hello, what is 2+2?"}` using human JWT.
    10. **Verify robot receives message** — Check robot SSE stream received the mention event with correct `chatGroupId` and `content`.
    11. **Verify robot responds** — Robot processes the message via its agent loop and sends a response via `POST /api/v1/robots/[id]/messages`.
    12. **Verify response appears in chatgroup** — Check chatgroup stream receives the robot's response message with `senderType: "robot"`.
  - If any step fails, document the failure with exact error output.
  - This task validates the entire chain: UI → API → Redis Pub/Sub → SSE → Nanobot → POST → Redis → Chatgroup SSE.

  **Must NOT do**:
  - Do NOT modify any code files
  - Do NOT fix bugs found during QA (report them as failures — separate fix tasks will be created)
  - Do NOT skip any step in the flow

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex multi-system integration verification requiring careful step-by-step execution across platform (curl), nanobot (tmux), and browser (Playwright)
  - **Skills**: [`playwright`, `agent-browser`]
    - `playwright`: Required for UI steps (robot creation dialog, token copy)
    - `agent-browser`: Backup browser automation for UI verification
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Not needed — this is verification, not implementation

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential after Tasks 13, 14)
  - **Blocks**: Final Verification Wave (F1-F4)
  - **Blocked By**: ALL Tasks 1-14

  **References**:

  **Endpoint References** (APIs to call in sequence):
  - `POST /api/v1/auth/login` — Login with seeded credentials to get user JWT. Body: `{email, password}`. Response: `{token, tenants[]}`. 
  - `POST /api/v1/auth/select-tenant` — Select tenant, get tenant-scoped JWT. Body: `{tenantId}`. Response: `{token}`.
  - `POST /api/v1/teams` — Create team if needed. Body: `{name}`. Auth: tenant JWT.
  - `POST /api/v1/chatgroups` — Create chatgroup if needed. Body: `{name, teamId, memberIds[]}`. Auth: tenant JWT.
  - `GET /api/v1/robots/[id]/config` — Robot config endpoint (Task 7). Auth: robot JWT. Response: robot info + LLM config.
  - `GET /api/v1/robots/[id]/stream` — Robot SSE stream (Task 6). Auth: robot JWT. Response: SSE event stream.
  - `POST /api/v1/chatgroups/[id]/messages` — Send message with @mention (Task 10). Auth: tenant JWT. Body: `{content: "@IntegrationBot ..."}`.
  - `POST /api/v1/robots/[id]/messages` — Robot response (Task 8). Auth: robot JWT. Body: `{chatGroupId, content}`.

  **Seed Data References**:
  - `platform/prisma/seed.ts` — Seeded users (Alice/Bob), tenant (Acme Corp), robot (Atlas). Check exact credentials here.

  **Nanobot CLI References**:
  - `robot/nanobot/cli/commands.py:157-299` — The `onboard` command. After Task 9's changes, it calls `/api/v1/robots/[id]/config` and stores in SQLite.

  **WHY Each Reference Matters**:
  - The endpoint references define the exact API contract for each step — the agent must call them in the correct order with correct auth.
  - The seed data reference ensures the QA agent knows what test data is available.
  - The nanobot CLI reference helps the agent understand what the onboard command does and what output to expect.

  **Acceptance Criteria**:
  - [ ] Robot created via UI with team + chatgroup assignment (screenshot evidence)
  - [ ] Token generated and onboard command displayed (screenshot evidence)
  - [ ] `nanobot onboard` command succeeds — config stored in SQLite3 DB
  - [ ] Nanobot connects to per-robot SSE stream
  - [ ] @mention message in chatgroup is routed to robot's stream
  - [ ] Robot processes message and sends response via POST endpoint
  - [ ] Response appears in chatgroup stream for human user
  - [ ] All evidence files saved

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full round-trip — human @mentions robot, robot responds
    Tool: Bash (curl) + interactive_bash (tmux)
    Preconditions: Platform running at localhost:3000 with seeded DB. Nanobot installed and ready.
    Steps:
      1. Login: curl -s -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"alice@acme.com","password":"password123"}' → extract token
      2. Select tenant: curl -s -X POST http://localhost:3000/api/v1/auth/select-tenant -H "Authorization: Bearer <user-token>" -H "Content-Type: application/json" -d '{"tenantId":"<acme-tenant-id>"}' → extract tenant token
      3. List teams: curl -s http://localhost:3000/api/v1/teams -H "Authorization: Bearer <tenant-token>" → get team ID
      4. List chatgroups: curl -s http://localhost:3000/api/v1/chatgroups -H "Authorization: Bearer <tenant-token>" → get chatgroup ID
      5. Create robot: curl -s -X POST http://localhost:3000/api/v1/robots -H "Authorization: Bearer <tenant-token>" -H "Content-Type: application/json" -d '{"name":"IntegrationBot"}' → get robot ID
      6. Add robot to team: curl -s -X POST http://localhost:3000/api/v1/teams/<team-id>/members -H "Authorization: Bearer <tenant-token>" -H "Content-Type: application/json" -d '{"memberId":"<robot-id>","memberType":"robot"}'
      7. Generate robot token: curl -s -X PUT http://localhost:3000/api/v1/robots/<robot-id> -H "Authorization: Bearer <tenant-token>" -H "Content-Type: application/json" -d '{"generateToken":true,"teamId":"<team-id>","chatGroupId":"<chatgroup-id>"}' → extract robot JWT
      8. Start tmux session: tmux new-session -d -s nanobot-qa
      9. Run onboard in tmux: send-keys -t nanobot-qa "nanobot onboard --platform-url http://localhost:3000 --token <robot-jwt>" Enter
      10. Wait 5s, capture output: tmux capture-pane -t nanobot-qa -p → assert contains "onboarded successfully" or similar
      11. Start nanobot in tmux: send-keys -t nanobot-qa "nanobot" Enter
      12. Wait 10s for SSE connection to establish
      13. Start SSE listener for chatgroup in background: curl -N -H "Authorization: Bearer <tenant-token>" http://localhost:3000/api/v1/chatgroups/<chatgroup-id>/stream > /tmp/chatgroup-stream.txt &
      14. Send @mention: curl -s -X POST http://localhost:3000/api/v1/chatgroups/<chatgroup-id>/messages -H "Authorization: Bearer <tenant-token>" -H "Content-Type: application/json" -d '{"content":"@IntegrationBot hello, what is 2+2?"}'
      15. Wait 30s for robot to process and respond
      16. Check chatgroup stream output: cat /tmp/chatgroup-stream.txt → assert contains a message with senderType "robot"
      17. Kill background curl, kill tmux session
    Expected Result: Robot receives @mention via its SSE stream, processes it, sends response via POST, response appears in chatgroup stream
    Failure Indicators: Nanobot doesn't connect to stream, @mention not routed, no robot response in chatgroup, timeout after 30s
    Evidence: .sisyphus/evidence/task-15-e2e-roundtrip.txt

  Scenario: Robot config fetch — verify config endpoint returns correct data
    Tool: Bash (curl)
    Preconditions: Robot created and token generated from previous scenario
    Steps:
      1. curl -s http://localhost:3000/api/v1/robots/<robot-id>/config -H "Authorization: Bearer <robot-jwt>" → parse JSON
      2. Assert response contains: robot.id, robot.name ("IntegrationBot"), robot.soulMd
      3. Assert response contains: llmConfig with provider info (MiniMax if configured)
      4. Assert response contains: teams array with the assigned team
      5. Assert response contains: chatgroups array with the assigned chatgroup
    Expected Result: Config endpoint returns complete robot configuration including LLM settings
    Failure Indicators: 401 unauthorized, missing fields, empty LLM config, wrong robot data
    Evidence: .sisyphus/evidence/task-15-config-fetch.txt

  Scenario: Self-mention prevention — robot ignores its own messages
    Tool: Bash (curl)
    Preconditions: Robot connected to stream from round-trip scenario
    Steps:
      1. Simulate robot sending a message that mentions itself: POST to chatgroup with robot JWT, content "@IntegrationBot test self-mention"
      2. Wait 10s
      3. Count messages in chatgroup: GET messages endpoint
      4. Assert: no new robot response generated (robot should ignore its own messages where senderId === robotId)
    Expected Result: Robot does not respond to its own messages, preventing infinite loop
    Failure Indicators: Robot generates a response to its own message, message count keeps increasing
    Evidence: .sisyphus/evidence/task-15-self-mention-prevention.txt
  ```

  **Commit**: NO (no code changes)

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` in platform/. Run `npm run lint` in platform/. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify Python files pass `ruff check` or `flake8`.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill for UI, + `agent-browser` skill)
  Start from clean state (seed DB). Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration: human creates robot → assigns to team/chatgroup → generates token → onboards nanobot → sends @mention → robot receives and responds → human sees response. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance: no mcp-server changes, no Prisma schema changes, no multi-provider UI. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Wave | Message | Files | Pre-commit |
|------|---------|-------|------------|
| 1 | `fix(platform): make soulMd optional in robot creation API` | `platform/src/app/api/v1/robots/route.ts` | `npm run lint` |
| 1 | `fix(platform): fix moonshot provider typo in settings` | `platform/src/app/(dashboard)/settings/page.tsx` | `npm run lint` |
| 1 | `feat(platform): add robot-specific pub/sub channel functions` | `platform/src/lib/pubsub.ts` | `npm run lint` |
| 1 | `feat(platform): add robot name validation for @mention compatibility` | `platform/src/app/api/v1/robots/route.ts`, `platform/src/app/api/v1/robots/[id]/route.ts` | `npm run lint` |
| 1 | `feat(robot): add SQLite3 config storage module` | `robot/nanobot/config/database.py`, `robot/pyproject.toml` | — |
| 2 | `feat(platform): add per-robot SSE stream endpoint` | `platform/src/app/api/v1/robots/[id]/stream/route.ts` | `npm run lint` |
| 2 | `feat(platform): add robot config endpoint` | `platform/src/app/api/v1/robots/[id]/config/route.ts` | `npm run lint` |
| 2 | `feat(platform): add robot message POST endpoint` | `platform/src/app/api/v1/robots/[id]/messages/route.ts` | `npm run lint` |
| 2 | `feat(robot): update onboard CLI for SQLite3 + new config endpoint` | `robot/nanobot/cli/commands.py`, `robot/nanobot/config/schema.py` | — |
| 3 | `feat(platform): wire @mention routing to robot pub/sub channels` | `platform/src/app/api/v1/chatgroups/[id]/messages/route.ts` | `npm run lint` |
| 3 | `feat(robot): implement PlatformChannel.send() via POST` | `robot/nanobot/channels/platform.py` | — |
| 3 | `feat(robot): update PlatformChannel to use per-robot stream URL` | `robot/nanobot/channels/platform.py` | — |
| 4 | `feat(platform): add team/chatgroup selectors to robot creation UI` | `platform/src/app/(dashboard)/robots/page.tsx` | `npm run lint` |
| 4 | `feat(platform): enhance token display with onboard command` | `platform/src/app/(dashboard)/robots/page.tsx` | `npm run lint` |

---

## Success Criteria

### Verification Commands
```bash
# 1. Robot creation with soulMd optional
curl -X POST http://localhost:3000/api/v1/robots \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -d '{"name": "TestBot"}'
# Expected: 201 {"robot": {"id": "...", "name": "TestBot", "soulMd": "", "status": "created"}}

# 2. Robot config endpoint
curl -H "X-Robot-Token: $TOKEN" http://localhost:3000/api/v1/robots/$ROBOT_ID/config
# Expected: 200 {"robot": {...}, "tenant": {...}, "teams": [...], "chatgroups": [...], "config": {"llm": {...}}}

# 3. Per-robot SSE stream
curl -N -H "X-Robot-Token: $TOKEN" http://localhost:3000/api/v1/robots/$ROBOT_ID/stream
# Expected: SSE connection opens, receives event: connected

# 4. Robot message POST
curl -X POST http://localhost:3000/api/v1/robots/$ROBOT_ID/messages \
  -H "X-Robot-Token: $TOKEN" \
  -d '{"chatGroupId": "...", "content": "Analysis complete"}'
# Expected: 201 {"message": {"id": "...", "senderType": "robot", ...}}

# 5. @mention routing (human sends, robot receives via SSE)
# Send @TestBot message in chatgroup → verify SSE event arrives on robot stream

# 6. SQLite3 storage
sqlite3 ~/.nanobot/nanobot.db "SELECT * FROM config;"
# Expected: rows with robot_id, robot_name, tenant_id, platform_url, etc.
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Existing MCP server `send_message` works unchanged
- [ ] Existing `/api/v1/robots/stream` (shared) works unchanged
- [ ] Existing `/api/v1/onboard` works unchanged
- [ ] No Prisma schema changes in diff
- [ ] No mcp-server/ files in diff
