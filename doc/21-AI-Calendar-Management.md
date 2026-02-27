# AI Calendar Management Feature Specification

**Feature:** AI Calendar Management  
**Status:** Draft  
**Created:** 2026-02-26

## Overview

The AI Calendar Management feature enables robots to autonomously manage their calendars, schedule meetings, handle invitations, and coordinate availability with team members. As true "employees," robots can create, update, and respond to calendar events, coordinate meeting times across participants' availability, and maintain their schedules without human intervention.

## Core Features

### 1. Calendar Management
- Personal calendar per robot
- Multiple calendars support (work, personal, team)
- Calendar sharing and visibility settings
- Timezone support for global teams

### 2. Event Management
- Create/update/delete events
- Event details: title, description, location, attendees, duration
- Recurring events (daily, weekly, monthly, custom)
- Event reminders (minutes before)
- Color coding and categorization

### 3. Meeting Scheduling
- AI-powered meeting time suggestions based on attendee availability
- Find common free slots across multiple attendees
- Automatic meeting conflict detection
- Buffer time between meetings
- Meeting room/resource booking

### 4. Smart Invitation Handling
- Parse meeting invitations from emails/chat
- Auto-accept/decline/suggest alternatives based on:
  - Existing calendar conflicts
  - Meeting priority and importance
  - Attendee preferences
- Send polite decline messages with alternative suggestions
- RSVP tracking and reminders

### 5. Calendar Sync
- Two-way sync with external calendars (future)
- Import events from email threads
- Export calendar to iCal format

### 6. Availability Management
- Set working hours and available times
- Block time for focused work
- Public availability sharing (for scheduling)
- Out-of-office management

### 7. AI Scheduling Assistant
- Natural language scheduling ("Schedule a 1h meeting with John tomorrow")
- Proactive meeting suggestions based on team activity
- Meeting preparation (agenda gathering)
- Follow-up scheduling

## Data Model

### Calendar
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| ownerId | UUID | Foreign key to Robot or User |
| ownerType | Enum | ROBOT, USER |
| name | String | Calendar name |
| description | String? | Description |
| color | String | Hex color code |
| isDefault | Boolean | Default calendar flag |
| visibility | Enum | PRIVATE, TEAM, PUBLIC |
| timeZone | String | IANA timezone |
| workingHoursStart | Time | Working hours start |
| workingHoursEnd | Time | Working hours end |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### CalendarEvent
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| calendarId | UUID | Foreign key to Calendar |
| title | String | Event title |
| description | Text? | Event description |
| location | String? | Event location |
| startTime | DateTime | Event start (UTC) |
| endTime | DateTime | Event end (UTC) |
| allDay | Boolean | All-day event flag |
| isRecurring | Boolean | Recurring event flag |
| recurrenceRule | String? | iCal recurrence rule |
| recurrenceEndDate | DateTime? | Recurrence end date |
| status | Enum | CONFIRMED, TENTATIVE, CANCELLED |
| visibility | Enum | PRIVATE, DEFAULT, PUBLIC |
| meetingLink | String? | Video meeting link |
| createdById | UUID | Creator ID |
| createdByType | Enum | ROBOT, USER |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### EventAttendee
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| eventId | UUID | Foreign key to CalendarEvent |
| attendeeId | UUID | Attendee ID (Robot or User) |
| attendeeType | Enum | ROBOT, USER |
| responseStatus | Enum | NEEDS_ACTION, ACCEPTED, DECLINED, TENTATIVE |
| isOrganizer | Boolean | Organizer flag |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### EventReminder
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| eventId | UUID | Foreign key to CalendarEvent |
| minutesBefore | Integer | Minutes before event |
| method | Enum | EMAIL, POPUP |
| createdAt | DateTime | Record creation time |

### AvailabilityBlock
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| calendarId | UUID | Foreign key to Calendar |
| title | String | Block title (e.g., "Focus time") |
| startTime | DateTime | Block start |
| endTime | DateTime | Block end |
| isRecurring | Boolean | Recurring block |
| recurrenceRule | String? | iCal recurrence rule |
| createdAt | DateTime | Record creation time |

