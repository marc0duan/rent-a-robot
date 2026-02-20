import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PlatformClient } from "./services/platform-client.js";
import type { ServerConfig } from "./config.js";

interface BridgeConnection {
  chatGroupId: string;
  abortController: AbortController;
  retryCount: number;
}

const MIN_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

function retryDelay(retryCount: number): number {
  const delay = MIN_RETRY_DELAY_MS * Math.pow(2, retryCount);
  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

/**
 * Starts the SSE bridge that listens to platform chatgroup streams
 * and forwards incoming events as MCP log notifications.
 *
 * Only active when config.enableSse === true.
 * Reconnects automatically with exponential backoff on disconnection.
 */
export async function startSseBridge(
  server: McpServer,
  client: PlatformClient,
  _config: ServerConfig
): Promise<void> {
  const connections = new Map<string, BridgeConnection>();

  async function connectChatGroup(chatGroupId: string): Promise<void> {
    const existing = connections.get(chatGroupId);
    if (existing) {
      existing.abortController.abort();
    }

    const abortController = new AbortController();
    const conn: BridgeConnection = { chatGroupId, abortController, retryCount: 0 };
    connections.set(chatGroupId, conn);

    const connect = async (): Promise<void> => {
      try {
        await client.connectSseStream(
          chatGroupId,
          (event) => {
            conn.retryCount = 0;
            try {
              server.server.sendLoggingMessage({
                level: "info",
                logger: `sse:${chatGroupId}`,
                data: event,
              });
            } catch {
              // If notification send fails (client disconnected), ignore
            }
          },
          (error) => {
            console.error(`[bridge] SSE error for chatgroup ${chatGroupId}:`, error.message);
          },
          abortController.signal
        );
        // Stream ended normally — reconnect
        if (!abortController.signal.aborted) {
          scheduleReconnect(conn);
        }
      } catch (error: unknown) {
        if (abortController.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[bridge] SSE connection failed for chatgroup ${chatGroupId}:`, message);
        scheduleReconnect(conn);
      }
    };

    const scheduleReconnect = (c: BridgeConnection): void => {
      if (c.abortController.signal.aborted) return;
      const delay = retryDelay(c.retryCount);
      c.retryCount++;
      console.error(`[bridge] Reconnecting to chatgroup ${c.chatGroupId} in ${delay}ms (attempt ${c.retryCount})`);
      setTimeout(() => {
        if (!c.abortController.signal.aborted) {
          connect().catch(() => {});
        }
      }, delay);
    };

    connect().catch(() => {});
  }

  // Discover chatgroups and connect to each
  try {
    const { chatgroups } = await client.listChatGroups();
    console.error(`[bridge] Discovered ${chatgroups.length} chatgroup(s), connecting SSE streams...`);

    for (const group of chatgroups) {
      connectChatGroup(group.id).catch(() => {});
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[bridge] Failed to list chatgroups for SSE bridge:`, message);
    // Retry the entire bridge after a delay
    setTimeout(() => {
      startSseBridge(server, client, _config).catch(() => {});
    }, MAX_RETRY_DELAY_MS);
  }
}
