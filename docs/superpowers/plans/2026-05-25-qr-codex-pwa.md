# QR Codex PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build QR Codex — a fully client-side PWA that scans, generates, and analyzes all 1D/2D barcodes with history, GPS tagging, and semantic identification.

**Architecture:** React 18 + TypeScript + Vite SPA. All state in React + localStorage. No backend. ZXing for scanning, bwip-js for generation, custom rule-based analyzer for semantic identification.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, @zxing/browser, bwip-js, vite-plugin-pwa (Workbox)

---

## File Map

```
src/
  types.ts                   — ScanEntry, AppSettings, AnalysisResult, SemanticType
  utils/
    storage.ts               — localStorage get/set helpers
    beep.ts                  — Web Audio API tone
    share.ts                 — navigator.share with download fallback
    analyzer.ts              — client-side barcode analysis pipeline
    lookups.ts               — Open Food Facts + Google Books fetch helpers
  hooks/
    useSettings.ts           — read/write AppSettings from localStorage
    useHistory.ts            — read/write ScanEntry[] from localStorage
    useGeolocation.ts        — non-blocking GPS helper
    useScanner.ts            — ZXing camera scanning loop
  components/
    Toggle.tsx               — reusable labeled toggle switch
    TabBar.tsx               — bottom 4-tab navigation
    Toast.tsx                — slide-up scan notification
    DetailModal.tsx          — full-screen barcode detail overlay
  tabs/
    ScanTab.tsx              — camera viewfinder + photo import
    HistoryTab.tsx           — scan history list
    CreateTab.tsx            — barcode generation form
    SettingsTab.tsx          — app preferences
  App.tsx                    — tab routing + toast state + update banner
  main.tsx                   — React root + PWA registration
public/
  icon.svg                   — master app icon (used to generate PNG icons)
  icons/
    icon-192.png
    icon-512.png
vite.config.ts
tailwind.config.ts
postcss.config.js
index.html
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx` (stub), `src/index.css`

- [ ] **Step 1: Init git and scaffold Vite project**

```bash
cd /Users/prateeksureka/Sites/barcodeapp
git init
npm create vite@latest . -- --template react-ts --yes
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install @zxing/browser bwip-js vite-plugin-pwa workbox-window
npm install -D tailwindcss postcss autoprefixer vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
npx tailwindcss init -p
```

- [ ] **Step 3: Write `vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icons/*.png'],
      manifest: {
        name: 'QR Codex',
        short_name: 'QR Codex',
        description: 'Scan, generate, and identify any barcode or QR code',
        theme_color: '#2563EB',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

- [ ] **Step 4: Write `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#2563EB',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 5: Write `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

* {
  -webkit-tap-highlight-color: transparent;
}

body {
  overscroll-behavior: none;
  user-select: none;
  -webkit-user-select: none;
}
```

- [ ] **Step 6: Write `src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 7: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#2563EB" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <title>QR Codex</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create a minimal `src/App.tsx` stub so the build works**

```tsx
export default function App() {
  return <div className="min-h-screen bg-white flex items-center justify-center text-gray-500">QR Codex</div>;
}
```

- [ ] **Step 9: Update `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 10: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 11: Create placeholder SVG icon**

Write `public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" fill="none">
  <rect width="192" height="192" rx="40" fill="#2563EB"/>
  <rect x="32" y="32" width="52" height="52" rx="6" stroke="white" stroke-width="8" fill="none"/>
  <rect x="108" y="32" width="52" height="52" rx="6" stroke="white" stroke-width="8" fill="none"/>
  <rect x="32" y="108" width="52" height="52" rx="6" stroke="white" stroke-width="8" fill="none"/>
  <rect x="44" y="44" width="28" height="28" rx="2" fill="white"/>
  <rect x="120" y="44" width="28" height="28" rx="2" fill="white"/>
  <rect x="44" y="120" width="28" height="28" rx="2" fill="white"/>
  <rect x="108" y="108" width="12" height="12" fill="white"/>
  <rect x="128" y="108" width="12" height="12" fill="white"/>
  <rect x="148" y="108" width="12" height="12" fill="white"/>
  <rect x="108" y="128" width="12" height="12" fill="white"/>
  <rect x="148" y="128" width="12" height="12" fill="white"/>
  <rect x="128" y="148" width="12" height="12" fill="white"/>
  <rect x="108" y="148" width="32" height="12" fill="white"/>
</svg>
```

- [ ] **Step 12: Generate PNG icons using a Node script**

Create `scripts/gen-icons.mjs`:

```javascript
import { createCanvas, loadImage } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';

// If 'canvas' package not available, use a fallback: copy the SVG as placeholder
// Run: node scripts/gen-icons.mjs
// Requires: npm install -D canvas (optional)
// If canvas not available, icons will be the SVG served at /icon.svg
// vite-plugin-pwa falls back gracefully.
console.log('Icon generation: copy public/icon.svg to public/icons/ manually or use an online SVG-to-PNG converter for 192x192 and 512x512.');
mkdirSync('public/icons', { recursive: true });
```

```bash
mkdir -p public/icons
# Use any online tool or Inkscape to export icon.svg at 192x192 and 512x512
# For CI/development, create 1x1 placeholder PNGs so build doesn't fail:
node -e "
const { createCanvas } = require('canvas');
[192, 512].forEach(s => {
  const c = createCanvas(s, s);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2563EB';
  ctx.fillRect(0,0,s,s);
  require('fs').writeFileSync('public/icons/icon-'+s+'.png', c.toBuffer('image/png'));
});
" 2>/dev/null || echo "canvas not installed — create public/icons/icon-192.png and icon-512.png manually"
```

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TS + Tailwind + PWA"
```

---

## Task 2: Types and Storage Utilities

**Files:**
- Create: `src/types.ts`, `src/utils/storage.ts`, `src/utils/storage.test.ts`

- [ ] **Step 1: Write `src/types.ts`**

