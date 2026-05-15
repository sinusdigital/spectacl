import { describe, it, expect } from "vitest";
import {
  calculateTax,
  calculateGrossAmount,
  calculateTaxAmount,
  EU_COUNTRIES,
  NL_VAT_RATE,
} from "./tax";

describe("calculateTax", () => {
  it("returns 21% standard for NL domestic", () => {
    const result = calculateTax("NL", false);
    expect(result).toEqual({
      rate: NL_VAT_RATE,
      type: "standard",
      label: "21% BTW",
    });
  });

  it("returns 21% standard for NL even with valid VAT ID", () => {
    const result = calculateTax("NL", true);
    expect(result).toEqual({
      rate: NL_VAT_RATE,
      type: "standard",
      label: "21% BTW",
    });
  });

  it("returns 0% reverse charge for EU cross-border with valid VAT ID", () => {
    const result = calculateTax("DE", true);
    expect(result).toEqual({
      rate: 0,
      type: "reverse_charge",
      label: "VAT Reverse Charge (EU)",
    });
  });

  it("returns 21% standard for EU without valid VAT ID", () => {
    const result = calculateTax("FR", false);
    expect(result).toEqual({
      rate: NL_VAT_RATE,
      type: "standard",
      label: "21% BTW",
    });
  });

  it("returns 0% exempt for non-EU country", () => {
    const result = calculateTax("US", false);
    expect(result).toEqual({
      rate: 0,
      type: "exempt",
      label: "Tax Exempt (non-EU)",
    });
  });

  it("returns 0% exempt for non-EU even with vatIdValid true", () => {
    const result = calculateTax("US", true);
    expect(result).toEqual({
      rate: 0,
      type: "exempt",
      label: "Tax Exempt (non-EU)",
    });
  });

  it("handles lowercase country codes", () => {
    const result = calculateTax("de", true);
    expect(result.type).toBe("reverse_charge");
  });

  it("handles country codes with whitespace", () => {
    const result = calculateTax(" NL ", false);
    expect(result.type).toBe("standard");
  });

  it("covers all 27 EU member states", () => {
    expect(EU_COUNTRIES.size).toBe(27);
    // Verify a sample of known EU members
    const knownMembers = [
      "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
      "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
      "PL", "PT", "RO", "SK", "SI", "ES", "SE",
    ];
    for (const code of knownMembers) {
      expect(EU_COUNTRIES.has(code)).toBe(true);
    }
  });

  it("does not include non-EU countries", () => {
    expect(EU_COUNTRIES.has("US")).toBe(false);
    expect(EU_COUNTRIES.has("GB")).toBe(false); // UK left EU
    expect(EU_COUNTRIES.has("CH")).toBe(false); // Switzerland
    expect(EU_COUNTRIES.has("NO")).toBe(false); // Norway (EEA, not EU)
  });

  it("returns reverse charge for each EU country with valid VAT", () => {
    for (const code of EU_COUNTRIES) {
      if (code === "NL") continue; // NL is always standard
      const result = calculateTax(code, true);
      expect(result.type).toBe("reverse_charge");
    }
  });
});

describe("calculateGrossAmount", () => {
  it("adds 21% to net price", () => {
    expect(calculateGrossAmount(99, 0.21)).toBe(119.79);
  });

  it("returns same amount for 0% rate", () => {
    expect(calculateGrossAmount(99, 0)).toBe(99);
  });

  it("handles rounding correctly", () => {
    expect(calculateGrossAmount(39, 0.21)).toBe(47.19);
    expect(calculateGrossAmount(249, 0.21)).toBe(301.29);
  });
});

describe("calculateTaxAmount", () => {
  it("calculates 21% tax on net price", () => {
    expect(calculateTaxAmount(99, 0.21)).toBe(20.79);
  });

  it("returns 0 for 0% rate", () => {
    expect(calculateTaxAmount(99, 0)).toBe(0);
  });

  it("handles rounding correctly", () => {
    expect(calculateTaxAmount(39, 0.21)).toBe(8.19);
    expect(calculateTaxAmount(249, 0.21)).toBe(52.29);
  });
});
