import { describe, expect, it } from 'vitest';

import { PINATA_GATEWAY_DOMAIN, resolveIPFSUrl, shortAddress } from '../utils/utils';

describe('utils', () => {
  describe('shortAddress', () => {
    it('shortens long wallet addresses', () => {
      expect(shortAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234...5678');
    });

    it('returns short strings unchanged', () => {
      expect(shortAddress('0x1234')).toBe('0x1234');
    });
  });

  describe('resolveIPFSUrl', () => {
    it('returns empty string for empty input', () => {
      expect(resolveIPFSUrl('')).toBe('');
    });

    it('leaves http urls untouched', () => {
      expect(resolveIPFSUrl('https://example.com/book.json')).toBe('https://example.com/book.json');
    });

    it('converts ipfs uris using the gateway domain', () => {
      expect(resolveIPFSUrl('ipfs://abc123')).toBe(`https://${PINATA_GATEWAY_DOMAIN}/ipfs/abc123`);
    });

    it('converts raw cids using the gateway domain', () => {
      expect(resolveIPFSUrl('abc123')).toBe(`https://${PINATA_GATEWAY_DOMAIN}/ipfs/abc123`);
    });
  });
});