```typescript
export type SemanticType =
  | 'url'
  | 'contact_card'
  | 'wifi_configuration'
  | 'payment'
  | 'crypto_wallet'
  | 'email_action'
  | 'phone_action'
  | 'sms_action'
  | 'authentication'
  | 'health_certificate'
  | 'airline_boarding_pass'
  | 'gs1_payload'
  | 'json_payload'
  | 'internal_identifier'
  | 'retail_product'
  | 'book'
  | 'logistics_tracking'
  | 'internal_enterprise'
  | 'unknown';

export interface ScanEntry {
  id: string;
  text: string;
  format: string;
  semanticType: SemanticType;
  scannedAt: string;
  location?: { lat: number; lng: number; accuracy: number };
}

export interface AppSettings {
  vibrate: boolean;
  beep: boolean;
  saveToHistory: boolean;
  saveDuplicates: boolean;
}

export interface AnalysisResult {
  semanticType: SemanticType;
  classificationConfidence: number;
  parsingConfidence: number;
  parsedFields: Record<string, string>;
  possibleInterpretations?: string[];
}

export interface ExternalLookupResult {
  source: string;
  productName?: string;
  brand?: string;
  imageUrl?: string;
  additionalFields: Record<string, string>;
}

export const SEMANTIC_META: Record<SemanticType, { emoji: string; label: string }> = {
  url:                    { emoji: '🌐', label: 'URL' },
  contact_card:           { emoji: '👤', label: 'Contact' },
  wifi_configuration:     { emoji: '📶', label: 'Wi-Fi' },
  payment:                { emoji: '💳', label: 'Payment' },
  crypto_wallet:          { emoji: '₿',  label: 'Crypto' },
  email_action:           { emoji: '✉️', label: 'Email' },
  phone_action:           { emoji: '📞', label: 'Phone' },
  sms_action:             { emoji: '💬', label: 'SMS' },
  authentication:         { emoji: '🔐', label: 'Auth' },
  health_certificate:     { emoji: '🏥', label: 'Health' },
  airline_boarding_pass:  { emoji: '🛫', label: 'Boarding Pass' },
  retail_product:         { emoji: '📦', label: 'Product' },
  book:                   { emoji: '📚', label: 'Book' },
  logistics_tracking:     { emoji: '🚚', label: 'Tracking' },
  gs1_payload:            { emoji: '🏷️', label: 'GS1' },
  json_payload:           { emoji: '{}', label: 'JSON' },
  internal_identifier:    { emoji: '🔑', label: 'ID' },
  internal_enterprise:    { emoji: '🏢', label: 'Enterprise' },
  unknown:                { emoji: '❓', label: 'Unknown' },
};

export const DEFAULT_SETTINGS: AppSettings = {
  vibrate: false,
  beep: true,
  saveToHistory: true,
  saveDuplicates: false,
};

export const STORAGE_KEYS = {
  history: 'qrcodex_history',
  settings: 'qrcodex_settings',
  qrIcon: 'qrcodex_qr_icon',
} as const;
```

- [ ] **Step 2: Write `src/utils/storage.ts`**

```typescript
export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function storageSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
```

- [ ] **Step 3: Write `src/utils/storage.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { storageGet, storageSet, storageRemove } from './storage';

beforeEach(() => localStorage.clear());

describe('storageGet', () => {
  it('returns fallback when key absent', () => {
    expect(storageGet('missing', 42)).toBe(42);
  });

  it('returns parsed value when key present', () => {
    localStorage.setItem('k', JSON.stringify({ x: 1 }));
    expect(storageGet('k', null)).toEqual({ x: 1 });
  });

  it('returns fallback on invalid JSON', () => {
    localStorage.setItem('bad', 'not-json{');
    expect(storageGet('bad', 99)).toBe(99);
  });
});

describe('storageSet', () => {
  it('serialises value to localStorage', () => {
    storageSet('k', { a: 'b' });
    expect(JSON.parse(localStorage.getItem('k')!)).toEqual({ a: 'b' });
  });
});

describe('storageRemove', () => {
  it('removes the key', () => {
    localStorage.setItem('k', 'v');
    storageRemove('k');
    expect(localStorage.getItem('k')).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/utils/storage.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add types, storage utilities"
```

---

## Task 3: Settings Hook and History Hook

**Files:**
- Create: `src/hooks/useSettings.ts`, `src/hooks/useHistory.ts`, `src/hooks/useHistory.test.ts`

- [ ] **Step 1: Write `src/hooks/useSettings.ts`**

```typescript
import { useState, useCallback } from 'react';
import { AppSettings, DEFAULT_SETTINGS, STORAGE_KEYS } from '../types';
import { storageGet, storageSet } from '../utils/storage';

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(() =>
    storageGet<AppSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      storageSet(STORAGE_KEYS.settings, next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
```

- [ ] **Step 2: Write `src/hooks/useHistory.ts`**

```typescript
import { useState, useCallback } from 'react';
import { ScanEntry, STORAGE_KEYS } from '../types';
import { storageGet, storageSet } from '../utils/storage';

export function useHistory() {
  const [history, setHistory] = useState<ScanEntry[]>(() =>
    storageGet<ScanEntry[]>(STORAGE_KEYS.history, [])
  );

  const addEntry = useCallback((entry: ScanEntry) => {
    setHistory(prev => {
      const next = [entry, ...prev];
      storageSet(STORAGE_KEYS.history, next);
      return next;
    });
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setHistory(prev => {
      const next = prev.filter(e => e.id !== id);
      storageSet(STORAGE_KEYS.history, next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    storageSet(STORAGE_KEYS.history, []);
  }, []);

  const hasText = useCallback((text: string) =>
    history.some(e => e.text === text),
  [history]);

  return { history, addEntry, deleteEntry, clearHistory, hasText };
}
```

- [ ] **Step 3: Write `src/hooks/useHistory.test.ts`**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from './useHistory';
import { ScanEntry } from '../types';

const makeEntry = (text: string): ScanEntry => ({
  id: crypto.randomUUID(),
  text,
  format: 'QR_CODE',
  semanticType: 'url',
  scannedAt: new Date().toISOString(),
});

beforeEach(() => localStorage.clear());

