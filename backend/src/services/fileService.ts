import fs from 'fs/promises';
import path from 'path';

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  modified: Date | null;
}

interface ListDirectoryOptions {
  /** Skip the per-entry `stat` call when only names and kinds are needed. */
  withStats?: boolean;
}

/**
 * Filesystem operations shared by the REST file endpoints and the tool
 * executor. Callers are responsible for passing paths that have already been
 * validated by the path guard.
 */
export async function listDirectory(directoryPath: string, { withStats = true }: ListDirectoryOptions = {}): Promise<DirectoryEntry[]> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });

  return Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);
      const stats = withStats ? await fs.stat(entryPath).catch(() => null) : null;
      return {
        name: entry.name,
        path: entryPath,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        size: stats?.size ?? 0,
        modified: stats?.mtime ?? null,
      };
    })
  );
}

export async function readTextFile(filePath: string, maxLength?: number): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  return maxLength ? content.slice(0, maxLength) : content;
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

/** Removes a file, or a directory and everything beneath it. */
export async function deletePath(targetPath: string): Promise<void> {
  const stats = await fs.stat(targetPath);
  if (stats.isDirectory()) {
    await fs.rm(targetPath, { recursive: true, force: true });
  } else {
    await fs.unlink(targetPath);
  }
}

export async function createDirectory(directoryPath: string): Promise<void> {
  await fs.mkdir(directoryPath, { recursive: true });
}
