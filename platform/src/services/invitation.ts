import { randomBytes } from "crypto";
import { prisma } from "../lib/prisma";
import { sendInvitationEmail } from "../lib/email";
import { ApiError } from "../lib/errors";

const INVITATION_EXPIRY_DAYS = 7;

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export interface CreateInvitationParams {
  tenantId: string;
  email: string;
  role: "admin" | "user";
  invitedBy: string;
}

export interface InvitationInfo {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  invitedBy: string;
  invitedByName: string;
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
}

export async function createInvitation(
  params: CreateInvitationParams
): Promise<InvitationInfo> {
  const { tenantId, email, role, invitedBy } = params;

  // Check if there's already a pending invitation for this email and tenant
  const existing = await prisma.tenantInvitation.findFirst({
    where: {
      tenantId,
      email: email.toLowerCase(),
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existing) {
    throw new ApiError(400, "invitation_exists", "An invitation is already pending for this email");
  }

  // Check if user already exists in this tenant
  const existingMember = await prisma.tenantUser.findFirst({
    where: {
      tenantId,
      user: { email: email.toLowerCase() },
    },
  });

  if (existingMember) {
    throw new ApiError(400, "user_exists", "User is already a member of this organization");
  }

  // Get tenant info for email
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  if (!tenant) {
    throw new ApiError(404, "tenant_not_found", "Tenant not found");
  }

  // Get inviter name
  const inviter = await prisma.user.findUnique({
    where: { id: invitedBy },
    select: { name: true },
  });

  if (!inviter) {
    throw new ApiError(404, "inviter_not_found", "Inviter not found");
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  const invitation = await prisma.tenantInvitation.create({
    data: {
      tenantId,
      email: email.toLowerCase(),
      role,
      token,
      invitedBy,
      expiresAt,
    },
  });

  // Send invitation email
  const platformUrl = process.env.PLATFORM_URL || "http://localhost:3000";
  const signupUrl = `${platformUrl}/signup?token=${token}`;

  await sendInvitationEmail({
    to: email,
    tenantName: tenant.name,
    role,
    signupUrl,
  });

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    tenantId: invitation.tenantId,
    tenantName: tenant.name,
    invitedBy: invitation.invitedBy,
    invitedByName: inviter.name,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    acceptedAt: null,
  };
}

export async function validateInvitation(
  token: string
): Promise<{
  valid: boolean;
  invitation?: InvitationInfo;
  error?: string;
}> {
  const invitation = await prisma.tenantInvitation.findUnique({
    where: { token },
    include: { tenant: { select: { name: true } } },
  });

  if (!invitation) {
    return { valid: false, error: "Invalid invitation token" };
  }

  if (invitation.acceptedAt) {
    return { valid: false, error: "Invitation has already been used" };
  }

  if (new Date() > invitation.expiresAt) {
    return { valid: false, error: "Invitation has expired" };
  }

  // Get inviter name
  const inviter = await prisma.user.findUnique({
    where: { id: invitation.invitedBy },
    select: { name: true },
  });

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      tenantId: invitation.tenantId,
      tenantName: invitation.tenant.name,
      invitedBy: invitation.invitedBy,
      invitedByName: inviter?.name || "Unknown",
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      acceptedAt: invitation.acceptedAt,
    },
  };
}

export async function acceptInvitation(
  token: string,
  userId: string
): Promise<void> {
  const validation = await validateInvitation(token);

  if (!validation.valid || !validation.invitation) {
    throw new ApiError(400, "invalid_invitation", validation.error || "Invalid invitation");
  }

  const { invitation } = validation;

  // Verify the user's email matches the invitation
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new ApiError(404, "user_not_found", "User not found");
  }

  if (user.email.toLowerCase() !== invitation.email) {
    throw new ApiError(
      400,
      "email_mismatch",
      "The email address used to sign up does not match the invitation"
    );
  }

  // Add user to tenant with the role from invitation
  await prisma.tenantUser.create({
    data: {
      userId,
      tenantId: invitation.tenantId,
      role: invitation.role,
    },
  });

  // Mark invitation as accepted
  await prisma.tenantInvitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const invitation = await prisma.tenantInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new ApiError(404, "invitation_not_found", "Invitation not found");
  }

  if (invitation.acceptedAt) {
    throw new ApiError(400, "invitation_accepted", "Cannot revoke an accepted invitation");
  }

  await prisma.tenantInvitation.delete({
    where: { id: invitationId },
  });
}

export async function listInvitations(
  tenantId: string
): Promise<InvitationInfo[]> {
  const invitations = await prisma.tenantInvitation.findMany({
    where: { tenantId },
    include: { tenant: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const inviterIds = [...new Set(invitations.map((i) => i.invitedBy))];
  let inviterMap = new Map<string, string>();

  if (inviterIds.length > 0) {
    const inviters = await prisma.user.findMany({
      where: { id: { in: inviterIds } },
      select: { id: true, name: true },
    });
    inviterMap = new Map(inviters.map((u) => [u.id, u.name]));
  }

  return invitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    tenantId: invitation.tenantId,
    tenantName: invitation.tenant.name,
    invitedBy: invitation.invitedBy,
    invitedByName: inviterMap.get(invitation.invitedBy) || "Unknown",
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
    acceptedAt: invitation.acceptedAt,
  }));
}
