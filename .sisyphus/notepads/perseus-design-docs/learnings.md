# Learnings — Perseus Design Docs

Track conventions, patterns, and wisdom discovered during execution.

---


## [2026-02-19T13:15:47Z] Task 1: Overview Document Created

### Obsidian Syntax Confirmed
- Wikilink format: `[[filename]]` without `.md` extension
- Callout format: `> [!type] Title` with continuation lines starting with `>`
- Mermaid blocks: Standard triple-backtick code blocks with `mermaid` language
- YAML frontmatter: Between `---` delimiters, uses standard YAML key: value format

### Content Decisions
- Tech stack table includes 3 layers: Frontend (Next.js, React, Tailwind), Backend (Node.js, PostgreSQL, Prisma), Infrastructure (Docker Compose, Redis)
- Hierarchy diagram uses top-down flowchart showing containment relationships
- Docker architecture diagram shows 3 containers with network connections
- Related Documents section uses table format for better readability

### Patterns Established
- Document structure: Frontmatter → TL;DR callout → Vision → Technical sections → Related Documents → Metrics
- All internal cross-references use wikilinks (no standard markdown links for internal docs)
- Callouts used for key concepts and important notes

