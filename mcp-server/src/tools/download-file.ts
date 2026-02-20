import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlatformClient } from "../services/platform-client.js";

export function registerDownloadFile(server: McpServer, client: PlatformClient): void {
  server.tool(
    "download_file",
    "Downloads a file from the Perseus platform workspace. Returns the file content as base64.",
    {
      fileId: z.string().describe("The ID of the file to download"),
    },
    async ({ fileId }) => {
      try {
        const { data, filename, mimeType } = await client.downloadFile(fileId);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                filename,
                mimeType,
                sizeBytes: data.length,
                contentBase64: data.toString("base64"),
              }, null, 2),
            },
          ],
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
