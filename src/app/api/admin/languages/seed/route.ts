import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { auditLog } from "@/lib/audit";

const DEFAULT_MARKETS = [
  // Americas
  { name: "United States", group: "Americas", order: 0 },
  { name: "Canada", group: "Americas", order: 1 },
  { name: "Brazil", group: "Americas", order: 2 },
  { name: "Mexico", group: "Americas", order: 3 },
  { name: "Argentina", group: "Americas", order: 4 },

  // Asia Pacific
  { name: "Japan", group: "Asia Pacific", order: 0 },
  { name: "South Korea", group: "Asia Pacific", order: 1 },
  { name: "China", group: "Asia Pacific", order: 2 },
  { name: "India", group: "Asia Pacific", order: 3 },
  { name: "Australia", group: "Asia Pacific", order: 4 },
  { name: "New Zealand", group: "Asia Pacific", order: 5 },
  { name: "Singapore", group: "Asia Pacific", order: 6 },
  { name: "Hong Kong", group: "Asia Pacific", order: 7 },

  // Europe
  { name: "United Kingdom", group: "Europe", order: 0 },
  { name: "Germany", group: "Europe", order: 1 },
  { name: "France", group: "Europe", order: 2 },
  { name: "Netherlands", group: "Europe", order: 3 },
  { name: "Belgium", group: "Europe", order: 4 },
  { name: "Austria", group: "Europe", order: 5 },
  { name: "Switzerland", group: "Europe", order: 6 },
  { name: "Spain", group: "Europe", order: 7 },
  { name: "Italy", group: "Europe", order: 8 },
  { name: "Portugal", group: "Europe", order: 9 },
  { name: "Sweden", group: "Europe", order: 10 },
  { name: "Norway", group: "Europe", order: 11 },
  { name: "Denmark", group: "Europe", order: 12 },
  { name: "Finland", group: "Europe", order: 13 },
  { name: "Poland", group: "Europe", order: 14 },
  { name: "Czech Republic", group: "Europe", order: 15 },
  { name: "Ireland", group: "Europe", order: 16 },

  // Middle East & Africa
  { name: "UAE", group: "Middle East & Africa", order: 0 },
  { name: "Saudi Arabia", group: "Middle East & Africa", order: 1 },
  { name: "Turkey", group: "Middle East & Africa", order: 2 },
  { name: "Israel", group: "Middle East & Africa", order: 3 },
  { name: "South Africa", group: "Middle East & Africa", order: 4 },

  // Global
  { name: "Global", group: "Global", order: 0 },
];

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let created = 0;
    let skipped = 0;

    for (const market of DEFAULT_MARKETS) {
      try {
        await prisma.language.create({
          data: {
            name: market.name,
            group: market.group,
            order: market.order,
            isEnabled: true,
          },
        });
        created++;
      } catch (e: unknown) {
        // Skip duplicates (P2002 = unique constraint violation)
        if (e instanceof Error && "code" in e && (e as { code?: string }).code === "P2002") {
          skipped++;
        } else {
          throw e;
        }
      }
    }

    await auditLog({
      userId: session.user.id,
      action: "language.seed",
      targetType: "Language",
      targetId: "bulk",
      detail: { created, skipped, total: DEFAULT_MARKETS.length },
    });

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: DEFAULT_MARKETS.length,
    });
  } catch (error) {
    console.error("[Language Seed] Error:", error);
    return NextResponse.json({ error: "Failed to seed markets" }, { status: 500 });
  }
}
