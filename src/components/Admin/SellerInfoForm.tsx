"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Flex,
  Box,
  Text,
  TextField,
  Button,
  Select,
  Callout,
} from "@radix-ui/themes";
import {
  Pencil1Icon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { COUNTRIES, PRIORITY_COUNTRY_CODES } from "@/components/Billing/countries";

const SELLER_KEYS = [
  "seller_company_name",
  "seller_street",
  "seller_city",
  "seller_postal_code",
  "seller_country",
  "seller_vat_id",
  "seller_kvk",
  "seller_email",
  "invoice_prefix",
] as const;

type SellerData = Record<(typeof SELLER_KEYS)[number], string>;

const EMPTY: SellerData = {
  seller_company_name: "",
  seller_street: "",
  seller_city: "",
  seller_postal_code: "",
  seller_country: "NL",
  seller_vat_id: "",
  seller_kvk: "",
  seller_email: "",
  invoice_prefix: "SPE",
};

function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export default function SellerInfoForm() {
  const [data, setData] = useState<SellerData>({ ...EMPTY });
  const [saved, setSaved] = useState<SellerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasSavedData = saved !== null && saved.seller_company_name !== "";

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/settings?keys=${SELLER_KEYS.join(",")}`);
      if (!res.ok) return;
      const result = await res.json();
      const loaded: SellerData = { ...EMPTY };
      for (const key of SELLER_KEYS) {
        if (result[key]) loaded[key] = result[key];
      }
      setData(loaded);
      if (loaded.seller_company_name) {
        setSaved(loaded);
      } else {
        setEditing(true);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setError(null);
    if (!data.seller_company_name.trim() || !data.seller_street.trim() || !data.seller_city.trim() || !data.seller_postal_code.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      for (const key of SELLER_KEYS) {
        await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value: data[key].trim() }),
        });
      }
      setSaved({ ...data });
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to save seller details.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (saved) setData({ ...saved });
    setError(null);
    setEditing(false);
  };

  const update = (key: keyof SellerData, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <Text size="2" color="gray">Loading seller details...</Text>;
  }

  // ─── Read-only view ──────────────────────────────────────────────────
  if (!editing && hasSavedData) {
    return (
      <Flex direction="column" gap="3">
        {success && (
          <Callout.Root color="green" size="1">
            <Callout.Icon><CheckCircledIcon /></Callout.Icon>
            <Callout.Text>Seller details saved. New invoices will use these details.</Callout.Text>
          </Callout.Root>
        )}
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">{saved!.seller_company_name}</Text>
          <Text size="2" color="gray">{saved!.seller_street}</Text>
          <Text size="2" color="gray">{saved!.seller_postal_code} {saved!.seller_city}</Text>
          <Text size="2" color="gray">{countryName(saved!.seller_country)}</Text>
          {saved!.seller_vat_id && (
            <Text size="2" color="gray" mt="1">VAT: {saved!.seller_vat_id}</Text>
          )}
          {saved!.seller_kvk && (
            <Text size="2" color="gray">KvK: {saved!.seller_kvk}</Text>
          )}
          {saved!.seller_email && (
            <Text size="2" color="gray">{saved!.seller_email}</Text>
          )}
          <Text size="2" color="gray" mt="1">
            Invoice prefix: <Text weight="medium" style={{ fontFamily: "var(--font-mono)" }}>{saved!.invoice_prefix || "SPE"}</Text>
          </Text>
        </Flex>
        <Callout.Root color="blue" size="1">
          <Callout.Icon><InfoCircledIcon /></Callout.Icon>
          <Callout.Text>
            Invoice numbers follow the format <Text weight="medium" style={{ fontFamily: "var(--font-mono)" }}>{saved!.invoice_prefix || "SPE"}-{new Date().getFullYear()}-0001</Text>. The counter resets to 0001 automatically on January 1st each year.
          </Callout.Text>
        </Callout.Root>
        <Flex>
          <Button variant="soft" size="2" onClick={() => setEditing(true)}>
            <Pencil1Icon /> Edit Seller Details
          </Button>
        </Flex>
      </Flex>
    );
  }

  // ─── Editable form ───────────────────────────────────────────────────
  return (
    <Flex direction="column" gap="4">
      {error && (
        <Callout.Root color="red" size="1">
          <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <Box>
        <Text as="label" size="2" weight="medium" mb="1">
          Company Name <Text color="red">*</Text>
        </Text>
        <TextField.Root
          placeholder="Sinus Digital BV"
          value={data.seller_company_name}
          onChange={(e) => update("seller_company_name", e.target.value)}
        />
      </Box>

      <Box>
        <Text as="label" size="2" weight="medium" mb="1">
          Street Address <Text color="red">*</Text>
        </Text>
        <TextField.Root
          placeholder="Keizersgracht 123"
          value={data.seller_street}
          onChange={(e) => update("seller_street", e.target.value)}
        />
      </Box>

      <Flex gap="3">
        <Box style={{ flex: 1 }}>
          <Text as="label" size="2" weight="medium" mb="1">
            City <Text color="red">*</Text>
          </Text>
          <TextField.Root
            placeholder="Amsterdam"
            value={data.seller_city}
            onChange={(e) => update("seller_city", e.target.value)}
          />
        </Box>
        <Box style={{ width: "140px" }}>
          <Text as="label" size="2" weight="medium" mb="1">
            Postal Code <Text color="red">*</Text>
          </Text>
          <TextField.Root
            placeholder="1015 AB"
            value={data.seller_postal_code}
            onChange={(e) => update("seller_postal_code", e.target.value)}
          />
        </Box>
      </Flex>

      <Box>
        <Text as="label" size="2" weight="medium" mb="1">
          Country <Text color="red">*</Text>
        </Text>
        <Select.Root value={data.seller_country} onValueChange={(v) => update("seller_country", v)}>
          <Select.Trigger style={{ width: "100%" }} />
          <Select.Content position="popper" sideOffset={4}>
            {COUNTRIES.map((c, i) => (
              <React.Fragment key={c.code}>
                {i > 0 && PRIORITY_COUNTRY_CODES.has(COUNTRIES[i - 1].code) && !PRIORITY_COUNTRY_CODES.has(c.code) && (
                  <Select.Separator />
                )}
                <Select.Item value={c.code}>{c.name}</Select.Item>
              </React.Fragment>
            ))}
          </Select.Content>
        </Select.Root>
      </Box>

      <Box>
        <Text as="label" size="2" weight="medium" mb="1">
          VAT ID
        </Text>
        <TextField.Root
          placeholder="NL123456789B01"
          value={data.seller_vat_id}
          onChange={(e) => update("seller_vat_id", e.target.value)}
        />
      </Box>

      <Box>
        <Text as="label" size="2" weight="medium" mb="1">
          KvK Number
        </Text>
        <TextField.Root
          placeholder="12345678"
          value={data.seller_kvk}
          onChange={(e) => update("seller_kvk", e.target.value)}
        />
      </Box>

      <Box>
        <Text as="label" size="2" weight="medium" mb="1">
          Email
        </Text>
        <TextField.Root
          placeholder="billing@spectacl.org"
          value={data.seller_email}
          onChange={(e) => update("seller_email", e.target.value)}
        />
      </Box>

      <Box>
        <Text as="label" size="2" weight="medium" mb="1">
          Invoice Number Prefix
        </Text>
        <TextField.Root
          placeholder="SPE"
          value={data.invoice_prefix}
          onChange={(e) => update("invoice_prefix", e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5))}
          style={{ maxWidth: 120 }}
        />
        <Text size="1" color="gray" mt="1">
          2-5 uppercase letters. Used in invoice numbers: {data.invoice_prefix || "SPE"}-{new Date().getFullYear()}-0001
        </Text>
      </Box>

      <Callout.Root color="blue" size="1">
        <Callout.Icon><InfoCircledIcon /></Callout.Icon>
        <Callout.Text>
          The sequential counter resets to 0001 automatically on January 1st each year. Each product under Sinus Digital B.V. should use a unique prefix to prevent invoice number collisions.
        </Callout.Text>
      </Callout.Root>

      <Flex justify="end" gap="2" mt="2">
        {hasSavedData && (
          <Button variant="soft" color="gray" size="3" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={saving || !data.seller_company_name.trim() || !data.seller_street.trim() || !data.seller_city.trim() || !data.seller_postal_code.trim()}
          size="3"
        >
          {saving ? "Saving..." : "Save Seller Details"}
        </Button>
      </Flex>
    </Flex>
  );
}
