// ── Shared chart data processing for Recharts ──
// Used by MentionChart, PositionChart, ShareOfVoiceChart

export interface DataPoint {
    date: string;
    [key: string]: number | string | null | undefined;
}

export interface ChartEntity {
    name: string;
    color: string;
    website?: string;
    logoUrl?: string;
    strokeWidth?: number;
    opacity?: number;
}

export interface ProcessChartDataOptions {
    data: DataPoint[];
    entities: ChartEntity[];
    days: number;
    /** Maps an entity name to its data key in each DataPoint.
     *  e.g. `name => name` for visibility, `name => \`${name}_position\`` for position */
    dataKeyFn: (entityName: string) => string;
    /** Value to fill before an entity's inception.
     *  - `0` for mention rate / SOV (line starts at 0%)
     *  - `'baseline'` for position chart (line starts at bottom / worst rank) */
    fillValue: number | 'baseline';
    /** When true, each competitor line starts from its own inception-1.
     *  When false, all entities are zero-filled uniformly from the primary's inception.
     *  Use false for stacked area charts (SOV) to prevent broken stacks. */
    perEntityInception: boolean;
}

export interface ProcessedChartData {
    processedData: DataPoint[];
    inceptionDate: string | null;
    tickInterval: number;
    /** Y-axis domain — only meaningful for position chart (reversed axis) */
    yDomain: [number, number];
}

// ── Helpers ──

export function formatDateLabel(iso: string, days: number): string {
    const d = new Date(iso + 'T00:00:00');
    if (days <= 7) {
        return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getTickInterval(totalPoints: number, days: number): number {
    if (days <= 7) return 0;
    if (days <= 30) return Math.max(Math.floor(totalPoints / 6) - 1, 0);
    return Math.max(Math.floor(totalPoints / 7) - 1, 0);
}

// ── Main processing function ──

export function processChartData({
    data,
    entities,
    days,
    dataKeyFn,
    fillValue,
    perEntityInception,
}: ProcessChartDataOptions): ProcessedChartData {
    const defaultYDomain: [number, number] = [1, 5];

    if (data.length === 0 || entities.length === 0) {
        return {
            processedData: data,
            inceptionDate: null,
            tickInterval: 0,
            yDomain: defaultYDomain,
        };
    }

    // ── 1. Find primary entity's first data index ──
    const primaryKey = dataKeyFn(entities[0].name);
    const firstDataIndex = data.findIndex(d =>
        d[primaryKey] !== undefined && d[primaryKey] !== null
    );

    if (firstDataIndex === -1) {
        return {
            processedData: [...data],
            inceptionDate: null,
            tickInterval: getTickInterval(data.length, days),
            yDomain: defaultYDomain,
        };
    }

    const inceptionDate = data[firstDataIndex].date;

    // ── 2. Compute yMax and resolve fill value ──
    let resolvedFill: number;
    let yDomain: [number, number] = defaultYDomain;

    if (fillValue === 'baseline') {
        // Position chart: scan for max position across all entities from inception onward
        let maxPos = 1;
        data.slice(firstDataIndex).forEach(point => {
            entities.forEach(e => {
                const v = point[dataKeyFn(e.name)];
                if (typeof v === 'number' && v > maxPos) maxPos = v;
            });
        });
        const yMax = Math.max(5, maxPos + 1);
        resolvedFill = yMax;
        yDomain = [1, yMax];
    } else {
        resolvedFill = fillValue;
    }

    // ── 3. Build working data with inception zero-fill ──
    // The hook pre-trims data to the correct date range (including inception-1 when
    // data is younger than the range). This step only fills zero/baseline values for
    // points before each entity's first real data — no synthetic dates are prepended.
    const workingData: DataPoint[] = [...data];

    if (perEntityInception) {
        // -- Per-entity inception mode --
        // Primary entity: fill before its inception with resolvedFill
        for (let i = 0; i < firstDataIndex; i++) {
            workingData[i] = { ...workingData[i] };
            workingData[i][primaryKey] = resolvedFill;
        }

        // Non-primary entities: each gets its own inception fill
        for (let ei = 1; ei < entities.length; ei++) {
            const entityKey = dataKeyFn(entities[ei].name);
            const entityFirstIdx = workingData.findIndex(d =>
                d[entityKey] !== undefined && d[entityKey] !== null
            );

            if (entityFirstIdx === -1) continue;

            // Set fill value at inception-1 (so line rises from zero/baseline)
            if (entityFirstIdx > 0) {
                workingData[entityFirstIdx - 1] = { ...workingData[entityFirstIdx - 1] };
                workingData[entityFirstIdx - 1][entityKey] = resolvedFill;
            }
        }
    } else {
        // -- Shared inception mode (SOV stacked area) --
        // All entities zero-filled uniformly before primary inception
        for (let i = 0; i < firstDataIndex; i++) {
            const zeroed: DataPoint = { date: workingData[i].date };
            entities.forEach(e => { zeroed[dataKeyFn(e.name)] = resolvedFill; });
            workingData[i] = zeroed;
        }
    }

    // ── 4. Tick interval based on actual rendered points ──
    const tickInterval = getTickInterval(workingData.length, days);

    return {
        processedData: workingData,
        inceptionDate,
        tickInterval,
        yDomain,
    };
}
