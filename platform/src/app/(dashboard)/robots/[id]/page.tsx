"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api/client"
import { ApiClientError } from "@/lib/api/client"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bot,
  ArrowLeft,
  Loader2,
  Trash2,
  FileCode2,
  Settings,
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

interface RobotInfo {
  id: string
  name: string
  status: string
  soulMd: string | null
  createdAt: string
  updatedAt: string
}

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

const statusColor: Record<string, string> = {
  created: "bg-zinc-500",
  onboarding: "bg-amber-500",
  onboard: "bg-emerald-500",
  offline: "bg-red-500",
}

type Tab = "general" | "skills"

export default function RobotSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null)
  const [robot, setRobot] = useState<RobotInfo | null>(null)
  const [skills, setSkills] = useState<PlatformSkill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("general")

  // Edit flow
  const [editName, setEditName] = useState("")
  const [editSoul, setEditSoul] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Create skill dialog
  const [createSkillOpen, setCreateSkillOpen] = useState(false)
  const [newSkillName, setNewSkillName] = useState("")
  const [newSkillDescription, setNewSkillDescription] = useState("")
  const [newSkillMd, setNewSkillMd] = useState("")
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [isCreatingSkill, setIsCreatingSkill] = useState(false)

  // Edit skill dialog
  const [editSkill, setEditSkill] = useState<PlatformSkill | null>(null)
  const [editSkillName, setEditSkillName] = useState("")
  const [editSkillDescription, setEditSkillDescription] = useState("")
  const [editSkillMd, setEditSkillMd] = useState("")
  const [isSavingSkill, setIsSavingSkill] = useState(false)

  // Delete skill dialog
  const [deleteSkillId, setDeleteSkillId] = useState<string | null>(null)
  const [isDeletingSkill, setIsDeletingSkill] = useState(false)

  useEffect(() => {
    params.then((p) => setResolvedParams(p))
  }, [params])

  const loadRobot = useCallback(async () => {
    if (!resolvedParams) return
    try {
      const res = await api.robots.get(resolvedParams.id)
      setRobot(res.robot)
      setEditName(res.robot.name)
      setEditSoul(res.robot.soulMd || "")
    } catch {
      toast.error("Failed to load robot")
    }
  }, [resolvedParams])

  const loadSkills = useCallback(async () => {
    if (!resolvedParams) return
    try {
      const res = await api.robots.skills.list(resolvedParams.id)
      setSkills(res.skills)
    } catch {
      toast.error("Failed to load skills")
    }
  }, [resolvedParams])

  useEffect(() => {
    if (resolvedParams) {
      loadRobot()
      loadSkills()
      setIsLoading(false)
    }
  }, [resolvedParams, loadRobot, loadSkills])

  const handleSave = async () => {
    if (!resolvedParams) return
    setIsSaving(true)
    try {
      await api.robots.update(resolvedParams.id, {
        name: editName,
        soulMd: editSoul || undefined,
      })
      toast.success("Robot updated")
      loadRobot()
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

  const handleDelete = async () => {
    if (!resolvedParams) return
    setIsDeleting(true)
    try {
      await api.robots.delete(resolvedParams.id)
      toast.success("Robot deleted")
      window.location.href = "/robots"
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

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvedParams) return
    setIsCreatingSkill(true)

    try {
      if (zipFile) {
        await api.robots.skills.create(resolvedParams.id, {
          name: newSkillName,
          description: newSkillDescription || undefined,
          file: zipFile,
        })
      } else {
        await api.robots.skills.create(resolvedParams.id, {
          name: newSkillName,
          description: newSkillDescription || undefined,
          skillMd: newSkillMd,
        })
      }

      toast.success("Skill created")
      setCreateSkillOpen(false)
      setNewSkillName("")
      setNewSkillDescription("")
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
      setIsCreatingSkill(false)
    }
  }

  const handleEditSkill = async () => {
    if (!resolvedParams || !editSkill) return
    setIsSavingSkill(true)

    try {
      await api.robots.skills.update(resolvedParams.id, editSkill.id, {
        name: editSkillName,
        description: editSkillDescription || undefined,
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
      setIsSavingSkill(false)
    }
  }

  const handleDeleteSkill = async () => {
    if (!resolvedParams || !deleteSkillId) return
    setIsDeletingSkill(true)

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
      setIsDeletingSkill(false)
    }
  }

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setZipFile(file)
      if (!newSkillName) {
        setNewSkillName(file.name.replace(/\.zip$/i, ""))
      }
    }
  }

  const openEditSkill = (skill: PlatformSkill) => {
    setEditSkill(skill)
    setEditSkillName(skill.name)
    setEditSkillDescription(skill.description || "")
    setEditSkillMd(skill.skillMd)
  }

  if (!resolvedParams || isLoading) {
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
      <div className="flex items-center gap-4">
        <Link href="/robots">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-emerald-400" />
          <h1 className="text-2xl font-bold tracking-tight">{robot?.name}</h1>
          <div
            className={`h-2 w-2 rounded-full ${statusColor[robot?.status || ""] ?? "bg-zinc-500"}`}
          />
          <span className="text-sm text-muted-foreground">{robot?.status}</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0 space-y-1">
          <Button
            variant={activeTab === "general" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab("general")}
          >
            <Settings className="mr-2 h-4 w-4" />
            General
          </Button>
          <Button
            variant={activeTab === "skills" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab("skills")}
          >
            <FileCode2 className="mr-2 h-4 w-4" />
            Skills
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {activeTab === "general" && (
            <Card className="border-zinc-800 bg-zinc-950/50">
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="robot-name">Name</Label>
                  <Input
                    id="robot-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="robot-soul">Soul (Markdown)</Label>
                  <Textarea
                    id="robot-soul"
                    value={editSoul}
                    onChange={(e) => setEditSoul(e.target.value)}
                    rows={8}
                    className="bg-background/50 font-mono text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Robot
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "skills" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Platform Skills</h2>
                <Button onClick={() => setCreateSkillOpen(true)}>
                  <FileCode2 className="mr-2 h-4 w-4" />
                  Add Skill
                </Button>
              </div>

              {skills.length === 0 ? (
                <Card className="border-zinc-800 bg-zinc-950/50">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileCode2 className="mb-4 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No platform skills yet</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setCreateSkillOpen(true)}
                    >
                      Add Your First Skill
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditSkill(skill)}
                          >
                            <Settings className="h-4 w-4" />
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
            </div>
          )}
        </div>
      </div>

      {/* Delete Robot Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Delete Robot</DialogTitle>
            <DialogDescription>
              This will permanently delete this robot and revoke its access tokens.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Skill Dialog */}
      <Dialog
        open={createSkillOpen}
        onOpenChange={(open) => {
          setCreateSkillOpen(open)
          if (!open) {
            setNewSkillName("")
            setNewSkillDescription("")
            setNewSkillMd("")
            setZipFile(null)
          }
        }}
      >
        <DialogContent className="border-zinc-800 bg-zinc-950 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Platform Skill</DialogTitle>
            <DialogDescription>
              Create a skill that will be synced to the robot. Upload a ZIP file or enter
              the content manually.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSkill}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="skill-name">Skill Name</Label>
                <Input
                  id="skill-name"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="my-skill"
                  required
                  className="bg-background/50"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="skill-description">Description</Label>
                <Input
                  id="skill-description"
                  value={newSkillDescription}
                  onChange={(e) => setNewSkillDescription(e.target.value)}
                  placeholder="What this skill does..."
                  className="bg-background/50"
                />
              </div>
              <div className="grid gap-2">
                <Label>Upload ZIP (optional)</Label>
                <Input
                  type="file"
                  accept=".zip"
                  onChange={handleZipChange}
                  className="bg-background/50"
                />
              </div>
              {!zipFile && (
                <div className="grid gap-2">
                  <Label htmlFor="skill-md">SKILL.md Content</Label>
                  <Textarea
                    id="skill-md"
                    value={newSkillMd}
                    onChange={(e) => setNewSkillMd(e.target.value)}
                    placeholder="# My Skill&#10;&#10;This skill helps the robot..."
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
                onClick={() => setCreateSkillOpen(false)}
                disabled={isCreatingSkill}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingSkill || !newSkillName || (!zipFile && !newSkillMd)}
              >
                {isCreatingSkill && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Skill Dialog */}
      <Dialog open={!!editSkill} onOpenChange={() => setEditSkill(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Skill</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-skill-name">Skill Name</Label>
              <Input
                id="edit-skill-name"
                value={editSkillName}
                onChange={(e) => setEditSkillName(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-skill-description">Description</Label>
              <Input
                id="edit-skill-description"
                value={editSkillDescription}
                onChange={(e) => setEditSkillDescription(e.target.value)}
                className="bg-background/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-skill-md">SKILL.md Content</Label>
              <Textarea
                id="edit-skill-md"
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
              disabled={isSavingSkill}
            >
              Cancel
            </Button>
            <Button onClick={handleEditSkill} disabled={isSavingSkill}>
              {isSavingSkill && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Skill Dialog */}
      <Dialog open={!!deleteSkillId} onOpenChange={() => setDeleteSkillId(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Delete Skill</DialogTitle>
            <DialogDescription>
              This will permanently delete this skill. The robot will receive the
              deletion event on its next connection.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteSkillId(null)}
              disabled={isDeletingSkill}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSkill} disabled={isDeletingSkill}>
              {isDeletingSkill && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
