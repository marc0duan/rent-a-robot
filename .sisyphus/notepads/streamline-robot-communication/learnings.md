# Learnings - Streamline Robot Communication

## [2026-02-22T12:51:01Z] Plan Start
- **Plan**: streamline-robot-communication
- **Session**: ses_37add0836ffeZ4RZZASojQrfuA
- **Total Tasks**: 15 implementation + 4 final verification
- **Wave Structure**: 5 waves with maximum parallelization

## [2026-02-22T20:54:00Z] Task 5 - SQLite3 Config Storage Module

### Implementation Summary
- **File Created**: `robot/nanobot/config/database.py` (240 lines)
- **Dependency Added**: `aiosqlite>=0.19.0` to `robot/pyproject.toml`
- **Bug Fixed**: Moved `PlatformConfig` before `ChannelsConfig` in `schema.py` to resolve forward reference error

### ConfigDatabase Class Features
- **init_db()**: Creates 3 tables (config, robot_info, llm_config) with `CREATE TABLE IF NOT EXISTS`
- **save_robot_info() / get_robot_info()**: Robot metadata with JSON-serialized list fields (team_ids, chat_group_ids)
- **save_llm_config() / get_llm_config()**: Single-provider LLM configuration (simple approach)
- **migrate_from_json()**: One-time migration from ~/.nanobot/config.json → SQLite, preserves original JSON
- **Default Location**: ~/.nanobot/nanobot.db

### Schema Design Decisions
1. **robot_info table**: Single row (robot_id PRIMARY KEY), stores JWT claims + platform URL/token
2. **llm_config table**: Single row (auto-increment id), simple DELETE + INSERT for updates
3. **JSON serialization**: Lists (team_ids, chat_group_ids) stored as JSON TEXT for simplicity
4. **No async**: Uses stdlib `sqlite3` (sync) - `aiosqlite` dependency added for future async work

### QA Evidence Collected
- ✅ **task-5-sqlite-roundtrip.txt**: Import test, robot_info round-trip, llm_config round-trip
- ✅ **task-5-json-migration.txt**: JSON → SQLite migration, data verification, original file preserved
- ✅ **Default location test**: Database created at ~/.nanobot/nanobot.db with correct directory structure

### Key Patterns
- **Connection management**: `_get_connection()` helper with try/finally for cleanup
- **Idempotent initialization**: `CREATE TABLE IF NOT EXISTS` allows repeated init_db() calls
- **Data round-trip**: All tests verify save → retrieve → assert equality
- **Migration safety**: Original JSON config preserved (not deleted)

### Code Quality Notes
- Removed memo-style comments per hook warnings (lines 212, 215-216, 230, 235)
- Kept essential comments for SQL schema structure (lines 35, 43, 58)
- Kept data transformation comments (lines 86, 130-131, 157) for clarity
- Docstrings for public API methods (init_db, save/get methods, migrate_from_json)

## [2026-02-22T21:30:16Z] Task 1 - Make soulMd Optional in Robot Creation API

### Implementation Summary
- **File Modified**: `platform/src/app/api/v1/robots/route.ts` (lines 43-44, 48)
- **Changes Made**: Orchestrator direct edit (delegation failures due to timeout pattern)
- **Validation**: Changed from `if (!name || !soulMd)` to `if (!name)`
- **Default Value**: `sanitizeString(soulMd || '')` - empty string when soulMd not provided

### QA Evidence Collected
- ✅ **task-1-create-without-soul.json**: POST /api/v1/robots with `{"name": "SoullessBot"}` → 201 created, `soulMd: ""`
- ✅ **task-1-create-without-name.json**: POST with `{"soulMd": "soul"}` → 400 error, `"message": "Robot name is required."`

### Key Behavior
- Robot creation now requires only `name` (not `name` and `soulMd`)
- soulMd defaults to empty string when omitted
- Error message updated to reflect correct validation: "Robot name is required."

### Process Note
- This task was completed via direct orchestrator edit after 2 delegation attempts timed out (ses_37a978732ffe64LCdb5J39vAcz, ses_37a814706ffeyRtrhc7F64IrbL)
- Part of systematic timeout pattern affecting all Wave 1 tasks (Tasks 1-4 delegations all failed)
