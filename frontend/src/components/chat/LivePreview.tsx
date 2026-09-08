import { useState, useRef, useEffect } from 'react';

interface LivePreviewProps {
  code: string;
  language: string;
}

export function LivePreview({ code, language }: LivePreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isPreviewable = ['html', 'htm', 'css', 'javascript', 'js', 'jsx', 'typescript', 'tsx'].includes(language.toLowerCase());

  useEffect(() => {
    if (showPreview && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;

      if (doc) {
        let content = '';

        if (['html', 'htm'].includes(language.toLowerCase())) {
          content = code;
        } else if (language.toLowerCase() === 'css') {
          content = `<!DOCTYPE html>
<html>
<head>
  <style>${code}</style>
</head>
<body>
  <div class="container">
    <h1>CSS Preview</h1>
    <p>This is a sample paragraph for styling.</p>
    <button>Button</button>
    <a href="#">Link</a>
    <ul>
      <li>List item 1</li>
      <li>List item 2</li>
    </ul>
    <div class="box">Box element</div>
    <table>
      <thead><tr><th>Header</th><th>Header</th></tr></thead>
      <tbody><tr><td>Data</td><td>Data</td></tr></tbody>
    </table>
  </div>
</body>
</html>`;
        } else if (['javascript', 'js', 'jsx', 'typescript', 'tsx'].includes(language.toLowerCase())) {
          content = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4; }
    #output { white-space: pre-wrap; }
    .log { color: #d4d4d4; }
    .error { color: #f44747; }
    .warn { color: #cca700; }
  </style>
</head>
<body>
  <div id="output"></div>
  <script>
    const output = document.getElementById('output');
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      const div = document.createElement('div');
      div.className = 'log';
      div.textContent = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      output.appendChild(div);
    };
    console.error = (...args) => {
      const div = document.createElement('div');
      div.className = 'error';
      div.textContent = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      output.appendChild(div);
    };
    console.warn = (...args) => {
      const div = document.createElement('div');
      div.className = 'warn';
      div.textContent = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
      output.appendChild(div);
    };

    try {
      ${code.replace(/<\/script>/g, '<\\/script>')}
    } catch (e) {
      console.error(e.toString());
    }
  <\/script>
</body>
</html>`;
        }

        doc.open();
        doc.write(content);
        doc.close();
      }
    }
  }, [showPreview, code, language]);

  if (!isPreviewable) return null;

  return (
    <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Preview</span>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs px-2 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>
      {showPreview && (
        <iframe
          ref={iframeRef}
          className="w-full bg-white dark:bg-[#1e1e1e]"
          style={{ minHeight: '200px', border: 'none' }}
          sandbox="allow-scripts"
          title="Live Preview"
        />
      )}
    </div>
  );
}
