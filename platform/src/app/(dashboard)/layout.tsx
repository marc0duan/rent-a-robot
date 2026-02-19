"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Bot,
  MessageSquare,
  Key,
  Building2,
  LogOut,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/robots", label: "Robots", icon: Bot },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/tenants", label: "Tenant", icon: Building2 },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, tenant, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
    if (!isLoading && user && !tenant) {
      router.push("/select-tenant")
    }
  }, [user, tenant, isLoading, router])

  if (isLoading || !user || !tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-zinc-800 bg-zinc-950">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Perseus</span>
        </div>

        {/* Tenant info */}
        <div className="border-b border-zinc-800 px-4 py-3">
          <div className="text-xs font-medium text-muted-foreground">Organization</div>
          <div className="mt-0.5 truncate text-sm font-medium">{tenant.name}</div>
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 px-3 py-2">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-zinc-800 text-foreground"
                      : "text-muted-foreground hover:bg-zinc-900 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        <Separator className="bg-zinc-800" />

        {/* User */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="truncate text-sm font-medium">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleLogout}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
