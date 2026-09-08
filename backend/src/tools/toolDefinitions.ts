/**
 * Tools the server can execute on behalf of a chat. Definitions are served to
 * clients for display; execution goes through services/toolService.ts.
 */

export const TOOL_NAMES = [
  'file_list',
  'file_read',
  'file_write',
  'file_delete',
  'dir_create',
  'git_status',
  'git_log',
  'git_add',
  'git_commit',
  'web_fetch',
  'wiki_search',
  'weather',
  'news',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export interface ToolDefinition {
  name: ToolName;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const FILESYSTEM_TOOL_NAMES: ReadonlySet<ToolName> = new Set<ToolName>([
  'file_list',
  'file_read',
  'file_write',
  'file_delete',
  'dir_create',
]);

export const GIT_TOOL_NAMES: ReadonlySet<ToolName> = new Set<ToolName>(['git_status', 'git_log', 'git_add', 'git_commit']);

export function isToolName(value: unknown): value is ToolName {
  return typeof value === 'string' && (TOOL_NAMES as readonly string[]).includes(value);
}

const pathProperty = { path: { type: 'string' } };

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { name: 'file_list', description: 'List files in allowed path', inputSchema: { type: 'object', properties: pathProperty } },
  { name: 'file_read', description: 'Read file content', inputSchema: { type: 'object', properties: pathProperty, required: ['path'] } },
  { name: 'file_write', description: 'Write file', inputSchema: { type: 'object', properties: { ...pathProperty, content: { type: 'string' } }, required: ['path', 'content'] } },
  { name: 'file_delete', description: 'Delete file or folder', inputSchema: { type: 'object', properties: pathProperty, required: ['path'] } },
  { name: 'dir_create', description: 'Create directory', inputSchema: { type: 'object', properties: pathProperty, required: ['path'] } },
  { name: 'git_status', description: 'Git status', inputSchema: { type: 'object', properties: pathProperty } },
  { name: 'git_log', description: 'Git log', inputSchema: { type: 'object', properties: pathProperty } },
  { name: 'git_add', description: 'Git add', inputSchema: { type: 'object', properties: { ...pathProperty, files: { type: 'string' } } } },
  { name: 'git_commit', description: 'Git commit', inputSchema: { type: 'object', properties: { ...pathProperty, message: { type: 'string' } }, required: ['message'] } },
  { name: 'web_fetch', description: 'Fetch URL (free)', inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
  { name: 'wiki_search', description: 'Wikipedia summary (free)', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'weather', description: 'Weather via Open-Meteo (free)', inputSchema: { type: 'object', properties: { lat: { type: 'number' }, lon: { type: 'number' } }, required: ['lat', 'lon'] } },
  { name: 'news', description: 'HackerNews top (free)', inputSchema: { type: 'object', properties: {} } },
];
