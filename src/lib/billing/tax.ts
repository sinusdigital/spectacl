/**
 * Pure tax calculation for B2B SaaS.
 *
 * Three scenarios:
 *   1. NL domestic → 21% BTW
 *   2. EU cross-border + valid VAT ID → 0% reverse charge
 *   3. Non-EU (or EU without valid VAT ID) → charge 21% BTW / 0% exempt
 *
 * Zero imports, zero side effects, zero DB access.
 */

export const NL_VAT_RATE = 0.21;

export const EU_COUNTRIES = new Set([
  "AT", // Austria
  "BE", // Belgium
  "BG", // Bulgaria
  "HR", // Croatia
  "CY", // Cyprus
  "CZ", // Czech Republic
  "DK", // Denmark
  "EE", // Estonia
  "FI", // Finland
  "FR", // France
  "DE", // Germany
  "GR", // Greece
  "HU", // Hungary
  "IE", // Ireland
  "IT", // Italy
  "LV", // Latvia
  "LT", // Lithuania
  "LU", // Luxembourg
  "MT", // Malta
  "NL", // Netherlands
  "PL", // Poland
  "PT", // Portugal
  "RO", // Romania
  "SK", // Slovakia
  "SI", // Slovenia
  "ES", // Spain
  "SE", // Sweden
]);

export interface TaxResult {
  rate: number;
  type: "standard" | "reverse_charge" | "exempt";
  label: string;
}

/**
 * Determine tax treatment based on customer country and VAT ID validity.
 *
 * @param countryCode ISO 3166-1 alpha-2 country code
 * @param vatIdValid  Whether the customer's VAT ID has been validated via VIES
 */
export function calculateTax(
  countryCode: string,
  vatIdValid: boolean,
): TaxResult {
  const code = countryCode.toUpperCase().trim();

  // NL domestic — always charge 21% BTW
  if (code === "NL") {
    return { rate: NL_VAT_RATE, type: "standard", label: "21% BTW" };
  }

  // EU cross-border with valid VAT ID — reverse charge (0%)
  if (EU_COUNTRIES.has(code) && vatIdValid) {
    return {
      rate: 0,
      type: "reverse_charge",
      label: "VAT Reverse Charge (EU)",
    };
  }

  // EU without valid VAT ID — charge 21% BTW (cannot confirm B2B status)
  if (EU_COUNTRIES.has(code) && !vatIdValid) {
    return { rate: NL_VAT_RATE, type: "standard", label: "21% BTW" };
  }

  // Non-EU — exempt
  return { rate: 0, type: "exempt", label: "Tax Exempt (non-EU)" };
}

/**
 * Calculate the gross (VAT-inclusive) amount from a net (ex-VAT) price.
 */
export function calculateGrossAmount(netPrice: number, taxRate: number): number {
  return Math.round((netPrice * (1 + taxRate)) * 100) / 100;
}

/**
 * Calculate the tax amount from a net (ex-VAT) price.
 */
export function calculateTaxAmount(netPrice: number, taxRate: number): number {
  return Math.round((netPrice * taxRate) * 100) / 100;
}
