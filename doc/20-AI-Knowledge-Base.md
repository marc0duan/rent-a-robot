# AI Knowledge Base Management Feature Specification

**Feature:** AI Knowledge Base Management  
**Status:** Draft  
**Created:** 2026-02-26

## Overview

The AI Knowledge Base Management feature enables robots to autonomously maintain team wikis, documentation, and institutional knowledge. As true "employees," robots can create, organize, and update knowledge articles, answer questions by searching documentation, and suggest improvements to keep the team's knowledge current.

## Core Features

### 1. Knowledge Base Organization
- Create and manage knowledge bases per team/tenant
- Hierarchical folder/category structure
- Article publishing workflow: DRAFT → REVIEW → PUBLISHED → ARCHIVED
- Article versioning and change history
- Tags and categories for easy navigation

### 2. Article Management
- Rich text article editing (Markdown support)
- Code snippet support with syntax highlighting
- Image and file attachments
- Table of contents auto-generation
- Last edited timestamp and author tracking
- Article templates

### 3. AI-Powered Features
- **Auto-summarization**: Generate article summaries for quick scanning
- **Q&A from Docs**: Answer questions by searching and synthesizing from knowledge base
- **Suggested Edits**: AI suggests improvements to outdated articles
- **Content Generation**: Help create new articles from bullet points
- **Related Articles**: Suggest related content automatically
- **Search Enhancement**: Semantic search with AI understanding

### 4. Search & Discovery
- Full-text search across all articles
- AI-powered semantic search
- Filter by category, tag, author, date
- Search within specific knowledge bases
- Recent searches history
- Popular articles trending

### 5. Notifications & Updates
- New article notifications
- Article update alerts
- Review request notifications
- Comment/reaction notifications

### 6. Access Control
- Public (all team members)
- Restricted (specific roles/teams)
- Private (author only)

## Data Model

### KnowledgeBase
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| teamId | UUID? | Foreign key to Team |
| name | String | Knowledge base name |
| description | String? | Description |
| slug | String | URL-friendly identifier |
| visibility | Enum | PUBLIC, TEAM, PRIVATE |
| settings | JSON | KB-specific settings |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### Category
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| knowledgeBaseId | UUID | Foreign key to KnowledgeBase |
| parentId | UUID? | Self-reference for hierarchy |
| name | String | Category name |
| slug | String | URL-friendly identifier |
| description | String? | Category description |
| order | Integer | Sort order |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### Article
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| knowledgeBaseId | UUID | Foreign key to KnowledgeBase |
| categoryId | UUID? | Foreign key to Category |
| authorId | UUID | Foreign key to Robot or User |
| authorType | Enum | ROBOT, USER |
| title | String | Article title |
| slug | String | URL-friendly identifier |
| content | Text | Article content (Markdown) |
| summary | String? | AI-generated summary |
| status | Enum | DRAFT, REVIEW, PUBLISHED, ARCHIVED |
| version | Integer | Version number |
| tags | String[] | Article tags |
| viewCount | Integer | View count |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |
| publishedAt | DateTime? | Publication timestamp |

### ArticleVersion
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| articleId | UUID | Foreign key to Article |
| version | Integer | Version number |
| content | Text | Article content at this version |
| authorId | UUID | Foreign key to Robot or User |
| authorType | Enum | ROBOT, USER |
| changeSummary | String? | Summary of changes |
| createdAt | DateTime | Record creation time |

### ArticleComment
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| articleId | UUID | Foreign key to Article |
| authorId | UUID | Foreign key to Robot or User |
| authorType | Enum | ROBOT, USER |
| content | String | Comment content |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### SearchHistory
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| userId | UUID? | Foreign key to User (nullable for robots) |
| robotId | UUID? | Foreign key to Robot (nullable for humans) |
| query | String | Search query |
| resultsCount | Integer | Number of results |
| clickedArticleId | UUID? | Article clicked (if any) |
| createdAt | DateTime | Record creation time |

## API Endpoints

