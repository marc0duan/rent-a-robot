// Shared types for frontend
// Mirrors Prisma models but only the fields returned by API

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface TenantUser {
  userId: string;
  tenantId: string;
  role: "owner" | "admin" | "user";
  joinedAt: string;
  user?: User;
}

export interface Team {
  id: string;
  name: string;
  tenantId: string;
  createdAt: string;
  members?: TeamMember[];
  groups?: ChatGroup[];
  _count?: { members: number; groups: number };
}

export interface TeamMember {
  teamId: string;
  memberId: string;
  memberType: "human" | "robot";
  joinedAt: string;
  user?: User;
  robot?: Robot;
}

export interface Robot {
  id: string;
  name: string;
  tenantId: string;
  creatorId: string;
  soulMd: string | null;
  status: "created" | "onboarding" | "onboard" | "offline";
  createdAt: string;
  updatedAt: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  teamId: string;
  createdById: string;
  createdAt: string;
  _count?: { members: number; messages: number };
  team?: { id: string; name: string };
  members?: ChatGroupMember[];
}

export interface ChatGroupMember {
  chatGroupId: string;
  memberId: string;
  memberType: "human" | "robot";
  joinedAt: string;
}

export interface Message {
  id: string;
  chatGroupId: string;
  senderId: string;
  senderType: "human" | "robot";
  content: string;
  mentions: string[] | null;
  createdAt: string;
  updatedAt: string;
  sender?: { name: string; type: string };
}

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  scope: "tenant" | "team" | "chatgroup";
  tenantId: string;
  teamId: string | null;
  chatGroupId: string | null;
  uploadedById: string;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scope: "tenant" | "user";
  tenantId: string;
  createdById: string;
  expiresAt: string | null;
  createdAt: string;
}

// Auth types
export interface AuthPayload {
  userId: string;
  email: string;
  tenantId?: string;
  role?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  tenants: Array<{
    tenantId: string;
    role: string;
    tenant: Tenant;
  }>;
}

export interface SignupResponse {
  user: User;
  token: string;
}

export interface SelectTenantResponse {
  tenant: Tenant;
  token: string;
}
