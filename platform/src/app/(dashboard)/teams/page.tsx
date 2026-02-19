"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api/client"
import { ApiClientError } from "@/lib/api/client"
import { toast } from "sonner"
import Link from "next/link"
import {
  Users,
  Plus,
  MessageSquare,
  Loader2,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"

interface TeamInfo {
  id: string
  name: string
  tenantId: string
  createdAt: string
  _count: { members: number; groups: number }
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.teams.list()
      setTeams(res.teams)
    } catch {
      toast.error("Failed to load teams")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      await api.teams.create({ name: newName })
      toast.success("Team created")
      setCreateOpen(false)
      setNewName("")
      setIsLoading(true)
      load()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to create team")
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await api.teams.delete(deleteId)
      toast.success("Team deleted")
      setDeleteId(null)
      setIsLoading(true)
      load()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to delete team")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
          <p className="mt-1 text-muted-foreground">
            Organize people and robots into collaborative teams
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Team
        </Button>
      </div>

      {/* Team List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-950/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No teams yet</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card
              key={team.id}
              className="group border-zinc-800 bg-zinc-950/50 transition-colors hover:border-zinc-700"
            >
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <Link href={`/teams/${team.id}`} className="flex-1">
                  <CardTitle className="text-base font-semibold hover:underline">
                    {team.name}
                  </CardTitle>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => setDeleteId(team.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </CardHeader>
              <CardContent>
                <Link href={`/teams/${team.id}`}>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {team._count.members} members
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {team._count.groups} groups
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>
              A default &quot;General&quot; chat group will be created
              automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Engineering"
                  required
                  className="bg-background/50"
                />
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
              <Button type="submit" disabled={isCreating}>
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              This will permanently delete the team, all its chat groups, and
              messages. This action cannot be undone.
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
