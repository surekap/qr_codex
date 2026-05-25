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
