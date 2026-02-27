# AI IT Support/Helpdesk - Feature Specification

**Feature:** AI IT Support/Helpdesk  
**Status:** Draft  
**Target Release:** TBD  
**Feature ID:** 25

---

## 1. Overview

### Problem Statement

IT support is a repetitive, time-consuming function that distracts engineers from higher-value work. Most IT queries (password resets, software installation, access requests, troubleshooting) follow predictable patterns that an AI agent can handle autonomously.

### Solution

An AI-powered IT Helpdesk agent that:
- Responds to IT support requests in chat
- Maintains a knowledge base of IT solutions
- Creates/tracks support tickets
- Escalates complex issues to human IT staff

### Value Proposition

- **24/7 Availability**: AI handles requests outside business hours
- **Faster Response**: Instant answers to common problems
- **Cost Reduction**: Frees human IT staff for complex issues
- **Consistent Service**: Standardized responses with accurate info

---

## 2. User Stories

| ID | User Story | Priority |
|----|------------|----------|
| US1 | As an employee, I want to ask IT questions in chat and get instant answers | Must Have |
| US2 | As an employee, I want to create a support ticket that gets tracked | Must Have |
| US3 | As an employee, I want the AI to escalate complex issues to human IT staff | Must Have |
| US4 | As an IT admin, I want to view and manage all support tickets | Must Have |
| US5 | As an IT admin, I want to add/edit IT knowledge base articles | Should Have |
| US6 | As an employee, I want to check my ticket status | Should Have |

---

## 3. Functional Requirements

### 3.1 Core Features

#### 3.1.1 IT Question Answering

- AI listens for IT-related messages in assigned chatgroups
- Recognizes common IT issues:
  - Password/account problems
  - Software installation requests
  - Access/permission requests
  - Hardware issues
  - Network/VPN problems
- Searches knowledge base for matching solutions
- Provides step-by-step instructions when available
- Creates ticket if no solution exists

#### 3.1.2 Ticket Management

**Ticket Lifecycle:**
```
New → In Progress → Resolved → Closed
                ↓
            Escalated
```

**Ticket Fields:**
- `id`: Unique identifier (UUID)
- `title`: Short description
- `description`: Detailed problem statement
- `category`: Enum (hardware, software, access, network, other)
- `priority`: Enum (low, medium, high, critical)
- `status`: Enum (new, in_progress, resolved, closed, escalated)
- `requesterId`: User who created the ticket
- `assigneeId`: IT staff assigned (can be robot for auto-resolution)
- `createdAt`, `updatedAt`, `resolvedAt`: Timestamps
- `chatgroupId`: Original chat where ticket was created

#### 3.1.3 Knowledge Base

- Pre-populated with common IT solutions
- Categories: Hardware, Software, Network, Account, General
- Searchable by title and content
- Editable by IT admins

#### 3.1.4 Escalation

- Auto-escalate when:
  - User explicitly requests human help
  - Issue matches "critical" keywords (security, breach, data loss)
  - No solution found after N attempts
  - Priority is high/critical
- Escalation notification to IT team chatgroup
- Include full conversation context in escalation

### 3.2 User Interactions

**Flow 1: Ask Question**
```
Employee → "@atlas How do I reset my password?"
AI → [Search KB] → "Here's how to reset your password..."
```

**Flow 2: Create Ticket**
```
Employee → "@atlas My laptop won't turn on"
AI → "I'm sorry to hear that. Let me create a support ticket for you."
AI → [Create Ticket #123] → "Ticket #123 created. An IT technician will contact you."
```

**Flow 3: Escalation**
```
Employee → "@atlas I think there's a security breach"
AI → [Detect critical] → "This sounds like a security issue. Let me escalate to our IT security team."
AI → [Escalate to IT-Security chatgroup] → "Escalated to IT-Security team."
```

### 3.3 Data Model

```prisma
model ITTicket {
  id            String   @id @default(uuid())
  title         String
  description   String   @db.Text
  category      String   // hardware, software, access, network, other
  priority      String   // low, medium, high, critical
  status        String   // new, in_progress, resolved, closed, escalated
  requesterId   String
  assigneeId   String?
  chatgroupId   String
  tenantId      String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  resolvedAt    DateTime?
  
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  requester     User     @relation("TicketRequester", fields: [requesterId], references: [id])
  assignee      User?    @relation("TicketAssignee", fields: [assigneeId], references: [id])
  chatgroup     ChatGroup @relation(fields: [chatgroupId], references: [id])
}

model ITKnowledgeBase {
  id          String   @id @default(uuid())
  title       String
  content     String   @db.Text
  category    String   // hardware, software, network, account, general
  keywords    String[] // for search
  tenantId    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
}
```

### 3.4 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/it-tickets | List tickets (with filters) |
| POST | /api/v1/it-tickets | Create ticket |
| GET | /api/v1/it-tickets/{id} | Get ticket details |
| PUT | /api/v1/it-tickets/{id} | Update ticket |
| POST | /api/v1/it-tickets/{id}/escalate | Escalate ticket |
| GET | /api/v1/it-knowledge-base | List KB articles |
| POST | /api/v1/it-knowledge-base | Create KB article |
| PUT | /api/v1/it-knowledge-base/{id} | Update KB article |

### 3.5 AI Behavior Rules

1. **Greeting**: Always acknowledge the user's problem with empathy
2. **Search First**: Always search KB before creating ticket
3. **Template Responses**: Use consistent response templates
4. **Context Retention**: Remember conversation within session
5. **Handoff**: Clearly indicate when escalating to human
6. **SLA Awareness**: Know and communicate expected resolution times

---

## 4. Non-Functional Requirements

### 4.1 Performance

- KB search: < 200ms response time
- Ticket creation: < 500ms
- AI response generation: < 5s (can be async)

### 4.2 Security

- Ticket access restricted to: requester, assignees, IT admins
- KB articles scoped to tenant
- No sensitive data in AI prompts

### 4.3 Reliability

- AI failures should not block ticket creation
- Fallback to human IT support on AI errors

---

## 5. Acceptance Criteria

| ID | Criteria | Test Scenario |
|----|----------|---------------|
| AC1 | AI responds to IT questions in chat | Send "@robot my VPN isn't working", verify AI responds |
| AC2 | AI creates ticket when issue unresolved | Ask about new issue, verify ticket created |
| AC3 | Ticket appears in IT admin view | Create ticket as user, verify IT admin sees it |
| AC4 | Escalation notifies IT team | Report critical issue, verify escalation message |
| AC5 | KB articles are searchable | Ask question, verify KB content used |
| AC6 | Ticket status updates reflect in UI | Update ticket status, verify UI reflects change |

---

## 6. Dependencies

- **Required**: Chat system (existing)
- **Required**: User/tenant models (existing)
- **Required**: Knowledge base (feature #20)
- **Optional**: Notification system (feature #22)

---

## 7. Out of Scope

- Integration with external ticketing systems (Jira, Zendesk)
- Email-based support
- Phone/IVR support
- SLA automation (manual for now)
- Asset management

---

## 8. Implementation Notes

- Use keyword matching + simple search for KB (can upgrade to embeddings later)
- Ticket assignment can be round-robin or skills-based
- Escalation creates message in IT team's chatgroup
- Consider adding "solved?" poll after resolution