describe('useHistory', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useHistory());
    expect(result.current.history).toHaveLength(0);
  });

  it('addEntry prepends and persists', () => {
    const { result } = renderHook(() => useHistory());
    const entry = makeEntry('https://example.com');
    act(() => result.current.addEntry(entry));
    expect(result.current.history[0]).toEqual(entry);
    expect(JSON.parse(localStorage.getItem('qrcodex_history')!)[0]).toEqual(entry);
  });

  it('deleteEntry removes by id', () => {
    const { result } = renderHook(() => useHistory());
    const e1 = makeEntry('a');
    const e2 = makeEntry('b');
    act(() => { result.current.addEntry(e1); result.current.addEntry(e2); });
    act(() => result.current.deleteEntry(e1.id));
    expect(result.current.history.every(e => e.id !== e1.id)).toBe(true);
  });

  it('hasText returns true when text exists', () => {
    const { result } = renderHook(() => useHistory());
    act(() => result.current.addEntry(makeEntry('hello')));
    expect(result.current.hasText('hello')).toBe(true);
    expect(result.current.hasText('world')).toBe(false);
  });

  it('clearHistory empties list and storage', () => {
    const { result } = renderHook(() => useHistory());
    act(() => result.current.addEntry(makeEntry('x')));
    act(() => result.current.clearHistory());
    expect(result.current.history).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('qrcodex_history')!)).toHaveLength(0);
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- src/hooks/useHistory.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: useSettings and useHistory hooks"
```

---

## Task 4: Beep, Share, and Geolocation Utilities

**Files:**
- Create: `src/utils/beep.ts`, `src/utils/share.ts`, `src/hooks/useGeolocation.ts`

- [ ] **Step 1: Write `src/utils/beep.ts`**

```typescript
let audioCtx: AudioContext | null = null;

export function beep(): void {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.08);
  } catch {
    // Web Audio not available — silently skip
  }
}
```

- [ ] **Step 2: Write `src/utils/share.ts`**

```typescript
export async function shareImage(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'QR Codex barcode' });
          resolve();
        } catch (e) {
          if ((e as DOMException).name !== 'AbortError') reject(e);
          else resolve();
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        resolve();
      }
    }, 'image/png');
  });
}
```

- [ ] **Step 3: Write `src/hooks/useGeolocation.ts`**

```typescript
import { useCallback, useRef } from 'react';

interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export function useGeolocation() {
  const pendingRef = useRef<Map<string, (pos: GeoPosition | null) => void>>(new Map());

  const requestPosition = useCallback((id: string): Promise<GeoPosition | null> => {
    return new Promise(resolve => {
      if (!('geolocation' in navigator)) { resolve(null); return; }
      pendingRef.current.set(id, resolve);
      navigator.geolocation.getCurrentPosition(
        pos => {
          const cb = pendingRef.current.get(id);
          pendingRef.current.delete(id);
          cb?.({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        },
        () => {
          const cb = pendingRef.current.get(id);
          pendingRef.current.delete(id);
          cb?.(null);
        },
        { timeout: 5000, maximumAge: 30000 }
      );
    });
  }, []);

  return { requestPosition };
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: beep, share, geolocation utilities"
```

---

## Task 5: Barcode Analyzer — Core Parsers

**Files:**
- Create: `src/utils/analyzer.ts`, `src/utils/analyzer.test.ts`

- [ ] **Step 1: Write `src/utils/analyzer.ts`**

```typescript
import { AnalysisResult, SemanticType } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

function confidence(cls: number, parse: number): Pick<AnalysisResult, 'classificationConfidence' | 'parsingConfidence'> {
  return { classificationConfidence: cls, parsingConfidence: parse };
}

function result(
  semanticType: SemanticType,
  parsedFields: Record<string, string>,
  cls: number,
  parse: number,
  possibleInterpretations?: string[]
): AnalysisResult {
  return { semanticType, parsedFields, possibleInterpretations, ...confidence(cls, parse) };
}

// ── URL ──────────────────────────────────────────────────────────────────────

function parseUrl(text: string): AnalysisResult | null {
  if (!/^https?:\/\//i.test(text)) return null;
  try {
    const u = new URL(text);
    const fields: Record<string, string> = { Domain: u.hostname };
    if (u.pathname !== '/') fields['Path'] = u.pathname;
    u.searchParams.forEach((v, k) => { fields[`Query: ${k}`] = v; });
    return result('url', fields, 0.99, 0.99);
  } catch {
    return result('url', { URL: text }, 0.95, 0.5);
  }
}

// ── vCard ─────────────────────────────────────────────────────────────────────

function parseVCard(text: string): AnalysisResult | null {
  if (!/^BEGIN:VCARD/i.test(text)) return null;
  const fields: Record<string, string> = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).split(';')[0].toUpperCase();
    const val = line.slice(colon + 1).trim();
    if (!val) continue;
    if (key === 'FN') fields['Name'] = val;
    else if (key === 'ORG') fields['Organisation'] = val;
    else if (key === 'EMAIL') fields['Email'] = val;
    else if (key === 'TEL') fields['Phone'] = val;
    else if (key === 'ADR') fields['Address'] = val.replace(/;/g, ', ').replace(/^,\s*/, '');
    else if (key === 'URL') fields['Website'] = val;
  }
  return result('contact_card', fields, 0.99, 0.9);
}

// ── MECARD ───────────────────────────────────────────────────────────────────

function parseMecard(text: string): AnalysisResult | null {
  if (!/^MECARD:/i.test(text)) return null;
  const body = text.slice(7);
  const fields: Record<string, string> = {};
  const tokens = body.split(';');
  for (const token of tokens) {
    const colon = token.indexOf(':');
    if (colon < 0) continue;
    const k = token.slice(0, colon).toUpperCase();
    const v = token.slice(colon + 1).trim().replace(/;$/, '');
    if (k === 'N') fields['Name'] = v;
    else if (k === 'TEL') fields['Phone'] = v;
    else if (k === 'EMAIL') fields['Email'] = v;
    else if (k === 'ADR') fields['Address'] = v;
    else if (k === 'URL') fields['Website'] = v;
  }
  return result('contact_card', fields, 0.99, 0.88);
}

// ── WiFi ─────────────────────────────────────────────────────────────────────

function parseWifi(text: string): AnalysisResult | null {
  if (!/^WIFI:/i.test(text)) return null;
  const fields: Record<string, string> = {};
  const body = text.slice(5);
  const re = /([A-Z]+):((?:[^;\\]|\\.)*);?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const k = m[1].toUpperCase();
    const v = m[2].replace(/\\(.)/g, '$1');
    if (k === 'S') fields['SSID'] = v;
    else if (k === 'T') fields['Security'] = v || 'None';
    else if (k === 'P') fields['Password'] = v;
    else if (k === 'H') fields['Hidden'] = v === 'true' ? 'Yes' : 'No';
  }
  return result('wifi_configuration', fields, 0.99, 0.92);
}

// ── Simple URI schemes ────────────────────────────────────────────────────────

function parseSimpleUri(text: string): AnalysisResult | null {
  const lc = text.toLowerCase();
  if (lc.startsWith('mailto:')) {
    const addr = text.slice(7).split('?')[0];
    return result('email_action', { 'Email Address': addr }, 0.99, 0.95);
  }
  if (lc.startsWith('tel:')) {
    return result('phone_action', { 'Phone Number': text.slice(4) }, 0.99, 0.95);
  }
  if (lc.startsWith('smsto:') || lc.startsWith('sms:')) {
    const body = text.slice(lc.startsWith('smsto:') ? 6 : 4);
    const [num, msg] = body.split(':');
    const fields: Record<string, string> = { 'Phone Number': num };
    if (msg) fields['Message'] = msg;
    return result('sms_action', fields, 0.99, 0.9);
  }
  if (lc.startsWith('otpauth://')) {
    try {
      const u = new URL(text);
      const fields: Record<string, string> = {};
      const label = decodeURIComponent(u.pathname.slice(1));
      if (label) fields['Account'] = label;
      const issuer = u.searchParams.get('issuer');
      if (issuer) fields['Issuer'] = issuer;
      const type = u.host;
      if (type) fields['Type'] = type.toUpperCase();
      return result('authentication', fields, 0.99, 0.9);
    } catch {
      return result('authentication', {}, 0.95, 0.5);
    }
  }
  if (lc.startsWith('bitcoin:') || lc.startsWith('ethereum:') || lc.startsWith('litecoin:')) {
    const scheme = text.split(':')[0].toLowerCase();
    const addr = text.split(':')[1]?.split('?')[0] ?? '';
    return result('crypto_wallet', { Currency: scheme.charAt(0).toUpperCase() + scheme.slice(1), Address: addr }, 0.99, 0.9);
  }
  if (lc.startsWith('upi://')) {
    try {
      const u = new URL(text);
      const fields: Record<string, string> = {};
      const pa = u.searchParams.get('pa');
      const pn = u.searchParams.get('pn');
      const am = u.searchParams.get('am');
      if (pa) fields['VPA'] = pa;
      if (pn) fields['Payee'] = pn;
      if (am) fields['Amount'] = `₹${am}`;
      return result('payment', fields, 0.99, 0.92);
    } catch {
      return result('payment', {}, 0.95, 0.5);
    }
  }
  if (lc.startsWith('hc1:')) {
    return result('health_certificate', { Note: 'EU Digital COVID Certificate (encoded)' }, 0.95, 0.3);
  }
  return null;
}

// ── JSON ─────────────────────────────────────────────────────────────────────

function parseJson(text: string): AnalysisResult | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    const fields: Record<string, string> = {};
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      Object.entries(parsed).slice(0, 8).forEach(([k, v]) => {
        fields[k] = typeof v === 'string' ? v : JSON.stringify(v);
      });
    } else {
      fields['Value'] = trimmed.slice(0, 200);
    }
    return result('json_payload', fields, 0.95, 0.95);
  } catch {
    return null;
  }
}

