# Architectural Decisions - Streamline Robot Communication

## [2026-02-22T12:51:01Z] Core Design Decisions
- **Communication Pattern**: SSE downstream (platform→robot) + POST upstream (robot→platform)
- **Storage**: SQLite3 for nanobot local config (replacing JSON)
- **Routing**: Redis pub/sub with robot-specific channels `robot:${robotId}:messages`
- **Self-mention Prevention**: Robot filters `senderId === robotId` before processing
- **LLM Provider**: MiniMax.com only for v1
