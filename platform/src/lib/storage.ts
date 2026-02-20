import { mkdir, writeFile, unlink, stat } from "fs/promises";
import { createReadStream, type ReadStream } from "fs";
import { dirname, join } from "path";

export const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
  "application/xml",
  "application/zip",
  "application/gzip",
  "application/x-tar",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? "/workspace";

export function getStoragePath(
  tenantId: string,
  teamId: string,
  chatGroupId: string,
  filename: string
): string {
  return join(WORKSPACE_ROOT, tenantId, teamId, chatGroupId, filename);
}

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

export async function saveFile(storagePath: string, data: Buffer): Promise<void> {
  await ensureDir(dirname(storagePath));
  await writeFile(storagePath, data);
}

export function readFileStream(storagePath: string): ReadStream {
  return createReadStream(storagePath);
}

export async function deleteFile(storagePath: string): Promise<void> {
  try {
    await unlink(storagePath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export async function fileExists(storagePath: string): Promise<boolean> {
  try {
    await stat(storagePath);
    return true;
  } catch {
    return false;
  }
}
