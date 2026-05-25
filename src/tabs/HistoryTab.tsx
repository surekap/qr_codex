import { useRef, useState } from 'react';
import type { ScanEntry } from '../types';
import { SEMANTIC_META } from '../types';
import { DetailModal } from '../components/DetailModal';

interface HistoryTabProps {
  history: ScanEntry[];
  deleteEntry: (id: string) => void;
  onCreateFromEntry: (text: string) => void;
  onSwitchToScan: () => void;
}

function SwipeRow({
  entry,
  copiedId,
  onCopy,
  onCreate,
  onDelete,
  onClick,
}: {
  entry: ScanEntry;
  copiedId: string | null;
  onCopy: (entry: ScanEntry) => void;
  onCreate: (text: string) => void;
  onDelete: (id: string) => void;
  onClick: (entry: ScanEntry) => void;
}) {
  const meta = SEMANTIC_META[entry.semanticType];
  const startXRef = useRef<number>(0);
  const [offset, setOffset] = useState(0);
  const [deleting, setDeleting] = useState(false);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
  }

  function onTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - startXRef.current;
    if (dx < 0) setOffset(Math.max(dx, -100));
  }

  function onTouchEnd() {
    if (offset < -60) {
      setDeleting(true);
      setTimeout(() => onDelete(entry.id), 250);
    } else {
      setOffset(0);
    }
  }

  return (
    <div className="relative overflow-hidden border-b border-gray-100">
      {/* Red delete background */}
      <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-end pr-4">
        <span className="text-white text-xs font-semibold">Delete</span>
      </div>

      {/* Row content */}
      <div
        className={`relative bg-white transition-transform ${deleting ? 'duration-200 -translate-x-full' : 'duration-100'}`}
        style={{ transform: deleting ? undefined : `translateX(${offset}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => { if (offset === 0) onClick(entry); }}
      >
        <div className="px-4 py-3 active:bg-gray-50 cursor-pointer">
          {/* Text + copy icon */}
          <div className="flex items-start gap-1.5">
            <p className="text-sm text-gray-900 break-all font-medium leading-snug flex-1">{entry.text}</p>
            <button
              onClick={e => { e.stopPropagation(); onCopy(entry); }}
              className="flex-shrink-0 mt-0.5 p-1 rounded text-gray-400 hover:text-gray-700 active:bg-gray-100"
              aria-label="Copy"
            >
              {copiedId === entry.id ? (
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <rect x="9" y="9" width="13" height="13" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          </div>

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

          {/* Create button */}
          <div className="mt-2" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onCreate(entry.text)}
              className="text-xs bg-accent/10 text-accent font-semibold rounded-lg px-3 py-1.5"
            >
              Create barcode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
        <p className="text-xs text-gray-400 px-4 pb-2">Swipe left to delete</p>
        <div>
          {visible.map(entry => (
            <SwipeRow
              key={entry.id}
              entry={entry}
              copiedId={copiedId}
              onCopy={handleCopy}
              onCreate={onCreateFromEntry}
              onDelete={deleteEntry}
              onClick={setSelected}
            />
          ))}
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
