"use client"

import { useState } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { User, Info } from "lucide-react"
import { ProfileModal } from "@/components/profile-modal"
import { AboutModal } from "@/components/about-modal"

interface UserAvatarProps {
  name: string
  avatar?: string | null
  size?: "default" | "sm" | "lg"
  className?: string
  showMenu?: boolean
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function UserAvatar({
  name,
  avatar,
  size = "default",
  className,
  showMenu = true,
}: UserAvatarProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const avatarElement = (
    <Avatar size={size} className={className}>
      {avatar && <AvatarImage src={avatar} alt={name} />}
      <AvatarFallback>{getInitials(name)}</AvatarFallback>
    </Avatar>
  )

  if (!showMenu) return avatarElement

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {avatarElement}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAboutOpen(true)}>
            <Info className="mr-2 h-4 w-4" />
            About
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      <AboutModal open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  )
}
