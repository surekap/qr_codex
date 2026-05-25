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
