"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api/client"
import { toast } from "sonner"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings2, Users, Building2, Calendar, ShieldCheck, Mail, Hash } from "lucide-react"

// Define interfaces based on the prompt
interface TenantUser {
  userId: string
  role: "OWNER" | "ADMIN" | "MEMBER" | string
  joinedAt: string
  user: {
    id: string
    email: string
    name: string | null
  }
}

export default function TenantManagementPage() {
  const { user, tenant } = useAuth()
  const [users, setUsers] = useState<TenantUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Edit tenant state
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [editName, setEditName] = useState("")
  const [editSlug, setEditSlug] = useState("")

  useEffect(() => {
    if (tenant?.id) {
      fetchUsers()
      setEditName(tenant.name || "")
      setEditSlug(tenant.slug || "")
    }
  }, [tenant?.id])

  const fetchUsers = async () => {
    if (!tenant?.id) return
    
    setIsLoading(true)
    try {
      // Prompt says: api.tenants.listUsers(tenant.id) returns { users: Array<{...}> }
      // We'll assume the type is broadly compatible or cast if necessary in a real scenario,
      // but here we just use the data returned.
      const response = await api.tenants.listUsers(tenant.id)
      setUsers(response.users || [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
      toast.error("Failed to load tenant users")
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateTenant = async () => {
    if (!tenant?.id) return

    setIsUpdating(true)
    try {
      await api.tenants.update(tenant.id, {
        name: editName,
        slug: editSlug,
      })
      toast.success("Tenant updated successfully")
      setIsEditOpen(false)
      // Ideally we'd refresh the auth context here, but for this page we'll just close the dialog
    } catch (error) {
      console.error("Failed to update tenant:", error)
      toast.error("Failed to update tenant details")
    } finally {
      setIsUpdating(false)
    }
  }

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Role badge variant helper
  const getRoleBadgeVariant = (role: string) => {
    const normalizedRole = role.toUpperCase()
    if (normalizedRole === "OWNER") return "destructive"
    if (normalizedRole === "ADMIN") return "default"
    return "secondary"
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 text-center">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    )
  }

  const canEdit = user?.role === "OWNER" || user?.role === "ADMIN" || tenant.role === "OWNER" || tenant.role === "ADMIN"

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 border-border/40">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            Tenant Management
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage your organization, users, and settings for <span className="font-semibold text-foreground">{tenant.name}</span>.
          </p>
        </div>
        
        {canEdit && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Tenant</DialogTitle>
                <DialogDescription>
                  Make changes to your organization profile here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="slug" className="text-right">
                    Slug
                  </Label>
                  <Input
                    id="slug"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="col-span-3 font-mono text-xs"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleUpdateTenant} disabled={isUpdating}>
                  {isUpdating ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Tenant Info Card */}
        <Card className="md:col-span-1 shadow-sm hover:shadow-md transition-shadow duration-300 border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary/80" />
              Organization Details
            </CardTitle>
            <CardDescription>
              Your current workspace information
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm">
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40 border border-border/20">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Name</span>
                <span className="font-medium">{tenant.name}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40 border border-border/20">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Slug</span>
                <span className="font-mono text-xs">{tenant.slug}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40 border border-border/20">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tenant ID</span>
                <span className="font-mono text-xs truncate max-w-[200px]" title={tenant.id}>{tenant.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="md:col-span-2 shadow-sm border-border/60 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary/80" />
                  Team Members
                </CardTitle>
                <CardDescription>
                  Manage access and roles for your team
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-background/50">
                {users.length} {users.length === 1 ? 'Member' : 'Members'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="pl-6 w-[250px]">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="border-border/40">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-[120px]" />
                            <Skeleton className="h-3 w-[160px]" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell className="text-right pr-6"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      No users found in this organization.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((member) => (
                    <TableRow key={member.userId} className="group hover:bg-muted/30 transition-colors border-border/40">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">
                            {member.user.name || "Unknown User"}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" />
                            {member.user.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(member.role)} className="uppercase text-[10px] tracking-wider font-bold shadow-none">
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 opacity-70" />
                          {formatDate(member.joinedAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end">
                          <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30">
                            Active
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
