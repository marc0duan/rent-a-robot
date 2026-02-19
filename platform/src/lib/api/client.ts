const API_BASE = "/api/v1";

class ApiClientError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      (typeof data.error === "object" && data.error?.message) ||
      (typeof data.error === "string" && data.error) ||
      `Request failed: ${res.status}`;
    throw new ApiClientError(message, res.status, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export const api = {
  auth: {
    signup: (data: { email: string; password: string; name: string; phone?: string }) =>
      request<{ user: { id: string; email: string; name: string }; token: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    login: (data: { email: string; password: string }) =>
      request<{
        user: { id: string; email: string; name: string };
        token: string;
        tenants: Array<{ tenantId: string; role: string; tenant: { id: string; name: string; slug: string } }>;
      }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    selectTenant: (data: { tenantId: string }) =>
      request<{ tenant: { id: string; name: string; slug: string }; token: string }>(
        "/auth/select-tenant",
        { method: "POST", body: JSON.stringify(data) }
      ),
  },

  // Tenants
  tenants: {
    list: () => request<{ tenants: Array<{ tenantId: string; role: string; tenant: { id: string; name: string; slug: string } }> }>("/tenants"),
    create: (data: { name: string; slug: string }) =>
      request<{ tenant: { id: string; name: string; slug: string }; token: string }>("/tenants", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<{ tenant: { id: string; name: string; slug: string } }>(`/tenants/${id}`),
    update: (id: string, data: { name?: string; slug?: string }) =>
      request<{ tenant: { id: string; name: string; slug: string } }>(`/tenants/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/tenants/${id}`, { method: "DELETE" }),
    listUsers: (id: string) =>
      request<{ users: Array<{ userId: string; role: string; joinedAt: string; user: { id: string; email: string; name: string } }> }>(
        `/tenants/${id}/users`
      ),
  },

  // Teams
  teams: {
    list: () =>
      request<{ teams: Array<{ id: string; name: string; tenantId: string; createdAt: string; _count: { members: number; groups: number } }> }>(
        "/teams"
      ),
    create: (data: { name: string }) =>
      request<{ team: { id: string; name: string; tenantId: string; createdAt: string; members: unknown[]; groups: unknown[] } }>("/teams", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<{ team: { id: string; name: string; tenantId: string; createdAt: string; members: unknown[]; groups: unknown[] } }>(`/teams/${id}`),
    update: (id: string, data: { name: string }) =>
      request<{ team: { id: string; name: string } }>(`/teams/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/teams/${id}`, { method: "DELETE" }),
    addMember: (id: string, data: { memberId: string; memberType: "human" | "robot" }) =>
      request<{ member: unknown }>(`/teams/${id}/members`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    removeMember: (teamId: string, memberId: string) =>
      request<void>(`/teams/${teamId}/members/${memberId}`, { method: "DELETE" }),
  },

  // Robots
  robots: {
    list: () =>
      request<{ robots: Array<{ id: string; name: string; status: string; soulMd: string | null; createdAt: string; updatedAt: string }> }>(
        "/robots"
      ),
    create: (data: { name: string; soulMd?: string }) =>
      request<{ robot: { id: string; name: string; status: string; soulMd: string | null } }>("/robots", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: string) =>
      request<{ robot: { id: string; name: string; status: string; soulMd: string | null; createdAt: string; updatedAt: string } }>(
        `/robots/${id}`
      ),
    update: (id: string, data: { name?: string; soulMd?: string; generateToken?: boolean }) =>
      request<{ robot: { id: string; name: string; status: string }; token?: string }>(`/robots/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/robots/${id}`, { method: "DELETE" }),
  },

  // ChatGroups
  chatGroups: {
    list: (teamId?: string) =>
      request<{
        chatgroups: Array<{
          id: string; name: string; teamId: string; createdById: string; createdAt: string;
          _count: { members: number; messages: number };
          team: { id: string; name: string };
        }>;
      }>(`/chatgroups${teamId ? `?teamId=${teamId}` : ""}`),
    create: (data: { name: string; teamId: string; memberIds?: Array<{ id: string; type: "human" | "robot" }> }) =>
      request<{ chatgroup: unknown }>("/chatgroups", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<{ chatgroup: unknown }>(`/chatgroups/${id}`),
    update: (id: string, data: { name: string }) =>
      request<{ chatgroup: unknown }>(`/chatgroups/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/chatgroups/${id}`, { method: "DELETE" }),
  },

  // Messages
  messages: {
    list: (chatGroupId: string, cursor?: string) =>
      request<{
        messages: Array<{
          id: string; chatGroupId: string; senderId: string; senderType: string;
          content: string; mentions: string[] | null; createdAt: string; updatedAt: string;
          sender: { name: string; type: string };
        }>;
        nextCursor: string | null;
      }>(`/chatgroups/${chatGroupId}/messages${cursor ? `?cursor=${cursor}` : ""}`),
    send: (chatGroupId: string, data: { content: string }) =>
      request<{ message: unknown }>(`/chatgroups/${chatGroupId}/messages`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { content: string }) =>
      request<{ message: unknown }>(`/messages/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/messages/${id}`, { method: "DELETE" }),
  },

  // Files
  files: {
    list: (chatGroupId: string) =>
      request<{ files: unknown[] }>(`/chatgroups/${chatGroupId}/files`),
    upload: (chatGroupId: string, data: { name: string; path: string; size: number; mimeType: string }) =>
      request<{ file: unknown }>(`/chatgroups/${chatGroupId}/files`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<{ file: unknown }>(`/files/${id}`),
    delete: (id: string) => request<void>(`/files/${id}`, { method: "DELETE" }),
  },

  // API Keys
  apiKeys: {
    list: () =>
      request<{ apiKeys: Array<{ id: string; name: string; prefix: string; scope: string; expiresAt: string | null; createdAt: string }> }>(
        "/api-keys"
      ),
    create: (data: { name: string; scope: "tenant" | "user"; expiresAt?: string }) =>
      request<{ apiKey: { id: string; name: string; prefix: string; key: string } }>("/api-keys", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/api-keys/${id}`, { method: "DELETE" }),
  },

  // Health
  health: () => request<{ status: string; database: string; redis: string }>("/health".replace("/v1", "")),
};

export { ApiClientError };
