import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlatformClient } from "../services/platform-client.js";

export function registerGetMessages(server: McpServer, client: PlatformClient): void {
  server.tool(
    "get_messages",
    "Retrieves conversation history from a chat group. Supports cursor-based pagination.",
    {
      chatGroupId: z.string().describe("The ID of the chat group"),
      cursor: z.string().optional().describe("Pagination cursor for fetching older messages"),
      limit: z.number().optional().describe("Number of messages to retrieve (1-100, default 50)"),
    },
    async ({ chatGroupId, cursor, limit }) => {
      try {
        const result = await client.getMessages(chatGroupId, { cursor, limit });
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
          isError: true,
        };
      }
    }
  );
}
