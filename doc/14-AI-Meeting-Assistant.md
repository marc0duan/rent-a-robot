# AI Meeting Assistant Feature Specification

**Feature:** AI Meeting Assistant  
**Status:** Draft  
**Created:** 2026-02-26

## Overview

The AI Meeting Assistant enables robots to autonomously attend meetings, take notes, generate summaries, and track action items—making them true "employees" who can participate in collaborative work.

## Core Features

### 1. Calendar Integration
- Robots sync with team calendars (Google Calendar, Outlook, CalDAV)
- Detect scheduled meetings where robot is invited or mentioned
- Auto-join meetings at scheduled time
- Track meeting changes/cancellations

### 2. Meeting Attendance
- Robot joins meetings as virtual participant
- Listens to meeting audio (via calendar API integration)
- Tracks meeting duration and participants
- Maintains attendance records

### 3. Meeting Notes
- Real-time note-taking during meetings
- Speaker identification when possible
- Topic/decision tracking
- Store notes in workspace for team access

### 4. Meeting Summaries
- Auto-generate meeting summaries after each meeting
- Include: attendees, topics discussed, decisions made, key points
- Share summaries to team chatgroup
- Store in workspace for future reference

### 5. Action Item Tracking
- Extract action items from meeting discussions
- Assign action items to team members
- Track completion status
- Send reminders for pending action items

## Data Model

### CalendarConnection
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| robotId | UUID | Foreign key to Robot |
| provider | Enum | GOOGLE, OUTLOOK, CALDAV |
| accessToken | String | Encrypted OAuth token |
| refreshToken | String | Encrypted OAuth token |
| calendarId | String | External calendar ID |
| syncStatus | Enum | PENDING, ACTIVE, ERROR |
| lastSyncAt | DateTime? | Last successful sync |
| createdAt | DateTime | Record creation time |

### Meeting
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| robotId | UUID | Foreign key to Robot |
| externalMeetingId | String | ID from calendar provider |
| title | String | Meeting title |
| description | String? | Meeting description |
| startTime | DateTime | Scheduled start |
| endTime | DateTime | Scheduled end |
| joinUrl | String? | Virtual meeting link |
| participants | JSON | List of attendee info |
| status | Enum | SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED |
| createdAt | DateTime | Record creation time |

### MeetingNote
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| meetingId | UUID | Foreign key to Meeting |
| content | Text | Note content |
| createdAt | DateTime | Record creation time |

### MeetingSummary
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| meetingId | UUID | Foreign key to Meeting |
| robotId | UUID | Foreign key to Robot |
| summaryText | Text | AI-generated summary |
| decisions | JSON | Key decisions made |
| actionItems | JSON | Extracted action items |
| sharedToChatgroupId | UUID? | Where summary was shared |
| createdAt | DateTime | Record creation time |

### ActionItem
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| meetingId | UUID | Foreign key to Meeting |
| summaryId | UUID | Foreign key to MeetingSummary |
| description | String | What needs to be done |
| assigneeId | UUID? | User responsible (from tenant) |
| dueDate | DateTime? | When it's due |
| status | Enum | PENDING, IN_PROGRESS, COMPLETED |
| completedAt | DateTime? | When completed |
| createdAt | DateTime | Record creation time |

## API Endpoints

### Calendar Connections
- `GET /api/v1/robots/{id}/calendars` - List calendar connections
- `POST /api/v1/robots/{id}/calendars` - Connect a calendar (OAuth flow)
- `DELETE /api/v1/robots/{id}/calendars/{connectionId}` - Disconnect calendar

### Meetings
- `GET /api/v1/robots/{id}/meetings` - List meetings with filters (date range, status)
- `GET /api/v1/meetings/{id}` - Get meeting details
- `POST /api/v1/meetings/{id}/join` - Robot joins meeting
- `POST /api/v1/meetings/{id}/leave` - Robot leaves meeting

### Meeting Notes
- `GET /api/v1/meetings/{id}/notes` - Get meeting notes
- `POST /api/v1/meetings/{id}/notes` - Add note (manual or from robot)
- `PUT /api/v1/meetings/notes/{id}` - Update note

### Meeting Summaries
- `GET /api/v1/meetings/{id}/summary` - Get generated summary
- `POST /api/v1/meetings/{id}/summary/generate` - Generate AI summary
- `POST /api/v1/meetings/{id}/summary/share` - Share to chatgroup

### Action Items
- `GET /api/v1/robots/{id}/action-items` - List action items
- `PUT /api/v1/action-items/{id}` - Update status
- `DELETE /api/v1/action-items/{id}` - Delete action item

## User Interface

### Robot Detail Page Enhancement
- Calendar connections panel
- Upcoming meetings list
- Today's meetings summary

### New Meetings Page
- Calendar view of scheduled meetings
- Meeting list with filters
- Quick join button

### Meeting Detail View
- Meeting info (title, time, participants)
- Notes section (editable)
- AI-generated summary
- Action items list with status

### Settings: Calendar Connections
- Connect/disconnect calendars
- Sync status indicators
- OAuth flow for Google/Outlook

## Implementation Notes

- Calendar sync runs as background job (cron)
- OAuth tokens stored encrypted via crypto.ts
- Meeting notes stored in workspace (like other files)
- Summary generation uses tenant's LLM config
- Action item reminders via cron job

## E2E Test Plan

Using agent-browser:
1. Login as user
2. Navigate to robot detail
3. Connect calendar (OAuth mock)
4. View upcoming meetings
5. Generate meeting summary
6. View and update action items
