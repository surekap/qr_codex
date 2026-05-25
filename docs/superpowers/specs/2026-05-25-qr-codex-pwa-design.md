# QR Codex — PWA Design Spec

**Date:** 2026-05-25  
**Status:** Approved

---

## Overview

QR Codex is a fully client-side Progressive Web App built with React 18 + TypeScript + Vite. It runs entirely in the browser with no backend. It scans all 1D and 2D barcodes via the device camera, decodes barcodes from photo library images, generates barcode/QR/Aztec images from text, and maintains a scan history in localStorage.

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | React 18 + TypeScript | Type safety, ecosystem |
| Build tool | Vite | Fast DX, PWA plugin |
| Styling | Tailwind CSS | Utility-first, light/clean theme |
| Scanning | `@zxing/browser` | Max format coverage, works on all browsers incl. Safari |
| Generation | `bwip-js` | 100+ symbologies incl. Aztec, single dependency |
| PWA | `vite-plugin-pwa` (Workbox) | Service worker + manifest generation |
| State | React state + localStorage | No external state library needed |

---

## Data Model

```typescript
interface ScanEntry {
  id: string;           // crypto.randomUUID()
  text: string;         // decoded barcode value
  format: string;       // e.g. 'QR_CODE', 'CODE_128', 'EAN_13'
  semanticType: string; // e.g. 'url', 'contact_card', 'retail_product', 'unknown'
  scannedAt: string;    // ISO 8601 datetime
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
  };
}

interface AppSettings {
  vibrate: boolean;        // default: false
  beep: boolean;           // default: true
  saveToHistory: boolean;  // default: true
  saveDuplicates: boolean; // default: false
}
```

**localStorage keys:**
- `qrcodex_history` — `ScanEntry[]`, reverse-chronological
- `qrcodex_settings` — `AppSettings`
- `qrcodex_qr_icon` — base64 data URL string (optional QR center icon)

---

## Project Structure

```
src/
  components/
    Toast.tsx           # Slide-up scan result notification
    TabBar.tsx          # Bottom navigation
    Toggle.tsx          # Reusable settings toggle
    DetailModal.tsx     # Full-screen barcode detail overlay
  tabs/
    ScanTab.tsx         # Camera viewfinder + photo import
    HistoryTab.tsx      # Scan history list
    CreateTab.tsx       # Barcode/QR generation form
    SettingsTab.tsx     # App preferences
  hooks/
    useScanner.ts       # ZXing camera scanning logic
    useHistory.ts       # localStorage read/write for scan history
    useSettings.ts      # localStorage read/write for settings
    useGeolocation.ts   # Non-blocking GPS position helper
  utils/
    storage.ts          # localStorage helpers with JSON parse/stringify
    beep.ts             # Web Audio API tone generator
    share.ts            # navigator.share() with download fallback
    analyzer.ts         # Barcode analysis pipeline (client-side)
    lookups.ts          # External lookup helpers (Open Food Facts, Google Books)
  types.ts              # ScanEntry, AppSettings, AnalysisResult interfaces
  App.tsx               # Tab routing + Toast state
  main.tsx              # React root, PWA registration
```

---

## Tab 1: Scan (Default)

### Camera scanning
- `BrowserMultiFormatReader` from `@zxing/browser` starts on tab mount, stops on unmount
- Requests rear camera by default (`facingMode: environment`), falls back gracefully
- Continuous decode loop — no user action needed between scans

### On successful decode
1. Check `saveDuplicates` — if false and the text already exists anywhere in history, skip
2. Run client-side analysis pipeline (`analyzer.ts`) — synchronous, instant — yields `semanticType`
3. Check `saveToHistory` — if true, append `ScanEntry` (with `semanticType`) to localStorage
4. GPS position requested in background (non-blocking); attached to entry if it resolves in time
5. Vibrate if enabled — `navigator.vibrate(200)`
6. Beep if enabled — Web Audio API (~880 Hz, 80 ms tone)
7. Show toast (includes semantic type badge)

### Overlay controls (top-right, semi-transparent pill)
- **Camera flip button** — cycles through all available `videoInput` devices
- **Scan from Photo button** — triggers `<input type="file" accept="image/*">`

### Scan from Photo
- ZXing `decodeAllFromImageUrl` processes the selected image
- Each decoded result fires the same save/vibrate/beep/toast flow
- Multiple results are toasted 800 ms apart

### Viewfinder UI
- Full-screen `<video>` element
- CSS corner-bracket overlay suggesting scan region
- "Point at a barcode" hint text — fades out after first successful scan in session

### Permission handling
- Camera: on first visit, show an explanation card before the browser prompt; show error state + retry button if denied
- GPS: requested lazily on first successful scan; if denied, location field is simply omitted from history entries

---

## Tab 2: History

