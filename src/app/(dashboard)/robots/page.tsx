"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api/client"
import { toast } from "sonner"
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { 
  Plus, 
  Bot, 
  Cpu, 
  Terminal, 
  Copy, 
  Check, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  Power,
  Link
} from "lucide-react"

// Robot type definition based on expected API response
interface Robot {
  id: string
  name: string
  status: "online" | "offline" | "created" | "onboarding"
  soulMd: string
  createdAt: string
  updatedAt: string
}

export default function RobotManagementPage() {
  const { user } = useAuth()
  const [robots, setRobots] = useState<Robot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all")
  
  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  
  // Form/Action states
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null)
  const [robotName, setRobotName] = useState("")
  const [soulMd, setSoulMd] = useState("")
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const fetchRobots = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.robots.list()
      setRobots(data.robots || [])
    } catch (error) {
      console.error("Failed to fetch robots:", error)
      toast.error("Failed to load robots")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRobots()
  }, [fetchRobots])

  const handleCreate = async () => {
    if (!robotName.trim()) return
    
    try {
      setIsSubmitting(true)
      await api.robots.create({ name: robotName, soulMd })
      toast.success("Robot created successfully")
      setIsCreateOpen(false)
      resetForm()
      fetchRobots()
    } catch (error) {
      console.error("Failed to create robot:", error)
      toast.error("Failed to create robot")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedRobot || !robotName.trim()) return

    try {
      setIsSubmitting(true)
      await api.robots.update(selectedRobot.id, { name: robotName, soulMd })
      toast.success("Robot updated successfully")
      setIsEditOpen(false)
      resetForm()
      fetchRobots()
    } catch (error) {
      console.error("Failed to update robot:", error)
      toast.error("Failed to update robot")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRobot) return

    try {
      setIsSubmitting(true)
      await api.robots.delete(selectedRobot.id)
      toast.success("Robot deleted successfully")
      setIsDeleteOpen(false)
      setSelectedRobot(null)
      fetchRobots()
    } catch (error) {
      console.error("Failed to delete robot:", error)
      toast.error("Failed to delete robot")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateToken = async () => {
    if (!selectedRobot) return

    try {
      setIsSubmitting(true)
      // Assuming api.robots.update returns the updated robot with a token or the token itself
      // Adjusting based on common patterns, but prompt says:
      // "Generate Token" button → api.robots.update(id, { generateToken: true }) → shows the returned token
      const response = await api.robots.update(selectedRobot.id, { generateToken: true })
      
      if (response && response.token) {
        setGeneratedToken(response.token)
        toast.success("Token generated successfully")
      } else {
        // Fallback if API structure is different, though prompt implies it returns token
        toast.error("Token generation failed or format unexpected")
      }
    } catch (error) {
      console.error("Failed to generate token:", error)
      toast.error("Failed to generate token")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setRobotName("")
    setSoulMd("")
    setGeneratedToken(null)
    setCopiedToken(false)
    setCopiedUrl(false)
    setSelectedRobot(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsCreateOpen(true)
  }

  const openEditDialog = (robot: Robot) => {
    setSelectedRobot(robot)
    setRobotName(robot.name)
    setSoulMd(robot.soulMd || "")
    setIsEditOpen(true)
  }

  const openAssignDialog = (robot: Robot) => {
    resetForm()
    setSelectedRobot(robot)
    setIsAssignOpen(true)
  }

  const openDeleteDialog = (robot: Robot) => {
    setSelectedRobot(robot)
    setIsDeleteOpen(true)
  }

  const copyToClipboard = (text: string, isUrl = false) => {
    navigator.clipboard.writeText(text)
    if (isUrl) {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } else {
      setCopiedToken(true)
      setTimeout(() => setCopiedToken(false), 2000)
    }
    toast.success("Copied to clipboard")
  }

  const filteredRobots = robots.filter(robot => {
    if (filter === "all") return true
    if (filter === "online") return robot.status === "online"
    if (filter === "offline") return robot.status === "offline"
    return true
  })

  const getStatusBadgeVariant = (status: Robot["status"]) => {
    switch (status) {
      case "online": return "default" // Greenish usually
      case "offline": return "destructive"
      case "created": return "secondary"
      case "onboarding": return "outline"
      default: return "secondary"
    }
  }

  const getStatusLabel = (status: Robot["status"]) => {
    switch (status) {
      case "online": return "Online"
      case "offline": return "Offline"
      case "created": return "Ready to Assign"
      case "onboarding": return "Onboarding"
      default: return status
    }
  }

  const platformUrl = typeof window !== 'undefined' ? window.location.origin : '...'

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            Robot Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your fleet of autonomous agents and assign them to physical hardware.
          </p>
        </div>
        <Button onClick={openCreateDialog} size="lg" className="shadow-lg hover:shadow-xl transition-all">
          <Plus className="mr-2 h-5 w-5" />
          Create Robot
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 bg-muted/30 p-1 rounded-lg w-fit border border-border/50">
        <Button
          variant={filter === "all" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("all")}
          className="text-sm font-medium transition-all"
        >
          All Robots
        </Button>
        <Button
          variant={filter === "online" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("online")}
          className="text-sm font-medium transition-all text-green-600 dark:text-green-400"
        >
          Online
        </Button>
        <Button
          variant={filter === "offline" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setFilter("offline")}
          className="text-sm font-medium transition-all text-destructive"
        >
          Offline
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-[280px] overflow-hidden border-border/40 bg-card/50">
              <CardHeader className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredRobots.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/5">
          <div className="bg-background p-4 rounded-full shadow-sm mb-4">
            <Bot className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No robots found</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-sm">
            {filter === "all" 
              ? "Get started by creating your first autonomous agent." 
              : `No robots found with status "${filter}".`}
          </p>
          {filter === "all" && (
            <Button onClick={openCreateDialog} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create Robot
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRobots.map((robot) => (
            <Card key={robot.id} className="group overflow-hidden border-border/40 hover:border-primary/50 transition-all duration-300 hover:shadow-md bg-card">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold truncate flex items-center gap-2">
                    {robot.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Cpu className="h-3 w-3" />
                    ID: {robot.id.substring(0, 8)}...
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(robot.status)} className="capitalize shadow-sm">
                  {getStatusLabel(robot.status)}
                </Badge>
              </CardHeader>
              
              <CardContent className="pb-3 pt-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Created</span>
                    <span className="font-mono text-xs">{new Date(robot.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Active</span>
                    <span className="font-mono text-xs">{new Date(robot.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <Separator className="my-4 opacity-50" />
                
                <div className="h-16 overflow-hidden relative">
                  <p className="text-xs text-muted-foreground line-clamp-3 font-mono opacity-80 bg-muted/30 p-2 rounded border border-border/30">
                    {robot.soulMd || "// No soul defined yet..."}
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                </div>
              </CardContent>
              
              <CardFooter className="pt-2 gap-2 flex-wrap">
                {(robot.status === "created" || robot.status === "onboarding") && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1 bg-primary/90 hover:bg-primary"
                    onClick={() => openAssignDialog(robot)}
                  >
                    <Terminal className="mr-2 h-3.5 w-3.5" />
                    Assign PC
                  </Button>
                )}
                
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => openEditDialog(robot)}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Edit
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => openDeleteDialog(robot)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Robot Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Robot</DialogTitle>
            <DialogDescription>
              Define the identity of your new autonomous agent.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Robot Name</Label>
              <Input
                id="name"
                value={robotName}
                onChange={(e) => setRobotName(e.target.value)}
                placeholder="e.g. Perseus-Alpha-01"
                className="col-span-3"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="soul">Soul Definition (Markdown)</Label>
              <Textarea
                id="soul"
                value={soulMd}
                onChange={(e) => setSoulMd(e.target.value)}
                placeholder="Describe the robot's personality, directives, and capabilities..."
                className="h-[200px] font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!robotName.trim() || isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Robot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Robot Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Robot</DialogTitle>
            <DialogDescription>
              Update the configuration for {selectedRobot?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Robot Name</Label>
              <Input
                id="edit-name"
                value={robotName}
                onChange={(e) => setRobotName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-soul">Soul Definition (Markdown)</Label>
              <Textarea
                id="edit-soul"
                value={soulMd}
                onChange={(e) => setSoulMd(e.target.value)}
                className="h-[200px] font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={!robotName.trim() || isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign PC Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Assign PC to {selectedRobot?.name}</DialogTitle>
            <DialogDescription>
              Follow these steps to connect a physical machine to this robot identity.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            {!generatedToken ? (
              <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg border border-dashed border-muted-foreground/30">
                <Cpu className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-center text-sm text-muted-foreground mb-6 max-w-xs">
                  Generate a secure token to authenticate your hardware with the Perseus network.
                </p>
                <Button size="lg" onClick={handleGenerateToken} disabled={isSubmitting}>
                  {isSubmitting ? "Generating..." : "Generate Assignment Token"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Step 1: Copy Token</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 bg-muted rounded-md border p-3 font-mono text-sm truncate">
                      {generatedToken}
                    </div>
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(generatedToken)}>
                      {copiedToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Step 2: Run Onboard Command</Label>
                  <div className="bg-black/90 text-white p-4 rounded-md border border-border shadow-inner font-mono text-sm overflow-x-auto">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2 select-none">
                      <Terminal className="h-3 w-3" />
                      <span>Terminal</span>
                    </div>
                    <p className="whitespace-nowrap">
                      <span className="text-green-500">nanobot</span> onboard --token {generatedToken.substring(0, 8)}...
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Run this command on the machine you want to assign to this robot.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between flex-col sm:flex-row gap-4 sm:gap-0">
            <div className="flex items-center justify-between w-full sm:w-auto gap-2 bg-muted/50 p-2 rounded border border-border/50">
              <div className="flex items-center gap-2 overflow-hidden text-xs text-muted-foreground">
                <span className="shrink-0 font-medium">Platform URL:</span>
                <code className="bg-background px-1.5 py-0.5 rounded border truncate max-w-[150px] sm:max-w-[200px]">{platformUrl}</code>
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(platformUrl, true)}>
                 {copiedUrl ? <Check className="h-3 w-3" /> : <Link className="h-3 w-3" />}
              </Button>
            </div>
            <Button variant="secondary" onClick={() => setIsAssignOpen(false)} className="w-full sm:w-auto">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Robot
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium text-foreground">{selectedRobot?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground bg-destructive/10 p-3 rounded border border-destructive/20">
              Warning: If a physical machine is currently assigned to this robot, it will be disconnected immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