// ── UUID ──────────────────────────────────────────────────────────────────────

function parseUuid(text: string): AnalysisResult | null {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text.trim())) {
    return result('internal_identifier', { UUID: text.trim() }, 0.9, 0.99);
  }
  return null;
}

// ── EAN / UPC / ISBN ──────────────────────────────────────────────────────────

function ean13Checksum(digits: string): boolean {
  if (digits.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === parseInt(digits[12]);
}

function isbn10Checksum(digits: string): boolean {
  if (digits.length !== 10) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  const last = digits[9].toUpperCase() === 'X' ? 10 : parseInt(digits[9]);
  return (sum + last) % 11 === 0;
}

function parseProductCode(text: string, format: string): AnalysisResult | null {
  const t = text.trim().replace(/[^0-9Xx]/g, '');

  // ISBN-10
  if (t.length === 10 && isbn10Checksum(t)) {
    return result('book', { 'ISBN-10': t, 'ISBN-13': `978${t.slice(0, 9)}` }, 0.9, 0.95);
  }

  // EAN-13 / ISBN-13 / UPC-A (12 digits are treated as UPC-A padded)
  if (t.length === 13 && ean13Checksum(t)) {
    if (t.startsWith('978') || t.startsWith('979')) {
      return result('book', { 'ISBN-13': t, Prefix: t.startsWith('978') ? '978 (ISBN)' : '979 (ISBN)' }, 0.95, 0.97);
    }
    return result('retail_product', {
      GTIN: t,
      'Country Prefix': t.slice(0, 3),
      'Manufacturer Code': t.slice(3, 8),
      'Product Code': t.slice(8, 12),
    }, 0.95, 0.97);
  }

  // UPC-A (12 digits) — prepend 0 and validate as EAN-13
  if (t.length === 12 && ean13Checksum('0' + t)) {
    return result('retail_product', {
      'UPC-A': t,
      GTIN: `0${t}`,
      'Manufacturer Code': t.slice(1, 6),
      'Product Code': t.slice(6, 11),
    }, 0.95, 0.97);
  }

  // EAN-8
  if (t.length === 8 && (format === 'EAN_8' || format.includes('EAN'))) {
    return result('retail_product', { 'EAN-8': t }, 0.85, 0.8);
  }

  return null;
}

// ── Logistics / Tracking ──────────────────────────────────────────────────────

const CARRIER_PATTERNS: Array<{ name: string; re: RegExp; url: (n: string) => string }> = [
  { name: 'UPS', re: /^1Z[A-Z0-9]{16}$/i, url: n => `https://www.ups.com/track?tracknum=${n}` },
  { name: 'FedEx', re: /^[0-9]{12,15}$/, url: n => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  { name: 'DHL', re: /^[0-9]{10,11}$/, url: n => `https://www.dhl.com/track?tracking-id=${n}` },
  { name: 'USPS', re: /^(94|93|92|94|95)[0-9]{20}$/, url: n => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}` },
];

function parseTracking(text: string): AnalysisResult | null {
  for (const c of CARRIER_PATTERNS) {
    if (c.re.test(text.trim())) {
      return result('logistics_tracking', { Carrier: c.name, 'Tracking Number': text.trim(), 'Track At': c.url(text.trim()) }, 0.85, 0.8);
    }
  }
  // Generic long numeric
  if (/^[0-9]{18,22}$/.test(text.trim())) {
    return result('logistics_tracking', { 'Tracking Number': text.trim() }, 0.6, 0.5);
  }
  return null;
}

// ── IATA BCBP ────────────────────────────────────────────────────────────────

function parseBcbp(text: string, format: string): AnalysisResult | null {
  if (!(format === 'PDF_417' || format === 'AZTEC' || format === 'QR_CODE')) return null;
  if (!/^M\d/.test(text)) return null;
  // Leg 1 mandatory fields start at fixed positions (IATA resolution 792)
  const name = text.slice(2, 22).trim().replace('/', ' / ');
  const eTicket = text[22] === 'E' ? 'Yes' : 'No';
  const pnr = text.slice(23, 30).trim();
  const from = text.slice(30, 33).trim();
  const to = text.slice(33, 36).trim();
  const carrier = text.slice(36, 39).trim();
  const flight = text.slice(39, 44).trim().replace(/^0+/, '');
  const julianRaw = text.slice(44, 47);
  const seat = text.slice(48, 52).trim();
  const julian = parseInt(julianRaw, 10);
  let flightDate = julianRaw;
  if (!isNaN(julian)) {
    const d = new Date(new Date().getFullYear(), 0);
    d.setDate(julian);
    flightDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const fields: Record<string, string> = {};
  if (name) fields['Passenger'] = name;
  if (from && to) fields['Route'] = `${from} → ${to}`;
  if (carrier && flight) fields['Flight'] = `${carrier}${flight}`;
  if (flightDate) fields['Date'] = flightDate;
  if (seat) fields['Seat'] = seat;
  if (pnr) fields['PNR'] = pnr;
  fields['E-Ticket'] = eTicket;
  return result('airline_boarding_pass', fields, 0.95, 0.85);
}

// ── GS1 Application Identifiers ──────────────────────────────────────────────

const GS1_AIS: Record<string, string> = {
  '00': 'SSCC', '01': 'GTIN', '02': 'GTIN of contained trade items',
  '10': 'Batch/Lot', '11': 'Production Date', '13': 'Packaging Date',
  '15': 'Best Before', '17': 'Expiry Date', '20': 'Variant', '21': 'Serial',
  '30': 'Quantity', '37': 'Quantity of units', '240': 'Additional ID',
  '241': 'Customer Part', '310': 'Net Weight (kg)',
};

function parseGs1(text: string): AnalysisResult | null {
  const FNC1 = '';
  if (!text.includes(FNC1) && !text.startsWith('(')) return null;
  const fields: Record<string, string> = {};
  let s = text.replace(new RegExp(FNC1, 'g'), '');
  // Strip parenthetical AIs
  s = s.replace(/\((\d{2,4})\)/g, '$1');
  const parts = s.split('').filter(Boolean);
  for (const part of parts) {
    for (const ai of Object.keys(GS1_AIS).sort((a, b) => b.length - a.length)) {
      if (part.startsWith(ai)) {
        fields[GS1_AIS[ai]] = part.slice(ai.length);
        break;
      }
    }
  }
  if (Object.keys(fields).length === 0) return null;
  return result('gs1_payload', fields, 0.9, 0.85);
}

// ── Heuristic fallback ────────────────────────────────────────────────────────

function heuristic(text: string): AnalysisResult {
  const possible: string[] = [];
  if (/^[0-9\s\-]{6,20}$/.test(text)) possible.push('logistics tracking number', 'internal product code');
  if (/^[A-Z0-9\-]{4,20}$/.test(text)) possible.push('internal enterprise identifier', 'ticket or access code');
  if (possible.length === 0) possible.push('unknown proprietary format');
  return result('unknown', {}, 0.2, 0, possible);
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function analyzeBarcode(text: string, format: string): AnalysisResult {
  return (
    parseUrl(text) ??
    parseVCard(text) ??
    parseMecard(text) ??
    parseWifi(text) ??
    parseSimpleUri(text) ??
    parseJson(text) ??
    parseUuid(text) ??
    parseBcbp(text, format) ??
    parseGs1(text) ??
    parseProductCode(text, format) ??
    parseTracking(text) ??
    heuristic(text)
  );
}
```

- [ ] **Step 2: Write `src/utils/analyzer.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { analyzeBarcode } from './analyzer';

describe('analyzeBarcode — URL', () => {
  it('classifies https URL', () => {
    const r = analyzeBarcode('https://example.com/path?q=1', 'QR_CODE');
    expect(r.semanticType).toBe('url');
    expect(r.parsedFields['Domain']).toBe('example.com');
    expect(r.parsedFields['Query: q']).toBe('1');
  });
});

describe('analyzeBarcode — vCard', () => {
  it('parses vCard', () => {
    const vcard = 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Jane Doe\r\nEMAIL:jane@example.com\r\nEND:VCARD';
    const r = analyzeBarcode(vcard, 'QR_CODE');
    expect(r.semanticType).toBe('contact_card');
    expect(r.parsedFields['Name']).toBe('Jane Doe');
    expect(r.parsedFields['Email']).toBe('jane@example.com');
  });
});

describe('analyzeBarcode — WiFi', () => {
  it('parses WiFi QR', () => {
    const r = analyzeBarcode('WIFI:S:MyNetwork;T:WPA;P:secret123;;', 'QR_CODE');
    expect(r.semanticType).toBe('wifi_configuration');
    expect(r.parsedFields['SSID']).toBe('MyNetwork');
    expect(r.parsedFields['Password']).toBe('secret123');
  });
});

describe('analyzeBarcode — simple URI schemes', () => {
  it('mailto', () => expect(analyzeBarcode('mailto:a@b.com', 'QR_CODE').semanticType).toBe('email_action'));
  it('tel', () => expect(analyzeBarcode('tel:+441234567890', 'QR_CODE').semanticType).toBe('phone_action'));
  it('sms', () => expect(analyzeBarcode('smsto:+1234:Hello', 'QR_CODE').semanticType).toBe('sms_action'));
  it('otpauth', () => expect(analyzeBarcode('otpauth://totp/Acme:alice@ex.com?secret=ABC&issuer=Acme', 'QR_CODE').semanticType).toBe('authentication'));
  it('bitcoin', () => expect(analyzeBarcode('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf', 'QR_CODE').semanticType).toBe('crypto_wallet'));
  it('upi', () => expect(analyzeBarcode('upi://pay?pa=merchant@bank&pn=Merchant&am=100', 'QR_CODE').semanticType).toBe('payment'));
});

describe('analyzeBarcode — EAN-13', () => {
  it('valid EAN-13 barcode', () => {
    const r = analyzeBarcode('5901234123457', 'EAN_13');
    expect(r.semanticType).toBe('retail_product');
    expect(r.parsedFields['GTIN']).toBe('5901234123457');
  });
});

describe('analyzeBarcode — ISBN-13', () => {
  it('978 prefix treated as book', () => {
    const r = analyzeBarcode('9780306406157', 'EAN_13');
    expect(r.semanticType).toBe('book');
  });
});

describe('analyzeBarcode — UUID', () => {
  it('UUID detected', () => {
    const r = analyzeBarcode('550e8400-e29b-41d4-a716-446655440000', 'QR_CODE');
    expect(r.semanticType).toBe('internal_identifier');
  });
});

describe('analyzeBarcode — JSON', () => {
  it('JSON payload', () => {
    const r = analyzeBarcode('{"key":"value","num":42}', 'QR_CODE');
    expect(r.semanticType).toBe('json_payload');
    expect(r.parsedFields['key']).toBe('value');
  });
});

describe('analyzeBarcode — unknown', () => {
  it('falls back to unknown', () => {
    const r = analyzeBarcode('ZXCV1234ASDF', 'CODE_128');
    expect(r.semanticType).toBe('unknown');
    expect(r.possibleInterpretations?.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test -- src/utils/analyzer.test.ts
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: barcode analysis engine with all parsers"
```

---

## Task 6: External Lookups Utility

**Files:**
- Create: `src/utils/lookups.ts`

- [ ] **Step 1: Write `src/utils/lookups.ts`**

```typescript
import { ExternalLookupResult, SemanticType } from '../types';

export async function fetchExternalLookup(
  text: string,
  semanticType: SemanticType
): Promise<ExternalLookupResult | null> {
  if (semanticType === 'retail_product') return fetchFoodFacts(text);
  if (semanticType === 'book') return fetchGoogleBooks(text);
  return null;
}

async function fetchFoodFacts(barcode: string): Promise<ExternalLookupResult | null> {
  const clean = barcode.replace(/[^0-9]/g, '');
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${clean}.json`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    const additional: Record<string, string> = {};
    if (p.quantity) additional['Quantity'] = p.quantity;
    if (p.categories) additional['Categories'] = p.categories.split(',')[0].trim();
    if (p.nutriment?.['energy-kcal_100g']) additional['Energy (per 100g)'] = `${p.nutriment['energy-kcal_100g']} kcal`;
    return {
      source: 'Open Food Facts',
      productName: p.product_name || p.product_name_en,
      brand: p.brands,
      imageUrl: p.image_small_url || p.image_url,
      additionalFields: additional,
    };
  } catch {
    return null;
  }
}

async function fetchGoogleBooks(isbn: string): Promise<ExternalLookupResult | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&maxResults=1`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await res.json();
    const item = data.items?.[0]?.volumeInfo;
    if (!item) return null;
    const additional: Record<string, string> = {};
    if (item.publisher) additional['Publisher'] = item.publisher;
    if (item.publishedDate) additional['Published'] = item.publishedDate;
    if (item.pageCount) additional['Pages'] = String(item.pageCount);
    if (item.categories?.length) additional['Category'] = item.categories[0];
    return {
      source: 'Google Books',
      productName: item.title,
      brand: item.authors?.join(', '),
      imageUrl: item.imageLinks?.thumbnail?.replace('http://', 'https://'),
      additionalFields: additional,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: external lookup utilities (Open Food Facts, Google Books)"
```

---

## Task 7: Scanner Hook

**Files:**
- Create: `src/hooks/useScanner.ts`

- [ ] **Step 1: Write `src/hooks/useScanner.ts`**

```typescript
import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException } from '@zxing/library';

export type ScanResult = { text: string; format: string };

interface UseScannerOptions {
  onResult: (result: ScanResult) => void;
  enabled: boolean;
}

export function useScanner(videoRef: React.RefObject<HTMLVideoElement>, { onResult, enabled }: UseScannerOptions) {
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then(devices => {
        setCameras(devices);
        // Prefer back camera
        const backIdx = devices.findIndex(d =>
          /back|rear|environment/i.test(d.label)
        );
        if (backIdx >= 0) setCameraIndex(backIdx);
      })
      .catch(() => setError('Could not enumerate cameras'));
  }, []);

  useEffect(() => {
    if (!enabled || !videoRef.current || cameras.length === 0) return;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    setIsReady(false);
    setError(null);
    const deviceId = cameras[cameraIndex]?.deviceId;

    reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
      setIsReady(true);
      if (result) {
        onResultRef.current({
          text: result.getText(),
          format: result.getBarcodeFormat().toString(),
        });
      } else if (err && !(err instanceof NotFoundException) && !(err instanceof ChecksumException) && !(err instanceof FormatException)) {
        setError('Camera error. Please retry.');
      }
    }).then(controls => {
      controlsRef.current = controls;
    }).catch(e => {
      setError(e?.message ?? 'Camera not accessible');
    });

    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [enabled, cameras, cameraIndex, videoRef]);

  const flipCamera = useCallback(() => {
    controlsRef.current?.stop();
    setCameraIndex(i => (i + 1) % Math.max(cameras.length, 1));
  }, [cameras.length]);

  const decodeFromImage = useCallback(async (file: File): Promise<ScanResult[]> => {
    const url = URL.createObjectURL(file);
    const reader = new BrowserMultiFormatReader();
    try {
      const result = await reader.decodeFromImageUrl(url);
      return [{ text: result.getText(), format: result.getBarcodeFormat().toString() }];
    } catch {
      return [];
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  return { cameras, cameraIndex, error, isReady, flipCamera, decodeFromImage };
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: useScanner hook with ZXing"
```

---

## Task 8: Base UI Components

**Files:**
- Create: `src/components/Toggle.tsx`, `src/components/TabBar.tsx`, `src/components/Toast.tsx`

- [ ] **Step 1: Write `src/components/Toggle.tsx`**

```tsx
interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left disabled:opacity-40"
    >
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
      <div className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-accent' : 'bg-gray-200'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Write `src/components/TabBar.tsx`**

```tsx
export type TabId = 'scan' | 'history' | 'create' | 'settings';

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'scan',     label: 'Scan',     icon: '⬛' },
  { id: 'history',  label: 'History',  icon: '🕐' },
  { id: 'create',   label: 'Create',   icon: '➕' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

interface TabBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
            active === t.id ? 'text-accent' : 'text-gray-400'
          }`}
        >
          <span className="text-xl leading-none">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Write `src/components/Toast.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { SEMANTIC_META, SemanticType } from '../types';

