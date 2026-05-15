
import { Entity, AnalysisResult, Competitor } from "@prisma/client";

export interface AnalysisInput {
    entity: Entity;
    competitors: Competitor[];
    response: string;
}

export interface MentionResult {
    isPrimaryEntity: boolean;
    competitorId?: string;
    detectedName: string;
    mentioned: boolean;
}

export interface ParserResult extends Partial<AnalysisResult> {
    mentions?: MentionResult[];
}

export interface Parser {
    name: string;
    parse(input: AnalysisInput): Promise<ParserResult>;
}
