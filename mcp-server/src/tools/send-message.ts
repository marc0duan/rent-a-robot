import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlatformClient } from "../services/platform-client.js";

export function registerSendMessage(server: McpServer, client: PlatformClient): void {
  server.tool(
    "send_message",
    "Sends a message to a specific chat group on the Perseus platform.",
    {
      chatGroupId: z.string().describe("The ID of the chat group to send the message to"),
      content: z.string().describe("The message content to send"),
    },
    async ({ chatGroupId, content }) => {
      try {
        const result = await client.sendMessage(chatGroupId, content);
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
