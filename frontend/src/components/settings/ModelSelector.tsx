import { useState, useRef, useEffect } from 'react';
import { ModelInfo } from '../../types';
import { ChevronDownIcon } from '../ui/Icons';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
}

export function ModelSelector({ models, selectedModel, onSelect }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = models.filter(
    (m) =>
      m.id.toLowerCase().includes(query.toLowerCase()) ||
      m.name.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (modelId: string) => {
    onSelect(modelId);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      onSelect(query.trim());
      setIsOpen(false);
    }
    if (e.key === 'Escape') setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span>{selectedModel || 'Select Model'}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-80 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-gray-200 dark:border-dark-border z-50 animate-fade-in">
          <div className="p-2 border-b border-gray-200 dark:border-dark-border">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a model name or select..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
          <div className="p-1 max-h-56 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    model.id === selectedModel
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="font-medium text-sm">{model.name}</div>
                  {model.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{model.description}</div>
                  )}
                </button>
              ))
            ) : query.trim() ? (
              <button
                onClick={() => handleSelect(query.trim())}
                className="w-full text-left px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div className="font-medium text-sm">Use "{query.trim()}"</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Custom model name</div>
              </button>
            ) : (
              <p className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No models available</p>
            )}
          </div>
          {query.trim() && (
            <div className="p-2 border-t border-gray-200 dark:border-dark-border">
              <button
                onClick={() => handleSelect(query.trim())}
                className="w-full px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
              >
                Use "{query.trim()}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
