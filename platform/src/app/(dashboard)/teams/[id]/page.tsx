"use client"

import React, { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api/client"
import { ApiClientError } from "@/lib/api/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  Users,
  Bot,
  User,
  Plus,
  Trash2,
  MessageSquare,
  ArrowLeft,
  Loader2,
  Settings,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"

interface TeamDetail {
  id: string
  name: string
  tenantId: string
  createdAt: string
  members: Array<{
    memberId: string
    memberType: "human" | "robot"
    joinedAt: string
    user?: { id: string; email: string; name: string }
    robot?: { id: string; name: string; status: string }
  }>
  groups: Array<{
    id: string
    name: string
    _count?: { members: number; messages: number }
  }>
}

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = React.use(params)
  const router = useRouter()
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [memberType, setMemberType] = useState<"human" | "robot">("human")
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ id: string; email: string; name: string }>
  >([])
  const [availableRobots, setAvailableRobots] = useState<
    Array<{ id: string; name: string; status: string }>
  >([])
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.teams.get(id)
      setTeam(res.team as unknown as TeamDetail)
    } catch {
      toast.error("Failed to load team")
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const openAddMember = async () => {
    setAddMemberOpen(true)
    try {
      const [robotsRes] = await Promise.all([api.robots.list()])
      setAvailableRobots(robotsRes.robots)
    } catch {
      toast.error("Failed to load available members")
    }
  }

  const handleAddMember = async () => {
    if (!selectedMemberId) return
    setIsAdding(true)
    try {
      await api.teams.addMember(id, {
        memberId: selectedMemberId,
        memberType,
      })
      toast.success("Member added")
      setAddMemberOpen(false)
      setSelectedMemberId("")
      setIsLoading(true)
      load()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to add member")
      }
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      await api.teams.removeMember(id, memberId)
      toast.success("Member removed")
      setIsLoading(true)
      load()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to remove member")
      }
    }
  }

  const handleEditName = async () => {
    setIsSaving(true)
    try {
      await api.teams.update(id, { name: editName })
      toast.success("Team updated")
      setEditOpen(false)
      setIsLoading(true)
      load()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to update team")
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Team not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/teams")}>
          Back to Teams
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/teams">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {team.members.length} members &middot;{" "}
              {team.groups.length} chat groups
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditName(team.name)
              setEditOpen(true)
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button onClick={openAddMember}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Members */}
      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-blue-400" />
            Members
            <Badge variant="secondary" className="ml-2">
              {team.members.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {team.members.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No members yet. Add humans or robots to this team.
            </div>
          ) : (
            <div className="space-y-1">
              {team.members.map((m) => (
                <div
                  key={m.memberId}
                  className="group flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-zinc-900/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800">
                      {m.memberType === "robot" ? (
                        <Bot className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <User className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        {m.memberType === "robot"
                          ? m.robot?.name
                          : m.user?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m.memberType === "robot"
                          ? `Robot &middot; ${m.robot?.status}`
                          : m.user?.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        m.memberType === "robot" ? "secondary" : "outline"
                      }
                    >
                      {m.memberType}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => handleRemoveMember(m.memberId)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chat Groups */}
      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-violet-400" />
            Chat Groups
            <Badge variant="secondary" className="ml-2">
              {team.groups.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {team.groups.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No chat groups in this team.
            </div>
          ) : (
            <div className="space-y-1">
              {team.groups.map((g) => (
                <Link
                  key={g.id}
                  href="/chat"
                  className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-zinc-900/50"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{g.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Add a human or robot to this team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Member Type</Label>
              <Select
                value={memberType}
                onValueChange={(v) => {
                  setMemberType(v as "human" | "robot")
                  setSelectedMemberId("")
                }}
              >
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="human">Human</SelectItem>
                  <SelectItem value="robot">Robot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>
                {memberType === "human" ? "User" : "Robot"}
              </Label>
              {memberType === "robot" ? (
                <Select
                  value={selectedMemberId}
                  onValueChange={setSelectedMemberId}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select a robot..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRobots.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} ({r.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Enter user ID"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="bg-background/50"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddMemberOpen(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={isAdding || !selectedMemberId}>
              {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Update the team name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-team-name">Team Name</Label>
              <Input
                id="edit-team-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-background/50"
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
            <Button onClick={handleEditName} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
