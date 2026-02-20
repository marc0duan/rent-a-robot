"use client"

import { Bot } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

interface AboutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-zinc-800 bg-zinc-950 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">About Perseus</DialogTitle>
          <DialogDescription className="sr-only">Application information</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Bot className="h-8 w-8" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold">Perseus</h2>
            <p className="text-sm text-muted-foreground">
              Multi-tenant AI Robot Management Platform
            </p>
          </div>
          <Separator className="bg-zinc-800" />
          <div className="text-center text-sm text-muted-foreground">
            <p>Version {APP_VERSION}</p>
            <p className="mt-1">&copy; {new Date().getFullYear()} Perseus. All rights reserved.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
