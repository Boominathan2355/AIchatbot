import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Settings } from '../../types/chat';

export function ToolsPanel({ isOpen, onClose, settings }: { isOpen: boolean; onClose: () => void; settings: Settings }) {
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tools (MCP + Free Web)">
      <div className="space-y-4 max-h-[70vh] overflow-auto">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Allowed Path: <b>{settings.allowedPath || '(not set – set in Settings)'}</b> • File Manager: {settings.enableFileManager ? 'ON' : 'OFF'} • Git: {settings.enableGit ? 'ON' : 'OFF'} • Web Agent: free APIs (Wiki, DuckDuckGo, Open-Meteo, HN)
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Web – Realtime Free APIs (no cost)</h4>
          <div className="flex gap-2">
            <input value={webQ} onChange={e=>setWebQ(e.target.value)} placeholder="weather in Paris, wiki quantum, news, or https://..." className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border rounded-lg" />
            <button onClick={handleWebSearch} disabled={loading} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg disabled:opacity-50">{loading ? '...' : 'Search'}</button>
          </div>
          {webResult && <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-xl overflow-auto max-h-64 whitespace-pre-wrap">{webResult}</pre>}
        </div>

        {Object.entries(groups).map(([cat, list]) => (
          <div key={cat}>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{cat} ({list.length})</h4>
            <div className="grid gap-1.5">
              {list.map(t => (
                <div key={t.name} className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="text-sm font-mono font-medium text-gray-900 dark:text-white">{t.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{t.description}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{JSON.stringify(t.inputSchema?.properties || {})}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {tools.length===0 && <p className="text-sm text-gray-500">No tools – ensure backend is running. Enable File/Git in Settings and set Allowed Path.</p>}

        <div className="text-xs text-gray-400 border-t pt-2">
          MCP endpoint: <code>/api/mcp/tools</code> • Call: <code>POST /api/mcp/call {"{"}name, arguments{"}"}</code> • Web: <code>/api/web/search?q=</code>, <code>/api/web/fetch?url=</code>, <code>/api/web/wiki?q=</code>, <code>/api/web/weather?lat&lon=</code>, <code>/api/web/news</code>
        </div>
      </div>
    </Modal>
  );
}
