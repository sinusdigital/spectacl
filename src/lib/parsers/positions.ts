
/**
 * Calculates the position (rank) of detected names within a text.
 * Position is 1-based index (1 = appeared first).
 * 
 * @param responseText The full text response from the LLM
 * @param targets A list of target names (entity or competitors) to find positions for.
 * @returns A Map where key is the target name (lowercase) and value is the 1-based position.
 */
export function calculatePositions(responseText: string, targets: string[]): Map<string, number> {
    const textLower = responseText.toLowerCase();
    const uniqueTargets = Array.from(new Set(targets.filter(Boolean).map(t => t.toLowerCase())));

    // 1. Find the first index of each target
    const targetIndices: { name: string, index: number }[] = [];

    uniqueTargets.forEach(target => {
        const index = textLower.indexOf(target);
        if (index !== -1) {
            targetIndices.push({ name: target, index });
        }
    });

    // 2. Sort by index (ascending) to determine order
    targetIndices.sort((a, b) => a.index - b.index);

    // 3. Assign Rank (1-based)
    const positionMap = new Map<string, number>();
    targetIndices.forEach((item, rankIndex) => {
        // Rank is index + 1
        positionMap.set(item.name, rankIndex + 1);
    });

    return positionMap;
}
