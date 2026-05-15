import { createMollieClient } from "@mollie/api-client";

export function getMollie() {
  if (!process.env.MOLLIE_API_KEY) {
    throw new Error("MOLLIE_API_KEY is not set in environment variables");
  }
  return createMollieClient({
    apiKey: process.env.MOLLIE_API_KEY,
  });
}
