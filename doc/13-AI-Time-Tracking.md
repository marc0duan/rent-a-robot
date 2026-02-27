# AI Time Tracking Feature Specification

**Feature:** Robot Time Tracking & Timesheets  
**Status:** Draft  
**Created:** 2026-02-25

## Overview

The AI Time Tracking feature enables robots to autonomously track time spent on tasks assigned via @mentions in chat. Robots log their work sessions, categorize activities, and generate timesheet reports—making them true "employees" with measurable productivity.

## Core Features

### 1. Automatic Time Logging
- Robot starts a timer when @mentioned with a task
- Timer stops when task is completed or new task assigned
- Activity is categorized (coding, research, communication, admin)
- Manual time entry option available

### 2. Timesheet Dashboard
- View daily/weekly timesheets per robot
- Filter by date range, team, robot
- Export timesheet data (CSV/JSON)

### 3. Work Summary Generation
- Auto-generate daily work summaries from time logs
- Include task details, time spent, activity breakdown
- Shareable with team members

## Data Model

### TimeEntry
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| robotId | UUID | Foreign key to Robot |
| chatGroupId | UUID | Where task was assigned |
| taskDescription | String | Brief task description |
| startTime | DateTime | When timer started |
| endTime | DateTime? | When timer stopped |
| duration | Int | Duration in seconds |
| category | Enum | WORK, RESEARCH, MEETING, ADMIN, IDLE |
| createdAt | DateTime | Record creation time |

### DailySummary
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| robotId | UUID | Foreign key to Robot |
| date | Date | Summary date |
| totalWorkSeconds | Int | Total productive time |
| totalIdleSeconds | Int | Total idle time |
| taskCount | Int | Number of tasks completed |
| summaryText | String? | AI-generated summary |
| createdAt | DateTime | Record creation time |

## API Endpoints

### Time Entries
- `GET /api/v1/robots/{id}/time-entries` - List entries with filters
- `POST /api/v1/robots/{id}/time-entries` - Create manual entry
- `PUT /api/v1/time-entries/{id}` - Update entry (start/stop timer)
- `DELETE /api/v1/time-entries/{id}` - Delete entry

### Daily Summaries
- `GET /api/v1/robots/{id}/summaries` - List summaries
- `POST /api/v1/robots/{id}/summaries/generate` - Generate day's summary

### Timer Control (for robot)
- `POST /api/v1/robots/{id}/timer/start` - Start timer
- `POST /api/v1/robots/{id}/timer/stop` - Stop timer

## User Interface

### Robot Detail Page Enhancement
- Timer display (running/stopped)
- Today's time summary
- Quick access to timesheet

### New Timesheet Page
- Calendar view of tracked time
- Breakdown by category (pie chart)
- Task list with durations
- Export buttons

## Implementation Notes

- Timer state stored in Redis for real-time updates
- Robot auto-starts timer on @mention detection (handled in message processing)
- Daily summary generated at end of each day or on-demand
- Integration with existing workspace for report storage
