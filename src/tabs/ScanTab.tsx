import { useRef, useState, useCallback } from 'react';
import { useScanner } from '../hooks/useScanner';
import { useGeolocation } from '../hooks/useGeolocation';
import { beep } from '../utils/beep';
import { analyzeBarcode } from '../utils/analyzer';
import type { AppSettings, ScanEntry } from '../types';
import { STORAGE_KEYS } from '../types';
import type { ToastData } from '../components/Toast';
import { storageGet, storageSet } from '../utils/storage';

interface ScanTabProps {
  settings: AppSettings;
  history: ScanEntry[];
  hasText: (text: string) => boolean;
  addEntry: (entry: ScanEntry) => void;
  showToast: (data: ToastData) => void;
}

export function ScanTab({ settings, hasText, addEntry, showToast }: ScanTabProps) {
  const videoRef = useRef<HTMLVideoElement>(null) as React.RefObject<HTMLVideoElement>;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hintVisible, setHintVisible] = useState(true);
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const { requestPosition } = useGeolocation();

  const handleResult = useCallback(async ({ text, format }: { text: string; format: string }) => {
    if (!settings.saveDuplicates && hasText(text)) return;
    const analysis = analyzeBarcode(text, format);
    const id = crypto.randomUUID();

    const entry: ScanEntry = {
      id,
      text,
      format,
      semanticType: analysis.semanticType,
      scannedAt: new Date().toISOString(),
    };

    if (settings.saveToHistory) {
      addEntry(entry);
      // Attach GPS non-blocking — update the stored entry when position arrives
      requestPosition(id).then(pos => {
        if (!pos) return;
        const stored: ScanEntry[] = storageGet<ScanEntry[]>(STORAGE_KEYS.history, []);
        const idx = stored.findIndex(e => e.id === id);
        if (idx >= 0) {
          stored[idx] = { ...stored[idx], location: pos };
          storageSet(STORAGE_KEYS.history, stored);
        }
      });
    }

    if (settings.vibrate) navigator.vibrate?.(200);
    if (settings.beep) beep();
    if (hintVisible) setHintVisible(false);

    showToast({ id, text, format, semanticType: analysis.semanticType });
  }, [settings, hasText, addEntry, requestPosition, hintVisible, showToast]);

  const { error, flipCamera, decodeFromImage, cameras } = useScanner(videoRef, {
    onResult: handleResult,
    enabled: scannerEnabled,
  });

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const results = await decodeFromImage(file);
    results.forEach((r, i) => {
      setTimeout(() => handleResult(r), i * 800);
    });
  }

  function handleRequestCamera() {
    setScannerEnabled(true);
    setCameraPermission('granted');
  }

  if (cameraPermission === 'prompt') {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">📷</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Camera access needed</h2>
          <p className="text-gray-500 text-sm mb-6">QR Codex needs your camera to scan barcodes. Your camera feed stays on your device.</p>
          <button
            onClick={handleRequestCamera}
            className="w-full bg-accent text-white rounded-2xl py-3 font-semibold text-sm"
          >
            Enable Camera
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Camera unavailable</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => { setScannerEnabled(false); setTimeout(() => setScannerEnabled(true), 100); }}
            className="bg-accent text-white rounded-2xl px-6 py-3 font-semibold text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Corner bracket overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-56 h-56">
          {([
            'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
            'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
            'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
            'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
          ] as const).map((cls, i) => (
            <div key={i} className={`absolute w-10 h-10 border-white ${cls}`} />
          ))}
        </div>
        {hintVisible && (
          <p className="absolute text-white/70 text-sm font-medium" style={{ top: 'calc(50% + 120px)' }}>
            Point at a barcode
          </p>
        )}
      </div>

      {/* Overlay controls — top right */}
      <div className="absolute top-4 right-4 flex gap-2">
        {cameras.length > 1 && (
          <button
            onClick={flipCamera}
            className="bg-black/50 backdrop-blur-sm text-white rounded-full w-11 h-11 flex items-center justify-center text-xl"
            aria-label="Flip camera"
          >
            🔄
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-black/50 backdrop-blur-sm text-white rounded-full w-11 h-11 flex items-center justify-center text-xl"
          aria-label="Scan from photo"
        >
          🖼️
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />
    </div>
  );
}
