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
  role: string
  joinedAt: string
  user: { id: string; email: string; name: string }
}

export default function TenantPage() {
  const { tenant } = useAuth()
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

  const load = useCallback(async () => {
    if (!tenant) return
    try {
      const [tenantRes, usersRes] = await Promise.all([
        api.tenants.get(tenant.id),
        api.tenants.listUsers(tenant.id),
      ])
      setTenantInfo(tenantRes.tenant)
      setUsers(usersRes.users)
    } catch {
      toast.error("Failed to load tenant data")
    } finally {
      setIsLoading(false)
    }
  }, [tenant])

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
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-blue-400" />
            Members
            {!isLoading && (
              <Badge variant="secondary" className="ml-2">
                {users.length}
              </Badge>
            )}
          </CardTitle>
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
                      {tu.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{tu.user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {tu.user.email}
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
    </div>
  )
}
