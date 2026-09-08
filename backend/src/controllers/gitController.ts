import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

async function runGit(cwd: string, args: string) {
  const { stdout, stderr } = await execAsync(`git ${args}`, { cwd, maxBuffer: 10 * 1024 * 1024 });
  return { stdout, stderr };
}

export async function gitStatus(req: AuthRequest, res: Response) {
  const repoPath = (req.query.path as string) || (req.query.allowedPath as string) || getAllowedBase(req) || process.cwd();
  const base = getAllowedBase(req);
  const target = path.resolve(repoPath);
  if (base && !isAllowed(target, base)) { res.status(403).json({ error: { message: 'Path not allowed' } }); return; }
  try {
    const status = await runGit(target, 'status --porcelain --branch');
    const log = await runGit(target, 'log --oneline -10').catch(() => ({ stdout: '', stderr: '' }));
    res.json({ data: { path: target, status: status.stdout, log: log.stdout } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function gitLog(req: AuthRequest, res: Response) {
  const repoPath = (req.query.path as string) || getAllowedBase(req) || process.cwd();
  const base = getAllowedBase(req);
  const target = path.resolve(repoPath as string);
  if (base && !isAllowed(target, base)) { res.status(403).json({ error: { message: 'Path not allowed' } }); return; }
  try {
    const result = await runGit(target, 'log --oneline -20');
    res.json({ data: { path: target, log: result.stdout } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function gitAdd(req: AuthRequest, res: Response) {
  const { path: repoPath, files = '.' } = req.body;
  const base = getAllowedBase(req);
  const target = path.resolve(repoPath || base || process.cwd());
  if (base && !isAllowed(target, base)) { res.status(403).json({ error: { message: 'Path not allowed' } }); return; }
  try {
    const result = await runGit(target, `add ${files}`);
    res.json({ data: { success: true, stdout: result.stdout } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function gitCommit(req: AuthRequest, res: Response) {
  const { path: repoPath, message } = req.body;
  if (!message) { res.status(400).json({ error: { message: 'commit message required' } }); return; }
  const base = getAllowedBase(req);
  const target = path.resolve(repoPath || base || process.cwd());
  if (base && !isAllowed(target, base)) { res.status(403).json({ error: { message: 'Path not allowed' } }); return; }
  try {
    const result = await runGit(target, `commit -m "${message.replace(/"/g, '\\"')}"`);
    res.json({ data: { success: true, stdout: result.stdout } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function gitInit(req: AuthRequest, res: Response) {
  const { path: repoPath } = req.body;
  const base = getAllowedBase(req);
  const target = path.resolve(repoPath || base || process.cwd());
  if (base && !isAllowed(target, base)) { res.status(403).json({ error: { message: 'Path not allowed' } }); return; }
  try {
    const result = await runGit(target, 'init');
    res.json({ data: { success: true, stdout: result.stdout } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}
