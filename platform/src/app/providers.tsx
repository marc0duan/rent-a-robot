"use client";

import { AuthProvider } from "@/hooks/use-auth";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    </AuthProvider>
  );
}
