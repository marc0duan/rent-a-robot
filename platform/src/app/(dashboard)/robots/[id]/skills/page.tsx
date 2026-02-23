"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api/client"
import { ApiClientError } from "@/lib/api/client"
import { toast } from "sonner"
import {
  FileCode2,
  Plus,
  Trash2,
  Loader2,
  Pencil,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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

interface PlatformSkill {
  id: string
  robotId: string
  name: string
  description: string | null
  skillMd: string
  scripts: unknown
  metadata: unknown
  createdAt: string
  updatedAt: string
}

export default function RobotSkillsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [skills, setSkills] = useState<PlatformSkill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newSkillMd, setNewSkillMd] = useState("")
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // Edit dialog
  const [editSkill, setEditSkill] = useState<PlatformSkill | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editSkillMd, setEditSkillMd] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Delete dialog
  const [deleteSkillId, setDeleteSkillId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Resolve params
  useEffect(() => {
    params.then((p) => setResolvedParams(p))
  }, [params])

  const loadSkills = useCallback(async () => {
    if (!resolvedParams) return
    try {
      const res = await api.robots.skills.list(resolvedParams.id)
      setSkills(res.skills)
    } catch {
      toast.error("Failed to load skills")
    } finally {
      setIsLoading(false)
    }
  }, [resolvedParams])

  useEffect(() => {
    if (resolvedParams) {
      loadSkills()
    }
  }, [resolvedParams, loadSkills])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvedParams) return
    setIsCreating(true)

    try {
      if (zipFile) {
        await api.robots.skills.create(resolvedParams.id, {
          name: newName,
          description: newDescription || undefined,
          file: zipFile,
        })
      } else {
        await api.robots.skills.create(resolvedParams.id, {
          name: newName,
          description: newDescription || undefined,
          skillMd: newSkillMd,
        })
      }

      toast.success("Skill created")
      setCreateOpen(false)
      setNewName("")
      setNewDescription("")
      setNewSkillMd("")
      setZipFile(null)
      loadSkills()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to create skill")
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!resolvedParams || !editSkill) return
    setIsSaving(true)

    try {
      await api.robots.skills.update(resolvedParams.id, editSkill.id, {
        name: editName,
        description: editDescription || undefined,
        skillMd: editSkillMd,
      })

      toast.success("Skill updated")
      setEditSkill(null)
      loadSkills()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to update skill")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!resolvedParams || !deleteSkillId) return
    setIsDeleting(true)

    try {
      await api.robots.skills.delete(resolvedParams.id, deleteSkillId)
      toast.success("Skill deleted")
      setDeleteSkillId(null)
      loadSkills()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to delete skill")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSync = async () => {
    if (!resolvedParams) return
    setIsSyncing(true)

    try {
      await loadSkills()
      toast.success("Skills synced")
    } catch {
      toast.error("Failed to sync skills")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setZipFile(file)
      if (!newName) {
        setNewName(file.name.replace(/\.zip$/i, ""))
      }
    }
  }

  const openEdit = (skill: PlatformSkill) => {
    setEditSkill(skill)
    setEditName(skill.name)
    setEditDescription(skill.description || "")
    setEditSkillMd(skill.skillMd)
  }

  if (!resolvedParams) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Platform Skills</h2>
          <p className="text-sm text-muted-foreground">
            Manage skills synced to this robot
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Skill
          </Button>
        </div>
      </div>

      {/* Skills List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <Card className="border-zinc-800 bg-zinc-950/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileCode2 className="mb-4 h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No platform skills yet</p>
            <Button variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Skill
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {skills.map((skill) => (
            <Card
              key={skill.id}
              className="border-zinc-800 bg-zinc-950/50"
            >
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <FileCode2 className="h-5 w-5 text-sky-400" />
                  <div>
                    <p className="font-medium">{skill.name}</p>
                    {skill.description && (
                      <p className="text-sm text-muted-foreground">
                        {skill.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const scripts = skill.scripts as unknown[]
                    return scripts && scripts.length > 0 ? (
                      <Badge variant="secondary" className="text-xs mr-2">
                        {scripts.length} scripts
                      </Badge>
                    ) : null
                  })()}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(skill)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteSkillId(skill.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
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
            setNewDescription("")
            setNewSkillMd("")
            setZipFile(null)
          }
        }}
      >
        <DialogContent className="border-zinc-800 bg-zinc-950 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Platform Skill</DialogTitle>
            <DialogDescription>
              Create a skill that will be synced to the robot. Upload a ZIP file with
              SKILL.md or enter the content manually.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="skill-name">Skill Name</Label>
                <Input
                  id="skill-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="my-skill"
                  required
                  className="bg-background/50"
                />
                <p className="text-xs text-muted-foreground">
                  Alphanumeric with dashes/underscores only
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="skill-description">Description (optional)</Label>
                <Input
                  id="skill-description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What this skill does..."
                  className="bg-background/50"
                />
              </div>
              <div className="grid gap-2">
                <Label>Upload ZIP (optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".zip"
                    onChange={handleZipChange}
                    className="bg-background/50"
                  />
                  {zipFile && (
                    <span className="text-xs text-muted-foreground">
                      {zipFile.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  ZIP should contain SKILL.md at root and optionally scripts/ folder
                </p>
              </div>
              {!zipFile && (
                <div className="grid gap-2">
                  <Label htmlFor="skill-md">SKILL.md Content</Label>
                  <Textarea
                    id="skill-md"
                    value={newSkillMd}
                    onChange={(e) => setNewSkillMd(e.target.value)}
                    placeholder="# My Skill\n\nThis skill helps the robot..."
                    rows={10}
                    required
                    className="bg-background/50 font-mono text-sm"
                  />
                </div>
              )}
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
              <Button
                type="submit"
                disabled={
                  isCreating ||
                  !newName ||
                  (!zipFile && !newSkillMd)
                }
              >
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editSkill} onOpenChange={() => setEditSkill(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Skill</DialogTitle>
            <DialogDescription>
              Update the skill content. The robot will receive the update via SSE.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Skill Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-md">SKILL.md Content</Label>
              <Textarea
                id="edit-md"
                value={editSkillMd}
                onChange={(e) => setEditSkillMd(e.target.value)}
                rows={10}
                className="bg-background/50 font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditSkill(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteSkillId} onOpenChange={() => setDeleteSkillId(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Delete Skill</DialogTitle>
            <DialogDescription>
              This will permanently delete this skill from the robot. The robot will
              receive the deletion event on its next connection. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteSkillId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
