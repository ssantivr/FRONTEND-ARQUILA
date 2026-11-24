export type ExtractionStatus = "review" | "applied" | "undone" | "failed";

export interface ProposedField {
    value: string | number;
    confidence: number;
    source: string;
    origin?: "document" | "ai_generated" | "existing";
}

export type ProposalSection = "project" | "terrain" | "plan";

export type Proposal = Partial<Record<ProposalSection, Record<string, ProposedField>>>;

export interface Extraction {
    id: number;
    project_id: number;
    file_id: number | null;
    status: ExtractionStatus;
    proposal: Proposal;
    terrain_id: number | null;
    plan_id: number | null;
    project_fields: string[];
    created_at: string;
}

export interface ExtractionAvailability {
    available: boolean;
    external: boolean;
    mime_types: string[];
    max_bytes: number;
}

export type ExtractionApply = Partial<
    Record<ProposalSection, Record<string, string | number | null>>
>;
