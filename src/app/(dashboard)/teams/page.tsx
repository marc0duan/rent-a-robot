"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Users, MessageSquare, ArrowRight } from "lucide-react"

interface Team {
  id: string
  name: string
  tenantId: string
  createdAt: string
  _count: {
    members: number
    groups: number
  }
}

export default function TeamsPage() {
  const { user } = useAuth()
  const [teams, setTeams] = React.useState<Team[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [newTeamName, setNewTeamName] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)

  const fetchTeams = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.teams.list()
      setTeams(data.teams)
    } catch (error) {
      toast.error("Failed to load teams")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return

    try {
      setIsCreating(true)
      await api.teams.create({ name: newTeamName })
      toast.success("Team created successfully")
      setNewTeamName("")
      setIsDialogOpen(false)
      fetchTeams()
    } catch (error) {
      toast.error("Failed to create team")
      console.error(error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="container mx-auto max-w-7xl py-10 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Team Management
          </h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Create and manage teams within your organization. Assign members and monitor group activity.
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
              <Plus className="h-4 w-4" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>
                Give your team a name. You can add members later.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTeam} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Operations Alpha"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  disabled={isCreating}
                  className="bg-background/50 focus:bg-background transition-colors"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isCreating || !newTeamName.trim()}>
                  {isCreating ? "Creating..." : "Create Team"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-border/50 bg-background/50">
              <CardHeader className="pb-4">
                <Skeleton className="h-6 w-2/3 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] rounded-lg border border-dashed border-border bg-muted/10 p-8 text-center animate-in zoom-in-95 duration-300">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-4">
            <Users className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-semibold">No teams yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto mb-6">
            Get started by creating your first team to manage members and groups.
          </p>
          <Button onClick={() => setIsDialogOpen(true)} variant="outline">
            Create First Team
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/teams/${team.id}`}>
              <Card className="group h-full transition-all hover:border-primary/50 hover:shadow-md hover:bg-muted/5 cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/0 group-hover:bg-primary transition-all duration-300" />
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate pr-4" title={team.name}>{team.name}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </CardTitle>
                  <CardDescription className="text-xs font-mono">
                    ID: {team.id.slice(0, 8)}...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                      <Users className="h-3.5 w-3.5" />
                      <span>{team._count?.members || 0} Members</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{team._count?.groups || 0} Groups</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 pb-4 text-xs text-muted-foreground border-t border-border/50 mt-auto bg-muted/20">
                  Created {new Date(team.createdAt).toLocaleDateString()}
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
