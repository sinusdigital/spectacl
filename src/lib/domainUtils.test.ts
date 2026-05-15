import { describe, it, expect } from 'vitest';
import { determineType, normalizeUrl } from './domainUtils';

describe('determineType', () => {
  it('returns registry type when provided', () => {
    expect(determineType('example.com', 'Custom Type')).toBe('Custom Type');
  });

  it('returns Social & community for reddit', () => {
    expect(determineType('reddit.com')).toBe('Social & community');
  });

  it('returns Social & community for linkedin', () => {
    expect(determineType('linkedin.com')).toBe('Social & community');
  });

  it('returns News & media for news domains', () => {
    expect(determineType('bbc-news.com')).toBe('News & media');
  });

  it('returns Q&A & developer for github', () => {
    expect(determineType('github.com')).toBe('Q&A & developer');
  });

  it('returns E-commerce & retail for amazon', () => {
    expect(determineType('amazon.com')).toBe('E-commerce & retail');
  });

  it('returns Corporate as default', () => {
    expect(determineType('example.com')).toBe('Corporate');
  });

  it('ignores null registry type', () => {
    expect(determineType('reddit.com', null)).toBe('Social & community');
  });
});

describe('normalizeUrl', () => {
  it('returns null for null', () => {
    expect(normalizeUrl(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(normalizeUrl(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeUrl('')).toBeNull();
  });

  it('returns null for whitespace only', () => {
    expect(normalizeUrl('   ')).toBeNull();
  });

  it('adds https:// prefix when missing', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });

  it('keeps existing https://', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('keeps existing http://', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('trims whitespace', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
  });
});
