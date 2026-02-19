"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api/client"
import { ApiClientError } from "@/lib/api/client"
import { toast } from "sonner"
import {
  Key,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Shield,
  User,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface ApiKeyInfo {
  id: string
  name: string
  prefix: string
  scope: string
  expiresAt: string | null
  createdAt: string
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newScope, setNewScope] = useState<"tenant" | "user">("user")
  const [isCreating, setIsCreating] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // One-time key display
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.apiKeys.list()
      setKeys(res.apiKeys)
    } catch {
      toast.error("Failed to load API keys")
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
      const res = await api.apiKeys.create({ name: newName, scope: newScope })
      setRevealedKey(res.apiKey.key)
      setCreateOpen(false)
      setNewName("")
      setNewScope("user")
      load()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to create API key")
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await api.apiKeys.delete(deleteId)
      toast.success("API key revoked")
      setDeleteId(null)
      setIsLoading(true)
      load()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to delete API key")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCopy = async () => {
    if (!revealedKey) return
    await navigator.clipboard.writeText(revealedKey)
    setCopied(true)
    toast.success("API key copied")
    setTimeout(() => setCopied(false), 2000)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    })

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="mt-1 text-muted-foreground">
            Manage API keys for programmatic access
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Key
        </Button>
      </div>

      {/* Keys Table */}
      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Key className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No API keys yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First API Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow
                    key={key.id}
                    className="border-zinc-800 hover:bg-zinc-900/50"
                  >
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground">
                        {key.prefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          key.scope === "tenant" ? "default" : "secondary"
                        }
                        className="gap-1"
                      >
                        {key.scope === "tenant" ? (
                          <Shield className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {key.scope}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell>
                      {key.expiresAt ? (
                        isExpired(key.expiresAt) ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Expired
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {formatDate(key.expiresAt)}
                          </span>
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Never
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteId(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              The full key will only be shown once after creation. Store it
              securely.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="key-name">Name</Label>
                <Input
                  id="key-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Production API Key"
                  required
                  className="bg-background/50"
                />
              </div>
              <div className="grid gap-2">
                <Label>Scope</Label>
                <Select
                  value={newScope}
                  onValueChange={(v) => setNewScope(v as "tenant" | "user")}
                >
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      User — Access your personal resources
                    </SelectItem>
                    <SelectItem value="tenant">
                      Tenant — Access organization-wide resources
                    </SelectItem>
                  </SelectContent>
                </Select>
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

      {/* Key Revealed Dialog */}
      <Dialog
        open={!!revealedKey}
        onOpenChange={() => {
          setRevealedKey(null)
          setCopied(false)
        }}
      >
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy this key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
              <code className="break-all text-xs text-emerald-400">
                {revealedKey}
              </code>
            </div>
            <Button variant="outline" className="w-full" onClick={handleCopy}>
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
            <div className="flex items-start gap-2 rounded-md border border-amber-900/50 bg-amber-950/30 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-400">
                This key will not be shown again. Make sure to store it in a
                secure location.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setRevealedKey(null)
                setCopied(false)
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              This will permanently revoke this API key. Any services using it
              will lose access. This action cannot be undone.
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
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
