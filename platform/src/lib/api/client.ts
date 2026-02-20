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

async function uploadFile<T>(path: string, file: File): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      (typeof data.error === "object" && data.error?.message) ||
      (typeof data.error === "string" && data.error) ||
      `Upload failed: ${res.status}`;
    throw new ApiClientError(message, res.status, data);
  }

  return res.json();
}

function createSSEConnection(
  path: string,
  onMessage: (data: unknown) => void,
  onError?: (err: Event) => void
): () => void {
  const token = getToken();
  const url = `${API_BASE}${path}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

  const eventSource = new EventSource(url);

  eventSource.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch {
      onMessage(event.data);
    }
  });

  eventSource.onerror = (err) => {
    if (onError) onError(err);
  };

  return () => eventSource.close();
}

export const api = {
  auth: {
    signup: (data: { email: string; password: string; name: string; phone?: string; invitationToken?: string }) =>
      request<{
        user: { id: string; email: string; name: string };
        token: string;
        tenantToken?: string;
        invitationAccepted?: boolean;
        tenant?: { id: string; name: string; slug: string } | null;
      }>("/auth/signup", {
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

  invitations: {
    list: (tenantId: string) =>
      request<{
        invitations: Array<{
          id: string;
          email: string;
          role: string;
          tenantId: string;
          tenantName: string;
          invitedBy: string;
          invitedByName: string;
          expiresAt: string;
          createdAt: string;
          acceptedAt: string | null;
        }>;
      }>(`/tenants/${tenantId}/invitations`),
    create: (tenantId: string, data: { email: string; role: string }) =>
      request<{
        invitation: {
          id: string;
          email: string;
          role: string;
          tenantId: string;
          tenantName: string;
        };
      }>(`/tenants/${tenantId}/invitations`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    delete: (invitationId: string) => request<void>(`/invitations/${invitationId}`, { method: "DELETE" }),
    verify: (token: string) =>
      request<{
        invitation: {
          id: string;
          email: string;
          role: string;
          tenantId: string;
          tenantName: string;
        };
      }>(`/invitations/verify?token=${encodeURIComponent(token)}`),
  },

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
    get: (id: string) =>
      request<{
        chatgroup: {
          id: string;
          name: string;
          teamId: string;
          createdById: string;
          createdAt: string;
          _count: { messages: number; members: number };
          team: { id: string; name: string };
          members: Array<{
            chatGroupId: string;
            memberId: string;
            memberType: string;
            joinedAt: string;
            user: { id: string; name: string } | null;
            robot: { id: string; name: string } | null;
          }>;
        };
      }>(`/chatgroups/${id}`),
    update: (id: string, data: { name: string }) =>
      request<{ chatgroup: unknown }>(`/chatgroups/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<void>(`/chatgroups/${id}`, { method: "DELETE" }),
    addMember: (groupId: string, data: { memberId: string; memberType: "human" | "robot" }) =>
      request<{
        member: {
          chatGroupId: string;
          memberId: string;
          memberType: string;
          joinedAt: string;
          user: { id: string; name: string } | null;
          robot: { id: string; name: string } | null;
        };
      }>(`/chatgroups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    removeMember: (groupId: string, memberId: string) =>
      request<void>(`/chatgroups/${groupId}/members/${memberId}`, { method: "DELETE" }),
  },

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
    subscribe: (
      chatGroupId: string,
      onMessage: (data: unknown) => void,
      onError?: (err: Event) => void
    ) => createSSEConnection(`/chatgroups/${chatGroupId}/stream`, onMessage, onError),
  },

  files: {
    list: (chatGroupId: string) =>
      request<{ files: unknown[] }>(`/chatgroups/${chatGroupId}/files`),
    upload: (chatGroupId: string, file: File) =>
      uploadFile<{ file: unknown }>(`/chatgroups/${chatGroupId}/files`, file),
    get: (id: string) => request<{ file: unknown }>(`/files/${id}`),
    downloadUrl: (id: string) => {
      const token = getToken();
      return `${API_BASE}/files/${id}?download=true${token ? `&token=${encodeURIComponent(token)}` : ""}`;
    },
    delete: (id: string) => request<void>(`/files/${id}`, { method: "DELETE" }),
  },

  users: {
    search: (query: string) =>
      request<{
        users: Array<{ id: string; name: string; email: string; avatar: string | null }>;
      }>(`/users/search?q=${encodeURIComponent(query)}`),
    getProfile: () =>
      request<{
        user: {
          id: string; name: string; email: string; phone: string | null;
          avatar: string | null; gender: string | null; jobTitle: string | null;
          workLocation: string | null;
        };
      }>("/users/me"),
    updateProfile: (data: {
      name?: string; avatar?: string; gender?: string;
      jobTitle?: string; workLocation?: string;
    }) =>
      request<{
        user: {
          id: string; name: string; email: string; phone: string | null;
          avatar: string | null; gender: string | null; jobTitle: string | null;
          workLocation: string | null;
        };
      }>("/users/me", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

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

  health: () => request<{ status: string; database: string; redis: string }>("/health".replace("/v1", "")),
};

export { ApiClientError };
