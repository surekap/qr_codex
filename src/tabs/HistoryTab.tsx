import { useState } from 'react';
import type { ScanEntry } from '../types';
import { SEMANTIC_META } from '../types';
import { DetailModal } from '../components/DetailModal';

interface HistoryTabProps {
  history: ScanEntry[];
  deleteEntry: (id: string) => void;
  onCreateFromEntry: (text: string) => void;
  onSwitchToScan: () => void;
}

export function HistoryTab({ history, deleteEntry, onCreateFromEntry, onSwitchToScan }: HistoryTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ScanEntry | null>(null);
  const [visibleCount, setVisibleCount] = useState(30);

  async function handleCopy(entry: ScanEntry) {
    await navigator.clipboard.writeText(entry.text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  if (history.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-6xl">📭</div>
        <h2 className="text-xl font-semibold text-gray-900">No scans yet</h2>
        <p className="text-gray-500 text-sm">Go scan something!</p>
        <button onClick={onSwitchToScan} className="bg-accent text-white rounded-2xl px-6 py-3 font-semibold text-sm mt-2">
          Open Scanner
        </button>
      </div>
    );
  }

  const visible = history.slice(0, visibleCount);

  return (
    <>
      <div className="h-full overflow-y-auto pb-20 pt-2">
        <div className="divide-y divide-gray-100">
          {visible.map(entry => {
            const meta = SEMANTIC_META[entry.semanticType];
            return (
              <div
                key={entry.id}
                className="px-4 py-3 active:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(entry)}
              >
                <p className="text-sm text-gray-900 break-all font-medium leading-snug">{entry.text}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{entry.format.replace(/_/g, ' ')}</span>
                  <span className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">{meta.emoji} {meta.label}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{formatDate(entry.scannedAt)}</p>
                {entry.location && (
                  <a
                    href={`https://maps.google.com/?q=${entry.location.lat},${entry.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-accent mt-0.5 block"
                  >
                    📍 {entry.location.lat.toFixed(4)}° N, {entry.location.lng.toFixed(4)}° E
                  </a>
                )}
                <div className="flex gap-3 mt-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleCopy(entry)} className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    {copiedId === entry.id ? '✅ Copied' : '📋 Copy'}
                  </button>
                  <button onClick={() => onCreateFromEntry(entry.text)} className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    ➕ Create
                  </button>
                  <button onClick={() => deleteEntry(entry.id)} className="text-xs text-red-400 font-medium flex items-center gap-1">
                    🗑 Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {visibleCount < history.length && (
          <button
            onClick={() => setVisibleCount(n => n + 30)}
            className="w-full py-4 text-sm text-accent font-medium"
          >
            Load more ({history.length - visibleCount} remaining)
          </button>
        )}
      </div>

      {selected && (
        <DetailModal
          entry={selected}
          onClose={() => setSelected(null)}
          onCreateFromText={text => { setSelected(null); onCreateFromEntry(text); }}
        />
      )}
    </>
  );
}
