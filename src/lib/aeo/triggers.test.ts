import { describe, it, expect } from "vitest";
import { evaluateTrigger, evaluateTriggers, type EntityMetricsInput, type Trigger } from "./triggers";

const baseEntity = {
    visibility: 0.5,
    position: 2.5,
    shareOfVoice: 0.3,
    mentionCount: 40,
    linkPercentage: 0.2,
};

const baseInput: EntityMetricsInput = {
    entity: baseEntity,
};

describe("evaluateTrigger — metric_threshold", () => {
    it("fires when value is below the threshold (op=lt)", () => {
        const t: Trigger = { kind: "metric_threshold", metric: "visibility", op: "lt", value: 0.7 };
        const r = evaluateTrigger(t, baseInput);
        expect(r.fired).toBe(true);
        expect(r.value).toBe(0.5);
        expect(r.explanation).toContain("visibility");
        expect(r.explanation).toContain("below");
    });

    it("does not fire when value meets the threshold", () => {
        const t: Trigger = { kind: "metric_threshold", metric: "visibility", op: "lt", value: 0.4 };
        expect(evaluateTrigger(t, baseInput).fired).toBe(false);
    });

    it("supports gt/gte/lte operators", () => {
        const tGt: Trigger = { kind: "metric_threshold", metric: "position", op: "gt", value: 2 };
        expect(evaluateTrigger(tGt, baseInput).fired).toBe(true);

        const tGte: Trigger = { kind: "metric_threshold", metric: "shareOfVoice", op: "gte", value: 0.3 };
        expect(evaluateTrigger(tGte, baseInput).fired).toBe(true);

        const tLte: Trigger = { kind: "metric_threshold", metric: "linkPercentage", op: "lte", value: 0.2 };
        expect(evaluateTrigger(tLte, baseInput).fired).toBe(true);
    });

    it("does not fire when the metric is null", () => {
        const t: Trigger = { kind: "metric_threshold", metric: "position", op: "lt", value: 5 };
        const result = evaluateTrigger(t, { entity: { ...baseEntity, position: null } });
        expect(result.fired).toBe(false);
    });

    it("respects custom weight", () => {
        const t: Trigger = { kind: "metric_threshold", metric: "visibility", op: "lt", value: 0.7, weight: 2.5 };
        expect(evaluateTrigger(t, baseInput).weight).toBe(2.5);
    });

    it("formats percent metrics in the explanation", () => {
        const t: Trigger = { kind: "metric_threshold", metric: "visibility", op: "lt", value: 0.7 };
        const r = evaluateTrigger(t, baseInput);
        expect(r.explanation).toMatch(/70%/);
        expect(r.explanation).toMatch(/50%/);
    });

    it("formats position metrics with a # prefix", () => {
        const t: Trigger = { kind: "metric_threshold", metric: "position", op: "gt", value: 2 };
        const r = evaluateTrigger(t, baseInput);
        expect(r.explanation).toMatch(/#2\.5/);
    });
});

describe("evaluateTrigger — missing_source_type", () => {
    it("fires when the type is absent from the breakdown", () => {
        const t: Trigger = { kind: "missing_source_type", typeName: "Review Site" };
        const r = evaluateTrigger(t, { ...baseInput, sourceTypes: { Forum: 5 } });
        expect(r.fired).toBe(true);
        expect(r.explanation).toContain("review site");
    });

    it("fires when sourceTypes is missing entirely", () => {
        const t: Trigger = { kind: "missing_source_type", typeName: "Wikipedia" };
        expect(evaluateTrigger(t, baseInput).fired).toBe(true);
    });

    it("does not fire when there is at least one mention from that type", () => {
        const t: Trigger = { kind: "missing_source_type", typeName: "Review Site" };
        const r = evaluateTrigger(t, { ...baseInput, sourceTypes: { "Review Site": 1 } });
        expect(r.fired).toBe(false);
    });
});

describe("evaluateTrigger — worse_than_competitor_avg", () => {
    const inputWithCompetitors: EntityMetricsInput = {
        entity: baseEntity,
        competitorAvg: { avgVisibility: 0.8, avgPosition: 1.2, avgShareOfVoice: 0.6 },
    };

    it("fires when entity visibility trails competitors by at least minDelta", () => {
        const t: Trigger = { kind: "worse_than_competitor_avg", metric: "visibility", minDelta: 0.2 };
        const r = evaluateTrigger(t, inputWithCompetitors);
        expect(r.fired).toBe(true);
        expect(r.explanation).toMatch(/visibility/);
        expect(r.explanation).toMatch(/competitors/);
    });

    it("does not fire when the gap is smaller than minDelta", () => {
        const t: Trigger = { kind: "worse_than_competitor_avg", metric: "visibility", minDelta: 0.5 };
        expect(evaluateTrigger(t, inputWithCompetitors).fired).toBe(false);
    });

    it("treats position correctly (lower is better)", () => {
        // entity position 2.5, competitors 1.2 → entity is worse by 1.3
        const t: Trigger = { kind: "worse_than_competitor_avg", metric: "position", minDelta: 1 };
        const r = evaluateTrigger(t, inputWithCompetitors);
        expect(r.fired).toBe(true);
    });

    it("does not fire when the entity actually outperforms competitors", () => {
        const t: Trigger = { kind: "worse_than_competitor_avg", metric: "visibility", minDelta: 0.1 };
        const r = evaluateTrigger(t, {
            entity: { ...baseEntity, visibility: 0.9 },
            competitorAvg: { avgVisibility: 0.5, avgPosition: 2, avgShareOfVoice: 0.3 },
        });
        expect(r.fired).toBe(false);
    });

    it("does not fire when competitorAvg is missing", () => {
        const t: Trigger = { kind: "worse_than_competitor_avg", metric: "visibility", minDelta: 0.1 };
        expect(evaluateTrigger(t, baseInput).fired).toBe(false);
    });
});

describe("evaluateTriggers — aggregate", () => {
    it("sums weights of fired triggers and returns the fired list", () => {
        const triggers: Trigger[] = [
            { kind: "metric_threshold", metric: "visibility", op: "lt", value: 0.7, weight: 2 },
            { kind: "metric_threshold", metric: "shareOfVoice", op: "gt", value: 0.9 },          // doesn't fire
            { kind: "missing_source_type", typeName: "Wikipedia", weight: 1.5 },
        ];
        const out = evaluateTriggers(triggers, baseInput);
        expect(out.totalWeight).toBe(3.5);
        expect(out.fired).toHaveLength(2);
    });

    it("returns zero weight when nothing fires", () => {
        const triggers: Trigger[] = [
            { kind: "metric_threshold", metric: "visibility", op: "gt", value: 0.99 },
        ];
        expect(evaluateTriggers(triggers, baseInput).totalWeight).toBe(0);
    });
});
