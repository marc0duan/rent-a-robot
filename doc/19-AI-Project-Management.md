# AI Project Management Feature Specification

**Feature:** AI Project Management  
**Status:** Draft  
**Created:** 2026-02-26

## Overview

The AI Project Management feature enables robots to autonomously manage projects, track tasks, and coordinate work—making them true "employees" who can own projects, manage deadlines, and report progress. The AI can create project plans, track task completion, generate status reports, and flag blockers.

## Core Features

### 1. Project Management
- Create and manage projects with goals, timelines, and milestones
- Project status tracking: PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED
- Project priority levels: LOW, MEDIUM, HIGH, CRITICAL
- Team assignment to projects
- Project templates for common project types

### 2. Task Management
- Create tasks with title, description, due dates, priority
- Task statuses: TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED, CANCELLED
- Task assignment (humans or robots)
- Task dependencies (blocking/blocked by)
- Subtasks support
- Task comments and updates
- Recurring tasks

### 3. Milestone Tracking
- Define project milestones with target dates
- Milestone completion percentage based on tasks
- Milestone status: PENDING, IN_PROGRESS, COMPLETED, OVERDUE
- Milestone notifications

### 4. AI-Powered Features
- Auto-generate project plans from goals
- Suggest task breakdown from high-level objectives
- Identify blockers and dependencies
- Generate weekly/monthly status reports
- Predict project delays based on progress
- Smart deadline suggestions

### 5. Status Reporting
- Automated status updates
- Project health indicators
- Progress percentage tracking
- Burndown/burnup charts data
- Export reports to PDF/CSV

### 6. Notifications & Reminders
- Task due date reminders
- Milestone approaching alerts
- Blocker notifications
- Status update reminders

## Data Model

### Project
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| name | String | Project name |
| description | String? | Project description |
| status | Enum | PLANNING, ACTIVE, ON_HOLD, COMPLETED, CANCELLED |
| priority | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| startDate | DateTime? | Project start date |
| endDate | DateTime? | Project target end date |
| ownerId | UUID | Foreign key to Robot (project owner) |
| teamId | UUID? | Foreign key to Team |
| progress | Integer | Progress percentage (0-100) |
| settings | JSON | Project-specific settings |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### Task
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| projectId | UUID | Foreign key to Project |
| parentTaskId | UUID? | Foreign key to parent Task (subtasks) |
| title | String | Task title |
| description | String? | Task description |
| status | Enum | TODO, IN_PROGRESS, IN_REVIEW, DONE, BLOCKED, CANCELLED |
| priority | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| assigneeId | UUID? | Foreign key to Robot or User |
| assigneeType | Enum | ROBOT, USER |
| dueDate | DateTime? | Task due date |
| estimatedHours | Decimal? | Estimated hours |
| actualHours | Decimal? | Actual hours spent |
| order | Integer | Sort order within project |
| tags | String[] | Task tags |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### TaskDependency
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| blockingTaskId | UUID | Foreign key to Task (the blocker) |
| blockedTaskId | UUID | Foreign key to Task (the blocked) |
| createdAt | DateTime | Record creation time |

### TaskComment
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| taskId | UUID | Foreign key to Task |
| authorId | UUID | Foreign key to Robot or User |
| authorType | Enum | ROBOT, USER |
| content | String | Comment content |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### Milestone
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| projectId | UUID | Foreign key to Project |
| title | String | Milestone title |
| description | String? | Milestone description |
| targetDate | DateTime | Target completion date |
| status | Enum | PENDING, IN_PROGRESS, COMPLETED, OVERDUE |
| order | Integer | Sort order |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### ProjectTemplate
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| name | String | Template name |
| description | String? | Template description |
| tasks | JSON | Default task structure |
| milestones | JSON | Default milestones |
| isDefault | Boolean | Default template flag |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

## API Endpoints

