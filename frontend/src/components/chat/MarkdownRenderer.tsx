import { useState, useEffect, useRef, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { LivePreview } from './LivePreview';
import { CopyIcon, CheckIcon } from '../ui/Icons';

interface MarkdownRendererProps {
  content: string;
}

function childrenToText(children: ReactNode): string {
  if (children == null) return '';
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (typeof children === 'boolean') return '';
  if (Array.isArray(children)) return children.map(childrenToText).join('');
  if (typeof children === 'object' && 'props' in children) {
    const el = children as { props?: { children?: ReactNode } };
    return childrenToText(el.props?.children);
  }
  return '';
}

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderMermaid() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
          securityLevel: 'loose',
        });

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code.trim());
        if (!cancelled) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to render diagram');
        }
      }
    }

    renderMermaid();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
        <p className="font-medium">Mermaid Error</p>
        <p className="text-xs mt-1 opacity-75">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex justify-center p-4 bg-white dark:bg-gray-800 rounded-xl overflow-x-auto mermaid-diagram"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (language === 'mermaid') {
    return <MermaidDiagram code={children} />;
  }

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/50">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700/50">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {copied ? (
            <>
              <CheckIcon className="w-3.5 h-3.5 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 bg-gray-900 dark:bg-[#0d1117] text-gray-100 text-[0.8125rem] leading-relaxed">
          <code className={`language-${language}`}>{children}</code>
        </pre>
      </div>
      {['html', 'css', 'javascript', 'js', 'jsx', 'typescript', 'tsx'].includes(language.toLowerCase()) && (
        <LivePreview code={children} language={language} />
      )}
    </div>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = childrenToText(children).replace(/\n$/, '');
            console.log('[code component] children type:', typeof children, 'isArray:', Array.isArray(children), 'result:', codeString.slice(0, 100));

            if (match) {
              return <CodeBlock language={match[1]} children={codeString} />;
            }

            if (codeString.includes('\n')) {
              return <CodeBlock language="text" children={codeString} />;
            }

            return (
              <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 rounded-md text-[0.8125rem] font-medium" {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700/50">
                <table className="w-full text-sm">{children}</table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-gray-100 dark:bg-gray-800/80">{children}</thead>;
          },
          th({ children }) {
            return <th className="px-4 py-2.5 text-left font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700/50">{children}</th>;
          },
          td({ children }) {
            return <td className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300">{children}</td>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-3 pl-4 border-l-4 border-violet-400 dark:border-violet-500 bg-violet-50/50 dark:bg-violet-900/10 rounded-r-xl py-2 pr-4">
                {children}
              </blockquote>
            );
          },
          h1({ children }) {
            return <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-3">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-5 mb-2.5">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="text-base font-semibold text-gray-900 dark:text-white mt-3 mb-2">{children}</h4>;
          },
          p({ children }) {
            return <p className="text-[0.875rem] leading-relaxed text-gray-700 dark:text-gray-300 my-2">{children}</p>;
          },
          ul({ children }) {
            return <ul className="my-2 ml-4 space-y-1 list-disc text-gray-700 dark:text-gray-300">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="my-2 ml-4 space-y-1 list-decimal text-gray-700 dark:text-gray-300">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-[0.875rem] leading-relaxed">{children}</li>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 dark:text-violet-400 hover:underline"
              >
                {children}
              </a>
            );
          },
          strong({ children }) {
            return <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>;
          },
          em({ children }) {
            return <em className="italic text-gray-700 dark:text-gray-300">{children}</em>;
          },
          hr() {
            return <hr className="my-4 border-gray-200 dark:border-gray-700" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
