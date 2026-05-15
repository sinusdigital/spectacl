"use client";

import { useState } from "react";
import { Card, Flex, Heading, Text, Separator } from "@radix-ui/themes";
import { DownloadIcon } from "@radix-ui/react-icons";
import Button from "@/components/Shared/Button";

export default function GdprSettings() {
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/user/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spectacl-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Data export failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Heading size="3">Your Data</Heading>
        <Text size="2" color="gray">
          Download a copy of all personal data we store about you, including your profile, space memberships, billing details, and invoices.
        </Text>
        <Separator size="4" />
        <Flex>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={downloading}
          >
            <DownloadIcon />
            {downloading ? "Preparing export..." : "Download my data"}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
