import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isCloud, isSelfHosted, checkModeConsistency } from './mode';

describe('mode.ts', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('isCloud', () => {
    it('returns true when NEXT_PUBLIC_SPECTACL_MODE is exactly "cloud"', () => {
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'cloud');
      expect(isCloud()).toBe(true);
    });

    it('returns false when unset', () => {
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', '');
      expect(isCloud()).toBe(false);
    });

    it('returns false for "Cloud" (case-sensitive)', () => {
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'Cloud');
      expect(isCloud()).toBe(false);
    });

    it('returns false for "selfhosted"', () => {
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'selfhosted');
      expect(isCloud()).toBe(false);
    });

    it('returns false for garbage string', () => {
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'xyz-random');
      expect(isCloud()).toBe(false);
    });
  });

  describe('isSelfHosted', () => {
    it('returns false when mode is "cloud"', () => {
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'cloud');
      expect(isSelfHosted()).toBe(false);
    });

    it('returns true when mode is unset/empty', () => {
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', '');
      expect(isSelfHosted()).toBe(true);
    });

    it('returns true for any non-cloud string', () => {
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'anything-else');
      expect(isSelfHosted()).toBe(true);
    });

    it('is exact inverse of isCloud for all inputs', () => {
      for (const v of ['cloud', '', 'self-hosted', 'CLOUD', 'prod']) {
        vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', v);
        expect(isSelfHosted()).toBe(!isCloud());
      }
    });
  });

  describe('checkModeConsistency', () => {
    it('warns when MOLLIE_API_KEY is set but mode is not cloud', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.stubEnv('MOLLIE_API_KEY', 'test_xxx');
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', '');

      checkModeConsistency();

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('SPECTACL MODE MISMATCH');
      expect(log).toHaveBeenCalled();
    });

    it('does NOT warn when MOLLIE_API_KEY is set and mode is cloud', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.stubEnv('MOLLIE_API_KEY', 'test_xxx');
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'cloud');

      checkModeConsistency();

      expect(warn).not.toHaveBeenCalled();
    });

    it('does NOT warn when MOLLIE_API_KEY is unset (self-hosted)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.stubEnv('MOLLIE_API_KEY', '');
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', '');

      checkModeConsistency();

      expect(warn).not.toHaveBeenCalled();
    });

    it('reports "cloud" mode in the info log', () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.stubEnv('MOLLIE_API_KEY', '');
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', 'cloud');

      checkModeConsistency();

      expect(log).toHaveBeenCalledWith(expect.stringContaining('cloud mode'));
    });

    it('reports "self-hosted" mode when SPECTACL_MODE is unset', () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => {});
      vi.stubEnv('MOLLIE_API_KEY', '');
      vi.stubEnv('NEXT_PUBLIC_SPECTACL_MODE', '');

      checkModeConsistency();

      expect(log).toHaveBeenCalledWith(expect.stringContaining('self-hosted mode'));
    });
  });
});
