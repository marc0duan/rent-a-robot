"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { ApiClientError } from "@/lib/api/client"
import { toast } from "sonner"
import { Loader2, Plus, Building2, LogOut, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export default function SelectTenantPage() {
  const { user, tenants, selectTenant, createTenant, logout } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [view, setView] = useState<"select" | "create">("select")
  
  // Form state for creating tenant
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")

  // Determine initial view based on tenants availability
  useEffect(() => {
    if (user && tenants && tenants.length === 0) {
      setView("create")
    }
  }, [user, tenants])

  const handleSelectTenant = async (tenantId: string) => {
    setIsLoading(true)
    try {
      await selectTenant(tenantId)
      toast.success("Organization selected")
      router.push("/dashboard")
    } catch (error) {
       // Check if error is ApiClientError, otherwise generic message
       if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to select organization")
      }
      setIsLoading(false)
    }
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error("Session expired. Please sign in again.")
      router.push("/login")
      return
    }
    setIsLoading(true)
    try {
      await createTenant({ name, slug })
      toast.success("Organization created")
      router.push("/dashboard")
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 401) {
          toast.error("Session expired. Please sign in again.")
          router.push("/login")
          return
        }
        toast.error(error.message)
      } else {
        toast.error("Failed to create organization")
      }
      setIsLoading(false)
    }
  }

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, "-")) {
      setSlug(newName.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-"))
    }
  }

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  if (!user) {
    return null // Or loading spinner, but layout handles it mostly
  }

  return (
    <Card className="w-full border-zinc-800 bg-zinc-950/50 shadow-2xl backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold tracking-tight">
            {view === "select" ? "Select Organization" : "Create Organization"}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
            <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Button>
        </div>
        <CardDescription>
          {view === "select" 
            ? "Choose an organization to continue" 
            : "Set up a new workspace for your team"}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {view === "select" ? (
          <div className="space-y-4">
            {tenants && tenants.length > 0 ? (
              <div className="grid gap-2">
                {tenants.map((entry) => (
                  <button
                    key={entry.tenantId}
                    onClick={() => handleSelectTenant(entry.tenantId)}
                    disabled={isLoading}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-left transition-all hover:bg-zinc-800/50 hover:border-zinc-700 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{entry.tenant.name}</div>
                        <div className="text-xs text-muted-foreground">{entry.tenant.slug}</div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No organizations found.
              </div>
            )}
            
            <Separator className="my-4 bg-zinc-800" />
            
            <Button 
              variant="outline" 
              className="w-full border-dashed border-zinc-700 bg-transparent hover:bg-zinc-900 hover:text-foreground hover:border-zinc-600"
              onClick={() => setView("create")}
              disabled={isLoading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Organization
            </Button>
          </div>
        ) : (
          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                placeholder="Acme Corp"
                value={name}
                onChange={handleNameChange}
                disabled={isLoading}
                required
                className="bg-background/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-input focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring">
                <span className="flex select-none items-center pl-3 text-muted-foreground sm:text-sm">
                  perseus.app/
                </span>
                <input
                  type="text"
                  name="slug"
                  id="slug"
                  className="block flex-1 border-0 bg-transparent py-2 pl-1 text-foreground placeholder:text-muted-foreground focus:ring-0 sm:text-sm sm:leading-6"
                  placeholder="acme-corp"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <p className="text-[0.8rem] text-muted-foreground">
                This will be your organization's unique identifier.
              </p>
            </div>
            
            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Organization
              </Button>
              {tenants && tenants.length > 0 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setView("select")}
                  disabled={isLoading}
                  className="w-full"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
