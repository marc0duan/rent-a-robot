"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api/client"
import { toast } from "sonner"
import {
  Users,
  Bot,
  MessageSquare,
  Key,
  Activity,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardStats {
  teams: number
  robots: number
  chatGroups: number
  apiKeys: number
}

export default function DashboardPage() {
  const { user, tenant } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [teamsRes, robotsRes, chatGroupsRes, apiKeysRes] =
          await Promise.all([
            api.teams.list(),
            api.robots.list(),
            api.chatGroups.list(),
            api.apiKeys.list(),
          ])
        setStats({
          teams: teamsRes.teams.length,
          robots: robotsRes.robots.length,
          chatGroups: chatGroupsRes.chatgroups.length,
          apiKeys: apiKeysRes.apiKeys.length,
        })
      } catch {
        toast.error("Failed to load dashboard data")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const cards = [
    {
      label: "Teams",
      value: stats?.teams ?? 0,
      icon: Users,
      href: "/teams",
      color: "text-blue-400",
    },
    {
      label: "Robots",
      value: stats?.robots ?? 0,
      icon: Bot,
      href: "/robots",
      color: "text-emerald-400",
    },
    {
      label: "Chat Groups",
      value: stats?.chatGroups ?? 0,
      icon: MessageSquare,
      href: "/chat",
      color: "text-violet-400",
    },
    {
      label: "API Keys",
      value: stats?.apiKeys ?? 0,
      icon: Key,
      href: "/api-keys",
      color: "text-amber-400",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back, {user?.name}. Here&apos;s your {tenant?.name} overview.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="border-zinc-800 bg-zinc-950/50 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className={cn("h-4 w-4", card.color)} />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{card.value}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/teams"
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-medium">Manage Teams</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            href="/robots"
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50"
          >
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-medium">Configure Robots</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            href="/chat"
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-violet-400" />
              <span className="text-sm font-medium">Open Chat</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Status */}
      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-emerald-400" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-sm text-muted-foreground">
              All systems operational
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ")
}
