import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from './useHistory';
import type { ScanEntry } from '../types';

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
