"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

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

export default function ChatPage() {
  const { user } = useAuth()
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

  // @mention
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState("")
  const [members, setMembers] = useState<
    Array<{ id: string; name: string; type: string }>
  >([])

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

  const selectGroup = (groupId: string) => {
    setActiveGroupId(groupId)
    loadMessages(groupId)
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
    m.name.toLowerCase().includes(mentionSearch.toLowerCase())
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
        <div className="border-b border-zinc-800 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background/50 pl-9"
            />
          </div>
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
              <div className="text-xs text-muted-foreground">
                {activeGroup?._count.members} members
              </div>
            </div>

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
    </div>
  )
}
