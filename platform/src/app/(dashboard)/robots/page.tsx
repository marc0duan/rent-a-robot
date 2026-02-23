"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api/client"
import { ApiClientError } from "@/lib/api/client"
import { toast } from "sonner"
import {
  Bot,
  Plus,
  Trash2,
  Loader2,
  FileText,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
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

interface RobotInfo {
  id: string
  name: string
  status: string
  soulMd: string | null
  createdAt: string
  updatedAt: string
}

interface TeamOption {
  id: string
  name: string
}

interface ChatGroupOption {
  id: string
  name: string
  teamId: string
}

const statusColor: Record<string, string> = {
  created: "bg-zinc-500",
  onboarding: "bg-amber-500",
  onboard: "bg-emerald-500",
  offline: "bg-red-500",
}

export default function RobotsPage() {
  const router = useRouter()
  const [robots, setRobots] = useState<RobotInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newSoul, setNewSoul] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)


  const [teams, setTeams] = useState<TeamOption[]>([])
  const [chatgroups, setChatgroups] = useState<ChatGroupOption[]>([])
  const [newTeamId, setNewTeamId] = useState("")
  const [newChatGroupId, setNewChatGroupId] = useState("")

  // Edit flow
  const [editRobot, setEditRobot] = useState<RobotInfo | null>(null)
  const [editName, setEditName] = useState("")
  const [editSoul, setEditSoul] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.robots.list()
      setRobots(res.robots)
    } catch {
      toast.error("Failed to load robots")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])


  useEffect(() => {
    if (!createOpen) return
    const fetchTeams = async () => {
      try {
        const res = await api.teams.list()
        setTeams(res.teams.map((t) => ({ id: t.id, name: t.name })))
      } catch {
        toast.error("Failed to load teams")
      }
    }
    fetchTeams()
  }, [createOpen])


  useEffect(() => {
    if (!newTeamId) {
      setChatgroups([])
      setNewChatGroupId("")
      return
    }
    const fetchChatgroups = async () => {
      try {
        const res = await api.chatGroups.list(newTeamId)
        setChatgroups(
          res.chatgroups.map((cg) => ({
            id: cg.id,
            name: cg.name,
            teamId: cg.teamId,
          }))
        )
        setNewChatGroupId("")
      } catch {
        toast.error("Failed to load chatgroups")
      }
    }
    fetchChatgroups()
  }, [newTeamId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {

      const { robot } = await api.robots.create({
        name: newName,
        soulMd: newSoul || undefined,
      })


      await api.teams.addMember(newTeamId, {
        memberId: robot.id,
        memberType: "robot",
      })


      await api.chatGroups.addMember(newChatGroupId, {
        memberId: robot.id,
        memberType: "robot",
      })


      toast.success("Robot created")
      setCreateOpen(false)
      setNewName("")
      setNewSoul("")
      setNewTeamId("")
      setNewChatGroupId("")
      setTeams([])
      setChatgroups([])
      setIsLoading(true)
      load()

    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to create robot")
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await api.robots.delete(deleteId)
      toast.success("Robot deleted")
      setDeleteId(null)
      setIsLoading(true)
      load()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to delete robot")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditSave = async () => {
    if (!editRobot) return
    setIsSaving(true)
    try {
      await api.robots.update(editRobot.id, {
        name: editName,
        soulMd: editSoul || undefined,
      })
      toast.success("Robot updated")
      setEditRobot(null)
      setIsLoading(true)
      load()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to update robot")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const canCreate = newName.trim() && newTeamId && newChatGroupId

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Robots</h1>
          <p className="mt-1 text-muted-foreground">
            Create, configure, and assign robots to machines
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Robot
        </Button>
      </div>

      {/* Robot List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : robots.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-950/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No robots yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Robot
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {robots.map((robot) => (
            <Card
              key={robot.id}
              className="group cursor-pointer border-zinc-800 bg-zinc-950/50 transition-colors hover:border-zinc-700"
              onClick={() => router.push(`/robots/${robot.id}`)}
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-emerald-400" />
                  <CardTitle className="text-base font-semibold">
                    {robot.name}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <div
                    className={`h-2 w-2 rounded-full ${statusColor[robot.status] ?? "bg-zinc-500"}`}
                  />
                  <span className="text-xs text-muted-foreground">
                    {robot.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {robot.soulMd && (
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {robot.soulMd}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/robots/${robot.id}`)}
                  >
                    Settings
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteId(robot.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            setNewName("")
            setNewSoul("")
            setNewTeamId("")
            setNewChatGroupId("")
            setTeams([])
            setChatgroups([])
          }
        }}
      >
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Create Robot</DialogTitle>
            <DialogDescription>
              Define a new robot agent, assign it to a team and chatgroup.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="robot-name">Name</Label>
                <Input
                  id="robot-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Atlas Bot"
                  required
                  className="bg-background/50"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="robot-soul">Soul (Markdown)</Label>
                <Textarea
                  id="robot-soul"
                  value={newSoul}
                  onChange={(e) => setNewSoul(e.target.value)}
                  placeholder="You are a helpful coding assistant..."
                  rows={4}
                  className="bg-background/50 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Defines the robot&apos;s personality and behavior.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Assign to Team</Label>
                {teams.length === 0 ? (
                  <Select disabled>
                    <SelectTrigger className="w-full bg-background/50">
                      <SelectValue placeholder="No teams available — create a team first" />
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
                ) : (
                  <Select value={newTeamId} onValueChange={setNewTeamId}>
                    <SelectTrigger className="w-full bg-background/50">
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Assign to Chat Group</Label>
                {!newTeamId ? (
                  <Select disabled>
                    <SelectTrigger className="w-full bg-background/50">
                      <SelectValue placeholder="Select a team first" />
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
                ) : chatgroups.length === 0 ? (
                  <Select disabled>
                    <SelectTrigger className="w-full bg-background/50">
                      <SelectValue placeholder="No chatgroups in this team" />
                    </SelectTrigger>
                    <SelectContent />
                  </Select>
                ) : (
                  <Select
                    value={newChatGroupId}
                    onValueChange={setNewChatGroupId}
                  >
                    <SelectTrigger className="w-full bg-background/50">
                      <SelectValue placeholder="Select a chatgroup" />
                    </SelectTrigger>
                    <SelectContent>
                      {chatgroups.map((cg) => (
                        <SelectItem key={cg.id} value={cg.id}>
                          {cg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !canCreate}>
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editRobot} onOpenChange={() => setEditRobot(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Edit Robot</DialogTitle>
            <DialogDescription>
              Update the robot&apos;s name and soul definition.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-robot-name">Name</Label>
              <Input
                id="edit-robot-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-robot-soul">Soul (Markdown)</Label>
              <Textarea
                id="edit-robot-soul"
                value={editSoul}
                onChange={(e) => setEditSoul(e.target.value)}
                rows={4}
                className="bg-background/50 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditRobot(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Delete Robot</DialogTitle>
            <DialogDescription>
              This will permanently delete this robot and revoke its access
              tokens. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
