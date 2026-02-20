import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlatformClient } from "../services/platform-client.js";

export function registerUploadFile(server: McpServer, client: PlatformClient): void {
  server.tool(
    "upload_file",
    "Uploads a file to a chat group's workspace on the Perseus platform.",
    {
      chatGroupId: z.string().describe("The ID of the chat group to upload the file to"),
      filename: z.string().describe("The name of the file"),
      contentBase64: z.string().describe("The file content encoded as base64"),
      mimeType: z.string().optional().describe("The MIME type of the file (default: application/octet-stream)"),
    },
    async ({ chatGroupId, filename, contentBase64, mimeType }) => {
      try {
        const buffer = Buffer.from(contentBase64, "base64");
        const result = await client.uploadFile(
          chatGroupId,
          filename,
          buffer,
          mimeType ?? "application/octet-stream"
        );
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
