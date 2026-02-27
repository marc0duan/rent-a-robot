# AI Report Generation Feature Specification

**Feature:** AI Report Generation  
**Status:** Draft  
**Created:** 2026-02-26

## Overview

The AI Report Generation feature enables robots to autonomously generate business reports by aggregating data from time tracking, meetings, emails, and tasks—making them true "employees" who can produce actionable insights and regular updates.

## Core Features

### 1. Report Templates
- Pre-built report templates: Daily Summary, Weekly Update, Monthly Report, Project Status
- Custom report templates with configurable sections
- Template versioning and sharing within tenant

### 2. Data Sources Integration
- Time tracking data (from AI Time Tracking feature)
- Meeting data (from AI Meeting Assistant feature)
- Email statistics (from AI Email Handling feature)
- Task/completion data from chatgroup @mentions

### 3. AI-Powered Report Generation
- Natural language report generation from raw data
- Key insights extraction
- Trend analysis (comparing to previous periods)
- Customizable tone and detail level

### 4. Report Scheduling
- Schedule reports to run daily, weekly, monthly
- Configure report delivery (chatgroup, email, workspace)
- Manual report generation on-demand

### 5. Report Dashboard
- View generated reports history
- Filter by date range, robot, report type
- Export to PDF/Markdown/JSON
- Report comparison view

## Data Model

### ReportTemplate
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| robotId | UUID? | Creator robot (nullable for system templates) |
| name | String | Template name |
| description | String? | Template description |
| sections | JSON | Report sections configuration |
| isSystem | Boolean | System vs custom template |
| isActive | Boolean | Template enabled |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### Report
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| robotId | UUID | Foreign key to Robot |
| templateId | UUID | Foreign key to ReportTemplate |
| title | String | Report title |
| periodStart | DateTime | Report period start |
| periodEnd | DateTime | Report period end |
| content | JSON | Generated report content |
| summary | Text? | AI-generated summary |
| status | Enum | DRAFT, GENERATING, COMPLETED, FAILED |
| sharedToChatgroupId | UUID? | Where report was shared |
| generatedAt | DateTime | When report was generated |
| createdAt | DateTime | Record creation time |

### ReportSchedule
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| robotId | UUID | Foreign key to Robot |
| templateId | UUID | Foreign key to ReportTemplate |
| cronExpression | String | Cron schedule |
| timezone | String | Timezone for scheduling |
| deliveryType | Enum | CHATGROUP, EMAIL, WORKSPACE |
| deliveryTarget | JSON | Delivery configuration |
| isActive | Boolean | Schedule enabled |
| lastRunAt | DateTime? | Last scheduled run |
| nextRunAt | DateTime? | Next scheduled run |
| createdAt | DateTime | Record creation time |

## API Endpoints

### Report Templates
- `GET /api/v1/robots/{id}/report-templates` - List templates
- `POST /api/v1/robots/{id}/report-templates` - Create template
- `GET /api/v1/report-templates/{id}` - Get template
- `PUT /api/v1/report-templates/{id}` - Update template
- `DELETE /api/v1/report-templates/{id}` - Delete template

### Reports
- `GET /api/v1/robots/{id}/reports` - List reports with filters
- `POST /api/v1/robots/{id}/reports` - Generate report
- `GET /api/v1/reports/{id}` - Get report details
- `GET /api/v1/reports/{id}/export` - Export report (PDF/MD/JSON)
- `POST /api/v1/reports/{id}/share` - Share to chatgroup

### Report Schedules
- `GET /api/v1/robots/{id}/report-schedules` - List schedules
- `POST /api/v1/robots/{id}/report-schedules` - Create schedule
- `PUT /api/v1/report-schedules/{id}` - Update schedule
- `DELETE /api/v1/report-schedules/{id}` - Delete schedule
- `POST /api/v1/report-schedules/{id}/run` - Run immediately

## User Interface

### Robot Detail Page Enhancement
- Report templates panel
- Recent reports list
- Schedule management

### New Reports Page
- Report history with filters
- Report detail view
- Export options

### Report Builder (Modal/Page)
- Template selection
- Date range picker
- Section configuration
- Preview before生成

### Schedule Management
- Cron expression builder (simple UI)
- Delivery configuration
- Active/inactive toggle

## Implementation Notes

- Report generation runs as background job
- Data aggregation from multiple sources via existing feature APIs
- PDF export using puppeteer or similar
- Report storage in workspace
- Scheduling via cron job with delivery

## E2E Test Plan

Using agent-browser:
1. Login as user to robot detail

2. Navigate3. View report templates
4. Generate a new report
5. View generated report
6. Export report (if UI available)
7. Create report schedule
