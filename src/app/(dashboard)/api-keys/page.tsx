"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Key,
  Copy,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Shield,
} from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scope: "tenant" | "user";
  expiresAt: string | null;
  createdAt: string;
}

interface NewApiKeyResponse {
  apiKey: ApiKey & { key: string };
}

export default function ApiKeysPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // New Key State
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScope, setNewKeyScope] = useState<"tenant" | "user">("user");
  const [newKeyExpiry, setNewKeyExpiry] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.apiKeys.list();
      // Safely handle potentially undefined response structure if API varies
      if (response && Array.isArray(response.apiKeys)) {
        setKeys(response.apiKeys);
      } else {
        setKeys([]);
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
      toast.error("Failed to load API keys. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    try {
      setIsCreating(true);
      const payload: {
        name: string;
        scope: "tenant" | "user";
        expiresAt?: string;
      } = {
        name: newKeyName,
        scope: newKeyScope,
      };

      if (newKeyExpiry) {
        payload.expiresAt = new Date(newKeyExpiry).toISOString();
      }

      const response = (await api.apiKeys.create(payload)) as NewApiKeyResponse;

      if (response?.apiKey?.key) {
        setCreatedKey(response.apiKey.key);
        setIsCreateDialogOpen(false);
        setIsSuccessDialogOpen(true);
        setNewKeyName("");
        setNewKeyScope("user");
        setNewKeyExpiry("");
        toast.success("API Key created successfully");
        fetchKeys();
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
      toast.error("Failed to create API key. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      setIsDeleting(id);
      await api.apiKeys.delete(id);
      toast.success("API Key revoked successfully");
      fetchKeys();
    } catch (error) {
      console.error("Failed to delete API key:", error);
      toast.error("Failed to revoke API key. Please try again.");
    } finally {
      setIsDeleting(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="container max-w-5xl py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            API Keys
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage programmatic access to the Perseus platform.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40">
              <Plus className="h-4 w-4" /> Create New Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Generate a new key for accessing the API.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Key Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Production Backend"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scope">Scope</Label>
                <Select
                  value={newKeyScope}
                  onValueChange={(val: "tenant" | "user") =>
                    setNewKeyScope(val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User (Personal)</SelectItem>
                    <SelectItem value="tenant">
                      Tenant (Organization)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tenant keys provide access to organization resources.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiry">Expiration (Optional)</Label>
                <Input
                  id="expiry"
                  type="date"
                  value={newKeyExpiry}
                  onChange={(e) => setNewKeyExpiry(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateKey} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Key"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Key className="h-5 w-5 text-primary" />
            Active Keys
          </CardTitle>
          <CardDescription>
            These keys are currently active and can be used to authenticate requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-8 w-[100px]" />
                </div>
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-lg bg-muted/20">
              <div className="rounded-full bg-muted/50 p-3 mb-4">
                <Key className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No API keys found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-4">
                You haven't created any API keys yet. Create one to get started with the API.
              </p>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                Create your first key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-[250px]">Name</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id} className="border-border/50 group">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-foreground">{key.name}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          ID: {key.id.slice(0, 8)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="relative rounded bg-muted/50 px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                        {key.prefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          key.scope === "tenant" ? "default" : "secondary"
                        }
                        className="capitalize"
                      >
                        {key.scope}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell>
                      {key.expiresAt ? (
                        <div className="flex items-center gap-1.5 text-amber-500/90 text-sm">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{formatDate(key.expiresAt)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                              <AlertTriangle className="h-5 w-5" />
                              Revoke API Key
                            </DialogTitle>
                            <DialogDescription>
                              Are you sure you want to revoke the key{" "}
                              <span className="font-semibold text-foreground">
                                "{key.name}"
                              </span>
                              ? This action cannot be undone and any applications using this key will stop working immediately.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleDeleteKey(key.id)}
                              disabled={isDeleting === key.id}
                            >
                              {isDeleting === key.id
                                ? "Revoking..."
                                : "Yes, Revoke Key"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex gap-3 items-start text-sm text-blue-600/90 dark:text-blue-400/90">
        <Shield className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium">Security Note</p>
          <p className="opacity-90 leading-relaxed">
            API keys allow programmatic access to your account. Keep them secure
            and never share them in public repositories or client-side code. Only
            owners and admins can manage tenant-level keys.
          </p>
        </div>
      </div>

      {/* Success Dialog showing the full key */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-500">
              <CheckCircle2 className="h-5 w-5" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Your new API key has been created successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 text-sm text-amber-600 dark:text-amber-500 flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Please copy your key now. For security reasons,{" "}
                <strong>it will not be shown again.</strong>
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Key className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                readOnly
                value={createdKey || ""}
                className="pl-9 pr-12 font-mono text-sm h-11 bg-muted/50"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1 h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => copyToClipboard(createdKey || "")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => setIsSuccessDialogOpen(false)}
            >
              I have saved my key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
