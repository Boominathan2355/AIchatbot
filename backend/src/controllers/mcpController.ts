import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { MCP_TOOLS } from '../mcp/tools';
import { fetchUrl, wikiSummary, openMeteoWeather, hackerNewsTop } from '../services/webService';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function listMcpTools(_req: AuthRequest, res: Response) {
  res.json({ data: MCP_TOOLS });
}

export async function callMcpTool(req: AuthRequest, res: Response) {
  const { name, arguments: args } = req.body;
  const allowedBase = (req.headers['x-allowed-path'] as string) || args?.allowedPath || '';
  const base = allowedBase ? path.resolve(allowedBase) : null;
  const check = (p: string) => !base || p === base || p.startsWith(base + path.sep);

  try {
    let result: any = null;
    const targetPath = args?.path ? path.resolve(args.path) : base || process.cwd();
    if (args?.path && base && !check(path.resolve(args.path))) {
      res.status(403).json({ error: { message: 'Path not allowed' } }); return;
    }
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
        const st = await fs.stat(targetPath);
        if (st.isDirectory()) await fs.rm(targetPath, { recursive: true, force: true }); else await fs.unlink(targetPath);
        result = { success: true };
        break;
      }
      case 'dir_create': {
        await fs.mkdir(targetPath, { recursive: true });
        result = { success: true, path: targetPath };
        break;
      }
      case 'git_status': {
        const { stdout } = await execAsync('git status --porcelain --branch', { cwd: targetPath });
        result = { stdout };
        break;
      }
      case 'git_log': {
        const { stdout } = await execAsync('git log --oneline -20', { cwd: targetPath });
        result = { stdout };
        break;
      }
      case 'git_add': {
        const { stdout } = await execAsync(`git add ${args.files || '.'}`, { cwd: targetPath });
        result = { stdout };
        break;
      }
      case 'git_commit': {
        const { stdout } = await execAsync(`git commit -m "${(args.message || '').replace(/"/g, '\\"')}"`, { cwd: targetPath });
        result = { stdout };
        break;
      }
      case 'web_fetch': {
        result = { content: await fetchUrl(args.url) };
        break;
      }
      case 'wiki_search': {
        result = { content: await wikiSummary(args.query) };
        break;
      }
      case 'weather': {
        result = { content: await openMeteoWeather(args.lat, args.lon) };
        break;
      }
      case 'news': {
        result = { content: await hackerNewsTop() };
        break;
      }
      default: res.status(400).json({ error: { message: `Unknown tool ${name}` } }); return;
    }
    res.json({ data: result });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message } });
  }
}
