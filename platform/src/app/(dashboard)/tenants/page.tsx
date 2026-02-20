"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api/client"
import { ApiClientError } from "@/lib/api/client"
import { toast } from "sonner"
import {
  Building2,
  Users,
  Settings,
  Shield,
  ShieldCheck,
  User,
  Loader2,
  Mail,
  X,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"

interface TenantUserInfo {
  userId: string
  email: string
  name: string
  role: string
  joinedAt: string
}

interface InvitationInfo {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
  acceptedAt: string | null
}

export default function TenantPage() {
  const { tenant } = useAuth()
  const role = tenant?.role || null
  const [users, setUsers] = useState<TenantUserInfo[]>([])
  const [tenantInfo, setTenantInfo] = useState<{
    id: string
    name: string
    slug: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editSlug, setEditSlug] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Invitation state
  const [invitations, setInvitations] = useState<InvitationInfo[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "user">("user")
  const [isInviting, setIsInviting] = useState(false)

  const canInvite = role === "owner" || role === "admin"

  const load = useCallback(async () => {
    if (!tenant) {
      setIsLoading(false)
      return
    }
    try {
      const [tenantRes, usersRes, invitationsRes] = await Promise.all([
        api.tenants.get(tenant.id),
        api.tenants.listUsers(tenant.id),
        canInvite ? api.invitations.list(tenant.id) : Promise.resolve({ invitations: [] }),
      ])
      setTenantInfo(tenantRes.tenant)
      // Transform user data - API returns user fields at top level
      setUsers(usersRes.users.map(u => ({
        userId: u.userId,
        email: u.user.email,
        name: u.user.name,
        role: u.role,
        joinedAt: u.joinedAt,
      })))
      setInvitations(invitationsRes.invitations)
    } catch (err) {
      console.error("Failed to load tenant data:", err)
      toast.error("Failed to load tenant data")
    } finally {
      setIsLoading(false)
    }
  }, [tenant, canInvite])

  useEffect(() => {
    load()
  }, [load])

  const handleEdit = () => {
    if (!tenantInfo) return
    setEditName(tenantInfo.name)
    setEditSlug(tenantInfo.slug)
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!tenant) return
    setIsSaving(true)
    try {
      const res = await api.tenants.update(tenant.id, {
        name: editName,
        slug: editSlug,
      })
      setTenantInfo(res.tenant)
      toast.success("Organization updated")
      setEditOpen(false)
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to update organization")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleInvite = async () => {
    if (!tenant || !inviteEmail) return
    setIsInviting(true)
    try {
      await api.invitations.create(tenant.id, {
        email: inviteEmail,
        role: inviteRole,
      })
      toast.success("Invitation sent")
      setInviteOpen(false)
      setInviteEmail("")
      setInviteRole("user")
      // Reload invitations
      const res = await api.invitations.list(tenant.id)
      setInvitations(res.invitations)
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to send invitation")
      }
    } finally {
      setIsInviting(false)
    }
  }

  const handleRevoke = async (invitationId: string) => {
    if (!tenant) return
    try {
      await api.invitations.delete(invitationId)
      toast.success("Invitation revoked")
      setInvitations(invitations.filter((i) => i.id !== invitationId))
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to revoke invitation")
      }
    }
  }

  const roleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <ShieldCheck className="h-3.5 w-3.5" />
      case "admin":
        return <Shield className="h-3.5 w-3.5" />
      default:
        return <User className="h-3.5 w-3.5" />
    }
  }

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default" as const
      case "admin":
        return "secondary" as const
      default:
        return "outline" as const
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Organization Settings
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your organization and members
          </p>
        </div>
        <Button variant="outline" onClick={handleEdit}>
          <Settings className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </div>

      {/* Tenant Info Card */}
      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            Organization Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-32" />
            </div>
          ) : tenantInfo ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Name
                </div>
                <div className="mt-1 text-sm font-medium">
                  {tenantInfo.name}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Slug
                </div>
                <div className="mt-1 text-sm font-mono text-muted-foreground">
                  {tenantInfo.slug}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Members */}
      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-blue-400" />
              Members
              {!isLoading && (
                <Badge variant="secondary" className="ml-2">
                  {users.length}
                </Badge>
              )}
            </CardTitle>
            {canInvite && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setInviteOpen(true)}
              >
                <Mail className="mr-2 h-4 w-4" />
                Invite
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No members found
            </div>
          ) : (
            <div className="space-y-1">
              {users.map((tu) => (
                <div
                  key={tu.userId}
                  className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-zinc-900/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium">
                      {tu.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{tu.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {tu.email}
                      </div>
                    </div>
                  </div>
                  <Badge variant={roleBadgeVariant(tu.role)} className="gap-1">
                    {roleIcon(tu.role)}
                    {tu.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {canInvite && invitations.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-950/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-amber-400" />
              Pending Invitations
              <Badge variant="secondary" className="ml-2">
                {invitations.filter((i) => !i.acceptedAt).length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {invitations
                .filter((i) => !i.acceptedAt)
                .map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-zinc-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{inv.email}</div>
                        <div className="text-xs text-muted-foreground">
                          Invited as {inv.role} · Expires{" "}
                          {new Date(inv.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevoke(inv.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update your organization&apos;s name and URL slug.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                className="bg-background/50 font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new member to your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "user")}
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setInviteOpen(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={isInviting || !inviteEmail}
            >
              {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
