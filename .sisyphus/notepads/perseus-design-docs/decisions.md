# Decisions — Perseus Design Docs

Track architectural choices and design decisions.

---


## [2026-02-19T13:30:00Z] WorkspaceFile Scoping
- **Decision**: Used a single `WorkspaceFile` model with `scope` and `scopeId` fields.
- **Rationale**: While a polymorphic relationship can be complex in Prisma, explicitly mapping it to Tenant, Team, and ChatGroup optional relations provides better type safety and relationship management in the design spec.
- **Multi-tenancy**: High-level scope (Tenant) vs granular scope (ChatGroup) allows for flexible file sharing while maintaining the robot access boundary (robots only access files in their current chatgroup).
- Chose a combination of WebSockets/SSE and Redis Pub/Sub to handle real-time messaging across a potentially multi-node deployment.
- Enforced a 'human-in-the-loop' rule for chat groups (at least 1 human) to prevent autonomous robot-only groups.

## [2026-02-19T13:25:00Z] Task 4: Auth and Security Design

### Phone Verification
- **Decision**: Explicitly specified Aliyun SMS as the verification provider to match the blueprint requirement.
- **Rationale**: Ensures the design document accurately reflects the requested technical stack for onboarding.

### Robot Token Expiry
- **Decision**: Set the default robot token to never expire.
- **Rationale**: Matches the blueprint requirement while providing a user-selectable expiry option for flexibility.


## [2026-02-19T14:45:00Z] Workspace & File Management Design

### Hierarchical Folder Structure
- **Decision**: Implemented `/{tenantId}/{teamId}/{chatgroupId}/` as the directory organization.
- **Rationale**: Direct mapping of the platform entity hierarchy to the filesystem ensures that security policies can be enforced at the storage level and simplifies permission inheritance logic.

### Robot Access Restriction
- **Decision**: Restricted robot CRUD operations to the chatgroup context from which the robot was invoked.
- **Rationale**: Essential security principle to prevent unauthorized data access or modification across different project boundaries within the same team or tenant.
Decided to include a specific X-Robot-Token header to distinguish robot-initiated requests for specialized rate limiting and access control.
## Infrastructure - 2026-02-19
- Chose PostgreSQL 16 and Redis 7 as baseline versions for Docker Compose.
- Mapped /workspace to a host volume to ensure persistence of robot workspace data.
- Grouped management wireframes (Tenant, Team, Robot) together to show consistency in administrative patterns.
- Used a 60/40 split for the chat interface to emphasize the importance of both history viewing and command editing (especially for @mentioning robots).
