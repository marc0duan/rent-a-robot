# Feature Plan: Email Invitation System

## Overview

Add the ability for organization admins to invite new members via email. Invited users receive an email with a unique link that directs them to the signup page with the tenant pre-selected.

---

## User Flow

1. **Organization Admin** clicks "Invite Member" button on Organization Settings → Members section
2. Admin enters email address and selects role (admin/user)
3. System generates unique invitation token, stores it in database, sends email with signup link
4. **Invited User** receives email, clicks the link
5. User is directed to `/auth/signup?token=<invitation_token>`
6. Signup form pre-fills tenant and shows: "You've been invited to join [Organization Name] as [role]"
7. User completes signup (name, password)
8. User is automatically added to the tenant with the specified role

---

## Implementation Plan

### Phase 1: Database & Models

#### 1.1 Add Invitation Model to Prisma Schema

```prisma
model TenantInvitation {
  id        String   @id @default(uuid())
  tenantId  String
  email     String
  role      String   // admin, user
  token     String   @unique
  invitedBy String   // userId of inviter
  expiresAt DateTime
  acceptedAt DateTime?
  createdAt DateTime @default(now())

  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId, email])
}
```

#### 1.2 Update .env.example

Add SMTP configuration:
```
# SMTP (for email invitations)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Perseus <noreply@example.com>"
```

---

### Phase 2: Backend Services

#### 2.1 Create Email Library (`platform/src/lib/email.ts`)

- Use `nodemailer` for sending emails
- Support both SMTP and development (preview) modes
- Email templates for invitation

#### 2.2 Create Invitation Service (`platform/src/services/invitation.ts`)

Functions:
- `createInvitation(tenantId, email, role, invitedBy)` - Generate token, save to DB, send email
- `validateInvitation(token)` - Check token validity and expiration
- `acceptInvitation(token, userId)` - Link invitation to new user, mark as accepted
- `revokeInvitation(id)` - Delete invitation before acceptance
- `listInvitations(tenantId)` - List pending invitations for tenant

#### 2.3 API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tenants/[id]/invitations` | List pending invitations |
| POST | `/api/v1/tenants/[id]/invitations` | Create new invitation |
| DELETE | `/api/v1/invitations/[id]` | Revoke invitation |
| GET | `/api/v1/invitations/verify?token=` | Verify invitation token (public) |

---

### Phase 3: Frontend

#### 3.1 Update Organization Settings Page

**File**: `platform/src/app/(dashboard)/tenants/page.tsx`

- Add "Invite Member" button next to the member list header
- Add invite dialog/modal with:
  - Email input field
  - Role dropdown (Admin, User)
  - Send button

#### 3.2 Update API Client

**File**: `platform/src/lib/api/client.ts`

Add methods:
- `invitations.list(tenantId)`
- `invitations.create(tenantId, { email, role })`
- `invitations.delete(invitationId)`

#### 3.3 Update Signup Page

**File**: `platform/src/app/(auth)/signup/page.tsx`

- Check for `token` query parameter on mount
- If token present:
  - Call `/api/v1/invitations/verify?token=` to validate
  - Pre-fill tenant info in UI
  - Show invitation context: "You've been invited to join [Org Name] as [role]"
- On form submission:
  - Include invitation token in signup payload
  - Backend creates user and links to tenant via invitation

#### 3.4 Update Signup API

**File**: `platform/src/app/api/v1/auth/signup/route.ts`

- Accept optional `invitationToken` field
- If token provided:
  - Validate token (exists, not expired, email matches)
  - Create user
  - Create TenantUser with role from invitation
  - Mark invitation as accepted
- If no token: proceed with normal signup (user won't be added to any tenant)

---

### Phase 4: Email Templates

#### Invitation Email

**Subject**: You're invited to join [Organization Name] on Perseus

**Body**:
```
Hi,

You've been invited to join [Organization Name] on Perseus as a [role].

Click the link below to create your account:
[Signup URL with token]

This invitation expires in 7 days.

If you didn't expect this invitation, you can safely ignore this email.
```

---

## Security Considerations

1. **Token Generation**: Use crypto-safe random token (32+ bytes, hex encoded)
2. **Expiration**: Invitation tokens expire in 7 days
3. **Email Matching**: Invitation tied to specific email; signup email must match
4. **One-time Use**: Token can only be used once
5. **Rate Limiting**: Limit invitation creation to prevent abuse
6. **Audit Trail**: Store `invitedBy` user ID for accountability

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `platform/prisma/schema.prisma` | Add TenantInvitation model |
| `platform/.env.example` | Add SMTP config |
| `platform/src/lib/email.ts` | Create (new) |
| `platform/src/services/invitation.ts` | Create (new) |
| `platform/src/app/api/v1/tenants/[id]/invitations/route.ts` | Create (new) |
| `platform/src/app/api/v1/invitations/[id]/route.ts` | Create (new) |
| `platform/src/app/api/v1/invitations/verify/route.ts` | Create (new) |
| `platform/src/app/api/v1/auth/signup/route.ts` | Modify |
| `platform/src/app/(dashboard)/tenants/page.tsx` | Modify |
| `platform/src/lib/api/client.ts` | Modify |
| `platform/src/app/(auth)/signup/page.tsx` | Modify |

---

## Acceptance Criteria

1. ✅ Admin can invite members by email from Organization Settings
2. ✅ Invited user receives email with signup link containing token
3. ✅ Link opens signup page with tenant pre-filled and role shown
4. ✅ User can complete signup and is automatically added to tenant
5. ✅ Invitation tokens expire after 7 days
6. ✅ Admin can view and revoke pending invitations
7. ✅ Same email cannot have multiple pending invitations
