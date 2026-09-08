import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

function getAllowedBase(req: AuthRequest): string | null {
  const header = (req.headers['x-allowed-path'] as string) || (req.query.allowedPath as string) || (req.body?.allowedPath as string) || '';
  if (!header) return null;
  return path.resolve(header);
}

function isAllowed(target: string, base: string | null): boolean {
  if (!base) return false;
  const resolved = path.resolve(target);
  return resolved === base || resolved.startsWith(base + path.sep);
}

export async function listFiles(req: AuthRequest, res: Response) {
  const dir = (req.query.path as string) || (req.query.allowedPath as string) || '';
  const base = getAllowedBase(req);
  const target = dir ? path.resolve(dir) : base || process.cwd();

  if (base && !isAllowed(target, base)) {
    res.status(403).json({ error: { message: 'Path not allowed. Set allowed path in Settings.' } });
    return;
  }

  try {
    const entries = await fs.readdir(target, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (e) => {
      const full = path.join(target, e.name);
      let stats: any = null;
      try { stats = await fs.stat(full); } catch {}
      return {
        name: e.name,
        path: full,
        isDirectory: e.isDirectory(),
        isFile: e.isFile(),
        size: stats?.size || 0,
        modified: stats?.mtime || null,
      };
    }));
    res.json({ data: { path: target, files, allowedBase: base } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to list files' } });
  }
}

export async function readFile(req: AuthRequest, res: Response) {
  const filePath = (req.query.path as string) || req.body?.path;
  const base = getAllowedBase(req);
  if (!filePath) { res.status(400).json({ error: { message: 'path required' } }); return; }
  const target = path.resolve(filePath);
  if (base && !isAllowed(target, base)) { res.status(403).json({ error: { message: 'Path not allowed' } }); return; }
  try {
    const content = await fs.readFile(target, 'utf-8');
    res.json({ data: { path: target, content } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function writeFile(req: AuthRequest, res: Response) {
  const { path: filePath, content = '' } = req.body;
  const base = getAllowedBase(req);
  if (!filePath) { res.status(400).json({ error: { message: 'path required' } }); return; }
  const target = path.resolve(filePath);
  if (base && !isAllowed(target, base)) { res.status(403).json({ error: { message: 'Path not allowed' } }); return; }
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, content, 'utf-8');
    res.json({ data: { path: target, success: true } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function deleteFile(req: AuthRequest, res: Response) {
  const filePath = (req.query.path as string) || req.body?.path;
  const base = getAllowedBase(req);
  if (!filePath) { res.status(400).json({ error: { message: 'path required' } }); return; }
  const target = path.resolve(filePath);
  if (base && !isAllowed(target, base)) { res.status(403).json({ error: { message: 'Path not allowed' } }); return; }
  try {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) await fs.rm(target, { recursive: true, force: true });
    else await fs.unlink(target);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function mkdir(req: AuthRequest, res: Response) {
  const { path: dirPath } = req.body;
  const base = getAllowedBase(req);
  if (!dirPath) { res.status(400).json({ error: { message: 'path required' } }); return; }
  const target = path.resolve(dirPath);
  if (base && !isAllowed(target, base)) { res.status(403).json({ error: { message: 'Path not allowed' } }); return; }
  try {
    await fs.mkdir(target, { recursive: true });
    res.json({ data: { path: target, success: true } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}
