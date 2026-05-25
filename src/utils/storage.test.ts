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
