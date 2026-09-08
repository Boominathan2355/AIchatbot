import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { resolveAllowedPath } from '../utils/pathGuard';
import path from 'path';
import fs from 'fs/promises';

export async function listFiles(req: AuthRequest, res: Response) {
  const guard = await resolveAllowedPath(req, (req.query.path as string) || undefined);
  if (!guard.ok) { res.status(guard.status).json({ error: { message: guard.message } }); return; }

  try {
    const entries = await fs.readdir(guard.target, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (e) => {
      const full = path.join(guard.target, e.name);
      let stats: Awaited<ReturnType<typeof fs.stat>> | null = null;
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
    res.json({ data: { path: guard.target, files, allowedBase: guard.base } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Failed to list files' } });
  }
}

export async function readFile(req: AuthRequest, res: Response) {
  const filePath = (req.query.path as string) || req.body?.path;
  if (!filePath) { res.status(400).json({ error: { message: 'path required' } }); return; }

  const guard = await resolveAllowedPath(req, filePath);
  if (!guard.ok) { res.status(guard.status).json({ error: { message: guard.message } }); return; }

  try {
    const content = await fs.readFile(guard.target, 'utf-8');
    res.json({ data: { path: guard.target, content } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function writeFile(req: AuthRequest, res: Response) {
  const { path: filePath, content = '' } = req.body;
  if (!filePath) { res.status(400).json({ error: { message: 'path required' } }); return; }

  const guard = await resolveAllowedPath(req, filePath);
  if (!guard.ok) { res.status(guard.status).json({ error: { message: guard.message } }); return; }

  try {
    await fs.mkdir(path.dirname(guard.target), { recursive: true });
    await fs.writeFile(guard.target, content, 'utf-8');
    res.json({ data: { path: guard.target, success: true } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function deleteFile(req: AuthRequest, res: Response) {
  const filePath = (req.query.path as string) || req.body?.path;
  if (!filePath) { res.status(400).json({ error: { message: 'path required' } }); return; }

  const guard = await resolveAllowedPath(req, filePath);
  if (!guard.ok) { res.status(guard.status).json({ error: { message: guard.message } }); return; }

  // Deleting the allowed root itself would wipe the whole workspace.
  if (guard.target === guard.base) {
    res.status(400).json({ error: { message: 'Refusing to delete the allowed root directory.' } });
    return;
  }

  try {
    const stat = await fs.stat(guard.target);
    if (stat.isDirectory()) await fs.rm(guard.target, { recursive: true, force: true });
    else await fs.unlink(guard.target);
    res.json({ data: { success: true } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function mkdir(req: AuthRequest, res: Response) {
  const { path: dirPath } = req.body;
  if (!dirPath) { res.status(400).json({ error: { message: 'path required' } }); return; }

  const guard = await resolveAllowedPath(req, dirPath);
  if (!guard.ok) { res.status(guard.status).json({ error: { message: guard.message } }); return; }

  try {
    await fs.mkdir(guard.target, { recursive: true });
    res.json({ data: { path: guard.target, success: true } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}
