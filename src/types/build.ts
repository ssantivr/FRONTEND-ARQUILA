import type { ExtractionStatus, ProposedField } from "./extraction";

export type BuildOrigin = "description" | "document";

export type ProposedFields = Record<string, ProposedField>;

export interface ProposedLevel {
    fields: ProposedFields;
    rooms: ProposedFields[];
    components: ProposedFields[];
}

export interface BuildRecommendation {
    category: string;
    content: string;
    priority: "high" | "medium" | "low";
}

export interface Build {
    id: number;
    project_id: number;
    file_id: number | null;
    status: ExtractionStatus;
    origin: BuildOrigin;
    fallback: boolean;
    levels: ProposedLevel[];
    project: ProposedFields;
    terrain: ProposedFields;
    recommendations: BuildRecommendation[];
    truncated: boolean;
    plan_ids: number[];
    created_at: string;
}

export interface BuildSource {
    description?: string;
    file_id?: number;
}

export interface BuildItemApply {
    name: string;
    x_m: number;
    y_m: number;
    width_m: number;
    depth_m: number;
    height_m: number;
}

export interface BuildLevelApply {
    title: string;
    level?: string;
    scale?: string;
    rooms: BuildItemApply[];
    components: (BuildItemApply & { kind: string })[];
}

export interface BuildProjectApply {
    name?: string;
    description?: string;
    location?: string;
}

export interface BuildTerrainApply {
    name: string;
    area_m2: number;
    width_m?: number;
    length_m?: number;
    slope_percent?: number;
    soil_type?: string;
}

export interface BuildApply {
    levels: BuildLevelApply[];
    project?: BuildProjectApply;
    terrain?: BuildTerrainApply;
}
