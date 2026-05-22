import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateVatId, parseVatId } from "./vies";

describe("parseVatId", () => {
  it("parses a valid NL VAT ID", () => {
    expect(parseVatId("NL123456789B01")).toEqual({
      countryCode: "NL",
      vatNumber: "123456789B01",
    });
  });

  it("parses a valid DE VAT ID", () => {
    expect(parseVatId("DE123456789")).toEqual({
      countryCode: "DE",
      vatNumber: "123456789",
    });
  });

  it("handles lowercase input", () => {
    expect(parseVatId("de123456789")).toEqual({
      countryCode: "DE",
      vatNumber: "123456789",
    });
  });

  it("strips spaces, dots, and dashes", () => {
    expect(parseVatId("NL 123.456.789-B01")).toEqual({
      countryCode: "NL",
      vatNumber: "123456789B01",
    });
  });

  it("returns null for too-short input", () => {
    expect(parseVatId("NL1")).toBeNull();
  });

  it("returns null for non-EU country code", () => {
    expect(parseVatId("US123456789")).toBeNull();
  });

  it("returns null for GB (post-Brexit)", () => {
    expect(parseVatId("GB123456789")).toBeNull();
  });

  it("returns null for numeric-only prefix", () => {
    expect(parseVatId("12345678901")).toBeNull();
  });
});

describe("validateVatId", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns valid for a confirmed VAT ID", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          valid: true,
          name: "Test Company B.V.",
          address: "Amsterdam, NL",
        }),
        { status: 200 },
      ),
    );

    const result = await validateVatId("NL123456789B01");
    expect(result).toEqual({
      valid: true,
      name: "Test Company B.V.",
      address: "Amsterdam, NL",
    });
  });

  it("returns invalid for a rejected VAT ID", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          valid: false,
          userError: "INVALID_INPUT",
        }),
        { status: 200 },
      ),
    );

    const result = await validateVatId("NL000000000B00");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("omits name/address when VIES returns ---", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ valid: true, name: "---", address: "---" }),
        { status: 200 },
      ),
    );

    const result = await validateVatId("DE123456789");
    expect(result.valid).toBe(true);
    expect(result.name).toBeUndefined();
    expect(result.address).toBeUndefined();
  });

  it("returns error for malformed VAT ID without calling API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await validateVatId("XX");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid VAT ID format");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns error for non-EU country without calling API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await validateVatId("US123456789");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid VAT ID format");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("handles VIES HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Service Unavailable", { status: 503 }),
    );

    const result = await validateVatId("NL123456789B01");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("503");
  });

  it("handles network timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      Object.assign(new Error("Aborted"), { name: "AbortError" }),
    );

    const result = await validateVatId("NL123456789B01");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("timed out");
  });

  it("handles generic network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Network error"),
    );

    const result = await validateVatId("NL123456789B01");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("unavailable");
  });
});
