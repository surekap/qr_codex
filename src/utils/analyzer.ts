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

  // EAN-13 / ISBN-13 / UPC-A (12 digits treated as UPC-A padded)
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
  const FNC1 = '';
  if (!text.includes(FNC1) && !text.startsWith('(')) return null;
  const fields: Record<string, string> = {};
  let s = text.replace(new RegExp(FNC1, 'g'), '');
  s = s.replace(/\((\d{2,4})\)/g, '$1');
  const parts = s.split('').filter(Boolean);
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