### Knowledge Bases
- `GET /api/v1/tenants/{id}/knowledge-bases` - List knowledge bases
- `POST /api/v1/tenants/{id}/knowledge-bases` - Create knowledge base
- `GET /api/v1/knowledge-bases/{id}` - Get knowledge base
- `PUT /api/v1/knowledge-bases/{id}` - Update knowledge base
- `DELETE /api/v1/knowledge-bases/{id}` - Delete knowledge base

### Categories
- `GET /api/v1/knowledge-bases/{id}/categories` - List categories
- `POST /api/v1/knowledge-bases/{id}/categories` - Create category
- `GET /api/v1/categories/{id}` - Get category
- `PUT /api/v1/categories/{id}` - Update category
- `DELETE /api/v1/categories/{id}` - Delete category

### Articles
- `GET /api/v1/knowledge-bases/{id}/articles` - List articles
- `POST /api/v1/knowledge-bases/{id}/articles` - Create article
- `GET /api/v1/articles/{id}` - Get article
- `PUT /api/v1/articles/{id}` - Update article
- `DELETE /api/v1/articles/{id}` - Delete article
- `POST /api/v1/articles/{id}/publish` - Publish article
- `POST /api/v1/articles/{id}/archive` - Archive article

### Article Versions
- `GET /api/v1/articles/{id}/versions` - List versions
- `GET /api/v1/articles/{id}/versions/{version}` - Get specific version
- `POST /api/v1/articles/{id}/restore/{version}` - Restore version

### Article Comments
- `GET /api/v1/articles/{id}/comments` - List comments
- `POST /api/v1/articles/{id}/comments` - Add comment
- `PUT /api/v1/comments/{id}` - Update comment
- `DELETE /api/v1/comments/{id}` - Delete comment

### Search
- `GET /api/v1/knowledge-bases/{id}/search` - Search articles
- `POST /api/v1/knowledge-bases/{id}/ai-search` - AI semantic search
- `GET /api/v1/robots/{id}/search-history` - Get search history

### AI Features
- `POST /api/v1/articles/{id}/summarize` - Generate AI summary
- `POST /api/v1/knowledge-bases/{id}/ask` - Ask question from docs
- `POST /api/v1/articles/{id}/suggest-edits` - Get AI suggested edits
- `GET /api/v1/knowledge-bases/{id}/related/{articleId}` - Get related articles
- `POST /api/v1/knowledge-bases/{id}/generate-article` - AI generate article

### Dashboard
- `GET /api/v1/robots/{id}/knowledge-dashboard` - Get KB overview
- `GET /api/v1/robots/{id}/recent-articles` - Get recently edited articles
- `GET /api/v1/robots/{id}/suggested-improvements` - Get articles needing updates

## User Interface

### Knowledge Base List Page
- Grid/list view of knowledge bases
- Search and filter
- Create new KB button
- KB statistics (articles, last updated)

### Knowledge Base Detail Page
- Category tree sidebar
- Article list with filters
- Recent articles
- Popular articles
- Quick search

### Article Editor
- Markdown editor with preview
- Toolbar for formatting
- Image upload
- Code block insertion
- Table of contents
- Autosave

### Article View
- Clean reading view
- Table of contents sidebar
- Related articles
- Version history
- Comments section
- Share button

### Search Results
- Highlighted matches
- Filter by category/tag
- AI summary of results
- Quick preview

### Robot Knowledge Dashboard
- Articles authored count
- Recent edits
- Suggested improvements
- Q&A activity

## Implementation Notes

- Content stored as Markdown, rendered on frontend
- Full-text search using database text search or external service
- AI features use tenant's LLM config
- Article versions limited to last 50 versions
- Search history retained for 90 days
- All timestamps stored in UTC

## E2E Test Plan

Using agent-browser:
1. Login as user
2. Navigate to robot detail
3. View knowledge dashboard
4. Create a new knowledge base
5. Create categories
6. Create an article
7. Edit and update article
8. Publish article
9. Add comments to article
10. Search for article
11. View article version history
12. Test AI summary generation
13. Ask AI a question from docs
