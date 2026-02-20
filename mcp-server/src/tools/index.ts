import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PlatformClient } from "../services/platform-client.js";
import { registerSendMessage } from "./send-message.js";
import { registerGetMessages } from "./get-messages.js";
import { registerListChatgroups } from "./list-chatgroups.js";
import { registerUploadFile } from "./upload-file.js";
import { registerDownloadFile } from "./download-file.js";
import { registerListFiles } from "./list-files.js";

export function registerTools(server: McpServer, client: PlatformClient): void {
  registerSendMessage(server, client);
  registerGetMessages(server, client);
  registerListChatgroups(server, client);
  registerUploadFile(server, client);
  registerDownloadFile(server, client);
  registerListFiles(server, client);
}
