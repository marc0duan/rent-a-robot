"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Loader2 } from "lucide-react"

export default function RootPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 shadow-2xl ring-1 ring-zinc-800">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 opacity-50 blur-xl" />
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
        <div className="text-sm font-medium text-zinc-500 animate-pulse">
          Loading Perseus...
        </div>
      </div>
    </div>
  )
}
