import { FILESYSTEM_TOOL_NAMES, GIT_TOOL_NAMES, isToolName } from '../tools/toolDefinitions';
import { resolveAllowedPath } from '../utils/pathGuard';
import * as fileService from './fileService';
import * as gitService from './gitService';
import { fetchHackerNewsTopStories, fetchPageText, fetchWeatherForecast, fetchWikipediaSummary } from './webService';

export interface ToolExecutionContext {
  /** The client's "Allowed Path" setting, already resolved by the controller. */
  clientAllowedPath: string | null;
}

export type ToolExecutionResult =
  | { ok: true; data: unknown }
  | { ok: false; status: number; message: string };

const TOOL_FILE_READ_LIMIT = 20_000;

function succeed(data: unknown): ToolExecutionResult {
  return { ok: true, data };
}

function fail(status: number, message: string): ToolExecutionResult {
  return { ok: false, status, message };
}

/**
 * Runs one named tool. Filesystem and git tools are confined to the allowed
 * path; failures that are the caller's fault come back as `ok: false`, while
 * unexpected errors propagate for the controller to report.
 */
export async function executeTool(
  name: string,
  args: Record<string, any> = {},
  context: ToolExecutionContext
): Promise<ToolExecutionResult> {
  if (!isToolName(name)) return fail(400, `Unknown tool ${name}`);

  let targetPath = '';
  let basePath = '';

  if (FILESYSTEM_TOOL_NAMES.has(name) || GIT_TOOL_NAMES.has(name)) {
    const guard = await resolveAllowedPath(args.path, context.clientAllowedPath);
    if (!guard.ok) return fail(guard.status, guard.message);
    targetPath = guard.target;
    basePath = guard.base;
  }

  switch (name) {
    case 'file_list': {
      const entries = await fileService.listDirectory(targetPath, { withStats: false });
      return succeed({ path: targetPath, files: entries.map(({ name: entryName, isDirectory }) => ({ name: entryName, isDirectory })) });
    }
    case 'file_read':
      return succeed({ path: targetPath, content: await fileService.readTextFile(targetPath, TOOL_FILE_READ_LIMIT) });
    case 'file_write':
      await fileService.writeTextFile(targetPath, args.content || '');
      return succeed({ success: true, path: targetPath });
    case 'file_delete':
      if (targetPath === basePath) return fail(400, 'Refusing to delete the allowed root directory.');
      await fileService.deletePath(targetPath);
      return succeed({ success: true });
    case 'dir_create':
      await fileService.createDirectory(targetPath);
      return succeed({ success: true, path: targetPath });
    case 'git_status':
      return succeed({ stdout: await gitService.getStatus(targetPath) });
    case 'git_log':
      return succeed({ stdout: await gitService.getLog(targetPath) });
    case 'git_add':
      return succeed({ stdout: await gitService.stageFiles(targetPath, args.files) });
    case 'git_commit':
      if (!args.message || typeof args.message !== 'string') return fail(400, 'commit message required');
      return succeed({ stdout: await gitService.commit(targetPath, args.message) });
    case 'web_fetch':
      return succeed({ content: await fetchPageText(args.url) });
    case 'wiki_search':
      return succeed({ content: await fetchWikipediaSummary(args.query) });
    case 'weather':
      return succeed({ content: await fetchWeatherForecast(args.lat, args.lon) });
    case 'news':
      return succeed({ content: await fetchHackerNewsTopStories() });
    default:
      return fail(400, `Unknown tool ${name}`);
  }
}
