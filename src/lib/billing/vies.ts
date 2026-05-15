/**
 * VIES VAT ID validation via the EU REST API.
 *
 * Validates EU VAT numbers against the official VIES database.
 * Zero DB access, no external dependencies beyond native fetch.
 */

import { EU_COUNTRIES } from "./tax";

const VIES_API_URL =
  "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";
const VIES_TIMEOUT_MS = 10_000;

export interface ViesResult {
  valid: boolean;
  name?: string;
  address?: string;
  error?: string;
}

/**
 * Parse a VAT ID into country code and number.
 * VAT IDs start with a 2-letter country code followed by the number.
 */
export function parseVatId(vatId: string): {
  countryCode: string;
  vatNumber: string;
} | null {
  const cleaned = vatId.replace(/[\s.-]/g, "").toUpperCase();
  if (cleaned.length < 4) return null;

  const countryCode = cleaned.slice(0, 2);
  const vatNumber = cleaned.slice(2);

  if (!/^[A-Z]{2}$/.test(countryCode)) return null;
  if (!EU_COUNTRIES.has(countryCode)) return null;

  return { countryCode, vatNumber };
}

/**
 * Validate a VAT ID against the EU VIES service.
 *
 * Returns { valid: false, error } on network errors rather than throwing.
 * VIES can be slow/unreliable — uses a 10s timeout.
 */
export async function validateVatId(vatId: string): Promise<ViesResult> {
  const parsed = parseVatId(vatId);
  if (!parsed) {
    return {
      valid: false,
      error:
        "Invalid VAT ID format. Must start with a 2-letter EU country code.",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VIES_TIMEOUT_MS);

    const response = await fetch(VIES_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        countryCode: parsed.countryCode,
        vatNumber: parsed.vatNumber,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        valid: false,
        error: `VIES service returned ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      valid?: boolean;
      name?: string;
      address?: string;
      userError?: string;
    };

    return {
      valid: data.valid === true,
      name: data.name && data.name !== "---" ? data.name : undefined,
      address:
        data.address && data.address !== "---" ? data.address : undefined,
      error: data.valid ? undefined : data.userError ?? "VAT ID not found in VIES database",
    };
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "VIES service timed out"
        : "VIES service unavailable";
    return { valid: false, error: message };
  }
}
