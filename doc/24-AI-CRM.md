# AI CRM (Customer Relationship Management) Feature Specification

**Feature:** AI CRM  
**Status:** Draft  
**Created:** 2026-02-26

## Overview

The AI CRM feature enables robots to autonomously manage customer relationships, track leads, handle deals, log interactions, and ensure timely follow-ups. As true "employees," robots can act as sales representatives, account managers, or customer success specialists, maintaining comprehensive records of all customer interactions and driving business growth through intelligent relationship management.

## Core Features

### 1. Contact Management
- Store and manage customer/contact information
- Fields: name, email, phone, company, title, address, social profiles
- Contact categorization (lead, prospect, customer, partner, vendor)
- Contact ownership (robot or human agent)
- Contact tagging and custom fields
- Contact activity timeline
- Duplicate detection and merging

### 2. Lead Management
- Lead capture from various sources (web form, email, chat, imported)
- Lead qualification workflow (NEW → CONTACTED → QUALIFIED → CONVERTED → CUSTOMER)
- Lead assignment and distribution
- Lead scoring based on engagement and fit
- Lead nurturing automation
- Automatic lead follow-up reminders

### 3. Deal/Pipeline Management
- Sales pipeline with customizable stages
- Deal creation with value, probability, expected close date
- Deal assignment and ownership
- Deal progression tracking
- Win/loss analysis
- Revenue forecasting
- Deal collaboration (multiple owners)

### 4. Interaction Logging
- Log all customer interactions automatically
- Interaction types: CALL, EMAIL, MEETING, NOTE, TASK
- Automatic transcription and summarization
- Link interactions to contacts and deals
- Sentiment analysis of interactions
- Follow-up task creation

### 5. Task & Follow-up Management
- Automatic task creation from interactions
- Follow-up reminders for contacts and deals
- Task assignment and prioritization
- Recurring tasks for customer success
- Task completion tracking
- Overdue task alerts

### 6. AI-Powered Insights
- Next best action suggestions
- Relationship health scoring
- Churn risk identification
- Upsell/cross-sell opportunities
- Meeting preparation summaries
- Auto-generate follow-up emails

### 7. Activity Dashboard
- Daily/weekly task lists
- Pipeline overview
- Revenue metrics
- Conversion rates
- Activity summaries
- Upcoming follow-ups

## Data Model

### Contact
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| ownerId | UUID? | Foreign key to Robot or User |
| ownerType | Enum | ROBOT, USER |
| firstName | String | First name |
| lastName | String | Last name |
| email | String | Email address |
| phone | String? | Phone number |
| company | String? | Company name |
| title | String? | Job title |
| address | String? | Full address |
| website | String? | Website URL |
| linkedIn | String? | LinkedIn profile |
| twitter | String? | Twitter handle |
| status | Enum | LEAD, PROSPECT, CUSTOMER, PARTNER, VENDOR, INACTIVE |
| source | String? | Lead source |
| score | Integer | Lead score (0-100) |
| tags | String[] | Tags array |
| customFields | Json | Custom field values |
| lastActivityAt | DateTime? | Last interaction time |
| nextFollowUpAt | DateTime? | Next scheduled follow-up |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### Lead
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| contactId | UUID | Foreign key to Contact |
| ownerId | UUID? | Foreign key to Robot or User |
| ownerType | Enum | ROBOT, USER |
| status | Enum | NEW, CONTACTED, QUALIFIED, CONVERTED, LOST, RECYCLED |
| value | Decimal? | Potential deal value |
| probability | Integer | Win probability (0-100) |
| expectedCloseDate | Date? | Expected close date |
| source | String? | Lead source |
| notes | String? | Initial notes |
| convertedAt | DateTime? | Conversion timestamp |
| convertedToDealId | UUID? | Reference to created deal |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### Deal
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| name | String | Deal name |
| contactId | UUID | Foreign key to Contact |
| ownerId | UUID? | Foreign key to Robot or User |
| ownerType | Enum | ROBOT, USER |
| stage | Enum | PROSPECTING, QUALIFICATION, PROPOSAL, NEGOTIATION, CLOSED_WON, CLOSED_LOST |
| value | Decimal | Deal value |
| currency | String | Currency code (USD, EUR, etc.) |
| probability | Integer | Win probability (0-100) |
| expectedCloseDate | Date? | Expected close date |
| actualCloseDate | Date? | Actual close date |
| lostReason | String? | Reason for loss |
| notes | String? | Deal notes |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### Interaction
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| contactId | UUID | Foreign key to Contact |
| dealId | UUID? | Foreign key to Deal |
| ownerId | UUID? | Foreign key to Robot or User |
| ownerType | Enum | ROBOT, USER |
| type | Enum | CALL, EMAIL, MEETING, NOTE, TASK, CHAT |
| subject | String | Interaction subject |
| content | String? | Interaction content/notes |
| sentiment | Enum? | POSITIVE, NEUTRAL, NEGATIVE |
| duration | Integer? | Duration in minutes (for calls/meetings) |
| direction | Enum? | INBOUND, OUTBOUND |
| metadata | Json | Additional metadata |
| createdAt | DateTime | Record creation time |