### List
- Reverse-chronological list of `ScanEntry` items from localStorage
- Tapping a card opens the **Detail Modal** (full-screen slide-up)
- Each card shows:
  - Barcode text (full, wrapping)
  - Format badge pill (e.g. `QR CODE`, `EAN-13`) + semantic type badge (e.g. `🌐 URL`, `🛫 Boarding Pass`)
  - Date + time byline (e.g. "25 May 2026, 14:32")
  - GPS byline if present (e.g. "51.5074° N, 0.1278° W") — tappable, opens maps
  - Three action buttons: **Copy**, **Create**, **Delete**

### Actions
- **Copy** — clipboard write; button briefly shows checkmark
- **Create** — navigates to Create tab with text pre-filled; user can edit before generating
- **Delete** — immediate slide-out animation, no confirmation

### Empty state
- Centered icon + "No scans yet — go scan something!" + button to switch to Scan tab

### Performance
- Windowed render for large lists (only render entries near viewport)

---

## Tab 3: Create

### Form
- **Content** — multiline textarea; pre-fillable from History
- **Format** — dropdown:
  - QR Code
  - Aztec Code
  - Data Matrix
  - PDF 417
  - Code 128
  - Code 39
  - EAN-13 *(12 digits required; checksum computed by bwip-js)*
  - EAN-8 *(7 digits required)*
  - UPC-A *(11 digits required)*

### QR Center Icon (QR Code format only)
- Optional icon row appears below the format selector
- Shows saved icon preview (from `qrcodex_qr_icon`) with **Change** and **Remove** buttons
- **Change** → `<input type="file" accept="image/*">` → stores as base64 in localStorage
- Icon persists across sessions; pre-loaded on app start
- QR generated at error correction level **H** (30% tolerance)
- Icon composited centered at ~20% of QR dimension, with a white rounded-square background

### Generation
- On Generate: `bwip-js` renders to hidden `<canvas>`; displayed as `<img>` below form
- White background ensures scannability when shared

### Share
- **Share button** → `navigator.share({ files: [pngBlob] })`
- Falls back to download link if Share API unavailable

### Validation (inline error, no toast)
- EAN-13: exactly 12 digits
- EAN-8: exactly 7 digits
- UPC-A: exactly 11 digits
- All others: any non-empty string

---

## Tab 4: Settings

| Toggle | Default | Notes |
|---|---|---|
| Vibrate on scan | Off | Hidden if `navigator.vibrate` unavailable |
| Beep on scan | On | Web Audio API, no asset file |
| Save to history | On | If off, toasts still show |
| Save duplicates | Off | Skips if same text already exists anywhere in history |

**Clear History:** Red text button → native `confirm()` → wipes `qrcodex_history`

**App info:** Name + version (injected via Vite `define` from `package.json`)

---

## Toast

- Single toast at a time; new scan resets the 3-second timer
- Slides up from bottom, above tab bar
- Content: truncated barcode text + format badge + semantic type badge (e.g. `🌐 URL`) + copy icon
- Tapping copy icon → clipboard write → icon flashes checkmark
- Auto-dismisses after 3 seconds

---

## Navigation

- Bottom tab bar, 4 tabs: Scan, History, Create, Settings
- Active tab: accent color `#2563EB` (blue)
- `padding-bottom: env(safe-area-inset-bottom)` for iOS notch/home indicator

---

## PWA

- `display: standalone` — no browser chrome
- `theme_color: #2563EB`, `background_color: #ffffff`
- Icons: 192×192 and 512×512 from SVG source
- `orientation: portrait`
- Workbox `GenerateSW` — caches all app assets on install (pure offline app)
- Update banner: "Update available — tap to reload" shown at top when new SW waiting

---

---

## Barcode Analysis Engine (`src/utils/analyzer.ts`)

A pure client-side, synchronous pipeline. No network required. Called on every successful scan.

### Pipeline

```
Input (text + format)
  → Symbology hint (bias interpretation using known format)
  → Signature matching (prefix/regex against known schemas)
  → Structured parsing (apply parser for matched schema)
  → Heuristic fallback (score likely categories from payload shape)
  → Confidence scoring
  → Return AnalysisResult
```

### Known signatures

| Prefix / Pattern | Semantic type | Parser |
|---|---|---|
| `https://`, `http://` | `url` | URI |
| `BEGIN:VCARD` | `contact_card` | vCard line parser |
| `MECARD:` | `contact_card` | MECARD field parser |
| `WIFI:` | `wifi_configuration` | WiFi QR field parser |
| `upi://` | `payment` | UPI URI parser |
| `bitcoin:`, `ethereum:`, `litecoin:` | `crypto_wallet` | URI parser |
| `mailto:` | `email_action` | URI |
| `tel:` | `phone_action` | URI |
| `smsto:`, `sms:` | `sms_action` | URI |
| `otpauth://` | `authentication` | OTP URI parser |
| `HC1:` | `health_certificate` | Raw (no deep decode) |
| `M1`/`M2` prefix + PDF417 symbology | `airline_boarding_pass` | IATA BCBP fixed-width parser |
| GS1 `` / `(` AI syntax | `gs1_payload` | GS1 AI token parser |
| JSON `{...}` | `json_payload` | `JSON.parse` |
| UUID regex | `internal_identifier` | None |
| EAN-13 / UPC-A structure + valid checksum | `retail_product` | GS1 digit parser |
| ISBN-10 / ISBN-13 (checksum validated) | `book` | ISBN validator |
| Tracking patterns (1Z…, 20–22 digit numeric) | `logistics_tracking` | Carrier pattern matcher |

