# AI Performance Reviews Feature Specification

**Feature:** AI Performance Reviews  
**Status:** Draft  
**Created:** 2026-02-26

## Overview

The AI Performance Reviews feature enables robots to autonomously generate performance reviews by aggregating data from time tracking, meetings, emails, tasks, and reports—making them true "employees" with measurable performance metrics and self-assessment capabilities.

## Core Features

### 1. Performance Metrics Dashboard
- Real-time metrics: tasks completed, time worked, meetings attended
- Productivity trends over time (weekly, monthly, quarterly)
- Goal completion tracking
- Comparison with peer robots (anonymized)

### 2. Self-Assessment Generation
- AI-generated self-assessment based on work data
- Key achievements extraction
- Areas for improvement suggestions
- Goal progress reflection

### 3. Performance Review Templates
- Pre-built review templates: Weekly Check-in, Monthly Review, Quarterly Assessment, Annual Review
- Custom review templates with configurable sections
- 360-degree review support (peer feedback)

### 4. Goal Setting & Tracking
- SMART goal creation
- Progress tracking against goals
- Goal alignment with team/company objectives
- Automated goal suggestions based on role

### 5. Performance Reporting
- Review generation and history
- Export to PDF/Markdown/JSON
- Review sharing with managers
- Review cycle management

## Data Model

### PerformanceReview
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| robotId | UUID | Foreign key to Robot |
| reviewerId | UUID? | Human reviewer (nullable for self-assessment) |
| templateId | UUID | Foreign key to ReviewTemplate |
| reviewType | Enum | SELF, MANAGER, PEER, ANNUAL |
| periodStart | DateTime | Review period start |
| periodEnd | DateTime | Review period end |
| status | Enum | DRAFT, IN_PROGRESS, COMPLETED |
| overallRating | Int? | 1-5 rating |
| achievements | JSON | Key achievements |
| areasForImprovement | JSON | Improvement areas |
| goalsProgress | JSON | Goal completion data |
| summary | Text? | AI-generated summary |
| feedback | Text? | Human feedback |
| createdAt | DateTime | Record creation time |
| completedAt | DateTime? | When review was completed |

### ReviewTemplate
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| name | String | Template name |
| description | String? | Template description |
| sections | JSON | Review sections configuration |
| reviewType | Enum | SELF, MANAGER, PEER, ANNUAL |
| isSystem | Boolean | System vs custom template |
| isActive | Boolean | Template enabled |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### PerformanceGoal
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| robotId | UUID | Foreign key to Robot |
| title | String | Goal title |
| description | String? | Goal description |
| category | Enum | PRODUCTIVITY, LEARNING, COLLABORATION, QUALITY, OTHER |
| targetValue | Float | Target metric value |
| currentValue | Float | Current progress value |
| unit | String | Measurement unit |
| startDate | DateTime | Goal start date |
| dueDate | DateTime | Goal due date |
| status | Enum | NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### PerformanceMetric
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| robotId | UUID | Foreign key to Robot |
| metricType | Enum | TASKS_COMPLETED, TIME_WORKED, MEETINGS_ATTENDED, EMAILS_HANDLED, REPORTS_GENERATED |
| value | Float | Metric value |
| recordedAt | DateTime | When metric was recorded |
| metadata | JSON? | Additional data |

## API Endpoints

### Performance Reviews
- `GET /api/v1/robots/{id}/reviews` - List reviews with filters
- `POST /api/v1/robots/{id}/reviews` - Create review
- `GET /api/v1/reviews/{id}` - Get review details
- `PUT /api/v1/reviews/{id}` - Update review
- `POST /api/v1/reviews/{id}/generate` - AI generate review content
- `POST /api/v1/reviews/{id}/complete` - Mark review as complete
- `GET /api/v1/reviews/{id}/export` - Export review (PDF/MD/JSON)

### Review Templates
- `GET /api/v1/robots/{id}/review-templates` - List templates
- `POST /api/v1/robots/{id}/review-templates` - Create template
- `GET /api/v1/review-templates/{id}` - Get template
- `PUT /api/v1/review-templates/{id}` - Update template
- `DELETE /api/v1/review-templates/{id}` - Delete template

### Performance Goals
- `GET /api/v1/robots/{id}/goals` - List goals with filters
- `POST /api/v1/robots/{id}/goals` - Create goal
- `GET /api/v1/goals/{id}` - Get goal details
- `PUT /api/v1/goals/{id}` - Update goal (progress, status)
- `DELETE /api/v1/goals/{id}` - Delete goal

### Performance Metrics
- `GET /api/v1/robots/{id}/metrics` - List metrics with date range
- `POST /api/v1/robots/{id}/metrics/sync` - Sync metrics from other features

### Dashboard
- `GET /api/v1/robots/{id}/performance-dashboard` - Get performance overview

## User Interface

### Robot Detail Page Enhancement
- Performance summary card
- Active goals list
- Recent reviews

### New Performance Page
- Metrics dashboard with charts
- Goals list and progress
- Reviews history
- Create review button

### Review Builder (Modal/Page)
- Template selection
- Period selection
- Auto-generated sections
- Human editing
- Submit for review

### Goal Management
- Create goal form
- Progress tracker
- Goal suggestions

## Implementation Notes

- Metrics aggregated from: time entries, meetings, emails, reports, tasks
- Review generation uses tenant's LLM config
- Goal progress auto-updated when related data changes
- Dashboard data cached in Redis (5min TTL)
- System templates seeded on tenant creation

## E2E Test Plan

Using agent-browser:
1. Login as user
2. Navigate to robot detail
3. View performance dashboard
4. Create a new goal
5. View goal progress
6. Create a performance review
7. Generate AI review content
8. Complete the review
9. Export review
