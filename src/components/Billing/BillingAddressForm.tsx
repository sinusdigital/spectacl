"use client";

import React, { useState, useEffect, useCallback, useImperativeHandle } from "react";
import {
  Flex,
  Box,
  Text,
  TextField,
  Button,
  Select,
  Callout,
  Badge,
} from "@radix-ui/themes";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import { EU_COUNTRIES } from "@/lib/billing/tax";
import { COUNTRIES, PRIORITY_COUNTRY_CODES } from "./countries";

interface BillingProfile {
  companyName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  vatId: string | null;
  vatIdValid: boolean;
}

export interface BillingAddressFormHandle {
  save: () => Promise<void>;
  canSave: boolean;
  saving: boolean;
}

interface BillingAddressFormProps {
  spaceId: string;
  /** Called after successful save with the updated profile */
  onSaved?: (profile: BillingProfile) => void;
  /** Compact layout for use inside modals */
  compact?: boolean;
  /** Label for the submit button */
  submitLabel?: string;
  /** Start in edit mode (e.g. when no profile exists yet) */
  forceEdit?: boolean;
  /** Hide internal action buttons (use with ref to control externally) */
  hideActions?: boolean;
  /** Called when form validity changes (for parent components controlling the save button) */
  onValidityChange?: (canSave: boolean) => void;
}

function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

