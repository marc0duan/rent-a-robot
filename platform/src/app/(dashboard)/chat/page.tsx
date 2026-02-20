"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { api } from "@/lib/api/client"
import { ApiClientError } from "@/lib/api/client"
import { toast } from "sonner"
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Hash,
  Search,
  Plus,
  Loader2,
  Paperclip,
  FileIcon,
  Download,
  X,
  Settings,
  Trash2,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
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
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface ChatGroupInfo {
  id: string
  name: string
  teamId: string
  createdById: string
  createdAt: string
  _count: { members: number; messages: number }
  team: { id: string; name: string }
}

interface MessageInfo {
  id: string
  chatGroupId: string
  senderId: string
  senderType: string
  content: string
  mentions: string[] | null
  createdAt: string
  updatedAt: string
  sender: { name: string; type: string }
}

interface FileInfo {
  id: string
  filename: string
  size: number
  mimeType: string
  createdAt: string
  path: string
  scope: string
  scopeId: string
  uploadedById: string
}

export default function ChatPage() {
  const [groups, setGroups] = useState<ChatGroupInfo[]>([])
  const [filteredGroups, setFilteredGroups] = useState<ChatGroupInfo[]>([])
  const [search, setSearch] = useState("")
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageInfo[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [messageText, setMessageText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [files, setFiles] = useState<FileInfo[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isFileListOpen, setIsFileListOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // @mention
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState("")
  const [debouncedMentionSearch, setDebouncedMentionSearch] = useState("")
  const [members, setMembers] = useState<
    Array<{ id: string; name: string; type: string }>
  >([])

  // Dialog states
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [createGroupName, setCreateGroupName] = useState("")
  const [createGroupTeamId, setCreateGroupTeamId] = useState("")
  const [createGroupTeams, setCreateGroupTeams] = useState<Array<{ id: string; name: string }>>([])
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)

  const [editGroupOpen, setEditGroupOpen] = useState(false)
  const [editGroupName, setEditGroupName] = useState("")
  const [isEditingGroup, setIsEditingGroup] = useState(false)

  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)

  const [membersOpen, setMembersOpen] = useState(false)
  const [memberType, setMemberType] = useState<"human" | "robot">("human")
  const [availableRobots, setAvailableRobots] = useState<Array<{ id: string; name: string; status: string }>>([])
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [userSearchResults, setUserSearchResults] = useState<Array<{ id: string; name: string; email: string; avatar: string | null }>>([])
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string; avatar: string | null } | null>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce mention search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedMentionSearch(mentionSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [mentionSearch])

  const loadGroups = useCallback(async () => {
    try {
      const res = await api.chatGroups.list()
      setGroups(res.chatgroups)
      setFilteredGroups(res.chatgroups)
    } catch {
      toast.error("Failed to load chat groups")
    } finally {
      setIsLoadingGroups(false)
    }
  }, [])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  useEffect(() => {
    if (!search) {
      setFilteredGroups(groups)
    } else {
      setFilteredGroups(
        groups.filter(
          (g) =>
            g.name.toLowerCase().includes(search.toLowerCase()) ||
            g.team.name.toLowerCase().includes(search.toLowerCase())
        )
      )
    }
  }, [search, groups])

  const loadMessages = useCallback(async (groupId: string) => {
    setIsLoadingMessages(true)
    try {
      const res = await api.messages.list(groupId)
      setMessages(res.messages)
    } catch {
      toast.error("Failed to load messages")
    } finally {
      setIsLoadingMessages(false)
    }
  }, [])

  const loadFiles = useCallback(async (groupId: string) => {
    try {
      const res = await api.files.list(groupId)
      setFiles(res.files as FileInfo[])
    } catch {
      toast.error("Failed to load files")
    }
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeGroupId) return

    setIsUploading(true)
    try {
      await api.files.upload(activeGroupId, file)
      toast.success("File uploaded")
      loadFiles(activeGroupId)
    } catch {
      toast.error("Failed to upload file")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const bytesToSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  useEffect(() => {
    if (!activeGroupId) return

    loadFiles(activeGroupId)

    const cleanup = api.messages.subscribe(activeGroupId, (event: unknown) => {
      const evt = event as { type?: string; message?: MessageInfo }
      if (evt.type === "new_message" && evt.message) {
        setMessages((prev) => [...prev, evt.message as MessageInfo])
      }
    })

    return () => {
      cleanup()
    }
  }, [activeGroupId, loadFiles])

  const loadMembers = useCallback(async (groupId: string) => {
    try {
      const res = await api.chatGroups.get(groupId)
      const membersData = res.chatgroup.members.map((m) => ({
        id: m.memberId,
        name: m.user?.name || m.robot?.name || "Unknown",
        type: m.memberType,
      }))
      setMembers(membersData)
    } catch {
      toast.error("Failed to load members")
    }
  }, [])

  const selectGroup = (groupId: string) => {
    setActiveGroupId(groupId)
    loadMessages(groupId)
    loadMembers(groupId)
  }

  // Open create group dialog
  const openCreateGroup = async () => {
    setCreateGroupName("")
    setCreateGroupTeamId("")
    setCreateGroupOpen(true)
    try {
      const res = await api.teams.list()
      setCreateGroupTeams(res.teams)
    } catch {
      toast.error("Failed to load teams")
    }
  }

  // Create group handler
  const handleCreateGroup = async () => {
    if (!createGroupName.trim() || !createGroupTeamId) return
    setIsCreatingGroup(true)
    try {
      await api.chatGroups.create({
        name: createGroupName.trim(),
        teamId: createGroupTeamId,
      })
      toast.success("Group created")
      setCreateGroupOpen(false)
      loadGroups()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to create group")
      }
    } finally {
      setIsCreatingGroup(false)
    }
  }

  // Open edit group dialog
  const openEditGroup = () => {
    if (!activeGroup) return
    setEditGroupName(activeGroup.name)
    setEditGroupOpen(true)
  }

  // Edit group handler
  const handleEditGroup = async () => {
    if (!editGroupName.trim() || !activeGroupId) return
    setIsEditingGroup(true)
    try {
      await api.chatGroups.update(activeGroupId, { name: editGroupName.trim() })
      toast.success("Group updated")
      setEditGroupOpen(false)
      loadGroups()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to update group")
      }
    } finally {
      setIsEditingGroup(false)
    }
  }

  // Delete group handler
  const handleDeleteGroup = async () => {
    if (!activeGroupId) return
    setIsDeletingGroup(true)
    try {
      await api.chatGroups.delete(activeGroupId)
      toast.success("Group deleted")
      setDeleteGroupOpen(false)
      setActiveGroupId(null)
      setMessages([])
      setMembers([])
      loadGroups()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to delete group")
      }
    } finally {
      setIsDeletingGroup(false)
    }
  }

  // Open members panel
  const openMembersPanel = async () => {
    setMembersOpen(true)
    setMemberType("human")
    setSelectedMemberId("")
    setSelectedUser(null)
    setUserSearchQuery("")
    setUserSearchResults([])
    try {
      const res = await api.robots.list()
      setAvailableRobots(res.robots)
    } catch {
      toast.error("Failed to load robots")
    }
  }

  // Debounced user search for member addition
  useEffect(() => {
    if (memberType !== "human" || userSearchQuery.trim().length === 0) {
      setUserSearchResults([])
      return
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await api.users.search(userSearchQuery.trim())
        setUserSearchResults(res.users)
      } catch {
        // ignore search errors
      }
    }, 300)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [userSearchQuery, memberType])

  // Add member handler
  const handleAddMember = async () => {
    if (!selectedMemberId || !activeGroupId) return
    setIsAddingMember(true)
    try {
      await api.chatGroups.addMember(activeGroupId, {
        memberId: selectedMemberId,
        memberType,
      })
      toast.success("Member added")
      setSelectedMemberId("")
      setSelectedUser(null)
      loadMembers(activeGroupId)
      loadGroups()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to add member")
      }
    } finally {
      setIsAddingMember(false)
    }
  }

  // Remove member handler
  const handleRemoveMember = async (memberId: string) => {
    if (!activeGroupId) return
    try {
      await api.chatGroups.removeMember(activeGroupId, memberId)
      toast.success("Member removed")
      loadMembers(activeGroupId)
      loadGroups()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to remove member")
      }
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!messageText.trim() || !activeGroupId) return
    setIsSending(true)
    try {
      await api.messages.send(activeGroupId, { content: messageText.trim() })
      setMessageText("")
      loadMessages(activeGroupId)
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to send message")
      }
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setMessageText(val)

    // Check for @mention trigger
    const cursorPos = e.target.selectionStart
    const textBefore = val.slice(0, cursorPos)
    const atMatch = textBefore.match(/@(\w*)$/)
    if (atMatch) {
      setShowMentions(true)
      setMentionSearch(atMatch[1])
    } else {
      setShowMentions(false)
    }
  }

  const insertMention = (name: string) => {
    const cursorPos = textareaRef.current?.selectionStart ?? messageText.length
    const textBefore = messageText.slice(0, cursorPos)
    const textAfter = messageText.slice(cursorPos)
    const atIdx = textBefore.lastIndexOf("@")
    const newText = textBefore.slice(0, atIdx) + `@${name} ` + textAfter
    setMessageText(newText)
    setShowMentions(false)
    textareaRef.current?.focus()
  }

  const activeGroup = groups.find((g) => g.id === activeGroupId)

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(debouncedMentionSearch.toLowerCase())
  )

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="-mx-6 -my-8 flex h-screen">
      {/* Left Panel — Group List */}
      <div className="flex w-72 flex-col border-r border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-800 p-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background/50 pl-9"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 h-8 w-8 shrink-0"
            onClick={openCreateGroup}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {isLoadingGroups ? (
            <div className="space-y-2 p-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-center text-xs text-muted-foreground">
                {search ? "No matching groups" : "No chat groups yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 p-2">
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => selectGroup(group.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                    activeGroupId === group.id
                      ? "bg-zinc-800 text-foreground"
                      : "text-muted-foreground hover:bg-zinc-900 hover:text-foreground"
                  )}
                >
                  <Hash className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {group.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {group.team.name}
                    </div>
                  </div>
                  {group._count.messages > 0 && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[10px]"
                    >
                      {group._count.messages}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Right Panel — Messages */}
      <div className="flex flex-1 flex-col bg-background">
        {!activeGroupId ? (
          <div className="flex flex-1 flex-col items-center justify-center">
            <MessageSquare className="mb-4 h-16 w-16 text-muted-foreground/20" />
            <p className="text-lg font-medium text-muted-foreground">
              Select a chat group
            </p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Choose a group from the left to start chatting
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{activeGroup?.name}</span>
                <Badge variant="outline" className="text-xs">
                  {activeGroup?.team.name}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  onClick={openMembersPanel}
                >
                  <Users className="mr-1 h-3.5 w-3.5" />
                  {activeGroup?._count.members}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("h-8 w-8", isFileListOpen && "bg-zinc-800")}
                  onClick={() => setIsFileListOpen(!isFileListOpen)}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={openEditGroup}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:text-destructive"
                  onClick={() => setDeleteGroupOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Messages — 60% viewer area */}
              <ScrollArea className="flex-1 px-4 py-4">
                {isLoadingMessages ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <MessageSquare className="mb-4 h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => {
                    const isRobot = msg.senderType === "robot"
                    const showDate =
                      idx === 0 ||
                      formatDate(messages[idx - 1].createdAt) !==
                        formatDate(msg.createdAt)
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="my-4 flex items-center gap-4">
                            <Separator className="flex-1 bg-zinc-800" />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(msg.createdAt)}
                            </span>
                            <Separator className="flex-1 bg-zinc-800" />
                          </div>
                        )}
                        <div className="flex gap-3">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                              isRobot
                                ? "bg-emerald-950 text-emerald-400"
                                : "bg-zinc-800 text-zinc-400"
                            )}
                          >
                            {isRobot ? (
                              <Bot className="h-4 w-4" />
                            ) : (
                              <User className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span
                                className={cn(
                                  "text-sm font-semibold",
                                  isRobot
                                    ? "text-emerald-400"
                                    : "text-foreground"
                                )}
                              >
                                {msg.sender.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(msg.createdAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground/90">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
              </ScrollArea>
              {isFileListOpen && (
                <div className="w-64 border-l border-zinc-800 bg-zinc-950/30">
                  <div className="flex items-center justify-between border-b border-zinc-800 p-3">
                    <span className="text-sm font-medium">Shared Files</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsFileListOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <ScrollArea className="h-full">
                    {files.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                        <FileIcon className="mb-2 h-8 w-8 opacity-20" />
                        <p className="text-xs">No files shared</p>
                      </div>
                    ) : (
                      <div className="space-y-1 p-2">
                        {files.map((file) => (
                          <div key={file.id} className="group flex items-start gap-3 rounded-md p-2 hover:bg-zinc-800/50">
                            <div className="mt-1 rounded bg-zinc-800 p-1">
                              <FileIcon className="h-4 w-4 text-zinc-400" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="truncate text-sm font-medium text-foreground">{file.filename}</p>
                              <p className="text-xs text-muted-foreground">{bytesToSize(file.size)}</p>
                              <a
                                href={api.files.downloadUrl(file.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                <Download className="h-3 w-3" />
                                Download
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Editor — 40% area (input) */}
            <div className="border-t border-zinc-800 p-4">
              <div className="relative">
                {showMentions && filteredMembers.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-zinc-800 bg-zinc-950 py-1 shadow-xl">
                    {filteredMembers.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => insertMention(m.name)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-900"
                      >
                        {m.type === "robot" ? (
                          <Bot className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <User className="h-4 w-4 text-blue-400" />
                        )}
                        <span>{m.name}</span>
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px]"
                        >
                          {m.type}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Paperclip className="h-5 w-5" />
                    )}
                  </Button>
                  <Textarea
                    ref={textareaRef}
                    value={messageText}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message #${activeGroup?.name ?? ""}...`}
                    rows={1}
                    className="min-h-[40px] resize-none bg-zinc-900/50"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!messageText.trim() || isSending}
                    className="h-10 w-10 shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Type @ to mention a team member. Press Enter to send, Shift+Enter for new line.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Create Chat Group</DialogTitle>
            <DialogDescription>
              Create a new chat group for your team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={createGroupName}
                onChange={(e) => setCreateGroupName(e.target.value)}
                placeholder="e.g., general, random, project-alpha"
                className="bg-background/50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="group-team">Team</Label>
              <Select value={createGroupTeamId} onValueChange={setCreateGroupTeamId}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select a team..." />
                </SelectTrigger>
                <SelectContent>
                  {createGroupTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateGroupOpen(false)} disabled={isCreatingGroup}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={isCreatingGroup || !createGroupName.trim() || !createGroupTeamId}>
              {isCreatingGroup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Edit Chat Group</DialogTitle>
            <DialogDescription>
              Update the chat group name.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-group-name">Group Name</Label>
              <Input
                id="edit-group-name"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                className="bg-background/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGroupOpen(false)} disabled={isEditingGroup}>
              Cancel
            </Button>
            <Button onClick={handleEditGroup} disabled={isEditingGroup || !editGroupName.trim()}>
              {isEditingGroup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Group Dialog */}
      <Dialog open={deleteGroupOpen} onOpenChange={setDeleteGroupOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950">
          <DialogHeader>
            <DialogTitle>Delete Chat Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{activeGroup?.name}"? This action cannot be undone and all messages will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGroupOpen(false)} disabled={isDeletingGroup}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGroup} disabled={isDeletingGroup}>
              {isDeletingGroup && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Panel Dialog */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Members</DialogTitle>
            <DialogDescription>
              Add or remove members from this chat group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add Member Section */}
            <div className="space-y-2">
              <Label>Add Member</Label>
              <div className="flex gap-2">
                <Select
                  value={memberType}
                  onValueChange={(v) => {
                    setMemberType(v as "human" | "robot")
                    setSelectedMemberId("")
                  }}
                >
                  <SelectTrigger className="w-24 bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="human">Human</SelectItem>
                    <SelectItem value="robot">Robot</SelectItem>
                  </SelectContent>
                </Select>
                {memberType === "robot" ? (
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger className="flex-1 bg-background/50">
                      <SelectValue placeholder="Select a robot..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRobots.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} ({r.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={userSearchOpen}
                        className="flex-1 justify-start bg-background/50 font-normal"
                      >
                        {selectedUser ? (
                          <div className="flex items-center gap-2">
                            <Avatar size="sm">
                              {selectedUser.avatar && (
                                <AvatarImage src={selectedUser.avatar} alt={selectedUser.name} />
                              )}
                              <AvatarFallback>
                                {selectedUser.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{selectedUser.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Search users...</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Type a name or email..."
                          value={userSearchQuery}
                          onValueChange={setUserSearchQuery}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {userSearchQuery.trim().length === 0
                              ? "Start typing to search..."
                              : "No users found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {userSearchResults.map((u) => (
                              <CommandItem
                                key={u.id}
                                value={u.id}
                                onSelect={() => {
                                  setSelectedUser(u)
                                  setSelectedMemberId(u.id)
                                  setUserSearchOpen(false)
                                }}
                              >
                                <Avatar size="sm">
                                  {u.avatar && <AvatarImage src={u.avatar} alt={u.name} />}
                                  <AvatarFallback>
                                    {u.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="ml-2">
                                  <div className="text-sm font-medium">{u.name}</div>
                                  <div className="text-xs text-muted-foreground">{u.email}</div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <Button
                onClick={handleAddMember}
                disabled={isAddingMember || !selectedMemberId}
                size="sm"
                className="w-full"
              >
                {isAddingMember && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Member
              </Button>
            </div>

            <Separator className="bg-zinc-800" />

            {/* Current Members List */}
            <div className="space-y-2">
              <Label>Current Members ({members.length})</Label>
              <ScrollArea className="h-48">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No members</p>
                ) : (
                  <div className="space-y-1">
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-zinc-900/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800">
                            {m.type === "robot" ? (
                              <Bot className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <User className="h-4 w-4 text-blue-400" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{m.name}</div>
                            <div className="text-xs text-muted-foreground">{m.type}</div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleRemoveMember(m.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
