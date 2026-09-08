import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MCP_TOOLS } from '../mcp/tools';
import { fetchUrl, wikiSummary, openMeteoWeather, hackerNewsTop } from '../services/webService';
import { resolveAllowedPath } from '../utils/pathGuard';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const FILESYSTEM_TOOLS = new Set(['file_list', 'file_read', 'file_write', 'file_delete', 'dir_create']);
const GIT_TOOLS = new Set(['git_status', 'git_log', 'git_add', 'git_commit']);

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 10 * 1024 * 1024, timeout: 30_000 });
  return stdout;
}

function toPathspecs(files: unknown): string[] {
  const list = Array.isArray(files) ? files : typeof files === 'string' ? [files] : ['.'];
  const specs = list.map(String).filter((f) => f.length > 0);
  if (specs.length === 0) return ['.'];
  if (specs.some((f) => f.startsWith('-'))) throw new Error('File paths may not start with "-"');
  return specs;
}

export async function listMcpTools(_req: AuthRequest, res: Response) {
  res.json({ data: MCP_TOOLS });
}

export async function callMcpTool(req: AuthRequest, res: Response) {
  const { name, arguments: args = {} } = req.body;

  const needsPath = FILESYSTEM_TOOLS.has(name) || GIT_TOOLS.has(name);
  let targetPath = '';
  let basePath = '';

  if (needsPath) {
    const guard = await resolveAllowedPath(req, args?.path);
    if (!guard.ok) { res.status(guard.status).json({ error: { message: guard.message } }); return; }
    targetPath = guard.target;
    basePath = guard.base;
  }

  try {
    let result: any = null;

    switch (name) {
      case 'file_list': {
        const entries = await fs.readdir(targetPath, { withFileTypes: true });
        result = { path: targetPath, files: entries.map(e => ({ name: e.name, isDirectory: e.isDirectory() })) };
        break;
      }
      case 'file_read': {
        const content = await fs.readFile(targetPath, 'utf-8');
        result = { path: targetPath, content: content.slice(0, 20000) };
        break;
      }
      case 'file_write': {
        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, args.content || '', 'utf-8');
        result = { success: true, path: targetPath };
        break;
      }
      case 'file_delete': {
        if (targetPath === basePath) {
          res.status(400).json({ error: { message: 'Refusing to delete the allowed root directory.' } });
          return;
        }
        const st = await fs.stat(targetPath);
        if (st.isDirectory()) await fs.rm(targetPath, { recursive: true, force: true });
        else await fs.unlink(targetPath);
        result = { success: true };
        break;
      }
      case 'dir_create': {
        await fs.mkdir(targetPath, { recursive: true });
        result = { success: true, path: targetPath };
        break;
      }
      case 'git_status':
        result = { stdout: await runGit(targetPath, ['status', '--porcelain', '--branch']) };
        break;
      case 'git_log':
        result = { stdout: await runGit(targetPath, ['log', '--oneline', '-20']) };
        break;
      case 'git_add':
        result = { stdout: await runGit(targetPath, ['add', '--', ...toPathspecs(args.files)]) };
        break;
      case 'git_commit': {
        if (!args.message || typeof args.message !== 'string') {
          res.status(400).json({ error: { message: 'commit message required' } });
          return;
        }
        result = { stdout: await runGit(targetPath, ['commit', '-m', args.message]) };
        break;
      }
      case 'web_fetch':
        result = { content: await fetchUrl(args.url) };
        break;
      case 'wiki_search':
        result = { content: await wikiSummary(args.query) };
        break;
      case 'weather':
        result = { content: await openMeteoWeather(args.lat, args.lon) };
        break;
      case 'news':
        result = { content: await hackerNewsTop() };
        break;
      default:
        res.status(400).json({ error: { message: `Unknown tool ${name}` } });
        return;
    }

    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}
