/**
 * Open-redirect / SSRF sanitizer for Mollie checkout return paths.
 * Tightly guarded — the default `/spaces` is returned for anything not
 * obviously a same-origin relative path.
 */
import { describe, it, expect } from 'vitest';
import { safeReturnPath } from './returnPath';

describe('safeReturnPath', () => {
  describe('happy paths', () => {
    it('passes a simple root path', () => {
      expect(safeReturnPath('/spaces')).toBe('/spaces');
    });

    it('passes a nested path', () => {
      expect(safeReturnPath('/spaces/abc-123/overview')).toBe('/spaces/abc-123/overview');
    });

    it('passes a path with query string', () => {
      expect(safeReturnPath('/foo?x=1')).toBe('/foo?x=1');
    });

    it('passes a path with hash fragment', () => {
      expect(safeReturnPath('/foo#section')).toBe('/foo#section');
    });

    it('passes a path with query + hash', () => {
      expect(safeReturnPath('/foo?x=1&y=2#section')).toBe('/foo?x=1&y=2#section');
    });

    it('passes a URL-encoded path', () => {
      expect(safeReturnPath('/foo%20bar')).toBe('/foo%20bar');
    });
  });

  describe('malicious inputs (should fall back to /spaces)', () => {
    it('rejects protocol-relative URL (//evil.com)', () => {
      expect(safeReturnPath('//evil.com')).toBe('/spaces');
    });

    it('rejects protocol-relative with path', () => {
      expect(safeReturnPath('//evil.com/steal')).toBe('/spaces');
    });

    it('rejects backslash trick /\\evil.com', () => {
      expect(safeReturnPath('/\\evil.com')).toBe('/spaces');
    });

    it('rejects javascript: scheme', () => {
      expect(safeReturnPath('javascript:alert(1)')).toBe('/spaces');
    });

    it('rejects absolute https URL', () => {
      expect(safeReturnPath('https://evil.com/phish')).toBe('/spaces');
    });

    it('rejects absolute http URL', () => {
      expect(safeReturnPath('http://evil.com')).toBe('/spaces');
    });

    it('rejects data: URI', () => {
      expect(safeReturnPath('data:text/html,<script>alert(1)</script>')).toBe('/spaces');
    });

    it('rejects path not starting with /', () => {
      expect(safeReturnPath('spaces')).toBe('/spaces');
    });

    it('rejects embedded newline character', () => {
      expect(safeReturnPath('/foo\nHeader: injection')).toBe('/spaces');
    });

    it('rejects embedded tab character', () => {
      expect(safeReturnPath('/foo\tbar')).toBe('/spaces');
    });

    it('rejects embedded carriage return', () => {
      expect(safeReturnPath('/foo\rbar')).toBe('/spaces');
    });
  });

  describe('non-string / empty inputs', () => {
    it('defaults to /spaces for null', () => {
      expect(safeReturnPath(null)).toBe('/spaces');
    });

    it('defaults to /spaces for undefined', () => {
      expect(safeReturnPath(undefined)).toBe('/spaces');
    });

    it('defaults to /spaces for empty string', () => {
      expect(safeReturnPath('')).toBe('/spaces');
    });

    it('defaults to /spaces for numbers', () => {
      expect(safeReturnPath(42 as unknown)).toBe('/spaces');
    });

    it('defaults to /spaces for objects', () => {
      expect(safeReturnPath({ path: '/foo' } as unknown)).toBe('/spaces');
    });

    it('defaults to /spaces for arrays', () => {
      expect(safeReturnPath(['/foo'] as unknown)).toBe('/spaces');
    });
  });
});
