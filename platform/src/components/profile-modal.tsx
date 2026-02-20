"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api/client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string | null
  avatar: string | null
  gender: string | null
  jobTitle: string | null
  workLocation: string | null
}

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: "",
    avatar: "",
    gender: "",
    jobTitle: "",
    workLocation: "",
  })

  useEffect(() => {
    if (!open) return
    setIsLoading(true)
    api.users
      .getProfile()
      .then((res) => {
        setProfile(res.user)
        setForm({
          name: res.user.name,
          avatar: res.user.avatar ?? "",
          gender: res.user.gender ?? "",
          jobTitle: res.user.jobTitle ?? "",
          workLocation: res.user.workLocation ?? "",
        })
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => setIsLoading(false))
  }, [open])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await api.users.updateProfile({
        name: form.name,
        avatar: form.avatar,
        gender: form.gender,
        jobTitle: form.jobTitle,
        workLocation: form.workLocation,
      })
      setProfile(res.user)
      toast.success("Profile updated")
      onOpenChange(false)
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-zinc-800 bg-zinc-950 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your personal information.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {/* Avatar preview */}
            <div className="flex items-center gap-4">
              <Avatar size="lg">
                {form.avatar && <AvatarImage src={form.avatar} alt={form.name} />}
                <AvatarFallback>{getInitials(form.name || "U")}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="avatar-url">Avatar URL</Label>
                <Input
                  id="avatar-url"
                  placeholder="https://example.com/avatar.png"
                  value={form.avatar}
                  onChange={(e) => setForm((f) => ({ ...f, avatar: e.target.value }))}
                  className="mt-1 bg-background/50"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-background/50"
              />
            </div>

            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                value={profile?.email ?? ""}
                disabled
                className="bg-background/50 opacity-60"
              />
            </div>

            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                value={profile?.phone ?? ""}
                disabled
                className="bg-background/50 opacity-60"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-gender">Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}
              >
                <SelectTrigger id="profile-gender" className="bg-background/50">
                  <SelectValue placeholder="Select gender..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-jobtitle">Job Title</Label>
              <Input
                id="profile-jobtitle"
                value={form.jobTitle}
                onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                placeholder="e.g. Software Engineer"
                className="bg-background/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="profile-location">Work Location</Label>
              <Input
                id="profile-location"
                value={form.workLocation}
                onChange={(e) => setForm((f) => ({ ...f, workLocation: e.target.value }))}
                placeholder="e.g. San Francisco, CA"
                className="bg-background/50"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
