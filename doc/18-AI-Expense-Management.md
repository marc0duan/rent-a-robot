# AI Expense Management Feature Specification

**Feature:** AI Expense Management  
**Status:** Draft  
**Created:** 2026-02-26

## Overview

The AI Expense Management feature enables robots to autonomously track, categorize, and manage business expenses—making them true "employees" who can submit expense reports, track receipts, and manage reimbursements. The AI can scan receipts, categorize expenses automatically, and generate expense reports for human approval.

## Core Features

### 1. Expense Tracking
- Manual expense entry with amount, date, description, category
- Receipt photo/upload attachment
- Multi-currency support with conversion
- Expense tagging and labeling
- Project/task association for billing

### 2. Receipt Processing
- Receipt image upload and storage
- OCR text extraction (simulated for MVP)
- Auto-extract: vendor, amount, date, category
- Receipt matching with expenses

### 3. Smart Categorization
- AI-powered category suggestion based on description
- Categories: Travel, Meals, Office Supplies, Software, Equipment, Communication, Transportation, Accommodation, Entertainment, Other
- Custom category creation per tenant
- Category-based reporting

### 4. Expense Policies
- Per-category spending limits
- Requires receipt threshold (e.g., over $50)
- Approval workflow rules
- Policy violation warnings

### 5. Expense Reports
- Group expenses into reports
- Report statuses: DRAFT, SUBMITTED, APPROVED, REJECTED, REIMBURSED
- AI-generated report summaries
- Export to CSV/PDF

### 6. Approval Workflow
- Submit expense reports for approval
- Manager approval/rejection with comments
- Request revisions
- Track reimbursement status

## Data Model

### ExpenseCategory
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| name | String | Category name |
| description | String? | Category description |
| icon | String? | Icon identifier |
| maxAmount | Decimal? | Spending limit |
| requiresReceipt | Boolean | Receipt required flag |
| isActive | Boolean | Category enabled |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### Expense
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| robotId | UUID | Foreign key to Robot |
| categoryId | UUID | Foreign key to ExpenseCategory |
| reportId | UUID? | Foreign key to ExpenseReport (nullable) |
| vendor | String? | Vendor/merchant name |
| amount | Decimal | Expense amount |
| currency | String | Currency code (USD, CNY, etc.) |
| amountInBaseCurrency | Decimal | Amount in tenant's base currency |
| exchangeRate | Decimal | Exchange rate used |
| date | DateTime | Expense date |
| description | String | Expense description |
| receiptUrl | String? | Receipt image URL |
| receiptText | String? | OCR-extracted receipt text |
| tags | String[] | Expense tags |
| projectName | String? | Associated project |
| status | Enum | PENDING, APPROVED, REJECTED, REIMBURSED |
| approvedBy | UUID? | Approver user ID |
| approvedAt | DateTime? | Approval timestamp |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### ExpenseReport
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| robotId | UUID | Foreign key to Robot |
| title | String | Report title |
| description | String? | Report description |
| periodStart | DateTime | Report period start |
| periodEnd | DateTime | Report period end |
| totalAmount | Decimal | Total expenses amount |
| currency | String | Report currency |
| status | Enum | DRAFT, SUBMITTED, APPROVED, REJECTED, REIMBURSED |
| submittedAt | DateTime? | Submission timestamp |
| submittedBy | UUID? | Submitter user ID |
| approvedBy | UUID? | Approver user ID |
| approvedAt | DateTime? | Approval timestamp |
| approverComment | String? | Approval/rejection comment |
| summary | String? | AI-generated summary |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

### ExpensePolicy
| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenantId | UUID | Foreign key to Tenant |
| name | String | Policy name |
| description | String? | Policy description |
| rules | JSON | Policy rules configuration |
| isActive | Boolean | Policy enabled |
| createdAt | DateTime | Record creation time |
| updatedAt | DateTime | Last update time |

## API Endpoints

### Expense Categories
- `GET /api/v1/tenants/{id}/expense-categories` - List categories
- `POST /api/v1/tenants/{id}/expense-categories` - Create category
- `GET /api/v1/expense-categories/{id}` - Get category
- `PUT /api/v1/expense-categories/{id}` - Update category
- `DELETE /api/v1/expense-categories/{id}` - Delete category

### Expenses
- `GET /api/v1/robots/{id}/expenses` - List expenses with filters
- `POST /api/v1/robots/{id}/expenses` - Create expense
- `POST /api/v1/robots/{id}/expenses/upload-receipt` - Upload receipt
- `GET /api/v1/expenses/{id}` - Get expense details
- `PUT /api/v1/expenses/{id}` - Update expense
- `DELETE /api/v1/expenses/{id}` - Delete expense
- `POST /api/v1/expenses/{id}/categorize` - AI categorize expense

### Expense Reports
- `GET /api/v1/robots/{id}/expense-reports` - List reports
- `POST /api/v1/robots/{id}/expense-reports` - Create report
- `GET /api/v1/expense-reports/{id}` - Get report details
- `GET /api/v1/expense-reports/{id}/expenses` - Get expenses in report
- `PUT /api/v1/expense-reports/{id}` - Update report
- `POST /api/v1/expense-reports/{id}/submit` - Submit for approval
- `POST /api/v1/expense-reports/{id}/approve` - Approve report
- `POST /api/v1/expense-reports/{id}/reject` - Reject report
- `POST /api/v1/expense-reports/{id}/mark-reimbursed` - Mark as reimbursed
- `POST /api/v1/expense-reports/{id}/generate-summary` - AI generate summary
- `GET /api/v1/expense-reports/{id}/export` - Export report (CSV/PDF)

### Expense Policies
- `GET /api/v1/tenants/{id}/expense-policies` - List policies
- `POST /api/v1/tenants/{id}/expense-policies` - Create policy
- `GET /api/v1/expense-policies/{id}` - Get policy
- `PUT /api/v1/expense-policies/{id}` - Update policy
- `DELETE /api/v1/expense-policies/{id}` - Delete policy

### Dashboard
- `GET /api/v1/robots/{id}/expense-dashboard` - Get expense overview

## User Interface

### Robot Detail Page Enhancement
- Expense summary card
- Recent expenses list
- Quick expense entry

### New Expenses Page
- Expense list with filters
- Expense detail view
- Receipt viewer
- Category management

### New Expense Reports Page
- Report list with status filters
- Report detail view
- Create report wizard
- Approval actions

### Expense Entry Form
- Amount input with currency
- Date picker
- Category selector (with AI suggestion)
- Description textarea
- Receipt upload
- Tags input
- Project selector

### Report Builder
- Select expenses to include
- Date range selector
- Report preview
- Submit for approval

## Implementation Notes

- Receipt images stored in workspace/uploads/receipts/
- OCR processing simulated for MVP (can integrate with external service later)
- Exchange rates fetched from external API or stored manually
- Report export uses CSV generation
- Policy violations trigger warnings but don't block submission
- All amounts stored as Decimal with 2 decimal places

## E2E Test Plan

Using agent-browser:
1. Login as user
2. Navigate to robot detail
3. View expense dashboard
4. Create a new expense with receipt
5. View expense details
6. Create an expense report
7. Add expense to report
8. Submit report for approval
9. View report summary
10. Export report
