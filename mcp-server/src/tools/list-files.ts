import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlatformClient } from "../services/platform-client.js";

export function registerListFiles(server: McpServer, client: PlatformClient): void {
  server.tool(
    "list_files",
    "Lists files available in a chat group's workspace, including inherited team and tenant files.",
    {
      chatGroupId: z.string().describe("The ID of the chat group to list files for"),
    },
    async ({ chatGroupId }) => {
      try {
        const result = await client.listFiles(chatGroupId);
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
