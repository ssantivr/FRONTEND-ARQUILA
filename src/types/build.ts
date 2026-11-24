import type { ExtractionStatus, ProposedField } from "./extraction";

export type BuildOrigin = "description" | "document";

export type ProposedFields = Record<string, ProposedField>;

export interface ProposedLevel {
    fields: ProposedFields;
    rooms: ProposedFields[];
    components: ProposedFields[];
}

export interface Build {
    id: number;
    project_id: number;
    file_id: number | null;
    status: ExtractionStatus;
    origin: BuildOrigin;
    levels: ProposedLevel[];
    truncated: boolean;
    plan_ids: number[];
    created_at: string;
}

export type BuildSource = { description: string } | { file_id: number };

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

export interface BuildApply {
    levels: BuildLevelApply[];
}
