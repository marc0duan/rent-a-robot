export interface ServerConfig {
  platformUrl: string;
  robotToken: string;
  enableSse: boolean;
}

export function loadConfig(): ServerConfig {
  const platformUrl = process.env.PLATFORM_URL;
  const robotToken = process.env.ROBOT_TOKEN;

  if (!platformUrl) throw new Error("PLATFORM_URL environment variable is required");
  if (!robotToken) throw new Error("ROBOT_TOKEN environment variable is required");

  return {
    platformUrl: platformUrl.replace(/\/$/, ""),
    robotToken,
    enableSse: process.env.ENABLE_SSE === "1",
  };
}
