#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { PlatformClient } from "./services/platform-client.js";
import { registerTools } from "./tools/index.js";
import { startSseBridge } from "./bridge.js";

const config = loadConfig();
const client = new PlatformClient(config.platformUrl, config.robotToken);

const server = new McpServer({
  name: "perseus-mcp-server",
  version: "0.1.0",
});

registerTools(server, client);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[perseus-mcp] Server started on stdio transport");

  if (config.enableSse) {
    console.error("[perseus-mcp] SSE bridge enabled, connecting to platform streams...");
    startSseBridge(server, client, config).catch((err) => {
      console.error("[perseus-mcp] SSE bridge error:", err);
    });
  }
}

main().catch((err) => {
  console.error("[perseus-mcp] Fatal error:", err);
  process.exit(1);
});