Heuristic fallback categories: `retail_product`, `logistics_tracking`, `internal_enterprise`, `unknown`

### Output types

```typescript
type SemanticType =
  | 'url' | 'contact_card' | 'wifi_configuration' | 'payment' | 'crypto_wallet'
  | 'email_action' | 'phone_action' | 'sms_action' | 'authentication'
  | 'health_certificate' | 'airline_boarding_pass' | 'gs1_payload' | 'json_payload'
  | 'internal_identifier' | 'retail_product' | 'book' | 'logistics_tracking'
  | 'internal_enterprise' | 'unknown';

interface AnalysisResult {
  semanticType: SemanticType;
  classificationConfidence: number;   // 0–1
  parsingConfidence: number;          // 0–1
  parsedFields: Record<string, string>; // human-readable key/value pairs
  possibleInterpretations?: string[];   // only when semanticType === 'unknown'
}
```

### Security rule
Barcode payloads are treated as untrusted input. The app never automatically executes URLs, joins WiFi, initiates payments, or acts on embedded commands.

---

## External Lookups (`src/utils/lookups.ts`)

Async, on-demand — only triggered from the Detail Modal, not at scan time.

| Semantic type | Source | API |
|---|---|---|
| `retail_product` | Open Food Facts | `https://world.openfoodfacts.org/api/v0/product/{barcode}.json` (no key) |
| `book` | Google Books | `https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}` (no key) |
| `logistics_tracking` | Pattern match only | Deep-link to carrier tracking page; no API call |
| All others | None | — |

```typescript
interface ExternalLookupResult {
  source: string;
  productName?: string;
  brand?: string;
  imageUrl?: string;
  additionalFields: Record<string, string>;
}
```

---

## Detail Modal (`src/components/DetailModal.tsx`)

Full-screen slide-up modal. Triggered by tapping any history card. No separate route.

### Header
- Format badge + semantic type label + confidence indicator ("High / Medium / Low confidence")
- Close button (×)

### Sections (conditional on semantic type)

**Raw payload** — always shown, monospace font, full-width copy button

**Parsed fields** — key/value list; shown only when `parsedFields` is non-empty. Examples by type:
- `contact_card` → Name, Phone, Email, Organisation, Address
- `wifi_configuration` → SSID, Security type, Password (with show/hide toggle)
- `airline_boarding_pass` → Passenger name, Flight number, Origin, Destination, Seat, Boarding time, PNR
- `payment` / `upi` → Payee name, VPA, Amount, Reference
- `url` → Domain, Path, Query parameters (broken out as key/value)
- `retail_product` → GTIN, Country prefix, Manufacturer code
- `book` → ISBN, type (ISBN-10 / ISBN-13)
- `logistics_tracking` → Inferred carrier name, tracking number
- `gs1_payload` → All decoded Application Identifier fields

**External lookup result** — shown for `retail_product` and `book` only:
- Loading skeleton while fetching
- Product/book image, name, brand/author, category/publisher
- "Lookup failed" gracefully if network unavailable

**Location** — shown if GPS was captured: coordinates + "Open in Maps" link (`https://maps.google.com/?q={lat},{lng}`)

**Action row:**
- Copy raw text
- Open in browser (URL types only)
- Create barcode from this text (navigates to Create tab, pre-fills text)

**Security notice** — shown for `wifi_configuration`, `payment`, `crypto_wallet`, `authentication`:
> "Do not act on barcodes from untrusted sources."

### Semantic type → emoji mapping (used in badges)

| Type | Emoji | Label |
|---|---|---|
| `url` | 🌐 | URL |
| `contact_card` | 👤 | Contact |
| `wifi_configuration` | 📶 | Wi-Fi |
| `payment` | 💳 | Payment |
| `crypto_wallet` | ₿ | Crypto |
| `email_action` | ✉️ | Email |
| `phone_action` | 📞 | Phone |
| `sms_action` | 💬 | SMS |
| `authentication` | 🔐 | Auth |
| `health_certificate` | 🏥 | Health |
| `airline_boarding_pass` | 🛫 | Boarding Pass |
| `retail_product` | 📦 | Product |
| `book` | 📚 | Book |
| `logistics_tracking` | 🚚 | Tracking |
| `gs1_payload` | 🏷️ | GS1 |
| `json_payload` | `{}` | JSON |
| `internal_identifier` | 🔑 | ID |
| `unknown` | ❓ | Unknown |

---

## Out of Scope

- Search / filter on history
- Cloud sync
- Undo delete
- Landscape orientation support
- Backend of any kind
- Deep decode of EU COVID certificates (HC1 stored but not parsed beyond type identification)
- Automatic execution of any barcode action (URLs, WiFi join, payments)