export interface ToastData {
  id: string;
  text: string;
  format: string;
  semanticType: SemanticType;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
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
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{toast.text}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs bg-white/20 rounded px-1.5 py-0.5">{toast.format.replace(/_/g, ' ')}</span>
            <span className="text-xs bg-white/20 rounded px-1.5 py-0.5">{meta.emoji} {meta.label}</span>
          </div>
        </div>
        <button onClick={handleCopy} className="text-lg flex-shrink-0 w-8 h-8 flex items-center justify-center">
          {copied ? '✅' : '📋'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Toggle, TabBar, Toast components"
```

---

## Task 9: App Shell

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`

- [ ] **Step 1: Write `src/App.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react';
import { TabBar, TabId } from './components/TabBar';
import { Toast, ToastData } from './components/Toast';
import { ScanTab } from './tabs/ScanTab';
import { HistoryTab } from './tabs/HistoryTab';
import { CreateTab } from './tabs/CreateTab';
import { SettingsTab } from './tabs/SettingsTab';
import { useHistory } from './hooks/useHistory';
import { useSettings } from './hooks/useSettings';
import { ScanEntry } from './types';

declare const __APP_VERSION__: string;

export default function App() {
  const [tab, setTab] = useState<TabId>('scan');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [createText, setCreateText] = useState('');
  const [updateReady, setUpdateReady] = useState(false);
  const { history, addEntry, deleteEntry, clearHistory, hasText } = useHistory();
  const { settings, updateSettings } = useSettings();

  useEffect(() => {
    import('workbox-window').then(({ Workbox }) => {
      if ('serviceWorker' in navigator) {
        const wb = new Workbox('/sw.js');
        wb.addEventListener('waiting', () => setUpdateReady(true));
        wb.register();
      }
    });
  }, []);

  function handleReload() {
    window.location.reload();
  }

  const showToast = useCallback((data: ToastData) => {
    setToast(data);
  }, []);

  function handleCreateFromHistory(text: string) {
    setCreateText(text);
    setTab('create');
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-white overflow-hidden">
      {updateReady && (
        <div className="bg-accent text-white text-sm text-center py-2 px-4 flex items-center justify-center gap-3">
          <span>Update available</span>
          <button onClick={handleReload} className="underline font-semibold">Reload</button>
        </div>
      )}

      <main className="flex-1 overflow-hidden relative">
        <div className={tab === 'scan' ? 'block h-full' : 'hidden'}>
          <ScanTab
            settings={settings}
            history={history}
            hasText={hasText}
            addEntry={addEntry}
            showToast={showToast}
          />
        </div>
        <div className={tab === 'history' ? 'block h-full' : 'hidden'}>
          <HistoryTab
            history={history}
            deleteEntry={deleteEntry}
            onCreateFromEntry={handleCreateFromHistory}
            onSwitchToScan={() => setTab('scan')}
          />
        </div>
        <div className={tab === 'create' ? 'block h-full' : 'hidden'}>
          <CreateTab prefillText={createText} onPrefillConsumed={() => setCreateText('')} />
        </div>
        <div className={tab === 'settings' ? 'block h-full' : 'hidden'}>
          <SettingsTab
            settings={settings}
            updateSettings={updateSettings}
            clearHistory={clearHistory}
            version={typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}
          />
        </div>
      </main>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run build
```

Expected: Build succeeds (tabs are stub imports — create stub files temporarily if needed).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: App shell with tab routing and toast state"
```

---

## Task 10: Scan Tab

**Files:**
- Create: `src/tabs/ScanTab.tsx`

- [ ] **Step 1: Write `src/tabs/ScanTab.tsx`**

```tsx
import { useRef, useState, useCallback } from 'react';
import { useScanner } from '../hooks/useScanner';
import { useGeolocation } from '../hooks/useGeolocation';
import { beep } from '../utils/beep';
import { analyzeBarcode } from '../utils/analyzer';
import { AppSettings, ScanEntry, STORAGE_KEYS } from '../types';
import { ToastData } from '../components/Toast';
import { storageGet } from '../utils/storage';

interface ScanTabProps {
  settings: AppSettings;
  history: ScanEntry[];
  hasText: (text: string) => boolean;
  addEntry: (entry: ScanEntry) => void;
  showToast: (data: ToastData) => void;
}

export function ScanTab({ settings, hasText, addEntry, showToast }: ScanTabProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
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
      // attach GPS non-blocking
      requestPosition(id).then(pos => {
        if (!pos) return;
        const stored: ScanEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || '[]');
        const idx = stored.findIndex(e => e.id === id);
        if (idx >= 0) {
          stored[idx] = { ...stored[idx], location: pos };
          localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(stored));
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
    setCameraPermission('granted');
    setScannerEnabled(true);
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
          <button onClick={() => setScannerEnabled(false) || setScannerEnabled(true)} className="bg-accent text-white rounded-2xl px-6 py-3 font-semibold text-sm">Retry</button>
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
          {['top-0 left-0 border-t-4 border-l-4 rounded-tl-lg',
            'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg',
            'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg',
            'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg',
          ].map((cls, i) => (
            <div key={i} className={`absolute w-10 h-10 border-white ${cls}`} />
          ))}
        </div>
        {hintVisible && (
          <p className="absolute bottom-1/4 text-white/70 text-sm font-medium">Point at a barcode</p>
        )}
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        {cameras.length > 1 && (
          <button
            onClick={flipCamera}
            className="bg-black/50 backdrop-blur text-white rounded-full w-10 h-10 flex items-center justify-center text-lg"
            aria-label="Flip camera"
          >
            🔄
          </button>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-black/50 backdrop-blur text-white rounded-full w-10 h-10 flex items-center justify-center text-lg"
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
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: ScanTab with camera viewfinder and photo import"
```

---

## Task 11: History Tab

**Files:**
- Create: `src/tabs/HistoryTab.tsx`

- [ ] **Step 1: Write `src/tabs/HistoryTab.tsx`**

```tsx
import { useState } from 'react';
import { ScanEntry, SEMANTIC_META } from '../types';
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
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: HistoryTab with list, actions, and detail modal trigger"
```

---

## Task 12: Detail Modal

**Files:**
- Create: `src/components/DetailModal.tsx`

- [ ] **Step 1: Write `src/components/DetailModal.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { ScanEntry, SEMANTIC_META } from '../types';
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
      .then(r => setLookupResult(r))
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
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: DetailModal with parsed fields, external lookup, actions"
```

---

## Task 13: Create Tab

**Files:**
- Create: `src/tabs/CreateTab.tsx`

- [ ] **Step 1: Write `src/tabs/CreateTab.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import bwipjs from 'bwip-js';
import { shareImage } from '../utils/share';
import { storageGet, storageSet } from '../utils/storage';
import { STORAGE_KEYS } from '../types';

const FORMATS: Array<{ label: string; bcid: string; validate?: (s: string) => string | null }> = [
  { label: 'QR Code',      bcid: 'qrcode' },
  { label: 'Aztec Code',   bcid: 'azteccode' },
  { label: 'Data Matrix',  bcid: 'datamatrix' },
  { label: 'PDF 417',      bcid: 'pdf417' },
  { label: 'Code 128',     bcid: 'code128' },
  { label: 'Code 39',      bcid: 'code39' },
  { label: 'EAN-13',       bcid: 'ean13',  validate: s => /^\d{12}$/.test(s) ? null : 'EAN-13 requires exactly 12 digits' },
  { label: 'EAN-8',        bcid: 'ean8',   validate: s => /^\d{7}$/.test(s) ? null : 'EAN-8 requires exactly 7 digits' },
  { label: 'UPC-A',        bcid: 'upca',   validate: s => /^\d{11}$/.test(s) ? null : 'UPC-A requires exactly 11 digits' },
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
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: CreateTab with bwip-js generation and QR center icon"
```

---

## Task 14: Settings Tab

**Files:**
- Create: `src/tabs/SettingsTab.tsx`

- [ ] **Step 1: Write `src/tabs/SettingsTab.tsx`**

```tsx
import { AppSettings } from '../types';
import { Toggle } from '../components/Toggle';

interface SettingsTabProps {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  clearHistory: () => void;
  version: string;
}

export function SettingsTab({ settings, updateSettings, clearHistory, version }: SettingsTabProps) {
  function handleClearHistory() {
    if (window.confirm('Clear all scan history? This cannot be undone.')) {
      clearHistory();
    }
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="px-4 pt-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Scan Behaviour</h2>
        <div className="bg-white border border-gray-100 rounded-2xl px-4 divide-y divide-gray-100">
          {'vibrate' in navigator && (
            <Toggle
              label="Vibrate on scan"
              description="Haptic feedback when a code is detected"
              checked={settings.vibrate}
              onChange={v => updateSettings({ vibrate: v })}
            />
          )}
          <Toggle
            label="Beep on scan"
            description="Audio tone when a code is detected"
            checked={settings.beep}
            onChange={v => updateSettings({ beep: v })}
          />
          <Toggle
            label="Save to history"
            description="Store scanned codes in history"
            checked={settings.saveToHistory}
            onChange={v => updateSettings({ saveToHistory: v })}
          />
          <Toggle
            label="Save duplicates"
            description="Allow saving the same code more than once"
            checked={settings.saveDuplicates}
            onChange={v => updateSettings({ saveDuplicates: v })}
          />
        </div>

        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-6 mb-2">History</h2>
        <div className="bg-white border border-gray-100 rounded-2xl px-4">
          <button
            onClick={handleClearHistory}
            className="w-full text-left py-3 text-sm text-red-500 font-medium"
          >
            Clear all history
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-gray-300">
          <p>QR Codex</p>
          <p>v{version}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: SettingsTab"
```

---

## Task 15: Final Build Verification and PWA Icons

**Files:**
- Modify: `vite.config.ts` (already done), `public/icons/`

- [ ] **Step 1: Install canvas for icon generation (optional — skip if unavailable)**

```bash
npm install -D canvas 2>/dev/null || echo "Skipping canvas — will use SVG fallback"
```

- [ ] **Step 2: Generate PNG icons**

```bash
node -e "
const fs = require('fs');
const { createCanvas } = require('canvas');
fs.mkdirSync('public/icons', { recursive: true });
[192, 512].forEach(size => {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');
  const r = size * 0.21;
  ctx.fillStyle = '#2563EB';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.04;
  ctx.strokeRect(size*0.17, size*0.17, size*0.27, size*0.27);
  ctx.strokeRect(size*0.56, size*0.17, size*0.27, size*0.27);
  ctx.strokeRect(size*0.17, size*0.56, size*0.27, size*0.27);
  ctx.fillStyle = 'white';
  ctx.fillRect(size*0.23, size*0.23, size*0.15, size*0.15);
  ctx.fillRect(size*0.62, size*0.23, size*0.15, size*0.15);
  ctx.fillRect(size*0.23, size*0.62, size*0.15, size*0.15);
  fs.writeFileSync('public/icons/icon-' + size + '.png', c.toBuffer('image/png'));
  console.log('Generated icon-' + size + '.png');
});
" 2>/dev/null || echo "Generate icons manually at 192px and 512px from public/icon.svg"
```

- [ ] **Step 3: Full build**

```bash
npm run build
```

Expected: Build succeeds. `dist/` contains `index.html`, `assets/`, `icons/`, `sw.js`.

- [ ] **Step 4: Preview locally**

```bash
npm run preview
```

Expected: App opens at localhost:4173 with PWA installable.

- [ ] **Step 5: Run all tests**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Step 6: Add `package.json` test script if missing**

In `package.json`, ensure:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete QR Codex PWA — scanner, history, create, settings, analysis"
```

---

## Self-Review Checklist

- [x] Camera scanning with ZXing — Task 7 + 10
- [x] Camera flip button — Task 10 (ScanTab overlay controls)
- [x] Scan from photo — Task 10 (decodeFromImage + staggered toasts)
- [x] Toast with no interruption — Task 8 (Toast component)
- [x] GPS tagging — Task 4 (useGeolocation) + Task 10 (ScanTab)
- [x] Semantic type detection — Task 5 (analyzer)
- [x] Semantic badge on toast and history cards — Task 8, 11
- [x] History tab with copy/create/delete — Task 11
- [x] Detail modal — Task 12
- [x] External lookups (Open Food Facts, Google Books) — Task 6, 12
- [x] Create tab with all formats including PDF417/Aztec — Task 13
- [x] QR center icon with localStorage persistence — Task 13
- [x] Share via system dialog with download fallback — Task 4, 13
- [x] Settings: vibrate (default off), beep, save history, save duplicates — Task 3, 14
- [x] Clear history in settings — Task 14
- [x] Duplicate suppression — Task 10 (hasText check)
- [x] PWA manifest + service worker + update banner — Task 1 (vite-plugin-pwa), Task 9 (App.tsx)
- [x] iOS safe-area insets — Task 8 (TabBar), Task 8 (Toast)
- [x] App version in settings — Task 1 (define), Task 14
