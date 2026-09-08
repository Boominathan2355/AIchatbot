import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { resolveAllowedPath } from '../utils/pathGuard';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Arguments are passed as an array, never interpolated into a shell string -
 * a commit message or filename cannot escape into command execution.
 */
async function runGit(cwd: string, args: string[]) {
  const { stdout, stderr } = await execFileAsync('git', args, {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30_000,
  });
  return { stdout, stderr };
}

/** Reject anything that git would interpret as an option rather than a path. */
function toPathspecs(files: unknown): string[] {
  const list = Array.isArray(files) ? files : typeof files === 'string' ? [files] : ['.'];
  const specs = list.map(String).filter((f) => f.length > 0);
  if (specs.length === 0) return ['.'];
  if (specs.some((f) => f.startsWith('-'))) {
    throw new Error('File paths may not start with "-"');
  }
  return specs;
}

export async function gitStatus(req: AuthRequest, res: Response) {
  const guard = await resolveAllowedPath(req, (req.query.path as string) || undefined);
  if (!guard.ok) { res.status(guard.status).json({ error: { message: guard.message } }); return; }

  try {
    const status = await runGit(guard.target, ['status', '--porcelain', '--branch']);
    const log = await runGit(guard.target, ['log', '--oneline', '-10']).catch(() => ({ stdout: '', stderr: '' }));
    res.json({ data: { path: guard.target, status: status.stdout, log: log.stdout } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function gitLog(req: AuthRequest, res: Response) {
  const guard = await resolveAllowedPath(req, (req.query.path as string) || undefined);
  if (!guard.ok) { res.status(guard.status).json({ error: { message: guard.message } }); return; }

  try {
    const result = await runGit(guard.target, ['log', '--oneline', '-20']);
    res.json({ data: { path: guard.target, log: result.stdout } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function gitAdd(req: AuthRequest, res: Response) {
  const guard = await resolveAllowedPath(req, req.body?.path);
  if (!guard.ok) { res.status(guard.status).json({ error: { message: guard.message } }); return; }

  try {
    const result = await runGit(guard.target, ['add', '--', ...toPathspecs(req.body?.files)]);
    res.json({ data: { success: true, stdout: result.stdout } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function gitCommit(req: AuthRequest, res: Response) {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: { message: 'commit message required' } });
    return;
  }

  const guard = await resolveAllowedPath(req, req.body?.path);
  if (!guard.ok) { res.status(guard.status).json({ error: { message: guard.message } }); return; }

  try {
    const result = await runGit(guard.target, ['commit', '-m', message]);
    res.json({ data: { success: true, stdout: result.stdout } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}

export async function gitInit(req: AuthRequest, res: Response) {
  const guard = await resolveAllowedPath(req, req.body?.path);
  if (!guard.ok) { res.status(guard.status).json({ error: { message: guard.message } }); return; }

  try {
    const result = await runGit(guard.target, ['init']);
    res.json({ data: { success: true, stdout: result.stdout } });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}