### OutOfOffice
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| calendarId | UUID | Foreign key to Calendar |
| title | String | OOO title |
| startDate | DateTime | OOO start |
| endDate | DateTime | OOO end |
| message | Text? | Auto-reply message |
| isActive | Boolean | Active flag |
| createdAt | DateTime | Record creation time |

## API Endpoints

### Calendars
- `GET /api/v1/calendars` - List calendars
- `POST /api/v1/calendars` - Create calendar
- `GET /api/v1/calendars/{id}` - Get calendar
- `PUT /api/v1/calendars/{id}` - Update calendar
- `DELETE /api/v1/calendars/{id}` - Delete calendar

### Events
- `GET /api/v1/calendars/{id}/events` - List events with date range
- `POST /api/v1/calendars/{id}/events` - Create event
- `GET /api/v1/events/{id}` - Get event
- `PUT /api/v1/events/{id}` - Update event
- `DELETE /api/v1/events/{id}` - Delete event
- `POST /api/v1/events/{id}/rsvp` - Respond to invitation

### Attendees
- `GET /api/v1/events/{id}/attendees` - List attendees
- `POST /api/v1/events/{id}/attendees` - Add attendee
- `DELETE /api/v1/events/{id}/attendees/{attendeeId}` - Remove attendee

### Reminders
- `GET /api/v1/events/{id}/reminders` - List reminders
- `POST /api/v1/events/{id}/reminders` - Add reminder
- `DELETE /api/v1/reminders/{id}` - Delete reminder

### Availability
- `GET /api/v1/calendars/{id}/availability` - Get availability for date range
- `POST /api/v1/calendars/{id}/availability-blocks` - Create availability block
- `DELETE /api/v1/availability-blocks/{id}` - Delete availability block
- `POST /api/v1/calendars/{id}/out-of-office` - Set OOO
- `DELETE /api/v1/out-of-office/{id}` - Delete OOO

### Scheduling AI
- `POST /api/v1/calendars/suggest-time` - Suggest meeting times
- `POST /api/v1/calendars/find-common-slots` - Find common availability
- `POST /api/v1/events/{id}/auto-respond` - Auto-respond to invitation

### Robot Calendar
- `GET /api/v1/robots/{id}/calendar` - Get robot's calendar
- `GET /api/v1/robots/{id}/schedule` - Get robot's schedule
- `GET /api/v1/robots/{id}/upcoming-events` - Get upcoming events

## User Interface

### Calendar Dashboard
- Monthly/weekly/daily view toggle
- Today's schedule summary
- Upcoming events widget
- Quick event creation

### Calendar List
- All calendars with color coding
- Sync status indicators
- Share settings

### Event Detail/Editor
- Full event form
- Attendee picker with availability indicator
- Recurrence editor
- Location/map integration
- Video meeting integration

### Scheduling Assistant
- Natural language input
- Attendee selection with availability
- Time slot suggestions
- Conflict resolution

### Calendar Settings
- Working hours configuration
- Notification preferences
- Timezone settings
- Calendar sharing

### Robot Schedule View
- Robot's calendar overview
- Availability status
- Meeting load statistics

## Implementation Notes

- All timestamps stored in UTC, converted to user's timezone for display
- Recurrence uses iCal RRule format
- Calendar access controlled by tenant isolation
- Events indexed for efficient date range queries
- Webhook support for externalfuture)

## E calendar sync (2E Test Plan

Using agent-browser:
1. Login as user
2. Navigate to robot detail
3. View robot's calendar
4. Create a new calendar
5. Create an event with attendees
6. Add recurrence to event
7. Set event reminders
8. RSVP to an event
9. Check availability
10. Create availability block
11. Set out-of-office
12. Use AI scheduling assistant
13. View upcoming events
14. Edit and delete events
