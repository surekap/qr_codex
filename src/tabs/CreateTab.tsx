import { useEffect, useRef, useState } from 'react';
import bwipjs from 'bwip-js';
import { shareImage } from '../utils/share';
import { storageGet, storageSet } from '../utils/storage';
import { STORAGE_KEYS } from '../types';

const FORMATS: Array<{ label: string; bcid: string; validate?: (s: string) => string | null }> = [
  { label: 'QR Code',     bcid: 'qrcode' },
  { label: 'Aztec Code',  bcid: 'azteccode' },
  { label: 'Data Matrix', bcid: 'datamatrix' },
  { label: 'PDF 417',     bcid: 'pdf417' },
  { label: 'Code 128',    bcid: 'code128' },
  { label: 'Code 39',     bcid: 'code39' },
  { label: 'EAN-13',      bcid: 'ean13',  validate: s => /^\d{12}$/.test(s) ? null : 'EAN-13 requires exactly 12 digits' },
  { label: 'EAN-8',       bcid: 'ean8',   validate: s => /^\d{7}$/.test(s) ? null : 'EAN-8 requires exactly 7 digits' },
  { label: 'UPC-A',       bcid: 'upca',   validate: s => /^\d{11}$/.test(s) ? null : 'UPC-A requires exactly 11 digits' },
];

interface CreateTabProps {
  prefillText: string;
  onPrefillConsumed: () => void;
}

export function CreateTab({ prefillText, onPrefillConsumed }: CreateTabProps) {
  const [text, setText] = useState('');
  const [formatIdx, setFormatIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [qrIcon, setQrIcon] = useState<string | null>(() => storageGet<string | null>(STORAGE_KEYS.qrIcon, null));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const fmt = FORMATS[formatIdx];
  const isQr = fmt.bcid === 'qrcode';

  useEffect(() => {
    if (!prefillText) return;
    setText(prefillText);
    setGenerated(false);
    onPrefillConsumed();
  }, [prefillText, onPrefillConsumed]);

  function handleGenerate() {
    const validationError = fmt.validate?.(text.trim()) ?? null;
    if (validationError) { setError(validationError); return; }
    if (!text.trim()) { setError('Please enter some text'); return; }
    setError(null);

    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    try {
      bwipjs.toCanvas(canvas, {
        bcid: fmt.bcid,
        text: text.trim(),
        scale: 4,
        height: fmt.bcid === 'pdf417' ? 12 : undefined,
        includetext: false,
        eclevel: isQr ? 'H' : undefined,
        backgroundcolor: 'FFFFFF',
      });

      if (isQr && qrIcon) {
        const icon = new Image();
        icon.onload = () => {
          const ctx = canvas.getContext('2d')!;
          const iconSize = canvas.width * 0.2;
          const x = (canvas.width - iconSize) / 2;
          const y = (canvas.height - iconSize) / 2;
          const pad = 6;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(x - pad, y - pad, iconSize + pad * 2, iconSize + pad * 2, 8);
          ctx.fill();
          ctx.drawImage(icon, x, y, iconSize, iconSize);
          if (imgRef.current) imgRef.current.src = canvas.toDataURL('image/png');
        };
        icon.src = qrIcon;
      } else {
        if (imgRef.current) imgRef.current.src = canvas.toDataURL('image/png');
      }

      setGenerated(true);
    } catch (e) {
      setError(`Generation failed: ${(e as Error).message}`);
    }
  }

  async function handleShare() {
    if (!canvasRef.current) return;
    setSharing(true);
    try {
      await shareImage(canvasRef.current, `qrcodex-${fmt.bcid}.png`);
    } finally {
      setSharing(false);
    }
  }

  function handleIconSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const b64 = ev.target?.result as string;
      setQrIcon(b64);
      storageSet(STORAGE_KEYS.qrIcon, b64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleRemoveIcon() {
    setQrIcon(null);
    storageSet(STORAGE_KEYS.qrIcon, null);
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="px-4 pt-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Content</label>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setGenerated(false); }}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-accent/40"
            placeholder="Enter text, URL, or data…"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Format</label>
          <select
            value={formatIdx}
            onChange={e => { setFormatIdx(+e.target.value); setGenerated(false); setError(null); }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {FORMATS.map((f, i) => <option key={f.bcid} value={i}>{f.label}</option>)}
          </select>
        </div>

        {isQr && (
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Center Icon (optional)</label>
            <div className="flex items-center gap-3">
              {qrIcon ? (
                <>
                  <img src={qrIcon} alt="Icon" className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-200" />
                  <button onClick={() => iconInputRef.current?.click()} className="text-sm text-accent font-medium">Change</button>
                  <button onClick={handleRemoveIcon} className="text-sm text-red-400 font-medium">Remove</button>
                </>
              ) : (
                <button onClick={() => iconInputRef.current?.click()} className="text-sm text-accent font-medium flex items-center gap-1">
                  ➕ Choose icon image
                </button>
              )}
            </div>
            <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconSelect} />
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={!text.trim()}
          className="w-full bg-accent text-white rounded-2xl py-3 font-semibold text-sm disabled:opacity-40"
        >
          Generate
        </button>

        <canvas ref={canvasRef} className="hidden" />

        {generated && (
          <div className="text-center space-y-3">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-center">
              <img ref={imgRef} alt="Generated barcode" className="max-w-full" />
            </div>
            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full bg-gray-900 text-white rounded-2xl py-3 font-semibold text-sm disabled:opacity-40"
            >
              {sharing ? 'Sharing…' : '📤 Share'}
            </button>
            <button onClick={() => setGenerated(false)} className="w-full text-sm text-gray-400 py-2">
              Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