### Task
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| contactId | UUID? | Foreign key to Contact |
| dealId | UUID? | Foreign key to Deal |
| ownerId | UUID? | Foreign key to Robot or User |
| ownerType | Enum | ROBOT, USER |
| title | String | Task title |
| description | String? | Task description |
| status | Enum | PENDING, IN_PROGRESS, COMPLETED, OVERDUE |
| priority | Enum | LOW, MEDIUM, HIGH, URGENT |
| dueAt | DateTime? | Due date/time |
| completedAt | DateTime? | Completion timestamp |
| recurrence | String? | iCal recurrence rule |
| reminderAt | DateTime? | Reminder time |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

## API Routes

### Contacts
- `GET /api/v1/contacts` - List contacts with filters (status, owner, search)
- `POST /api/v1/contacts` - Create contact
- `GET /api/v1/contacts/{id}` - Get contact details
- `PUT /api/v1/contacts/{id}` - Update contact
- `DELETE /api/v1/contacts/{id}` - Delete contact
- `GET /api/v1/contacts/{id}/interactions` - Get contact interactions
- `GET /api/v1/contacts/{id}/deals` - Get contact's deals
- `POST /api/v1/contacts/{id}/convert-to-lead` - Convert contact to lead

### Leads
- `GET /api/v1/leads` - List leads with filters (status, owner, source)
- `POST /api/v1/leads` - Create lead
- `GET /api/v1/leads/{id}` - Get lead details
- `PUT /api/v1/leads/{id}` - Update lead status/info
- `DELETE /api/v1/leads/{id}` - Delete lead
- `POST /api/v1/leads/{id}/qualify` - Mark lead as qualified
- `POST /api/v1/leads/{id}/convert` - Convert lead to customer + deal

### Deals
- `GET /api/v1/deals` - List deals with filters (stage, owner)
- `POST /api/v1/deals` - Create deal
- `GET /api/v1/deals/{id}` - Get deal details
- `PUT /api/v1/deals/{id}` - Update deal
- `DELETE /api/v1/deals/{id}` - Delete deal
- `POST /api/v1/deals/{id}/move-stage` - Move deal to next stage
- `POST /api/v1/deals/{id}/won` - Mark deal as won
- `POST /api/v1/deals/{id}/lost` - Mark deal as lost

### Interactions
- `GET /api/v1/interactions` - List interactions with filters
- `POST /api/v1/interactions` - Log interaction
- `GET /api/v1/interactions/{id}` - Get interaction details
- `PUT /api/v1/interactions/{id}` - Update interaction
- `DELETE /api/v1/interactions/{id}` - Delete interaction

### Tasks
- `GET /api/v1/tasks` - List tasks with filters (status, owner, due)
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks/{id}` - Get task details
- `PUT /api/v1/tasks/{id}` - Update task
- `DELETE /api/v1/tasks/{id}` - Delete task
- `POST /api/v1/tasks/{id}/complete` - Mark task complete
- `GET /api/v1/tasks/due` - Get tasks due soon

### Robot CRM Operations
- `GET /api/v1/robots/{id}/crm-dashboard` - Get robot's CRM dashboard
- `GET /api/v1/robots/{id}/upcoming-followups` - Get upcoming follow-ups
- `GET /api/v1/robots/{id}/pipeline` - Get pipeline overview
- `POST /api/v1/robots/{id}/crm-insights` - Get AI insights

### Search & Analytics
- `GET /api/v1/crm/search` - Global CRM search
- `GET /api/v1/crm/analytics` - CRM analytics (pipeline value, conversion rates)

## MCP Tools (for Robot)

- `crm_list_contacts` - List contacts with filters
- `crm_get_contact` - Get contact details
- `crm_create_contact` - Create new contact
- `crm_update_contact` - Update contact info
- `crm_log_interaction` - Log customer interaction
- `crm_create_task` - Create follow-up task
- `crm_list_deals` - List deals in pipeline
- `crm_create_deal` - Create new deal
- `crm_update_deal_stage` - Move deal through pipeline
- `crm_get_dashboard` - Get CRM dashboard stats
- `crm_get_next_actions` - Get AI-suggested next actions

## E2E Tests

- Agent-browser tests for contact creation and management
- Lead conversion workflow
- Deal pipeline management
- Interaction logging
- Task creation and completion
- Dashboard and analytics

## Implementation Notes

- All timestamps stored in UTC
- Currency values stored as DECIMAL(12,2)
- Lead score calculated from engagement + demographic fit
- AI insights use tenant's LLM config
- Activity logging integrates with meeting and email features
- Tasks can be recurring (daily, weekly, monthly follow-ups)
- Pipeline stages customizable per tenant
