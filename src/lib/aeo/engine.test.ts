import { describe, it, expect } from "vitest";
import type { AeoPlaybookItem } from "@prisma/client";
import { rankPlaybookItems } from "./engine";
import type { EntityMetricsInput, Trigger } from "./triggers";

// Helper: make a minimal AeoPlaybookItem with the fields the ranker reads.
function mkItem(slug: string, overrides: Partial<AeoPlaybookItem> = {}): AeoPlaybookItem {
    const base: AeoPlaybookItem = {
        id: slug,
        slug,
        title: slug,
        description: "",
        category: "Content",
        channel: "OnPage",
        defaultImpact: 5,
        defaultEffort: 5,
        tags: [],
        triggers: [] as unknown as AeoPlaybookItem["triggers"],
        personalizationPrompt: null,
        version: 1,
        isActive: true,
        createdById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    return { ...base, ...overrides };
}

const baseMetrics: EntityMetricsInput = {
    entity: { visibility: 0.3, position: 3, shareOfVoice: 0.1, mentionCount: 20, linkPercentage: 0.05 },
    competitorAvg: { avgVisibility: 0.7, avgPosition: 1.5, avgShareOfVoice: 0.4 },
    sourceTypes: { "Publishing & blogging": 5 }, // missing Reviews & ratings, Social & community, etc.
};

describe("rankPlaybookItems — fired triggers outrank baseline", () => {
    it("ranks an item with fired triggers above an item with no triggers", () => {
        const triggered = mkItem("triggered", {
            triggers: [
                { kind: "metric_threshold", metric: "visibility", op: "lt", value: 0.5, weight: 2 } as Trigger,
            ] as unknown as AeoPlaybookItem["triggers"],
        });
        const baseline = mkItem("baseline");

        const ranked = rankPlaybookItems([baseline, triggered], baseMetrics, { topN: 2 });
        expect(ranked[0].item.slug).toBe("triggered");
        expect(ranked[0].isTriggered).toBe(true);
        expect(ranked[0].totalWeight).toBe(2);
        expect(ranked[1].item.slug).toBe("baseline");
        expect(ranked[1].isTriggered).toBe(false);
    });

    it("sums multiple fired trigger weights on one item", () => {
        const compound = mkItem("compound", {
            triggers: [
                { kind: "metric_threshold", metric: "visibility", op: "lt", value: 0.5, weight: 2 },
                { kind: "missing_source_type", typeName: "Reviews & ratings", weight: 1.5 },
            ] as unknown as AeoPlaybookItem["triggers"],
        });
        const ranked = rankPlaybookItems([compound], baseMetrics, { topN: 1 });
        expect(ranked[0].totalWeight).toBe(3.5);
        expect(ranked[0].fired).toHaveLength(2);
    });

    it("treats items with non-firing triggers as zero, NOT baseline", () => {
        const triggeredButNotFiring = mkItem("dud", {
            triggers: [
                { kind: "metric_threshold", metric: "visibility", op: "gt", value: 0.99, weight: 5 },
            ] as unknown as AeoPlaybookItem["triggers"],
        });
        const baseline = mkItem("baseline");

        const ranked = rankPlaybookItems([triggeredButNotFiring, baseline], baseMetrics, { topN: 2 });
        // baseline (0.5) outranks triggered-but-not-firing (0)
        expect(ranked[0].item.slug).toBe("baseline");
        expect(ranked[1].item.slug).toBe("dud");
        expect(ranked[1].totalWeight).toBe(0);
    });
});

describe("rankPlaybookItems — tiebreaker by impact / effort", () => {
    it("breaks weight ties by higher impact first", () => {
        const a = mkItem("a", { defaultImpact: 5 });
        const b = mkItem("b", { defaultImpact: 9 });
        const ranked = rankPlaybookItems([a, b], baseMetrics, { topN: 2 });
        expect(ranked[0].item.slug).toBe("b");
    });

    it("breaks impact ties by lower effort", () => {
        const a = mkItem("a", { defaultImpact: 5, defaultEffort: 7 });
        const b = mkItem("b", { defaultImpact: 5, defaultEffort: 3 });
        const ranked = rankPlaybookItems([a, b], baseMetrics, { topN: 2 });
        expect(ranked[0].item.slug).toBe("b");
    });
});

describe("rankPlaybookItems — top-N truncation", () => {
    it("returns at most topN items", () => {
        const items = Array.from({ length: 10 }, (_, i) => mkItem(`i${i}`));
        const ranked = rankPlaybookItems(items, baseMetrics, { topN: 3 });
        expect(ranked).toHaveLength(3);
    });

    it("defaults to topN=8 when not supplied", () => {
        const items = Array.from({ length: 12 }, (_, i) => mkItem(`i${i}`));
        const ranked = rankPlaybookItems(items, baseMetrics);
        expect(ranked).toHaveLength(8);
    });
});

describe("rankPlaybookItems — JSONB tolerance", () => {
    it("ignores malformed trigger entries instead of crashing", () => {
        const item = mkItem("messy", {
            triggers: [
                null,
                { kind: "unknown_kind" },
                { kind: "metric_threshold", metric: "visibility", op: "lt", value: 0.5 },
            ] as unknown as AeoPlaybookItem["triggers"],
        });
        const ranked = rankPlaybookItems([item], baseMetrics, { topN: 1 });
        expect(ranked[0].totalWeight).toBe(1); // only the one valid trigger fired (default weight 1)
        expect(ranked[0].fired).toHaveLength(1);
    });

    it("treats non-array triggers as empty (baseline weight)", () => {
        const item = mkItem("garbage", {
            triggers: { foo: "bar" } as unknown as AeoPlaybookItem["triggers"],
        });
        const ranked = rankPlaybookItems([item], baseMetrics, { topN: 1 });
        expect(ranked[0].totalWeight).toBe(0.5);
        expect(ranked[0].isTriggered).toBe(false);
    });
});
