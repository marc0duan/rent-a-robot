# AI Email Handling Feature Specification

**Feature:** AI Email Handling  
**Status:** Draft  
**Created:** 2026-02-26

## Overview

The AI Email Handling feature enables robots to autonomously manage email accounts, parse incoming emails, categorize them, draft responses, and handle email workflows—making them true "employees" who can manage communications like a real executive assistant.

## Core Features

### 1. Email Account Connection
- Robots connect email accounts via IMAP/SMTP or OAuth (Gmail, Outlook)
- Support multiple email accounts per robot
- Secure token storage with encryption
- Connection status monitoring and auto-reconnect

### 2. Email Parsing & Classification
- Parse email headers, body, attachments
- Classify emails by category (IMPORTANT, URGENT, MEETING, FYI, SPAM, REPLY_NEEDED)
- Extract key information (sender, subject, dates, action items)
- Thread detection for email conversations

### 3. Email Response Drafting
- AI-generated draft responses based on email context
- Multiple tone options (formal, casual, brief)
- Human review before sending
- Response templates for common scenarios

### 4. Email Management
- Mark emails as read/unread
- Archive and delete operations
- Star/flag important emails
- Move between folders/labels

### 5. Email Summary Dashboard
- Daily email summary for connected accounts
- Categorized inbox view
- Quick actions (reply, archive, delete)
- Email search functionality

## Data Model

### EmailAccount
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| robotId | UUID | Foreign key to Robot |
| tenantId | UUID | Foreign key to Tenant |
| provider | Enum | GMAIL, OUTLOOK, IMAP |
| emailAddress | String | Connected email address |
| accessToken | String | Encrypted OAuth/IMAP token |
| refreshToken | String | Encrypted refresh token |
| syncStatus | Enum | PENDING, ACTIVE, ERROR |
| lastSyncAt | DateTime? | Last successful sync |
| createdAt | DateTime | Record creation time |

### Email
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| accountId | UUID | Foreign key to EmailAccount |
| externalEmailId | String | ID from email provider |
| threadId | String? | Email thread ID |
| subject | String | Email subject |
| from | JSON | Sender info (name, email) |
| to | JSON | Recipient list |
| cc | JSON? | CC recipient list |
| bodyText | Text? | Plain text body |
| bodyHtml | Text? | HTML body |
| attachments | JSON? | Attachment metadata |
| category | Enum | IMPORTANT, URGENT, MEETING, FYI, SPAM, REPLY_NEEDED, UNREAD |
| isRead | Boolean | Read status |
| isStarred | Boolean | Starred status |
| receivedAt | DateTime | When email was received |
| processedAt | DateTime? | When AI processed it |
| createdAt | DateTime | Record creation time |

### EmailDraft
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| emailId | UUID | Foreign key to Email (reply to) |
| robotId | UUID | Foreign key to Robot |
| to | JSON | Recipient |
| subject | String | Draft subject |
| body | Text | Draft body content |
| tone | Enum | FORMAL, CASUAL, BRIEF |
| status | Enum | DRAFT, PENDING_REVIEW, APPROVED, SENT, REJECTED |
| reviewedBy | UUID? | User who approved |
| createdAt | DateTime | Record creation time |
| sentAt | DateTime? | When sent |

### EmailRule
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| robotId | UUID | Foreign key to Robot |
| name | String | Rule name |
| conditions | JSON | Matching conditions |
| actions | JSON | Actions to take |
| isActive | Boolean | Rule enabled |
| createdAt | DateTime | Record creation time |

## API Endpoints

### Email Accounts
- `GET /api/v1/robots/{id}/email-accounts` - List connected accounts
- `POST /api/v1/robots/{id}/email-accounts` - Connect email account (OAuth/IMAP)
- `DELETE /api/v1/robots/{id}/email-accounts/{accountId}` - Disconnect account
- `POST /api/v1/robots/{id}/email-accounts/{accountId}/sync` - Force sync

### Emails
- `GET /api/v1/robots/{id}/emails` - List emails with filters (folder, category, date)
- `GET /api/v1/emails/{id}` - Get email details
- `PUT /api/v1/emails/{id}` - Update email (mark read, star, archive)
- `DELETE /api/v1/emails/{id}` - Delete email
- `POST /api/v1/emails/{id}/classify` - Re-classify email

### Email Drafts
- `GET /api/v1/robots/{id}/drafts` - List drafts
- `POST /api/v1/emails/{id}/draft` - Create draft response
- `PUT /api/v1/email-drafts/{id}` - Update draft
- `POST /api/v1/email-drafts/{id}/approve` - Approve and send
- `DELETE /api/v1/email-drafts/{id}` - Reject draft

### Email Rules
- `GET /api/v1/robots/{id}/email-rules` - List rules
- `POST /api/v1/robots/{id}/email-rules` - Create rule
- `PUT /api/v1/email-rules/{id}` - Update rule
- `DELETE /api/v1/email-rules/{id}` - Delete rule

### Email Summaries
- `GET /api/v1/robots/{id}/email-summary` - Get daily summary

## User Interface

### Robot Detail Page Enhancement
- Connected email accounts panel
- Email inbox preview
- Quick stats (unread, urgent, reply needed)

### New Email Dashboard Page
- Categorized inbox view
- Email list with filters
- Quick actions toolbar

### Email Detail View
- Full email content
- AI classification
- Draft response panel
- Action buttons (reply, archive, delete)

### Settings: Email Connections
- Connect/disconnect accounts
- OAuth flow for Gmail/Outlook
- IMAP configuration form
- Sync status indicators

## Implementation Notes

- Email sync runs as background job (cron)
- OAuth tokens stored encrypted via crypto.ts
- Email bodies stored in workspace for retrieval
- Classification uses tenant's LLM config
- IMAP support via `imapflow` library
- Gmail/Outlook via official OAuth APIs

## E2E Test Plan

Using agent-browser:
1. Login as user
2. Navigate to robot detail
3. Connect email account (OAuth mock)
4. View inbox with categorized emails
5. Create draft response
6. Approve and send draft
7. Verify email appears in sent folder
