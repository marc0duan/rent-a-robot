interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string | FormData;
}

export class PlatformClient {
  private baseUrl: string;
  private robotToken: string;

  constructor(platformUrl: string, robotToken: string) {
    this.baseUrl = `${platformUrl}/api/v1`;
    this.robotToken = robotToken;
  }

  private get headers(): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.robotToken}`,
      "X-Robot-Token": this.robotToken,
    };
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { ...this.headers, ...options.headers };

    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Platform API error ${response.status}: ${errorBody}`);
    }

    return response.json() as Promise<T>;
  }

  async sendMessage(chatGroupId: string, content: string): Promise<unknown> {
    return this.request(`/chatgroups/${chatGroupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }

  async getMessages(
    chatGroupId: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<unknown> {
    const params = new URLSearchParams();
    if (options?.cursor) params.set("cursor", options.cursor);
    if (options?.limit) params.set("limit", options.limit.toString());
    const qs = params.toString();
    return this.request(`/chatgroups/${chatGroupId}/messages${qs ? `?${qs}` : ""}`);
  }

  async listChatGroups(): Promise<{ chatgroups: Array<{ id: string; name: string }> }> {
    return this.request("/chatgroups");
  }

  async uploadFile(
    chatGroupId: string,
    filename: string,
    content: Buffer,
    mimeType: string
  ): Promise<unknown> {
    const blob = new Blob([new Uint8Array(content)], { type: mimeType });
    const formData = new FormData();
    formData.append("file", blob, filename);

    return this.request(`/chatgroups/${chatGroupId}/files`, {
      method: "POST",
      body: formData,
    });
  }

  async downloadFile(fileId: string): Promise<{ data: Buffer; filename: string; mimeType: string }> {
    const url = `${this.baseUrl}/files/${fileId}?download=true`;
    const response = await fetch(url, {
      headers: this.headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Platform API error ${response.status}: ${errorBody}`);
    }

    const contentDisposition = response.headers.get("content-disposition") ?? "";
    const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/);
    const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : "download";
    const mimeType = response.headers.get("content-type") ?? "application/octet-stream";

    const arrayBuffer = await response.arrayBuffer();
    return {
      data: Buffer.from(arrayBuffer),
      filename,
      mimeType,
    };
  }

  async listFiles(chatGroupId: string): Promise<unknown> {
    return this.request(`/chatgroups/${chatGroupId}/files`);
  }

  async connectSseStream(
    chatGroupId: string,
    onMessage: (event: { type: string; data: unknown }) => void,
    onError: (error: Error) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const url = `${this.baseUrl}/chatgroups/${chatGroupId}/stream?token=${this.robotToken}`;
    const response = await fetch(url, { headers: this.headers, signal });

    if (!response.ok || !response.body) {
      throw new Error(`SSE connection failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";
    let currentData = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith(":")) continue;

          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            currentData = line.slice(6);
          } else if (line === "") {
            if (currentData) {
              try {
                const parsed = JSON.parse(currentData);
                onMessage({ type: currentEvent || "message", data: parsed });
              } catch {
                onMessage({ type: currentEvent || "message", data: currentData });
              }
            }
            currentEvent = "";
            currentData = "";
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
