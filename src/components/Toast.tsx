import { useEffect, useState } from 'react';
import { SEMANTIC_META } from '../types';
import type { ScanEntry, SemanticType } from '../types';

export interface ToastData {
  id: string;
  text: string;
  format: string;
  semanticType: SemanticType;
  entry: ScanEntry;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
  onDetailOpen: (entry: ScanEntry) => void;
}

export function Toast({ toast, onDismiss, onDetailOpen }: ToastProps) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) { setVisible(false); return; }
    setVisible(true);
    setCopied(false);
    const t = setTimeout(() => { setVisible(false); setTimeout(onDismiss, 300); }, 3000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  async function handleCopy() {
    if (!toast) return;
    await navigator.clipboard.writeText(toast.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!toast) return null;
  const meta = SEMANTIC_META[toast.semanticType];

  return (
    <div
      className={`fixed left-4 right-4 z-50 transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
    >
      <div className="bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => { onDetailOpen(toast.entry); onDismiss(); }}
        >
          <p className="text-sm font-medium truncate">{toast.text}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs bg-white/20 rounded px-1.5 py-0.5">{toast.format.replace(/_/g, ' ')}</span>
            <span className="text-xs bg-white/20 rounded px-1.5 py-0.5">{meta.emoji} {meta.label}</span>
          </div>
        </button>
        <button onClick={handleCopy} className="text-lg flex-shrink-0 w-8 h-8 flex items-center justify-center">
          {copied ? '✅' : '📋'}
        </button>
      </div>
    </div>
  );
}