function BillingAddressFormInner({
  spaceId,
  onSaved,
  compact = false,
  submitLabel = "Save Billing Details",
  forceEdit = false,
  hideActions = false,
  onValidityChange,
}: BillingAddressFormProps, ref: React.ForwardedRef<BillingAddressFormHandle>) {
  const [companyName, setCompanyName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("NL");
  const [vatId, setVatId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved profile snapshot (null = no profile exists yet)
  const [savedProfile, setSavedProfile] = useState<BillingProfile | null>(null);
  // Edit mode: true when form is editable
  const [editing, setEditing] = useState(forceEdit);

  // VAT validation state
  const [vatValidating, setVatValidating] = useState(false);
  const [vatValid, setVatValid] = useState<boolean | null>(null);
  const [vatError, setVatError] = useState<string | null>(null);
  const [vatCompanyName, setVatCompanyName] = useState<string | null>(null);

  const isEU = EU_COUNTRIES.has(country);
  const canSave = !!(companyName.trim() && street.trim() && city.trim() && postalCode.trim());

  useImperativeHandle(ref, () => ({
    save: handleSave,
    canSave,
    saving,
  }));

  // Notify parent when form validity changes (refs don't trigger re-renders).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onValidityChange?.(canSave); }, [canSave]);

  const applyProfile = (p: BillingProfile) => {
    setCompanyName(p.companyName ?? "");
    setStreet(p.street ?? "");
    setCity(p.city ?? "");
    setPostalCode(p.postalCode ?? "");
    setCountry(p.country ?? "NL");
    setVatId(p.vatId ?? "");
    setVatValid(p.vatIdValid ?? null);
  };

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/billing/profile?spaceId=${spaceId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.profile) {
        applyProfile(data.profile);
        setSavedProfile(data.profile);
      } else {
        // No profile — start in edit mode
        setEditing(true);
      }
    } catch {
      // Silent fail — form will show empty
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Reset VAT validation when country or VAT ID changes
  useEffect(() => {
    setVatValid(null);
    setVatError(null);
    setVatCompanyName(null);
  }, [country, vatId]);

  const handleValidateVat = async () => {
    if (!vatId.trim()) return;
    setVatValidating(true);
    setVatError(null);
    try {
      const res = await fetch("/api/billing/validate-vat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vatId: vatId.trim() }),
      });
      const result = await res.json();
      setVatValid(result.valid);
      setVatCompanyName(result.name ?? null);
      if (!result.valid) {
        setVatError(result.error ?? "Invalid VAT ID");
      }
    } catch {
      setVatError("Validation failed. Please try again.");
    } finally {
      setVatValidating(false);
    }
  };

  const handleCancel = () => {
    if (savedProfile) {
      applyProfile(savedProfile);
    }
    setError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    setError(null);
    if (!companyName.trim() || !street.trim() || !city.trim() || !postalCode.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/billing/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId,
          companyName: companyName.trim(),
          street: street.trim(),
          city: city.trim(),
          postalCode: postalCode.trim(),
          country,
          vatId: vatId.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setError(err?.error ?? "Failed to save billing details.");
        return;
      }

      const data = await res.json();
      setVatValid(data.profile.vatIdValid);
      if (data.viesResult) {
        setVatCompanyName(data.viesResult.name ?? null);
      }
      setSavedProfile(data.profile);
      setEditing(false);
      onSaved?.(data.profile);
    } catch {
      setError("Failed to save billing details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box py={compact ? "2" : "4"}>
        <Text size="2" color="gray">Loading billing details...</Text>
      </Box>
    );
  }

  // ─── Read-only view ──────────────────────────────────────────────────────
  if (!editing && savedProfile) {
    return (
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">{savedProfile.companyName}</Text>
          <Text size="2" color="gray">{savedProfile.street}</Text>
          <Text size="2" color="gray">
            {savedProfile.postalCode} {savedProfile.city}
          </Text>
          <Text size="2" color="gray">{countryName(savedProfile.country)}</Text>
          {savedProfile.vatId && (
            <Flex align="center" gap="2" mt="1">
              <Text size="2" color="gray">VAT: {savedProfile.vatId}</Text>
              {savedProfile.vatIdValid ? (
                <Badge color="green" size="1" variant="soft">
                  <CheckCircledIcon /> Valid
                </Badge>
              ) : (
                <Badge color="red" size="1" variant="soft">
                  <CrossCircledIcon /> Invalid
                </Badge>
              )}
            </Flex>
          )}
        </Flex>
        <Flex>
          <Button variant="soft" size="2" onClick={() => setEditing(true)}>
            <Pencil1Icon /> Edit Billing Details
          </Button>
        </Flex>
      </Flex>
    );
  }

  // ─── Editable form ───────────────────────────────────────────────────────
  return (
    <Flex direction="column" gap={compact ? "3" : "4"}>
      {error && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {/* Company Name */}
      <Box>
        <Text as="label" size="2" weight="medium" mb="1">
          Company Name <Text color="red">*</Text>
        </Text>
        <TextField.Root
          placeholder="Acme B.V."
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          size={compact ? "2" : "2"}
        />
      </Box>

      {/* Street */}
      <Box>
        <Text as="label" size="2" weight="medium" mb="1">
          Street Address <Text color="red">*</Text>
        </Text>
        <TextField.Root
          placeholder="Keizersgracht 123"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
        />
      </Box>

      {/* City + Postal Code row */}
      <Flex gap="3">
        <Box style={{ flex: 1 }}>
          <Text as="label" size="2" weight="medium" mb="1">
            City <Text color="red">*</Text>
          </Text>
          <TextField.Root
            placeholder="Amsterdam"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </Box>
        <Box style={{ width: compact ? "120px" : "140px" }}>
          <Text as="label" size="2" weight="medium" mb="1">
            Postal Code <Text color="red">*</Text>
          </Text>
          <TextField.Root
            placeholder="1015 AB"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
          />
        </Box>
      </Flex>

      {/* Country */}
      <Box>
        <Text as="label" size="2" weight="medium" mb="1">
          Country <Text color="red">*</Text>
        </Text>
        <Select.Root value={country} onValueChange={setCountry}>
          <Select.Trigger style={{ width: "100%" }} />
          <Select.Content position="popper" sideOffset={4}>
            {COUNTRIES.map((c, i) => (
              <React.Fragment key={c.code}>
                {i > 0 && PRIORITY_COUNTRY_CODES.has(COUNTRIES[i - 1].code) && !PRIORITY_COUNTRY_CODES.has(c.code) && (
                  <Select.Separator />
                )}
                <Select.Item value={c.code}>
                  {c.name}
                </Select.Item>
              </React.Fragment>
            ))}
          </Select.Content>
        </Select.Root>
      </Box>

      {/* VAT ID (optional, shown for EU countries with nudge) */}
      <Box>
        <Flex justify="between" align="center" mb="1">
          <Text as="label" size="2" weight="medium">
            VAT ID {isEU && <Text color="gray" size="1">(optional)</Text>}
          </Text>
          {isEU && country !== "NL" && vatValid === null && (
            <Badge color="blue" size="1" variant="soft">
              Save 21% with a valid VAT ID
            </Badge>
          )}
          {vatValid === true && (
            <Badge color="green" size="1" variant="soft">
              <CheckCircledIcon /> Valid
            </Badge>
          )}
          {vatValid === false && vatId.trim() && (
            <Badge color="red" size="1" variant="soft">
              <CrossCircledIcon /> Invalid
            </Badge>
          )}
        </Flex>
        <Flex gap="2" align="end">
          <Box style={{ flex: 1 }}>
            <TextField.Root
              placeholder={isEU ? "e.g. NL123456789B01" : "Not applicable for non-EU"}
              value={vatId}
              onChange={(e) => setVatId(e.target.value)}
              disabled={!isEU}
            />
          </Box>
          {isEU && vatId.trim() && (
            <Button
              variant="soft"
              size="2"
              onClick={handleValidateVat}
              disabled={vatValidating}
            >
              {vatValidating ? "Checking..." : "Validate"}
            </Button>
          )}
        </Flex>
        {vatError && (
          <Text size="1" color="red" mt="1">{vatError}</Text>
        )}
        {vatCompanyName && vatValid && (
          <Text size="1" color="green" mt="1">
            Registered to: {vatCompanyName}
          </Text>
        )}
      </Box>

      {/* Actions */}
      {!hideActions && (
        <Flex justify="end" gap="2" mt={compact ? "1" : "2"}>
          {savedProfile && (
            <Button
              variant="soft"
              color="gray"
              size={compact ? "2" : "3"}
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !canSave}
            size={compact ? "2" : "3"}
          >
            {saving ? "Saving..." : submitLabel}
          </Button>
        </Flex>
      )}
    </Flex>
  );
}

const BillingAddressForm = React.forwardRef(BillingAddressFormInner);
export default BillingAddressForm;
