"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api/client"
import { ApiClientError } from "@/lib/api/client"
import { toast } from "sonner"
import { Settings, Loader2, Save, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface LlmConfig {
  id: string
  tenantId: string
  provider: string
  apiKeyMasked: string
  baseUrl: string | null
  model: string | null
  createdAt: string
  updatedAt: string
}

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "dashscope", label: "DashScope (Alibaba)" },
  { value: "moonshot", label: "Moonshot" },
  { value: "zhipu", label: "Zhipu AI" },
  { value: "minimax", label: "MiniMax" },
  { value: "custom", label: "Custom (OpenAI-compatible)" },
]

export default function SettingsPage() {
  const { tenant } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Form state
  const [provider, setProvider] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [model, setModel] = useState("")
  const [hasExistingConfig, setHasExistingConfig] = useState(false)

  const loadConfig = useCallback(async () => {
    if (!tenant?.id) return
    try {
      const res = await api.tenants.getLlmConfig(tenant.id)
      if (res.llmConfig) {
        setProvider(res.llmConfig.provider)
        setBaseUrl(res.llmConfig.baseUrl || "")
        setModel(res.llmConfig.model || "")
        setHasExistingConfig(true)
        // Don't show actual API key, just indicate it exists
        if (res.llmConfig.apiKeyMasked) {
          setApiKey(res.llmConfig.apiKeyMasked)
        }
      }
    } catch (error) {
      console.error("Failed to load LLM config:", error)
    } finally {
      setIsLoading(false)
    }
  }, [tenant?.id])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant?.id) return

    setIsSaving(true)
    try {
      // Only send apiKey if it's not a masked value (i.e., user entered a new one)
      const apiKeyToSend = apiKey && !apiKey.includes("*") ? apiKey : undefined
      if (!apiKeyToSend) {
        toast.error("Please enter an API key")
        setIsSaving(false)
        return
      }

      await api.tenants.updateLlmConfig(tenant.id, {
        provider,
        apiKey: apiKeyToSend,
        baseUrl: baseUrl || undefined,
        model: model || undefined,
      })
      toast.success("LLM configuration saved")
      setHasExistingConfig(true)
      // Refresh to get masked API key
      await loadConfig()
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to save configuration")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!tenant?.id) return
    if (!confirm("Are you sure you want to delete the LLM configuration?")) return

    setIsDeleting(true)
    try {
      await api.tenants.deleteLlmConfig(tenant.id)
      toast.success("LLM configuration deleted")
      setProvider("")
      setApiKey("")
      setBaseUrl("")
      setModel("")
      setHasExistingConfig(false)
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message)
      } else {
        toast.error("Failed to delete configuration")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your workspace settings
        </p>
      </div>

      {/* LLM Configuration */}
      <Card className="border-zinc-800 bg-zinc-950/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            LLM Configuration
          </CardTitle>
          <CardDescription>
            Configure the default LLM provider for your robots. This will be used
            by all robots in your workspace unless overridden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave}>
            <div className="grid gap-6">
              {/* Provider */}
              <div className="grid gap-2">
                <Label htmlFor="provider">Provider</Label>
                <Select value={provider} onValueChange={setProvider} required>
                  <SelectTrigger id="provider" className="bg-background/50">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* API Key */}
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasExistingConfig ? "•••••••• (configured)" : "Enter your API key"}
                  required
                  className="bg-background/50"
                />
                {hasExistingConfig && apiKey.includes("*") && (
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep existing API key
                  </p>
                )}
              </div>

              {/* Base URL (for custom providers) */}
              {provider === "custom" && (
                <div className="grid gap-2">
                  <Label htmlFor="baseUrl">Base URL</Label>
                  <Input
                    id="baseUrl"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.example.com/v1"
                    className="bg-background/50"
                  />
                </div>
              )}

              {/* Model */}
              <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={
                    provider === "minimax"
                      ? "MiniMax-M2.5"
                      : provider === "openai"
                      ? "gpt-4o"
                      : provider === "anthropic"
                      ? "claude-sonnet-4-20250514"
                      : "e.g., gpt-4o"
                  }
                  className="bg-background/50"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                {hasExistingConfig && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive"
                  >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                )}
                <div className="ml-auto">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
