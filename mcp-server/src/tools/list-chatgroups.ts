import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PlatformClient } from "../services/platform-client.js";

export function registerListChatgroups(server: McpServer, client: PlatformClient): void {
  server.tool(
    "list_chatgroups",
    "Lists all chat groups accessible to this robot on the Perseus platform.",
    {},
    async () => {
      try {
        const result = await client.listChatGroups();
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
