import { useEffect, useState } from 'react';
import type { ScanEntry } from '../types';
import { SEMANTIC_META } from '../types';
import { analyzeBarcode } from '../utils/analyzer';
import { fetchExternalLookup } from '../utils/lookups';

const SECURITY_TYPES: ScanEntry['semanticType'][] = ['wifi_configuration', 'payment', 'crypto_wallet', 'authentication'];

interface DetailModalProps {
  entry: ScanEntry;
  onClose: () => void;
  onCreateFromText: (text: string) => void;
}

export function DetailModal({ entry, onClose, onCreateFromText }: DetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lookupResult, setLookupResult] = useState<Awaited<ReturnType<typeof fetchExternalLookup>> | undefined>(undefined);
  const [lookupLoading, setLookupLoading] = useState(false);

  const analysis = analyzeBarcode(entry.text, entry.format);
  const meta = SEMANTIC_META[entry.semanticType];
  const confidence = analysis.classificationConfidence >= 0.9 ? 'High' : analysis.classificationConfidence >= 0.6 ? 'Medium' : 'Low';

  useEffect(() => {
    if (entry.semanticType !== 'retail_product' && entry.semanticType !== 'book') return;
    setLookupLoading(true);
    fetchExternalLookup(entry.text, entry.semanticType)
      .then(r => setLookupResult(r ?? undefined))
      .finally(() => setLookupLoading(false));
  }, [entry]);

  async function handleCopy() {
    await navigator.clipboard.writeText(entry.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex-1 flex items-center gap-2 flex-wrap">
          <span className="bg-gray-100 text-gray-700 text-xs rounded px-2 py-1">{entry.format.replace(/_/g, ' ')}</span>
          <span className="bg-blue-50 text-blue-700 text-xs rounded px-2 py-1">{meta.emoji} {meta.label}</span>
          <span className={`text-xs rounded px-2 py-1 ${confidence === 'High' ? 'bg-green-50 text-green-700' : confidence === 'Medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-500'}`}>
            {confidence} confidence
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 text-xl w-8 h-8 flex items-center justify-center">×</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Raw payload */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Raw Payload</p>
          <p className="font-mono text-sm text-gray-800 break-all leading-relaxed">{entry.text}</p>
        </div>

        {/* Parsed fields */}
        {Object.keys(analysis.parsedFields).length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Details</p>
            <div className="space-y-2">
              {Object.entries(analysis.parsedFields).map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-xs text-gray-500 w-28 flex-shrink-0 pt-0.5">{k}</span>
                  <span className="text-sm text-gray-900 break-all flex-1 flex items-start gap-2">
                    {k === 'Password' ? (
                      <>
                        <span>{showPassword ? v : '••••••••'}</span>
                        <button onClick={() => setShowPassword(s => !s)} className="text-xs text-accent flex-shrink-0">{showPassword ? 'Hide' : 'Show'}</button>
                      </>
                    ) : v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unknown interpretations */}
        {entry.semanticType === 'unknown' && analysis.possibleInterpretations && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Possible Interpretations</p>
            <ul className="space-y-1">
              {analysis.possibleInterpretations.map(p => (
                <li key={p} className="text-sm text-gray-600 flex gap-2"><span>•</span>{p}</li>
              ))}
            </ul>
          </div>
        )}

        {/* External lookup */}
        {(entry.semanticType === 'retail_product' || entry.semanticType === 'book') && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
              {lookupResult ? `From ${lookupResult.source}` : 'Looking up product…'}
            </p>
            {lookupLoading && (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            )}
            {!lookupLoading && lookupResult && (
              <div className="flex gap-3">
                {lookupResult.imageUrl && (
                  <img src={lookupResult.imageUrl} alt="" className="w-16 h-16 object-contain rounded-lg bg-gray-50 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {lookupResult.productName && <p className="text-sm font-semibold text-gray-900">{lookupResult.productName}</p>}
                  {lookupResult.brand && <p className="text-sm text-gray-500">{lookupResult.brand}</p>}
                  {Object.entries(lookupResult.additionalFields).map(([k, v]) => (
                    <p key={k} className="text-xs text-gray-400">{k}: {v}</p>
                  ))}
                </div>
              </div>
            )}
            {!lookupLoading && !lookupResult && <p className="text-sm text-gray-400">No product data found</p>}
          </div>
        )}

        {/* Location */}
        {entry.location && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Scan Location</p>
            <a
              href={`https://maps.google.com/?q=${entry.location.lat},${entry.location.lng}`}
              target="_blank" rel="noopener noreferrer"
              className="text-sm text-accent"
            >
              📍 {entry.location.lat.toFixed(5)}°, {entry.location.lng.toFixed(5)}° — Open in Maps
            </a>
          </div>
        )}

        {/* Security notice */}
        {SECURITY_TYPES.includes(entry.semanticType) && (
          <div className="mx-4 my-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-800">⚠️ Do not act on barcodes from untrusted sources.</p>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 py-3 flex flex-col gap-2">
          <button onClick={handleCopy} className="w-full bg-gray-100 text-gray-800 rounded-xl py-3 text-sm font-medium">
            {copied ? '✅ Copied!' : '📋 Copy text'}
          </button>
          {entry.semanticType === 'url' && (
            <a
              href={entry.text} target="_blank" rel="noopener noreferrer"
              className="block w-full bg-gray-100 text-gray-800 rounded-xl py-3 text-sm font-medium text-center"
            >
              🌐 Open in browser
            </a>
          )}
          <button onClick={() => onCreateFromText(entry.text)} className="w-full bg-accent text-white rounded-xl py-3 text-sm font-semibold">
            ➕ Create barcode from this text
          </button>
        </div>

        <div className="pb-6" />
      </div>
    </div>
  );
}
