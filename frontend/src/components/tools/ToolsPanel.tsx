import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Settings } from '../../types/chat';

export function ToolsPanel({ isOpen, onClose, settings, onUpdateSettings }: { isOpen: boolean; onClose: () => void; settings: Settings; onUpdateSettings?: (u: Partial<Settings>) => void }) {
  const [tools, setTools] = useState<any[]>([]);
  const [webQ, setWebQ] = useState('');
  const [webResult, setWebResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchTools();
  }, [isOpen]);

  const fetchTools = async () => {
    try {
      const res = await fetch(`/api/mcp/tools`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` } });
      const j = await res.json();
      setTools(j.data || j || []);
    } catch { setTools([]); }
  };

  const handleWebSearch = async () => {
    if (!webQ.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/web/search?q=${encodeURIComponent(webQ)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` } });
      const j = await res.json();
      setWebResult(JSON.stringify(j.data || j, null, 2));
    } catch (e: any) { setWebResult(e.message); }
    finally { setLoading(false); }
  };

  const groups: Record<string, any[]> = {};
  tools.forEach(t => {
    const cat = t.name.startsWith('file_') || t.name.startsWith('dir_') ? 'File Manager' : t.name.startsWith('git_') ? 'Git' : 'Web';
    (groups[cat] = groups[cat] || []).push(t);
  });

  const filteredGroups: Record<string, any[]> = {};
  Object.entries(groups).forEach(([cat, list]) => {
    if (cat === 'File Manager' && !settings.enableFileManager) return;
    if (cat === 'Git' && !settings.enableGit) return;
    filteredGroups[cat] = list;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tools (MCP + Free Web)" size="xl">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-300">
            Allowed Path: <b className="text-gray-900 dark:text-white">{settings.allowedPath || '(not set – set in Settings)'}</b>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={!!settings.enableFileManager} onChange={e => onUpdateSettings?.({ enableFileManager: e.target.checked })} className="w-4 h-4 rounded" />
              <span className={settings.enableFileManager ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>File Manager {settings.enableFileManager ? 'ON' : 'OFF'}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={!!settings.enableGit} onChange={e => onUpdateSettings?.({ enableGit: e.target.checked })} className="w-4 h-4 rounded" />
              <span className={settings.enableGit ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>Git {settings.enableGit ? 'ON' : 'OFF'}</span>
            </label>
            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">Web Free APIs ON</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Toggle to enable/disable tool groups. Disabled groups are hidden below and blocked on backend (403 if path not allowed).</p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Web – Realtime Free APIs (no cost)</h4>
          <div className="flex gap-2">
            <input value={webQ} onChange={e=>setWebQ(e.target.value)} placeholder="weather in Paris, wiki quantum, news, or https://..." className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg" />
            <button onClick={handleWebSearch} disabled={loading} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg disabled:opacity-50">{loading ? '...' : 'Search'}</button>
          </div>
          {webResult && <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-xl overflow-auto max-h-64 whitespace-pre-wrap">{webResult}</pre>}
        </div>

        {Object.entries(filteredGroups).map(([cat, list]) => (
          <div key={cat}>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{cat} ({list.length}) {cat==='File Manager' && !settings.enableFileManager && '(disabled)'} {cat==='Git' && !settings.enableGit && '(disabled)'}</h4>
            <div className="grid gap-2">
              {list.map(t => (
                <div key={t.name} className="px-4 py-3 bg-white dark:bg-[#232323] border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
                  <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">{t.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.description}</div>
                  <div className="text-[10px] text-gray-400 mt-1 font-mono">{JSON.stringify(t.inputSchema?.properties || {})}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {tools.length===0 && <p className="text-sm text-gray-500">No tools – ensure backend is running.</p>}
        {tools.length>0 && Object.keys(filteredGroups).length===0 && <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl">All tool groups are disabled. Enable File Manager / Git above to show tools.</p>}

        <div className="text-xs text-gray-400 border-t pt-2">
          MCP endpoint: <code>/api/mcp/tools</code> • Call: <code>POST /api/mcp/call {"{"}name, arguments{"}"}</code> • Web: <code>/api/web/search?q=</code>, <code>/api/web/fetch?url=</code>, <code>/api/web/wiki?q=</code>, <code>/api/web/weather?lat&lon=</code>, <code>/api/web/news</code>
        </div>
      </div>
    </Modal>
  );
}