### Projects
- `GET /api/v1/robots/{id}/projects` - List projects with filters
- `POST /api/v1/robots/{id}/projects` - Create project
- `GET /api/v1/projects/{id}` - Get project details
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project
- `POST /api/v1/projects/{id}/generate-plan` - AI generate project plan

### Tasks
- `GET /api/v1/projects/{id}/tasks` - List tasks in project
- `POST /api/v1/projects/{id}/tasks` - Create task
- `GET /api/v1/tasks/{id}` - Get task details
- `PUT /api/v1/tasks/{id}` - Update task
- `DELETE /api/v1/tasks/{id}` - Delete task
- `POST /api/v1/tasks/{id}/comments` - Add comment
- `GET /api/v1/tasks/{id}/comments` - Get task comments
- `POST /api/v1/tasks/{id}/subtasks` - Create subtask
- `POST /api/v1/tasks/{id}/dependencies` - Add dependency

### Task Dependencies
- `GET /api/v1/tasks/{id}/dependencies` - Get task dependencies
- `DELETE /api/v1/tasks/{id}/dependencies/{depId}` - Remove dependency

### Milestones
- `GET /api/v1/projects/{id}/milestones` - List milestones
- `POST /api/v1/projects/{id}/milestones` - Create milestone
- `GET /api/v1/milestones/{id}` - Get milestone
- `PUT /api/v1/milestones/{id}` - Update milestone
- `DELETE /api/v1/milestones/{id}` - Delete milestone

### Project Templates
- `GET /api/v1/tenants/{id}/project-templates` - List templates
- `POST /api/v1/tenants/{id}/project-templates` - Create template
- `GET /api/v1/project-templates/{id}` - Get template
- `PUT /api/v1/project-templates/{id}` - Update template
- `DELETE /api/v1/project-templates/{id}` - Delete template
- `POST /api/v1/project-templates/{id}/apply` - Apply template to project

### Dashboard & Reports
- `GET /api/v1/robots/{id}/project-dashboard` - Get project overview
- `GET /api/v1/projects/{id}/progress` - Get progress report
- `GET /api/v1/projects/{id}/report` - Generate status report
- `GET /api/v1/projects/{id}/export` - Export project data

### My Tasks (for robots)
- `GET /api/v1/robots/{id}/my-tasks` - Get robot's assigned tasks
- `PUT /api/v1/tasks/{id}/status` - Quick status update
- `GET /api/v1/robots/{id}/overdue-tasks` - Get overdue tasks
- `GET /api/v1/robots/{id}/upcoming-tasks` - Get upcoming due tasks

## User Interface

### Robot Detail Page Enhancement
- Project summary card
- Active tasks count
- Upcoming deadlines

### New Projects Page
- Project list with status filters
- Project cards with progress bars
- Quick create project
- Project detail view

### Task Board View
- Kanban board with status columns
- Drag and drop task movement
- Filter by assignee, priority, due date
- Bulk actions

### Task List View
- Table view with sorting
- Filter and search
- Quick edit inline

### Task Detail Modal
- Full task information
- Comments thread
- Activity log
- Subtasks checklist
- Dependencies visualization

### Project Timeline
- Gantt-style timeline
- Milestone markers
- Dependency arrows
- Progress overlay

### Dashboard
- My tasks widget
- Overdue tasks alerts
- Upcoming deadlines
- Project health overview

## Implementation Notes

- Task order stored as integer for drag-drop reordering
- Project progress auto-calculated from task completion
- Task dependencies validated to prevent circular dependencies
- AI project plan generation uses tenant's LLM config
- Comments support markdown formatting
- All timestamps stored in UTC

## E2E Test Plan

Using agent-browser:
1. Login as user
2. Navigate to robot detail
3. View project dashboard
4. Create a new project
5. Add tasks to project
6. Create subtasks
7. Set task dependencies
8. Add milestones
9. Update task status
10. View project progress
11. Generate AI project plan
12. Export project report
