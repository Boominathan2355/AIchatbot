export interface McpTool {
  name: string;
  description: string;
  inputSchema: any;
}

export const MCP_TOOLS: McpTool[] = [
  { name: 'file_list', description: 'List files in allowed path', inputSchema: { type: 'object', properties: { path: { type: 'string' } } } },
  { name: 'file_read', description: 'Read file content', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'file_write', description: 'Write file', inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path','content'] } },
  { name: 'file_delete', description: 'Delete file or folder', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'dir_create', description: 'Create directory', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'git_status', description: 'Git status', inputSchema: { type: 'object', properties: { path: { type: 'string' } } } },
  { name: 'git_log', description: 'Git log', inputSchema: { type: 'object', properties: { path: { type: 'string' } } } },
  { name: 'git_add', description: 'Git add', inputSchema: { type: 'object', properties: { path: { type: 'string' }, files: { type: 'string' } } } },
  { name: 'git_commit', description: 'Git commit', inputSchema: { type: 'object', properties: { path: { type: 'string' }, message: { type: 'string' } }, required: ['message'] } },
  { name: 'web_fetch', description: 'Fetch URL (free)', inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } },
  { name: 'wiki_search', description: 'Wikipedia summary (free)', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'weather', description: 'Weather via Open-Meteo (free)', inputSchema: { type: 'object', properties: { lat: { type: 'number' }, lon: { type: 'number' } }, required: ['lat','lon'] } },
  { name: 'news', description: 'HackerNews top (free)', inputSchema: { type: 'object', properties: {} } },
];
