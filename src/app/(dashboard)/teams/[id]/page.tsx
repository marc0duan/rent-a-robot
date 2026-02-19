"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Users,
  Bot,
  MessageSquare,
  ShieldAlert,
} from "lucide-react"

interface Member {
  memberId: string
  memberType: "human" | "robot"
  joinedAt: string
}

interface Group {
  id: string
  name: string
  _count?: {
    messages: number
  }
}

interface TeamDetail {
  id: string
  name: string
  tenantId: string
  createdAt: string
  members: Member[]
  groups: Group[]
}

export default function TeamDetailsPage(props: { params: Promise<{ id: string }> }) {
  const params = React.use(props.params)
  const router = useRouter()
  const { user } = useAuth()
  const [team, setTeam] = React.useState<TeamDetail | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAddMemberOpen, setIsAddMemberOpen] = React.useState(false)
  const [newMemberId, setNewMemberId] = React.useState("")
  const [newMemberType, setNewMemberType] = React.useState<"human" | "robot">("human")
  const [isAddingMember, setIsAddingMember] = React.useState(false)

  const fetchTeam = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.teams.get(params.id)
      setTeam(data.team)
    } catch (error) {
      toast.error("Failed to load team details")
      console.error(error)
      // Optional: redirect back to teams on 404
      // router.push("/teams")
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  React.useEffect(() => {
    fetchTeam()
  }, [fetchTeam])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberId.trim()) return

    try {
      setIsAddingMember(true)
      await api.teams.addMember(params.id, {
        memberId: newMemberId,
        memberType: newMemberType,
      })
      toast.success("Member added successfully")
      setNewMemberId("")
      setNewMemberType("human")
      setIsAddMemberOpen(false)
      fetchTeam()
    } catch (error) {
      toast.error("Failed to add member")
      console.error(error)
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return

    try {
      await api.teams.removeMember(params.id, memberId)
      toast.success("Member removed successfully")
      fetchTeam()
    } catch (error) {
      toast.error("Failed to remove member")
      console.error(error)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl py-10 space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-[400px] md:col-span-2 rounded-xl" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="container mx-auto max-w-7xl py-20 flex flex-col items-center justify-center text-center">
        <ShieldAlert className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold">Team not found</h2>
        <p className="text-muted-foreground mb-8">
          The team you are looking for does not exist or you don't have permission to view it.
        </p>
        <Button asChild variant="secondary">
          <Link href="/teams">Back to Teams</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-4 border-b border-border/50 pb-6">
        <Link
          href="/teams"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Teams
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-2">
              {team.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
              <span className="bg-muted px-2 py-0.5 rounded text-xs">ID: {team.id}</span>
              <span>Created {new Date(team.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all">
                <UserPlus className="h-4 w-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Add a human or robot to this team.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddMember} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="memberId">Member ID / Email</Label>
                  <Input
                    id="memberId"
                    placeholder="user_..."
                    value={newMemberId}
                    onChange={(e) => setNewMemberId(e.target.value)}
                    disabled={isAddingMember}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Member Type</Label>
                  <Select
                    value={newMemberType}
                    onValueChange={(v: "human" | "robot") => setNewMemberType(v)}
                    disabled={isAddingMember}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="human">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" /> Human
                        </div>
                      </SelectItem>
                      <SelectItem value="robot">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" /> Robot
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isAddingMember || !newMemberId.trim()}>
                    {isAddingMember ? "Adding..." : "Add Member"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Members Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 bg-background/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Team Members
                <Badge variant="secondary" className="ml-2">
                  {team.members.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Manage who has access to this team's resources.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {team.members.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No members yet. Add someone to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border/50">
                      <TableHead>Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.members.map((member) => (
                      <TableRow key={member.memberId} className="hover:bg-muted/30 border-border/50 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              member.memberType === 'robot' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            }`}>
                              {member.memberId.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="truncate max-w-[150px]" title={member.memberId}>
                              {member.memberId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={member.memberType === "robot" ? "outline" : "default"}
                            className={member.memberType === "robot"
                              ? "border-purple-500/50 text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20"
                              : "bg-blue-600 hover:bg-blue-700"}
                          >
                            {member.memberType === "robot" ? (
                              <Bot className="mr-1 h-3 w-3" />
                            ) : (
                              <Users className="mr-1 h-3 w-3" />
                            )}
                            {member.memberType.charAt(0).toUpperCase() + member.memberType.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(member.joinedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => handleRemoveMember(member.memberId)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Groups Column */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-background/50 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Chat Groups
                <Badge variant="secondary" className="ml-2">
                  {team.groups.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Active conversation channels for this team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {team.groups.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-lg">
                  No chat groups created yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {team.groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="font-medium truncate pr-2" title={group.name}>
                        {group.name}
                      </div>
                      {group._count?.messages !== undefined && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {group._count.messages} msgs
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
